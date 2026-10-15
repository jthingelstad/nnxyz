/**
 * Shared replay of an archived drawing: load its native SVG, measure every
 * recorded stroke, and paint the state of the drawing at a moment on the
 * reconstructed timeline. Used by the artwork viewer and the screen saver.
 */
import { createTimeline, strokeFraction, type Timeline } from '../lib/timeline';

export interface Drawing {
  svg: SVGSVGElement;
  paths: SVGPathElement[];
  timeline: Timeline;
}

/** Fetch and mount a drawing's SVG, then measure its strokes in place. */
export async function loadDrawing(
  src: string,
  mount: Element,
): Promise<Drawing> {
  const response = await fetch(src);
  if (!response.ok) throw new Error('SVG could not load');
  const doc = new DOMParser().parseFromString(
    await response.text(),
    'image/svg+xml',
  );
  if (
    doc.querySelector('parsererror') ||
    doc.documentElement.localName !== 'svg'
  )
    throw new Error('Invalid SVG');
  const svg = document.importNode(
    doc.documentElement,
    true,
  ) as unknown as SVGSVGElement;
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  mount.replaceChildren(svg);
  const paths = Array.from(
    svg.querySelectorAll<SVGPathElement>('path[data-stroke]'),
  );
  const timeline = createTimeline(paths.map((path) => path.getTotalLength()));
  return { svg, paths, timeline };
}

/** Paint the drawing as it stood at `time`; returns true when complete. */
export function paintFrame(drawing: Drawing, time: number): boolean {
  const { paths, timeline } = drawing;
  if (time >= timeline.duration) {
    for (const path of paths) {
      path.style.removeProperty('visibility');
      path.removeAttribute('stroke-dasharray');
      path.removeAttribute('stroke-dashoffset');
    }
    return true;
  }
  for (const [index, path] of paths.entries()) {
    const span = timeline.spans[index];
    const fraction = strokeFraction(span, time);
    if (fraction <= 0) {
      if (path.style.visibility !== 'hidden') path.style.visibility = 'hidden';
    } else {
      if (path.style.visibility) path.style.removeProperty('visibility');
      if (fraction >= 1 || span.length === 0) {
        if (path.hasAttribute('stroke-dasharray')) {
          path.removeAttribute('stroke-dasharray');
          path.removeAttribute('stroke-dashoffset');
        }
      } else {
        path.setAttribute(
          'stroke-dasharray',
          `${span.length} ${span.length + 1}`,
        );
        path.setAttribute(
          'stroke-dashoffset',
          String(span.length * (1 - fraction)),
        );
      }
    }
  }
  return false;
}
