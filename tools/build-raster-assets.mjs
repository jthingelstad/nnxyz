import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Browsing images and loading posters for Nifty Ink drawings, downscaled from
// the archived PNGs. Artwork pages still draw the native SVG over the poster.
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gallery = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
const output = 'public/raster';
const requirePrebuilt = process.argv.includes('--require-prebuilt');
await fs.mkdir(output, { recursive: true });
let previous;
try {
  previous = JSON.parse(
    await fs.readFile(`${output}/asset-manifest.json`, 'utf8'),
  );
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const recipe = {
  version: 1,
  // Narrower widths are made only when the PNG is wider; the full-width copy is
  // always made. src/lib/catalog.ts applies the same rule.
  widths: [320, 640],
  quality: 85,
  effort: 6,
  sharp: sharp.versions.sharp,
};
const recipeSHA256 = hash(JSON.stringify(recipe));
const records = [];
let total = 0;
for (const work of gallery) {
  const source = await fs.readFile(work.imagePath);
  const sourceSHA256 = hash(source);
  const { width, height, format } = await sharp(source).metadata();
  if (format !== 'png' || width !== height || Math.abs(width - work.width) > 1)
    throw new Error(`Archived PNG differs from its canvas: ${work.inkId}`);
  const old = previous?.artworks.find((entry) => entry.id === work.inkId);
  const derivatives = [];
  for (const size of [...recipe.widths.filter((w) => w < width), width]) {
    const filename =
      size === width ? `${work.inkId}.webp` : `${work.inkId}-${size}.webp`;
    const target = `${output}/${filename}`;
    const oldImage = old?.images.find((entry) => entry.width === size);
    let bytes;
    try {
      bytes = await fs.readFile(target);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (
      !bytes ||
      previous?.recipeSHA256 !== recipeSHA256 ||
      old?.sourceSHA256 !== sourceSHA256 ||
      hash(bytes) !== oldImage?.sha256
    ) {
      if (requirePrebuilt)
        throw new Error(
          `Missing or changed prebuilt WebP: ${filename}; regenerate the derived snapshot`,
        );
      bytes = await sharp(source)
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: recipe.quality, effort: recipe.effort })
        .toBuffer();
      await fs.writeFile(target, bytes);
    }
    total += bytes.length;
    derivatives.push({
      path: `/raster/${filename}`,
      width: size,
      sha256: hash(bytes),
      bytes: bytes.length,
    });
  }
  records.push({ id: work.inkId, sourceSHA256, images: derivatives });
}
await fs.writeFile(
  `${output}/asset-manifest.json`,
  JSON.stringify({ recipe, recipeSHA256, artworks: records }, null, 2) + '\n',
);
console.log(
  `Derived WebPs for ${records.length} Nifty Ink drawings: ${(total / 1024 ** 2).toFixed(1)} MiB`,
);
