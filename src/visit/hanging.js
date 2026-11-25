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
// These three rooms have one lighting scheme each and show at most three
// drawings at once. Other rooms use a continuous clockwise exhibition hang.
const installations = {
  'nnxyz-other--ot-masks': 'lantern',
  'rawblocks--rb-coda': 'dusk',
  'nnotb--p1--silhouettes': 'northlight',
};
function along(run, distance) {
  return {
    x: run.a.x + ((run.b.x - run.a.x) * distance) / run.len,
    z: run.a.z + ((run.b.z - run.a.z) * distance) / run.len,
  };
}
export function hangChapters(room, sides) {
  const light = installations[room.id];
  const base = light ? 6.5 : 4.1;
  const panels = [],
    runs = [];
  // Cut opposite corners back into the shell. The splay stops short of the
  // nearest jamb, including in rooms that share an unusually short boundary.
  const corners = sides.map((side, i) => {
    const previous = sides[(i + 3) % 4];
    if (i % 2 || light === 'dusk') return 0;
    return Math.max(
      0,
      Math.min(
        3.4,
        Math.min(room.w, room.d) * 0.19,
        (side.gaps[0]?.lo ?? side.len) - 1.7,
        previous.len - (previous.gaps.at(-1)?.hi ?? 0) - 1.7,
      ),
    );
  });
  for (const [i, side] of sides.entries()) {
    const next = (i + 1) % 4,
      end = side.len - corners[next];
    let at = corners[i];
    for (const gap of [...side.gaps, { lo: end, hi: end }]) {
      if (gap.lo - at > 1.05)
        runs.push(segment(along(side, at), along(side, gap.lo)));
      at = gap.hi;
    }
    if (corners[next] > 0.15) {
      const bevel = segment(
        along(side, end),
        along(sides[next], corners[next]),
      );
      panels.push({ ...bevel, height: base });
      runs.push(bevel);
    }
  }
  // The two landscapes meet along a single shallow fold at the north end.
  if (light === 'dusk') {
    const mid = { x: room.x + room.w / 2, z: room.z + 0.14 };
    panels.push(
      ...[
        segment({ x: room.x + 0.08, z: room.z + 2.55 }, mid),
        segment(mid, { x: room.x + room.w - 0.08, z: room.z + 2.55 }),
      ].map((s) => ({ ...s, height: base })),
    );
  }
  const chapters = room.chapters.flatMap((c) =>
    Array.from({ length: c.count }, (_, i) => ({
      chapter: c.title,
      first: i === 0,
    })),
  );
  const spots = [];
  if (light) {
    const faces =
      light === 'dusk'
        ? panels
        : runs.toSorted((a, b) => b.len - a.len).slice(0, 3);
    if (light !== 'dusk') {
      // The first two paintings share a view from across their corner. Keep the
      // third wall for a work the visitor reaches by turning into the room.
      const pairs = faces.flatMap((a, i) =>
        faces.slice(i + 1).map((b) => ({
          a,
          b,
          distance: Math.hypot(a.x - b.x, a.z - b.z),
        })),
      );
      const { a, b } = pairs.reduce((nearest, pair) =>
        pair.distance < nearest.distance ? pair : nearest,
      );
      const ordered = [a, b].sort((a, b) => runs.indexOf(a) - runs.indexOf(b));
      ordered.push(faces.find((face) => face !== a && face !== b));
      faces.splice(0, faces.length, ...ordered);
    }
    for (const [i, art] of room.works.entries()) {
      const face = faces[i % faces.length];
      const width = Math.min(face.len - 1.05, 6.2, 5.18 * art.ratio);
      spots.push(
        mount(
          face,
          face.len / 2,
          width,
          art,
          chapters[i],
          Math.floor(i / faces.length),
        ),
      );
    }
  } else {
    // Distribute the original sequence over the available lengths. Every
    // picture faces inward and each doorway keeps an unbroken reveal.
    const counts = runs.map(() => 0);
    for (let n = 0; n < room.works.length; n++) {
      let best = 0;
      for (let j = 1; j < runs.length; j++)
        if (
          (runs[j].len - 0.6) / (counts[j] + 1) >
          (runs[best].len - 0.6) / (counts[best] + 1)
        )
          best = j;
      counts[best]++;
    }
    for (const [j, run] of runs.entries()) {
      const count = counts[j];
      if (!count) continue;
      const labels = chapters.slice(spots.length, spots.length + count);
      const gaps = labels.filter((c, i) => i > 0 && c.first).length;
      const pitch = (run.len - 0.6) / (count + 0.28 * gaps);
      let at = 0.3;
      for (const [i, c] of labels.entries()) {
        if (i && c.first) at += 0.28 * pitch;
        const art = room.works[spots.length];
        const width = Math.min(
          pitch - 0.78,
          c.first ? 2.16 : 1.72,
          (c.first ? 1.96 : 1.55) * art.ratio,
        );
        spots.push(mount(run, at + pitch / 2, width, art, c, 0));
        at += pitch;
      }
    }
  }
  return {
    hang: spots,
    panels,
    light,
    ceiling: base,
    hangingCount: spots.at(-1).set + 1,
  };
}
function mount(run, at, width, art, label, set) {
  // Center the picture and its adjacent label together within the wall bay.
  const p = along(run, at - 0.3),
    nx = Math.sin(run.angle),
    nz = Math.cos(run.angle);
  const height = width / art.ratio;
  return {
    ...label,
    art,
    width,
    height,
    y: Math.max(1.62, 0.85 + height / 2),
    angle: run.angle,
    nx,
    nz,
    x: p.x + 0.135 * nx,
    z: p.z + 0.135 * nz,
    set,
  };
}
