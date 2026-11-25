import { floors, WING_COLORS } from '../../src/lib/floor-plan';
import {
  roomById,
  roomWorks,
  rooms,
  exhibitionArtwork,
} from '../../src/lib/exhibitions';
import { artworkPath, displayTitle, thumbnail } from '../../src/lib/catalog';
import { svgKey } from '../../src/lib/media-paths';
import { tourFor } from '../../src/lib/tour';

const primaryIds = new Set(
  rooms.flatMap((r) => roomWorks(r).map((w) => w.artworkId)),
);
export const museum = floors.map((floor) => ({
  number: floor.number,
  label: floor.label,
  footprint: floor.footprint,
  walls: floor.walls,
  doors: floor.doors,
  stairs: floor.stairs,
  corridor: floor.corridor,
  rooms: floor.rooms.map((plan) => {
    const room = roomById(plan.id);
    const primary = roomWorks(room);
    const guests = room.relatedItems.filter(
      (w) => !primaryIds.has(w.artworkId),
    );
    return {
      ...plan,
      primaryCount: primary.length,
      wing: room.wingTitle,
      color: WING_COLORS[room.wingId],
      chapters: [
        ...room.chapters.map((c) => ({
          title: c.title,
          count: c.works.length,
        })),
        ...(guests.length
          ? [{ title: 'Related work', count: guests.length }]
          : []),
      ],
      works: [...primary, ...guests].map(describe),
      related: room.relatedItems.map(describe),
      tour: (tourFor(room)?.stops ?? []).map((stop) => ({
        kind: stop.kind,
        title: stop.title,
        id: stop.artworkId,
        second: stop.secondArtworkId,
        src: stop.src,
        seconds: stop.seconds,
        text: room.tour.segments[stop.index].text ?? '',
      })),
    };
    function describe(record: ReturnType<typeof roomWorks>[number]) {
      const art = exhibitionArtwork(record.artworkId);
      return {
        id: record.artworkId,
        title: displayTitle(art),
        artist: art.artistName,
        date:
          'inkId' in art
            ? String(new Date(Number(art.createdAt) * 1000).getUTCFullYear())
            : 'chain' in art && art.createdAt
              ? 'Minted ' + art.createdAt.slice(0, 4)
              : '',
        medium:
          'inkId' in art
            ? 'Nifty Ink drawing'
            : 'chain' in art && art.animated
              ? 'Animation, still frame'
              : 'Digital image',
        caption: record.caption,
        ratio: Number(art.width) / Number(art.height),
        image: thumbnail(art).src,
        href: artworkPath(record.artworkId),
        replay: 'inkId' in art,
        svg: 'inkId' in art ? svgKey(art.inkId) : null,
      };
    }
  }),
}));
