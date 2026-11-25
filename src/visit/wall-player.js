import { loadDrawingSource } from './load-drawing.js';
import { wallDrawing } from './drawing.js';

// Every canvas, clock and load belongs to a catalog work. The compact player
// selects which canvas to control; selection itself never changes playback.
export function makeWallPlayer(scene) {
  const entries = new Map();
  const el = (id) => document.getElementById(id);
  const picker = el('draw-work'),
    toggle = el('draw-toggle'),
    time = el('draw-time'),
    speed = el('draw-speed');
  let selected = null;
  function select(entry) {
    selected = entry;
    el('replay').hidden = !entry;
    if (!entry) return;
    picker.value = entry.art.id;
    el('draw-status').textContent = entry.failed
      ? 'Drawing unavailable'
      : entry.replay
        ? 'Reconstructed drawing'
        : 'Loading drawing';
    toggle.disabled = !entry.replay && !entry.failed;
    toggle.textContent = entry.failed
      ? 'Retry'
      : entry.playing
        ? 'Pause'
        : entry.replay && entry.time >= entry.replay.duration
          ? 'Replay'
          : 'Play';
    time.disabled = speed.disabled = !entry.replay;
    // The slider's last keyboard step must reach the exact final stroke.
    const step = Number(time.step);
    time.max = entry.replay
      ? Math.ceil(entry.replay.duration / step) * step
      : 1;
    time.value =
      entry.replay && entry.time >= entry.replay.duration
        ? time.max
        : entry.time;
    speed.value = entry.speed;
  }
  function refresh(entry) {
    scene.replaySign(
      entry.art.id,
      entry.playing
        ? 'playing'
        : entry.replay && entry.time < entry.replay.duration
          ? 'paused'
          : 'ready',
    );
    if (entry === selected) select(entry);
  }
  function paint(entry) {
    scene.setDrawing(entry.replay.paint(entry.time), entry.art.id);
    if (entry === selected) time.value = entry.time;
  }
  function get(room, index) {
    const art = room.works[index];
    if (!entries.has(art.id)) {
      const label = room.works.some(
        (w, i) => i !== index && w.title === art.title,
      )
        ? art.title + ' · ' + (index + 1)
        : art.title;
      const option = new Option(label, art.id);
      picker.add(option);
      entries.set(art.id, {
        room,
        index,
        art,
        option,
        replay: null,
        request: null,
        loading: null,
        failed: false,
        time: 0,
        speed: '1',
        playing: false,
        clock: null,
        revision: 0,
      });
    }
    return entries.get(art.id);
  }
  function load(entry) {
    if (entry.replay || entry.loading) return entry.loading;
    entry.failed = false;
    const request = new AbortController();
    entry.request = request;
    entry.loading = (async () => {
      try {
        const source = await loadDrawingSource(entry.art, request.signal);
        if (request.signal.aborted) return;
        entry.replay = wallDrawing(
          source,
          entry.room.light ? scene.vectorEdge : 800,
        );
        paint(entry);
      } catch {
        if (!request.signal.aborted) entry.failed = true;
      } finally {
        entry.loading = null;
        entry.request = null;
        if (!request.signal.aborted) refresh(entry);
      }
    })();
    return entry.loading;
  }
  function play(entry) {
    if (entry.time >= entry.replay.duration) entry.time = 0;
    entry.playing = true;
    entry.clock = null;
    refresh(entry);
  }
  // Wait for all newly requested sources before starting a pair on the same
  // animation frame. A later pause, seek, or room change wins over this request.
  async function start(items) {
    const pending = items
      .filter((e) => !e.playing)
      .map((e) => ({ e, revision: ++e.revision }));
    await Promise.all(pending.map(({ e }) => load(e)));
    for (const { e, revision } of pending)
      if (e.revision === revision && entries.get(e.art.id) === e && e.replay)
        play(e);
  }
  function activate(room, index) {
    const e = get(room, index);
    select(e);
    if (e.playing) {
      e.revision++;
      e.playing = false;
      e.clock = null;
      refresh(e);
    } else if (!e.loading) void start([e]);
  }
  function together(room) {
    const items = room.hang.flatMap((s, i) =>
      s.art.replay && s.set === (room.activeSet ?? 0) ? [get(room, i)] : [],
    );
    if (items.length) {
      select(items[0]);
      void start(items);
    }
  }
  function close(e) {
    e.request?.abort();
    scene.setDrawing(null, e.art.id);
    scene.replaySign(e.art.id, 'ready');
    entries.delete(e.art.id);
    e.option.remove();
    if (e === selected) select([...entries.values()].at(-1) ?? null);
  }
  function keepVisible(room) {
    for (const e of entries.values())
      if (e.room !== room || room.hang[e.index].set !== (room.activeSet ?? 0))
        close(e);
  }
  function tick(now) {
    for (const e of entries.values()) {
      if (!e.playing) continue;
      if (e.clock === null) {
        e.clock = now;
        continue;
      }
      const elapsed = now - e.clock;
      if (elapsed < 1000 / 30) continue;
      e.clock = now;
      e.time = Math.min(
        e.replay.duration,
        e.time + (Math.min(elapsed, 100) / 1000) * Number(e.speed),
      );
      paint(e);
      if (e.time >= e.replay.duration) {
        e.playing = false;
        refresh(e);
      }
    }
  }
  picker.onchange = () => select(entries.get(picker.value));
  toggle.onclick = () => {
    if (selected) activate(selected.room, selected.index);
  };
  time.oninput = () => {
    if (!selected?.replay) return;
    selected.revision++;
    selected.time = Math.min(Number(time.value), selected.replay.duration);
    selected.clock = null;
    if (selected.time >= selected.replay.duration) selected.playing = false;
    paint(selected);
    refresh(selected);
  };
  speed.onchange = () => {
    if (selected) selected.speed = speed.value;
  };
  el('draw-stop').onclick = () => {
    if (selected) close(selected);
  };
  return { activate, together, tick, keepVisible };
}
