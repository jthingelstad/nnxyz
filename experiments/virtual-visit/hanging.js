// Divide the footprint along its long axis. Each group gets a bay sized for
// its existing chapter, with a clear aisle around the entire hanging.
function chapterCells(groups, box) {
  if (groups.length === 1) return [{ ...box, chapter: groups[0] }];
  const weight = (g) => Math.max(5, g.count);
  const sum = groups.reduce((n, g) => n + weight(g), 0);
  let cut = 1,
    part = weight(groups[0]);
  while (
    cut < groups.length - 1 &&
    Math.abs(part + weight(groups[cut]) - sum / 2) < Math.abs(part - sum / 2)
  )
    part += weight(groups[cut++]);
  const alongX = box.w > box.d,
    k = alongX ? 'w' : 'd',
    p = alongX ? 'x' : 'z';
  const size = (box[k] * part) / sum;
  return [
    ...chapterCells(groups.slice(0, cut), { ...box, [k]: size }),
    ...chapterCells(groups.slice(cut), {
      ...box,
      [p]: box[p] + size,
      [k]: box[k] - size,
    }),
  ];
}
export function segment(a, b) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len = Math.hypot(dx, dz);
  return {
    a,
    b,
    len,
    angle: Math.atan2(-dz, dx),
    x: (a.x + b.x) / 2,
    z: (a.z + b.z) / 2,
  };
}
export function nearSegment(s, x, z, radius) {
  const dx = s.b.x - s.a.x,
    dz = s.b.z - s.a.z;
  const t = Math.max(
    0,
    Math.min(1, ((x - s.a.x) * dx + (z - s.a.z) * dz) / (s.len * s.len)),
  );
  return Math.hypot(x - s.a.x - t * dx, z - s.a.z - t * dz) < radius;
}
export function hangChapters(room) {
  const hang = [],
    panels = [];
  const cells = chapterCells(room.chapters, room);
  for (const [i, c] of cells.entries()) {
    const wide = c.w >= c.d;
    const span = Math.min(Math.max(c.w, c.d) - 4, 13);
    const depth = Math.min(Math.min(c.w, c.d) * 0.16, 1.35);
    const flip = i % 2 === 0 ? 1 : -1;
    const point = (u, v) => ({
      x: c.x + c.w / 2 + (wide ? u : -v) * flip,
      z: c.z + c.d / 2 + (wide ? v : u) * flip,
    });
    let profile = [
      [-0.5, 0.88],
      [-0.07, -0.88],
      [0.5, 0.88],
    ];
    if (room.works.length === 2)
      profile = [
        [-0.5, 1.3],
        [0, -1.3],
        [0.5, 1.3],
      ];
    else if (c.chapter.count >= 5 && room.wingId === 'abstract')
      profile = [
        [-0.5, 1.1],
        [-0.26, -0.45],
        [0, -1],
        [0.26, -0.45],
        [0.5, 1.1],
      ];
    else if (c.chapter.count >= 5 && room.wingId === 'rawblocks')
      profile = [
        [-0.5, 0.72],
        [-0.1, 0.72],
        [-0.1, -0.72],
        [0.5, -0.72],
      ];
    else if (c.chapter.count >= 7 && room.wingId === 'nnotb')
      profile = [
        [-0.5, 0.92],
        [-0.18, -0.92],
        [0.12, 0.42],
        [0.5, -0.78],
      ];
    const points = profile.map(([u, v]) => point(u * span, v * depth));
    const front = points.slice(1).map((p, j) => segment(points[j], p));
    for (const s of front) panels.push({ ...s, height: 2.85 + (i % 3) * 0.16 });
    const faces =
      c.chapter.count <= 4
        ? front
        : [...front, ...front.toReversed().map((s) => segment(s.b, s.a))];
    const ns = faces.map(() => 0);
    for (let j = 0; j < c.chapter.count; j++) {
      let chosen = 0;
      for (let k = 1; k < faces.length; k++)
        if (faces[k].len / (ns[k] + 1) > faces[chosen].len / (ns[chosen] + 1))
          chosen = k;
      ns[chosen]++;
    }
    let inChapter = 0;
    for (const [k, s] of faces.entries())
      for (let j = 0; j < ns[k]; j++) {
        const art = room.works[hang.length],
          spacing = (s.len - 0.48) / ns[k];
        const fraction = (0.24 + spacing * (j + 0.5)) / s.len;
        const width = Math.min(
          spacing * 0.84,
          room.works.length === 2 ? 2.45 : 1.82,
          1.62 * art.ratio,
        );
        const nx = Math.sin(s.angle),
          nz = Math.cos(s.angle);
        hang.push({
          art,
          width,
          height: width / art.ratio,
          angle: s.angle,
          nx,
          nz,
          chapter: c.chapter.title,
          first: inChapter++ === 0,
          x: s.a.x + (s.b.x - s.a.x) * fraction + nx * 0.112,
          z: s.a.z + (s.b.z - s.a.z) * fraction + nz * 0.112,
        });
      }
  }
  return { hang, panels };
}
