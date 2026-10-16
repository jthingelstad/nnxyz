import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
// node tools/hydrate-collection.mjs [name ...] restores only the named
// datasets (collection, abstract, onchain); with no names, all of them.
const only = process.argv.slice(2);
await fs.mkdir('.build', { recursive: true });
const client = new S3Client({ region: 'us-east-1' });
for (const [name, config, bundle, restore] of [
  [
    'collection',
    'infra/dataset.json',
    '.build/collection.tar.gz',
    ['tools/restore-collection.py'],
  ],
  [
    'abstract',
    'infra/abstract-dataset.json',
    '.build/abstract-collection.tar.gz',
    ['tools/restore-collection.py'],
  ],
  [
    'onchain',
    'infra/onchain-dataset.json',
    '.build/onchain-collection.tar.gz',
    ['tools/restore-onchain.py'],
  ],
]) {
  if (only.length && !only.includes(name)) continue;
  const dataset = JSON.parse(await fs.readFile(config, 'utf8'));
  const { Body } = await client.send(
    new GetObjectCommand({ Bucket: dataset.bucket, Key: dataset.key }),
  );
  try {
    await pipeline(Body, createWriteStream(bundle));
  } finally {
    Body.destroy();
  }
  // restore-onchain.py reads its own config and checks the recovered trees.
  const args =
    name === 'onchain'
      ? [...restore, bundle]
      : [
          ...restore,
          bundle,
          '--config',
          config,
          '--destination-root',
          'collection',
        ];
  execFileSync('python3', args, { stdio: 'inherit' });
}
console.log('Source collection ready; original archive unchanged.');
