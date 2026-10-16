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

A room for what the artist made next. The depth pass of October 16 found 38
owned works new to the site (58 tokens; three Polygon contracts were re-issued
and the collector holds both copies of 20). Their originals and metadata are in
the ignored `collection/recovered-onchain/` with a manifest, and
`data/onchain-works.json` is the draft data file, unwired.

- Optimism and Ethereum: oink #1, opticals #7, #264, #268, #295 and s2 #71,
  Heaven or Hell #2 (Ethereum) and #3 (Optimism and Arbitrum).
- Polygon: seven "nifty faces px" (the pixelated twins airdropped to Faces
  holders in April 2022), 22 chic city cat club, 14 Friends Of Country Air,
  four cringe-eez doodles, pxlpop, and "nnxyz" #5.
- Tezos (collector wallet tz1ScjmJ…, alias jthingelstad): Heaven or Hell ×6,
  untitled #19 and #37, opticals #1, kanji #1, i send you summer 1, GMGL #1,
  shrine of - create, try, hope, die. Record in
  `curation/research/onchain/tezos.json`; files still to fetch.
- Stills with enlargement and downloads, like Abstract. The px twins may hang
  beside their Faces on the artwork pages as well as in the room.
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
  notes and about. The front page keeps the collector's statement as its
  welcome (collector's decision, October 16, 2026).
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
| 4 | Audio re-recorded; QA; publish | Live site |

Phase 1 can start now. Phase 2 waits on the thesis being read. Phase 4 needs
the Mac for audio and media.

## Decisions for the collector

- Confirm "Dark" as the pilot room, or name another.
- Confirm showing the two mainnet works as reference images not in the
  collection.
- Whether wing essays stay unsigned like the rooms (recommended) or carry the
  notes-page style attribution.

Settled after the depth pass (collector, October 16): re-issued pairs are one
entry with both token ids; the artist's email reply is saved verbatim if it
comes; the S3 pin happens with the collector present once the After Nifty Ink
data is final; Fantom and Tezos were searched (Tezos found, see
`curation/research/onchain/README.md`; Fantom still needs an explorer key).

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
	- Re-record changed audio segments and rebuild manifests
	- Run check, tests, build, validate-site and browser suite
	- Publish
	- Send the six questions to the artist if no reply arrives

## Progress (October 16, 2026)

- Faces wing: six rooms rewritten in the new voice (commit 7e1d14d).
- New Nifty on the Block: all thirteen rooms and the wing and part
  introductions rewritten; review sheets `review-nnotb--*.md`; audio stale.
  The rooms now carry the story the ledger tells: the collector's first
  purchase from the series (#16, May 1, 2022), the Terra week in Beams, the
  gifts (#100, 200 and 300 nifties), the burn announcement of August 11, the
  Merge day in Portraits, and the October 16, 2022 handover, when the
  collector bought #0000 for 750 xDai and received 275 works that afternoon.
- `curation/research/onchain/collector-acquisitions.json`: the first inbound
  transfer of every owned Nifty Ink work into a family wallet (date, wallet,
  kind, price), the source for "collected on" facts on artwork pages.
- `tools/room-review-sheet.py` writes a room's review sheet.
- Rawblocks (four rooms), Abstract (two), Other nnxyz (two) and Scrimshaw
  (one) rewritten the same way, with their wing introductions. All 28 rooms
  now carry the depth-pass voice and have `tour.audioStale` set; the audio
  tour is hidden on every room until the Mac re-records it.
- After Nifty Ink (workstream C) is built: `data/onchain.json` (46 works,
  `tools/build-onchain-catalog.py`), the wing `after-nifty-ink` with two rooms,
  Twins and Cats (20) and The Index and After (26), artwork pages with stills,
  animations and original downloads, the screen saver and map. The Mac published its 238 media keys the same evening
  (commit 21e380e); the wing is live on the branch and the build is 748 pages.
- The census: `curation/research/onchain/census.json` (tools/build-census.py)
  groups the artist's 43 contracts on eight chains into 18 collections with
  works, 13 of which the collector holds from, and `/catalogue/` shows it on
  the site: Nifty Ink by series, the held collections with links to their
  rooms, the five not held (i was famous and lord of the inks, objkt Paint
  98, hic et nunc, OpenLike, BasedCaps), and the shared contracts. Rarible's
  shared contracts (Rari Masks) remain to be scanned on the Mac.
- The story layer is built (commit after de94ec1): `/story/` with the five
  pages (Nifty Ink, The collector, The project, 2022, In the artist's words)
  as Markdown under `curation/story/` with sources in the front matter,
  rendered by `src/lib/story.ts` and carried into `llms-full.txt`;
  `tools/build-story-facts.py` writes `facts.json` (how and when each
  Nifty Ink work reached the collector; the artist's post announcing it,
  263 works), `timeline-2022.json` (month counts and dated events) and
  `words.json` (the thirty posts and the bios). Artwork pages print the
  artist's post with its date and price and say how the work was collected
  in the details panel; the header, front page, about, notes and each wing
  entrance link into the story. `tests/test_story.py` checks the pages and
  that only the collector is named. Build 754 pages; browser suite green.
- The collector read the story pages on October 16 and accepted them as
  written, and decided the front page keeps his statement as its welcome.
- Next: audio re-recording on the Mac, then clearing `audioStale`; publish.

## The story layer (added October 16, 2026)

The collector's instruction: tell the whole story, show the art, and help
people connect and feel it. No limit on naming the collector, the platform,
the people or the market. This section is the plan for that.

### Background articles (long-form pages, unsigned gallery voice)

Drafts live in `curation/research/story/`; each becomes a page under `/story/`
with an audio reading like the rooms. Every fact cited to the archive, the
ledger, the artist's posts or the collector's published writing.

1. **Nifty Ink.** The origin: Austin Griffith's drawing board, launched in
   August 2020 on the xDai chain, "putting the fun in non-fungible tokens";
   burner wallets, strokes saved to IPFS, editions for a few cents, the
   upgrade to Ethereum. Why the board recorded every stroke, which is why this
   site can replay them. The community on it: Griffith funding nnxyz,
   jasperart, ekeko, scrimshaw, the Gitcoin grant the collector found it
   through. The artist's own words about the board. Sources: Decrypt, August
   28, 2020; the xDai project page; the 1Hive post of September 2020; the
   artist's posts of March 2 and August 11, 2022 and June 1, 2024; the
   collector's Weekly Thing #216.
2. **The collector.** Jamie Thingelstad's story in his words and the ledger:
   finding Nifty Ink through its Gitcoin grant in March 2022 ("this isn't about
   going to the moon"); the first nnxyz purchase on April 14, 2022; becoming the board's top collector the next day; the Ukraine ink; the HELLO
   gift to newsletter readers; the artist's gifts (editions
   minted straight to his wallet on April 25, May 23 and June 20, 2022); the
   complete sets; fan art #0001; the Thanksgiving bridge of an ink to mainnet;
   "publishing again after a couple months away"; the fourth collection; the
   earlier gallery at thingelstad.com/art/nnxyz; this site.
3. **The project.** The artist's arc, already drafted in
   `curation/research/project-page-draft.md`.
4. **2022.** The year as a dated timeline: inks, posts, purchases, gifts,
   Terra (May 9 to 13), the Merge (September 15), FTX (November 8 to 11), the
   burns, and what was drawn each week. The collection's weather, with dates.
5. **In the artist's words.** The thirty quotable posts and the bios,
   verbatim, dated, with screenshots.

### Per-work facts, woven in

- **The artist's post.** 206 of the 548 Nifty Ink works can be matched by
  title to the artist's own X post announcing them (`x-posts.json`). Each
  artwork page gets "Posted by the artist on <date>" with the text, and the
  room text may use it ("posted the same night as the one before it").
- **Collected on.** The ledger gives the day each edition reached a collector
  wallet, and whether it was bought, gifted by the artist, or part of a
  complete set delivered later. Artwork pages say so in one line, in the
  details panel and once in the room text where it matters (Faces #12 came
  as a gift; the family's three inks each on May 10).
- **The market, where it touches.** One sentence per room at most, with the
  date: the glossy heads of May 2022 and Terra; the Rawblocks portraits of
  November 5 to 9 and FTX.
- **The comparison, where it is unmistakable.** Basquiat in Crossed-Out Eyes
  and the NNOTB crowns; Duchamp and Warhol in After Nifty Ink.

### Site structure

- `/story/` entrance from the header, with the five pages in order.
- Each wing introduction ends with one sentence pointing at the story page
  that bears on it.
- The front page keeps the collector's statement and adds one line into the
  story.
- `/notes/` says the story pages are the gallery's, from sources listed on
  each page.

### Data work

- `tools/build-story-facts.py`: artist-post matches and collected-on facts
  into `curation/story/facts.json`, keyed by artwork id, with the post id,
  date and text, the wallet, the date and the kind of acquisition.
- Only the collector is named. No other member of the collector's family is
  named or described anywhere on the site, in the story pages or in the
  curation text (collector's instruction, October 16, 2026). Wallets other
  than the collector's own appear in research data by address only.

