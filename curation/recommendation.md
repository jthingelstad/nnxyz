# Recommendation: a three-layer AI curator

Status, October 13, 2026: the collector accepted this recommendation and its sample-standard/exception-review approach. The full collection now has 574 factual dossiers and 574 AI-reviewed readings, with five curatorial routes. The additional 544 works received separate image-backed model drafting and review, collection-wide wording checks and targeted corrections. See `README.md`, `catalog/verification.json` and `full-pass/run-summary.json` for current coverage and evidence. The experiment described below is the preserved initial nine-work study; its counts and proposed steps describe that earlier stage.

Use an offline AI curator to prepare the collection, with an optional conversational guide built on the same evidence later. Keep the visitor's first encounter quiet: the artwork, a small identification/technique line, a short museum reading, and one or two inviting connections. The collector's introduction should establish why this particular collection matters to its owner; the AI should not impersonate that voice.

## What the experiment actually did

Measured all **574 artworks**: 548 nnxyz and 26 scrimshaw, across 633 owned editions. The records contain **113,369 recorded strokes and 21,395,046 sampled points**. Computed visible-color palettes, experimental background-adjusted palettes, title-family neighbors, creation-date neighbors and stroke-count candidate connections. Directly inspected nine original images and a comparison sheet of color-matched candidates, then drafted nine museum records and a qualitative comparison of three label approaches.

This is a feasibility/content-design pilot by the assistant in this conversation. It is not a blinded comparison, an independent-agent review, a model benchmark, a visitor test or a running chat service. The 574 machine measurements are complete; only nine artworks have editorial readings. All readings remain AI drafts.

## The format that worked best in the pilot

**Technical information:** deterministic facts inserted by software. Show artist, title, medium, recorded creation date and recorded stroke count briefly; offer dimensions, sampled points, palette method, edition/ownership and provenance on demand. Distinguish logical canvas coordinates from PNG pixels. Say “recorded strokes,” since some records include background/reference passes.

**Curatorial reading:** 45–80 words of specific visual attention. The nine drafts are 53–59 words. Describe where a visitor's eye can go: loops of teeth, repeated contours, crowded figures, large open fields, broad silhouettes and competing outlines. Emotional range is a useful interpretive lens, but “this can read as confrontational” is different from “the artist was angry.” Preserve that distinction without making the wall label sound defensive.

**Position and connections:** a separate, short orientation. Offer title-family order and recorded-creation order explicitly. Pair these with a small number of reviewed lateral links. Tell the visitor why a link is interesting: similar technique, related visual form or a revealing contrast. Avoid a single opaque similarity score.

The image-only draft could describe a piece but could not locate it reliably. Mixing every measured number into the paragraph made it feel like a data caption. The three-layer version kept the visual reading readable while adding factual depth and a route to another piece. This is the pilot's editorial judgment; visitor preference has not yet been measured.

## Findings that change the design

1. **Stroke count is useful, but it is not complexity or effort.** Faces #72 has 26 recorded lines, including two explicitly flagged background/reference passes, but 15,283 sampled points. Faces #113 has 58 recorded lines and only 403 sampled points. Their very different line behavior is obscured by a stroke-count-only ranking. Use count, point structure and visible form together. No precise point timing exists, so do not estimate making time or drawing speed.
2. **The same series contains very different visual vocabularies.** Faces #72 uses a stark skull-like head and repeated thin contours. Faces #113 builds recognition from circular outlines and overlapping pastel shapes. The curator can make that range legible without claiming it is a chronological evolution.
3. **Title order can mislead.** Rawblocks #0000 was recorded March 14, 2023, after owned #63 and before #64 in creation order, even though it appears first in numeric order. NNOTB #1 fork sits beside #1 by title but near #299/#300 by recorded creation. Forks and same-number variants need branches, not forced equivalence. Unnumbered titles should retain date-based orientation.
4. **Whole-image color matching often follows the field or frame.** Faces #113's closest whole-image candidate is Faces #114, whose drawing is very different but also uses a gray ground. NNOTB #62's yellow/white/black candidate #275 depicts a much larger figure. This is a useful color comparison, not a shared subject.
5. **Background removal is not automatically better.** On NNOTB #62, the uniform yellow border is treated as background, suppressing much of the yellow field and shifting its best candidate toward the white forms in NNOTB #257. The heuristic correctly changes the color signal, but does not establish a better curatorial connection. Retain both views; do not silently substitute the adjusted palette as truth.
6. **Some automatic suggestions are genuinely productive.** Both palette methods place NNOTB #1 nearest to #1 fork. Their images are visibly close and the titles supply a defensible relationship. A curator can then explain how title and recorded dates differ without guessing why the fork was made.
7. **Cross-artist links work best when the reason is concrete.** Scrimshaw 21 and nnxyz #1 both build a toothy head from overlapping contours, with different mark widths and surrounding space. The collector's impression of related visual and emotional range is a good framing. Similarity and overlapping publication periods do not establish contact or influence. The owned archive records nnxyz works from 2021–2024 and scrimshaw works from 2021–2023; this is a subset of each artist's output.

## How an agent would curate every artwork

1. **Prepare a factual dossier for every CID.** Use the existing measurements and archived identity/ownership evidence. Generate an image plus a lightweight stroke replay or stage sheet where it helps distinguish construction. Keep source hashes, method versions and extraction code. Count editions separately from distinct artworks.
2. **Run a multimodal editorial worker per artwork.** Give it the original image, validated dossier, collector perspective, a few nearby works and a deliberately varied comparison set. Require concrete observations before interpretation. Return structured drafts using the versioned prompt; software attaches factual values rather than letting the model invent them.
3. **Run a second collection pass.** After every piece has observations and readings, search across visual tags, measured color/count properties and later, if useful, image/text embeddings. Have the curator inspect both endpoints before promoting a candidate link. Build small thematic routes such as “heads made from repeated contours,” “figures in open fields,” “a single expression becoming a crowd,” or “restricted color, different mood.” These are interpretive routes, not artist-declared categories.
4. **Review the collection as a whole.** Check repetition, missing varieties, unsupported readings, identical titles, special pieces, mismatched evidence and outlier relationships. Compare neighboring labels side by side so the curator does not tell the same story 574 times. Keep explicit empty results when no useful connection is found.
5. **Version and publish stable editorial records.** Save prompt/model identifiers when exposed, image/fact hashes, generation timestamps, review status and revisions. Regenerate only changed records. Keep drafts distinct from accepted publication records so a model change does not silently rewrite the gallery.

Before the full automated editorial run, expand this pilot to about 25–30 pieces selected for variation and edge cases. Use that run to validate the prompt and schema, capture actual model usage/cost, and assess errors and repetition. There is no defensible API cost estimate from this conversation-only pilot. A full run should proceed after the editorial standard is agreed; the initial sample can establish that standard without requiring the collector to hand-write hundreds of labels.

## A present but quiet conversational curator

Start with static labels. Add “Ask the curator” as an optional action attached to the selected artwork, rather than an always-open chat pane competing with the picture. Give visitors useful starting questions: “What should I notice?”, “Why does this feel tense?”, “Show me another work built this way,” and “Where should I go next?”

For an answer, retrieve the current artwork's verified facts, image, editorial reading, collector perspective and a few relevant comparison records. Respond briefly and link to real artwork IDs. Use collection-wide search only when the question needs it. This can be stateless with the selected CID and a short conversation; the whole archive need not be placed in every prompt.

Make the AI attribution clear. Distinguish the collector's account, the artist's actual statements if researched later, recorded facts and the curator's reading. A guide can offer more than one reading of a mood. It should say when making time, intent or historical influence is unknown. Test these boundaries with real answers before launch; the saved pilot Q&A illustrates the answer style but is not an implemented or adversarially tested service.

## Decisions still useful before the site

- Editorial authority: should the collector approve an initial standard and review exceptions, or individually approve every published reading?
- First-time visitor emphasis: show one brief reading immediately, or let the artwork appear with a small label and invite a deeper reading?
- The collector introduction: turn the saved perspective into a short first-person draft for the collector to edit, keeping AI voice separate.
- Routes: decide whether mood-based routes should be named by the curator, by the collector, or both with attribution.

The white, modern museum presentation can follow once these content records are credible. The design should leave room for sustained looking and make alternate paths available without turning the artwork page into an analytics dashboard.
