// The locked structure (curation/exhibitions/structure/) and the gallery text
// (curation/exhibitions/rewrite/) are the site's only source for wings, parts,
// rooms, labels, captions and readings. Numbers in the text come from the
// catalog; this module never computes new ones.
import wingsFile from '../../curation/exhibitions/rewrite/wings.json';
import facesStructure from '../../curation/exhibitions/structure/nifty-faces.json';
import nnotbStructure from '../../curation/exhibitions/structure/nnotb.json';
import rawblocksStructure from '../../curation/exhibitions/structure/rawblocks.json';
import abstractStructure from '../../curation/exhibitions/structure/abstract.json';
import otherStructure from '../../curation/exhibitions/structure/nnxyz-other.json';
import scrimshawStructure from '../../curation/exhibitions/structure/scrimshaw.json';
import onchainStructure from '../../curation/exhibitions/structure/after-nifty-ink.json';
import { abstractById } from './abstract';
import { onchainById, onchainReady } from './onchain';
import { byId, collectionPath } from './catalog';
import { formatUtcSpan } from './dates';

export type Treatment = 'label' | 'line' | 'none';
export interface RoomFacts {
  recordedAt: string | null;
  recordedDate: string | null;
  strokes?: number | null;
  points?: number | null;
}
export interface RoomWork {
  artworkId: string;
  title: string;
  short: string;
  treatment: Treatment;
  text: string | null;
  caption: string;
  reading: string;
  facts: RoomFacts;
  compareWith?: { artworkId: string; short: string } | null;
}
export interface RelatedItem extends RoomWork {
  homeCollectionId: string;
  note: string;
}
export interface RoomChapter {
  key: string;
  title: string;
  opening: string;
  works: RoomWork[];
}
export interface TourSegment {
  kind:
    'introduction' | 'chapter' | 'work' | 'comparison' | 'related' | 'closing';
  artworkId?: string;
  secondArtworkId?: string;
  text?: string | null;
  treatment?: Treatment;
  holdSeconds?: number;
}
interface RoomFile {
  id: string;
  collectionId: string;
  partKey: string | null;
  galleryKey: string;
  title: string;
  status: string;
  introduction: string[];
  chapters: RoomChapter[];
  relatedItems: RelatedItem[];
  closing: string;
  tour: {
    segments: TourSegment[];
    spokenWords: number;
    silentHoldSeconds?: number;
    estimatedMinutesAt150wpm: number;
    /** Set while a rewritten room waits for its audio to be re-recorded. */
    audioStale?: boolean;
    audioStaleNote?: string;
  };
}
export interface Room extends RoomFile {
  theme: string;
  isCoda: boolean;
  codaNote: string | null;
  wingId: string;
  wingTitle: string;
  partTitle: string | null;
}
export interface Part {
  key: string;
  title: string;
  dates: string;
  introduction: string[];
  rooms: Room[];
}
export interface Wing {
  id: string;
  title: string;
  introduction: string[];
  parts: Part[];
  rooms: Room[];
  endsOn: string | null;
}
interface StructureGallery {
  key: string;
  title: string;
  theme: string;
  isCoda?: boolean;
  codaNote?: string;
  works: { artworkId: string }[];
}
interface StructureFile {
  collectionId: string;
  galleries?: StructureGallery[];
  parts?: { key: string; galleries: StructureGallery[] }[];
}
interface WingFile {
  collectionId: string;
  title: string;
  introduction: string[];
  roomOrder?: string[];
  parts?: {
    key: string;
    title: string;
    dates: string;
    introduction: string[];
    roomOrder: string[];
  }[];
  endsOn?: string | null;
}

const roomFiles = import.meta.glob<RoomFile>(
  '../../curation/exhibitions/rewrite/*--*.json',
  { eager: true, import: 'default' },
);
const roomsById = new Map(
  Object.values(roomFiles).map((room) => [room.id, room] as const),
);
const structures = [
  facesStructure,
  nnotbStructure,
  rawblocksStructure,
  abstractStructure,
  otherStructure,
  scrimshawStructure,
  onchainStructure,
] as unknown as StructureFile[];
const structureGalleries = new Map(
  structures.flatMap((file) =>
    [
      ...(file.galleries ?? []),
      ...(file.parts ?? []).flatMap((part) => part.galleries),
    ].map(
      (gallery) => [`${file.collectionId}/${gallery.key}`, gallery] as const,
    ),
  ),
);

function buildRoom(
  wing: WingFile,
  part: { key: string; title: string } | null,
  galleryKey: string,
): Room {
  const id = part
    ? `${wing.collectionId}--${part.key}--${galleryKey}`
    : `${wing.collectionId}--${galleryKey}`;
  const file = roomsById.get(id);
  const structure = structureGalleries.get(
    `${wing.collectionId}/${galleryKey}`,
  );
  if (!file || !structure)
    throw new Error(`Room text or structure missing: ${id}`);
  const written = file.chapters.flatMap((chapter) => chapter.works);
  if (
    written.length !== structure.works.length ||
    written.some((work, i) => work.artworkId !== structure.works[i].artworkId)
  )
    throw new Error(`Room text does not follow the locked structure: ${id}`);
  return {
    ...file,
    theme: structure.theme,
    isCoda: Boolean(structure.isCoda),
    codaNote: structure.codaNote ?? null,
    wingId: wing.collectionId,
    wingTitle: wing.title,
    partTitle: part?.title ?? null,
  };
}

// The After Nifty Ink wing waits for its media (src/lib/onchain.ts).
export const wingFiles = (wingsFile.wings as WingFile[]).filter(
  (wing) => wing.collectionId !== 'after-nifty-ink' || onchainReady,
);
export const wings: Wing[] = wingFiles.map((wing) => {
  const parts: Part[] = (wing.parts ?? []).map((part) => ({
    key: part.key,
    title: part.title,
    dates: part.dates,
    introduction: part.introduction,
    rooms: part.roomOrder.map((key) => buildRoom(wing, part, key)),
  }));
  const rooms = parts.length
    ? parts.flatMap((part) => part.rooms)
    : (wing.roomOrder ?? []).map((key) => buildRoom(wing, null, key));
  return {
    id: wing.collectionId,
    title: wing.title,
    introduction: wing.introduction,
    parts,
    rooms,
    endsOn: wing.endsOn ?? null,
  };
});
export const rooms = wings.flatMap((wing) => wing.rooms);
export const wing = (id: string) => {
  const found = wings.find((w) => w.id === id);
  if (!found) throw new Error(`Unknown wing: ${id}`);
  return found;
};
export const roomById = (id: string) => {
  const found = rooms.find((room) => room.id === id);
  if (!found) throw new Error(`Unknown room: ${id}`);
  return found;
};
export const exhibitionPath = (id: string) => `/galleries/${id}/`;
export const roomWorks = (room: Room) =>
  room.chapters.flatMap((chapter) => chapter.works);
export const partOf = (room: Room) =>
  wing(room.wingId).parts.find((part) => part.key === room.partKey) ?? null;
export const nextRoom = (room: Room) => {
  const index = rooms.findIndex((r) => r.id === room.id);
  const next = rooms[index + 1];
  return next && next.wingId === room.wingId ? next : null;
};
/** Entrance pages for the sections of Other & related share one route. */
export const wingPath = (id: string) =>
  ['nnxyz-other', 'scrimshaw'].includes(id)
    ? `${collectionPath('other-related')}#${id}`
    : collectionPath(id);
export const exhibitionArtwork = (id: string) => {
  const work = byId.get(id) ?? abstractById.get(id) ?? onchainById.get(id);
  if (!work) throw new Error(`Unknown exhibition artwork: ${id}`);
  return work;
};
export const representative = (room: Room) =>
  exhibitionArtwork(roomWorks(room)[0].artworkId);
export const roomDates = (room: Room) =>
  formatUtcSpan(
    roomWorks(room)
      .map((work) => work.facts.recordedDate)
      .filter((date): date is string => Boolean(date)),
  );

export interface Placement {
  room: Room;
  work: RoomWork;
  /** Zero-based position in the room, or null for a related item hung after it. */
  index: number | null;
  related: RelatedItem | null;
}
const placements = new Map<string, Placement>();
for (const room of rooms) {
  roomWorks(room).forEach((work, index) => {
    if (placements.has(work.artworkId))
      throw new Error(`Hung twice: ${work.artworkId}`);
    placements.set(work.artworkId, { room, work, index, related: null });
  });
}
for (const room of rooms)
  for (const item of room.relatedItems) {
    if (placements.has(item.artworkId))
      throw new Error(`Related item also hangs in a room: ${item.artworkId}`);
    placements.set(item.artworkId, {
      room,
      work: item,
      index: null,
      related: item,
    });
  }
export const placement = (artworkId: string) => {
  const found = placements.get(artworkId);
  if (!found) throw new Error(`No room for artwork: ${artworkId}`);
  return found;
};
export const galleryHome = new Map(
  [...placements].map(([id, { room }]) => [id, room] as const),
);

export const entrances = [
  { id: 'nifty-faces', title: 'Faces', wings: [wing('nifty-faces')] },
  { id: 'nnotb', title: 'New Nifty on the Block', wings: [wing('nnotb')] },
  { id: 'rawblocks', title: 'Rawblocks', wings: [wing('rawblocks')] },
  { id: 'abstract', title: 'Abstract', wings: [wing('abstract')] },
  {
    id: 'other-related',
    title: 'Other & related',
    wings: [wing('nnxyz-other'), wing('scrimshaw')],
  },
  ...(onchainReady
    ? [
        {
          id: 'after-nifty-ink',
          title: 'After Nifty Ink',
          wings: [wing('after-nifty-ink')],
        },
      ]
    : []),
];
export const entranceWork = (entrance: (typeof entrances)[number]) =>
  representative(entrance.wings[0].rooms[0]);
