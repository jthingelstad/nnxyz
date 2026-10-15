# Exhibition map — October 14, 2026

This is the content foundation for the collector's museum direction: welcome,
collection wings, bounded exhibitions and individual artworks.

**Superseded on October 15, 2026.** The site now hangs every work in the
rooms of `structure/` (locked wings, parts and rooms, formed from the images)
and shows the unsigned gallery text in `rewrite/` (introductions, labels,
captions, readings and audio tour segments). `HANDOFF.md` records that pass.
The files below are preserved as the October 14 record; their gallery
addresses redirect to their wings.

- `map.json`: 28 AI-reviewed exhibition drafts covering all 574 owned drawings,
  exactly one primary gallery per stable drawing CID. Sizes range from 8 to 30;
  the average is 20.5. Seven Faces, fifteen On the Block, three Rawblocks, two
  other nnxyz and one Scrimshaw exhibition. The latter two groups share the
  proposed Other & related entrance while retaining distinct identities.
- `review.html`: locally browsable chapter sequences, artwork roles and
  transitions. Open a gallery to inspect it. This is a content review, not the
  final visitor layout. A suggested first look is A Figure in Open Space.
- `brief.json`: collector direction, scope and finite one-time inference caps.
- `plans/`, `partition/` and `nnotb-themes.json`: source-backed candidate
  memberships, explicit alternative reasons and bounded placement decisions.
- `galleries/`: final draft exhibitions with image-review and editing evidence.
- `sheets/`: derived, uncropped image sheets, their exact hashes and per-cell
  source image hashes. Three original anchor PNGs were also supplied for every
  gallery. These are review assets, not replacements for native artwork SVGs.
- `prompts/` and `receipts/`: exact system/instruction text, structured output
  schema, model identifiers, request IDs, response text, metered usage and image
  inputs. Saved incomplete or rejected responses remain evidence, not accepted
  exhibition outputs.
- `wording/`, `assistant-wording.json` and `collection-introductions.json`:
  preserved earlier prose and separately attributed AI editorial corrections.
  These tighten museum invitations without changing individual labels,
  memberships or technical artwork facts.
- `assistant-spot-checks.json`: direct assistant inspections of eleven ensemble
  sheets containing 114 distinct artwork thumbnails, with specific corrections.
  This is not full-resolution assistant inspection of every original image.
- `transition-reference-audit.json` and `reference-expansion.json`: checks that
  explicit transition references concern the preceding/current works, and
  exact expansion of model transport aliases into original titles while
  retaining stable CID reference edges. Repeated titles remain distinct works.
- `source-baseline.json` and `verification.json`: unchanged source fingerprints,
  complete coverage, gallery ceiling, image/prompt hashes and review checks.

## Editorial method and limits

The pass used the existing authorized `cloud-engineer` access to Bedrock in
`us-east-1`, with `us.anthropic.claude-sonnet-4-6`. Collection planning used saved
image-backed readings, followed by separate multimodal exhibition draft and
review calls. On the Block required six smaller complete-inventory batches;
two earlier long-list plans were rejected for omissions and duplication.
Five placements used explicit model-proposed alternatives to respect the
30-work ceiling, then received gallery-level image drafting and review.

Each gallery was reviewed against uncropped ensemble sheets and three original
anchor images. Sheet-scale review supports grouping, visual correspondences
and sequence judgments; it does not establish fine detail in every image.
The assistant's visual spot checks and prose corrections supplement those
reviews. All exhibitions remain AI editorial drafts, not artist-declared
groupings, individual human approval, a blinded benchmark or a visitor study.

Structured output is used according to the [Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html),
with deterministic membership and provenance validation afterward. Incomplete
lists, repeated stops and unsupported detail required corrections; valid JSON
alone is not curatorial acceptance. The initial unstructured planning response
hit its output limit and remains recorded. Oversized transport images and
oversized experimental schemas were rejected before usable inference results;
they are not included as successful model responses.

Saved response usage totals 1,335,963 input tokens and 232,149 output tokens
across 91 receipts, including rejected draft attempts. These are response usage
records, not an invoice or a claim that provider billing has been reconciled.
No new credentials, IAM permissions, subscriptions or infrastructure were
created. Models are not invoked by website builds, assembly or verification.

Imported collection files and the permanent archive are unchanged. The source
validator compared all 11,599 copied files against the archive. Existing labels,
dossiers, five short routes and collector statements retain their bytes and
timestamps. New work is separate under this directory.

## Offline review and verification

```sh
python3 tools/build-exhibition-review.py assemble
python3 tools/build-exhibition-review.py verify
python3 tools/verify-curation-catalog.py
python3 -m http.server 4399 --bind 127.0.0.1
```

Browse `/curation/exhibitions/review.html#nnotb--open-fields` on that local server.
The review contains no analytics script or external artwork requests.

Sheet generation uses Pillow, the system Arial font and JPEG95 or original PNG
review encodings, preserving whole canvases. The calling environment used the
bundled Pillow 12.3.0 runtime. Do not overwrite image inputs retained by
receipts; a future method change needs a new evidence version.

The one-time metered tool is `tools/curate-exhibitions.py`. Its explicit stages
are plan, partition, galleries, wording and canvas; saved valid outputs are reused.
Do not run it as part of a gallery build or regenerate existing labels. Future
editorial work should use a new version and preserve this pass's evidence.

## White-canvas fidelity correction

The final pixel audit found 33 source PNGs with nonopaque pixels. V1 ensemble
sheets had dropped alpha rather than displaying it over the original white
canvas. Original source bytes were never changed. Corrected sheets and larger
white-composited views are preserved under `sheets-white-v2/`; all nine affected
galleries received a separate saved multimodal follow-up. The earlier inputs
and receipts remain intact. `white-canvas-verification.json` confirms exact RGB
pixels and original dimensions for all 33 corrected larger views. A regression
check covers transparent, translucent and opaque source pixels.

One concern required broader framing: Dark Marks and Bright Areas now explicitly
includes luminous heads as contrasts to darker marks and surroundings. The
assistant inspected the corrected original views and recorded the resolution
in `canvas-concern-resolutions.json`; this is AI editorial review, not human
approval. Software also corrected nine chapter-count phrases after final
membership changes, with preserved prose in `chapter-count-corrections.json`.

## Repository delivery

The website no longer imports `map.json` or `presentation.json`; since
October 15, 2026 it reads `structure/` and `rewrite/` (see `HANDOFF.md`), and
`tools/retired-galleries.mjs` turns the October 14 gallery addresses into
redirects. Editorial records, prompts, receipts and source/input hash manifests are
versioned. Generated review JPEGs and white-composited PNGs remain locally
preserved but are ignored by Git, like website media and imported artwork. They
are not served by the static website. Hydrating the pinned source snapshot
provides the original artwork for site builds; it does not restore those local
review-image outputs. Retain the existing review pixels when inspecting exact
historical image inputs, rather than overwriting them during a routine build.
