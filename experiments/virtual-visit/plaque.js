import * as T from 'three';

// One printed card at standing reading height. Interaction uses the same
// measured lines of type for a mouse, touch or a tracked controller.
export function mountPlaque(group, spot, room, index) {
  const canvas = document.createElement('canvas'),
    width = 560,
    margin = 34;
  canvas.width = width;
  const ctx = canvas.getContext('2d');
  const lines = [];
  function paragraph(text, font, leading, gap = 0, action = null) {
    ctx.font = font;
    let line = '';
    for (const word of text.split(/\s+/)) {
      if (
        line &&
        ctx.measureText(line + ' ' + word).width > width - 2 * margin
      ) {
        lines.push({ text: line, font, leading, gap, action });
        gap = 0;
        line = '';
      }
      line = line ? line + ' ' + word : word;
    }
    if (line) lines.push({ text: line, font, leading, gap, action });
  }
  const art = spot.art;
  paragraph(art.title, '600 39px Helvetica Neue, Arial, sans-serif', 46);
  paragraph(
    [art.artist, art.date].filter(Boolean).join('  ·  '),
    '32px Helvetica Neue, Arial, sans-serif',
    39,
    10,
  );
  paragraph(art.medium, '27px Helvetica Neue, Arial, sans-serif', 35, 3);
  if (spot.first) paragraph(spot.chapter, 'italic 28px Georgia, serif', 35, 10);
  if (art.replay)
    paragraph(
      '▶  Watch it draw',
      '500 32px Helvetica Neue, Arial, sans-serif',
      66,
      13,
      'replay',
    );
  if (index === 0 && room.tour.length)
    paragraph(
      'Listen to room tour',
      '31px Helvetica Neue, Arial, sans-serif',
      58,
      0,
      'tour',
    );
  if (room.hangingCount > 1)
    paragraph(
      'Next hanging  →',
      '31px Helvetica Neue, Arial, sans-serif',
      58,
      0,
      'change',
    );
  canvas.height =
    2 * margin + lines.reduce((sum, l) => sum + l.gap + l.leading, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  const hitRows = [];
  function print(state) {
    ctx.fillStyle = '#f2f0e8';
    ctx.fillRect(0, 0, width, canvas.height);
    ctx.textBaseline = 'middle';
    let y = margin;
    hitRows.length = 0;
    for (const line of lines) {
      y += line.gap;
      ctx.fillStyle = line.action ? '#3c514b' : '#272a27';
      ctx.font = line.font;
      let text = line.text;
      if (line.action === 'replay') {
        if (state === 'playing') text = 'Ⅱ  Pause drawing';
        if (state === 'paused') text = '▶  Resume drawing';
      }
      ctx.fillText(text, margin, y + line.leading / 2, width - 2 * margin);
      if (line.action)
        hitRows.push({ lo: y, hi: y + line.leading, action: line.action });
      y += line.leading;
    }
    texture.needsUpdate = true;
  }
  print('ready');
  const metres = 0.48;
  const card = new T.Mesh(
    new T.PlaneGeometry(metres, (metres * canvas.height) / width),
    new T.MeshBasicMaterial({ map: texture }),
  );
  card.position.set(spot.width / 2 + 0.13 + metres / 2, 1.37 - spot.y, 0.014);
  group.add(card);
  card.userData.labelHit = (v) => {
    const y = (1 - v) * canvas.height;
    const action = hitRows.find((row) => y >= row.lo && y <= row.hi)?.action;
    if (action === 'replay') return { replay: { room, index } };
    if (action) return { [action]: room };
    return { room, index };
  };
  return print;
}
export function wallHit(hit) {
  return hit.object.userData.labelHit?.(hit.uv.y) ?? hit.object.userData;
}
