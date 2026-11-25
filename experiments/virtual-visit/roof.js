import * as T from 'three';

// A section is [fraction of span, rise in metres, glazed face to the next
// point]. The same sections make the ceiling, its end walls and the ribs.
const vault = [
  [0, 0],
  [0.06, 0.89],
  [0.16, 1.66],
  [0.32, 2.22],
  [0.46, 2.48, 1],
  [0.56, 2.48],
  [0.73, 2.12],
  [0.89, 1.48],
  [0.97, 0.65],
  [1, 0],
];
const sections = {
  hall: vault,
  abstract: vault,
  scrimshaw: [
    [0, 0],
    [0.09, 0.8],
    [0.23, 1.3, 1],
    [0.38, 1.7],
    [0.65, 1.47],
    [1, 0],
  ],
  'nifty-faces': [
    [0, 0],
    [0.26, 0.6],
    [0.26, 1.2],
    [0.46, 1.2, 1],
    [0.46, 2.05],
    [0.66, 2.05],
    [1, 0],
  ],
  rawblocks: [
    [0, 0],
    [0.2, 0],
    [0.2, 0.75, 1],
    [0.49, 0.75],
    [0.49, 1.48],
    [0.75, 1.48, 1],
    [0.75, 0.48],
    [1, 0],
  ],
  nnotb: [
    [0, 0],
    [0.25, 1.32, 1],
    [0.25, 0.06],
    [0.56, 1.48, 1],
    [0.56, 0.06],
    [0.85, 1.42, 1],
    [0.85, 0.08],
    [1, 0],
  ],
  'after-nifty-ink': [
    [0, 0],
    [0.32, 1.45, 1],
    [0.46, 0.62],
    [0.72, 1.67, 1],
    [0.78, 1.05],
    [1, 0],
  ],
};
export function buildRoof(shell, room, base, { soffit, glass, timber }) {
  const section = sections[room.wingId] ?? sections['nifty-faces'],
    alongX = room.w >= room.d;
  const span = alongX ? room.d : room.w,
    length = alongX ? room.w : room.d;
  const vertices = [[], [], []];
  function point(u, v, h) {
    return [room.x + (alongX ? v : u), base + h, room.z + (alongX ? u : v)];
  }
  function quad(mat, p, q, r, s) {
    vertices[mat].push(...p, ...q, ...r, ...p, ...r, ...s);
  }
  for (let j = 1; j < section.length; j++) {
    const [u1, y1, glazed] = section[j - 1],
      [u2, y2] = section[j],
      a = u1 * span,
      b = u2 * span;
    quad(
      glazed ? 1 : 0,
      point(a, 0, y1),
      point(a, length, y1),
      point(b, length, y2),
      point(b, 0, y2),
    );
    for (const end of [0, length])
      quad(
        0,
        point(a, end, 0),
        point(a, end, y1),
        point(b, end, y2),
        point(b, end, 0),
      );
    const hall = room.wingId === 'hall',
      spacing = hall ? 4 : 5.6,
      n = Math.ceil(length / spacing),
      rib = hall ? 0.19 : 0.08,
      drop = hall ? 0.2 : 0.11;
    for (let i = 0; i <= n; i++) {
      const v = Math.min(length - rib, (i * length) / n);
      quad(
        2,
        point(a, v, y1 - drop),
        point(b, v, y2 - drop),
        point(b, v + rib, y2 - drop),
        point(a, v + rib, y1 - drop),
      );
      quad(
        2,
        point(a, v, y1 - drop),
        point(a, v, y1),
        point(b, v, y2),
        point(b, v, y2 - drop),
      );
    }
  }
  [soffit, glass, timber].forEach((mat, i) => {
    if (!vertices[i].length) return;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(vertices[i], 3));
    g.computeVertexNormals();
    shell.add(new T.Mesh(g, mat));
  });
}
