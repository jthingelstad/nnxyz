# Depth plan: feeling, message and the artist's project

Status: proposal for the collector, October 16, 2026. Follows the collector's
decision the same day to remove the rule against saying what the artist meant
or felt (`curation/voice/style-guide.md`, section "Feeling and message"), and
the on-chain research in `curation/research/onchain/`.

## What is missing today

The rooms describe accurately and hang well, and after a visit the collector is
left asking what nnxyz was saying. Three causes, all designed in:

1. The text was barred from reading feeling or message. Every label stays with
   the marks.
2. The site knows nothing about the artist beyond the drawings: no words, no
   project, no before or after.
3. The one unique asset, the ordered stroke record of 548 drawings, is shown
   one work at a time and never analyzed.

## What we now have to work with

- **The artist's words.** The bio line "born readymade to please the eye"; the
  contract description of the "nnxyz index collection" ("an open never-ending
  collection published independently on multiple blockchains ... planned
  completely openly"); the titles "i was famous", "lord of the inks", "Heaven
  or Hell", "oink", "opticals"; the series names themselves.
- **The artist's actions, dated.** 593 inks from October 26, 2021 to
  December 5, 2024. Series closed with an origin work and 2,967 unsold edition
  slots minted to a dead address, 1,572 of them in March 2023. Gifts to named
  people. Austin Griffith funding the mainnet wallet on February 1, 2022 and
  buying 18 inks. 346 likes of other artists' inks, led by jasperart.eth,
  ekeko.eth, dashmdash.eth, danielsheldon.eth and chiliprawn.eth, continuing
  through 2024. Three new inks in December 2024, sold to the collector.
- **The artist's later work.** "i was famous" (Duchamp's Fountain in a Warhol
  grid) and "lord of the inks" (a mosaic of about 500 of their own inks) on
  Ethereum; "Heaven or Hell", "oink" (painterly landscapes) and "opticals"
  (generative scatters) on Optimism. The collector owns six of these.
- **The collector's place in the record.** 121 of 283 payments and about half
  the artist's Nifty Ink income; two children's wallets buying on the first day;
  the complete sets delivered by direct transfer. The collector is named, the
  wallets are named (thingelstad.eth, nnxyz.thingelstad.eth,
  niftyink.thingelstad.eth), and the collector's own account of why can sit
  beside the ledger (collector's decision, October 16, 2026).
- **The stroke record.** Order, width, color and alpha of every mark in every
  Nifty Ink work, already parsed for replay.
- **A changed rule.** The gallery may now read feeling and message, grounded in
  the picture, the record and the artist's sourced words.

What we do not have: a reply from the artist (emailed October 15), the X posts
in readable form, the deleted Notion plan, and the artist's activity on Base,
Arbitrum, Zora and the rest of Polygon.

## The plan

Six workstreams. A and D are the heart; B and C give them something to stand
on; E ships it; F is ready if the artist answers.

### A. Rewrite the rooms for feeling and message

The rooms stay where they are. The text changes.

- **Thesis first.** Before any room is rewritten, write a one-page argument for
  the whole collection and one paragraph per wing: what the Faces are about,
  how On the Block changes across its three parts, what Rawblocks is doing,
  how Abstract and the later work answer the inks. The thesis draws on the
  record (the closing, the burn, the titles) as much as on looking. The
  collector reads and marks it up before any label changes. This is the step
  that answers "what was nnxyz saying", and everything below inherits it.
- **Room by room.** Each room's introduction states what the room feels like
  and says, chapter openings move that argument, labels carry it on the works
  that can bear it, and the closing lands it. The "Dark" room in Faces is the
  pilot: its works already read as skulls and hoods coming out of black, and
  the new text can say what that darkness is for.
- **Method, unchanged in discipline.** One session per room, the wall at full
  size, the dossiers, the thesis, and the on-chain record. A separate
  image-backed review call checks every reading against the picture, as
  before. Readings that rest on the record say so in the sentence.
- **Captions and tour segments** are rewritten only where the feeling changes
  what the one thing to see is. Every changed segment is re-recorded
  (`curation/exhibitions/audio/HANDOFF.md`), and the room's audio manifest is
  regenerated. Expect most rooms to change.
- **Wing essays.** Each wing gets one longer essay, 600 to 900 words, placed
  under the wing's entrance so it does not compete with the art. Unsigned,
  like the rooms, now that the voice may read.

### B. The artist's project

A new page, working title "The project", and the matching corrections to
`/notes/` and `/about/`.

- **Timeline** from the first ink to the last, with the series, the origin
  works, the closing burns, the gifts, the move to Ethereum and Optimism, the
  return in December 2024. Every date from the ledger or the archive.
- **The scene.** Nifty Ink as Austin Griffith built it, the first funding, the
  buyers, the people the artist liked and gave to. A map of that circle with
  the wallets on it: ENS names where set, shortened addresses otherwise, each
  linking to the explorer. Transaction-level detail (the burn-mints, the gift
  transfers, the first funding) is shown where it carries the story.
- **The collector in the record.** One section stating what the ledger shows
  about this collection's purchases and the delivery of the complete sets, with
  the collector's own words on it where the collector wants them.
- **In the artist's words.** The bio line and the index-collection
  description, verbatim, cited.
- **Notes page.** Replace "It does not say what the artist meant" and "It is
  not research into the artist" with what is now true: the text reads feeling
  and message, grounded as described, and the artist research is on the
  project page with its sources and limits.

### C. After Nifty Ink

A small room, five to eight works, for what the artist made next.

- The six works the collector owns on Optimism: oink #1, opticals #7, #264,
  #268, #295, and Heaven or Hell #3. Stills with enlargement and downloads,
  like Abstract. Images come from IPFS, which this container reaches only
  through one gateway; fetching on the Mac is more reliable.
- "i was famous" and "lord of the inks" shown as reference images with a link
  to the token, clearly marked as not in this collection, because they are the
  artist's own comment on the inks and the room is incomplete without them.
- A new data file and media keys under a new prefix, following the Abstract
  pattern (`data/abstract.json`, write-once media). No stroke data, no replay.

### D. How nnxyz drew: stroke analysis and technique

The collector agreed to a computational study. It produces facts the essays can
use and a technique section visitors can see.

- **Measures, across all 548 Nifty Ink works** (saved under
  `curation/analysis/strokes/` with method version and source hashes):
  - order of operations: whether the ground comes first, when the widest
    strokes fall, when the finest fall, the point in the sequence at which the
    face is legible;
  - coverage over time: canvas area covered after each tenth of the strokes;
  - overpainting: how much of each stroke lands on paint already laid down,
    and how often a finished passage is buried;
  - palette entry order and palette size over the sequence;
  - width and alpha profiles per series and per part of NNOTB;
  - sessions: works per UTC day and hour, runs of consecutive days, the gaps;
  - forks and repeated titles compared stroke by stroke.
- **Technique section.** For ten to twelve works chosen from the measures (a
  sparse early Face, a dense late NNOTB, a Rawblocks landscape, a fork pair),
  render the drawing at fixed points in its sequence (after 10, 25, 50, 75 and
  100 percent of the strokes) with the same renderer the replay uses, and show
  the row with a short reading of what the hand did between frames. One page,
  "Technique", plus a strip on those works' artwork pages.
- **What it feeds.** Room text may cite a measured fact ("the black ground is
  laid down first in every work here"). Numbers stay in the details panel; the
  sentence carries the finding.

### E. Ship

- New pages: project, technique, after-Nifty-Ink room, wing essays; revised
  notes and about; the front-page welcome text the collector deferred, now
  written against the thesis.
- Audio: re-record every changed segment, rebuild manifests, verify durations.
- Site checks: `npm run check`, `npm test`, `npm run build`,
  `tools/validate-site.py` (sitemap count will change), browser suite.
- Publication through the main-branch pipeline, media published once under new
  keys.

### F. If the artist answers

Six questions, ready to send or to use if a reply comes:

1. What were the Faces for, when you started in October 2021?
2. New Nifty on the Block is 303 drawings in a year. What changed as it went?
3. Why Rawblocks, and why end there?
4. You minted the unsold editions to a dead address. What did closing mean?
5. "i was famous" and "lord of the inks": what are they saying about the inks?
6. "born readymade to please the eye": whose eye?

Any answer goes on the project page verbatim, dated, as the artist's words. No
other page depends on a reply.

## Order and effort

| Phase | Work | Output |
| --- | --- | --- |
| 1 | Collection thesis and wing paragraphs; stroke-analysis script and first measures; project page draft | Documents for the collector to mark up |
| 2 | Pilot room rewrite ("Dark") with review; technique renders for the chosen works | One room live on the branch for the collector |
| 3 | All rooms rewritten and reviewed; wing essays; after-Nifty-Ink data and media; notes and about | Complete text on the branch |
| 4 | Audio re-recorded; welcome text; QA; publish | Live site |

Phase 1 can start now. Phase 2 waits on the thesis being read. Phase 4 needs
the Mac for audio and media.

## Decisions for the collector

- Confirm "Dark" as the pilot room, or name another.
- Confirm showing the two mainnet works as reference images not in the
  collection.
- Whether wing essays stay unsigned like the rooms (recommended) or carry the
  notes-page style attribution.

Settled October 16, 2026: naming the collector, naming wallets and showing
on-chain detail are all fine. The earlier rule that pages show no transaction
histories or address lists applies to artwork pages, where it keeps the
clutter down, not to the project page.

## Risks

- Readings can slide into generic art writing. The review pass and the habits
  list stay; the thesis keeps rooms from each claiming the same feeling.
- Wallets are addresses, not proof of a person. The project page says so once
  for third parties; the collector's wallets are the collector's.
- The artist may object to the reading of the burns or the later titles. The
  text states them as the gallery's readings resting on the record, and a
  reply from the artist replaces them.
- Audio cost and time: most segments change; plan one recording session per
  wing.

## TaskPaper

- The nnxyz Rooms: depth plan @parallel(false)
	- Write the collection thesis and wing paragraphs
	- Build the stroke-analysis script and save first measures under curation/analysis/strokes/
	- Draft the project page from curation/research/onchain/
	- Rewrite the Dark room as pilot and run the image review
	- Render technique sequences for ten to twelve works
	- Rewrite all rooms, with review
	- Write wing essays
	- Build the after-Nifty-Ink room: data file, media on the Mac, page
	- Revise notes and about pages
	- Write the front-page welcome text
	- Re-record changed audio segments and rebuild manifests
	- Run check, tests, build, validate-site and browser suite
	- Publish
	- Send the six questions to the artist if no reply arrives
