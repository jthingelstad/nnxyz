import { planFloor, roomAt, walkable } from './layout.js';
import { viewpoint } from './viewpoint.js';
import { createGallery } from './scene.js';
import { makeWallPlayer } from './wall-player.js';
import { makePlayer } from './audio.js';
const $ = (id) => document.getElementById(id);
const dataEl = $('museum');
const {
  floors: raw,
  pictures = {},
  deliveryUrl = window.location.origin,
  productionUrl = window.location.origin,
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
  lastWork = 0,
  movedOnce = false;
function hideWalkHint() {
  if (movedOnce) return;
  movedOnce = true;
  $('walk-hint').hidden = true;
}
let drawings;
function toggleDrawing(r, index, focus = false) {
  if (!scene || !r.works[index].replay) return;
  if (focus) {
    stand(r, index);
    closeSheet();
  }
  drawings.activate(r, index);
}
$('draw-pair').onclick = () => {
  if (room?.light === 'dusk') drawings?.together(room);
};
const player = makePlayer($('audio'), deliveryUrl, updatePlayer);
const hosted = Boolean($('visit-entrance'));
let entrySource = '';
let guided = false,
  entryTimer = 0;
const heard = new Set();
function scheduleIntro(r, immediate = false) {
  clearTimeout(entryTimer);
  if (!guided || !r || heard.has(r.id)) return;
  function begin() {
    if (!guided || room !== r || player.room || document.hidden) return;
    const n = r.tour.findIndex((s) => s.kind === 'introduction' && s.src);
    if (n < 0) return;
    heard.add(r.id);
    player.start(r, n, false, true);
  }
  if (immediate) begin();
  else entryTimer = setTimeout(begin, 600);
}
$('guide-button').onclick = () => {
  guided = !guided;
  $('guide-button').setAttribute('aria-pressed', String(guided));
  $('guide-button').textContent = guided ? 'Room audio on' : 'Room audio off';
  if (!guided) {
    clearTimeout(entryTimer);
    if (player.intro) player.end();
  } else scheduleIntro(room, true);
};
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
  img.src = pictures[work.image] ?? work.image;
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
  a.target = hosted ? '_self' : '_blank';
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
  if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
  else canvas.focus();
});
let displayedFloor, displayedRoom;
function location() {
  const next = roomAt(floor, pose.x, pose.z);
  const liftHidden =
    Math.hypot(pose.x - floor.landing.x, pose.z - floor.landing.z) > 4;
  if ($('lift-button').hidden !== liftHidden)
    $('lift-button').hidden = liftHidden;
  if (displayedFloor === floor && displayedRoom === next) return;
  displayedFloor = floor;
  displayedRoom = next;
  drawings?.keepVisible(next);
  if (next !== room && player.room && player.room !== next) player.end();
  if (next !== room) {
    lastWork = 0;
    scheduleIntro(next);
  }
  room = next;
  updateAddress();
  updateHangingButton();
  $('place').textContent = room?.title ?? 'Gallery hall';
  $('walk-hint').hidden = Boolean(room || movedOnce || !scene);
  $('address').textContent =
    'Floor ' +
    String(floor.number).padStart(2, '0') +
    ' / ' +
    (room?.wing ?? 'The nnxyz Rooms');
  $('wing-dot').style.background = room?.color ?? '#9a978c';
  $('works-button').hidden = false;
  $('works-button').textContent = room ? 'Browse works' : 'Choose a room';
  $('hall-button').hidden = !room;
  $('tour-button').hidden = !room?.tour.length;
}
function updateHangingButton() {
  $('draw-pair').hidden = !(scene && room?.light === 'dusk');
  const b = $('hanging-button');
  b.hidden = !(room?.hangingCount > 1 && scene);
  if (!b.hidden)
    b.textContent =
      'Next hanging · ' + ((room.activeSet ?? 0) + 1) + '/' + room.hangingCount;
}
function showHanging(r, set) {
  if (r.activeSet === set) return;
  r.activeSet = set;
  if (room === r) updateAddress();
  drawings?.keepVisible(r);
  scene?.sync(pose.x, pose.z);
  updateHangingButton();
  dirty = true;
}
function nextHanging(r) {
  if (r?.hangingCount > 1)
    showHanging(r, ((r.activeSet ?? 0) + 1) % r.hangingCount);
}
$('hanging-button').onclick = () => nextHanging(room);
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
  const s = r.hang[index];
  r.activeSet = s.set;
  drawings?.keepVisible(r);
  const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  Object.assign(pose, viewpoint(floor, r, index, arrival, aspect || 1));
  let target = s;
  if (arrival && r.light === 'dusk' && aspect > 1.1) {
    // Take in both landscapes together on entering the room.
    const [left, right] = r.hang;
    pose.x = (left.x + right.x) / 2;
    pose.z = r.z + Math.min(r.d * 0.7, 10);
    target = {
      x: pose.x,
      z: (left.z + right.z) / 2,
      y: (left.y + right.y) / 2,
    };
  } else if (arrival && r.hangingCount > 1 && aspect > 1.3) {
    const [first, second] = r.hang;
    const x = r.x + r.w * 0.39,
      z = r.z + r.d * 0.62;
    if (walkable(floor, x, z)) {
      Object.assign(pose, { x, z });
      target = {
        x: (first.x + second.x) / 2,
        z: (first.z + second.z) / 2,
        y: (first.y + second.y) / 2,
      };
    }
  } else if (arrival && !r.light && aspect > 1) {
    const next = r.hang[index + 1];
    if (next)
      target = {
        x: s.x + (next.x - s.x) * 0.72,
        z: s.z + (next.z - s.z) * 0.72,
        y: s.y,
      };
  }
  face(target.x, target.z);
  pose.pitch = Math.atan2(
    target.y - 1.62,
    Math.hypot(pose.x - target.x, pose.z - target.z),
  );
  location();
  updateAddress(arrival ? null : s.art);
  updateHangingButton();
  lastWork = index;
  scene?.sync(pose.x, pose.z);
  dirty = true;
  if (!scene) $('flat-image').src = pictures[s.art.image] ?? s.art.image;
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
function showRooms(number = floor.number) {
  const level = floors.find((f) => f.number === number);
  sheet('rooms', 'The nnxyz Rooms', 'Choose a room');
  content.append(
    row(
      ...floors.map((f) => {
        const item = button('Floor ' + f.number, () => showRooms(f.number));
        if (f === level) item.setAttribute('aria-current', 'true');
        return item;
      }),
    ),
  );
  content.append(element('p', level.label, 'note'));
  const rooms = element('div', undefined, 'room-directory');
  for (const r of level.rooms) {
    const item = button('', () => jump(r));
    const img = picture(r.works[0]);
    img.loading = 'lazy';
    img.alt = '';
    const label = element('span', r.title);
    label.append(element('small', r.wing));
    item.append(img, label);
    rooms.append(item);
  }
  content.append(rooms);
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
  if (f === floor && room) {
    const exits = f.exits.filter((e) => e.from === room.id || e.to === room.id);
    content.append(element('h3', 'Doorways from ' + room.title));
    const links = row();
    for (const edge of exits) {
      const other = edge.from === room.id ? edge.to : edge.from;
      const d = edge.door,
        mid = (d.lo + d.hi) / 2;
      const x = d.horizontal ? mid : d.fixed,
        z = d.horizontal ? d.fixed : mid;
      const nx = d.horizontal ? 0 : Math.sign(room.x + room.w / 2 - x),
        nz = d.horizontal ? Math.sign(room.z + room.d / 2 - z) : 0;
      links.append(
        button(
          'Doorway to ' +
            (f.rooms.find((r) => r.id === other)?.title ?? 'Gallery hall'),
          () => {
            pose.x = x + nx * 0.9;
            pose.z = z + nz * 0.9;
            face(x - nx, z - nz);
            location();
            scene?.sync(pose.x, pose.z);
            dirty = true;
            closeSheet();
          },
        ),
      );
    }
    content.append(links);
  }
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
  for (const s of [...f.rooms.flatMap((r) => r.panels), ...f.guides]) {
    map.append(
      svg('line', {
        x1: s.a.x,
        y1: s.a.z,
        x2: s.b.x,
        y2: s.b.z,
        stroke: '#61564a',
        'stroke-width': 0.32,
        'pointer-events': 'none',
      }),
    );
  }
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
  sheet('label', r.wing + ' / ' + r.hang[i].chapter, art.title);
  content.append(
    element(
      'p',
      [art.artist, art.date, art.medium].filter(Boolean).join(' · '),
      'note',
    ),
    picture(art),
    element('p', art.caption, 'bodycopy'),
  );
  const listen = r.tour.findIndex(
    (s) => s.id === art.id && s.kind === 'work' && s.src,
  );
  const controls = row(
    button('Stand here', () => {
      stand(r, i);
      closeSheet();
    }),
  );
  if (art.replay && scene)
    controls.append(
      button('Watch it draw on the wall', () => toggleDrawing(r, i, true)),
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
  content.append(element('p', r.introduction, 'bodycopy'));
  let list;
  r.works.forEach((art, i) => {
    const spot = r.hang[i];
    if (spot.first || !list) {
      content.append(element('h3', spot.chapter));
      list = element('div', undefined, 'work-list');
      content.append(list);
    }
    const b = button('', () => describe(r, i));
    const img = picture(art);
    img.loading = 'lazy';
    b.append(img, element('span', art.title));
    list.append(b);
  });
}
function narratedIndex() {
  if (!player.room || player.room !== room) return -1;
  const id = room.tour[player.index]?.id;
  return room.works.findIndex((w) => w.id === id);
}
function updatePlayer() {
  const r = player.room;
  $('tour-look').hidden = narratedIndex() < 0;
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
    player.room === r &&
      player.index === index &&
      player.playing &&
      !player.intro
      ? 'Pause'
      : 'Play',
    () => {
      if (player.room === r && player.index === index && !player.intro) {
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
      'Walk with W and S or the up and down arrows. Step sideways with A and D. Drag to look around, or turn with the left and right arrows. The four on-screen arrows also work by touch. Hold Shift for the fastest pace. Select a clear patch of floor to step straight there.',
    ),
    element(
      'p',
      'Click a picture to read its label. Browse works lets you stand directly at any picture. The floor plan takes you to any room or lift landing.',
    ),
    element(
      'p',
      'The audio tour follows the room’s existing recordings and silent stops. You can keep walking while it plays. Switch on Room audio for an introduction the first time you enter each room. You can also start the full tour yourself.',
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
$('works-button').onclick = () => (room ? browse() : showRooms());
$('hall-button').onclick = () => arrive(floor, room?.id);
$('tour-button').onclick = () => {
  if (room) showTour(room, player.room === room ? player.index : 0);
};
$('now').onclick = () => {
  if (player.room) showTour(player.room, player.index);
};
$('tour-look').onclick = () => {
  const index = narratedIndex();
  if (index >= 0) stand(room, index);
};
$('pause').onclick = () => (player.playing ? player.pause() : player.resume());
$('stop').onclick = () => player.end();
function fallback(message) {
  drawings?.keepVisible(null);
  scene = null;
  updateHangingButton();
  canvas.hidden = true;
  $('flat').hidden = false;
  $('flat-message').textContent = message;
  document.querySelector('.movement').hidden = true;
  if (room)
    $('flat-image').src =
      pictures[room.works[lastWork].image] ?? room.works[lastWork].image;
}
function headsetActions() {
  return {
    change: nextHanging,
    replay: (pick) => toggleDrawing(pick.room, pick.index),
    enter(id) {
      const r = allRooms.find((r) => r.id === id);
      stand(r, 0, true);
      return { x: pose.x, z: pose.z, yaw: pose.yaw };
    },

    tick: (t) => drawings?.tick(t),
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
  scene = createGallery(canvas, pictures, headsetActions());
  drawings = makeWallPlayer(scene);
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
      'Select a picture to hear its recorded label where available. Each stroke-based work has a drawing playback plaque. Select a preview in the hall to enter its room. The lift in the hall has a button for each floor.',
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
function arrive(f, id) {
  setFloor(f);
  const g = f.guides.find((g) => g.roomId === id) ?? f.guides[0];
  pose.x = clamp(g.x + Math.sin(g.angle) * 4.65 + 3.25, 0.5, f.width - 0.5);
  pose.z = f.hallZ + 1.05;
  face(g.x, g.z);
  pose.yaw -= canvas.clientWidth > 650 ? 0.36 : 0;
  pose.pitch = 0.08;
  location();
  scene?.sync(pose.x, pose.z);
  dirty = true;
  closeSheet();
  if (!scene) $('flat-image').src = pictures[g.art.image] ?? g.art.image;
}
function updateAddress(art = null) {
  if (!hosted) return;
  const hash = new URLSearchParams(
    art && room
      ? { work: art.id }
      : room
        ? { room: room.id }
        : { floor: String(floor.number) },
  );
  if (entrySource) hash.set('from', entrySource);
  if (window.location.hash !== '#' + hash)
    history.replaceState(history.state, '', '#' + hash);
  const link = $('return-link');
  link.hidden = false;
  link.href =
    art?.href ?? room?.href ?? (entrySource === 'map' ? '/map/' : '/');
  link.textContent = art
    ? 'Artwork page'
    : room
      ? 'Room page'
      : entrySource === 'map'
        ? 'Museum map'
        : 'Gallery home';
}
function startVisit() {
  const p = new URLSearchParams(window.location.hash.slice(1));
  entrySource = ['home', 'map'].includes(p.get('from')) ? p.get('from') : '';
  const work = p.get('work');
  const workRoom = work
    ? allRooms.find((r) => r.works.some((w) => w.id === work))
    : null;
  const r = workRoom ?? allRooms.find((r) => r.id === p.get('room'));
  if (r)
    stand(r, workRoom ? r.works.findIndex((w) => w.id === work) : 0, !workRoom);
  else
    arrive(
      floors.find((f) => f.number === Number(p.get('floor'))) ?? floors[0],
    );
  if (!r) updateAddress();
  if (hosted && scene) {
    $('visit-entrance').hidden = true;
    $('visit').hidden = false;
    document.body.classList.add('visit-active');
    scene.resize();
  }
}
if (hosted) {
  if (scene) $('visit').hidden = false;
  else
    $('visit-entrance').querySelector('p').textContent =
      'Open a room below to see the art and hear its audio tour. The walk-through needs WebGL.';
}
startVisit();
window.addEventListener('hashchange', startVisit);
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
  'ShiftLeft',
  'ShiftRight',
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
    hideWalkHint();
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
    } else if (hit?.replay) toggleDrawing(hit.replay.room, hit.replay.index);
    else if (hit?.enter) jump(allRooms.find((r) => r.id === hit.enter));
    else if (hit?.lift) landing(floors.find((f) => f.number === hit.lift));
    else if (hit?.point && walkable(floor, hit.point.x, hit.point.z)) {
      hideWalkHint();
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
  if (turn || f || s) hideWalkHint();
  const speed = down('ShiftLeft', 'ShiftRight') ? 8 : Number($('pace').value);
  const step = (speed * dt) / Math.max(1, Math.hypot(s, f));
  const dx = (s * Math.cos(pose.yaw) - f * Math.sin(pose.yaw)) * step,
    dz = (-f * Math.cos(pose.yaw) - s * Math.sin(pose.yaw)) * step;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.16));
  for (let j = 0; j < steps; j++) {
    if (walkable(floor, pose.x + dx / steps, pose.z)) pose.x += dx / steps;
    if (walkable(floor, pose.x, pose.z + dz / steps)) pose.z += dz / steps;
  }
  location();
  scene.sync(pose.x, pose.z);
  dirty = true;
}
function frame(time) {
  if (!scene) return;
  if (!scene.headset.active) drawings.tick(time);
  if (!panel.open && keys.size)
    move(Math.min(0.12, (time - last) / 1000), keys);
  if (dirty || previousEpoch !== scene.epoch) {
    scene.draw(pose);
    dirty = false;
    previousEpoch = scene.epoch;
  }
  last = time;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
