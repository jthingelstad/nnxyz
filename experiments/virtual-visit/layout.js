import { hangChapters, nearSegment, segment } from './hanging.js';
// Plan x/y become world x/z. Heights and the hanging are exhibition design decisions.
export const scale = 0.108;
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
  const rooms = floor.rooms.map((room) => {
    const box = {
      ...room,
      x: room.x * scale,
      z: room.y * scale,
      w: room.w * scale,
      d: room.h * scale,
    };
    return { ...box, ...hangChapters(box) };
  });
  const hallZ = floor.corridor.y * scale,
    width = floor.footprint.w * scale,
    depth = floor.footprint.h * scale;
  // Open every sufficiently long shared edge, including the frontage on the
  // hall. Both sides, the map, and collision use this same list of thresholds.
  const zones = [
    ...rooms,
    { id: 'hall', x: 0, z: hallZ, w: width, d: depth - hallZ },
  ];
  const exits = [];
  for (const [i, r] of zones.entries())
    for (const t of zones.slice(i + 1)) {
      for (const horizontal of [true, false]) {
        const p = horizontal ? 'z' : 'x',
          extent = horizontal ? 'd' : 'w',
          along = horizontal ? 'x' : 'z',
          length = horizontal ? 'w' : 'd';
        const fixed =
          Math.abs(r[p] + r[extent] - t[p]) < 0.002
            ? t[p]
            : Math.abs(t[p] + t[extent] - r[p]) < 0.002
              ? r[p]
              : null;
        if (fixed === null) continue;
        const lo = Math.max(r[along], t[along]),
          hi = Math.min(r[along] + r[length], t[along] + t[length]);
        if (hi - lo < 2.65) continue;
        let door = doors.find(
          (d) =>
            d.horizontal === horizontal &&
            Math.abs(d.fixed - fixed) < 0.002 &&
            d.lo >= lo - 0.002 &&
            d.hi <= hi + 0.002,
        );
        if (!door) {
          const mid = (lo + hi) / 2,
            half = Math.min(1.48, (hi - lo - 0.5) / 2);
          door = {
            horizontal,
            fixed: key(fixed),
            lo: mid - half,
            hi: mid + half,
          };
          doors.push(door);
        }
        exits.push({ from: r.id, to: t.id, door });
      }
    }
  const walls = [...groups.values()]
    .flatMap(union)
    .flatMap((s) => cut(s, doors));
  // Angled preview walls face the visitor coming from the lift. One real
  // artwork marks each room, with a clear walking lane behind and in front.
  const guides = rooms.map((r, i) => {
    const x = (width * (rooms.length - i - 0.5)) / rooms.length,
      z = depth - 2.4,
      angle = Math.PI * 0.79;
    const hw = Math.min(2.8, (width / rooms.length) * 0.39);
    const s = segment(
      { x: x - Math.cos(angle) * hw, z: z + Math.sin(angle) * hw },
      { x: x + Math.cos(angle) * hw, z: z - Math.sin(angle) * hw },
    );
    return {
      ...s,
      roomId: r.id,
      title: r.title,
      wing: r.wing,
      color: r.color,
      art: r.works[0],
      count: r.primaryCount ?? r.works.length,
    };
  });
  return {
    ...floor,
    rooms,
    walls,
    doors,
    exits,
    guides,
    hallZ,
    width: floor.footprint.w * scale,
    depth: floor.footprint.h * scale,
    landing: { x: width - 1.8, z: floor.stairs.y * scale },
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
  for (const guide of floor.guides)
    if (nearSegment(guide, x, z, 0.4)) return false;
  const room = roomAt(floor, x, z);
  if (room && room.panels.some((s) => nearSegment(s, x, z, 0.39))) return false;
  const b = room && bench(room);
  if (b && Math.abs(x - b.x) < 1.42 && Math.abs(z - b.z) < 0.52) return false;
  return true;
}
export function bench(room) {
  // Perimeter seating keeps both sides of the chapter screens accessible.
  return room.w > 8 && room.d > 8
    ? { x: room.x + room.w * 0.28, z: room.z + 0.79 }
    : null;
}
