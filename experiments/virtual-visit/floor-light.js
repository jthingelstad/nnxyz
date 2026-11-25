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
