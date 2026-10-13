import gallery from '../../data/gallery.json';
import collectionData from '../../data/collections.json';
import labelData from '../../curation/catalog/labels.json';
import routeData from '../../curation/catalog/routes.json';

export const artworks = gallery;
export type Artwork = (typeof artworks)[number];
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
export const thumbnailPath = (work: Artwork) =>
  work.points > 12000 ? `/png/${work.inkId}.png` : `/art/${work.inkId}.svg`;
export const collectionPath = (id: string) => `/collections/${id}/`;
export function displayTitle(work: Artwork): string {
  return work.name
    .replace(/^nnxyz nifty faces/i, 'Nifty Faces')
    .replace(/^nnxyz nnotb/i, 'NNOTB')
    .replace(/^nnxyz rawblocks/i, 'Rawblocks');
}
export const collectionTitle = (id: string) =>
  collections.find((c) => c.id === id)?.name ?? 'Collection';
const featured = [
  'QmV8UybASXWtrDbQEKHFJa8oMSLehb8PqkLKrHjQtxPycJ',
  'QmTbgoi65G6JjTGZAsUN8wFMHEodCZmmU2N4Ceeaa5iG3V',
  'Qmf3XADpBhuqtGJoqk34VhNYwPjoqCTJm7yDA3tzghcnQv',
  'QmbM9pwfyX86HxXetyVZkBKJ7WTLE7BNeVVkc7TkUeSCA5',
  'QmTdPjPwTgTZWs6u25HvDsmoaAkTycNx8pY8fX3ChsqMbf',
  'QmUWXuwbMXfcbTapYcQbAYrnTaFAPQY4zZ3Vinwoo6qKGy',
];
export const galleryOrder = [
  ...featured.map((id) => byId.get(id)!),
  ...artworks.filter((w) => !featured.includes(w.inkId)),
];
