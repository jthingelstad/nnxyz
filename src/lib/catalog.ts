import gallery from '../../data/gallery.json';
import collectionData from '../../data/collections.json';
import labelData from '../../curation/catalog/labels.json';
import { abstractImage, type AbstractArtwork } from './abstract';

export const artworks = gallery;
export type Artwork = (typeof artworks)[number];
export type DisplayArtwork = Artwork | AbstractArtwork;
export const byId = new Map(artworks.map((work) => [work.inkId, work]));
export const labels = new Map(
  labelData.map((label) => [label.artworkId, label]),
);
export const collections = collectionData.filter(
  (collection) => collection.included,
);
export const artworkPath = (cid: string) => `/artworks/${cid}/`;
// WebPs downscaled from the archived PNGs (tools/build-raster-assets.mjs makes
// 320 and 640 px copies of wider PNGs, plus one at the PNG's own width).
// Browsing never downloads SVG geometry; artwork pages draw it over the poster.
export const rasterPath = (work: Artwork, width?: number) =>
  width && width < Math.round(work.width)
    ? `/raster/${work.inkId}-${width}.webp`
    : `/raster/${work.inkId}.webp`;
export function thumbnail(work: DisplayArtwork) {
  if (!('inkId' in work))
    return {
      src: abstractImage(work, 640),
      srcset: [640, 1200, 2000]
        .map((width) => `${abstractImage(work, width)} ${width}w`)
        .join(', '),
    };
  const full = Math.round(work.width);
  return {
    src: rasterPath(work, 640),
    srcset: [...[320, 640].filter((width) => width < full), full]
      .map((width) => `${rasterPath(work, width)} ${width}w`)
      .join(', '),
  };
}
export const collectionPath = (id: string) => `/collections/${id}/`;
export function displayTitle(work: Pick<DisplayArtwork, 'name'>): string {
  return work.name
    .replace(/^nnxyz nifty faces/i, 'Nifty Faces')
    .replace(/^nnxyz nnotb/i, 'NNOTB')
    .replace(/^nnxyz rawblocks/i, 'Rawblocks')
    .replace(/^nnxyz abstract/i, 'Abstract');
}
export const collectionTitle = (id: string) =>
  collections.find((c) => c.id === id)?.name ?? 'Collection';
