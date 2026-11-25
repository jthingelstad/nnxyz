import { hangChapters, nearSegment, segment } from './hanging.js';
// Plan x/y become world x/z. Heights and the hanging are exhibition design decisions.
const scale = 0.108;
const key = (value) => Math.round(value * 10000) / 10000;
// The printed map sizes rooms by collection count. Fit its shared grid lines
// to visitor-scale widths, keeping a single coordinate for both sides of a door.
function walkingAxis(ranges, limit) {
  const edges = [
    ...new Set([
      0,
      limit,
      ...ranges.flatMap((r) => [key(r.start), key(r.end)]),
    ]),
  ].sort((a, b) => a - b);
  const spans = [];
  let metres = 0;
  for (let i = 1; i < edges.length; i++) {
    const a = edges[i - 1],
      b = edges[i],
      mid = (a + b) / 2;
    const rate = Math.max(
      scale,
      ...ranges
        .filter((r) => r.start < mid && mid < r.end)
        .map((r) => r.minimum / (r.end - r.start)),
    );
    spans.push({ a, b, metres, rate });
    metres += (b - a) * rate;
  }
  return (t) => {
    const span = spans.find((s) => t <= s.b) ?? spans.at(-1);
    return span.metres + (t - span.a) * span.rate;
  };
}
function line(s, X, Z) {
  const horizontal = Math.abs(s.y2 - s.y1) < 0.001;
  const a = horizontal ? X(s.x1) : Z(s.y1),
    b = horizontal ? X(s.x2) : Z(s.y2);
  return {
    horizontal,
    fixed: key(horizontal ? Z(s.y1) : X(s.x1)),
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
  const X = walkingAxis(
    floor.rooms.map((r) => ({
      start: r.x,
      end: r.x + r.w,
      minimum: r.isCoda ? 13 : 16.5,
    })),
    floor.footprint.w,
  );
  const Z = walkingAxis(
    [
      ...floor.rooms.map((r) => ({
        start: r.y,
        end: r.y + r.h,
        minimum: 16.5,
      })),
      { start: floor.corridor.y, end: floor.footprint.h, minimum: 10.5 },
    ],
    floor.footprint.h,
  );
  const groups = new Map();
  for (const wall of floor.walls.map((s) => line(s, X, Z))) {
    const id = wall.horizontal + '/' + wall.fixed;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(wall);
  }
  const doors = floor.doors.map((s) => line(s, X, Z));
  const rooms = floor.rooms.map((room) => {
    return {
      ...room,
      x: X(room.x),
      z: Z(room.y),
      w: X(room.x + room.w) - X(room.x),
      d: Z(room.y + room.h) - Z(room.y),
    };
  });
  const hallZ = Z(floor.corridor.y),
    width = X(floor.footprint.w),
    depth = Z(floor.footprint.h);
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
        const half = Math.min(1.95, (hi - lo - 0.48) / 2);
        const mid = door
          ? Math.max(lo + half, Math.min(hi - half, (door.lo + door.hi) / 2))
          : (lo + hi) / 2;
        if (!door) {
          door = { horizontal, fixed: key(fixed) };
          doors.push(door);
        }
        door.lo = mid - half;
        door.hi = mid + half;
        exits.push({ from: r.id, to: t.id, door });
      }
    }
  const walls = [...groups.values()]
    .flatMap(union)
    .flatMap((s) => cut(s, doors));
  for (const room of rooms) {
    const { x, z, w, d } = room;
    const corners = [
      { x, z },
      { x: x + w, z },
      { x: x + w, z: z + d },
      { x, z: z + d },
    ];
    const thresholds = exits
      .filter((e) => e.from === room.id || e.to === room.id)
      .map((e) => e.door);
    const sides = corners.map((p, i) => {
      const side = segment(p, corners[(i + 1) % 4]),
        horizontal = i % 2 === 0;
      const start = horizontal ? p.x : p.z,
        fixed = horizontal ? p.z : p.x;
      const gaps = thresholds
        .filter(
          (t) =>
            t.horizontal === horizontal && Math.abs(t.fixed - fixed) < 0.002,
        )
        .map((t) =>
          i < 2
            ? { lo: t.lo - start, hi: t.hi - start }
            : { lo: start - t.hi, hi: start - t.lo },
        )
        .sort((a, b) => a.lo - b.lo);
      return { ...side, gaps };
    });
    Object.assign(room, hangChapters(room, sides));
    if (room.light) room.sides = sides;
    room.seat = chooseSeat(room, thresholds);
  }
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
    width: X(floor.footprint.w),
    depth: Z(floor.footprint.h),
    landing: { x: width - 1.8, z: Z(floor.stairs.y) },
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
  const b = room?.seat;
  if (b && Math.abs(x - b.x) < 1.42 && Math.abs(z - b.z) < 0.52) return false;
  return true;
}
// Keep seating out of sightlines and approaches, including the short path
// between two doors that open on the same side of a room.
export function insideDoor(room, d, inset = 1.6) {
  const mid = (d.lo + d.hi) / 2;
  return d.horizontal
    ? { x: mid, z: d.fixed + inset * Math.sign(room.z + room.d / 2 - d.fixed) }
    : { x: d.fixed + inset * Math.sign(room.x + room.w / 2 - d.fixed), z: mid };
}
function chooseSeat(room, doors) {
  if (room.light) return null;
  const approaches = doors.map((d) => insideDoor(room, d));
  const paths = approaches.flatMap((p, i) =>
    approaches.slice(i + 1).map((q) => segment(p, q)),
  );
  for (const frac of [0.36, 0.64, 0.5])
    for (const inset of [3, room.d - 3]) {
      const x = room.x + frac * room.w,
        z = room.z + inset;
      if (
        [...paths, ...room.panels].every((s) => !nearSegment(s, x, z, 2.55)) &&
        approaches.every((p) => Math.hypot(x - p.x, z - p.z) > 3.1)
      )
        return { x, z };
    }
  return null;
}
