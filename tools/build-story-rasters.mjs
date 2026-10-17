import fs from 'node:fs/promises';
import sharp from 'sharp';

// WebPs for the drawings on the story pages (curation/story/works.json), at
// the gallery's widths and keys, from the native SVGs that
// tools/build-story-media.py wrote. Rendered the way
// tools/build-raster-assets.mjs renders the gallery: Chromium on white at the
// largest width, smaller widths downscaled. A render that strays from the
// archived PNG, overall or in any one tile, fails.
const { works } = JSON.parse(
  await fs.readFile('curation/story/works.json', 'utf8'),
);
const { rasterWidths } = JSON.parse(
  await fs.readFile('data/media.json', 'utf8'),
);
const master = Math.max(...rasterWidths);
const archive = '../nifty-ink-archive';
await fs.mkdir('media/raster', { recursive: true });

// The gallery's comparison (tools/build-raster-assets.mjs), with its limits:
// each pixel against its closest neighbour within 1 px in the other image,
// both ways, averaged overall and over 16 px tiles, so a small region of
// missing or extra marks fails even when the whole-image mean is low.
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
  const archived = sharp(`${archive}/${work.archive.directory}/image.png`)
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
  const end = (start, size) => (start + 2 * tile > size ? size : start + tile);
  let sum = 0;
  let worstTile = 0;
  for (let ty = 0; ty < height; ty = end(ty, height))
    for (let tx = 0; tx < width; tx = end(tx, width)) {
      let tileSum = 0;
      let count = 0;
      for (let y = ty; y < end(ty, height); y++)
        for (let x = tx; x < end(tx, width); x++) {
          tileSum += Math.max(
            nearest(a, b, width, height, x, y),
            nearest(b, a, width, height, x, y),
          );
          count++;
        }
      sum += tileSum;
      worstTile = Math.max(worstTile, tileSum / count);
    }
  return { mean: sum / (width * height), worstTile };
}

const { chromium } = await import('playwright');
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const page = await browser.newPage({
  viewport: { width: master, height: master },
  deviceScaleFactor: 1,
});
for (const work of works) {
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
  const png = await page.screenshot({
    type: 'png',
    clip: { x: 0, y: 0, width: master, height: master },
  });
  const score = await compareWithArchive(work, png);
  if (score.mean > limits.mean || score.worstTile > limits.worstTile)
    throw new Error(
      `${work.name} strays from the archived PNG: ${JSON.stringify(score)}`,
    );
  for (const width of rasterWidths)
    await sharp(png)
      .resize(width, width)
      .webp({ quality: 85, effort: 6 })
      .toFile(`media/raster/${work.inkId}-${width}.webp`);
  console.log(
    `${work.name}: ${rasterWidths.length} WebPs, mean ${score.mean.toFixed(1)}, worst tile ${score.worstTile.toFixed(1)}`,
  );
}
await browser.close();
