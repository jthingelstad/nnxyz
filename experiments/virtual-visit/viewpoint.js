import { nearSegment } from './hanging.js';
import { walkable, roomAt } from './layout.js';

export function viewpoint(floor, room, index, arrival = false) {
  const s = room.hang[index];
  for (const distance of arrival
    ? [4.3, 3.7, 3.0, 2.35, 1.8, 1.15, 0.7]
    : [2.35, 2.15, 1.8, 1.15, 0.7]) {
    for (const lean of arrival
      ? [-0.27, 0, 0.3, -0.62, 0.62]
      : [0, 0.3, -0.3, 0.62, -0.62]) {
      const slide = distance * lean;
      const dx = s.nx * distance + Math.cos(s.angle) * slide,
        dz = s.nz * distance - Math.sin(s.angle) * slide;
      const x = s.x + dx,
        z = s.z + dz;
      if (
        roomAt(floor, x, z) !== room ||
        ![-0.15, 0.15].every((a) =>
          [-0.15, 0.15].every((b) => walkable(floor, x + a, z + b)),
        )
      )
        continue;
      // Keep the chosen wall visible around folded corners. Test the line of sight at eye height. Low benches
      // affect the place one can stand, but do not hide a picture.
      const n = Math.ceil(Math.hypot(dx, dz) / 0.08);
      let clear = true;
      for (let j = 1; j <= n; j++) {
        if (
          room.panels.some((panel) =>
            nearSegment(panel, s.x + (dx * j) / n, s.z + (dz * j) / n, 0.091),
          )
        ) {
          clear = false;
          break;
        }
      }
      if (clear) return { x, z };
    }
  }
  throw Error('No viewing position for ' + s.art.id);
}
