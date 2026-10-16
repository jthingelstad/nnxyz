import gallery from '../../data/gallery.json';
import collectionData from '../../data/collections.json';
import labelData from '../../curation/catalog/labels.json';
import { abstractImage, type AbstractArtwork } from './abstract';
import { onchainImage, type OnchainArtwork } from './onchain';
import {
  rasterKey,
  rasterWidths,
  abstractWidths,
  onchainWidths,
} from './media-paths';

export const artworks = gallery;
export type Artwork = (typeof artworks)[number];
export type DisplayArtwork = Artwork | AbstractArtwork | OnchainArtwork;
export const byId = new Map(artworks.map((work) => [work.inkId, work]));
export const labels = new Map(
  labelData.map((label) => [label.artworkId, label]),
);
export const collections = collectionData.filter(
  (collection) => collection.included,
);
export const artworkPath = (cid: string) => `/artworks/${cid}/`;
// WebPs rendered from each native SVG (tools/build-raster-assets.mjs); the
// widths cover a 560 px gallery image at 3x and the 900 px artwork poster at
// 2x. Browsing never downloads SVG geometry; artwork pages draw it over the
// poster. Media URLs must be published: validate-site checks each against
// data/media.json.
export const rasterPath = (work: Artwork, width = 1600) =>
  rasterKey(work.inkId, width);
export const rasterSrcset = (work: Artwork) =>
  rasterWidths
    .map((width) => `${rasterPath(work, width)} ${width}w`)
    .join(', ');
export const isOnchain = (work: DisplayArtwork): work is OnchainArtwork =>
  'chain' in work;
export function thumbnail(work: DisplayArtwork) {
  if (isOnchain(work))
    return {
      src: onchainImage(work, 640),
      srcset: onchainWidths
        .map((width) => `${onchainImage(work, width)} ${width}w`)
        .join(', '),
    };
  if (!('inkId' in work))
    return {
      src: abstractImage(work, 640),
      srcset: abstractWidths
        .map((width) => `${abstractImage(work, width)} ${width}w`)
        .join(', '),
    };
  return { src: rasterPath(work, 640), srcset: rasterSrcset(work) };
}
export const collectionPath = (id: string) => `/collections/${id}/`;
export function displayTitle(work: Pick<DisplayArtwork, 'name'>): string {
  return work.name
    .replace(/^nnxyz nifty faces/i, 'Nifty Faces')
    .replace(/^nnxyz nnotb/i, 'NNOTB')
    .replace(/^nnxyz rawblocks/i, 'Rawblocks')
    .replace(/^nnxyz abstract/i, 'Abstract')
    .replace(/^nnxyz nifty faces px/i, 'Nifty Faces px')
    .replace(/^nnxyzcccc/i, 'Chic City Cat')
    .replace(/^nnxyzic Heaven or Hell/i, 'Heaven or Hell')
    .replace(/^nnxyz foca/i, 'Friends of Country Air')
    .replace(/^nnxyz\s+shrine of - /i, 'Shrine of ')
    .replace(/\s+/g, ' ')
    .trim();
}
export const collectionTitle = (id: string) =>
  collections.find((c) => c.id === id)?.name ?? 'Collection';
