// The sitemap's <lastmod> (astro.config.mjs). The Rooms are a finished
// archive: the artwork pages, rooms, wings and story are drawn from data/ and
// curation/, so a page last changed when they last did, and that commit's date
// is its lastmod. A page added later (search, 2026-10-23) changed when its own
// file was added. Template and style changes are not content changes and do
// not move it, and neither does the build: search engines ignore a lastmod
// that is always "now". A shallow clone would give the date of its one commit,
// so it is refused; CI checks out the full history (fetch-depth: 0).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const contentPaths = ['data', 'curation'];

export function pageDates(site, cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  if (git('rev-parse', '--is-shallow-repository') === 'true')
    throw new Error(
      'The sitemap dates pages by their git history; fetch the full history (fetch-depth: 0).',
    );
  const content = git('log', '-1', '--format=%cI', '--', ...contentPaths);
  if (!content) throw new Error('No commit touches data/ or curation/');
  const added = (file) =>
    git('log', '--diff-filter=A', '--format=%cI', '--', file)
      .split('\n')
      .at(-1);
  const newer = (a, b) => (b && Date.parse(b) > Date.parse(a) ? b : a);
  // A page with a file of its own (src/pages/search.astro), not a template.
  return (url) => {
    const path = new URL(url, site).pathname.replace(/^\/|\/$/g, '');
    const own = [
      `src/pages/${path || 'index'}.astro`,
      `src/pages/${path}/index.astro`,
    ]
      .filter((file) => existsSync(new URL(file, `file://${cwd}/`)))
      .map(added);
    return new Date(own.reduce(newer, content));
  };
}
