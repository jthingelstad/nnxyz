// Every work with its standalone caption, for the screen saver. Captions and
// room positions come from the gallery text; images are the published WebPs.
import type { APIRoute } from 'astro';
import {
  rooms,
  roomWorks,
  exhibitionArtwork,
  partOf,
} from '../../lib/exhibitions';
import { displayTitle, rasterPath, artworkPath } from '../../lib/catalog';
import { abstractImage } from '../../lib/abstract';

export interface SaverWork {
  id: string;
  title: string;
  artist: string;
  caption: string;
  room: string;
  roomId: string;
  wing: string;
  wingId: string;
  href: string;
  src: string;
  srcset: string;
}

export function saverWorks(): SaverWork[] {
  return rooms.flatMap((room) =>
    [...roomWorks(room), ...room.relatedItems].map((work) => {
      const art = exhibitionArtwork(work.artworkId);
      const drawing = 'inkId' in art;
      const part = partOf(room);
      return {
        id: work.artworkId,
        title: displayTitle(art),
        artist: art.artistName,
        caption: work.caption,
        room: room.title,
        roomId: room.id,
        wing: part ? `${room.wingTitle} · ${part.title}` : room.wingTitle,
        wingId: room.wingId,
        href: artworkPath(work.artworkId),
        src: drawing ? rasterPath(art, 2000) : abstractImage(art, 2000),
        srcset: drawing
          ? [1200, 1600, 2000]
              .map((w) => `${rasterPath(art, w)} ${w}w`)
              .join(', ')
          : [1200, 2000]
              .map((w) => `${abstractImage(art, w)} ${w}w`)
              .join(', '),
      };
    }),
  );
}

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ works: saverWorks() }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
