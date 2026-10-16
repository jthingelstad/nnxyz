// Derive the After Nifty Ink media from the fetched originals: WebP stills at
// three widths, an animated WebP for each GIF, the original file and a record
// JSON, into media/onchain/. Sources are the ignored collection/recovered-onchain/
// and collection/recovered-tezos/ trees (tools/fetch-onchain-sources.py).
// Every original is hash-checked against data/onchain.json before use.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
// The largest animation is 3243 x 4740 over 101 frames; lift sharp's default
// pixel limit for it.
const open = (input, options = {}) => sharp(input, { limitInputPixels: false, ...options });
const catalog = JSON.parse(await fs.readFile('data/onchain.json', 'utf8'));
const output = 'media/onchain';
for (const dir of ['images', 'originals', 'records', 'animations'])
  await fs.mkdir(`${output}/${dir}`, { recursive: true });
const recipe = {
  version: 1,
  widths: [640, 1200, 2000],
  quality: 85,
  effort: 6,
  animationWidth: 1200,
  sharp: sharp.versions.sharp,
};
const extension = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
};
const records = [];
for (const work of catalog.artworks) {
  const original = await fs.readFile(work.sourcePath);
  if (
    hash(original) !== work.imageSHA256 ||
    original.length !== work.imageBytes
  )
    throw new Error(`Original differs from the catalog: ${work.name}`);
  // The still: the first frame of a GIF, the extracted frame of a video,
  // the image itself otherwise.
  let still = original;
  if (work.stillPath) {
    still = await fs.readFile(work.stillPath);
    if (hash(still) !== work.stillSHA256)
      throw new Error(`Video still differs from the catalog: ${work.name}`);
  }
  const derivatives = [];
  for (const width of recipe.widths) {
    const bytes = await open(still, { page: 0 })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: recipe.quality, effort: recipe.effort })
      .toBuffer();
    const key = `onchain/images/${work.id}-${width}.webp`;
    await fs.writeFile(`media/${key}`, bytes);
    derivatives.push({ key, width, sha256: hash(bytes), bytes: bytes.length });
  }
  let animation = null;
  if (work.animated && work.imageMimeType === 'image/gif') {
    const bytes = await open(original, { animated: true })
      .resize({ width: recipe.animationWidth, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
    const key = `onchain/animations/${work.id}.webp`;
    await fs.writeFile(`media/${key}`, bytes);
    animation = { key, sha256: hash(bytes), bytes: bytes.length };
  }
  const originalKey = `onchain/originals/${work.id}.${extension[work.imageMimeType]}`;
  await fs.writeFile(`media/${originalKey}`, original);
  const recordKey = `onchain/records/${work.id}.json`;
  await fs.writeFile(
    `media/${recordKey}`,
    JSON.stringify(
      { ...work, builtAt: catalog.builtAt, method: catalog.method },
      null,
      2,
    ) + '\n',
  );
  records.push({
    id: work.id,
    sourceSHA256: work.imageSHA256,
    originalKey,
    recordKey,
    images: derivatives,
    animation,
  });
}
await fs.writeFile(
  `${output}/asset-manifest.json`,
  JSON.stringify({ recipe, artworks: records }, null, 2) + '\n',
);
console.log(
  `Derived stills, animations, originals and records for ${records.length} After Nifty Ink works`,
);
