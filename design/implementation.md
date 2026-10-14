# Gallery implementation baseline

The collector approved building the October 13 v2 concepts as the baseline. Active references: `concepts/2026-10-13-v2/collection-desktop.png`, `artwork-desktop.png`, and `artwork-mobile.png`.

Use Astro and TypeScript for static artwork pages with a small client-side viewer. No cloud service or live curator inference is required. The saved curation catalog is the source of labels and relationships.

Tokens: pure white `#fff`, primary `#171717`, secondary `#555`, quiet controls `#777`; Helvetica Neue, Helvetica, Arial, sans-serif, regular weight. Desktop collection gutter 4vw, three equal columns with 2vw gaps. Grid labels 16px; collection navigation 16px; desktop header navigation 15px. Mobile artwork title 18px, reading 13px, header wordmark 16px. On the artwork page, centered full square artwork, approximately 61% of a square desktop concept width, then one playback row, modest label and curator paragraph. No dividing rules, cards, rail or shadows. On mobile, 7% gutters, art before the title, vertical text flow and the same quiet controls. Icons: small outlined heart, triangle play, simple arrows/reset/enlarge, current text color.

Initial gallery order reproduces the six artwork references in the concept, followed by the remainder of the owned catalog. Collection filters have stable URLs and work without client JavaScript. Artwork routes use drawing CIDs. The collection introduction appears lower down and on About; its first-person copy is an edited draft of the collector response.

Continuous replay reveals one SVG brush path progressively while preserving completed paths and hiding future paths. No original timestamps exist: use reconstructed path-length pacing. Default to finished artwork, start only on visitor request, and expose pause, seek, speed and reset. Respect reduced motion for optional effects. Built-in browser fullscreen is the baseline enlargement experience; PixiJS flourishes remain a later refinement.

Tinylytics loads only when explicitly enabled for production and the browser hostname matches the public domain. Preview kudos controls explain that kudos become available on the published gallery. No fake counts or production traffic during QA.

Implementation/QA evidence is recorded in `qa-baseline.md`. Source artwork and curation records remain immutable.

Full artwork pages use SVG for every drawing. Dense works above 12,000 points use the archived PNG as browsing thumbnails; native vectors total about 1.5 GiB. This preserves accurate full artwork while preventing enormous gallery grid downloads. SVG HTTP compression is required when choosing production hosting.

October 13 theme extension: collector requested a visitor-switchable dark mode. Shared header offers Dark/Light with moon/sun icons; default white, optional pure black with light neutral text. Save the explicit preference locally and apply it before first paint. Browser storage failure must not block switching. Theme changes do not recolor artwork, reset replay or alter downloads. White drawing canvases remain beneath translucent/unpainted strokes; fullscreen/dialog surrounds follow the selected theme.

## October 14 exhibition entrance and chapter system

The collector authorized the museum direction and the 28-gallery map, then
asked to proceed with the collector welcome deferred. The local implementation
now supersedes the grid entrance. Reference concepts and the implementation spec
are in `concepts/2026-10-14-exhibitions/`; these new concept images are working
references under that authorization, not separately recorded human approvals.

The entrance reserves the left-hand welcome space and continuously replays
Nifty Faces #72 on the right. Replay holds the finished still for five seconds,
then repeats; an explicit pause, seek or reset cancels the automatic sequence.
Offscreen or hidden pages stop playback. Reduced motion starts on the native
still. Timing remains explicitly reconstructed.

Four collection entrances lead to 28 bounded exhibitions. Collection wings
feature a starting gallery, then open editorial lists. On the Block's remaining
choices are grouped under figures/company, places/marks, and heads/features.
Other nnxyz and Scrimshaw retain separate sections under Other & related.

Exhibitions show one chapter at a time with a solo opening work and adjacent
pairs. The saved sequence is preserved; connections and artwork readings are
optional disclosures, and each exhibition ends with its saved closing question.
Without JavaScript the complete sequence remains readable. Hash links support
chapters and exact artwork returns. Canonical CID pages keep their existing
native still, replay, enlargement, downloads and kudos. Previous/next links now
follow the artwork's home exhibition, separately from archived title order.

The collector welcome is represented only by a temporary neutral notice.
Generated concept artwork, incorrect example titles and split chapter numbering
are never used as source content. The complete gallery introduction is available
behind a disclosure so artwork reaches the first viewport sooner. Two stale
single-work chapter phrases have separately recorded presentation corrections
in `curation/exhibitions/presentation.json`; the saved map, receipts and labels
remain intact. No new curatorial model calls or publication occurred.

## October 14 visible text and blockchain provenance

The collector requested visible text instead of disclosure triangles. This
supersedes the optional-note and collapsed-introduction choices above. Gallery
introductions, artwork readings, comparisons, collection history and artwork
details now appear as ordinary text, without their former expand labels.
Chapter navigation still presents one chapter at a time when JavaScript is
available; without it, the complete exhibition remains readable.

Each artwork caption includes a quiet token provenance anchor. Nifty Ink pages
read exact token identities, snapshot wallets/blocks and transaction hashes
from the immutable archive at build time. Tokens remain distinct by chain,
contract and token ID, and transactions link to their recorded network,
including Gnosis transfers before the archived Ethereum upgrade. About links
both archived collector wallets. Abstract links its recovered Polygon identity
without inferring a wallet or current ownership. No live wallet connection or
blockchain lookup is needed to browse the gallery.
