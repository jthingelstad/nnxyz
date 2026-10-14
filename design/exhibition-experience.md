# Curated collection experience — October 14, 2026

The collector wants a museum experience that connects and explains the work,
and hopes to learn something while browsing. This supersedes the earlier
grid-first entrance. It is a design direction and content proposal, not a
record of implementation or publication.

## Entrance

A pure white page, with three short first-person welcome paragraphs on the
left in dark gray serif type and one native SVG drawing replay on the right.
Keep navigation and controls in quiet neutral sans-serif. The collector's
welcome remains separate from AI editorial readings. The saved introduction
is a draft, not an approved quotation.

The drawing begins automatically when visible, plays continuously within
strokes, and holds its finished image. Expose pause, seek, speed and replay;
label timing as reconstructed. Reduced motion starts with the native still
and optional playback. Select the opening work after checking visual clarity,
loading cost and replay fidelity; the concept portrait is illustrative.

Four open entrances follow: **Faces**, **On the Block**, **Rawblocks**, and
**Other & related**. There is no All Works link, global artwork grid, or
catalog-first entrance. Other nnxyz works and Scrimshaw keep their separate
creator and collection identities under the fourth entrance.

The shared light/dark choice remains, white by default with explicit choices
persisted before first paint. Artwork retains its original drawing canvas,
color and alpha. On small screens, welcome, drawing and collection entrances
follow in a clear vertical sequence.

## Collection wings

Each wing offers a short introduction and a recommended starting exhibition,
followed by its other galleries. Each entrance has one representative work,
a short title and a sentence stating its question. Avoid product-card chrome,
repeated kudos controls, counts as promotional badges, filter bars and sorting
menus. Collection names and original artwork titles are different layers.

On the Block is the largest wing. Organize its gallery entrances into a few
legible editorial sections, recommend several different starting points,
and let visitors choose a question rather than inspect fifteen equal tiles.
The grouping of entrances will be decided after reviewing the saved map.

Every owned drawing has exactly one primary home in a gallery. The proposed
map starts around twenty works per gallery, with thirty as a hard maximum.
Smaller groups are acceptable when an exhibition is complete; do not pad it.
Additional cross-collection comparisons require specific inspected-image
evidence and remain optional extensions rather than global browse links.

## Galleries as exhibitions

Each gallery has a question, an opening, development, a meaningful contrast,
and a closing. Around four chapters make twenty works consumable. A chapter
introduction explains what to notice in twenty to forty words. Artwork leads:
large individual images, selected pairs, occasional small groupings, and
generous space. Do not show the full gallery as a dense thumbnail grid.

Every artwork's inclusion has a specific role. Every transition explains a
visible connection or contrast with the immediately preceding work. The
visitor can test the reading by looking: follow an outline, compare two
mouths, locate a repeating mark, or watch how a figure's boundary changes as
its drawing is replayed. Avoid instructions to feel a particular emotion.

The published layout may combine selected adjacent works into a pair, but
must preserve the recorded sequence and explain the visual reason. The
current content review deliberately displays the entire sequence for review;
it is not the final page-layout specification.

Individual artwork pages retain stable CID URLs, native SVG stills,
enlargement, continuous replay and quietly available provenance. Entry and
return links lead through the artwork's home gallery and collection.
Per-artwork kudos remain tied to the same canonical artwork path, placed on
the individual view without competing with the exhibition.

## Review and implementation

The content artifact is `curation/exhibitions/map.json`, with a local visual
review in `curation/exhibitions/review.html`. It preserves the original labels
and short routes. New exhibition prose has separate prompts, receipts,
image hashes and review evidence. AI review is not individual human approval
or a visitor study.

Review the collection map and one complete visitor journey before applying
the page system throughout the site. Implement with the existing Astro and
TypeScript baseline. Test mobile, tablet and desktop; light and dark themes;
keyboard use; reduced motion; gallery navigation; canonical artwork URLs;
and a sparse and dense replay. Run the established local checks for meaningful
viewer/layout changes. Preview analytics remain disabled. Hosting, DNS and
deployment are separate from local content and design work.
