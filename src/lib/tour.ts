// The audio tour for a room: the room's spoken segments joined to the
// rendered audio in curation/exhibitions/audio/manifest.json by segment index.
// A silent work holds on screen for its holdSeconds. A room with no audio
// yet gets no player.
import manifest from '../../curation/exhibitions/audio/manifest.json';
import type { Room } from './exhibitions';

export interface TourStop {
  index: number;
  kind: string;
  artworkId: string | null;
  secondArtworkId: string | null;
  /** Published audio key, or null for a silent hold. */
  src: string | null;
  seconds: number;
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

export function tourFor(room: Room): Tour | null {
  // A rewritten room keeps its old recordings in the manifest until the Mac
  // re-records it; until then the text and the audio disagree, so no player.
  if (room.tour.audioStale) return null;
  const audio = byRoom.get(room.id);
  if (!audio) return null;
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
      });
    } else {
      stops.push({
        index,
        kind: segment.kind,
        artworkId: segment.artworkId ?? null,
        secondArtworkId: null,
        src: null,
        seconds: segment.holdSeconds ?? room.tour.silentHoldSeconds ?? 4,
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
