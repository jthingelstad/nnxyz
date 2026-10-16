# Deployment and asset storage

The public repository is https://github.com/jthingelstad/nnxyz. Application source, reviewed curatorial records, catalog metadata, source checksums, infrastructure and validation tools belong in Git. Full imported artwork and generated media stay outside Git.

## Storage paths

| Purpose                                          | Location                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Permanent local archive, read-only               | `~/Projects/nifty-ink-archive/`                                                        |
| Independent local gallery inputs, ignored by Git | `~/Projects/nnxyz/collection/`                                                         |
| Private, versioned source snapshot               | `s3://nnxyz-storage-archive-999153317627/datasets/<snapshot-sha256>/collection.tar.gz` |
| Public SVGs through CloudFront                   | `s3://nnxyz-storage-web-999153317627/art/<drawing-CID>.svg`                            |
| Two-decimal display SVGs the site uses           | `s3://nnxyz-storage-web-999153317627/art/display/<drawing-CID>.svg`                    |
| Original PNGs through CloudFront                 | `s3://nnxyz-storage-web-999153317627/png/<drawing-CID>.png`                            |
| Responsive WebPs                                 | `s3://nnxyz-storage-web-999153317627/raster/<drawing-CID>-<width>.webp`                |
| Selected metadata/provenance downloads           | `s3://nnxyz-storage-web-999153317627/records/<drawing-CID>.*.json`                     |
| Abstract WebPs, original JPEGs and records       | `s3://nnxyz-storage-web-999153317627/abstract/{images,originals,records}/`             |
| HTML and hashed browser bundles                  | Same web bucket, normal route paths and `_astro/`                                      |

Both buckets block public S3 access, use server-side encryption and versioning, and are retained if their stacks are removed. CloudFront alone reads the web origin. The archival bucket has no CDN connection. `infra/dataset.json` pins the source bundle by SHA-256, and `infra/dataset-files.json` maps every original path to its exact bytes. A separate `infra/abstract-dataset.json` / `infra/abstract-dataset-files.json` pair pins the recovered Abstract JPEGs and saved earlier-gallery HTML sources in the same private bucket under `datasets/abstract/<sha256>/collection.tar.gz`. Hydration restores both bundles without requiring the public source pages to remain unchanged. The Nifty Ink bundle is unchanged.

`infra/onchain-dataset.json` / `infra/onchain-dataset-files.json` pin the After Nifty Ink originals the same way, under `datasets/onchain/<sha256>/collection.tar.gz`: every original and the video still named in `data/onchain.json` and the token metadata files named in `data/onchain-works.json`, restored into `collection/recovered-onchain/` and `collection/recovered-tezos/`. `python3 tools/pack-onchain.py .build/onchain-collection.tar.gz` packs them deterministically (add `--pointer` only after the upload is verified, as for Abstract); `npm run hydrate:onchain` downloads the bundle and restores it through `tools/restore-onchain.py`, which refuses symlinks, paths outside the two trees and changed local copies. `npm run hydrate` restores all three bundles.

Each bundle stores identical files once; restoration makes independent regular-file copies, checks every hash and refuses to overwrite a changed local file. This snapshot backs up the imported nnxyz/scrimshaw website inputs; it does not replace or upload the entire permanent Nifty Ink archive.

## Published media is write-once

The artwork is an archive: it was generated once and does not change. All
7,704 media files (574 native SVGs and their two-decimal display copies, PNG
copies, Nifty Ink WebPs at 320/640/1200/1600/2000 px, Abstract and on-chain
images, original JPEGs, record downloads, and the audio tour's segments and
covers) live permanently at the web bucket paths above. The site only
references their URLs. Builds and deploys never read, copy or upload media.

`data/media.json` records every published key with the SHA-256 of its bytes.
Each object carries the same hash in its `sha256` metadata and is served with
`Cache-Control: public,max-age=31536000,immutable`. SVG and JSON are stored
gzip-encoded. The deployment role is denied `s3:PutObject` on every media
prefix (`PublishedMediaIsWriteOnce` in `infra/delivery.json`), so a routine
deploy cannot replace artwork. The list in that template must match
`mediaPrefixes` in `tools/delivery-plan.mjs` (`npm run validate:infra`
checks this), and a new prefix only protects the bucket once the delivery
stack is updated with a reviewed change set. The `audio/` prefix for the
audio tour (October 15, 2026) was added to the template with the site
change, and the four `onchain/` prefixes for After Nifty Ink (October 16, 2026) likewise; apply the change set to the delivery stack to bring the
deployed policy in line. `tools/validate-site.py` fails the build if
any page references a media URL missing from `data/media.json`, or if media
files appear in `dist/`.

## Fresh checkout

```sh
git clone https://github.com/jthingelstad/nnxyz.git
cd nnxyz
npm ci
AWS_PROFILE=cloud-engineer npm run hydrate
npm run validate:collection
npm run validate:curation
npm run dev
```

`npm run dev` and the browser tests read media from CloudFront, so only the
archive checks need hydration. Hydration requires authorized AWS credentials because source snapshots are private. CI uses GitHub OIDC; no static AWS keys or repository secrets are needed. Keep local `collection/` between builds. The larger source archive, original source bytes and saved curation are never regenerated by CI.

## Validation and publication

Every push to main, internal pull request and manual workflow run uses `.github/workflows/ci.yml`:

1. ESLint, Prettier, Astro/TypeScript, Node tests, Ruff lint/format, dependency audit, CloudFormation schema and infrastructure policy validation.
2. CodeQL scans maintained JavaScript/TypeScript and Python. Immutable curator review reports, preview references and archived renderer source are excluded because they are retained evidence and are not served by the website; application source and maintained tools remain scanned. High or critical open findings on the workflow ref block publication.
3. Build the pages (about 11 MB, no AWS credentials and no archive), check every link and that each media URL is published, and run Chromium interaction/fidelity/responsive tests with media served from CloudFront.
4. Main only: pass the build as a short-lived GitHub artifact to the deployment job. Check that the workflow revision remains current main, upload changed pages and scripts, publish the revision marker, invalidate only the page paths in the build, and compare delivered HTML/revision bytes with the build.

`.github/workflows/archive.yml` restores the private source archive and validates it, the curation and the token links extracted into `data/tokens.json`. It runs by hand, on pull requests that change curation or archive data, and, called from `ci.yml`, before deploying a main push that changes that data. Routine deploys skip it.

Fork pull requests run the credential-free Quality and CodeQL jobs. The archive workflow is skipped for forks. Infrastructure changes are deployed separately through reviewed CloudFormation changes, not by the routine publication role.

HTML, JSON, CSS and JavaScript are losslessly gzip-compressed before upload, preserving decoded bytes and MIME types. Hashed `_astro/` bundles are immutable; pages revalidate after 60 seconds. Unchanged pages are skipped by source hash and HTTP metadata. Old pages and S3 versions remain available for rollback; publication never deletes artwork.

Local verification:

```sh
npm run lint
npm run format:check
npm run check
npm test
uvx --from ruff==0.17.0 ruff check tools
uvx --from ruff==0.17.0 ruff format --check tools
uvx --from cfn-lint==1.57.2 cfn-lint infra/storage.json infra/certificate.json infra/site.json infra/delivery.json
npm run validate:infra
npm run build
npm run validate:site
npm run test:ci-browser
```

Install Chromium once with `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Browser evidence is saved under `/tmp/nnxyz-gallery-qa`, and CI retains it for seven days. A full browser run on localhost or the CloudFront hostname sends no Tinylytics hits. Live-domain QA must intercept the analytics script and avoid real kudos writes.

## DNS and HTTPS

At the DNS provider for `thingelstad.xyz`:

| Type  | Host                                      | Target                                                             |
| ----- | ----------------------------------------- | ------------------------------------------------------------------ |
| CNAME | `nnxyz`                                   | `d1of1z466a2mhl.cloudfront.net`                                    |
| CNAME | `_86ada14aa010fbd72a97e11ce9f27921.nnxyz` | `_b70917b2209e12bd51ac105c57271abd.wzccmgtwzk.acm-validations.aws` |

Keep the validation CNAME for certificate renewal. The certificate and distribution are in `us-east-1`. The gallery's canonical URLs remain `https://nnxyz.thingelstad.xyz/`; `https://d1of1z466a2mhl.cloudfront.net/` is available for deployment verification. Resource IDs and IAM role ARNs are recorded in `infra/deployment.json`.

Tinylytics is enabled in production builds and activates only on the canonical gallery hostname. CloudFront review pages do not load it.

## Rollback and updating artwork

To roll back website code, revert the relevant Git commit on main. The same validation/deployment pipeline will publish it; the live `revision.json` identifies the running commit. S3 versioning is an additional recovery mechanism, not the normal release workflow: replaced or deleted web bucket objects stay recoverable for 30 days, then expire. The archive bucket keeps every version.

If the owned collection changes, import independent copies from the permanent archive, verify them, then run `python3 tools/pack-collection.py /tmp/nnxyz-source-blobs.tar.gz` to generate a new snapshot and manifests. Upload the new immutable key using AWS MCP's presigned upload tool and verify its checksum before committing the new dataset pointer. Never overwrite an existing snapshot key. A routine website change needs no dataset upload or model invocation.

## Adding or regenerating media

Published media is never replaced. Routine layout, text and curation changes
touch no media at all.

1. `AWS_PROFILE=cloud-engineer npm run hydrate`, then
   `npm run media:generate`. This renders into ignored `media/`, checking each
   SVG render against the archived PNG and each Abstract WebP against its JPEG.
2. A new rendering of an existing work needs new key names (for example a new
   width, or a new prefix); change the URLs in `src/lib/catalog.ts` and the
   widths in `data/media.json` together.
3. `AWS_PROFILE=cloud-engineer npm run media:publish` uploads only keys the
   bucket lacks, with `If-None-Match: *` so S3 refuses to overwrite anything,
   then rewrites `data/media.json` from the bucket. It fails if any published
   object's hash differs from the manifest.
4. Commit `data/media.json` with the page change. `npm run media:verify` is a
   read-only check that the bucket still matches the manifest.

Unreferenced media keys left from older renderings are reported by
`media:publish`. Delete them only deliberately, after the pages that used them
are gone from every rollback you care about.

## Updating recovered Abstract inputs

`python3 tools/pack-abstract.py .build/abstract-collection.tar.gz` packages only the hash-pinned recovered originals and earlier-gallery sources. Upload its new immutable key with the AWS MCP presigned upload tool using a full SHA-256 checksum and an `If-None-Match: *` precondition; verify S3’s content length and checksum before accepting the new pointer. It requires no infrastructure or publication-role change. `python3 tools/restore-collection.py .build/abstract-collection.tar.gz --config infra/abstract-dataset.json` verifies restoration locally. Routine builds read these saved sources offline.
