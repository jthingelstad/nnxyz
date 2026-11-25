import * as T from 'three';
import { floorLight } from './floor-light.js';
import { buildRoof } from './roof.js';
import { makeHeadset } from './headset.js';
import { roomAt } from './layout.js';
import { mountPlaque, wallHit } from './plaque.js';
import { vectorWall } from './vector-wall.js';

const height = 4.1;
const eye = 1.62;
const ink = (color) => new T.MeshBasicMaterial({ color });
const matte = (color, map) =>
  new T.MeshLambertMaterial({ color, ...(map ? { map } : {}) });
function canvasTexture(w, h, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext('2d'), w, h);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function stone() {
  const map = canvasTexture(384, 384, (ctx, w, h) => {
    ctx.fillStyle = '#d3cbbd';
    ctx.fillRect(0, 0, w, h);
    let seed = 53;
    const random = () => (seed = Math.imul(16807, seed) >>> 0) / 4294967296;
    for (let i = 0; i < 5500; i++) {
      ctx.fillStyle = i % 3 ? 'rgba(91,79,62,.10)' : 'rgba(255,253,242,.53)';
      ctx.fillRect(
        random() * w,
        random() * h,
        random() * 1.8 + 0.4,
        random() * 1.5 + 0.4,
      );
    }
    ctx.strokeStyle = 'rgba(117,105,91,.38)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);
  });
  map.wrapS = map.wrapT = T.RepeatWrapping;
  return map;
}
function plaster() {
  const map = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    for (const [p, c] of [
      [0, '#d7d2c9'],
      [0.12, '#f6f4ee'],
      [0.42, '#fbfaf6'],
      [0.87, '#e9e5db'],
      [1, '#bfb8ac'],
    ])
      g.addColorStop(p, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const light = ctx.createRadialGradient(w / 2, 35, 3, w / 2, 40, 128);
    light.addColorStop(0, 'rgba(255,255,255,0.31)');
    light.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);
  });
  map.wrapS = T.RepeatWrapping;
  return map;
}
function box(parent, w, h, d, x, y, z, material, angle = 0, repeat = 1) {
  const geometry = new T.BoxGeometry(w, h, d);
  if (repeat !== 1) {
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * repeat);
  }
  const mesh = new T.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;
  parent.add(mesh);
  return mesh;
}
function plate(parent, w, h, x, y, z, material, angle = 0) {
  const mesh = new T.Mesh(new T.PlaneGeometry(w, h), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = angle;
  parent.add(mesh);
  return mesh;
}
function lettering(text, small = false, dark = false) {
  const map = canvasTexture(small ? 512 : 1024, 128, (ctx, w, h) => {
    ctx.fillStyle = dark ? '#282925' : '#f3f0e9';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = dark ? '#faf8f0' : '#302f29';
    ctx.font =
      (small ? '500 43' : '500 54') + 'px Helvetica Neue, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2, w - 24);
  });
  return new T.MeshBasicMaterial({ map });
}
function discard(group, shared) {
  group.traverse((obj) => {
    obj.geometry?.dispose();
    if (obj.material && !shared.has(obj.material)) {
      obj.material.map?.dispose();
      obj.material.dispose();
    }
  });
  group.removeFromParent();
}
export function createGallery(canvas, pictures, actions) {
  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor('#e5e1d8');
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(62, 1, 0.045, 135);
  camera.rotation.order = 'YXZ';
  scene.add(new T.HemisphereLight(0xfffffc, 0xf4f0e8, 2.2));
  const sun = new T.DirectionalLight(0xfffbf2, 1.06);
  sun.position.set(-3, 8, 5);
  scene.add(sun);
  const wall = matte('#ffffff', plaster()),
    floorMat = matte('#ffffff', stone());
  const plinth = matte('#b7b1a7'),
    oak = matte('#ae8052'),
    leg = matte('#514c43'),
    frame = matte('#716554'),
    ceiling = matte('#f0eee7'),
    windowMat = ink('#fffcf0'),
    wallShadow = ink('#c6bfb2'),
    mount = ink('#faf8ef');
  const hallStone = matte('#89998f', stone());
  const roofMaterials = { soffit: ceiling, glass: windowMat, timber: oak };
  for (const m of Object.values(roofMaterials)) m.side = T.DoubleSide;
  const pool = canvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(55,42,29,.26)');
    g.addColorStop(0.6, 'rgba(63,51,39,.13)');
    g.addColorStop(1, 'rgba(57,46,33,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const benchShadow = new T.MeshBasicMaterial({
    map: pool,
    transparent: true,
    depthWrite: false,
  });
  const shared = new Set([
    wall,
    floorMat,
    plinth,
    oak,
    leg,
    frame,
    ceiling,
    windowMat,
    wallShadow,
    mount,
    benchShadow,
    hallStone,
  ]);
  // A single pigmented return wall gives each wing a landmark from its door.
  const pigments = {
    'nifty-faces': '#bcbca9',
    rawblocks: '#b3bbb1',
    abstract: '#a8bdb9',
    nnotb: '#b2c0c9',
    'nnxyz-other': '#c2ad98',
    scrimshaw: '#b9aec3',
    'after-nifty-ink': '#aeb8c0',
  };
  const returns = Object.fromEntries(
    Object.entries(pigments).map(([id, color]) => {
      const m = matte(color, wall.map);
      shared.add(m);
      return [id, m];
    }),
  );
  const loader = new T.TextureLoader();
  const vectorEdge = Math.min(
    renderer.capabilities.maxTextureSize,
    matchMedia('(pointer: coarse)').matches ? 1536 : 2048,
  );
  // Each finish pairs a lit plaster wall with the underside of its roof.
  const finishes = {};
  for (const [name, colors] of Object.entries({
    dusk: ['#263840', '#4c5e63', '#ab8567', '#465258', '#f9d9ab'],
    lantern: ['#3e302c', '#755342', '#e0ba86', '#786354', '#fff0ca'],
    northlight: ['#384957', '#728894', '#cbdae1', '#82919b', '#effaff'],
  })) {
    const map = canvasTexture(512, 512, (ctx, w, h) => {
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, colors[2]);
      wash.addColorStop(0.24, colors[1]);
      wash.addColorStop(1, colors[0]);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      const beam = ctx.createRadialGradient(
        w * 0.48,
        -h * 0.2,
        0,
        w * 0.48,
        -h * 0.2,
        h * 1.05,
      );
      beam.addColorStop(0, 'rgba(255,249,228,.34)');
      beam.addColorStop(0.78, 'rgba(255,249,228,0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, w, h);
    });
    const finish = {
      wall: new T.MeshBasicMaterial({ map }),
      soffit: matte(colors[3]),
      glass: ink(colors[4]),
      timber: oak,
    };
    for (const m of Object.values(finish)) {
      m.side = T.DoubleSide;
      shared.add(m);
    }
    finishes[name] = finish;
  }
  const projections = new Map();
  function replaySign(id, state) {
    targets
      .find((t) => t.userData.room.works[t.userData.index].id === id)
      ?.userData.printLabel?.(state);
    epoch++;
  }
  let shell = null,
    floor = null,
    hanging = new Map(),
    targets = [],
    epoch = 0;
  function clearArt(id) {
    const group = hanging.get(id);
    if (!group) return;
    for (const [artId, projection] of projections)
      if (projection.userData.room.id === id) setDrawing(null, artId);
    group.userData.active = false;
    group.userData.detail?.abort();
    discard(group, shared);
    hanging.delete(id);
    targets = targets.filter((mesh) => mesh.userData.room.id !== id);
  }
  function hangRoom(room) {
    const group = new T.Group();
    group.userData.active = true;
    group.userData.set = room.activeSet ?? 0;
    shell.add(group);
    hanging.set(room.id, group);
    for (const [index, spot] of room.hang.entries()) {
      if (spot.set !== group.userData.set) continue;
      const g = new T.Group();
      group.add(g);
      g.position.set(spot.x, spot.y, spot.z);
      g.rotation.y = spot.angle;
      const w = spot.width,
        h = spot.height;
      plate(g, w + 0.108, h + 0.108, 0.018, -0.026, -0.014, wallShadow);
      box(g, w + 0.084, h + 0.084, 0.047, 0, 0, 0.011, frame);
      plate(g, w + 0.049, h + 0.049, 0, 0, 0.036, mount);
      const surface = new T.MeshBasicMaterial({ color: 0xffffff });
      const face = plate(g, w, h, 0, 0, 0.038, surface);
      face.userData = { room, index };
      targets.push(face);
      loader.load(pictures[spot.art.image] ?? spot.art.image, (map) => {
        if (!group.userData.active || face.userData.detailed) {
          map.dispose();
          return;
        }
        map.colorSpace = T.SRGBColorSpace;
        map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        surface.map = map;
        surface.needsUpdate = true;
        epoch++;
      });
      face.userData.printLabel = mountPlaque(g, spot, room, index);
    }
  }
  function setFloor(next) {
    for (const id of [...hanging.keys()]) clearArt(id);
    if (shell) discard(shell, shared);
    shell = new T.Group();
    scene.add(shell);
    floor = next;
    const ground = plate(
      shell,
      floor.width,
      floor.depth,
      floor.width / 2,
      0,
      floor.depth / 2,
      floorMat,
    );
    ground.userData.ground = true;
    ground.rotation.x = -Math.PI / 2;
    floorMat.map.repeat.set(floor.width / 1.6, floor.depth / 1.6);
    for (const s of floor.walls) {
      const l = s.hi - s.lo,
        at = (s.lo + s.hi) / 2,
        x = s.horizontal ? at : s.fixed,
        z = s.horizontal ? s.fixed : at,
        a = s.horizontal ? 0 : Math.PI / 2;
      box(shell, l + 0.006, height, 0.15, x, height / 2, z, wall, a, l / 3.3);
      box(shell, l, 0.075, 0.169, x, 0.038, z, plinth, a);
    }
    for (const d of floor.doors) {
      const l = d.hi - d.lo,
        at = (d.hi + d.lo) / 2,
        x = d.horizontal ? at : d.fixed,
        z = d.horizontal ? d.fixed : at;
      box(
        shell,
        l,
        height - 2.65,
        0.15,
        x,
        (2.65 + height) / 2,
        z,
        wall,
        d.horizontal ? 0 : Math.PI / 2,
      );
      // Two signs face the adjoining spaces. The name identifies the room entered.
      for (const sign of [-1, 1]) {
        const dx = d.horizontal ? 0 : sign,
          dz = d.horizontal ? sign : 0;
        const side = floor.rooms.find(
          (r) =>
            x - dx * 0.35 > r.x &&
            x - dx * 0.35 < r.x + r.w &&
            z - dz * 0.35 > r.z &&
            z - dz * 0.35 < r.z + r.d,
        );
        const title =
          side?.title ?? (z >= floor.depth - 0.2 ? 'Entrance' : 'Gallery hall');
        plate(
          shell,
          l * 0.85,
          0.32,
          x + dx * 0.086,
          2.91,
          z + dz * 0.086,
          lettering(title, false, true),
          Math.atan2(dx, dz),
        );
      }
    }
    for (const room of floor.rooms) {
      const finish = finishes[room.light];
      if (finish)
        for (const side of room.sides) {
          const face = (lo, hi, bottom) => {
            if (hi <= lo + 0.002) return;
            const t = (lo + hi) / (2 * side.len),
              nx = Math.sin(side.angle),
              nz = Math.cos(side.angle);
            plate(
              shell,
              hi - lo,
              room.ceiling - bottom,
              side.a.x + (side.b.x - side.a.x) * t + 0.08 * nx,
              (room.ceiling + bottom) / 2,
              side.a.z + (side.b.z - side.a.z) * t + 0.08 * nz,
              finish.wall,
              side.angle,
            );
          };
          let at = 0;
          for (const gap of side.gaps) {
            face(at, gap.lo, 0);
            face(gap.lo, gap.hi, 2.65);
            at = gap.hi;
          }
          face(at, side.len, 0);
        }
      for (const s of room.panels) {
        box(
          shell,
          s.len + 0.035,
          s.height,
          0.18,
          s.x,
          s.height / 2,
          s.z,
          finish?.wall ??
            (s === room.panels[0] ? returns[room.wingId] : wall) ??
            wall,
          s.angle,
          s.len / 3.3,
        );
        box(
          shell,
          s.len + 0.045,
          0.052,
          0.202,
          s.x,
          s.height,
          s.z,
          oak,
          s.angle,
        );
        box(
          shell,
          s.len + 0.025,
          0.085,
          0.196,
          s.x,
          0.043,
          s.z,
          plinth,
          s.angle,
        );
      }
      buildRoof(shell, room, room.ceiling, finish ?? roofMaterials);
      const b = room.seat;
      if (b) {
        const shade = plate(shell, 3.4, 1.25, b.x, 0.006, b.z, benchShadow);
        shade.rotation.x = -Math.PI / 2;
        for (const dx of [-0.84, 0.84])
          box(shell, 0.13, 0.4, 0.38, b.x + dx, 0.21, b.z, leg);
        for (let i = -2; i <= 2; i++)
          box(shell, 2.28, 0.085, 0.087, b.x, 0.47, b.z + i * 0.095, oak);
      }
    }
    // A daylit promenade. The angled frames are full-size previews with a
    // destination label; the room doors opposite them remain physical exits.
    const loadPreview = (group, art, w, h, x, y, z, meta) => {
      const m = ink('#ffffff');
      const mesh = plate(group, w, h, x, y, z, m);
      mesh.userData = meta;
      const owner = shell;
      loader.load(pictures[art.image] ?? art.image, (map) => {
        if (shell !== owner) {
          map.dispose();
          return;
        }
        map.colorSpace = T.SRGBColorSpace;
        map.anisotropy = 4;
        m.map = map;
        m.needsUpdate = true;
        epoch++;
      });
    };
    const hallDepth = floor.depth - floor.hallZ,
      cz = floor.hallZ + hallDepth * 0.46;
    const promenade = plate(
      shell,
      floor.width,
      hallDepth,
      floor.width / 2,
      0.004,
      cz + hallDepth * 0.04,
      hallStone,
    );
    promenade.rotation.x = -Math.PI / 2;
    promenade.userData.ground = true;
    const light = plate(
      shell,
      floor.width,
      floor.depth,
      floor.width / 2,
      0.016,
      floor.depth / 2,
      floorLight(floor),
    );
    light.rotation.x = -Math.PI / 2;
    light.userData.ground = true;
    hallStone.map.repeat.set(floor.width / 1.35, hallDepth / 1.35);
    for (let j = 0; j <= Math.ceil(floor.width / 4); j++) {
      const x = Math.min(
        floor.width - 0.14,
        (j * floor.width) / Math.ceil(floor.width / 4),
      );
      box(shell, 0.17, height, 0.16, x, height / 2, floor.depth - 0.1, oak);
    }
    buildRoof(
      shell,
      { x: 0, z: floor.hallZ, w: floor.width, d: hallDepth, wingId: 'hall' },
      height,
      roofMaterials,
    );
    // A narrow inlaid line ties the lift and the room thresholds together.
    box(shell, floor.width, 0.008, 0.028, floor.width / 2, 0.005, cz, leg);
    for (const g of floor.guides) {
      const shadow = plate(
        shell,
        g.len + 1.3,
        1.5,
        g.x,
        0.012,
        g.z,
        benchShadow,
      );
      shadow.rotation.order = 'YXZ';
      shadow.rotation.y = g.angle;
      shadow.rotation.x = -Math.PI / 2;
      const group = new T.Group();
      group.position.set(g.x, 0, g.z);
      group.rotation.y = g.angle;
      shell.add(group);
      const meta = { enter: g.roomId },
        w = g.len;
      box(group, w, 2.94, 0.22, 0, 1.47, 0, wall).userData = meta;
      box(group, w + 0.05, 0.07, 0.26, 0, 2.94, 0, oak);
      const iw = Math.min(w * 0.47, 1.96, 1.84 * g.art.ratio),
        ih = iw / g.art.ratio;
      box(
        group,
        iw + 0.085,
        ih + 0.085,
        0.075,
        -w * 0.22,
        1.56,
        0.135,
        frame,
      ).userData = meta;
      loadPreview(group, g.art, iw, ih, -w * 0.22, 1.56, 0.176, meta);
      const sign = canvasTexture(896, 768, (ctx, W, H) => {
        ctx.fillStyle = '#f4f1e9';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = g.color;
        ctx.fillRect(54, 58, 100, 12);
        ctx.fillStyle = '#474840';
        ctx.font = '500 39px Helvetica Neue,Arial,sans-serif';
        ctx.fillText(g.wing, 54, 150, W - 110);
        ctx.fillStyle = '#282923';
        ctx.font = 'normal 80px Georgia,serif';
        let line = '',
          y = 300;
        for (const word of g.title.split(' ')) {
          const test = line ? line + ' ' + word : word;
          if (line && ctx.measureText(test).width > W - 105) {
            ctx.fillText(line, 54, y);
            y += 86;
            line = word;
          } else line = test;
        }
        ctx.fillText(line, 54, y, W - 105);
        ctx.font = '500 41px Helvetica Neue,Arial,sans-serif';
        ctx.fillText('Enter room  →', 54, H - 67);
      });
      plate(
        group,
        w * 0.43,
        (w * 0.43 * 768) / 896,
        w * 0.265,
        1.58,
        0.12,
        new T.MeshBasicMaterial({ map: sign }),
      ).userData = meta;
      // The back is a readable destination from the other end of the hall too.
      plate(
        group,
        w * 0.72,
        0.48,
        0,
        1.62,
        -0.12,
        lettering(g.title),
        Math.PI,
      ).userData = meta;
    }
    for (const exit of floor.exits.filter((e) => e.to === 'hall')) {
      const r = floor.rooms.find((r) => r.id === exit.from),
        art = r.works.at(r.primaryCount - 1);
      const door = exit.door,
        side = door.lo - r.x > r.x + r.w - door.hi ? -1 : 1;
      const at = side === 1 ? door.hi + 1.38 : door.lo - 1.38;
      if (at < r.x + 0.8 || at > r.x + r.w - 0.8) continue;
      const iw = Math.min(1.48, 1.48 * art.ratio),
        ih = iw / art.ratio;
      box(
        shell,
        iw + 0.08,
        ih + 0.08,
        0.07,
        at,
        1.58,
        floor.hallZ + 0.12,
        frame,
      );
      loadPreview(shell, art, iw, ih, at, 1.58, floor.hallZ + 0.16, {
        enter: r.id,
      });
    }
    // Mount the lift directory on the end wall, out of the view of the art.
    const lift = new T.Group();
    shell.add(lift);
    lift.position.set(floor.width - 0.12, 0, floor.landing.z);
    lift.rotation.y = -Math.PI / 2;
    box(lift, 3.15, 2.8, 0.11, 0, 1.4, 0, leg);
    plate(
      lift,
      2.72,
      0.5,
      0,
      1.94,
      0.063,
      lettering('Floor ' + floor.number + '   /   Lift', false, true),
    );
    for (let n = 1; n <= 3; n++)
      plate(
        lift,
        0.82,
        0.34,
        (n - 2) * 0.9,
        1.16,
        0.071,
        lettering('Floor ' + n, true),
      ).userData.lift = n;
    epoch++;
  }
  function sharpen(room, group) {
    if (group.userData.detail) return;
    const request = new AbortController();
    group.userData.detail = request;
    for (const face of targets.filter((t) => t.userData.room === room)) {
      const art = room.works[face.userData.index];
      vectorWall(art, vectorEdge, request.signal)
        .then((canvas) => {
          if (request.signal.aborted) return;
          const map = new T.CanvasTexture(canvas);
          map.colorSpace = T.SRGBColorSpace;
          map.anisotropy = Math.min(
            8,
            renderer.capabilities.getMaxAnisotropy(),
          );
          face.userData.detailed = true;
          face.material.map?.dispose();
          face.material.map = map;
          face.material.needsUpdate = true;
          epoch++;
        })
        .catch(() => {
          /* The published poster remains available while off-line. */
        });
    }
  }
  function sync(x, z) {
    const current = roomAt(floor, x, z);
    for (const room of floor.rooms) {
      const near =
        x >= room.x - 5 &&
        x <= room.x + room.w + 5 &&
        z >= room.z - 5 &&
        z <= room.z + room.d + 5;
      if (
        near &&
        hanging.has(room.id) &&
        hanging.get(room.id).userData.set !== (room.activeSet ?? 0)
      )
        clearArt(room.id);
      if (near && !hanging.has(room.id)) hangRoom(room);
      if (current === room && room.light) sharpen(room, hanging.get(room.id));
      if (!near && hanging.has(room.id)) clearArt(room.id);
    }
  }
  const ray = new T.Raycaster();
  function pick(x, y) {
    ray.setFromCamera(new T.Vector2(x, y), camera);
    const hit = ray.intersectObject(shell, true)[0];
    if (!hit || hit.distance > 18) return null;
    const d = wallHit(hit);
    if (d.ground) return { point: hit.point };
    return d;
  }
  function setDrawing(source, artId) {
    let projection = projections.get(artId);
    if (!source) {
      if (projection) {
        projection.material.map.dispose();
        projection.material.dispose();
        projection.geometry.dispose();
        projection.removeFromParent();
        projections.delete(artId);
        epoch++;
      }
      return;
    }
    if (!projection) {
      const face = targets.find(
        (t) => t.userData.room.works[t.userData.index].id === artId,
      );
      if (!face) return;
      const map = new T.CanvasTexture(source);
      map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = 4;
      map.generateMipmaps = false;
      map.minFilter = T.LinearFilter;
      projection = new T.Mesh(
        face.geometry.clone(),
        new T.MeshBasicMaterial({ map }),
      );
      projection.position.copy(face.position);
      projection.position.z += 0.001;
      projection.userData = face.userData;
      face.parent.add(projection);
      projections.set(artId, projection);
    }
    projection.material.map.needsUpdate = true;
    epoch++;
  }
  const headset = makeHeadset(renderer, scene, () => shell, actions);
  function draw(pose) {
    if (headset.active) return;
    camera.position.set(pose.x, eye, pose.z);
    camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ');
    renderer.render(scene, camera);
  }
  function resize() {
    if (renderer.xr.isPresenting) return;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    epoch++;
  }
  function theme(dark) {
    wall.color.set(dark ? '#454640' : '#ffffff');
    for (const [id, m] of Object.entries(returns))
      m.color.set(pigments[id]).multiplyScalar(dark ? 0.26 : 1);
    ceiling.color.set(dark ? '#514f49' : '#f0eee7');
    plinth.color.set(dark ? '#3b3b34' : '#b7b1a7');
    wallShadow.color.set(dark ? '#3d3b35' : '#c6bfb2');
    floorMat.color.set(dark ? '#898378' : '#ffffff');
    epoch++;
  }
  return {
    headset,
    vectorEdge,
    setDrawing,
    replaySign,
    setFloor,
    sync,
    draw,
    pick,
    resize,
    theme,
    get epoch() {
      return epoch;
    },
  };
}
