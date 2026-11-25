import { createTimeline, strokeFraction } from '../../src/lib/timeline.ts';

// Project the selected work’s published display SVG into its frame. Cache
// complete strokes separately so a partially transparent path is painted once.
export function wallDrawing(source, edge = 800) {
  const svg = new DOMParser().parseFromString(
    source,
    'image/svg+xml',
  ).documentElement;
  const paths = [...svg.querySelectorAll('path[data-stroke]')].map((node) => ({
    path: new Path2D(node.getAttribute('d')),
    length: node.getTotalLength(),
    start: node.getPointAtLength(0),
    width: Number(node.getAttribute('stroke-width')),
    color: node.getAttribute('stroke'),
    alpha: Number(node.getAttribute('stroke-opacity') ?? 1),
  }));
  const timeline = createTimeline(paths.map((p) => p.length));
  const canvas = document.createElement('canvas'),
    base = document.createElement('canvas');
  const [, , width, height] = svg
    .getAttribute('viewBox')
    .split(/\s+/)
    .map(Number);
  canvas.width = base.width = Math.round(edge * Math.min(1, width / height));
  canvas.height = base.height = Math.round((canvas.width * height) / width);
  const ctx = canvas.getContext('2d'),
    complete = base.getContext('2d');
  let layers = 0;
  function reset() {
    complete.fillStyle = 'white';
    complete.fillRect(0, 0, base.width, base.height);
    layers = 0;
  }
  function stroke(target, p, fraction) {
    if (fraction <= 0) return;
    target.save();
    target.scale(canvas.width / width, canvas.height / height);
    target.lineCap = target.lineJoin = 'round';
    target.lineWidth = p.width;
    target.strokeStyle = p.color;
    target.globalAlpha = p.alpha;
    if (p.length === 0) {
      target.fillStyle = p.color;
      target.beginPath();
      target.arc(p.start.x, p.start.y, p.width / 2, 0, 2 * Math.PI);
      target.fill();
    } else {
      if (fraction < 1) {
        target.setLineDash([p.length, p.length + 1]);
        target.lineDashOffset = p.length * (1 - fraction);
      }
      target.stroke(p.path);
    }
    target.restore();
  }
  function paint(t) {
    if (layers && timeline.spans[layers - 1].end > t) reset();
    while (layers < paths.length && timeline.spans[layers].end <= t) {
      stroke(complete, paths[layers], 1);
      layers++;
    }
    ctx.drawImage(base, 0, 0);
    if (layers < paths.length)
      stroke(ctx, paths[layers], strokeFraction(timeline.spans[layers], t));
    return canvas;
  }
  reset();
  return { paint, duration: timeline.duration };
}
