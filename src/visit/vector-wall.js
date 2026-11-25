import { loadDrawingSource } from './load-drawing.js';

// The still and its replay share the published vector and a white ground.
// Size the SVG viewport before decoding: an enlarged 320px poster loses the line.
export async function vectorWall(art, edge, signal) {
  const source = await loadDrawingSource(art, signal);
  signal.throwIfAborted();
  const width = Math.round(edge * Math.min(1, art.ratio));
  const height = Math.round(width / art.ratio);
  const sized = source.replace(/<svg\b[^>]*>/, (tag) =>
    tag
      .replace(/\bwidth="[^"]*"/, 'width="' + width + '"')
      .replace(/\bheight="[^"]*"/, 'height="' + height + '"'),
  );
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    signal.throwIfAborted();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
