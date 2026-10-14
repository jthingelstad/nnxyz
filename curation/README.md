# AI curator collection

The offline curation prepares a museum-like experience with three layers: technical facts, editorial interpretation and position/relationships in the collection. Website design and implementation are the next phase.

All 574 imported artworks have verified factual dossiers and AI-reviewed museum readings, covering 548 nnxyz artworks and 26 scrimshaw artworks across 633 owned editions. The collector accepted the editorial standard and exception-review approach. The initial 30 readings were prepared and reviewed by the assistant. The remaining 544 received separate multimodal drafting and image-review calls using the original PNGs and supplied comparison images, followed by collection-wide wording checks and targeted image-backed corrections. There are 1,006 editorial connections, including 302 across collection groups, and five routes through inspected works. No artwork remains awaiting editorial review.

The original nine-work experiment remains intact in `pilot/`, and the 30-work expanded pilot remains in `expanded-pilot/`. The assistant also visually spot-checked 24 new primary readings and three additional comparison images. “AI-reviewed” identifies review under the accepted standard; it does not imply individual human approval, a blinded model benchmark or visitor testing. Each new record has separate draft and review calls, generally using the same model; corrections sometimes used a different model.

## Contents

- `features.json`: measured image palettes, PNG/logical dimensions, stroke/point counts, explicit helper flags, source hashes and method version for all 574 artworks.
- `relationship-candidates.json`: title-family neighbors, archived creation neighbors, recorded-stroke-count matches and two color-histogram candidate sets for every artwork. These are candidate links, not completed editorial curation.
- `measurement-summary.json`: exact totals, collection distributions, image-analysis methods and limitations.
- `collector-perspective.json`: original collector response and a separately labeled normalization of the spoken transcription. Keep it distinct from AI interpretation and artist intent.
- `curator-prompt.md`: versioned instructions for the offline worker and future conversational curator.
- `pilot/sample-selection.json`: nine selected gallery records.
- `pilot/editorial-drafts.json`: the assistant's visual observations and editorial drafting inputs.
- `pilot/labels.json`: the nine structured three-layer label records, with evidence, related IDs and draft status.
- `pilot/approach-comparison.json`: qualitative comparison of image-only text, a fact-heavy caption and the recommended three-layer format. It is not an independent-model or blinded quality experiment.
- `pilot/contact-sheet.jpg` and `palette-comparison.jpg`: the exact visual comparisons inspected during the study.
- `pilot/qa-examples.json`: seven illustrative answers for a future conversational curator; these are not a live chat test.
- `pilot/review.fragment.html` and `review.html`: a self-contained nine-work label review and its standalone preview. This is a content review, not the production gallery design.
- `pilot/verification.json`: source/data checks and browser checks performed on this pilot.
- `recommendation.md`: findings, proposed whole-collection workflow and live curator boundaries.
- `editorial-standard.json`: the collector's acceptance and the agreed editorial boundaries.
- `collector-introduction.json`: a separately attributed first-person draft for the collector to edit; not an approved quotation.
- `catalog/dossiers.json`: verified factual records for all 574 artworks, with source hashes, ownership, technical facts and unpromoted relationship candidates.
- `catalog/labels.json`: all 574 AI-reviewed three-layer records; facts are supplied by the builder rather than the editorial worker.
- `catalog/routes.json`: five short AI curator routes through inspected artworks, with a reason for each stop.
- `catalog/exceptions.json`: duplicate names, zero-number titles, forks and interpretive boundaries, including whether each has been handled or is still pending.
- `catalog/editorial-queue.json` and `manifest.json`: exact coverage and pending-work state. Queue entries are tracking records, not background jobs.
- `catalog/selection.json` and `verification.json`: current reviewed coverage and catalog checks, separate from the preserved expanded pilot.
- `editorial/full-collection.json`: the 544 new inspected-image editorial inputs to the catalog builder.
- `full-pass/records/`: per-artwork editorial outputs with image-review and generation evidence.
- `full-pass/receipts/` and `prompts/`: actual model responses, token usage, request IDs, source image hashes, exact instructions and system prompt texts matched by SHA-256.
- `full-pass/language-audit.json`, `visual-review-flags.json`, `assistant-spot-checks.json` and `pre-quality-review/`: collection-level review evidence and original records retained before targeted corrections. A wording flag is a review candidate; accurate visible descriptions may remain after review.
- `full-pass/assistant-final-review.json` and `pre-assistant-final-review/`: direct assistant inspection and wording corrections for the final 33 flagged original images, with preserved prior records. These supplement the earlier model reviews and are explicitly attributed to the assistant.
- `full-pass/run-summary.json`: completion, relationship counts, actual model identifiers and saved metered usage. This is not a billing invoice.
- `expanded-pilot/editorial-notes.json`: the 21 new readings, visual observations, explicit image-review evidence and stable comparison IDs.
- `expanded-pilot/verification.json`: source, identity, ownership, editorial structure and relationship checks.
- `expanded-pilot/review.fragment.html` and `review.html`: the 30-work content review and standalone browser preview.

## Reproduce measurements

```sh
python3 tools/curation-measure.py
python3 tools/verify-curation.py
python3 tools/build-curation-catalog.py
python3 tools/verify-curation-catalog.py
```

Measurements require Pillow and NumPy. The pilot used Python 3.12.14, Pillow 12.3.0 and NumPy 2.3.5 from the local bundled runtime. The feature method/version and source hashes are saved with the data. Measurement, catalog assembly and verification use no network services. Imported artwork files and the permanent archive remain untouched.

The AI-written readings are not reproduced by the measurement script or the catalog builder. Their prompt, image/evidence inputs, generation provenance and saved outputs are retained. The builder preserves unchanged readings and review timestamps. Future inspected-image batches can be added under `curation/editorial/`.

Catalog verification checks 2,296 source-file hashes and the ownership/creator identity of every dossier, all editorial connection endpoints, word-length limits, route IDs, exact completion counts and saved invocation evidence. The imported dataset was also compared against all 11,599 copied archive files. These checks do not mechanically validate aesthetic judgments. Neither a public website nor a conversational curator has been implemented at this stage.

## Inference and review provenance

The completed run used Amazon Bedrock in `us-east-1` with the authorized `cloud-engineer` profile. Sonnet 4.6 drafted 463 new records; after its daily token quota was reached, already enabled Opus 4.6 completed the remaining 81 and additional corrections. After both models reached their daily quotas, the assistant directly inspected the final 33 flagged original images and saved wording corrections with separate attribution. All 544 new records already had separate image-backed model reviews. Nova Pro was tested during calibration and rejected for generic wording and unsupported development claims. No subscription or IAM changes were made.

The SDK is isolated in `.curation-venv/`. The scripts `tools/curate-collection.py` and `tools/review-curation-flags.py` invoke metered models; they are resumable and retain saved outputs. They are not required for gallery builds. The latter re-examines audit flags against original images. Use `tools/audit-curation-language.py`, `tools/save-curation-prompt-evidence.py`, the catalog builder/verifier and `tools/summarize-curation-run.py` to assemble the saved evidence. No recurring worker or live chat service is running.

The early Nova calibration's aggregate token total is recorded from the run output; its detailed receipts were superseded during calibration. Later retained receipts carry exact usage and prompt evidence. The summary describes this limitation explicitly rather than inventing a complete invoice.

## Abstract recovery — October 14, 2026

The earlier collector gallery supplied 52 Polygon token links and original JPEGs outside the Nifty Ink archive. `abstract/editorial.json` preserves deterministic technical facts, direct image-inspected AI readings and collection context separately. `abstract/exhibitions.json` assigns each work exactly one primary home in three bounded exhibitions (18/17/17), with chapter comparisons and closings. `abstract/review.json` records source hashes, review-sheet membership, timestamps and the direct-inspection method. These records were produced in the current assistant session, without a separate review-model invocation or individual human approval; they are not part of the earlier 574-record Bedrock review claim.

`collection-history.json` records sourced collector history, the full NNOTB name, and four unmatched historical NNOTB drawing CIDs requiring identity/ownership reconciliation. Original images and source HTML remain immutable under `collection/recovered-abstract/`; the new private dataset is pinned separately from the existing Nifty Ink snapshot. `python3 tools/verify-abstract.py` verifies saved sources and editorial coverage offline.
