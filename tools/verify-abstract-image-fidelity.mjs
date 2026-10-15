import sharp from 'sharp';
import fs from 'node:fs/promises';

const data = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
const root = process.env.ABSTRACT_ASSET_ROOT || 'media/abstract';
const scores = [];
for (const work of data.artworks) {
  for (const width of [640, 1200, 2000]) {
    const expected = await sharp(work.imagePath)
      .resize({ width })
      .removeAlpha()
      .raw()
      .toBuffer();
    const actual = await sharp(`${root}/images/${work.id}-${width}.webp`)
      .removeAlpha()
      .raw()
      .toBuffer();
    if (expected.length !== actual.length)
      throw new Error(`Image dimensions differ: ${work.name}`);
    let sum = 0,
      largest = 0;
    for (let i = 0; i < actual.length; i++) {
      const error = Math.abs(expected[i] - actual[i]);
      sum += error;
      largest = Math.max(largest, error);
    }
    // Lossy web copies; the original JPEG download stays byte-exact. This
    // only confirms each WebP is the same picture at the same size.
    if (sum / actual.length > 12)
      throw new Error(
        `Web image differs from its original: ${work.name}, ${width}px, mean channel difference ${(sum / actual.length).toFixed(2)}`,
      );
    scores.push({
      title: work.name,
      width,
      meanAbsoluteChannelError: sum / actual.length,
      largestChannelError: largest,
    });
  }
}
const report = {
  method:
    'Compare decoded derived WebPs against original JPEGs resized to the same dimensions. Check every RGB channel on a 0–255 scale.',
  artworkCount: data.artworks.length,
  imageCount: scores.length,
  maxMeanAbsoluteChannelError: Math.max(
    ...scores.map((score) => score.meanAbsoluteChannelError),
  ),
  maxChannelError: Math.max(
    ...scores.map((score) => score.largestChannelError),
  ),
  scores,
};
await fs.mkdir('/tmp/nnxyz-gallery-qa', { recursive: true });
await fs.writeFile(
  '/tmp/nnxyz-gallery-qa/abstract-image-fidelity.json',
  JSON.stringify(report, null, 2),
);
console.log({
  artworkCount: report.artworkCount,
  imageCount: report.imageCount,
  maxMeanAbsoluteChannelError: report.maxMeanAbsoluteChannelError,
  maxChannelError: report.maxChannelError,
});
