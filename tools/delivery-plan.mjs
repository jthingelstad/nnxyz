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
};
export function publicationOrder(files) {
  return [...files].sort(
    (a, b) =>
      Number(a.endsWith('.html')) - Number(b.endsWith('.html')) ||
      a.localeCompare(b),
  );
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
  const compressed = ['.svg', '.html', '.json', '.css', '.js'].includes(
    extension,
  );
  const body = compressed ? gzipSync(bytes, { level: 9 }) : bytes;
  if (compressed && !gunzipSync(body).equals(bytes))
    throw new Error('Compression changed source bytes');
  return {
    Body: body,
    ContentType: type,
    ...(compressed ? { ContentEncoding: 'gzip' } : {}),
    CacheControl: key.startsWith('_astro/')
      ? 'public,max-age=31536000,immutable'
      : key.endsWith('.html') || key === 'revision.json'
        ? 'public,max-age=0,s-maxage=60,must-revalidate'
        : 'public,max-age=3600',
    Metadata: { sha256: createHash('sha256').update(bytes).digest('hex') },
  };
}
