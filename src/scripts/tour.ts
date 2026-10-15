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
  };
  const reveal = (stop: TourStop) => {
    document
      .querySelectorAll('.tour-current')
      .forEach((el) => el.classList.remove('tour-current'));
    let target: string | null = null;
    if (stop.kind === 'introduction') target = 'tour-top';
    else if (stop.kind === 'closing') target = 'closing';
    else if (stop.artworkId) target = `work-${stop.artworkId}`;
    if (stop.kind === 'chapter') {
      // The chapter segment follows the chapter's first work in the order of
      // the page; show the chapter heading instead.
      const next = stops.slice(stop.index + 1).find((s) => s.artworkId);
      const figure = next && document.getElementById(`work-${next.artworkId}`);
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
  const preload = (index: number) => {
    const next = stops[index];
    if (next?.src) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = next.src;
      link.as = 'audio';
      document.head.append(link);
    }
  };
  const play = (index: number) => {
    clearHold();
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
    audio.pause();
    audio.removeAttribute('src');
    clearInterval(ticker);
    current = -1;
    setState('idle');
    bar.hidden = true;
    start.hidden = false;
    document
      .querySelectorAll('.tour-current')
      .forEach((el) => el.classList.remove('tour-current'));
    start.focus({ preventScroll: true });
  };

  audio.addEventListener('ended', () => play(current + 1));
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
  start.addEventListener('click', () => {
    start.hidden = true;
    bar.hidden = false;
    player.hidden = false;
    clearInterval(ticker);
    ticker = setInterval(render, 250);
    play(0);
    toggle.focus({ preventScroll: true });
  });
  player.hidden = false;
  start.hidden = false;
}
