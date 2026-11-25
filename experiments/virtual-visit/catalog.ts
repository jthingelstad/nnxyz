import { floors, WING_COLORS } from '../../src/lib/floor-plan';
import {
  roomById,
  roomWorks,
  exhibitionArtwork,
} from '../../src/lib/exhibitions';
import { artworkPath, displayTitle, thumbnail } from '../../src/lib/catalog';
import { tourFor } from '../../src/lib/tour';

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
    return {
      ...plan,
      wing: room.wingTitle,
      color: WING_COLORS[room.wingId],
      works: roomWorks(room).map(describe),
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
        caption: record.caption,
        ratio: Number(art.width) / Number(art.height),
        image: thumbnail(art).src,
        href: artworkPath(record.artworkId),
        replay: 'inkId' in art,
      };
    }
  }),
}));
