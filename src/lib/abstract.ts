import data from '../../data/abstract.json';
import editorial from '../../curation/abstract/editorial.json';
import { abstractKey } from './media-paths';

export const abstractArtworks = data.artworks;
export type AbstractArtwork = (typeof abstractArtworks)[number];
export const abstractById = new Map(
  abstractArtworks.map((work) => [work.id, work]),
);
export const abstractReadings = new Map(
  editorial.records.map((record) => [record.artworkId, record]),
);
export const abstractImage = (work: AbstractArtwork, width = 1200) =>
  abstractKey(work.id, width);
export const abstractOriginal = (work: AbstractArtwork) =>
  `/abstract/originals/${work.id}.jpg`;
