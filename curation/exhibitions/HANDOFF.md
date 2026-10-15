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
  collector's own words appear only in the front-page introduction. The
  collector supplied the final statement on October 15, 2026; it is saved
  verbatim in `curation/collector-statement.json` and goes on the front page
  unchanged, signed Jamie, October 2026. One line on the About page says the galleries
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
  - audio generation: the collector placed an OpenAI API key in the local
    `.env` on the Mac (October 15, 2026, expiring in seven days) and wants
    OpenAI's TTS models for the voice. The key is not available in cloud
    sessions. Generate audio per tour segment from the rewrite files once the
    text is final, on the Mac, and never commit the key or `.env`.

## Where the structure stands

`curation/exhibitions/structure/` has one file per wing. Each gallery has a key,
title, theme and an ordered list of works with `artworkId`, `title`,
`recordedAt` (UTC instant), `recordedDate` (UTC date) and a short `visualNote`.

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

All five were answered on October 15, 2026, on the hanging plan page, and the
structure files are locked (`status: collector-approved`): the landscapes are a
two-work coda (`rb-coda`); #42 to #46 joined Scribbled Heads and #19, #20, #24,
#25 joined Patterned Masks (22, 21, 21 works); GM is a related item on
Occasions and Figures; each wing ends on its #0000 by room order (Faces ends
with Crossed-Out Eyes, NNOTB part 3 ends with Crowns and Last Masks, Abstract
#0000 hangs last in its room); item 7 was nothing. The list below is kept as
the record of what was asked.

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
2. **Lock the structure** with the collector's answers. Done October 15, 2026.
3. **Pilot the gallery text on Black Silhouettes** (NNOTB part 1, 28 works). It
   should include:
   - the introduction, chapters, labels, one-liners and closing;
   - the segments for the audio tour;
   - a caption for every work;
   - the short artwork-page readings.

   Show it to the collector before writing the rest.
   - Drafted October 15, 2026 in `rewrite/nnotb--p1--silhouettes.json`
     (status `pilot-draft-for-collector-review`): introduction, five chapters,
     8 labels, 15 one-liners, 5 silent works, three comparisons, closing, a
     caption and a reading for all 28, and the tour segments (about 8.8
     minutes). `rewrite/working/pilot-review-page.py` renders a rewrite file
     as a review page. Three spoken forms were added to
     `curation/voice/pronunciation.json` as proposals.
4. **Write every gallery,** wing by wing, plus the wing and part
   introductions. Then do one editing pass in page order to remove repeats.
   Rewrites go in `curation/exhibitions/rewrite/`.
   - Done October 15, 2026, for all 28 rooms (27 plus the coda) and the wing
     and part introductions in `rewrite/wings.json`. Each room is a content
     module in `rewrite/working/content/` assembled by
     `rewrite/working/assemble.py`, which checks room order, caption length,
     habit words, tour length and page directions; `recaption.py` swaps
     captions from a checked list; `review-page.py` renders one or more
     rewrite files as a review page with the images. Tours run 7 to 9
     minutes a room (Scribbled Heads and the two Masks rooms are longest).
     Editing pass done October 15, 2026, after a page-order read of all 28
     rooms (collector: look for repetition and for things out of place for
     a visitor; apply directly). What changed: 369 closing stroke-count
     sentences were removed from the artwork-page readings, keeping the
     eight where the number carries an argument (most, fewest, a difference
     between two versions); every "recorded points" figure in visitor text
     was replaced with plain wording (densest, sparest), since point count
     is a method proxy; all UTC clock times in prose became relative
     wording ("two hours before", "twelve hours after"); "minted" and "on
     the chain" became "published" and "made", and the Abstract wing intro no
     longer says "another chain"; 13 of the 25 closings that opened "Look
     again at" and 7 of the 17 introductions that opened "Watch the" were
     reworded; the "With N recorded strokes it is the most worked drawing in
     the room" formula and the "It is the first" opener were each varied in
     about ten places. Numbers were not changed, only sentences dropped or
     rephrased. The approved pilot room kept its text except two global
     fixes (a points sentence and a cross-room comparison). Left alone on
     purpose: the per-work readings still open with the part named ("The
     teeth are", "The eyes are"); they appear one per artwork page, where
     the inventory voice is right, and the review pages exaggerate the
     effect by stacking them. Review pages (private artifacts, republished):
     NNOTB part 1 <https://claude.ai/artifact/FP22mn2GY6BnZQoAfrpZg3>, parts 2 and 3
     <https://claude.ai/artifact/5rRpXDKJsgKZ5Yngi2PcUr>, Faces <https://claude.ai/artifact/EjrMVjrrTuAKqJxry78UF8>,
     the rest <https://claude.ai/artifact/GuzCegaGfP6wNS7eJSBvoQ>.
5. **Wire the new structure into the Astro site** on the branch, including the
   map page.
   - Done October 15, 2026. `src/lib/exhibitions.ts` builds wings, parts and
     rooms from `structure/` and `rewrite/`; the wing pages show the wing and
     part introductions and the rooms with their themes and UTC date spans;
     room pages show the introduction, chapters, labels, one-liners, silent
     works with their captions, in-room comparisons, the related item on
     Occasions and Figures, and the closing with its two works; artwork pages
     show the room reading, "Work n of m in Room, Wing", a UTC "Recorded"
     instant that the browser annotates with the viewer's local time, and no
     Central-time fact. The old per-artwork "Related works" connections and
     the collector's earlier-account panel on the wing pages are no longer
     shown, so no page outside the front page carries the collector's words
     or the earlier voice. The front page carries the collector's statement
     verbatim. `/map/` is an isometric map of the collection as one building on
     three floors, in the manner of a printed museum map: ground floor with
     the entrance hall, Abstract, Other nnxyz and Scrimshaw; Faces and
     Rawblocks on the second; the three NNOTB parts on the third. Rooms are
     sized by work count and colored by wing, consecutive rooms share a
     doorway, each wing or part opens off the corridor, stairs join the
     floors, and a picture legend names the wings. The collector asked for
     this after two flat drafts (October 15, 2026, with the Minneapolis
     Institute of Art map as the example); expect more iteration.
     The 31 October 14 gallery addresses
     redirect to their wings. Artwork URLs are unchanged. `npm run check`,
     `npm test`, `npm run build`, `tools/validate-site.py` and the browser
     suite pass; the browser checks now read the rooms from `rewrite/`.
   - Preview only; main deploys the live site. Merging is the collector's call.
6. **Audio tour.** `curation/exhibitions/audio/HANDOFF.md` was the prompt for
   a local session on the Mac. Done October 15, 2026: the collector chose the
   voice "echo" on `gpt-4o-mini-tts` (`curation/voice/voice.json`), confirmed
   the three spoken forms and ruled out speaking titles; 785 segments, about
   201 minutes, are published write-once under `audio/` and recorded with
   spoken text, hashes, durations and request ids in
   `curation/exhibitions/audio/manifest.json`. The player is on every room
   page: `src/lib/tour.ts` joins the manifest to the room's segments by index
   (`TourPlayer.astro`, `src/scripts/tour.ts`); "Play the audio tour" shows
   the length, a fixed bar carries pause, previous, next, progress and stop,
   each stop brings its work on screen and outlines it, silent works hold for
   their seconds, Escape ends the tour, and the page reads the same without
   it. `tools/validate-site.py` checks every embedded audio key against
   `data/media.json`.
7. **Screen saver.** Done October 15, 2026, and reworked the same evening at
   the collector's request: `/screensaver/` draws each Nifty Ink work stroke
   by stroke from its archived brush paths at 0.7× the artwork page's
   reconstructed pace, holds the finished drawing for ten seconds, then
   moves on; the caption appears when the drawing is complete. Abstract
   works, which have no strokes, hold as stills for twelve seconds, and so
   does every work under reduced motion. The replay loader and frame painter
   are shared with the artwork viewer (`src/scripts/replay.ts`). Shuffled
   across all 626 works; `#room=<roomId>` or `#wing=<wingId>` limits it, and
   each room's closing links to its own. Space pauses, arrows step, F or the
   button enters fullscreen, a hidden tab pauses the clock. A drawing that
   fails to load falls back to its still. Stills use the 2000 px WebPs;
   `tools/validate-site.py` checks them against `data/media.json`.

8. **llms.txt and the curator's notes.** Done October 15, 2026, at the
   collector's request: `/llms.txt` (llmstxt.org index of wings, rooms and
   pages) and `/llms-full.txt` (the complete gallery text), both built from
   the room files by `src/lib/llms.ts`; `/notes/` is the one page that says
   who the curator is and how the site was made, without naming a model.
   `tools/validate-site.py` checks every page the llms files link to.

## Where the branch stands

Everything through the curator's notes and `llms.txt` is merged to main and
live. Every check passes (lint, format, type check, unit tests, ruff, infra
validation, build, site validation and the browser suite, which plays a
tour and runs the screen saver). Main deploys the live site on every push;
the collector asked for the October 15 work to be merged as it was finished.

Open for the collector:

- Listen to one room end to end for pacing. The breath between segments is
  `GAP_MS` in `src/scripts/tour.ts` (700 ms) and silent works hold for the
  room's `silentHoldSeconds`; both are one-line changes.
- The map is the third draft; the collector wants it to read like a printed
  museum map and may want more iteration.
- The delivery stack's write-once policy needs a reviewed change set so it
  also covers the new `audio/` prefix; `infra/delivery.json` already lists
  it. Until then a site deploy is not blocked from writing `audio/` keys,
  though nothing in the deploy writes there.
- The audio key in the local `.env` expires about seven days after October
  15, 2026. A changed segment needs a re-render on the Mac before then or a
  new key after.

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

- Dates and times are UTC, from the archived creation timestamp (collector,
  October 15, 2026: this is a global gallery). Structure files carry
  `recordedAt` (exact UTC instant) and `recordedDate` (its UTC calendar date).
  Written and spoken text uses UTC dates. The site may localize the exact time
  for the viewer in the details panel; the static fallback is UTC and says so.
  132 of the 574 dated works have a different calendar date in UTC than in
  Central, so never reuse Central dates from older files.
- `collection/` bytes are immutable. Published media is write-once.
- Commits end with the co-author line the session supplies. No model names
  in commits, code or pull requests.
- Never verify anything by writing to live data.
