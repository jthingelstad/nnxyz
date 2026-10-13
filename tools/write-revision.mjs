import fs from 'node:fs/promises';
const commit = process.env.GITHUB_SHA || 'local';
await fs.writeFile(
  'dist/revision.json',
  JSON.stringify({ commit, builtAt: new Date().toISOString(), artworks: 574 }) +
    '\n',
);
