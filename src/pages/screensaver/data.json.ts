// Every work with its standalone caption, for the screen saver. Captions and
// room positions come from the gallery text; images are the published WebPs.
import type { APIRoute } from 'astro';
import {
  rooms,
  roomWorks,
  exhibitionArtwork,
  partOf,
} from '../../lib/exhibitions';
import { displayTitle, artworkPath } from '../../lib/catalog';

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
  /** 'ink' works have raster/<id>-<w>.webp; 'abstract' works abstract/images/<id>-<w>.webp. */
  kind: 'ink' | 'abstract';
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
        kind: drawing ? ('ink' as const) : ('abstract' as const),
      };
    }),
  );
}

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ works: saverWorks() }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
