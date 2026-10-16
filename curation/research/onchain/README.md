# nnxyz on-chain research notes (2026-10-16)

Evidence pulled from public explorers and RPCs. Wallet activity is evidence of what an address did, not proof of who a person is.

Committed files: `nnxyz-onchain.json` (histories, sales, royalty wallet, likes), `contracts.json` (every artist contract on seven chains), `holdings.json` (the collector's tokens in them). Earlier scratch files (gnosis-tx.json, buyers.json, meta/*, img/* and so on) were never committed.

## Addresses
- nnxyz main: 0x9410bc26732ed9480833cb3a4a0f377908e261e2 (no ENS primary name; nnxyz.eth is not registered)
- nnxyz second address: 0x14a19d826e03e5a33df33f4ff898968329cb4085. It drew nifty faces #12 on 2021-11-30 and sent it to the main address the same day. It holds DEFAULT_ADMIN_ROLE on the Polygon index collection 0xc9cd1035..., which ties it to the artist.
- Royalty wallet, **confirmed**: 0x7e7336db34290da67fdf8c7c02e55dde6c656105. The evidence is under "Royalty wallet" below.
- collector wallets: thingelstad.eth 0x2bda…5720, nnxyz.thingelstad.eth 0xf872…7a37, niftyink.thingelstad.eth 0xb009…19f
- Nifty Ink: NiftyInk 0x49de55fba08af88f55eb797a456fdf76b151c8b0, NiftyToken 0xcf964c89f509a8c0ac36391c5460df94b91daba5, likes 0xbd0621dcb64e1eed503f709422b019b2fa197af6 (Gnosis)
- Polygon: "nnxyz abstract" (nnxyzstrct) 0x73cc4478c5d3adf01d78d95d774bf4006d48f3a3, owner = artist
- Ethereum: "nnxyz index collection" 0x7ebFcF1F26845F1dEface5b7043f57A560DF8780 (thirdweb), "nnxyz" 0x6aBb1CD04edE4560355fF90d82967B2eCA0B4f7D (Manifold)
- Optimism: index collection 0x81a95C21bf5d76d2fBb49E39B057fB5667F34b0A, opticals s1 0x9660fA7f5F3A896912E587B77ef6dBC4Cf0f6Dc2, s2 0xe7dF60fD9dEc072a01ff72d4b0420E23FAF7615b, s3 0x95B76Ca11D29F591ecB848e5fE10C21Da9B5a008, "nnxyz" (oink) 0x3d42539721AAFf66EBe049DCd33D82e2f9c7726a

## Gnosis / Nifty Ink (5,669 transactions, 2021-10-26 to 2024-12-05)
- 593 createInk, 869 setPrice, 3,226 mint, 536 safeTransferFrom, 346 likes, 67 bridge-out transactions (Connext, Hop) totalling 3,969 xDAI
- Sales income: 283 payments, 4,026 xDAI, 50 distinct buyers. Collector wallets: 121 payments, 2,127 xDAI. tyler.thingelstad.eth and mazie.thingelstad.eth each bought 3 on 2022-05-10. austingriffith.eth: 18 payments, 268 xDAI, first 2022-02-01. iamjim.eth 16, jaxcodes.eth 15, justn.eth 7, superphiz.eth 3, cvjoint.eth 3, fahim.eth 3, danielsheldon.eth 2, polimyl.eth 2.
- Monthly payments peak in 2022-05 (78). Late sales run from 2023-12 to 2024-06, plus 2025-01 and 2025-04.
  - 2025-01: #65, bought on 2025-01-11 by 0x78e87757861185ec5e8c0ef6bf0c69fa7832df6c. That is not a collector wallet.
  - 2025-04: #64 and #66, bought by nnxyz.thingelstad.eth on 2025-04-06.
  - An earlier version of this note put 2025-01 under the collector wallets. That was wrong.
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

## Polygon (full history: nonce 1,277; 1,286 transactions, 3,520 NFT transfers)
- **Activity:** 907 sent transactions in 2022, 326 in 2023 and 44 in 2024. The last was 2024-07-01.
- **Contracts:** 20 artist contracts. See contracts.json.
- **Token counts by contract** (from contracts.json):
  - cringe-eez doodles 0x60644a9e: 1,970
  - chic city cat club 0xbfdf6e51: 415, and its re-issue 0x38651932: 414
  - nifty faces px 0xfa56cd63: 209
  - cringe-eez doodles re-issue 0x32ad953d: 69
  - abstract 0x73cc4478: 53 ids
  - pxlpop 0xf4055eaf: 51
  - Friends Of Country Air: 12 on each of its two contracts
  - "nnxyz" 0x5cdf1ccf: 8 minted, 7 burned
  - "nnxyz 0000" 0x1695cb79: 3
  - index collection 0xd9b66ba0: 2
  - seven more contracts have no tokens
- **Abstract:**
  - 53 token ids exist on chain. 52 were minted from 2022-03-30 to 2022-04-04, and #0000 in 2023-05 at the sale.
  - The 53rd id is "nnxyz abstract #1" (...266114). It was minted on 2022-03-30 and burned three hours later, and was never distributed.
  - There were 46 gifts in April 2022.
  - On 2023-05-04 the collector bought #0000 for 350 POL and #pos for 5 POL on OpenSea (Seaport). The artist sent the other 50 to nnxyz.thingelstad.eth the same day.
  - On 2023-07-08, 52 transfers went to the burn address.
- **Re-issues:** three contracts are later copies, airdropped to holders of the originals with the same token ids:
  - chic city cat club 0x38651932: deployed 2023-12-05, airdropped to the collector 2024-04-01
  - cringe-eez doodles 0x32ad953d: 2024-06-18
  - Friends Of Country Air 0x84420bd6: 2023-12-05
- **Second address:** one Polygon transaction.
- **Unsolicited airdrops:** about 20 spam token airdrops (vouchers and fake USDT/OP) are in the token transfers. They are not the artist's.

## Base (19 transactions, 2024-06-13 to 2024-06-29)
- Five contracts, all deployed by the artist:
  - "nnxyz" 0x712a590f
  - "nnxyz" 0x82678727
  - "nnxyz base" 0x1ce9b41e (one token, "yours to make")
  - BasedCaps 0x0f84df25
  - BasedCaps 0xc7f99018 (16 tokens; the description is a deliberate shill parody)
- No collector wallet holds a Base token.
- The history comes from base.blockscout.com v2. Method names there are raw selectors.

## Arbitrum (12 transactions, 2022-08-03 to 2023-07-18)
- One contract: index collection 0x31b2638a, with three Heaven or Hell tokens.
- Claims were 0.00315 ETH each:
  - iamjim.eth on 2022-08-03
  - thingelstad.eth on 2022-08-06. This is the one the collector holds, now in nnxyz.thingelstad.eth.

## Zora (3 transactions, all 2024-06-13)
- On 2024-06-13 the artist created the 1155 contract 0x4d799e5b through Zora's factory. It holds three tokens: OpenLike, OpenLike BW and nnxyz OpenLike.
- Zora has no working explorer API. The history was rebuilt from full-range logs, and the nonce (3) confirms it is complete.

## Royalty wallet 0x7e7336db34290da67fdf8c7c02e55dde6c656105: confirmed
- **Named as receiver:** `royaltyInfo` names it as the royalty receiver on 20 artist contracts (Ethereum, Optimism, Polygon, Base, Arbitrum). On the thirdweb contracts, primary sales go to the artist (`primarySaleRecipient` = 0x9410...).
- **Royalties received:** it took the 10% royalty share in four sales, in the same transactions that paid the artist:
  - Optimism, oink #1: 0.003 ETH
  - Polygon, abstract #0000: 35 POL
  - Polygon, abstract #pos: 0.5 POL
  - Polygon, pxlpop: 0.00065 WETH
- **Outgoing:**
  - To the artist on Optimism (2023-06-21) and Polygon (2023-07-03)
  - 35 POL to 0x84f3ac69... (2023-05-23)
  - one WETH swap through the Uniswap router
- **Elsewhere:** nonce 0 on Ethereum, Base, Arbitrum, Zora and Gnosis.
- **Exceptions:** seven contracts name the artist's main address as receiver instead: four on Base, the Zora 1155, and both Friends Of Country Air contracts. The early Polygon contracts (abstract, pxlpop, nifty faces px, "nnxyz" 0x5cdf) report none.

## Sales beyond Nifty Ink (13, plus one artist self-claim)
- **Collector:** seven purchases by the collector wallets:
  - index collection claims on Ethereum and Arbitrum, 0.00315 ETH each
  - 10 cats in two claims, 6 POL and 4 POL
  - oink #1 on OpenSea Optimism, 0.03 ETH
  - abstract #0000 and #pos on OpenSea Polygon, 350 POL and 5 POL
- **Others:**
  - iamjim.eth: two cats, 2 POL; Arbitrum index collection, 0.00315 ETH
  - greenside.eth: two cats, 1 POL each
  - danielsheldon.eth: Polygon index collection, 0.00315 WETH
  - an unnamed buyer: pxlpop, 0.0065 WETH, through a relayed transaction whose marketplace is not identified
- Listed in `salesBeyondNiftyInk`, with the method used. Other payments to the artist (241: swaps, bridges, airdrops, payouts without an NFT in the same transaction) are listed apart.

## The artist's own words found so far
- Bio line (TikTok @0000nnxyz, read 2026-10-16): "born readymade to please the eye IG @0000nnxyz #thrashart #notnonexyz".
- Contract description of "nnxyz index collection" (Ethereum 0x7ebF… and Optimism 0x81a9…, contractURI on IPFS): "The nnxyz index collection is an open never-ending collection published independently on multiple blockchains. The collection is always expanded by another work as soon as all works from a drop are sold out. The collection is planned completely openly." It links https://twitter.com/0000nnxyz/status/1554449359135281153 (2022-08-02) and a Notion page https://nnxyz.notion.site/nnxyz-index-collection-e5ec035dd7a54937a905a2a9f2661896 which is gone ("This page couldn't be found"); the Wayback Machine never captured it.
- Titles: "i was famous", "lord of the inks", "Heaven or Hell", "oink", "opticals", "New Nifty on the Block", "rawblocks", "#0000" origin works.
- The posts themselves are now captured: see `../social/README.md`, `x-posts.json` and `quotes.json`.

## Images inspected (small copies in the session scratchpad, not committed)
- "i was famous #1/3" (Arweave): Duchamp's Fountain, four panels in flat Pop colors, textured print marks, "nnxyz" signed lower right.
- "nnxyz lord of the inks" (Arweave, 9000x3600): mosaic of roughly 500 Nifty Ink drawings, the artist's own retrospective wall.
- "nnxyz oink #1" (IPFS, 2339x1654): a soft, painterly landscape of a pond in greens and blues; nothing like the inks.
- "nnxyz opticals #268" (IPFS, 748x748): a dense generative scatter of tiny colored marks on white; the "generative art based on my Nifty Ink" line fits this series.
- "nnxyzic Heaven or Hell #1" (IPFS, 1111x1111, 11-frame gif): a red hooded head with yellow scrawled letters across the face on a pale blue ground; close kin to the Faces and NNOTB rooms.
- IPFS reachable from this container only through https://ipfs.filebase.io/ipfs/.

## Examined in the 2026-10-16 depth pass
- **Full histories:**
  - the artist, the second address and the royalty wallet on Polygon, Base, Arbitrum and Zora
  - the royalty wallet on Ethereum, Optimism and Gnosis
- **Contracts and holdings:** every artist contract on the seven chains (contracts.json), and the collector's holdings in them (holdings.json).
- **Royalty settings:** royalty receiver and primary-sale recipient read from every contract.
- **ENS:** names for 97 counterparties, each a reverse record confirmed by a forward lookup.
- **Likes:** the top 20 artists the artist liked on Nifty Ink, with ink counts read from their pages (gnosis.topLikedArtists).
- **Sources:**
  - Etherscan v2 for Ethereum, Polygon and Arbitrum
  - Blockscout PRO for Optimism and Gnosis
  - base.blockscout.com for Base
  - full-range logs for Zora

## Still not examined
- **Other chains:** Fantom and Tezos.
  - An archived Notion page "nnxyz index collection Fantom Mint" (2022-08-05) shows the index collection was planned on Fantom, or released there.
  - The artist's objkt and Rarible profiles show Tezos work (OpenLike, Canvas is Everywhere) and Rarible Ethereum 1155s ("rari masks").
  - None of these were searched.
- **Shared storefronts beyond Polygon.** Tokens on shared marketplace contracts other than the Polygon OpenSea storefront (Rarible on Ethereum, objkt on Tezos) are not listed as artist contracts.
- **Base method names** are raw selectors. Decoding them would need the contracts' ABIs.
- **Seaport sales outside the artist's addresses.** A resale between two other people pays the royalty wallet only through a separate payout, and only paid sales that touched an artist address in the same transaction are listed. The royalty wallet's four receipts suggest few such resales.
