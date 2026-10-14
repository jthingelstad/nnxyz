import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
await fs.mkdir('.build', { recursive: true });
const client = new S3Client({ region: 'us-east-1' });
for (const [config, bundle, destination] of [
  ['infra/dataset.json', '.build/collection.tar.gz', 'collection'],
  [
    'infra/abstract-dataset.json',
    '.build/abstract-collection.tar.gz',
    'collection',
  ],
  ['infra/derived-dataset.json', '.build/derived-assets.tar.gz', 'public'],
]) {
  const dataset = JSON.parse(await fs.readFile(config, 'utf8'));
  const { Body } = await client.send(
    new GetObjectCommand({ Bucket: dataset.bucket, Key: dataset.key }),
  );
  try {
    await pipeline(Body, createWriteStream(bundle));
  } finally {
    Body.destroy();
  }
  execFileSync(
    'python3',
    [
      'tools/restore-collection.py',
      bundle,
      '--config',
      config,
      '--destination-root',
      destination,
    ],
    { stdio: 'inherit' },
  );
}
console.log(
  'Source collection and pinned derivatives ready; original archive unchanged.',
);
