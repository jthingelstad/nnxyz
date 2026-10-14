import {
  createTimeline,
  strokeFraction,
  advance,
  type Timeline,
} from '../lib/timeline';

const playIcon =
  '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M6 3 21 12 6 21Z"/></svg>';
const pauseIcon =
  '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M8 4v16M16 4v16"/></svg>';

export function initViewer() {
  const viewer = document.querySelector<HTMLElement>('[data-viewer]');
  if (!viewer || viewer.dataset.viewerReady) return;
  viewer.dataset.viewerReady = 'true';
  const play = viewer.querySelector<HTMLButtonElement>('[data-play]')!;
  const seek = viewer.querySelector<HTMLInputElement>('[data-seek]')!;
  const speed = viewer.querySelector<HTMLSelectElement>('[data-speed]')!;
  const status = viewer.querySelector<HTMLElement>('[data-player-status]')!;
  const layer = viewer.querySelector<HTMLElement>('.drawing-art')!;
  let paths: SVGPathElement[] = [];
  let timeline: Timeline;
  let time = 0;
  let playing = false;
  let loaded: Promise<void> | undefined;
  let frame = 0;
  let last = 0;
  let action = 0;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let automatic = viewer.dataset.autoplay === 'true' && !motion.matches;
  let repeat: ReturnType<typeof setTimeout> | undefined;

  function setPlaying(value: boolean) {
    playing = value;
    play.querySelector('[data-play-icon]')!.innerHTML = value
      ? pauseIcon
      : playIcon;
    play.querySelector('[data-play-label]')!.textContent = value
      ? 'Pause drawing'
      : 'Watch drawing';
    play.setAttribute('aria-pressed', String(value));
  }
  async function ensureLoaded() {
    if (!loaded) {
      loaded = (async () => {
        status.textContent = 'Preparing the drawing…';
        const response = await fetch(viewer!.dataset.src!);
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
        const svg = document.importNode(doc.documentElement, true);
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        layer.replaceChildren(svg);
        paths = Array.from(
          layer.querySelectorAll<SVGPathElement>('path[data-stroke]'),
        );
        timeline = createTimeline(paths.map((path) => path.getTotalLength()));
        time = timeline.duration;
        viewer!.dataset.duration = String(timeline.duration);
        viewer!.dataset.strokeCount = String(paths.length);
        status.textContent = '';
      })().catch((error) => {
        loaded = undefined;
        layer.replaceChildren();
        throw error;
      });
    }
    await loaded;
  }
  function render() {
    const complete = time >= timeline.duration;
    if (complete) {
      viewer!.removeAttribute('data-active');
      for (const path of paths) {
        path.style.removeProperty('visibility');
        path.removeAttribute('stroke-dasharray');
        path.removeAttribute('stroke-dashoffset');
      }
    } else {
      viewer!.setAttribute('data-active', 'true');
      for (const [index, path] of paths.entries()) {
        const span = timeline.spans[index];
        const fraction = strokeFraction(span, time);
        if (fraction <= 0) {
          if (path.style.visibility !== 'hidden')
            path.style.visibility = 'hidden';
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
    }
    const progress = Math.round((time / timeline.duration) * 1000);
    seek.value = String(progress);
    seek.setAttribute(
      'aria-valuetext',
      complete
        ? 'Complete drawing'
        : `${Math.round(progress / 10)} percent drawn`,
    );
    viewer!.dataset.progress = String(time / timeline.duration);
  }
  function stop() {
    clearTimeout(repeat);
    cancelAnimationFrame(frame);
    setPlaying(false);
  }
  function tick(now: number) {
    if (!playing) return;
    time = advance(time, now - last, Number(speed.value), timeline.duration);
    last = now;
    render();
    if (time >= timeline.duration) {
      stop();
      status.textContent = '';
      if (automatic) repeat = setTimeout(() => startAutomatic(), 5000);
    } else frame = requestAnimationFrame(tick);
  }
  function reportError(error: unknown) {
    stop();
    viewer!.removeAttribute('data-active');
    status.textContent =
      'Playback could not load. The finished artwork is still available; try again.';
    console.error(error);
  }
  play.addEventListener('click', async () => {
    automatic = false;
    clearTimeout(repeat);
    const currentAction = ++action;
    if (playing) {
      stop();
      return;
    }
    play.disabled = true;
    try {
      await ensureLoaded();
      if (currentAction !== action) return;
      if (time >= timeline.duration) time = 0;
      setPlaying(true);
      render();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } catch (error) {
      reportError(error);
    } finally {
      play.disabled = false;
    }
  });
  seek.addEventListener('input', async () => {
    automatic = false;
    const currentAction = ++action;
    const fraction = Number(seek.value) / 1000;
    stop();
    try {
      await ensureLoaded();
      if (currentAction !== action) return;
      time = fraction * timeline.duration;
      render();
    } catch (error) {
      reportError(error);
    }
  });
  viewer.querySelector('[data-reset]')!.addEventListener('click', async () => {
    automatic = false;
    const currentAction = ++action;
    stop();
    try {
      await ensureLoaded();
      if (currentAction !== action) return;
      time = 0;
      render();
    } catch (error) {
      reportError(error);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      automatic = false;
      action++;
      stop();
    }
  });
  window.addEventListener('pagehide', () => {
    automatic = false;
    action++;
    stop();
  });
  async function startAutomatic() {
    const currentAction = ++action;
    if (!automatic || document.hidden || motion.matches) return;
    setPlaying(true);
    try {
      await ensureLoaded();
      if (currentAction !== action || !automatic) return;
      time = 0;
      render();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    } catch (error) {
      automatic = false;
      reportError(error);
    }
  }
  if (automatic) {
    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          startAutomatic();
        } else if (!entry.isIntersecting && started) {
          automatic = false;
          action++;
          stop();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(viewer);
    window.addEventListener('pagehide', () => observer.disconnect(), {
      once: true,
    });
  }
  motion.addEventListener('change', () => {
    if (motion.matches) {
      automatic = false;
      action++;
      stop();
    }
  });
  const dialog =
    document.querySelector<HTMLDialogElement>('[data-enlargement]');
  async function enlarge() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (typeof viewer!.requestFullscreen === 'function') {
      try {
        await viewer!.requestFullscreen();
        return;
      } catch {
        /* Browser may only support dialog enlargement. */
      }
    }
    dialog?.showModal();
  }
  document.querySelector('[data-enlarge]')?.addEventListener('click', enlarge);
  if (dialog)
    viewer.querySelector('.art-stage')!.addEventListener('click', () => {
      if (matchMedia('(min-width: 761px)').matches) enlarge();
    });
  if (dialog)
    dialog
      .querySelector('[data-close-enlargement]')!
      .addEventListener('click', () => dialog.close());
}
