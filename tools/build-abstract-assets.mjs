import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const catalog = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
const output = 'public/abstract';
const requirePrebuilt = process.argv.includes('--require-prebuilt');
await fs.mkdir(`${output}/images`, { recursive: true });
await fs.mkdir(`${output}/originals`, { recursive: true });
await fs.mkdir(`${output}/records`, { recursive: true });
let previous;
try {
  previous = JSON.parse(
    await fs.readFile(`${output}/asset-manifest.json`, 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const recipe = {
  version: 2,
  widths: [640, 1200, 2000],
  quality: 90,
  nearLossless: true,
  sharp: sharp.versions.sharp,
};
const recipeSHA256 = hash(JSON.stringify(recipe));
const records = [];
for (const work of catalog.artworks) {
  const original = await fs.readFile(work.imagePath);
  if (
    hash(original) !== work.imageSHA256 ||
    original.length !== work.imageBytes
  )
    throw new Error(`Original JPEG differs: ${work.name}`);
  const metadata = await sharp(original).metadata();
  if (
    metadata.format !== 'jpeg' ||
    metadata.width !== work.width ||
    metadata.height !== work.height
  )
    throw new Error(`Original dimensions differ: ${work.name}`);
  const derivatives = [];
  for (const width of recipe.widths) {
    const filename = `${work.id}-${width}.webp`;
    const target = `${output}/images/${filename}`;
    const old = previous?.artworks.find((entry) => entry.id === work.id);
    const oldImage = old?.images.find((entry) => entry.width === width);
    let bytes;
    try {
      bytes = await fs.readFile(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (
      !bytes ||
      previous?.recipeSHA256 !== recipeSHA256 ||
      old?.sourceSHA256 !== work.imageSHA256 ||
      hash(bytes) !== oldImage?.sha256
    ) {
      if (requirePrebuilt)
        throw new Error(
          `Missing or changed prebuilt WebP: ${filename}; regenerate the derived snapshot`,
        );
      bytes = await sharp(original)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: recipe.quality, nearLossless: recipe.nearLossless })
        .toBuffer();
      await fs.writeFile(target, bytes);
    }
    derivatives.push({
      path: `/abstract/images/${filename}`,
      width,
      sha256: hash(bytes),
      bytes: bytes.length,
    });
  }
  const originalTarget = `${output}/originals/${work.id}.jpg`;
  try {
    if (hash(await fs.readFile(originalTarget)) !== work.imageSHA256)
      await fs.copyFile(work.imagePath, originalTarget);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.copyFile(work.imagePath, originalTarget);
  }
  await fs.writeFile(
    `${output}/records/${work.id}.json`,
    JSON.stringify(
      {
        ...work,
        sourceAttribution: catalog.sourceAttribution,
        recoveredAt: catalog.recoveredAt,
      },
      null,
      2,
    ) + '\n',
  );
  records.push({
    id: work.id,
    sourceSHA256: work.imageSHA256,
    originalPath: `/abstract/originals/${path.basename(originalTarget)}`,
    images: derivatives,
  });
}
await fs.writeFile(
  `${output}/asset-manifest.json`,
  JSON.stringify({ recipe, recipeSHA256, artworks: records }, null, 2) + '\n',
);
console.log(
  `Derived responsive images and preserved original JPEGs for ${records.length} Abstract works`,
);
