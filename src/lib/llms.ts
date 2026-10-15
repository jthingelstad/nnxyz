// llms.txt (https://llmstxt.org): a Markdown index of the site for language
// models, and a full-text companion with every room's text. Both are built
// from the same room files as the pages, so they never say something the
// site does not.
import {
  wings,
  rooms,
  roomWorks,
  exhibitionPath,
  exhibitionArtwork,
  wingPath,
  roomDates,
  partOf,
} from './exhibitions';
import { displayTitle, artworkPath } from './catalog';
import statement from '../../curation/collector-statement.json';

const SITE = 'https://nnxyz.thingelstad.xyz';
// Every work in the collection: the rooms plus the related item hung after one.
const total = rooms.reduce(
  (n, room) => n + roomWorks(room).length + room.relatedItems.length,
  0,
);
const url = (path: string) => `${SITE}${path}`;

export function llmsIndex(): string {
  const lines: string[] = [];
  lines.push('# The nnxyz Rooms', '');
  lines.push(
    `> A museum-style gallery of ${total} works by the Nifty Ink artist nnxyz, with a related collection by Scrimshaw. Every work hangs in one of ${rooms.length} rooms across six wings, in the order it was drawn, with unsigned gallery text, an audio tour, a floor plan and a screen saver. Nifty Ink drawings are reconstructed from their archived brush strokes and can be watched being drawn.`,
    '',
  );
  lines.push(
    'The site shows the owned subset of each series, not a complete catalogue. Dates are UTC, from the archived creation timestamps. Readings describe what is visible and do not claim what the artist intended. Numbers (stroke counts, dates) come from the archive, not from looking.',
    '',
  );
  lines.push('## Wings', '');
  for (const wing of wings)
    lines.push(
      `- [${wing.title}](${url(wingPath(wing.id))}): ${wing.introduction[0]}`,
    );
  lines.push('', '## Rooms', '');
  for (const wing of wings)
    for (const room of wing.rooms) {
      const part = partOf(room);
      const where = part ? `${wing.title}, ${part.title}` : wing.title;
      const dates = roomDates(room);
      lines.push(
        `- [${room.title}](${url(exhibitionPath(room.id))}): ${room.theme} ${roomWorks(room).length} works, ${where}${dates ? `, ${dates}` : ''}.`,
      );
    }
  lines.push('', '## Pages', '');
  lines.push(
    `- [Map](${url('/map/')}): the collection as a three-floor building, rooms sized by work count.`,
    `- [Screen saver](${url('/screensaver/')}): one work at a time with its caption.`,
    `- [About](${url('/about/')}): the archive, the replay and what the records do and do not establish.`,
    `- [Notes from the curator](${url('/notes/')}): how the rooms, text, audio tour and map were made.`,
    `- [Full text](${url('/llms-full.txt')}): every wing, room and artwork text on the site in one Markdown file.`,
    '',
  );
  lines.push('## Artwork pages', '');
  lines.push(
    `Each work has a stable page of its own under the /artworks/ path of this site, named by its id, with its reading, its room position, the UTC creation instant, downloads and one link to the collected NFT. Nifty Ink ids are drawing CIDs; Abstract ids carry the Polygon contract and token.`,
    '',
  );
  return lines.join('\n');
}

export function llmsFull(): string {
  const lines: string[] = [];
  lines.push('# The nnxyz Rooms', '');
  lines.push(
    `> The complete gallery text of ${SITE}: ${wings.length} wings, ${rooms.length} rooms, ${total} works. Generated from the same files as the pages.`,
    '',
  );
  lines.push('## From the collector', '');
  for (const paragraph of statement.paragraphs) lines.push(paragraph, '');
  lines.push(`${statement.signature}, ${statement.dateline}`, '');
  for (const wing of wings) {
    lines.push(`## ${wing.title}`, '', `${url(wingPath(wing.id))}`, '');
    for (const paragraph of wing.introduction) lines.push(paragraph, '');
    for (const part of wing.parts) {
      lines.push(`### ${part.title} (${part.dates})`, '');
      for (const paragraph of part.introduction) lines.push(paragraph, '');
    }
    for (const room of wing.rooms) {
      const dates = roomDates(room);
      lines.push(
        `### Room: ${room.title}`,
        '',
        `${url(exhibitionPath(room.id))}`,
        '',
      );
      lines.push(
        `${room.theme} ${roomWorks(room).length} works${dates ? `, ${dates}` : ', shown in title order'}.`,
        '',
      );
      for (const paragraph of room.introduction) lines.push(paragraph, '');
      room.chapters.forEach((chapter, i) => {
        lines.push(`#### ${i + 1}. ${chapter.title}`, '', chapter.opening, '');
        for (const work of chapter.works) {
          const art = exhibitionArtwork(work.artworkId);
          const byline =
            art.artistName === 'nnxyz' ? '' : ` by ${art.artistName}`;
          lines.push(
            `**${displayTitle(art)}**${byline} (${url(artworkPath(work.artworkId))})`,
          );
          if (work.facts.recordedDate)
            lines.push(
              `Recorded ${work.facts.recordedDate} UTC${work.facts.strokes ? `, ${work.facts.strokes} strokes` : ''}.`,
            );
          if (work.text) lines.push('', work.text);
          if (work.compareWith)
            lines.push(
              '',
              `Compare with ${work.compareWith.short}, in this room.`,
            );
          lines.push(
            '',
            `Caption: ${work.caption}`,
            '',
            `Reading: ${work.reading}`,
            '',
          );
        }
      });
      for (const item of room.relatedItems) {
        const art = exhibitionArtwork(item.artworkId);
        lines.push(
          `#### Related work, hung after the room`,
          '',
          `**${displayTitle(art)}** by ${art.artistName} (${url(artworkPath(item.artworkId))})`,
          '',
          item.text ?? '',
          '',
          `Caption: ${item.caption}`,
          '',
          `Reading: ${item.reading}`,
          '',
        );
      }
      lines.push('#### Closing', '', room.closing, '');
    }
  }
  return lines.join('\n');
}
