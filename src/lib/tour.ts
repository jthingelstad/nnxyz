// The audio tour for a room: the room's spoken segments joined to the
// rendered audio in curation/exhibitions/audio/manifest.json by segment index.
// A silent work holds on screen for its holdSeconds. A room with no audio
// yet gets no player.
import manifest from '../../curation/exhibitions/audio/manifest.json';
import { displayTitle, isOnchain, rasterPath } from './catalog';
import { abstractImage, type AbstractArtwork } from './abstract';
import { onchainImage } from './onchain';
import { exhibitionArtwork, representative, type Room } from './exhibitions';

export interface TourArtwork {
  src: string;
  sizes: string;
  type: string;
}
export interface TourStop {
  index: number;
  kind: string;
  artworkId: string | null;
  secondArtworkId: string | null;
  /** Published audio key, or null for a silent hold. */
  src: string | null;
  seconds: number;
  /** What the lock screen shows: the work's title, or the room's. */
  title: string;
  /** The segment's cover, then the work's published 1200 px still. */
  artwork: TourArtwork[];
}
export interface Tour {
  stops: TourStop[];
  seconds: number;
}

const byRoom = new Map<
  string,
  Map<number, (typeof manifest.entries)[number]>
>();
for (const entry of manifest.entries) {
  if (!byRoom.has(entry.roomId)) byRoom.set(entry.roomId, new Map());
  byRoom.get(entry.roomId)!.set(entry.index, entry);
}
// Covers are published for every work a spoken segment is about.
const covers = new Set<string>(
  manifest.entries.flatMap((entry) =>
    'coverKey' in entry && entry.coverKey ? [entry.coverKey as string] : [],
  ),
);

// Lock-screen artwork for a work, read from published URLs rather than the
// page's lazily loaded images, so every stop has a picture.
function artworkFor(artworkId: string): TourArtwork[] {
  const work = exhibitionArtwork(artworkId);
  const cover = `audio/covers/${artworkId}.jpg`;
  const still = isOnchain(work)
    ? onchainImage(work, 1200)
    : 'inkId' in work
      ? rasterPath(work, 1200)
      : abstractImage(work as AbstractArtwork, 1200);
  const height = Math.round((1200 * Number(work.height)) / Number(work.width));
  return [
    ...(covers.has(cover)
      ? [{ src: `/${cover}`, sizes: '480x480', type: 'image/jpeg' }]
      : []),
    { src: still, sizes: `1200x${height}`, type: 'image/webp' },
  ];
}

export function tourFor(room: Room): Tour | null {
  // A rewritten room keeps its old recordings in the manifest until the Mac
  // re-records it; until then the text and the audio disagree, so no player.
  if (room.tour.audioStale) return null;
  const audio = byRoom.get(room.id);
  if (!audio) return null;
  // Stops about the room rather than a work show the room's first work.
  const roomWork = representative(room);
  const roomId = 'inkId' in roomWork ? (roomWork.inkId as string) : roomWork.id;
  const describe = (artworkId: string | null) => ({
    title: artworkId ? displayTitle(exhibitionArtwork(artworkId)) : room.title,
    artwork: artworkFor(artworkId ?? roomId),
  });
  const stops: TourStop[] = [];
  room.tour.segments.forEach((segment, index) => {
    if (segment.text) {
      const entry = audio.get(index);
      if (!entry)
        throw new Error(`Audio missing for ${room.id} segment ${index}`);
      stops.push({
        index,
        kind: segment.kind,
        artworkId: segment.artworkId ?? null,
        secondArtworkId: segment.secondArtworkId ?? null,
        src: `/${entry.key}`,
        seconds: entry.durationSeconds,
        ...describe(segment.artworkId ?? null),
      });
    } else {
      stops.push({
        index,
        kind: segment.kind,
        artworkId: segment.artworkId ?? null,
        secondArtworkId: null,
        src: null,
        seconds: segment.holdSeconds ?? room.tour.silentHoldSeconds ?? 4,
        ...describe(segment.artworkId ?? null),
      });
    }
  });
  return {
    stops,
    seconds: stops.reduce((n, stop) => n + stop.seconds, 0),
  };
}
export const minutes = (seconds: number) =>
  Math.max(1, Math.round(seconds / 60));
