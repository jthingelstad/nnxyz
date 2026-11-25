import { build, createServer } from 'vite';
import { packDrawings } from './drawing-pack.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const visit = path.join(root, 'src/visit');
const output = path.join(root, '.build/virtual-visit');
const cache = path.join(output, 'textures');
await mkdir(cache, { recursive: true });
const json = async (file) =>
  JSON.parse(await readFile(path.join(root, file), 'utf8'));
const { productionUrl } = await json('infra/deployment.json');
const { objects } = await json('data/media.json');
const config = {
  root,
  configFile: false,
  envDir: false,
  publicDir: false,
  logLevel: 'error',
};
const vite = await createServer({
  ...config,
  server: { middlewareMode: true, ws: false },
});
let floors;
try {
  ({ museum: floors } = await vite.ssrLoadModule('/src/visit/catalog.ts'));
} finally {
  await vite.close();
}

const works = floors.flatMap((f) =>
  f.rooms.flatMap((r) => [...r.works, ...r.related]),
);
const paths = [...new Set(works.map((w) => w.image))];
const pictures = {};
let next = 0;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function collect() {
  while (next < paths.length) {
    const key = paths[next++];
    const expected = objects[key.slice(1)];
    if (!expected) throw Error('Unpublished image ' + key);
    const file = path.join(cache, expected + '.webp');
    let bytes = await readFile(file).catch(() => null);
    if (!bytes || digest(bytes) !== expected) {
      const reply = await fetch(new URL(key, productionUrl), {
        signal: AbortSignal.timeout(45000),
      });
      if (!reply.ok) throw Error(key + ' HTTP ' + reply.status);
      bytes = Buffer.from(await reply.arrayBuffer());
      if (digest(bytes) !== expected)
        throw Error('Image hash mismatch for ' + key);
      await writeFile(file, bytes);
    }
    pictures[key] = 'data:image/webp;base64,' + bytes.toString('base64');
  }
}
await Promise.all(Array.from({ length: 8 }, collect));
console.log(paths.length + ' distinct artwork images verified');
await packDrawings(works, objects, productionUrl, output);
const bundle = await build({
  ...config,
  build: {
    write: false,
    target: 'es2022',
    lib: {
      entry: path.join(visit, 'visit.js'),
      name: 'Visit',
      formats: ['iife'],
    },
  },
});
const js = bundle[0].output.find((part) => part.type === 'chunk').code;
const html = await readFile(path.join(here, 'visit.html'), 'utf8');
const shell = await readFile(path.join(visit, 'shell.html'), 'utf8');
const css = await readFile(path.join(visit, 'visit.css'), 'utf8');
const data = JSON.stringify({
  floors,
  pictures,
  deliveryUrl: productionUrl,
  productionUrl,
}).replaceAll('<', String.fromCharCode(92) + 'u003c');
const target = path.join(output, 'The nnxyz Rooms.html');
await writeFile(
  target,
  html
    .replace('<!-- VISIT_SHELL -->', () => shell)
    .replace('/* VISIT_STYLE */', () => css)
    .replace('/* MUSEUM_DATA */', () => data)
    .replace('/* VISIT_SCRIPT */', () =>
      js.replace(/<\/script/gi, '<\\/script'),
    ),
);
console.log(target);

// Direct offline entrances for comparing the three large-scale installations.
for (const [name, room] of [
  ['Coda', 'rawblocks--rb-coda'],
  ['Numbered Masks', 'nnxyz-other--ot-masks'],
  ['Black Silhouettes', 'nnotb--p1--silhouettes'],
]) {
  const href = 'The%20nnxyz%20Rooms.html#room=' + room;
  await writeFile(
    path.join(output, name + '.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${name} · The nnxyz Rooms</title><meta http-equiv="refresh" content="0;url=${href}"><a href="${href}">Enter ${name}</a></html>`,
  );
}
