# nnxyz gallery

Working project for an online gallery of the collector's owned nnxyz artwork, with scrimshaw as a related collection. The local gallery baseline is built with Astro and TypeScript from the approved October 13 design. GitHub Actions validates and deploys the gallery to private S3 storage behind CloudFront.

The gallery's public domain will be **nnxyz.thingelstad.xyz**. Deployment and DNS instructions are in [docs/deployment.md](docs/deployment.md).

Tinylytics configuration and per-artwork kudos guidance are saved in [design/tinylytics.md](design/tinylytics.md). Production analytics and per-artwork kudos are integrated, gated by an explicit build flag and the production hostname. Local review sends no Tinylytics requests.

Source artwork lives in a private, versioned S3 snapshot; `collection/` is excluded from Git. The pipeline restores exact independent copies and verifies them before building. See [storage, CI and deployment](docs/deployment.md) for paths, validation, DNS and rollback.

The gallery contains **600 nnxyz artworks and 26 scrimshaw artworks**: 574 Nifty Ink drawings representing 633 verified owned editions at the saved snapshots, plus 52 Abstract works recovered from the collector’s earlier public gallery. Abstract uses Polygon contract/token identities and original published JPEGs; its earlier ownership account is kept separate from chain-verified snapshot evidence. No other artists’ artwork files are included.

Offline Nifty Ink curation is complete: all **574 drawings** have verified technical dossiers, AI-reviewed museum readings and collection context. The catalog also includes inspected-image connections and five curatorial routes. See [curation/README.md](curation/README.md) for the saved records, review evidence and verification commands. The gallery uses these saved records offline. A conversational curator and PixiJS flourishes can follow later.

## Run the gallery

```sh
npm ci
npm run dev
```

Artwork images and downloads are published once and served from CloudFront; the dev server proxies them, so no archive download is needed to work on the site. Hydrating the private archive (`AWS_PROFILE=cloud-engineer npm run hydrate`) is only needed to validate sources and curation or to generate new media. See [publishing media](docs/deployment.md#published-media-is-write-once).

Open http://127.0.0.1:4321/. The front page carries the collector’s statement beside a native drawing replay, followed by five collection entrances. Visitors choose rooms within Faces, New Nifty on the Block (NNOTB, in three dated parts), Rawblocks, Abstract, or Other & related; there is no global artwork grid. The 28 rooms hold 20 to 30 works each (plus a two-work coda), hung in the order they were drawn and presented in chapters with labels, one-liners, in-room comparisons and a closing; every room has an audio tour of six to ten minutes, and `/map/` shows the collection as a three-floor building. `/screensaver/` rotates through every work with its caption. A quiet Dark/Light header switch changes the gallery surround between white and black and remembers the visitor’s choice. Nifty Ink detail pages offer native SVG, continuous stroke playback, speed/seek controls, enlargement, the room reading, the UTC creation instant with the viewer’s local time, and downloadable metadata/provenance. Abstract pages offer responsive raster images, enlargement, readings, source records and byte-exact original JPEG downloads; they expose no replay or SVG controls. Existing artwork URLs remain stable; previous/next and return links follow each work’s room. The galleries of the October 14 map and the earlier short-walk pages were retired; their addresses redirect to their wings, and their records remain in `curation/`. Other nnxyz and Scrimshaw are sections of Other & related, and their former standalone URLs redirect there.

```sh
npm run check
npm test
npm run build
```

The build creates 697 HTML pages in `dist/`: 626 artworks, 28 rooms, five collection entrances, the home, map, screen saver, about and 404 pages and 33 redirects from retired addresses, plus the screen saver's JSON, `robots.txt` and a sitemap of the 664 public pages. Nifty Ink artwork paths use immutable drawing CIDs; Abstract paths use Polygon contract/token identities. No model invocation or cloud service is needed.

For browser checks, with a local server running:

```sh
npx playwright install chromium
npm run test:browser
```

Alternatively set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable. Tests cover playback, downloads, five collection entrances, chapter navigation, mobile/tablet/desktop/landscape layouts, reduced motion, SVG fidelity and the replay error path. Temporary screenshots/results go to `/tmp/nnxyz-gallery-qa`.

The full-precision SVG collection is about 1.5 GiB uncompressed; the largest drawing is about 19 MiB. Browsing uses WebPs rendered from the native SVGs at up to 2000 px, so gallery images stay sharp on 2x and 3x displays, and each artwork page shows one as a poster until its SVG arrives; every full Nifty Ink artwork view and replay uses SVG. Abstract uses responsive raster images and original JPEG downloads. Production hosting must provide compressed SVG delivery. The permanent archive and imported artwork bytes remain unchanged.

Copy `.env.example` to `.env` and enable `PUBLIC_TINYLYTICS_ENABLED=true` only for production. The hostname guard additionally limits the embed to `nnxyz.thingelstad.xyz`. Preview kudos explain that giving kudos becomes available on the published gallery.

Design decisions and review evidence: [implementation](design/implementation.md), [QA baseline](design/qa-baseline.md), [approved concepts](design/concepts/2026-10-13-v2/review.md).

## Collections

Three Nifty Ink title families and the separate recovered Abstract collection retain their identities:

| Collection                     | Distinct artworks |
| ------------------------------ | ----------------: |
| Nifty Faces                    |               134 |
| New Nifty on the Block (NNOTB) |               303 |
| Rawblocks                      |                66 |
| Other nnxyz works              |                45 |
| Scrimshaw                      |                26 |
| Abstract                       |                52 |
| Total                          |               626 |

Faces includes the Christmas special. Other nnxyz works retain the numbered `nnxyz` series, commemorative pieces and other titles. All artwork from both archived nnxyz creator addresses is included. Multiple owned editions and artworks appearing in both wallets keep their ownership records and share one gallery entry.

## Files

- `data/gallery.json`: compact website catalog, grouped by series, with title, series number, creator address, dimensions, stroke counts, owned edition count, source paths and provenance. Its paths are relative to this project root.
- `data/collections.json`: primary series, other nnxyz works, scrimshaw, and an empty placeholder for a future related collection. Scrimshaw is the only related artist included now.
- `collection/artists/`: independent copies of each selected artist's original PNGs, published metadata, compressed strokes, decoded strokes, stroke summaries, artist records, and artwork-specific history/provenance. Imported paths are relative to `collection/`.
- `collection/catalog.json`, `artists.json`, `holdings.json`: selected archival catalog and ownership evidence.
- `collection/snapshots/`: the selected artworks' raw IPFS assets and on-chain token records, plus block-pinned wallet inventories, source provenance and schema/contract context. Original wallet inventories can mention other holdings; only the selected artwork media is copied.
- `previews/`: existing self-contained PNG/stroke replay examples, SVG spot checks, and comparison page, updated to use the project copies.
- Original renderer/codec vendor distributions and licenses remain in the permanent archive; they are not copied into this website project.
- `source/archive/`: exact copies of the original preview/exporter reference files.
- `source/import-manifest.json`: each copied source file's archive path, project path and SHA-256, plus the original archive checksum baseline and copy time.
- `tools/`: import, verification and SVG export utilities.

The complete permanent archive remains at `../nifty-ink-archive`. This website project uses regular-file copies with independent file identities. It has no links into the archive and can be moved without breaking its collection paths. Full transaction receipts, block headers, raw index/RPC responses and unrelated holdings remain in the permanent archive.

Keep the imported source bytes intact. Build thumbnails, optimized assets, SVG exports and website output in separate directories. The gallery build can publish the media it needs; the provenance/vendor directories do not need to be served wholesale.

## Verify the copied data

```sh
python3 tools/verify-collection.py
python3 tools/verify-collection.py --compare-archive
```

The first command works without the archive. The second also compares each copied file with its original and confirms the files do not share archive inodes. Verification checks catalog membership, all owned editions, provenance paths, retained IPFS objects, preview sources and SVG references.

Python 3.11 or newer is sufficient for offline source verification; no packages or network access are required. `npm run validate:collection` also verifies all recovered Abstract originals, token identities and inspected editorial records.

## Source import and SVG export

```sh
python3 tools/import-archive.py
python3 tools/export-svg.py
```

The import reads the permanent archive and copies nnxyz plus scrimshaw. Existing imported files must still match their source hashes; it refuses to overwrite changed copies. It never changes the archive. Additional artists can be imported later with `--include-related` after choosing to expand the gallery.

The exporter regenerates the three existing native-vector SVG spot checks. It can also export any copied drawing:

```sh
python3 tools/export-svg.py "collection/artists/<artist>/artworks/<CID>/strokes.json" --output /tmp/artwork.svg --title "Artwork title"
```

The stroke data preserves geometry, colors, brush radii and drawing order, with full coordinate precision. It can support self-hosted playback and SVG rendering without depending on nifty.ink.

## Recovered Abstract collection

`data/abstract.json` pins 52 original JPEGs and five earlier-gallery HTML source snapshots by SHA-256. Originals are independent files under ignored `collection/recovered-abstract/`; the permanent Nifty Ink archive is unchanged. `infra/abstract-dataset.json` and `infra/abstract-dataset-files.json` pin a separate immutable private S3 bundle, restored by `npm run hydrate`. The existing Nifty Ink snapshot remains unchanged. Public-source recovery is also available through `npm run hydrate:abstract`; it refuses changed or overwritten sources.

`curation/abstract/` contains 52 directly inspected AI readings, three exhibitions of 18/17/17 works, image-review fingerprints and recovery evidence. This session used direct assistant image inspection, without a separate review-model call or individual human approval. Existing Nifty Ink editorial records and timestamps remain unchanged. `curation/collection-history.json` attributes historical context and the NNOTB expansion to the earlier collector gallery; its four additional NNOTB CIDs remain a reconciliation queue, not imported works.

`npm run media:generate` derived 640/1200/2000-pixel WebPs outside `collection/` and kept the original JPEG bytes for downloads; both are published once and recorded in `data/media.json`. No stroke data, making-time measurements or native SVG are inferred for Abstract.
