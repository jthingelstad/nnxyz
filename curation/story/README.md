# The story layer

The six pages under `/story/` and the per-work facts woven into the artwork
pages. Built on October 16, 2026 from the research under `curation/research/`
(the drafts in `curation/research/story/` and `project-page-draft.md` were the
starting point and are kept as records).

| File                     | What it is                                                                                                                                                 | Made by                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `nifty-ink.md`           | The drawing board. Gallery voice; sources in the front matter.                                                                                             | written                                          |
| `the-collector.md`       | Jamie Thingelstad's story in his words and the ledger.                                                                                                     | written                                          |
| `the-project.md`         | The artist's three years, the closing and the later collections.                                                                                           | written                                          |
| `2022.md`                | The year month by month; `{{month YYYY-MM}}` lines place the record blocks.                                                                                | written; blocks from `timeline-2022.json`        |
| `fan-art.md`             | The collector's nnxyz fan art #0001 and the artist's like; `{{work <inkId>}}` places the replayed drawing.                                                 | written                                          |
| `works.json`             | Drawings outside the collection shown on a story page, pinned to the archive.                                                                               | written; media from `tools/build-story-media.py` |
| `in-the-artists-words.md`| The introduction; the page renders `words.json` after it.                                                                                                  | written                                          |
| `facts.json`             | Per Nifty Ink work: when and how it reached the collector (first inbound transfer) and the artist's post announcing it (matched by the drawing's link). | `python3 tools/build-story-facts.py`             |
| `timeline-2022.json`     | Month counts from the ledger, the archive and the posts, plus the dated events the 2022 page names, each with its record.                                 | `python3 tools/build-story-facts.py`             |
| `words.json`             | The thirty chosen posts and the bios, verbatim beside a printed form.                                                                                      | `python3 tools/build-story-facts.py`             |

`src/lib/story.ts` reads the Markdown files (front matter: `title`, `slug`,
`order`, `kind`, `summary`, `sources`) and renders the small subset of Markdown
they use. `tests/test_story.py` checks the pages, the facts and that only the
collector is named.

Rules: only the collector is named; wallets other than his three named wallets
are never shown. Quotations are verbatim with three light edits (links and
hashtag-only lines dropped, handles written as names, emoji removed). Every
number comes from the records, not from looking. Rerun the tool after changes
to the research files it reads.
