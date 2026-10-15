/**
 * Screen saver: one work at a time on a rotating schedule, with a translucent
 * overlay of title and caption. The URL hash can limit it to one room
 * (#room=<roomId>) or wing (#wing=<wingId>). Space pauses, arrows step,
 * F enters fullscreen. Reduced motion gets cuts instead of crossfades.
 */
import {
  rasterKey,
  abstractKey,
  rasterWidths,
  abstractWidths,
} from '../lib/media-paths';

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
const imageUrl = (work: SaverWork, width: number) =>
  work.kind === 'ink' ? rasterKey(work.id, width) : abstractKey(work.id, width);
// Full-viewport sizes only; the small thumbnails would be upscaled.
const srcsetFor = (work: SaverWork) =>
  (work.kind === 'ink' ? rasterWidths : abstractWidths)
    .filter((width) => width >= 1200)
    .map((width) => `${imageUrl(work, width)} ${width}w`)
    .join(', ');
const HOLD_MS = 12000;
const FADE_MS = 900;

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
  const layers = Array.from(
    root.querySelectorAll<HTMLImageElement>('[data-layer]'),
  );
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
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Only the newest request may reveal; an earlier decode that was replaced
  // would otherwise flip the layers back.
  let request = 0;

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
  function describe(work: SaverWork) {
    context.textContent = work.wing + ' · ' + work.room;
    titleLink.textContent =
      work.artist === 'nnxyz' ? work.title : `${work.title} · ${work.artist}`;
    titleLink.href = work.href;
    caption.textContent = work.caption;
    overlay.hidden = false;
    root.dataset.current = work.id;
  }
  function preload(work: SaverWork) {
    const img = new Image();
    img.srcset = srcsetFor(work);
    img.sizes = '100vw';
    img.src = imageUrl(work, 2000);
  }
  function show(next: number) {
    if (!works.length) return;
    clearTimeout(timer);
    index = (next + works.length) % works.length;
    const work = works[index];
    const incoming = layers[1 - front];
    const outgoing = layers[front];
    const mine = ++request;
    const reveal = () => {
      if (mine !== request) return;
      incoming.classList.add('is-front');
      outgoing.classList.remove('is-front');
      front = 1 - front;
      describe(work);
      preload(works[(index + 1) % works.length]);
      note.textContent = `${index + 1} of ${works.length}`;
      if (playing) timer = setTimeout(() => show(index + 1), HOLD_MS);
    };
    incoming.sizes = '100vw';
    incoming.srcset = srcsetFor(work);
    incoming.src = imageUrl(work, 2000);
    incoming.alt = work.title;
    incoming.decode().then(reveal, reveal);
  }
  function setPlaying(value: boolean) {
    playing = value;
    root.dataset.playing = String(value);
    toggle.setAttribute('aria-label', value ? 'Pause' : 'Play');
    clearTimeout(timer);
    if (value) timer = setTimeout(() => show(index + 1), HOLD_MS);
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
