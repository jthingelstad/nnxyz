import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Browsing images and loading posters for Nifty Ink drawings. Chromium renders
// each native SVG on its white canvas at the largest width (sharp enough for a
// 560 px gallery image on a 3x display); smaller widths are downscaled from it.
// The archived PNGs (about 790 px) are too small for retina displays.
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
const svgManifest = JSON.parse(
  await fs.readFile('public/asset-manifest.json', 'utf8'),
);
const svgHashes = new Map(
  svgManifest.artworks.map((entry) => [entry.id, entry.svgSHA256]),
);
const widths = [320, 640, 1200, 1600]; // src/lib/catalog.ts uses the same list
const target = (work, width) => `${output}/${work.inkId}-${width}.webp`;

// Routine builds only confirm the pinned files; they never launch a browser.
if (requirePrebuilt) {
  for (const work of gallery) {
    const old = previous?.artworks.find((entry) => entry.id === work.inkId);
    if (old?.svgSHA256 !== svgHashes.get(work.inkId))
      throw new Error(
        `Raster images are stale for ${work.inkId}; regenerate the derived snapshot`,
      );
    for (const width of widths) {
      const image = old.images.find((entry) => entry.width === width);
      let bytes;
      try {
        bytes = await fs.readFile(target(work, width));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (!bytes || hash(bytes) !== image?.sha256)
        throw new Error(
          `Missing or changed prebuilt WebP: ${target(work, width)}; regenerate the derived snapshot`,
        );
    }
  }
  console.log(`Verified WebPs for ${gallery.length} Nifty Ink drawings`);
  process.exit(0);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const recipe = {
  version: 2,
  renderer: `chromium ${browser.version()}`,
  widths,
  quality: 85,
  effort: 6,
  sharp: sharp.versions.sharp,
};
const recipeSHA256 = hash(JSON.stringify(recipe));
const master = Math.max(...widths);

async function render(page, work) {
  const svg = await fs.readFile(`public/art/${work.inkId}.svg`, 'utf8');
  await page.setContent(
    `<style>html,body{margin:0;background:#fff}img{display:block;width:${master}px;height:${master}px}</style><img alt="">`,
  );
  await page.evaluate(async (source) => {
    const image = document.querySelector('img');
    image.src = URL.createObjectURL(
      new Blob([source], { type: 'image/svg+xml' }),
    );
    await image.decode();
  }, svg);
  return page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: master, height: master },
  });
}

// A broken render (missing strokes, wrong scale) shows up as a large mean
// difference from the archived PNG at 128 px, where fine antialiasing on dense
// drawings averages out.
const small = (input) =>
  sharp(input)
    .flatten({ background: '#fff' })
    .resize(128, 128)
    .removeAlpha()
    .raw()
    .toBuffer();
async function compareWithArchive(work, rendered) {
  const [archived, ours] = await Promise.all([
    small(work.imagePath),
    small(rendered),
  ]);
  let sum = 0;
  for (let i = 0; i < ours.length; i++) sum += Math.abs(ours[i] - archived[i]);
  return sum / ours.length;
}

const records = new Map();
let total = 0;
let worst = { difference: 0 };
const queue = [...gallery];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    const page = await browser.newPage({
      viewport: { width: master, height: master },
      deviceScaleFactor: 1,
    });
    for (let work = queue.shift(); work; work = queue.shift()) {
      const svgSHA256 = svgHashes.get(work.inkId);
      const old = previous?.artworks.find((entry) => entry.id === work.inkId);
      const current = await Promise.all(
        widths.map((width) =>
          fs.readFile(target(work, width)).catch((error) => {
            if (error.code === 'ENOENT') return undefined;
            throw error;
          }),
        ),
      );
      if (
        previous?.recipeSHA256 === recipeSHA256 &&
        old?.svgSHA256 === svgSHA256 &&
        current.every(
          (bytes, index) => bytes && hash(bytes) === old.images[index]?.sha256,
        )
      ) {
        records.set(work.inkId, old);
        total += current.reduce((sum, bytes) => sum + bytes.length, 0);
        continue;
      }
      const rendered = await render(page, work);
      const difference = await compareWithArchive(work, rendered);
      if (difference > 8)
        throw new Error(
          `Rendered ${work.inkId} differs from its archived PNG: mean channel difference ${difference.toFixed(2)}`,
        );
      if (difference > worst.difference) worst = { id: work.inkId, difference };
      const images = [];
      for (const width of widths) {
        const bytes = await sharp(rendered)
          .resize(width)
          .webp({ quality: recipe.quality, effort: recipe.effort })
          .toBuffer();
        await fs.writeFile(target(work, width), bytes);
        total += bytes.length;
        images.push({
          path: `/raster/${work.inkId}-${width}.webp`,
          width,
          sha256: hash(bytes),
          bytes: bytes.length,
        });
      }
      records.set(work.inkId, {
        id: work.inkId,
        svgSHA256,
        archiveMeanDifference: Number(difference.toFixed(3)),
        images,
      });
    }
    await page.close();
  }),
);
await browser.close();
await fs.writeFile(
  `${output}/asset-manifest.json`,
  JSON.stringify(
    {
      recipe,
      recipeSHA256,
      artworks: gallery.map((work) => records.get(work.inkId)),
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Rendered WebPs for ${records.size} Nifty Ink drawings: ${(total / 1024 ** 2).toFixed(1)} MiB; largest archive difference ${worst.difference.toFixed(2)} (${worst.id ?? 'none rendered'})`,
);
