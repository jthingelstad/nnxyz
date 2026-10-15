/**
 * Audio tour: plays a room's segments in order and brings each work on screen
 * as its segment starts. Silent works hold for a few seconds. The page stays
 * fully readable without it; the button appears only when the script runs.
 */
interface TourStop {
  index: number;
  kind: string;
  artworkId: string | null;
  secondArtworkId: string | null;
  src: string | null;
  seconds: number;
}

/** A breath between one segment and the next, so stops do not run together. */
const GAP_MS = 700;

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function initTour() {
  const player = document.querySelector<HTMLElement>('[data-tour-player]');
  const start = document.querySelector<HTMLButtonElement>('[data-tour-start]');
  if (!player || !start) return;
  const stops: TourStop[] = JSON.parse(
    player.querySelector('[data-tour-stops]')!.textContent || '[]',
  );
  if (!stops.length) return;
  const audio = player.querySelector<HTMLAudioElement>('[data-tour-audio]')!;
  const bar = player.querySelector<HTMLElement>('[data-tour-bar]')!;
  const toggle = player.querySelector<HTMLButtonElement>('[data-tour-toggle]')!;
  const position = player.querySelector<HTMLElement>('[data-tour-position]')!;
  const progress = player.querySelector<HTMLElement>('[data-tour-progress]')!;
  const time = player.querySelector<HTMLElement>('[data-tour-time]')!;
  const total = stops.reduce((n, stop) => n + stop.seconds, 0);
  const before = stops.map((_, i) =>
    stops.slice(0, i).reduce((n, stop) => n + stop.seconds, 0),
  );
  let current = -1;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let holdStarted = 0;
  let holdElapsed = 0;
  let playing = false;
  let ticker: ReturnType<typeof setInterval> | undefined;
  let gap: ReturnType<typeof setTimeout> | undefined;
  // Changing the source rejects the previous play() with an abort; only a
  // failure to start the current segment should show the tour as paused.
  let attempt = 0;
  const tryPlay = () => {
    const mine = ++attempt;
    audio.play().catch((error: unknown) => {
      if (mine !== attempt) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setState('paused');
    });
  };

  const setState = (state: 'idle' | 'playing' | 'paused') => {
    player.dataset.tourState = state;
    playing = state === 'playing';
    toggle.setAttribute('aria-label', playing ? 'Pause tour' : 'Resume tour');
    document.body.classList.toggle('tour-active', state !== 'idle');
    // Silent holds have no media playing, so tell the OS controls ourselves.
    if ('mediaSession' in navigator)
      navigator.mediaSession.playbackState = state === 'idle' ? 'none' : state;
  };
  const roomTitle =
    player.querySelector('.tour-room')?.textContent?.trim() ?? document.title;
  const announce = (stop: TourStop) => {
    if (!('mediaSession' in navigator)) return;
    const figure = stop.artworkId
      ? document.getElementById(`work-${stop.artworkId}`)
      : null;
    const title = figure?.querySelector('h3')?.textContent?.trim();
    const img = figure?.querySelector('img');
    const artwork =
      img?.currentSrc && img.naturalWidth
        ? [
            {
              src: img.currentSrc,
              sizes: `${img.naturalWidth}x${img.naturalHeight}`,
              type: 'image/webp',
            },
          ]
        : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title ?? roomTitle,
      artist: title ? roomTitle : 'nnxyz',
      album: 'nnxyz audio tour',
      artwork,
    });
  };
  const reveal = (stop: TourStop) => {
    announce(stop);
    document
      .querySelectorAll('.tour-current')
      .forEach((el) => el.classList.remove('tour-current'));
    let target: string | null = null;
    if (stop.kind === 'introduction') target = 'tour-top';
    else if (stop.kind === 'closing') target = 'closing';
    else if (stop.artworkId) target = `work-${stop.artworkId}`;
    if (stop.kind === 'chapter' && stop.artworkId) {
      // A chapter segment carries its first work; show the chapter heading.
      const figure = document.getElementById(`work-${stop.artworkId}`);
      const chapter = figure?.closest<HTMLElement>('[data-chapter]');
      target = chapter ? chapter.id : target;
    }
    document.dispatchEvent(
      new CustomEvent('nnxyz:reveal', { detail: { id: target } }),
    );
    for (const id of [stop.artworkId, stop.secondArtworkId])
      if (id)
        document.getElementById(`work-${id}`)?.classList.add('tour-current');
  };
  const elapsed = () => {
    if (current < 0) return 0;
    const stop = stops[current];
    const within = stop.src
      ? audio.currentTime
      : holdElapsed + (playing ? (Date.now() - holdStarted) / 1000 : 0);
    return before[current] + Math.min(within, stop.seconds);
  };
  const render = () => {
    const done = elapsed();
    progress.style.width = `${(100 * done) / total}%`;
    time.textContent = `${clock(done)} / ${clock(total)}`;
    position.textContent = `${current + 1} of ${stops.length}`;
  };
  const clearHold = () => {
    clearTimeout(hold);
    hold = undefined;
  };
  const prefetched = new Set<string>();
  const preload = (index: number) => {
    const next = stops[index];
    if (next?.src && !prefetched.has(next.src)) {
      prefetched.add(next.src);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = next.src;
      link.as = 'audio';
      document.head.append(link);
    }
  };
  const play = (index: number) => {
    clearHold();
    clearTimeout(gap);
    audio.pause();
    if (index >= stops.length) {
      finish();
      return;
    }
    current = index;
    const stop = stops[index];
    reveal(stop);
    setState('playing');
    render();
    preload(index + 1);
    if (stop.src) {
      audio.src = stop.src;
      tryPlay();
    } else {
      holdElapsed = 0;
      holdStarted = Date.now();
      hold = setTimeout(() => play(index + 1), stop.seconds * 1000);
    }
  };
  const pause = () => {
    if (!playing) return;
    const stop = stops[current];
    clearTimeout(gap);
    if (stop.src) audio.pause();
    else {
      clearHold();
      holdElapsed += (Date.now() - holdStarted) / 1000;
    }
    setState('paused');
  };
  const resume = () => {
    if (playing || current < 0) return;
    const stop = stops[current];
    // Paused in the breath after a segment ended: go on to the next stop
    // rather than replaying the finished one.
    if (stop.src && audio.ended) {
      play(current + 1);
      return;
    }
    setState('playing');
    if (stop.src) tryPlay();
    else {
      holdStarted = Date.now();
      const left = Math.max(0, stop.seconds - holdElapsed);
      hold = setTimeout(() => play(current + 1), left * 1000);
    }
  };
  const finish = () => {
    clearHold();
    clearTimeout(gap);
    audio.pause();
    audio.removeAttribute('src');
    clearInterval(ticker);
    current = -1;
    setState('idle');
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    bar.hidden = true;
    start.hidden = false;
    document
      .querySelectorAll('.tour-current')
      .forEach((el) => el.classList.remove('tour-current'));
    start.focus({ preventScroll: true });
  };

  audio.addEventListener('ended', () => {
    clearTimeout(gap);
    gap = setTimeout(() => {
      if (playing) play(current + 1);
    }, GAP_MS);
  });
  audio.addEventListener('error', () => {
    // A segment that will not play is skipped rather than ending the tour.
    if (playing) play(current + 1);
  });
  toggle.addEventListener('click', () => (playing ? pause() : resume()));
  player
    .querySelector('[data-tour-next]')!
    .addEventListener('click', () => play(current + 1));
  player
    .querySelector('[data-tour-previous]')!
    .addEventListener('click', () => play(Math.max(0, current - 1)));
  player.querySelector('[data-tour-stop]')!.addEventListener('click', finish);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && current >= 0) finish();
  });
  if ('mediaSession' in navigator) {
    const actions: [MediaSessionAction, () => void][] = [
      ['play', resume],
      ['pause', pause],
      ['nexttrack', () => play(current + 1)],
      ['previoustrack', () => play(Math.max(0, current - 1))],
      ['stop', finish],
    ];
    for (const [action, handler] of actions)
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // An action this browser does not offer is simply not wired.
      }
  }
  start.addEventListener('click', () => {
    start.hidden = true;
    bar.hidden = false;
    player.hidden = false;
    clearInterval(ticker);
    ticker = setInterval(render, 250);
    play(0);
    toggle.focus({ preventScroll: true });
  });
  // Fetch the first segment as soon as the visitor shows interest.
  const warm = () => preload(0);
  start.addEventListener('pointerenter', warm, { once: true });
  start.addEventListener('focus', warm, { once: true });
  player.hidden = false;
  start.hidden = false;
}
