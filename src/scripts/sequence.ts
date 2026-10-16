// Build sequences: draw a work at fixed points in its recorded stroke order.
// The native SVG holds one path per recorded stroke, in order; the board's
// background pass (any stroke at least 0.9 of the longer canvas side wide,
// the rule tools/analyze-strokes.py uses) is kept in every frame, and the
// drawn strokes are cut at each frame's share of their count.
async function fetchSvg(src: string): Promise<SVGSVGElement> {
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
  return doc.documentElement as unknown as SVGSVGElement;
}

function isHelper(path: SVGPathElement, longerSide: number): boolean {
  const width = Number(path.getAttribute('stroke-width') ?? '0');
  return width >= 0.9 * longerSide;
}

export function initSequences(): void {
  const groups = document.querySelectorAll<HTMLElement>('[data-sequence]');
  if (!groups.length) return;
  const cache = new Map<string, Promise<SVGSVGElement>>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void render(entry.target as HTMLElement);
      }
    },
    { rootMargin: '400px' },
  );
  for (const group of groups) observer.observe(group);

  async function render(group: HTMLElement) {
    const src = group.dataset.src!;
    if (!cache.has(src)) cache.set(src, fetchSvg(src));
    let source: SVGSVGElement;
    try {
      source = await cache.get(src)!;
    } catch {
      group.dataset.sequenceState = 'failed';
      return;
    }
    const viewBox = (source.getAttribute('viewBox') ?? '0 0 1 1')
      .split(/\s+/)
      .map(Number);
    const longerSide = Math.max(viewBox[2] || 1, viewBox[3] || 1);
    const paths = Array.from(
      source.querySelectorAll<SVGPathElement>('path[data-stroke]'),
    );
    const drawn = paths.filter((path) => !isHelper(path, longerSide));
    const frames = group.querySelectorAll<HTMLElement>('[data-frame]');
    for (const frame of frames) {
      const share = Number(frame.dataset.frame);
      const keep = Math.ceil(share * drawn.length);
      const svg = document.importNode(source, true) as unknown as SVGSVGElement;
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      svg.setAttribute('aria-hidden', 'true');
      let index = 0;
      for (const path of svg.querySelectorAll<SVGPathElement>(
        'path[data-stroke]',
      )) {
        if (isHelper(path, longerSide)) continue;
        if (index >= keep) path.remove();
        index += 1;
      }
      const stage = frame.querySelector('.sequence-stage')!;
      stage.replaceChildren(svg);
    }
    group.dataset.sequenceState = 'drawn';
  }
}
