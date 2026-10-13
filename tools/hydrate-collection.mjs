import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { execFileSync } from 'node:child_process';
const dataset = JSON.parse(await fs.readFile('infra/dataset.json', 'utf8'));
await fs.mkdir('.build', { recursive: true });
const bundle = '.build/collection.tar.gz';
const client = new S3Client({ region: 'us-east-1' });
const { Body } = await client.send(
  new GetObjectCommand({ Bucket: dataset.bucket, Key: dataset.key }),
);
try {
  await pipeline(Body, createWriteStream(bundle));
} finally {
  Body.destroy();
}
execFileSync('python3', ['tools/restore-collection.py', bundle], {
  stdio: 'inherit',
});
console.log('Source collection ready; original archive unchanged.');
