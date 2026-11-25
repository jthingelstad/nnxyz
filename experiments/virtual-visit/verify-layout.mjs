import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { insideDoor, planFloor, walkable } from '../../src/visit/layout.js';
import { viewpoint } from '../../src/visit/viewpoint.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const vite = await createServer({
  root,
  configFile: false,
  envDir: false,
  logLevel: 'error',
  server: { middlewareMode: true, ws: false },
});
let floors;
try {
  floors = (await vite.ssrLoadModule('/src/visit/catalog.ts')).museum.map(
    planFloor,
  );
} finally {
  await vite.close();
}
let count = 0,
  replays = 0,
  crossings = 0;
const ids = new Set();
for (const floor of floors) {
  // Every room can get back to the hall even if any one doorway is closed.
  for (const omitted of floor.exits) {
    const seen = new Set(['hall']);
    for (let i = 0; i < floor.rooms.length; i++)
      for (const edge of floor.exits) {
        if (edge === omitted) continue;
        if (seen.has(edge.from)) seen.add(edge.to);
        if (seen.has(edge.to)) seen.add(edge.from);
      }
    assert.equal(
      seen.size,
      floor.rooms.length + 1,
      'Single route through ' + omitted.from + '/' + omitted.to,
    );
  }
  // Flood the actual walking surface at a visitor's scale, including benches,
  // perimeter walls, hall previews and the clearance around solid walls.
  const step = 0.24,
    cols = Math.ceil(floor.width / step),
    rows = Math.ceil(floor.depth / step),
    grid = new Uint8Array(cols * rows);
  for (let z = 0; z < rows; z++)
    for (let x = 0; x < cols; x++)
      if (walkable(floor, (x + 0.5) * step, (z + 0.5) * step))
        grid[z * cols + x] = 1;
  const cell = (x, z) => Math.floor(z / step) * cols + Math.floor(x / step);
  const queue = [cell(floor.landing.x, floor.landing.z)];
  grid[queue[0]] = 2;
  for (let i = 0; i < queue.length; i++)
    for (const offset of [-1, 1, -cols, cols]) {
      const j = queue[i] + offset;
      if (grid[j] !== 1) continue;
      grid[j] = 2;
      queue.push(j);
    }
  for (const r of floor.rooms) {
    assert.deepEqual(
      r.hang.map((s) => s.art.id),
      r.works.map((w) => w.id),
    );
    // A visitor can walk straight between the approaches of ANY two doors.
    // Sample a strip 1.1 m wide, including the collider's own wall clearance.
    const doors = floor.exits
      .filter((e) => e.from === r.id || e.to === r.id)
      .map((e) => e.door);
    const approaches = doors.map((d) => insideDoor(r, d));
    function clearLane(a, b) {
      const dx = b.x - a.x,
        dz = b.z - a.z,
        len = Math.hypot(dx, dz),
        n = Math.ceil(len / 0.1);
      for (let i = 0; i <= n; i++)
        for (const offset of [-0.55, 0, 0.55]) {
          assert(
            walkable(
              floor,
              a.x + (dx * i) / n - (offset * dz) / len,
              a.z + (dz * i) / n + (offset * dx) / len,
            ),
            'Obstructed aisle in ' + r.title,
          );
        }
    }
    for (const [i, a] of approaches.entries()) {
      clearLane(insideDoor(r, doors[i], 0), a);
      for (const b of approaches.slice(i + 1)) {
        clearLane(a, b);
        crossings++;
      }
    }
    if (r.light) {
      assert(r.hang.every((s) => s.art.svg && s.art.replay && s.height > 3.5));
      for (let set = 0; set < r.hangingCount; set++)
        assert(r.hang.filter((s) => s.set === set).length <= 3);
    }
    for (const [i, w] of r.works.entries()) {
      assert(!ids.has(w.id));
      ids.add(w.id);
      count++;
      if (w.replay) replays++;
      for (const arrival of [false, true]) {
        const p = viewpoint(floor, r, i, arrival);
        assert.equal(grid[cell(p.x, p.z)], 2, 'Unreachable ' + w.title);
      }
    }
  }
  for (const { door: d } of floor.exits) {
    const mid = (d.lo + d.hi) / 2;
    assert.equal(
      grid[cell(d.horizontal ? mid : d.fixed, d.horizontal ? d.fixed : mid)],
      2,
    );
  }
  console.log(
    'Floor',
    floor.number,
    ':',
    floor.rooms.length,
    'rooms;',
    floor.exits.length,
    'connected doorways',
  );
  const coda = floor.rooms.find((r) => r.id === 'rawblocks--rb-coda');
  if (coda)
    console.log(
      'Coda exits:',
      floor.exits
        .filter((e) => [e.from, e.to].includes(coda.id))
        .map((e) => (e.from === coda.id ? e.to : e.from)),
    );
}
console.log(
  count,
  'unique works reachable,',
  replays,
  'with recorded strokes.',
);
console.log(crossings, 'unobstructed door-to-door crossings.');
