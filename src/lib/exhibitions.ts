import map from '../../curation/exhibitions/map.json';
import presentation from '../../curation/exhibitions/presentation.json';
import abstractMap from '../../curation/abstract/exhibitions.json';
import { abstractById } from './abstract';
import { byId, collectionPath } from './catalog';

export interface ExhibitionStop {
  artworkId: string;
  title: string;
  whyHere: string;
  transitionFromPrevious: string | null;
}
export interface ExhibitionChapter {
  title: string;
  introduction: string;
  stops: ExhibitionStop[];
}
export interface Exhibition {
  id: string;
  collectionId: string;
  title: string;
  question: string;
  introduction: string;
  closing: string;
  chapters: ExhibitionChapter[];
}
export interface ExhibitionCollection {
  id: string;
  title: string;
  introduction: string;
  galleries: Exhibition[];
}
export const exhibitionCollections = [
  ...map.collections,
  ...abstractMap.collections,
].map((collection) =>
  collection.id === 'nnotb'
    ? {
        ...collection,
        title: 'New Nifty on the Block',
        introduction: collection.introduction.replace(
          /^On the Block/,
          'New Nifty on the Block (NNOTB)',
        ),
      }
    : collection,
) as ExhibitionCollection[];
export const exhibitions = exhibitionCollections.flatMap((c) => c.galleries);
export const exhibitionPath = (id: string) => `/galleries/${id}/`;
export const exhibitionStops = (gallery: Exhibition) =>
  gallery.chapters.flatMap((chapter) => chapter.stops);
export const galleryHome = new Map(
  exhibitions.flatMap((gallery) =>
    exhibitionStops(gallery).map((stop) => [stop.artworkId, gallery] as const),
  ),
);
export const exhibitionCollection = (id: string) =>
  exhibitionCollections.find((c) => c.id === id)!;
export const wingPath = (id: string) =>
  ['nnxyz-other', 'scrimshaw'].includes(id)
    ? `${collectionPath('other-related')}#${id}`
    : collectionPath(id);
export const exhibitionArtwork = (id: string) => {
  const work = byId.get(id) ?? abstractById.get(id);
  if (!work) throw new Error(`Unknown exhibition artwork: ${id}`);
  return work;
};
export const representative = (gallery: Exhibition) =>
  exhibitionArtwork(exhibitionStops(gallery)[0].artworkId);
export function chapterIntroduction(gallery: Exhibition, index: number) {
  const override = presentation.chapterCorrections.find(
    (change) =>
      change.galleryId === gallery.id && change.chapterIndex === index,
  );
  return override?.text ?? gallery.chapters[index].introduction;
}
export const entrances = [
  {
    id: 'nifty-faces',
    title: 'Faces',
    gallery: exhibitionCollection('nifty-faces').galleries[0],
  },
  {
    id: 'nnotb',
    title: 'New Nifty on the Block',
    gallery: exhibitionCollection('nnotb').galleries[0],
  },
  {
    id: 'rawblocks',
    title: 'Rawblocks',
    gallery: exhibitionCollection('rawblocks').galleries[0],
  },
  {
    id: 'abstract',
    title: 'Abstract',
    gallery: exhibitionCollection('abstract').galleries[0],
  },
  {
    id: 'other-related',
    title: 'Other & related',
    gallery: exhibitionCollection('scrimshaw').galleries[0],
  },
];
