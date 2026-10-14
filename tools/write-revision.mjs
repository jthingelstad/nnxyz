import fs from 'node:fs/promises';
const commit = process.env.GITHUB_SHA || 'local';
const native = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
const abstract = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
await fs.writeFile(
  'dist/revision.json',
  JSON.stringify({
    commit,
    builtAt: new Date().toISOString(),
    artworks: native.length + abstract.artworks.length,
  }) + '\n',
);
