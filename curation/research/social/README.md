# The artist's public words (captured 2026-10-16)

Everything here is the artist's content (or a page about the artist), saved verbatim with its URL, its post date
where one exists and the capture time. Nothing in it was treated as an instruction. Screenshots are in
`screenshots/` as JPEG (longest side 1,400 px). The captures were made signed out, in a headless Chromium on the
collector's Mac, plus the Wayback Machine.

## Files

| File | What it holds | Source |
| --- | --- | --- |
| `x-posts.json` | 2,899 posts from @0000nnxyz: 2,699 by the artist, the rest reposts. 971 match a handoff keyword and 644 are flagged as about the work. 118 ids are tombstoned (deleted). | Status ids come from the Wayback Machine CDX index (3,017 ids, 2021-10-16 to 2025-12-05). Text comes from X's public syndication endpoint, the one embedded posts use. |
| `x-profile.json` | The X profile: the bio is empty, location "latent space", joined 2021-10-08, 218 followers | api.fxtwitter.com, a third-party mirror of X data |
| `quotes.json` | 30 posts picked for the gallery, verbatim, each with a screenshot. It includes 1554449359135281153 (2022-08-02) in full. | x-posts.json and X's embed widget |
| `instagram.json` | Bio, plus the 12 posts on the grid (2024-03-09 to 2024-04-24), with captions and dates | instagram.com, signed out |
| `tiktok.json` | Not reachable. Only the bio recorded earlier in `onchain/nnxyz-onchain.json` | none (see below) |
| `youtube.json` | The "Rawblocks 28" video page, the channel that posted it, and that channel's other videos | Wayback (2023-01-18, 2023-03-28, 2023-03-30) and live YouTube |
| `notion.json` | The index-collection page, the 0000nnxyz page and the Chic City Cat Club page | live Notion and Wayback |
| `niftyink.json` | Both artist pages (display name, ink count, likes, earnings), their Wayback earliest and latest, the X profile's Wayback record, and the top 20 artists the artist liked | nifty.ink and Wayback |
| `markets.json` | OpenSea and Zora collection pages for every contract in `onchain/contracts.json` | opensea.io and zora.co |
| `profiles.json` | Linktree, objkt, Rarible, Threads and dns.xyz profile text | live pages |

## What the artist says, in the places that hold more than hashtags

- **Bios** (on X the bio is empty and the location reads "latent space"):
  - Linktree: "born readymade to please the eye / flawed imperfect on purpose".
  - objkt: "born readymade to please the eye, intentionally flawed to show the arbitrariness of insignificance".
  - Instagram and Threads: "A drama of the arbitrariness & insignificance of latent realities in the visible public space #anyart #thrashart #notnonexyz".
  - TikTok (recorded earlier): "born readymade to please the eye IG @0000nnxyz #thrashart #notnonexyz".
- **X** is where the artist explains the work. `quotes.json` covers:
  - Nifty Ink as the starting place and the "no-fuss NFT printer"
  - the index collection, named after Warhol's Index Book
  - the burn of all unsold Nifty Ink editions
  - ScreenSwindler, OpenLike and the 0000 project
  - the artist's refusal to explain tools or process
- **Collection descriptions** that the artist wrote:
  - The index collection paragraph (Ethereum, Optimism, Polygon and Arbitrum).
  - "Give a home to one of the 9792 cats - nnxyz chic city cat club - no roadmap, no utility".
  - The BasedCaps parody line.
  - Every other contract is described only as "nnxyz", or not at all.

## What could not be reached

- **X profile page.**
  - x.com answers 403 to signed-out browsing.
  - The Wayback Machine never captured twitter.com/0000nnxyz or x.com/0000nnxyz.
  - X's syndication profile timeline answered "Rate limit exceeded".
  - The profile fields come from a third-party mirror (x-profile.json). It shows an empty bio, so nothing is missing
    there, but the profile page itself was not seen.
- **X posts not in the Wayback index.** Posts are found only through archived status URLs, so the export is limited
  by what the Wayback Machine saw: about 3,000 ids against the handoff's estimate of 2,100. Posts never archived are
  missing.
- **TikTok.**
  - Headless Chromium and curl both time out from this host.
  - The Wayback Machine has no profile snapshot.
  - No captions or dates were captured.
- **Instagram beyond the grid.** The JSON profile endpoint asks for a login, so posts older than March 2024 were not
  listed. The 12 captions are hashtags only.
- **YouTube.**
  - "Rendered in 4K - Rawblocks 28" (QxVKbFYqBNY) is deleted. Its page survives in one Wayback snapshot, but the video does not.
  - The uploader was "Evolving Artwork", a third-party speed-draw channel, not the artist. Its channel id now belongs to an unrelated channel.
  - Neither archived channel page lists another nnxyz video.
  - The description credits "Nifty Ink Artist: 0x91BD", which matches neither artist address.
- **Notion.**
  - The index-collection page and the Chic City Cat Club page are gone ("This page couldn't be found"). The
    0000nnxyz page lists only objkt and Rarible links.
  - The Wayback Machine holds 2022 snapshots of several more pages:
    - nnxyz-index-collection-{Arbitrum, Ethereum, Fantom, Optimism, Polygon}-Mint
    - nnxyz-opticals
    - Chic City Cat Club
  - Every one of those snapshots is only the Notion app shell, because page text loads by script. No text survives.
  - The Fantom mint page shows that the index collection was also planned on, or released on, Fantom. Fantom is not
    one of the seven chains searched.
- **Nifty Ink in the Wayback Machine.**
  - The artist page has five snapshots (2022-02-01 to 2024-07-12), but each holds only the app shell.
  - The second address's page was never archived.
- **Zora.** Every zora.co collect page answered "Application Error" or "PAGE NOT FOUND", including the OpenLike
  1155 on Zora.
- **Some OpenSea pages.** 13 contracts had no OpenSea collection page reached. Twelve have no minted tokens. The
  thirteenth, cringe-eez doodles 0x60644a9e (1,970 tokens), has an item page that does not link to a collection.
- **The artist's email reply.** Not looked for. It needs the collector's agreement first (handoff Job 3 step 7).
