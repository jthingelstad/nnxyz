// The collector's nnxyz works on chains other than Gnosis (data/onchain.json,
// built by tools/build-onchain-catalog.py). They are stills with downloadable
// originals, like Abstract. The wing opens only once every image key is in
// data/media.json, so a build before the Mac publishes the media still passes
// validation; ONCHAIN_PREVIEW=1 forces it on for a local look.
import data from '../../data/onchain.json';
import media from '../../data/media.json';
import { onchainKey, onchainWidths, onchainAnimationKey } from './media-paths';

export const onchainArtworks = data.artworks;
export type OnchainArtwork = (typeof onchainArtworks)[number];
export const onchainById = new Map(
  onchainArtworks.map((work) => [work.id, work]),
);
const extension: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'video/mp4': 'mp4',
};
export const onchainOriginal = (work: OnchainArtwork) =>
  `/onchain/originals/${work.id}.${extension[work.imageMimeType]}`;
export const onchainRecord = (work: OnchainArtwork) =>
  `/onchain/records/${work.id}.json`;
export const onchainImage = (work: OnchainArtwork, width = 1200) =>
  onchainKey(work.id, width);
export const onchainAnimation = (work: OnchainArtwork) =>
  work.animated && work.imageMimeType === 'image/gif'
    ? onchainAnimationKey(work.id)
    : null;
export const onchainKeys = (work: OnchainArtwork) => [
  onchainOriginal(work),
  onchainRecord(work),
  ...onchainWidths.map((width) => onchainImage(work, width)),
  ...(onchainAnimation(work) ? [onchainAnimation(work)!] : []),
];
const objects = media.objects as Record<string, string>;
export const onchainPublished = onchainArtworks.every((work) =>
  onchainKeys(work).every((key) => key.slice(1) in objects),
);
export const onchainReady =
  onchainPublished || import.meta.env.ONCHAIN_PREVIEW === '1';
export const chainNames: Record<string, string> = {
  ethereum: 'Ethereum',
  optimism: 'Optimism',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  tezos: 'Tezos',
};
