// Artwork search on /search/. Pagefind writes the index to /pagefind/ after
// the build; this loads its API and draws results with each work's thumbnail.
// The query and wing are kept in the address so a search can be shared.
interface Result {
  url: string;
  excerpt: string;
  meta: {
    title?: string;
    image?: string;
    image_srcset?: string;
    room?: string;
  };
}
interface Match {
  words: number[];
  matchedMetaFields?: string[];
  data(): Promise<Result>;
}
interface Pagefind {
  options(options: Record<string, unknown>): Promise<void>;
  init(): void;
  search(
    term: string | null,
    options: { filters?: Record<string, string> },
  ): Promise<{ results: Match[] } | null>;
}

const page = 24;
const index = '/pagefind/pagefind.js';

// Excerpts are escaped text with <mark> around matches. Rebuild them as text
// nodes and mark elements rather than parsing them as HTML.
const entities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
};
const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (entity) => entities[entity]);
function excerpt(text: string) {
  const paragraph = document.createElement('p');
  paragraph.className = 'search-excerpt';
  text.split(/(<mark>.*?<\/mark>)/).forEach((part) => {
    const marked = /^<mark>(.*)<\/mark>$/.exec(part);
    if (marked) {
      const mark = document.createElement('mark');
      mark.textContent = decode(marked[1]);
      paragraph.append(mark);
    } else if (part) paragraph.append(decode(part));
  });
  return paragraph;
}

function card(result: Result) {
  const item = document.createElement('li');
  const link = document.createElement('a');
  link.href = result.url;
  link.className = 'search-result';
  if (result.meta.image) {
    const image = document.createElement('img');
    image.src = result.meta.image;
    if (result.meta.image_srcset) image.srcset = result.meta.image_srcset;
    image.sizes = '(max-width: 760px) 40vw, 220px';
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    link.append(image);
  }
  const title = document.createElement('h2');
  title.textContent = result.meta.title ?? result.url;
  link.append(title);
  if (result.meta.room) {
    const room = document.createElement('p');
    room.className = 'search-room';
    room.textContent = result.meta.room;
    link.append(room);
  }
  if (result.excerpt) link.append(excerpt(result.excerpt));
  item.append(link);
  return item;
}

export async function initSearch() {
  const root = document.querySelector<HTMLElement>('[data-search]');
  if (!root) return;
  const form = root.querySelector<HTMLFormElement>('[data-search-form]')!;
  const input = root.querySelector<HTMLInputElement>('[data-search-query]')!;
  const wingButtons = [
    ...root.querySelectorAll<HTMLButtonElement>('[data-search-wings] button'),
  ];
  const status = root.querySelector<HTMLElement>('[data-search-status]')!;
  const list = root.querySelector<HTMLOListElement>('[data-search-results]')!;
  const more = root.querySelector<HTMLButtonElement>('[data-search-more]')!;

  const params = new URLSearchParams(location.search);
  input.value = params.get('q') ?? '';
  let wing = params.get('wing') ?? '';
  if (!wingButtons.some((button) => button.dataset.wing === wing)) wing = '';
  const showWing = () =>
    wingButtons.forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.wing === wing)),
    );
  showWing();

  status.textContent = 'Loading the search…';
  let pagefind: Pagefind;
  try {
    pagefind = (await import(/* @vite-ignore */ index)) as Pagefind;
    await pagefind.options({ excerptLength: 22 });
    pagefind.init();
  } catch {
    status.textContent =
      'Search could not load. The collections and the map show every work.';
    return;
  }

  let found: Match[] = [];
  let shown = 0;
  let run = 0;
  // Reserve the next range before its data loads, so a second click while a
  // batch is loading takes the range after it rather than the same one.
  async function showMore(current: number) {
    const start = shown;
    shown = Math.min(start + page, found.length);
    more.disabled = true;
    const batch = await Promise.all(
      found.slice(start, shown).map((result) => result.data()),
    );
    if (current !== run) return;
    list.append(...batch.map(card));
    more.disabled = false;
    more.hidden = shown >= found.length;
  }
  async function update() {
    const current = ++run;
    const term = input.value.trim();
    const next = new URLSearchParams();
    if (term) next.set('q', term);
    if (wing) next.set('wing', wing);
    const query = next.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
    if (!term && !wing) {
      found = [];
      list.replaceChildren();
      more.hidden = true;
      status.textContent = 'Type a word or choose a wing.';
      return;
    }
    const search = await pagefind.search(term || null, {
      filters: wing ? { wing } : {},
    });
    if (current !== run || !search) return;
    // Pagefind also searches metadata, and loosely: the thumbnail paths carry
    // drawing CIDs, which match nonsense words. Keep matches in the text or
    // the room name.
    found = term
      ? search.results.filter(
          (result) =>
            result.words.length > 0 ||
            result.matchedMetaFields?.some(
              (field) => !field.startsWith('image'),
            ),
        )
      : search.results;
    shown = 0;
    list.replaceChildren();
    const count = `${found.length} ${found.length === 1 ? 'work' : 'works'}`;
    status.textContent = found.length
      ? wing && !term
        ? `${count} in ${wing}`
        : count
      : `No works match “${term}”${wing ? ` in ${wing}` : ''}.`;
    await showMore(current);
  }

  let typing: ReturnType<typeof setTimeout>;
  input.addEventListener('input', () => {
    clearTimeout(typing);
    typing = setTimeout(update, 200);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(typing);
    update();
  });
  wingButtons.forEach((button) =>
    button.addEventListener('click', () => {
      wing = button.dataset.wing ?? '';
      showWing();
      update();
    }),
  );
  more.addEventListener('click', () => showMore(run));
  await update();
  if (!input.value) input.focus();
}
