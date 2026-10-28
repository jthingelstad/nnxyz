import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
export const mime = {
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  // The search index (Pagefind, under pagefind/). These files are gzipped by
  // Pagefind itself and read as bytes, so they are stored as they are.
  '.pagefind': 'application/octet-stream',
  '.pf_meta': 'application/octet-stream',
  '.pf_index': 'application/octet-stream',
  '.pf_fragment': 'application/octet-stream',
  '.pf_filter': 'application/octet-stream',
};
// Pagefind names its index files by content hash; its wasm, scripts and entry
// file keep fixed names.
const hashedIndex = ['.pf_meta', '.pf_index', '.pf_fragment', '.pf_filter'];
// Published media: generated once, uploaded once by tools/media.mjs, and only
// referenced by the site. Site deploys never write these keys.
export const mediaPrefixes = [
  'art/',
  'png/',
  'raster/',
  'records/',
  'abstract/images/',
  'abstract/originals/',
  'abstract/records/',
  'audio/',
  'onchain/images/',
  'onchain/animations/',
  'onchain/originals/',
  'onchain/records/',
];
export const isMediaKey = (key) =>
  mediaPrefixes.some((prefix) => key.startsWith(prefix));
export function publicationOrder(files) {
  return [...files].sort(
    (a, b) =>
      Number(a.endsWith('.html')) - Number(b.endsWith('.html')) ||
      a.localeCompare(b),
  );
}
// Media keys are write-once, so they and Astro's hashed bundles never change.
export const immutable = 'public,max-age=31536000,immutable';
function cacheControl(key, extension) {
  if (key.startsWith('_astro/') || isMediaKey(key)) return immutable;
  if (key.startsWith('pagefind/') && hashedIndex.includes(extension))
    return immutable;
  if (
    ['.html', '.txt', '.xml'].includes(extension) ||
    key === 'revision.json' ||
    key === 'pagefind/pagefind-entry.json'
  )
    return 'public,max-age=0,s-maxage=60,must-revalidate';
  return 'public,max-age=3600';
}
export function prepareObject(key, bytes) {
  if (
    key.startsWith('/') ||
    key.split('/').includes('..') ||
    key.includes('\\')
  )
    throw new Error('Unsafe public asset key');
  const extension = path.extname(key);
  const type = mime[extension];
  if (!type) throw new Error(`Unexpected public asset type: ${key}`);
  // Pages are stored as they are; CloudFront compresses them per request
  // (gzip or brotli, by Accept-Encoding) and sends identity to clients that
  // ask for no encoding. Only write-once media SVG and JSON stay gzip-stored:
  // the largest native SVGs exceed the 10 MB CloudFront compresses, and
  // published media keys are never rewritten.
  const compressed = isMediaKey(key) && ['.svg', '.json'].includes(extension);
  const body = compressed ? gzipSync(bytes, { level: 9 }) : bytes;
  if (compressed && !gunzipSync(body).equals(bytes))
    throw new Error('Compression changed source bytes');
  return {
    Body: body,
    ContentType: type,
    ...(compressed ? { ContentEncoding: 'gzip' } : {}),
    CacheControl: cacheControl(key, extension),
    Metadata: { sha256: createHash('sha256').update(bytes).digest('hex') },
  };
}
