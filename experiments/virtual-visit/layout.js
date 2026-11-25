// Plan x/y become world x/z. Heights and the hanging are exhibition design decisions.
export const scale = 0.125;
const key = (value) => Math.round(value * 10000) / 10000;
function line(s) {
  const horizontal = Math.abs(s.y2 - s.y1) < 0.001;
  const a = (horizontal ? s.x1 : s.y1) * scale;
  const b = (horizontal ? s.x2 : s.y2) * scale;
  return {
    horizontal,
    fixed: key((horizontal ? s.y1 : s.x1) * scale),
    lo: Math.min(a, b),
    hi: Math.max(a, b),
  };
}
function union(spans) {
  const merged = [];
  for (const s of spans.sort((a, b) => a.lo - b.lo)) {
    const last = merged.at(-1);
    if (last && s.lo <= last.hi + 0.002) last.hi = Math.max(last.hi, s.hi);
    else merged.push({ ...s });
  }
  return merged;
}
function cut(wall, doors) {
  let cursor = wall.lo;
  const spans = [];
  for (const d of doors
    .filter((d) => d.horizontal === wall.horizontal && d.fixed === wall.fixed)
    .sort((a, b) => a.lo - b.lo)) {
    if (d.hi <= cursor || d.lo >= wall.hi) continue;
    if (d.lo > cursor) spans.push({ ...wall, lo: cursor, hi: d.lo });
    cursor = Math.max(cursor, d.hi);
  }
  if (cursor < wall.hi) spans.push({ ...wall, lo: cursor, hi: wall.hi });
  return spans;
}
export function planFloor(floor) {
  const groups = new Map();
  for (const wall of floor.walls.map(line)) {
    const id = wall.horizontal + '/' + wall.fixed;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(wall);
  }
  const doors = floor.doors.map(line);
  const walls = [...groups.values()]
    .flatMap(union)
    .flatMap((s) => cut(s, doors));
  const rooms = floor.rooms.map((room) => {
    const x = room.x * scale,
      z = room.y * scale,
      w = room.w * scale,
      d = room.h * scale;
    const sides = [
      { horizontal: true, fixed: z, lo: x, hi: x + w, angle: 0 },
      {
        horizontal: false,
        fixed: x + w,
        lo: z,
        hi: z + d,
        angle: -Math.PI / 2,
      },
      { horizontal: true, fixed: z + d, lo: x, hi: x + w, angle: Math.PI },
      { horizontal: false, fixed: x, lo: z, hi: z + d, angle: Math.PI / 2 },
    ];
    const runs = sides
      .flatMap((side, i) => {
        const pieces = cut({ ...side, fixed: key(side.fixed) }, doors);
        return (i < 2 ? pieces : pieces.reverse()).map((p) => ({
          ...p,
          reverse: i >= 2,
          length: p.hi - p.lo - 0.8,
          count: 0,
        }));
      })
      .filter((s) => s.length > 0.8);
    for (let i = 0; i < room.works.length; i++) {
      const best = runs.reduce((a, b) =>
        b.length / (b.count + 1) > a.length / (a.count + 1) ? b : a,
      );
      best.count++;
    }
    const hang = [];
    for (const run of runs) {
      for (let i = 0; i < run.count; i++) {
        const spacing = run.length / run.count;
        const offset = 0.4 + (i + 0.5) * spacing;
        const at = run.reverse ? run.hi - offset : run.lo + offset;
        const art = room.works[hang.length];
        const width = Math.min(1.72, spacing * 0.79, 1.55 * art.ratio);
        const nx = Math.sin(run.angle),
          nz = Math.cos(run.angle);
        hang.push({
          art,
          width,
          height: width / art.ratio,
          angle: run.angle,
          nx,
          nz,
          x: (run.horizontal ? at : run.fixed) + nx * 0.12,
          z: (run.horizontal ? run.fixed : at) + nz * 0.12,
        });
      }
    }
    return { ...room, x, z, w, d, hang };
  });
  return {
    ...floor,
    rooms,
    walls,
    doors,
    width: floor.footprint.w * scale,
    depth: floor.footprint.h * scale,
    landing: { x: floor.stairs.x * scale, z: floor.stairs.y * scale },
  };
}
export function roomAt(floor, x, z) {
  return floor.rooms.find(
    (r) => x >= r.x && x <= r.x + r.w && z >= r.z && z <= r.z + r.d,
  );
}
export function walkable(floor, x, z) {
  const pad = 0.28;
  if (x < pad || z < pad || x > floor.width - pad || z > floor.depth - pad)
    return false;
  for (const w of floor.walls) {
    const at = w.horizontal ? x : z,
      across = w.horizontal ? z : x;
    if (Math.abs(across - w.fixed) < pad && at > w.lo - pad && at < w.hi + pad)
      return false;
  }
  for (const room of floor.rooms) {
    const b = bench(room);
    if (b && Math.abs(x - b.x) < 1.42 && Math.abs(z - b.z) < 0.52) return false;
  }
  return true;
}
export function bench(room) {
  return room.w > 7 && room.d > 7
    ? { x: room.x + room.w / 2, z: room.z + room.d * 0.58 }
    : null;
}
