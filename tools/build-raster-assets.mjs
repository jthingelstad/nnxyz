import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Browsing images and loading posters for Nifty Ink drawings. Chromium renders
// each native SVG on its white canvas at the largest width (enough for a 560 px
// gallery image at 3x and the 900 px artwork poster at 2x); smaller widths are
// downscaled from it. The archived PNGs (about 790 px) are too small for retina
// displays.
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gallery = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
const output = 'media/raster';
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
  await fs.readFile('media/asset-manifest.json', 'utf8'),
);
const svgHashes = new Map(
  svgManifest.artworks.map((entry) => [entry.id, entry.svgSHA256]),
);
const widths = [320, 640, 1200, 1600, 2000]; // src/lib/catalog.ts uses the same list
const target = (work, width) => `${output}/${work.inkId}-${width}.webp`;

const { chromium } = await import('playwright');
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const recipe = {
  version: 3,
  renderer: `chromium ${browser.version()}`,
  widths,
  quality: 85,
  effort: 6,
  sharp: sharp.versions.sharp,
};
const recipeSHA256 = hash(JSON.stringify(recipe));
const master = Math.max(...widths);

async function render(page, work) {
  const svg = await fs.readFile(`media/art/${work.inkId}.svg`, 'utf8');
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

// The render is checked against the archived PNG at the archive's resolution.
// Each pixel is matched with its closest neighbour within 1 px in the other
// image, both ways, so the archive renderer's 1 px offsets are ignored while
// missing or extra marks are not. Over 16 px tiles, real works peak at 40
// (the SVGs are reconstructions of the brush strokes, not pixel copies), while
// dropping a drawing's round dots or its last 5% of strokes scores 72 to 150.
const tile = 16;
const limits = { mean: 14, worstTile: 48 };
const nearest = (from, to, width, height, x, y) => {
  const i = (y * width + x) * 3;
  let best = Infinity;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = (ny * width + nx) * 3;
      best = Math.min(
        best,
        Math.abs(from[i] - to[j]) +
          Math.abs(from[i + 1] - to[j + 1]) +
          Math.abs(from[i + 2] - to[j + 2]),
      );
    }
  return best / 3;
};
async function compareWithArchive(work, rendered) {
  const archived = sharp(work.imagePath)
    .flatten({ background: '#fff' })
    .removeAlpha();
  const { width, height } = await archived.metadata();
  const [a, b] = await Promise.all([
    archived.raw().toBuffer(),
    sharp(rendered)
      .resize(width, height)
      .flatten({ background: '#fff' })
      .removeAlpha()
      .raw()
      .toBuffer(),
  ]);
  // The last row and column of tiles absorb the remainder, so a sliver of a
  // few edge pixels is never judged alone.
  const end = (start, size) => (start + 2 * tile > size ? size : start + tile);
  let sum = 0;
  let worstTile = 0;
  for (let ty = 0; ty < height; ty = end(ty, height))
    for (let tx = 0; tx < width; tx = end(tx, width)) {
      let tileSum = 0;
      let count = 0;
      for (let y = ty; y < end(ty, height); y++)
        for (let x = tx; x < end(tx, width); x++) {
          const difference = Math.max(
            nearest(a, b, width, height, x, y),
            nearest(b, a, width, height, x, y),
          );
          tileSum += difference;
          count++;
        }
      sum += tileSum;
      worstTile = Math.max(worstTile, tileSum / count);
    }
  return { mean: sum / (width * height), worstTile };
}

const records = new Map();
let total = 0;
let worst = { worstTile: 0 };
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
      if (
        difference.mean > limits.mean ||
        difference.worstTile > limits.worstTile
      )
        throw new Error(
          `Rendered ${work.inkId} differs from its archived PNG: mean ${difference.mean.toFixed(2)}, worst tile ${difference.worstTile.toFixed(2)} (limits ${limits.mean}, ${limits.worstTile})`,
        );
      if (difference.worstTile > worst.worstTile)
        worst = { id: work.inkId, ...difference };
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
        archiveDifference: {
          mean: Number(difference.mean.toFixed(3)),
          worstTile: Number(difference.worstTile.toFixed(3)),
        },
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
  `Rendered WebPs for ${records.size} Nifty Ink drawings: ${(total / 1024 ** 2).toFixed(1)} MiB; worst archive tile ${worst.worstTile.toFixed(2)} (${worst.id ?? 'none rendered'})`,
);
