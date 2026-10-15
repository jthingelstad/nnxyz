import test from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import {
  isMediaKey,
  prepareObject,
  publicationOrder,
} from '../tools/delivery-plan.mjs';
test('Compression preserves a large SVG byte for byte and labels it correctly', () => {
  const original = Buffer.from(
    '<svg>' + '<path d="M 1 2 L 3 4"/>'.repeat(500000) + '</svg>',
  );
  const result = prepareObject('art/example.svg', original);
  assert.ok(original.length > 10000000);
  assert.deepEqual(gunzipSync(result.Body), original);
  assert.equal(result.ContentEncoding, 'gzip');
  assert.equal(result.ContentType, 'image/svg+xml');
  assert.ok(result.Body.length < original.length / 100);
});
test('PNG files remain original bytes and hashed scripts get immutable caching', () => {
  const png = Buffer.from([137, 80, 78, 71]);
  assert.deepEqual(prepareObject('png/work.png', png).Body, png);
  assert.equal(prepareObject('png/work.png', png).ContentEncoding, undefined);
  assert.match(
    prepareObject('_astro/viewer.hash.js', Buffer.from('1')).CacheControl,
    /immutable/,
  );
  assert.match(
    prepareObject('artworks/work/index.html', Buffer.from('html')).CacheControl,
    /max-age=0/,
  );
});
test('Artwork and scripts publish before HTML, and unsafe paths are refused', () => {
  const plan = publicationOrder([
    'index.html',
    'art/a.svg',
    '_astro/a.js',
    'about/index.html',
  ]);
  assert.deepEqual(plan.slice(0, 2), ['_astro/a.js', 'art/a.svg']);
  for (const key of [
    '/secret.svg',
    '../secret.svg',
    'art/../secret.svg',
    'art\\secret.svg',
  ])
    assert.throws(() => prepareObject(key, Buffer.from('x')));
  assert.throws(() => prepareObject('private.env', Buffer.from('x')));
});
test('Abstract JPEG and WebP delivery preserves bytes and declares image types', () => {
  const bytes = Buffer.from([255, 216, 255, 224]);
  for (const [extension, type] of [
    ['jpg', 'image/jpeg'],
    ['webp', 'image/webp'],
  ]) {
    const result = prepareObject(`abstract/image.${extension}`, bytes);
    assert.equal(result.ContentType, type);
    assert.equal(result.ContentEncoding, undefined);
    assert.deepEqual(result.Body, bytes);
  }
});
test('robots.txt and sitemaps publish compressed with page caching', () => {
  for (const [key, type] of [
    ['robots.txt', 'text/plain; charset=utf-8'],
    ['sitemap-index.xml', 'application/xml; charset=utf-8'],
  ]) {
    const bytes = Buffer.from('Sitemap: https://nnxyz.thingelstad.xyz/');
    const result = prepareObject(key, bytes);
    assert.equal(result.ContentType, type);
    assert.equal(result.ContentEncoding, 'gzip');
    assert.deepEqual(gunzipSync(result.Body), bytes);
    assert.match(result.CacheControl, /max-age=0/);
  }
});
test('Write-once media is immutable and only media keys count as media', () => {
  const bytes = Buffer.from([1, 2, 3]);
  for (const key of [
    'art/work.svg',
    'png/work.png',
    'raster/work-320.webp',
    'records/work.metadata.json',
    'abstract/images/work-640.webp',
    'abstract/originals/work.jpg',
    'abstract/records/work.json',
  ]) {
    assert.ok(isMediaKey(key), key);
    assert.match(prepareObject(key, bytes).CacheControl, /immutable/);
  }
  for (const key of [
    'index.html',
    'artworks/work/index.html',
    'abstract/index.html',
    'favicon.svg',
  ])
    assert.ok(!isMediaKey(key), key);
  assert.equal(
    prepareObject('favicon.svg', bytes).CacheControl,
    'public,max-age=3600',
  );
});
