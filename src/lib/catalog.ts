import gallery from '../../data/gallery.json';
import collectionData from '../../data/collections.json';
import labelData from '../../curation/catalog/labels.json';
import routeData from '../../curation/catalog/routes.json';
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
export const routes = routeData;
export const artworkPath = (cid: string) => `/artworks/${cid}/`;
// Dense SVGs contain megabytes of geometry. Keep browsing light; artwork pages always use native SVG.
export const thumbnailPath = (work: DisplayArtwork) =>
  'inkId' in work
    ? work.points > 12000
      ? `/png/${work.inkId}.png`
      : `/art/${work.inkId}.svg`
    : abstractImage(work, 640);
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
