// Whether the After Nifty Ink wing is on the site: every published key the
// wing needs is in data/media.json, or ONCHAIN_PREVIEW=1 (the same rule as
// src/lib/onchain.ts and tools/validate-site.py). The browser checks use it
// for the counts that change when the wing is present.
import fs from 'node:fs/promises';

const extension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

export async function onchainState() {
  const works = JSON.parse(
    await fs.readFile('data/onchain.json', 'utf8'),
  ).artworks;
  const { objects } = JSON.parse(await fs.readFile('data/media.json', 'utf8'));
  const keys = works.flatMap((work) => [
    `onchain/originals/${work.id}.${extension[work.imageMimeType]}`,
    `onchain/records/${work.id}.json`,
    ...[640, 1200, 2000].map((w) => `onchain/images/${work.id}-${w}.webp`),
    ...(work.animated && work.imageMimeType === 'image/gif'
      ? [`onchain/animations/${work.id}.webp`]
      : []),
  ]);
  const ready =
    process.env.ONCHAIN_PREVIEW === '1' || keys.every((key) => key in objects);
  return { ready, count: ready ? works.length : 0, entrances: ready ? 6 : 5 };
}
