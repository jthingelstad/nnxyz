import * as T from 'three';

// Bake broad skylight and contact shadows onto the floor only. Artwork keeps
// its original sRGB color, and the headset does not render a second shadow pass.
export function floorLight(floor) {
  const canvas = document.createElement('canvas'),
    scale = 24;
  canvas.width = Math.ceil(floor.width * scale);
  canvas.height = Math.ceil(floor.depth * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(canvas.width / floor.width, canvas.height / floor.depth);
  function shadow(s) {
    const x = 1.25,
      z = 0.69;
    ctx.fillStyle = 'rgba(47,39,30,.14)';
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.z);
    ctx.lineTo(s.b.x, s.b.z);
    ctx.lineTo(s.b.x + x, s.b.z + z);
    ctx.lineTo(s.a.x + x, s.a.z + z);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 0.24;
    ctx.strokeStyle = 'rgba(48,40,30,.15)';
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.z);
    ctx.lineTo(s.b.x, s.b.z);
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, floor.hallZ, floor.width, floor.depth - floor.hallZ);
  ctx.clip();
  const glow = ctx.createLinearGradient(0, floor.hallZ, 0, floor.depth);
  glow.addColorStop(0, 'rgba(255,243,198,0)');
  glow.addColorStop(0.52, 'rgba(255,246,215,.28)');
  glow.addColorStop(1, 'rgba(254,247,218,.04)');
  ctx.fillStyle = glow;
  for (let x = -4; x < floor.width; x += 4) {
    ctx.beginPath();
    ctx.moveTo(x, floor.hallZ);
    ctx.lineTo(x + 3.58, floor.hallZ);
    ctx.lineTo(x + 6.3, floor.depth);
    ctx.lineTo(x + 2.7, floor.depth);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  for (const room of floor.rooms) {
    ctx.save();
    const { x, z, w, d, light } = room;
    ctx.beginPath();
    ctx.rect(x, z, w, d);
    ctx.clip();
    const tones = {
      dusk: ['rgba(49,65,74,.68)', 'rgba(255,203,137,.29)'],
      lantern: ['rgba(99,70,53,.49)', 'rgba(255,222,158,.36)'],
      northlight: ['rgba(67,88,104,.46)', 'rgba(224,243,255,.42)'],
    };
    const tone = tones[light];
    if (tone) {
      ctx.fillStyle = tone[0];
      ctx.fillRect(x, z, w, d);
    }
    // Raking light marks the volume of the room without adding a walk obstacle.
    const wash = ctx.createLinearGradient(x, z, x + w * 0.94, z + d * 0.65);
    wash.addColorStop(0, tone?.[1] ?? 'rgba(255,247,217,.22)');
    wash.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = wash;
    const bays = light === 'lantern' ? 4 : 2;
    for (let i = 0; i < bays; i++) {
      const start = z + d * (0.13 + (i * 0.67) / bays);
      ctx.beginPath();
      ctx.moveTo(x, start);
      ctx.lineTo(x + w, start + d * 0.28);
      ctx.lineTo(x + w, start + d * (0.28 + 0.32 / bays));
      ctx.lineTo(x, start + (d * 0.32) / bays);
      ctx.fill();
    }
    ctx.restore();
  }
  floor.guides.forEach(shadow);
  floor.rooms.forEach((r) => r.panels.forEach(shadow));
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
}
