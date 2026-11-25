import * as T from 'three';

// Profile points are [fraction of span, rise above the wall, next finish].
// A single section defines both the roof and the infill at its ends.
const vault = [
  [0, 0],
  [0.08, 0.84],
  [0.22, 1.56],
  [0.38, 2],
  [0.46, 2.13, 'glass'],
  [0.54, 2.13],
  [0.62, 2],
  [0.78, 1.56],
  [0.92, 0.84],
  [1, 0],
];
const sawtooth = [
  [0, 0],
  [0.31, 1.38, 'glass'],
  [0.31, 0.12],
  [0.64, 1.5, 'glass'],
  [0.64, 0.12],
  [1, 1.45],
];
function surface(parent, points, material) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  parent.add(new T.Mesh(geometry, material));
}

export function buildRoof(shell, room, base, materials) {
  const profile =
    room.wingId === 'hall' || room.wingId === 'abstract'
      ? vault
      : room.wingId === 'nnotb'
        ? sawtooth
        : null;
  if (!profile) {
    buildCove(shell, room, base, materials);
    return;
  }
  const alongX = room.w >= room.d;
  const span = alongX ? room.d : room.w;
  const length = alongX ? room.w : room.d;
  const point = (u, v, h) => [
    room.x + (alongX ? v : u),
    base + h,
    room.z + (alongX ? u : v),
  ];
  const surfaces = { soffit: [], glass: [] };
  const quad = (mesh, p, q, r, s) =>
    mesh.push(...p, ...q, ...r, ...p, ...r, ...s);
  for (let i = 1; i < profile.length; i++) {
    const [start, low, finish = 'soffit'] = profile[i - 1];
    const [end, high] = profile[i];
    const a = start * span,
      b = end * span;
    quad(
      surfaces[finish],
      point(a, 0, low),
      point(a, length, low),
      point(b, length, high),
      point(b, 0, high),
    );
    if (a === b) continue;
    for (const v of [0, length])
      quad(
        surfaces.soffit,
        point(a, v, 0),
        point(a, v, low),
        point(b, v, high),
        point(b, v, 0),
      );
  }
  const [end, high] = profile.at(-1);
  if (high)
    quad(
      surfaces.soffit,
      point(end * span, 0, 0),
      point(end * span, 0, high),
      point(end * span, length, high),
      point(end * span, length, 0),
    );
  for (const [finish, points] of Object.entries(surfaces))
    if (points.length) surface(shell, points, materials[finish]);
  if (room.wingId !== 'hall') return;

  // The timber ribs are solid sections. Their undersides meet across the
  // folds without floating strips between the glass and plaster.
  const outline = new T.Shape();
  profile.forEach(([u, h], i) => {
    if (i) outline.lineTo(u * span, h + 0.065);
    else outline.moveTo(u * span, h + 0.065);
  });
  for (const [u, h] of profile.toReversed()) outline.lineTo(u * span, h - 0.19);
  const geometry = new T.ExtrudeGeometry(outline, {
    depth: 0.16,
    bevelEnabled: false,
    steps: 1,
  });
  const ribs = new T.InstancedMesh(
    geometry,
    materials.timber,
    Math.floor(length / 4),
  );
  const matrix = new T.Matrix4();
  for (let i = 0; i < ribs.count; i++) {
    const v = ((i + 0.5) * length) / ribs.count;
    // The hall runs left to right. A quarter turn maps the section to its span.
    if (alongX) matrix.makeRotationY(-Math.PI / 2);
    else matrix.identity();
    matrix.setPosition(...point(0, v, 0));
    ribs.setMatrixAt(i, matrix);
  }
  shell.add(ribs);
}

function buildCove(shell, room, base, { soffit, glass, reveal }) {
  const { x, z, w, d } = room;
  const lit = room.light === 'dusk' || room.light === 'lantern';
  const lift = lit ? 1.12 : 0.58;
  const corners = (insetX, insetZ, y) => [
    [x + insetX, y, z + insetZ],
    [x + w - insetX, y, z + insetZ],
    [x + w - insetX, y, z + d - insetZ],
    [x + insetX, y, z + d - insetZ],
  ];
  const outer = corners(0, 0, base);
  const trim = corners(w * 0.17, d * 0.16, base + lift - 0.11);
  const aperture = corners(w * 0.18, d * 0.17, base + lift);
  const band = (a, b, material) => {
    const vertices = [];
    for (let i = 0; i < 4; i++) {
      const next = (i + 1) % 4;
      vertices.push(
        ...a[i],
        ...a[next],
        ...b[next],
        ...a[i],
        ...b[next],
        ...b[i],
      );
    }
    surface(shell, vertices, material);
  };
  band(outer, trim, soffit);
  band(trim, aperture, reveal);
  if (!lit) {
    const [a, b, c, d] = aperture;
    surface(shell, [...a, ...b, ...c, ...a, ...c, ...d], soffit);
    return;
  }

  // A narrow continuous light wash traces the recessed ceiling. The darker
  // center preserves the room's scale and leaves the light at its edges.
  const inner = corners(w * 0.205, d * 0.194, base + lift + 0.02);
  const [a, b, c, e] = inner;
  band(aperture, inner, glass);
  surface(shell, [...a, ...b, ...c, ...a, ...c, ...e], soffit);
}
