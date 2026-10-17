import fs from 'node:fs/promises';
import sharp from 'sharp';

// WebPs for the drawings on the story pages (curation/story/works.json), at
// the gallery's widths and keys, from the native SVGs that
// tools/build-story-media.py wrote. Rendered the way
// tools/build-raster-assets.mjs renders the gallery: Chromium on white at the
// largest width, smaller widths downscaled. A render that strays from the
// archived PNG fails.
const { works } = JSON.parse(
  await fs.readFile('curation/story/works.json', 'utf8'),
);
const { rasterWidths } = JSON.parse(
  await fs.readFile('data/media.json', 'utf8'),
);
const master = Math.max(...rasterWidths);
const archive = '../nifty-ink-archive';
await fs.mkdir('media/raster', { recursive: true });

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
  // Mean colour difference against the archived PNG at its own size.
  const archived = sharp(`${archive}/${work.archive.directory}/image.png`)
    .flatten({ background: '#fff' })
    .removeAlpha();
  const { width, height } = await archived.metadata();
  const [a, b] = await Promise.all([
    archived.raw().toBuffer(),
    sharp(png)
      .resize(width, height)
      .flatten({ background: '#fff' })
      .removeAlpha()
      .raw()
      .toBuffer(),
  ]);
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  const mean = sum / a.length;
  if (mean > 14)
    throw new Error(`${work.name} strays from the archived PNG: ${mean}`);
  for (const width of rasterWidths)
    await sharp(png)
      .resize(width, width)
      .webp({ quality: 85, effort: 6 })
      .toFile(`media/raster/${work.inkId}-${width}.webp`);
  console.log(
    `${work.name}: ${rasterWidths.length} WebPs, mean difference ${mean.toFixed(1)}`,
  );
}
await browser.close();
