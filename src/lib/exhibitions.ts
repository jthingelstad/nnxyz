import map from '../../curation/exhibitions/map.json';
import presentation from '../../curation/exhibitions/presentation.json';
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
export const exhibitionCollections = map.collections as ExhibitionCollection[];
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
export const representative = (gallery: Exhibition) =>
  byId.get(exhibitionStops(gallery)[0].artworkId)!;
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
    title: 'On the Block',
    gallery: exhibitionCollection('nnotb').galleries[0],
  },
  {
    id: 'rawblocks',
    title: 'Rawblocks',
    gallery: exhibitionCollection('rawblocks').galleries[0],
  },
  {
    id: 'other-related',
    title: 'Other & related',
    gallery: exhibitionCollection('scrimshaw').galleries[0],
  },
];
