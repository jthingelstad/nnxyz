// The story pages: long-form background on Nifty Ink, the collector, the
// artist's project, the year 2022, the collector's fan art and the artist's
// own words. Each page is a
// Markdown file under curation/story/ with a short front matter block; this
// module parses the subset of Markdown those files use (paragraphs, ##
// headings, > quotes, - lists, links, emphasis) so the pages, llms-full.txt
// and the tests all read the same text. Nothing here is fetched or inferred.
import timeline from '../../curation/story/timeline-2022.json';
import factsFile from '../../curation/story/facts.json';
import worksFile from '../../curation/story/works.json';

export interface StoryPage {
  slug: string;
  title: string;
  /** One line for the index, the share description and llms.txt. */
  summary: string;
  order: number;
  /** 'prose' renders the body; 'timeline' adds the month blocks; 'words' adds the quotations. */
  kind: 'prose' | 'timeline' | 'words';
  body: string;
  sources: string[];
}
export type StoryBlock =
  | { type: 'html'; html: string }
  | { type: 'month'; month: string }
  | { type: 'work'; inkId: string };

// Drawings outside the collection that a story page shows with {{work <inkId>}}.
export type StoryWork = (typeof worksFile.works)[number];
export const storyWorks = new Map<string, StoryWork>(
  worksFile.works.map((work) => [work.inkId, work]),
);

// Every Markdown page in curation/story/ except its README.
const files = import.meta.glob<string>(
  ['../../curation/story/*.md', '!**/README.md'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

function parseFrontMatter(raw: string, name: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${name}: missing front matter`);
  const meta: Record<string, string> = {};
  const sources: string[] = [];
  let inSources = false;
  for (const line of match[1].split('\n')) {
    if (line.startsWith('sources:')) {
      inSources = true;
      continue;
    }
    if (inSources && line.startsWith('  - ')) {
      sources.push(line.slice(4).trim());
      continue;
    }
    inSources = false;
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, sources, body: match[2].trim() };
}

export const storyPages: StoryPage[] = Object.entries(files)
  .map(([path, raw]) => {
    const name = path.split('/').pop()!.replace(/\.md$/, '');
    const { meta, sources, body } = parseFrontMatter(raw, name);
    for (const key of ['title', 'summary', 'order'])
      if (!meta[key]) throw new Error(`${name}: front matter needs ${key}`);
    const kind = (meta.kind ?? 'prose') as StoryPage['kind'];
    if (!['prose', 'timeline', 'words'].includes(kind))
      throw new Error(`${name}: unknown kind ${kind}`);
    return {
      slug: name,
      title: meta.title,
      summary: meta.summary,
      order: Number(meta.order),
      kind,
      body,
      sources,
    };
  })
  .sort((a, b) => a.order - b.order);

export const storyPath = (slug: string) => `/story/${slug}/`;

export const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Links, emphasis and strong, on already escaped text. */
export function inline(text: string): string {
  return escapeHtml(text)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
      (_, label, href) => `<a href="${href}">${label}</a>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
}

/** The Markdown subset the story files use, as HTML blocks in order. */
export function render(body: string): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  const push = (html: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'html') last.html += `\n${html}`;
    else blocks.push({ type: 'html', html });
  };
  for (const chunk of body.split(/\n{2,}/)) {
    const text = chunk.trim();
    if (!text) continue;
    const month = text.match(/^\{\{month (\d{4}-\d{2})\}\}$/);
    if (month) {
      blocks.push({ type: 'month', month: month[1] });
      continue;
    }
    const work = text.match(/^\{\{work (\w+)\}\}$/);
    if (work) {
      if (!storyWorks.has(work[1]))
        throw new Error(
          `No story work ${work[1]} in curation/story/works.json`,
        );
      blocks.push({ type: 'work', inkId: work[1] });
      continue;
    }
    const heading = text.match(/^(#{2,3}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = heading[2]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (text.startsWith('> ')) {
      const quote = text
        .split('\n')
        .map((line) => line.replace(/^> ?/, ''))
        .join('\n');
      const [body, cite] = quote.split(/\n— /);
      push(
        `<blockquote><p>${inline(body).replaceAll('\n', '<br />')}</p>${
          cite ? `<footer>${inline(cite)}</footer>` : ''
        }</blockquote>`,
      );
      continue;
    }
    if (text.startsWith('- ')) {
      const items = text
        .split('\n')
        .map((line) => `<li>${inline(line.replace(/^- /, ''))}</li>`);
      push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    push(`<p>${inline(text).replaceAll('\n', ' ')}</p>`);
  }
  return blocks;
}

/** The page's text as plain Markdown-free paragraphs, for llms-full.txt and tests. */
export function plainText(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk && !chunk.startsWith('{{'))
    .map((chunk) =>
      chunk
        .replace(/^#{2,3} /, '')
        .replace(/^> ?/gm, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*?([^*]+)\*\*?/g, '$1')
        .replaceAll('\n', ' '),
    );
}

export type TimelineMonth = (typeof timeline.months)[number];
export const timeline2022 = timeline;
export const monthFacts = new Map(timeline.months.map((m) => [m.month, m]));

// Per-work facts for the artwork pages: how the work reached the collector
// and the artist's own post about it.
export interface WorkFacts {
  title: string;
  collected?: {
    on: string;
    kind: string;
    wallet: string | null;
    paidXDai: number | null;
    how: string;
  };
  post?: {
    id: string;
    url: string;
    postedAt: string;
    text: string;
    printed: string;
    remark: string;
    priceXDai: number | null;
    laterPosts: string[];
  };
}
export const workFacts = new Map<string, WorkFacts>(
  Object.entries(factsFile.works as Record<string, WorkFacts>),
);
