# Curation handoff, October 15, 2026

This file carries the re-curation of the site from a local session to the next
one. Read it, then `AGENTS.md`, then `curation/voice/style-guide.md`.

All work is on the branch `curation-voice-pilot`. `main` deploys to the live
site on every push. Never merge, push to `main` or open a pull request without
the collector's explicit go.

## What the collector wants

- **Galleries built from the images.** Group works by what they look like, not
  by title order. Every work hangs in exactly one gallery, like a physical
  museum. Each gallery holds 20 to 30 works.
- **Wings and rooms.** Each collection is a wing; its galleries are rooms.
  New Nifty on the Block (NNOTB, 303 works) is split into three dated parts,
  which the collector likes because they are time-bound.
- **An unsigned voice.** No page names a curator or says "AI curator". The
  collector's own words appear only in the front-page introduction, which the
  collector will write last. One line on the About page says the galleries
  were curated with AI. The footers no longer say so.
- **Reference voice.** The collector liked all five sample labels in the style
  guide.
- **Planned features** the text must support (see the style guide):
  - an audio tour: press play in a gallery and a voice reads the text while
    each work comes on screen. Text is written in segments tied to works.
    Spoken forms live in `curation/voice/pronunciation.json`.
  - a full-screen screen saver: one work at a time on a rotating schedule,
    with a translucent overlay of title and caption. Every work gets a
    standalone caption of 20 words or fewer.
  - a museum map page: the wings as a floor plan, with the galleries as
    rooms. Build it once the structure is locked.

## Where the structure stands

`curation/exhibitions/structure/` has one file per wing. Each gallery has a key,
title, theme and an ordered list of works with `artworkId`, `title`,
`recordedDate` (US Central) and a short `visualNote`.

| Wing | File | Galleries | Collector status |
| --- | --- | --- | --- |
| Faces (134) | `nifty-faces.json` | 6 | approved |
| NNOTB (303) | `nnotb.json` | 3 parts, 13 galleries | approved |
| Rawblocks (66) | `rawblocks.json` | 3 + 2 unplaced | reviewed, open questions |
| Abstract (52) | `abstract.json` | 2 | reviewed |
| Other nnxyz (45) | `nnxyz-other.json` | 2 | reviewed |
| Scrimshaw (26) | `scrimshaw.json` | 1 + 1 off the wall | reviewed, open question |

Collector decisions are recorded in each file's `collectorDecisions`.

Facts settled along the way:

- **The two NNOTB #249s** are not a burn. They were minted 85 seconds apart,
  and the second adds the signature. Both hang in Cats and Creatures, as
  "(unsigned)" and "(signed)".
- **Scrimshaw6 and Scrimshaw8** each appear twice. In both cases they are
  genuinely different drawings.
- **The #0000 works** (Faces, NNOTB, Rawblocks, Abstract) are editions of one.
  They are marked `collectionPiece: true`. According to the collector, nnxyz
  made each at the end of its run as the collection piece, and the collector
  bought the single copy to own the whole collection.
  - Visually, each one packs the series' motifs into one dense image.
  - This is the collector's account. The gallery text can state the record
    (made last, edition of one) but must not quote the collector.

## Open questions for the collector

1. **Rawblocks #64 and #65.** These two painted landscapes are the last
   Rawblocks works, made March 15, 2023. The collector says they are out of
   place in Scribbled Heads. They are in `rawblocks.json` under `unplaced`.
   Options to show:
   - a two-work coda that ends the wing;
   - the end of Portraits, which is painted too;
   - something else the collector suggests.
2. **Scribbled Heads has 16 works,** under the 20-work floor, after the
   approved moves. Portraits has 26 and Patterned Masks has 22. Possible fixes:
   - move the line heads #42 to #46 into it (but Patterned Masks drops to 17);
   - move #20, #24 and #25 from Portraits to Patterned Masks first, then
     rebalance;
   - accept a small final room.
3. **GM** has left the Scrimshaw gallery and sits in `offWall`. The choice is
   still open: drop it from the site, or show it as a related item on
   Occasions and Figures.
4. **#0000 placement.** One proposal is to end each wing with its #0000 as the
   last work a visitor sees. Today each sits where its image placed it:
   - Faces #0000 in Crossed-Out Eyes;
   - NNOTB #0000 in Crowns and Last Masks;
   - Rawblocks #0000 at the end of Scribbled Heads;
   - Abstract #0000 first in Splatter, Scribble and Swirl.
5. **The collector's wing notes stopped at an empty item 7.** Ask what it
   was going to be.

## Next steps

1. **Final review page (asked for by the collector).** One page showing every
   work in its wing, part and gallery, with the open questions above shown in
   place so the collector can decide them while looking.
   - Done October 15, 2026: `structure/working/hanging-plan.py` builds it from
     the structure files and the published thumbnails. Published as a private
     artifact at <https://claude.ai/artifact/4BNxGBb3ioHQrZQsrYnh87>. The
     page suggests answers, reached by looking at the walls: a two-work coda
     for the landscapes; moving #42 to #46 into Scribbled Heads and #19, #20,
     #24, #25 into Patterned Masks (21, 21 and 22 works); GM as a related item
     on Occasions and Figures; ending each wing with its #0000 by ordering
     rooms rather than moving works. None of these is decided.
   - Earlier review pages used embedded WebP thumbnails and stayed under
     16 MB. That works out to about 180 to 220 px at quality 60 for about 625
     works.
   - `structure/working/review-page-template.html` is the earlier page with
     its images removed. Reuse its look: IBM Plex Sans with Newsreader, and
     light and dark color tokens.
2. **Lock the structure** with the collector's answers.
3. **Pilot the gallery text on Black Silhouettes** (NNOTB part 1, 28 works). It
   should include:
   - the introduction, chapters, labels, one-liners and closing;
   - the segments for the audio tour;
   - a caption for every work;
   - the short artwork-page readings.

   Show it to the collector before writing the rest.
4. **Write every gallery,** wing by wing, plus the wing and part
   introductions. Then do one editing pass in page order to remove repeats.
   Rewrites go in `curation/exhibitions/rewrite/`.
5. **Wire the new structure into the Astro site** on the branch, including the
   map page.
   - Keep existing artwork URLs stable.
   - Run `npm run check` and `npm test`.
   - Preview only.

## Working materials

`structure/working/` holds the notes behind the structure:

- one line per work in `<wing>/notes.txt`;
- the group drafts;
- the borderline calls;
- the scripts that built the contact sheets and the review pages.

The scripts read local PNGs from `collection/`, which is not in git. Point them
at the published images instead.

## Seeing the images

`collection/` is about 4.5 GB and is not in git, and the private archive is not
available outside the collector's Mac. You do not need either, because every
work is published:

- Nifty Ink works: `https://d1of1z466a2mhl.cloudfront.net/raster/<inkId>-<width>.webp`
  at widths 320, 640, 1200, 1600 or 2000. `inkId` is the `artworkId` in the
  structure files and `inkId` in `data/gallery.json`.
- Abstract works: `https://d1of1z466a2mhl.cloudfront.net/abstract/images/<id>-<width>.webp`
  with the `id` from `data/abstract.json`.

Look at the images before writing about them. Do not write from notes alone.

## House rules that carry over

- Give dates and times in US Central.
- `collection/` bytes are immutable. Published media is write-once.
- Commits end with the co-author line the session supplies. No model names
  in commits, code or pull requests.
- Never verify anything by writing to live data.
