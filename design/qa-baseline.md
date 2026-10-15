# Local gallery baseline — review evidence

Reviewed October 13, 2026. The collector approved building the revised concepts as a baseline. This is a local implementation, with no hosting/DNS changes.

## Reference and rendering method

Accepted reference files: `concepts/2026-10-13-v2/collection-desktop.png` (1672 × 941), `artwork-desktop.png` (1254 × 1254), and `artwork-mobile.png` (887 × 1774). Acceptance is recorded alongside those files.

Browser/IAB was used first for real gallery navigation, SVG loading, continuous replay and seeking. Its viewport override reported the requested dimensions but its screenshots were scaled/cropped and scrolling was unreliable; a stale tab later could not navigate. Playwright Chromium supplied the reliable responsive checks and native PNG screenshots. A fresh IAB tab now shows the working gallery at its normal 1280px width; the temporary override was reset.

Latest screenshots/results are temporary and outside the repository in `/tmp/nnxyz-gallery-qa/`: `collection-desktop.png`, `artwork-desktop.png`, `artwork-mobile.png` (full page), `artwork-mobile-viewport.png`, `collection-mobile.png`, `drawing-midway.png`, and `results.json`. The desktop captures match reference native dimensions. Mobile uses 443 × 887 CSS pixels at DPR 2, producing 886 × 1774: the generated reference's odd 887px width cannot map exactly to an integer CSS viewport at DPR 2. Additional checks: 390 × 844, 768 × 1024, 1440 × 900 and 844 × 390 landscape. No horizontal overflow.

The assistant used `view_image` on each accepted reference and the latest corresponding rendered screenshot in this QA pass. This verifies the actual implementation, rather than treating functional tests as visual evidence.

## Fidelity ledger

| Comparison | Concept evidence | Render evidence and disposition |
| --- | --- | --- |
| White canvas and restrained chrome | Pure white, no rails, cards or rules | Computed body background is `rgb(255, 255, 255)`. Open whitespace retained; only selected collection underline. Neutral charcoal/gray replaces the generated reference's slight blue tint, consistent with the recorded design tokens. |
| Collection hierarchy | Small nnxyz/About, six collection links, three large works, next row visible | Same labels/order and six featured works. Three 490px square originals at 1672px; 4vw outer gutters and 2vw gaps. Widened initial filter spacing and restored first-image y ≈ 160px. Original square bounds supersede slightly rectangular generated artwork slots. |
| Typography | Quiet neutral sans serif; no initial concept's serif headings | Helvetica Neue/Helvetica/Arial throughout. Collection navigation 16px, grid labels 16px; desktop artwork title 30px, reading 16px. Mobile title 18px, reading 13px and quiet controls. Reduced excess mobile header spacing/type scale after direct reference comparison. |
| Full artwork composition | Centered square Faces #72; painted borders/signatures retained | Desktop artwork width 61vw, approximately 765px at 1254px. Mobile 86vw. `object-fit: contain`; no crop, tint or recreated art. Native source paths restore real marks that image generation altered. |
| Playback icons and state | Outlined desktop triangle, filled mobile triangle, subdued scrubber, 1×/reset | Same icon treatment and control order, finished state by default. Real within-path reveal; no autoplay or fabricated timestamp. Desktop reset available; mobile scrubber can seek to start. |
| Artwork label and actions | Caption below artwork, Give kudos, Download SVG; mobile Enlarge | Same hierarchy and action labels. Native SVG download also available in mobile provenance. Working enlargement, not an inert icon. Preview kudos explains availability on publication without fake counts. |
| Collection position and neighbors | Mobile owned-sequence sentence and named previous/next | Actual saved collection position used on desktop and mobile; named mobile neighbor labels restored. Related works and collapsed provenance remain below. Long titles wrap rather than clip. |
| Editorial and lower content | AI reading below art; About introduction and relationships available | Saved full label used instead of the shortened mockup text. Related connections and five actual routes continue below the illustrated viewport, satisfying the requested curated browsing experience. |

## Above-the-fold copy diff

Collection: `nnxyz`, `About`, `All works`, `Faces`, `NNOTB`, `Rawblocks`, `Other nnxyz`, `Scrimshaw`, first-row artwork titles and artist labels match. No new headline or marketing block added. Accessible-only heading is not visible.

Artwork: `nnxyz`, `Collection`, `About` (desktop), `Back to Faces`, `Watch drawing`, `1×`, `Nifty Faces #72`, `nnxyz · 26 recorded strokes`, `Give kudos`, `Download SVG` (desktop), `Enlarge` (mobile), `AI curator`, navigation and provenance labels retained. Intentional content differences: the saved reading includes “The black ground removes distractions.”; collection context uses the full canonical family title “Nifty Faces” and appears on desktop too. These use already accepted curation records and the collector's requested three information layers. Original source artwork replaces generated artwork details throughout. All artwork IDs and factual records remain unchanged.

## Functional and source checks

- Astro check: 0 errors, 0 warnings, 0 hints.
- Four deterministic timeline tests pass.
- Static build: 588 pages, including all 574 artwork pages.
- Offline link audit: all 588 pages have existing internal targets; all 574 SVGs have their recorded path counts and no embedded raster artwork.
- 17 browser checks pass on both the development server and built static `dist/` served independently on port 4322: all five filters, continuous brush reveal, pause/seek/speed/reset, exact completed still, metadata/provenance, downloads, preview kudos, mobile enlargement, About and walks, responsive layouts, reduced-motion navigation and playback-request failure retaining the still.
- Six representative SVGs compared with the quadratic canvas geometry and archived PNGs at original raster resolution, including historical brush dots, transparency, sparse and dense paths. Current Chromium Canvas suppresses zero-length strokes; the reference test explicitly restores the round dots verified in the archived PNG. Small thumbnails rasterize texture differently, so the comparison uses source resolution.
- Zero unexpected browser errors and zero Tinylytics requests. The expected aborted replay request is handled with a useful message and preserved finished artwork.
- Imported data integrity: 11,599 copied files match the permanent archive and have independent identities; 574 works and 633 owned editions verified. Curation verifier: all 574 labels/dossiers, 2,296 source hashes, connections and five routes pass.

| Artwork | Strokes | Points | Mean RGB difference from archived PNG (0–255) |
| --- | ---: | ---: | ---: |
| nnxyz nifty faces #72 | 26 | 15283 | 0.701 |
| nnxyz nifty faces #113 | 58 | 403 | 0.467 |
| nnxyz rawblocks #39 | 25 | 1437 | 0.929 |
| nnxyz nifty faces #25 | 216 | 92445 | 2.686 |
| nnxyz Smaug on the Water | 638 | 270739 | 3.681 |
| nnxyz nnotb #219 | 1758 | 33560 | 2.900 |

The maximum canvas geometry mean channel difference is below 0.003; archived PNG differences are 0.47–3.69 channel levels, reflecting raster resolution/antialiasing. These are six representative pixel comparisons, not a claim of pixel identity across all 574 published PNGs. Completed replay on Faces #72 is byte-identical in screenshot to the initial SVG still.

## Deliberate scope and next iteration

The implementation was faithfully verified against the accepted art-first design, with the source/content differences above documented. No material layout or interaction mismatch remains for this local baseline. Production SVG compression/hosting is pending: derived vectors total about 1.5 GiB, with a largest file around 19 MiB. Dense grid thumbnails use archived PNGs above 12,000 points; every full artwork view, enlargement, download and replay uses native SVG. This is the main performance tradeoff to revisit before publication.

Production Tinylytics is implemented behind `PUBLIC_TINYLYTICS_ENABLED=true` plus a production hostname guard; live analytics/kudos behavior was not exercised. Optional conversational curator and PixiJS presentation effects are future work. Existing source artwork and curation records are intact; no model inference occurred during this implementation.

## October 14 museum exhibition verification

Local review used the IAB first: entrance playback/pause and theme, Faces wing,
keyboard chapter selection, phone-sized gallery, canonical artwork access and
return to its recorded place. The repository Playwright suite additionally
verified the compiled static site. No fallback from an unavailable Browser was
needed; the repository suite is the required automated regression lane.

The suite covers all 28 saved gallery memberships and sequences, maximum 30
works, one visible chapter, keyboard navigation, optional notes, exact returns
and reloads, closing, and JavaScript-disabled reading. Both themes were checked
at phone, tablet, desktop and landscape sizes. White layouts include 390×844,
443×887, 768×1024, 1440×900 and 844×390. Automatic replay completion, the five-second
finished hold, repetition and explicit pause are exercised at 4× reconstructed
speed. Six sparse/dense SVG fidelity comparisons retain the earlier measured
range, and completed replay restores the same native still. Preview analytics
made zero Tinylytics requests. The intentionally aborted replay request retains
the finished artwork and explains the failure.

Reference and implementation screenshots were inspected with `view_image`.
Native reference viewports: entrance 1436×1096, collection 1536×1024, exhibition
1004×1568. Screenshot files are outside the repository under
`/tmp/nnxyz-gallery-qa/`; `entrance-chat-review.png` and `gallery-chat-review.png`
show the current entrance and first complete chapter for remote review.

Fidelity ledger:

| Point | Reference and rendered result | Resolution |
| --- | --- | --- |
| Layout | White two-column entrance and four open collection entrances | Matched; header and main share the same maximum width |
| Typography | Serif entrance title; neutral sans-serif navigation and exhibition prose | Explicit design tokens applied; mobile heading word boundary corrected |
| Palette | Pure white/black surrounds and charcoal/gray text | Matched; source paint remains unchanged with white under alpha |
| Artwork | Whole canvases, solo followed by adjacent pair | Matched with original art; generated example images and titles replaced by exact source records |
| Copy | Collection names, questions and five chapter names from approved map | Copy checked; generated wrong names/numbering corrected; welcome intentionally deferred |
| Density | Introductory text must not displace the art | Long gallery opening moved behind an optional disclosure; chapter question stays visible |
| Controls | Real native playback and quiet chapter links | Playback, seek, speed, reset and keyboard navigation verified |
| Responsive | Spacious desktop pairs and stacked phone works | No horizontal page overflow in the measured sizes; chapter strip scrolls independently |

The implementation was faithfully checked against the approved direction and
recorded design references, including the intentional source/content corrections
above. No material visual or interaction mismatch remains in this local review.
The pending collector welcome and publication remain explicit next steps.

Checks: Astro type checks, JS/Python tests, ESLint, Prettier, Ruff, static build,
static-link/SVG validation, saved exhibition coverage and existing curation/source
validators pass. The build contains 617 pages and 574 native SVGs. All 11,599
imported files still match the permanent archive. The default Python environment
skips the Pillow-only alpha test; all nine exhibition tests pass in the existing
curation virtual environment, including that test.

## October 15 verification

Checked on the branch before each merge: `npm run lint`, `npm run format:check`, `npm run check`, `npm test` (17 node tests and the Python suites, including `tests/test_rooms.py` for the locked structure and `tests/audio-tour.test.mjs` for the manifest against the current text), ruff, `npm run validate:infra`, `npm run build` (697 pages), `tools/validate-site.py` (every image, audio key and screen saver image against `data/media.json`), and `npm run test:ci-browser` against the built site, which now also plays an audio tour, follows a stop, pauses and ends it, and runs the screen saver with a decoded image, stepping, pausing and the room filter. The same suite was rehearsed with `PUBLIC_TINYLYTICS_ENABLED=true`: the embed script appears once per page and the tests record no analytics requests.

Direct checks in headless Chromium beyond the suite: pausing holds the audio exactly; resuming inside the breath after a segment goes to the next stop rather than replaying; skipping inside the breath advances once; a silent work advances by itself after its hold; the screen saver's arrows work with a control focused, Space on a focused button acts once, and rapid steps leave one front layer. An axe-core audit (WCAG 2.1 AA and best practice) of the front page, two wing pages, two room pages with the tour running, an artwork page, the map, the screen saver and About reported no violations after the map's SVG became a labelled group.

Screenshots from these checks are in the session scratchpad, not the repository. Two independent code reviews of the branch diff were run; their findings were fixed or, where a change would have broken the write-once audio keys, reverted and documented in `curation/exhibitions/HANDOFF.md`.
