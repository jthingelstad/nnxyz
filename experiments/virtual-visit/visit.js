import { planFloor, roomAt, walkable } from './layout.js';
import { createGallery } from './scene.js';
import { wallDrawing } from './drawing.js';
import { makePlayer } from './audio.js';
const $ = (id) => document.getElementById(id);
const dataEl = $('museum');
const {
  floors: raw,
  pictures,
  drawing,
  deliveryUrl,
  productionUrl,
} = JSON.parse(dataEl.textContent);
dataEl.remove();
const floors = raw.map(planFloor),
  canvas = $('view'),
  panel = $('panel'),
  content = $('content');
const allRooms = floors.flatMap((f) => f.rooms);
const allArt = new Map(
  allRooms.flatMap((r) => [...r.works, ...r.related].map((w) => [w.id, w])),
);
const pose = { x: 0, z: 0, yaw: 0, pitch: 0 },
  keys = new Set(),
  clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
let floor,
  room,
  scene,
  viewMode = '',
  dirty = true,
  previousEpoch = -1,
  last = 0,
  drag = null,
  tourRoom,
  tourIndex = 0;
let restoreFocus = null,
  lastWork = 0;
let replay = null,
  replayRoom = null,
  drawingTime = 0,
  drawPlaying = false,
  drawClock = 0;
function paintDrawing() {
  scene?.setDrawing(replay.paint(drawingTime));
  $('draw-time').value = drawingTime;
  $('draw-toggle').textContent = drawPlaying
    ? 'Pause'
    : drawingTime >= replay.duration
      ? 'Replay'
      : 'Play';
}
function endDrawing() {
  replayRoom = null;
  drawPlaying = false;
  $('replay').hidden = true;
  scene?.setDrawing();
}
function toggleDrawing(r, focus = false) {
  if (!scene) return;
  if (focus) {
    stand(r, 0);
    closeSheet();
  }
  replay ??= wallDrawing(drawing.svg);
  if (!replayRoom || drawingTime >= replay.duration) drawingTime = 0;
  drawPlaying = !replayRoom || !drawPlaying;
  drawClock = 0;
  replayRoom = r;
  $('replay').hidden = false;
  $('draw-time').max = replay.duration;
  paintDrawing();
}
function tickDrawing(t) {
  if (!drawPlaying) return;
  if (!drawClock) {
    drawClock = t;
    return;
  }
  if (t - drawClock < 1000 / 30) return;
  drawingTime = Math.min(
    replay.duration,
    drawingTime +
      (Math.min(t - drawClock, 100) / 1000) * parseFloat($('draw-speed').value),
  );
  drawClock = t;
  if (drawingTime >= replay.duration) drawPlaying = false;
  paintDrawing();
}
$('draw-toggle').onclick = () => toggleDrawing(replayRoom);
$('draw-time').oninput = () => {
  drawingTime = Number($('draw-time').value);
  drawClock = 0;
  paintDrawing();
};
$('draw-stop').onclick = endDrawing;
const player = makePlayer($('audio'), deliveryUrl, updatePlayer);
function element(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function button(text, fn) {
  const b = element('button', text);
  b.onclick = fn;
  return b;
}
function picture(work) {
  const img = element('img');
  img.src = pictures[work.image];
  img.alt = work.title;
  return img;
}
function row(...items) {
  const r = element('div', undefined, 'row');
  r.append(...items);
  return r;
}
function artLink(work) {
  const a = element(
    'a',
    work.replay ? 'Open artwork and drawing replay ↗' : 'Open artwork page ↗',
  );
  a.href = new URL(work.href, productionUrl);
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
function resetInput() {
  keys.clear();
  drag = null;
}
function sheet(mode, type, title) {
  viewMode = mode;
  resetInput();
  if (!panel.open) {
    restoreFocus = document.activeElement;
    panel.showModal();
  }
  $('panel-type').textContent = type;
  content.replaceChildren(element('h2', title));
  panel.scrollTop = 0;
}
function closeSheet() {
  if (panel.open) panel.close();
}
panel.querySelector('.close').onclick = closeSheet;
panel.addEventListener('click', (e) => {
  if (e.target === panel && e.clientX < panel.getBoundingClientRect().left)
    closeSheet();
});
panel.addEventListener('close', () => {
  viewMode = '';
  resetInput();
  if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  else canvas.focus();
});
function location() {
  const next = roomAt(floor, pose.x, pose.z);
  if (replayRoom && replayRoom !== next) endDrawing();
  if (next !== room && player.room && player.room !== next) player.end();
  if (next !== room) lastWork = 0;
  room = next;
  $('place').textContent = room?.title ?? 'Gallery hall';
  $('address').textContent =
    'Floor ' +
    String(floor.number).padStart(2, '0') +
    ' / ' +
    (room?.wing ?? 'The nnxyz Rooms');
  $('wing-dot').style.background = room?.color ?? '#9a978c';
  $('works-button').hidden = !room;
  $('tour-button').hidden = !room?.tour.length;
  $('lift-button').hidden =
    Math.hypot(pose.x - floor.landing.x, pose.z - floor.landing.z) > 4;
}
function setFloor(f) {
  if (f !== floor) {
    player.end();
    floor = f;
    scene?.setFloor(f);
    room = null;
  }
}
function face(tx, tz) {
  pose.yaw = Math.atan2(pose.x - tx, pose.z - tz);
  pose.pitch = 0;
}
function stand(r, index = 0, arrival = false) {
  setFloor(floors.find((f) => f.rooms.includes(r)));
  const s = r.hang[index],
    distance = Math.min(arrival ? 3.9 : 2.15, r.d * 0.38, r.w * 0.38);
  pose.x = clamp(s.x + s.nx * distance, r.x + 0.48, r.x + r.w - 0.48);
  pose.z = clamp(s.z + s.nz * distance, r.z + 0.48, r.z + r.d - 0.48);
  if (arrival) {
    // Enter at a slight angle so the adjoining pictures read as a wall.
    const shift = -1.16;
    pose.x = clamp(
      pose.x + Math.cos(s.angle) * shift,
      r.x + 0.48,
      r.x + r.w - 0.48,
    );
    pose.z = clamp(
      pose.z - Math.sin(s.angle) * shift,
      r.z + 0.48,
      r.z + r.d - 0.48,
    );
  }
  if (!walkable(floor, pose.x, pose.z)) {
    pose.x = s.x + s.nx * 0.75;
    pose.z = s.z + s.nz * 0.75;
  }
  face(s.x, s.z);
  if (arrival) pose.yaw -= canvas.clientWidth > 650 ? 0.5 : 0.08;
  location();
  lastWork = index;
  scene?.sync(pose.x, pose.z);
  dirty = true;
  if (!scene) $('flat-image').src = pictures[s.art.image];
}
function landing(f) {
  setFloor(f);
  pose.x = f.landing.x;
  pose.z = f.landing.z;
  pose.yaw = Math.PI / 2;
  pose.pitch = 0;
  location();
  scene?.sync(pose.x, pose.z);
  dirty = true;
  closeSheet();
}
function jump(r, i = 0) {
  stand(r, i, true);
  closeSheet();
}
function showMap(number = floor.number) {
  const f = floors.find((f) => f.number === number);
  sheet('map', 'Wayfinding', 'Floor plan');
  const tabs = row(
    ...floors.map((level) => {
      const b = button('Floor ' + level.number, () => showMap(level.number));
      b.setAttribute('aria-current', String(f === level));
      return b;
    }),
  );
  content.append(tabs, element('p', f.label, 'note'));
  const ns = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    const e = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }
  const map = svg('svg', {
    class: 'map-svg',
    viewBox: '-1 -1 ' + (f.width + 2) + ' ' + (f.depth + 2),
    role: 'group',
    'aria-label': 'Floor ' + number + ' diagram',
  });
  map.append(
    svg('rect', {
      x: 0,
      y: 0,
      width: f.width,
      height: f.depth,
      fill: '#e6e0d3',
    }),
  );
  for (const r of f.rooms) {
    const shape = svg('rect', {
      x: r.x,
      y: r.z,
      width: r.w,
      height: r.d,
      fill: r.color,
      'fill-opacity': r === room ? 0.85 : 0.5,
      'data-room': r.id,
    });
    const title = svg('title', {});
    title.textContent = r.title;
    shape.append(title);
    shape.onclick = () => jump(r);
    map.append(shape);
  }
  for (const w of f.walls)
    map.append(
      svg('line', {
        x1: w.horizontal ? w.lo : w.fixed,
        x2: w.horizontal ? w.hi : w.fixed,
        y1: w.horizontal ? w.fixed : w.lo,
        y2: w.horizontal ? w.fixed : w.hi,
        stroke: '#565247',
        'stroke-width': 0.32,
        'pointer-events': 'none',
      }),
    );
  if (f === floor) {
    const dot = svg('g', {
      transform:
        'translate(' +
        pose.x +
        ' ' +
        pose.z +
        ') rotate(' +
        (-pose.yaw * 180) / Math.PI +
        ')',
      'aria-label': 'Your position',
    });
    dot.append(
      svg('circle', {
        r: 1.55,
        fill: 'white',
        stroke: '#24231f',
        'stroke-width': 0.4,
      }),
      svg('path', { d: 'M 0,-3 L 1,-.5 L -1,-.5 Z', fill: '#252520' }),
    );
    map.append(dot);
  }
  content.append(
    map,
    element('p', 'Choose a room to stand at its first work.', 'note'),
  );
  const list = element('div', undefined, 'room-list');
  for (const r of f.rooms) {
    const b = button('', () => jump(r)),
      i = element('i');
    i.style.background = r.color;
    b.append(
      i,
      element('span', r.title),
      element('small', String(r.works.length)),
    );
    b.setAttribute('aria-current', String(r === room));
    list.append(b);
  }
  content.append(
    list,
    button('Enter the floor ' + number + ' hall', () => landing(f)),
  );
}
function describe(r, i) {
  const art = r.works[i];
  sheet('label', r.wing + ' / ' + (i + 1) + ' of ' + r.works.length, art.title);
  content.append(picture(art), element('p', art.caption, 'bodycopy'));
  const listen = r.tour.findIndex(
    (s) => s.id === art.id && s.kind === 'work' && s.src,
  );
  const controls = row(
    button('Stand here', () => {
      stand(r, i);
      closeSheet();
    }),
  );
  if (art.id === drawing.id && scene)
    controls.append(
      button('Watch it draw on the wall', () => toggleDrawing(r, true)),
    );
  if (listen >= 0)
    controls.append(
      button('Hear this work', () => {
        player.start(r, listen, true);
        tourRoom = r;
        tourIndex = listen;
        showTour(r, listen);
      }),
    );
  content.append(controls, artLink(art));
  const prev = button('← Previous work', () => describe(r, i - 1)),
    next = button('Next work →', () => describe(r, i + 1));
  prev.disabled = i === 0;
  next.disabled = i === r.works.length - 1;
  content.append(row(prev, next));
}
function browse() {
  if (!room) return;
  const r = room;
  sheet('works', r.wing + ' / ' + r.works.length + ' works', r.title);
  const list = element('div', undefined, 'work-list');
  r.works.forEach((art, i) => {
    const b = button('', () => describe(r, i));
    b.append(picture(art), element('span', art.title));
    list.append(b);
  });
  content.append(list);
}
function updatePlayer() {
  const r = player.room;
  $('playing').hidden = !r;
  if (r) {
    $('pause').textContent = player.playing ? 'Pause' : 'Play';
    $('now').textContent = player.error
      ? 'Audio unavailable'
      : r.tour[player.index].title;
  }
  if (
    viewMode === 'tour' &&
    panel.open &&
    r &&
    r === tourRoom &&
    (tourIndex !== player.index || !$('toggle-tour'))
  ) {
    showTour(r, player.index);
  } else if (viewMode === 'tour' && $('toggle-tour')) {
    $('toggle-tour').textContent =
      r === tourRoom && player.index === tourIndex && player.playing
        ? 'Pause'
        : 'Play';
    $('tour-error').textContent = player.error;
  }
}
function showTour(r, index) {
  if (!r.tour.length) return;
  tourRoom = r;
  tourIndex = index;
  const s = r.tour[index];
  sheet('tour', r.wing + ' / Audio tour', r.title);
  const select = element('select');
  select.setAttribute('aria-label', 'Tour stop');
  select.style.maxWidth = '100%';
  r.tour.forEach((v, i) => {
    const o = element('option', i + 1 + ' · ' + v.kind + ' · ' + v.title);
    o.value = i;
    select.append(o);
  });
  select.value = index;
  select.onchange = () => {
    const n = Number(select.value);
    if (player.room) player.start(r, n);
    showTour(r, n);
  };
  const toggle = button(
    player.room === r && player.index === index && player.playing
      ? 'Pause'
      : 'Play',
    () => {
      if (player.room === r && player.index === index) {
        if (player.playing) player.pause();
        else player.resume();
      } else player.start(r, index);
    },
  );
  toggle.id = 'toggle-tour';
  const tourError = element('p', player.error, 'note');
  tourError.id = 'tour-error';
  tourError.setAttribute('role', 'status');
  content.append(
    select,
    row(toggle, button('Return to the room', closeSheet)),
    tourError,
  );
  if (s.id && allArt.has(s.id)) {
    const work = allArt.get(s.id);
    content.append(picture(work), element('h3', work.title));
    if (s.second && allArt.has(s.second)) {
      const other = allArt.get(s.second);
      content.append(picture(other), element('h3', other.title));
    }
    const i = r.works.findIndex((w) => w.id === s.id);
    if (i >= 0)
      content.append(
        button('Stand at this work', () => {
          stand(r, i);
          closeSheet();
        }),
      );
  }
  content.append(
    element('p', s.text || 'A silent stop for looking.', 'bodycopy'),
  );
}
function help() {
  sheet('help', 'Virtual visit', 'Visit controls');
  content.append(
    element(
      'p',
      'Walk with W and S or the up and down arrows. Step sideways with A and D. Drag to look around, or turn with the left and right arrows. The four on-screen arrows also work by touch. Select a clear patch of floor to step straight there.',
    ),
    element(
      'p',
      'Click a picture to read its label. Browse works lets you stand directly at any picture. The floor plan takes you to any room or lift landing.',
    ),
    element(
      'p',
      'The audio tour follows the room’s existing recordings and silent stops. You can keep walking while it plays. Entering another room ends the tour.',
    ),
    button(
      document.documentElement.dataset.theme === 'dark'
        ? 'Use white walls'
        : 'Use dark walls',
      () => {
        const dark = document.documentElement.dataset.theme !== 'dark';
        document.documentElement.dataset.theme = dark ? 'dark' : 'light';
        try {
          localStorage.setItem('nnxyz-theme', dark ? 'dark' : 'light');
        } catch {
          /* Local files can disallow storage. */
        }
        scene?.theme(dark);
        dirty = true;
        help();
      },
    ),
  );
}
$('map-button').onclick = () => showMap();
$('lift-button').onclick = () => showMap();
$('help-button').onclick = help;
$('works-button').onclick = browse;
$('tour-button').onclick = () => {
  if (room) showTour(room, player.room === room ? player.index : 0);
};
$('now').onclick = () => {
  if (player.room) showTour(player.room, player.index);
};
$('pause').onclick = () => (player.playing ? player.pause() : player.resume());
$('stop').onclick = () => player.end();
function fallback(message) {
  if (replayRoom) endDrawing();
  scene = null;
  canvas.hidden = true;
  $('flat').hidden = false;
  $('flat-message').textContent = message;
  document.querySelector('.movement').hidden = true;
  if (room) $('flat-image').src = pictures[room.works[lastWork].image];
}
function headsetActions() {
  return {
    replay: toggleDrawing,
    tick: tickDrawing,
    allowed: (x, z) => walkable(floor, x, z),
    moved(x, z) {
      pose.x = x;
      pose.z = z;
      location();
      scene.sync(x, z);
    },
    lift(n) {
      const f = floors.find((f) => f.number === n);
      setFloor(f);
      return f.landing;
    },
    tour(r) {
      if (player.room === r && player.playing && !player.single) player.pause();
      else player.start(r);
    },
    art(r, i) {
      const n = r.tour.findIndex(
        (s) => s.id === r.works[i].id && s.kind === 'work' && s.src,
      );
      if (n < 0) return;
      if (player.room === r && player.index === n && player.playing)
        player.pause();
      else player.start(r, n, true);
    },
    exit(x, z, yaw) {
      if (walkable(floor, x, z)) {
        pose.x = x;
        pose.z = z;
        pose.yaw = yaw;
        pose.pitch = 0;
        location();
      } else if (room) stand(room);
      else landing(floor);
      scene.resize();
      dirty = true;
    },
  };
}
try {
  scene = createGallery(canvas, pictures, headsetActions(), drawing.id);
} catch {
  fallback('3D is unavailable here. Use Browse works or Floor plan to visit.');
}
const vr = $('vr-button');
if (scene && navigator.xr)
  navigator.xr
    .isSessionSupported('immersive-vr')
    .then((ok) => {
      vr.hidden = !ok;
    })
    .catch(() => {});
vr.onclick = () => {
  sheet('headset', 'Virtual visit', 'Enter in a headset');
  content.append(
    element(
      'p',
      'Point a controller at the floor and press the trigger to move there. Push the thumbstick sideways to turn. Aim through an open door to enter the next room.',
    ),
    element(
      'p',
      'Select a picture to hear its recorded label where available. The first picture in each room has a Play room tour plaque. The lift in the hall has a button for each floor.',
    ),
  );
  const message = element('p', '', 'note');
  message.setAttribute('role', 'status');
  const start = button('Start headset visit', async () => {
    start.disabled = true;
    try {
      await scene.headset.enter(pose);
      closeSheet();
    } catch (error) {
      message.textContent =
        'The headset did not start this visit. ' + error.message;
      start.disabled = false;
    }
  });
  content.append(start, message);
};
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  fallback(
    'The 3D view was interrupted. Reload to restore walking, or continue with Browse works.',
  );
});
scene?.theme(document.documentElement.dataset.theme === 'dark');
scene?.resize();
stand(
  allRooms.find((r) => r.id === 'nifty-faces--boxes') ?? allRooms[0],
  0,
  true,
);
window.addEventListener('resize', () => {
  scene?.resize();
  dirty = true;
});
const movement = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
]);
window.addEventListener('keydown', (e) => {
  if (panel.open || e.altKey || e.metaKey || e.ctrlKey || !scene) return;
  if (movement.has(e.code)) {
    e.preventDefault();
    keys.add(e.code);
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', resetInput);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetInput();
    if (player.playing) player.pause();
  }
});
for (const b of document.querySelectorAll('[data-move]')) {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    keys.add(b.dataset.move);
  });
  b.addEventListener('lostpointercapture', () => keys.delete(b.dataset.move));
  b.addEventListener('click', (e) => {
    if (e.detail === 0 && scene) move(0.15, new Set([b.dataset.move]));
  });
}
canvas.addEventListener('pointerdown', (e) => {
  if (!e.isPrimary || e.button !== 0) return;
  canvas.setPointerCapture(e.pointerId);
  canvas.focus();
  drag = {
    x: e.clientX,
    y: e.clientY,
    lastX: e.clientX,
    lastY: e.clientY,
    moved: false,
  };
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || !e.isPrimary) return;
  if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
  if (drag.moved) {
    pose.yaw -= (e.clientX - drag.lastX) * 0.004;
    pose.pitch = clamp(
      pose.pitch - (e.clientY - drag.lastY) * 0.003,
      -0.88,
      0.88,
    );
    dirty = true;
  }
  drag.lastX = e.clientX;
  drag.lastY = e.clientY;
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag || !e.isPrimary) return;
  if (!drag.moved) {
    if (dirty) scene?.draw(pose);
    const rect = canvas.getBoundingClientRect(),
      hit = scene?.pick(
        (2 * (e.clientX - rect.left)) / rect.width - 1,
        1 - (2 * (e.clientY - rect.top)) / rect.height,
      );
    if (hit?.room) describe(hit.room, hit.index);
    else if (hit?.tour) {
      showTour(hit.tour, 0);
    } else if (hit?.replay) toggleDrawing(hit.replay);
    else if (hit?.lift) landing(floors.find((f) => f.number === hit.lift));
    else if (hit?.point && walkable(floor, hit.point.x, hit.point.z)) {
      pose.x = hit.point.x;
      pose.z = hit.point.z;
      location();
      scene.sync(pose.x, pose.z);
      dirty = true;
    }
  }
  drag = null;
});
canvas.addEventListener('lostpointercapture', () => {
  drag = null;
});
function move(dt, held) {
  const down = (...codes) => Number(codes.some((c) => held.has(c)));
  const turn = down('ArrowLeft') - down('ArrowRight');
  pose.yaw += turn * dt * 1.5;
  const f = down('ArrowUp', 'KeyW') - down('ArrowDown', 'KeyS'),
    s = down('KeyD') - down('KeyA');
  const step = (2.65 * dt) / Math.max(1, Math.hypot(s, f));
  const dx = (s * Math.cos(pose.yaw) - f * Math.sin(pose.yaw)) * step,
    dz = (-f * Math.cos(pose.yaw) - s * Math.sin(pose.yaw)) * step;
  if (walkable(floor, pose.x + dx, pose.z)) pose.x += dx;
  if (walkable(floor, pose.x, pose.z + dz)) pose.z += dz;
  location();
  scene.sync(pose.x, pose.z);
  dirty = true;
}
function frame(time) {
  if (!scene) return;
  if (!scene.headset.active) tickDrawing(time);
  if (!panel.open && keys.size)
    move(Math.min(0.05, (time - last) / 1000), keys);
  if (dirty || previousEpoch !== scene.epoch) {
    scene.draw(pose);
    dirty = false;
    previousEpoch = scene.epoch;
  }
  last = time;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
