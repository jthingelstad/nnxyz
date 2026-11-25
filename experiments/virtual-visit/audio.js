// One player owns narration. Silent stops retain their recorded hold on pause.
export function makePlayer(audio, base, changed) {
  let room = null,
    index = 0,
    playing = false,
    single = false,
    token = 0;
  let timer = 0,
    since = 0,
    remaining = 0,
    error = '';
  const stop = () => room?.tour[index];
  function pause() {
    token++;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
      remaining = Math.max(0, remaining - (performance.now() - since));
    }
    audio.pause();
    playing = false;
    changed();
  }
  function end() {
    pause();
    room = null;
    error = '';
    audio.removeAttribute('src');
    audio.load();
    changed();
  }
  function next() {
    if (!room) return;
    if (single || index + 1 >= room.tour.length) {
      end();
      return;
    }
    start(room, index + 1, false);
  }
  function resume() {
    if (!room) return;
    const mine = ++token;
    playing = true;
    error = '';
    if (stop().src) {
      audio.play().catch(() => {
        if (token === mine) {
          playing = false;
          error = 'Audio could not play. Check your connection and try again.';
          changed();
        }
      });
    } else {
      since = performance.now();
      timer = setTimeout(() => {
        timer = 0;
        if (token === mine) next();
      }, remaining);
    }
    changed();
  }
  function start(newRoom, n = 0, only = false) {
    if (!newRoom.tour[n]) return;
    pause();
    room = newRoom;
    index = n;
    single = only;
    remaining = stop().seconds * 1000;
    if (stop().src) audio.src = new URL(stop().src, base).href;
    else {
      audio.removeAttribute('src');
      audio.load();
    }
    resume();
  }
  audio.addEventListener('ended', () => {
    if (room && playing && stop().src && audio.ended) next();
  });
  return {
    start,
    resume,
    pause,
    end,
    get room() {
      return room;
    },
    get index() {
      return index;
    },
    get playing() {
      return playing;
    },
    get error() {
      return error;
    },
    get single() {
      return single;
    },
  };
}
