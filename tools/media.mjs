// Published media: SVGs, PNGs, WebPs, originals and record downloads. They are
// generated once into media/ (npm run media:generate), uploaded once to the
// site bucket and afterwards only referenced by URL. Site builds and deploys
// never read or write them.
//
//   node tools/media.mjs publish   upload new files from media/ (write-once),
//                                  fix headers, then rewrite data/media.json
//   node tools/media.mjs snapshot  rewrite data/media.json from the bucket
//   node tools/media.mjs verify    read-only: bucket matches data/media.json
//
// Run locally with the cloud-engineer identity. An existing key is never
// replaced; a new rendering needs new key names.
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  paginateListObjectsV2,
} from '@aws-sdk/client-s3';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import fs from 'node:fs/promises';
import { immutable, isMediaKey, prepareObject } from './delivery-plan.mjs';

const command = process.argv[2];
if (!['publish', 'snapshot', 'verify'].includes(command))
  throw new Error('Usage: node tools/media.mjs publish|snapshot|verify');
const config = JSON.parse(await fs.readFile('infra/deployment.json', 'utf8'));
const settings = { region: config.region, maxAttempts: 5 };
const identity = await new STSClient(settings).send(
  new GetCallerIdentityCommand({}),
);
if (identity.Account !== config.account)
  throw new Error(`Unexpected AWS account ${identity.Account}`);
const s3 = new S3Client(settings);
const Bucket = config.siteBucket;
const manifestPath = 'data/media.json';
const current = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

// Every key the site references or offers for download.
const gallery = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
const abstract = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
const onchain = JSON.parse(await fs.readFile('data/onchain.json', 'utf8'));
const onchainExtension = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
};
// Audio tour segments: tools/build-audio-tour.mjs renders them and records
// each key in the manifest; a regenerated segment is a new key. Segments
// about the same work share one cover.
const audio = JSON.parse(
  await fs.readFile('curation/exhibitions/audio/manifest.json', 'utf8'),
);
const covers = new Set(audio.entries.map(({ coverKey }) => coverKey));
covers.delete(undefined);
const expected = [
  ...audio.entries.map(({ key }) => key),
  ...covers,
  ...gallery.flatMap(({ inkId }) => [
    `art/${inkId}.svg`,
    `art/display/${inkId}.svg`,
    `png/${inkId}.png`,
    `records/${inkId}.metadata.json`,
    `records/${inkId}.provenance.json`,
    ...current.rasterWidths.map((width) => `raster/${inkId}-${width}.webp`),
  ]),
  ...abstract.artworks.flatMap(({ id }) => [
    `abstract/originals/${id}.jpg`,
    `abstract/records/${id}.json`,
    ...current.abstractWidths.map(
      (width) => `abstract/images/${id}-${width}.webp`,
    ),
  ]),
  // After Nifty Ink: stills, the original file, a record, and an animated
  // WebP for each GIF (tools/build-onchain-assets.mjs).
  ...onchain.artworks.flatMap((work) => [
    `onchain/originals/${work.id}.${onchainExtension[work.imageMimeType]}`,
    `onchain/records/${work.id}.json`,
    ...(current.onchainWidths ?? [640, 1200, 2000]).map(
      (width) => `onchain/images/${work.id}-${width}.webp`,
    ),
    ...(work.animated && work.imageMimeType === 'image/gif'
      ? [`onchain/animations/${work.id}.webp`]
      : []),
  ]),
].sort();

async function inBatches(items, work) {
  let next = 0;
  await Promise.all(
    Array.from({ length: 16 }, async () => {
      while (next < items.length) await work(items[next++]);
    }),
  );
}
async function listMedia() {
  const keys = new Set();
  for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket }))
    for (const item of page.Contents || [])
      if (isMediaKey(item.Key)) keys.add(item.Key);
  return keys;
}
async function head(key) {
  try {
    return await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
  } catch (error) {
    if (error.name === 'NotFound') return undefined;
    throw error;
  }
}

if (command === 'publish') {
  const existing = await listMedia();
  let uploaded = 0;
  await inBatches(expected, async (key) => {
    if (existing.has(key)) return;
    let bytes;
    try {
      bytes = await fs.readFile(`media/${key}`);
    } catch (error) {
      if (error.code === 'ENOENT')
        throw new Error(`Missing from the bucket and media/: ${key}`, {
          cause: error,
        });
      throw error;
    }
    // IfNoneMatch makes S3 refuse the write if the key appeared meanwhile.
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        IfNoneMatch: '*',
        ...prepareObject(key, bytes),
      }),
    );
    uploaded++;
  });
  console.log(`Uploaded ${uploaded} new media objects`);
}

if (command === 'verify') {
  const problems = [];
  await inBatches(Object.keys(current.objects), async (key) => {
    const object = await head(key);
    if (!object) problems.push(`missing ${key}`);
    else if (object.Metadata?.sha256 !== current.objects[key])
      problems.push(`changed ${key}`);
    else if (object.CacheControl !== immutable)
      problems.push(`not immutable ${key}`);
  });
  const missing = expected.filter((key) => !(key in current.objects));
  for (const key of missing) problems.push(`not in ${manifestPath}: ${key}`);
  if (problems.length) throw new Error(problems.sort().slice(0, 20).join('\n'));
  console.log(
    `Verified ${Object.keys(current.objects).length} media objects against ${manifestPath}`,
  );
} else {
  // publish and snapshot: record what the bucket holds, fixing cache headers
  // in place (a server-side copy; no bytes leave S3).
  const objects = {};
  let fixed = 0;
  await inBatches(expected, async (key) => {
    const object = await head(key);
    if (!object) throw new Error(`Missing from the bucket: ${key}`);
    const sha256 = object.Metadata?.sha256;
    if (!/^[a-f0-9]{64}$/.test(sha256 || ''))
      throw new Error(`No sha256 metadata: ${key}`);
    if (current.objects[key] && current.objects[key] !== sha256)
      throw new Error(`Published media changed: ${key}`);
    objects[key] = sha256;
    if (object.CacheControl === immutable) return;
    await s3.send(
      new CopyObjectCommand({
        Bucket,
        Key: key,
        CopySource: `${Bucket}/${key}`,
        MetadataDirective: 'REPLACE',
        ContentType: object.ContentType,
        ...(object.ContentEncoding
          ? { ContentEncoding: object.ContentEncoding }
          : {}),
        CacheControl: immutable,
        Metadata: { sha256 },
      }),
    );
    fixed++;
  });
  for (const work of abstract.artworks)
    if (objects[`abstract/originals/${work.id}.jpg`] !== work.imageSHA256)
      throw new Error(`Published original differs: ${work.id}`);
  const unreferenced = [...(await listMedia())].filter(
    (key) => !(key in objects),
  );
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        ...current,
        objects: Object.fromEntries(
          Object.keys(objects)
            .sort()
            .map((key) => [key, objects[key]]),
        ),
      },
      null,
      1,
    ) + '\n',
  );
  console.log(
    `Recorded ${Object.keys(objects).length} media objects in ${manifestPath}; fixed headers on ${fixed}; ${unreferenced.length} unreferenced media keys in the bucket`,
  );
}
