# nnxyz on-chain research notes (2026-10-16)

Scratch evidence pulled from public explorers and RPCs. Wallet activity is evidence of what an address did, not proof of who a person is. Files in this folder: gnosis-tx.json, gnosis-tt.json, gnosis-itx.json, buyers.json, likes.json, polygon-abstract.json, meta/*.json, img/*.

## Addresses
- nnxyz main: 0x9410bc26732ed9480833cb3a4a0f377908e261e2 (no ENS primary name; nnxyz.eth is not registered)
- nnxyz second address: 0x14a19d826e03e5a33df33f4ff898968329cb4085 (drew nifty faces #12 on 2021-11-30 and sent it to the main address the same day)
- collector wallets: thingelstad.eth 0x2bda…5720, nnxyz.thingelstad.eth 0xf872…7a37, niftyink.thingelstad.eth 0xb009…19f
- Nifty Ink: NiftyInk 0x49de55fba08af88f55eb797a456fdf76b151c8b0, NiftyToken 0xcf964c89f509a8c0ac36391c5460df94b91daba5, likes 0xbd0621dcb64e1eed503f709422b019b2fa197af6 (Gnosis)
- Polygon: "nnxyz abstract" (nnxyzstrct) 0x73cc4478c5d3adf01d78d95d774bf4006d48f3a3, owner = artist
- Ethereum: "nnxyz index collection" 0x7ebFcF1F26845F1dEface5b7043f57A560DF8780 (thirdweb), "nnxyz" 0x6aBb1CD04edE4560355fF90d82967B2eCA0B4f7D (Manifold)
- Optimism: index collection 0x81a95C21bf5d76d2fBb49E39B057fB5667F34b0A, opticals s1 0x9660fA7f5F3A896912E587B77ef6dBC4Cf0f6Dc2, s2 0xe7dF60fD9dEc072a01ff72d4b0420E23FAF7615b, s3 0x95B76Ca11D29F591ecB848e5fE10C21Da9B5a008, "nnxyz" (oink) 0x3d42539721AAFf66EBe049DCd33D82e2f9c7726a

## Gnosis / Nifty Ink (5,669 transactions, 2021-10-26 to 2024-12-05)
- 593 createInk, 869 setPrice, 3,226 mint, 536 safeTransferFrom, 346 likes, 67 bridge-out transactions (Connext, Hop) totalling 3,969 xDAI
- Sales income: 283 payments, 4,026 xDAI, 50 distinct buyers. Collector wallets: 121 payments, 2,127 xDAI. tyler.thingelstad.eth and mazie.thingelstad.eth each bought 3 on 2022-05-10. austingriffith.eth: 18 payments, 268 xDAI, first 2022-02-01. iamjim.eth 16, jaxcodes.eth 15, justn.eth 7, superphiz.eth 3, cvjoint.eth 3, fahim.eth 3, danielsheldon.eth 2, polimyl.eth 2.
- Monthly payments peak 2022-05 (78). Late sales: 2023-12 to 2024-06 and 2025-01/04 (collector wallets).
- 2,967 editions minted directly to 0xdead000000000000000042069420694206942069 (burn), 1,572 of them in March 2023; plus 25 safeTransferFrom to that address. This is the mechanism behind "all remaining unsold were burned".
- 435 inks transferred to thingelstad.eth and 73 to niftyink.thingelstad.eth (2022-08: 144, 2022-10: 298, 2023-03: 86): delivery of the complete sets.
- Gifts: 0x6564…194 (2022-01-25), 0x4aad…213 (2022-03-02), austingriffith.eth, danielsheldon.eth, jaxcodes.eth (2023-03-28), austingriffith.eth (2024-06-05); 15 editions minted to blockhero.eth 2024-05-08.
- Likes: 345 successful likes across 93 artists. jasperart.eth 82, ekeko.eth 27, 0x0fb76e…dcd7 20, dashmdash.eth 17, danielsheldon.eth 16, chiliprawn.eth 14. 3 likes went to scrimshaw.eth's inks and 1 to the collector's. No token transfers between nnxyz and scrimshaw on Gnosis. Likes continue through 2024 (27 in 2024-05, 28 in 2024-06, 10 in 2024-12).

## Ethereum mainnet (17 transactions)
- 2022-02-01 first funding: 0.06 ETH from austingriffith.eth.
- 2022-08-05 "nnxyz index collection" deployed: tokens "nnxyzic Heaven or Hell #1, #2" (gif).
- 2022-08-21 Manifold "nnxyz": "i was famous #1/3, #2/3, #3/3" (two sets, 3000x2846 JPEG): Duchamp's Fountain in a four-panel Warhol grid, signed "nnxyz" lower right.
- 2022-11-20 "nnxyz lord of the inks" (9000x3600 JPEG, Arweave): a mosaic of about 500 Nifty Ink drawings. All mainnet tokens still held by the artist.

## Optimism (56 transactions)
- 2022-08 index collection (Heaven or Hell #1–#3; collector holds #3).
- 2022-11-06/08 "nnxyz oink #1–#11" (collector holds #1).
- 2022-11-16/20 "nnxyz opticals" s1 (4 tokens, all with collector: #7, #264, #268, #295), s2 (133 tokens #1–#133, 130 still with artist), s3 (1 token #68).
- Received OP airdrop 2023-02, moved 2024-04.

## Polygon
- 53 Abstract token ids. 52 minted 2022-03-30 to 2022-04-04; #0000 minted 2023-05 at sale. 46 gifts in April 2022. 53 transfers to the collector in May 2023 (Seaport purchase, block 42,274,915), 52 transfers to the burn address 2023-07-08. The artist address has 1,277 Polygon transactions in total; only the Abstract contract was examined.

## The artist's own words found so far
- Bio line (TikTok @0000nnxyz, read 2026-10-16): "born readymade to please the eye IG @0000nnxyz #thrashart #notnonexyz".
- Contract description of "nnxyz index collection" (Ethereum 0x7ebF… and Optimism 0x81a9…, contractURI on IPFS): "The nnxyz index collection is an open never-ending collection published independently on multiple blockchains. The collection is always expanded by another work as soon as all works from a drop are sold out. The collection is planned completely openly." It links https://twitter.com/0000nnxyz/status/1554449359135281153 (2022-08-02) and a Notion page https://nnxyz.notion.site/nnxyz-index-collection-e5ec035dd7a54937a905a2a9f2661896 which now returns an empty record (deleted or private).
- Titles: "i was famous", "lord of the inks", "Heaven or Hell", "oink", "opticals", "New Nifty on the Block", "rawblocks", "#0000" origin works.
- Hashtags on the artist's own posts (search summaries, unverified against the posts): #expressionism #popart #abstractart #thrashart #generativeart.

## Images inspected (small copies in the session scratchpad, not committed)
- "i was famous #1/3" (Arweave): Duchamp's Fountain, four panels in flat Pop colors, textured print marks, "nnxyz" signed lower right.
- "nnxyz lord of the inks" (Arweave, 9000x3600): mosaic of roughly 500 Nifty Ink drawings, the artist's own retrospective wall.
- "nnxyz oink #1" (IPFS, 2339x1654): a soft, painterly landscape of a pond in greens and blues; nothing like the inks.
- "nnxyz opticals #268" (IPFS, 748x748): a dense generative scatter of tiny colored marks on white; the "generative art based on my Nifty Ink" line fits this series.
- "nnxyzic Heaven or Hell #1" (IPFS, 1111x1111, 11-frame gif): a red hooded head with yellow scrawled letters across the face on a pale blue ground; close kin to the Faces and NNOTB rooms.
- IPFS reachable from this container only through https://ipfs.filebase.io/ipfs/.

## Not examined
Base (19 tx), Arbitrum (12), Zora (3): no free archive access from this container. X/Twitter posts: unverified (mirror unreachable). IPFS metadata for Optimism works: gateways blocked here.
