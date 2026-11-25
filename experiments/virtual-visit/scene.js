import * as T from 'three';
import { makeHeadset } from './headset.js';
import { bench } from './layout.js';

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
export function createGallery(canvas, pictures, actions, sampleId) {
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
    reveal = matte('#b9b3a7'),
    windowMat = ink('#fffcf0'),
    wallShadow = ink('#c6bfb2'),
    mount = ink('#faf8ef'),
    trim = matte('#ccc6b9');
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
    reveal,
    windowMat,
    wallShadow,
    mount,
    trim,
    benchShadow,
  ]);
  const loader = new T.TextureLoader();
  let projection = null,
    shell = null,
    floor = null,
    hanging = new Map(),
    targets = [],
    epoch = 0;
  function clearArt(id) {
    const group = hanging.get(id);
    if (!group) return;
    if (projection?.userData.room.id === id) setDrawing();
    group.userData.active = false;
    discard(group, shared);
    hanging.delete(id);
    targets = targets.filter((mesh) => mesh.userData.room.id !== id);
  }
  function hangRoom(room) {
    const group = new T.Group();
    group.userData.active = true;
    shell.add(group);
    hanging.set(room.id, group);
    for (const [index, spot] of room.hang.entries()) {
      const g = new T.Group();
      group.add(g);
      g.position.set(spot.x, eye, spot.z);
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
      loader.load(pictures[spot.art.image], (map) => {
        if (!group.userData.active) {
          map.dispose();
          return;
        }
        map.colorSpace = T.SRGBColorSpace;
        map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        surface.map = map;
        surface.needsUpdate = true;
        epoch++;
      });
      if (index === 0 && room.tour.length) {
        const sign = plate(
          g,
          0.57,
          0.12,
          0,
          -h / 2 - 0.32,
          0.015,
          lettering('Play room tour', true, true),
        );
        sign.userData.tour = room;
        if (spot.art.id === sampleId) {
          const replay = plate(
            g,
            0.57,
            0.12,
            0,
            -h / 2 - 0.47,
            0.015,
            lettering('Draw / pause', true, true),
          );
          replay.userData.replay = room;
        }
      }
      plate(
        g,
        Math.min(0.47, w * 0.76),
        0.096,
        0,
        -h / 2 - 0.136,
        0.016,
        lettering(spot.art.title, true),
      );
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
    box(
      shell,
      floor.width,
      0.12,
      floor.depth,
      floor.width / 2,
      height + 0.06,
      floor.depth / 2,
      ceiling,
    );
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
      // A run of roof lights and narrow mullions gives each bay a visible scale.
      const skylightWidth = Math.min(room.w * 0.53, 4.1),
        depth = room.d * 0.86;
      const cx = room.x + room.w * 0.27,
        cz = room.z + room.d / 2;
      box(
        shell,
        skylightWidth + 0.19,
        0.07,
        depth + 0.18,
        cx,
        height - 0.035,
        cz,
        reveal,
      );
      box(shell, skylightWidth, 0.018, depth, cx, height - 0.08, cz, windowMat);
      for (let i = 0; i <= depth; i += 2.4)
        box(
          shell,
          skylightWidth + 0.12,
          0.095,
          0.055,
          cx,
          height - 0.077,
          cz - depth / 2 + i,
          trim,
        );
      const b = bench(room);
      if (b) {
        const shade = plate(shell, 3.4, 1.25, b.x, 0.006, b.z, benchShadow);
        shade.rotation.x = -Math.PI / 2;
        for (const dx of [-0.84, 0.84])
          box(shell, 0.13, 0.4, 0.38, b.x + dx, 0.21, b.z, leg);
        for (let i = -2; i <= 2; i++)
          box(shell, 2.28, 0.085, 0.087, b.x, 0.47, b.z + i * 0.095, oak);
      }
    }
    const l = floor.landing;
    box(shell, 2.8, 2.5, 0.16, l.x, 1.25, l.z + 1.8, leg);
    plate(
      shell,
      2.5,
      0.42,
      l.x,
      1.7,
      l.z + 1.7,
      lettering('Floor ' + floor.number + '   /   Lift', false, true),
      Math.PI,
    );
    plate(
      shell,
      2.5,
      0.42,
      l.x,
      1.7,
      l.z + 1.9,
      lettering('Floor ' + floor.number + '   /   Lift', false, true),
    );
    for (const sign of [-1, 1])
      for (let n = 1; n <= 3; n++) {
        const tile = plate(
          shell,
          0.68,
          0.28,
          l.x + (n - 2) * 0.8 * sign,
          1.17,
          l.z + 1.8 + sign * 0.102,
          lettering('Floor ' + n, true),
          sign > 0 ? 0 : Math.PI,
        );
        tile.userData.lift = n;
      }
    epoch++;
  }
  function sync(x, z) {
    for (const room of floor.rooms) {
      const near =
        x >= room.x - 5 &&
        x <= room.x + room.w + 5 &&
        z >= room.z - 5 &&
        z <= room.z + room.d + 5;
      if (near && !hanging.has(room.id)) hangRoom(room);
      if (!near && hanging.has(room.id)) clearArt(room.id);
    }
  }
  const ray = new T.Raycaster();
  function pick(x, y) {
    ray.setFromCamera(new T.Vector2(x, y), camera);
    const hit = ray.intersectObject(shell, true)[0];
    if (!hit || hit.distance > 18) return null;
    const d = hit.object.userData;
    if (d.ground) return { point: hit.point };
    return d;
  }
  function setDrawing(source) {
    if (!source) {
      if (projection) {
        projection.material.map.dispose();
        projection.material.dispose();
        projection.geometry.dispose();
        projection.removeFromParent();
        projection = null;
        epoch++;
      }
      return;
    }
    if (!projection) {
      const face = targets.find(
        (t) => t.userData.room.works[t.userData.index].id === sampleId,
      );
      if (!face) return;
      const map = new T.CanvasTexture(source);
      map.colorSpace = T.SRGBColorSpace;
      map.anisotropy = 4;
      projection = new T.Mesh(
        face.geometry.clone(),
        new T.MeshBasicMaterial({ map }),
      );
      projection.position.copy(face.position);
      projection.position.z += 0.001;
      projection.userData = face.userData;
      face.parent.add(projection);
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
    ceiling.color.set(dark ? '#514f49' : '#f0eee7');
    plinth.color.set(dark ? '#3b3b34' : '#b7b1a7');
    wallShadow.color.set(dark ? '#3d3b35' : '#c6bfb2');
    floorMat.color.set(dark ? '#898378' : '#ffffff');
    epoch++;
  }
  return {
    headset,
    setDrawing,
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
