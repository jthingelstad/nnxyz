/**
 * Screen saver: one work at a time, drawn stroke by stroke from its archived
 * brush paths at an unhurried pace, held once complete, then the next. Works
 * with no recorded strokes (Abstract) are held as stills. The URL hash can
 * limit the set to one room (#room=<roomId>) or wing (#wing=<wingId>). Space
 * pauses, arrows step, F enters fullscreen. Reduced motion shows each finished
 * drawing without the animation.
 */
import { advance } from '../lib/timeline';
import {
  rasterKey,
  abstractKey,
  rasterWidths,
  abstractWidths,
} from '../lib/media-paths';
import { loadDrawing, paintFrame, type Drawing } from './replay';

interface SaverWork {
  id: string;
  title: string;
  artist: string;
  caption: string;
  room: string;
  roomId: string;
  wing: string;
  wingId: string;
  href: string;
  kind: 'ink' | 'abstract';
}
/** Drawing speed relative to the artwork page's 1× reconstruction. */
const SPEED = 0.7;
/** How long a finished drawing stays before the next begins. */
const HOLD_MS = 10000;
/** How long a still (or a drawing under reduced motion) stays. */
const STILL_MS = 12000;
const FADE_MS = 900;

const imageUrl = (work: SaverWork, width: number) =>
  work.kind === 'ink' ? rasterKey(work.id, width) : abstractKey(work.id, width);
const srcsetFor = (work: SaverWork) =>
  (work.kind === 'ink' ? rasterWidths : abstractWidths)
    .filter((width) => width >= 1200)
    .map((width) => `${imageUrl(work, width)} ${width}w`)
    .join(', ');

function shuffle<T>(items: T[]): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function initScreensaver() {
  const found = document.querySelector<HTMLElement>('[data-saver]');
  if (!found) return;
  const root: HTMLElement = found;
  const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-layer]'));
  const overlay = root.querySelector<HTMLElement>('[data-overlay]')!;
  const context = root.querySelector<HTMLElement>('[data-context]')!;
  const titleLink = root.querySelector<HTMLAnchorElement>('[data-title-link]')!;
  const caption = root.querySelector<HTMLElement>('[data-caption]')!;
  const note = root.querySelector<HTMLElement>('[data-note]')!;
  const toggle = root.querySelector<HTMLButtonElement>('[data-saver-toggle]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let works: SaverWork[] = [];
  let index = -1;
  let front = 0;
  let playing = true;
  // Only the newest request may reveal; an earlier load that was replaced
  // would otherwise flip the layers back.
  let request = 0;
  // The current drawing's clock, and the hold timer that follows it.
  let drawing: Drawing | undefined;
  let time = 0;
  let last = 0;
  let frame = 0;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let holdStarted = 0;
  let holdLeft = 0;

  function selection(all: SaverWork[]): SaverWork[] {
    const params = new URLSearchParams(location.hash.slice(1));
    const room = params.get('room');
    const wing = params.get('wing');
    const chosen = all.filter(
      (work) =>
        (!room || work.roomId === room) && (!wing || work.wingId === wing),
    );
    return shuffle(chosen.length ? chosen : all);
  }
  function describe(work: SaverWork, complete: boolean) {
    context.textContent = work.wing + ' · ' + work.room;
    titleLink.textContent =
      work.artist === 'nnxyz' ? work.title : `${work.title} · ${work.artist}`;
    titleLink.href = work.href;
    caption.textContent = work.caption;
    overlay.hidden = false;
    root.dataset.current = work.id;
    root.dataset.complete = String(complete);
  }
  function stopClock() {
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(hold);
    hold = undefined;
  }
  function startHold(ms: number) {
    holdLeft = ms;
    holdStarted = Date.now();
    if (playing) hold = setTimeout(() => show(index + 1), ms);
  }
  function flip(mine: number) {
    if (mine !== request) return false;
    const incoming = layers[1 - front];
    const outgoing = layers[front];
    incoming.classList.add('is-front');
    outgoing.classList.remove('is-front');
    front = 1 - front;
    // Free the previous work's SVG or image once the fade is over.
    setTimeout(() => {
      if (!outgoing.classList.contains('is-front')) outgoing.replaceChildren();
    }, FADE_MS + 100);
    return true;
  }
  function tick(now: number) {
    if (!playing || !drawing) return;
    time = advance(time, now - last, SPEED, drawing.timeline.duration);
    last = now;
    const complete = paintFrame(drawing, time);
    root.dataset.progress = String(time / drawing.timeline.duration);
    if (complete) {
      root.dataset.complete = 'true';
      startHold(HOLD_MS);
    } else frame = requestAnimationFrame(tick);
  }
  function showStill(work: SaverWork, mine: number) {
    const incoming = layers[1 - front];
    const img = document.createElement('img');
    img.className = 'saver-image';
    img.sizes = '100vw';
    img.srcset = srcsetFor(work);
    img.src = imageUrl(work, 2000);
    img.alt = work.title;
    img.decoding = 'async';
    incoming.replaceChildren(img);
    const reveal = () => {
      if (!flip(mine)) return;
      root.dataset.mode = 'still';
      drawing = undefined;
      describe(work, true);
      note.textContent = `${index + 1} of ${works.length}`;
      startHold(STILL_MS);
    };
    img.decode().then(reveal, reveal);
  }
  async function showDrawing(work: SaverWork, mine: number) {
    const incoming = layers[1 - front];
    let loaded: Drawing;
    try {
      loaded = await loadDrawing(`/art/${work.id}.svg`, incoming);
    } catch {
      // Without its strokes, the work is still shown.
      if (mine === request) showStill(work, mine);
      return;
    }
    if (mine !== request) return;
    // Keep the drawing's own proportions inside the viewport, like a still.
    const box = loaded.svg.viewBox.baseVal;
    if (box && box.width && box.height)
      loaded.svg.style.aspectRatio = `${box.width} / ${box.height}`;
    loaded.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    drawing = loaded;
    time = reduced ? loaded.timeline.duration : 0;
    const complete = paintFrame(loaded, time);
    if (!flip(mine)) return;
    root.dataset.mode = reduced ? 'still' : 'drawing';
    describe(work, complete);
    note.textContent = `${index + 1} of ${works.length}`;
    if (complete) startHold(STILL_MS);
    else {
      last = performance.now();
      if (playing) frame = requestAnimationFrame(tick);
    }
  }
  function show(next: number) {
    if (!works.length) return;
    stopClock();
    index = (next + works.length) % works.length;
    const work = works[index];
    const mine = ++request;
    if (work.kind === 'ink') void showDrawing(work, mine);
    else showStill(work, mine);
  }
  function setPlaying(value: boolean) {
    if (value === playing) return;
    playing = value;
    root.dataset.playing = String(value);
    toggle.setAttribute('aria-label', value ? 'Pause' : 'Play');
    if (value) {
      if (hold === undefined && drawing && time < drawing.timeline.duration) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      } else if (holdLeft > 0) {
        hold = setTimeout(() => show(index + 1), holdLeft);
        holdStarted = Date.now();
      }
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      if (hold !== undefined) {
        clearTimeout(hold);
        hold = undefined;
        holdLeft = Math.max(0, holdLeft - (Date.now() - holdStarted));
      }
    }
  }

  root.dataset.playing = 'true';
  if (reduced) root.dataset.reducedMotion = 'true';
  root.style.setProperty('--saver-fade', `${reduced ? 0 : FADE_MS}ms`);
  toggle.addEventListener('click', () => setPlaying(!playing));
  root
    .querySelector('[data-saver-next]')!
    .addEventListener('click', () => show(index + 1));
  root
    .querySelector('[data-saver-previous]')!
    .addEventListener('click', () => show(index - 1));
  root
    .querySelector('[data-saver-fullscreen]')!
    .addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen?.();
    });
  document.addEventListener('keydown', (event) => {
    // A focused control handles Space and Enter itself; arrows and F still work.
    const onControl =
      event.target instanceof HTMLElement &&
      event.target.closest('button, a, input, select, textarea');
    if (onControl && (event.key === ' ' || event.key === 'Enter')) return;
    if (event.key === ' ') {
      event.preventDefault();
      setPlaying(!playing);
    } else if (event.key === 'ArrowRight') show(index + 1);
    else if (event.key === 'ArrowLeft') show(index - 1);
    else if (event.key === 'f' || event.key === 'F') root.requestFullscreen?.();
  });
  // Any pointer movement brings the controls back for a moment.
  let idle: ReturnType<typeof setTimeout> | undefined;
  const wake = () => {
    root.dataset.idle = 'false';
    clearTimeout(idle);
    idle = setTimeout(() => {
      root.dataset.idle = 'true';
    }, 3000);
  };
  root.addEventListener('pointermove', wake);
  root.addEventListener('pointerdown', wake);
  wake();
  // A hidden tab stops the clock; it resumes where it was.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPlaying(false);
    else setPlaying(true);
  });

  fetch(root.dataset.source!)
    .then((response) => response.json())
    .then((data: { works: SaverWork[] }) => {
      const all = data.works;
      works = selection(all);
      window.addEventListener('hashchange', () => {
        works = selection(all);
        show(0);
      });
      show(0);
    })
    .catch(() => {
      note.textContent = 'The works could not be loaded.';
    });
}
