#!/usr/bin/env python3
"""Build curation/research/onchain/census.json: every collection nnxyz made, on every
chain searched, against what the collector holds.

Sources: curation/research/onchain/contracts.json (the artist's contracts on
Ethereum, Optimism, Polygon, Base, Arbitrum, Zora and Gnosis), holdings.json
(the three collector wallets on those chains), tezos.json (objkt and TzKT),
fantom.json, rarible.json, nnxyz-onchain.json (the Nifty Ink ledger), data/gallery.json,
data/abstract.json and data/onchain.json (what the site shows). The grouping of
contracts into collections, and the notes, are curated here and cite the
artist's posts or the contract metadata; nothing is inferred from a title alone.
"""

import collections
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
R = ROOT / "curation/research/onchain"


def load(name):
    return json.loads((R / name).read_text())


# Contracts grouped into the collections the artist named. Re-issued contracts
# carry the same works again (holdings.json notes); empty contracts are listed
# as attempts. Notes cite the source.
GROUPS = [
    {
        "id": "index-collection",
        "title": "nnxyz index collection",
        "year": "2022 to 2024",
        "contracts": [
            "ethereum:0x7ebfcf1f26845f1deface5b7043f57a560df8780",
            "optimism:0x81a95c21bf5d76d2fbb49e39b057fb5667f34b0a",
            "optimism:0x62129c832e1fd5a83393b7bfeb75d010b5bff0c8",
            "optimism:0x72a3f8ce5c34628194ada80f7f1edcb50017c9af",
            "polygon:0xd9b66ba086c02c5813d6fbc25b0752f3f0f2585d",
            "polygon:0xc9cd103578bdec5ffdd235c2db34dc520968dc00",
            "arbitrum:0x31b2638abace6e0982ee1e3be4b264088fe1946f",
            "fantom:0xa9d0b754c5ebce7d0655d4d4779330f5f5c2dc92",
            "tezos:KT1TSC9ip7vjknqSRB3KyHbTyte44w2NLptR",
        ],
        "note": "An open, never-ending collection published independently on several chains and expanded by one work when the last sells out (the artist's contract description and posts of August 1 to 2, 2022, which name Warhol's Index Book). Heaven or Hell was its first work; the shrine of March 2024 its fourth on Tezos.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "i-was-famous",
        "title": "i was famous and lord of the inks",
        "year": "2022",
        "contracts": ["ethereum:0x6abb1cd04ede4560355ff90d82967b2eca0b4f7d"],
        "note": "Seven tokens on the artist's own Ethereum contract: i was famous in two sets of three (August 21, 2022, posted as open to offers with the tag thrashart) and lord of the inks (November 20, 2022). The artist's own comment on the year of inks; none is in this collection.",
        "room": None,
    },
    {
        "id": "oink",
        "title": "nnxyz oink",
        "year": "2022",
        "contracts": ["optimism:0x3d42539721aaff66ebe049dcd33d82e2f9c7726a"],
        "note": "Eleven painted pictures on Optimism, November 6 to 8, 2022; the collector bought #1, a lake, for 0.03 ETH on November 7.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "opticals",
        "title": "nnxyz opticals",
        "year": "2022",
        "contracts": [
            "optimism:0x9660fa7f5f3a896912e587b77ef6dbc4cf0f6dc2",
            "optimism:0xe7df60fd9dec072a01ff72d4b0420e23faf7615b",
            "optimism:0x95b76ca11d29f591ecb848e5fe10c21da9b5a008",
        ],
        "note": "Three series of noise and stripe fields on Optimism, November 16 to 20, 2022, posted with the tags generative and opticalart; the Tezos copies sit under the artist's GenAI contract. The collector minted the four of series one and received one of series two.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "abstract",
        "title": "nnxyz abstract",
        "year": "2022",
        "contracts": [
            "polygon:0x73cc4478c5d3adf01d78d95d774bf4006d48f3a3",
            "polygon:0x7b522c8a0c6d0d84a17e660e4f7e9878f91ad16e",
            "polygon:0x8672c0a41eee5b69f1e92ed046f1715e26c4ee79",
            "polygon:0xa999271a4058ee3144ed970362318748508ad186",
        ],
        "note": "Fifty-two paintings minted March 30 to April 4, 2022 and given to collectors on the board as a proof of support; the three empty ERC-721 contracts are the artist's first attempts on Polygon (posts of April 9 to 12, 2022). The collector bought #0000 and #pos on May 3, 2023 and received the rest.",
        "room": "abstract",
    },
    {
        "id": "nifty-faces-px",
        "title": "nnxyz nifty faces px",
        "year": "2022",
        "contracts": ["polygon:0xfa56cd63c6121926be7bb400918ff34a72648f3e"],
        "note": "The pixelated twin of every Nifty Face held when the series reached 130, airdropped April 27 to May 4, 2022 (posts of April 21 and May 4). Seven are here: six twins and the twin of #0000.",
        "room": "after-nifty-ink--an-twins",
    },
    {
        "id": "pxlpop",
        "title": "nnxyz pxlpop",
        "year": "2022",
        "contracts": ["polygon:0xf4055eafd3fec28a5e958d150a82a5270a9091c4"],
        "note": "Fifty-one pixel figures, a sub-collection of forty pieces with one simple trait (post of April 21, 2022); #2.01 was dropped into the collector's wallet on April 28.",
        "room": "after-nifty-ink--an-twins",
    },
    {
        "id": "nnxyz-polygon-early",
        "title": "nnxyz (Polygon, April 2022)",
        "year": "2022",
        "contracts": [
            "polygon:0x5cdf1ccfd250298c252fceb621337bb77d63c345",
            "polygon:0x1695cb79ef1641cec0c0a1528725fef5b44b0dca",
            "polygon:0x6a52cf573642e0199927a1cd426d794be76baa9c",
        ],
        "note": "Eight pieces minted on a contract called nnxyz, seven of them burned by the artist; #5 survives and is here. The two contracts named nnxyz 0000 (three tokens and none) are from the same week of experiments.",
        "room": "after-nifty-ink--an-twins",
    },
    {
        "id": "chic-city-cat-club",
        "title": "nnxyz chic city cat club",
        "year": "2022 to 2024",
        "contracts": [
            "polygon:0xbfdf6e515dbef6e9e6f474867c10302c395b8dd8",
            "polygon:0x386519324f0b6e65fa76c9f15c62ef918965342a",
            "polygon:0x717a5b30838c89b6a238e28498b40bbf4eba7d4b",
        ],
        "note": "A home for one of 9792 cats, no roadmap, no utility (the contract description). Sent free to every holder of an ink in July 2022, then minted for one MATIC; re-issued on a second contract in December 2023 and airdropped again in April 2024. Eleven cats are here, each held twice.",
        "room": "after-nifty-ink--an-twins",
    },
    {
        "id": "cringe-eez",
        "title": "nnxyz cringe-eez doodles",
        "year": "2023 to 2024",
        "contracts": [
            "polygon:0x60644a9ef4a438f7b08770f7f857654e8952d8df",
            "polygon:0x32ad953d36775417ebce3eedaf088ca31f028cae",
            "polygon:0xa34d1e82352a245873cc54572beb86a8359bf707",
        ],
        "note": "Scribbled heads at 4096 pixels, July 2023; re-issued in June 2024 with the artist's note that the holders now had their doodles back and no more would be minted. Two are here, each held twice.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "friends-of-country-air",
        "title": "nnxyz Friends Of Country Air",
        "year": "2023",
        "contracts": [
            "polygon:0x1372ce2c2e8b623f6375811931266106df63b4e4",
            "polygon:0x84420bd6c3681cb91d3c041daf0b815ba5a35174",
        ],
        "note": "Twelve flat portraits, November 2023, re-issued in December; seven are here, each held twice.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "nnxyz-tezos",
        "title": "nnxyz (Tezos)",
        "year": "2022 to 2024",
        "contracts": ["tezos:KT1McNTi6T4PXQjPAM7o3VRYpC67TG2RKnio"],
        "note": "Ninety-seven tokens on the artist's main Tezos contract, August 2022 to June 2024, sold on objkt; two untitled works are here.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "nnxyz-genai",
        "title": "nnxyz GenAI (Tezos)",
        "year": "2022 to 2024",
        "contracts": ["tezos:KT1RF7bsYiAZdqmzf7C1WGqZ1XqRqbXwfztp"],
        "note": "Seventy-one tokens the artist published under a contract named GenAI, November 2022 to May 2024: opticals, kanji, i send you summer and others. Three are here.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "gmgl",
        "title": "GMGL (Tezos)",
        "year": "2023",
        "contracts": ["tezos:KT1NyLH1iC39ABjaLnqk5gHyAyGnKaXoJumY"],
        "note": "One hundred and twenty tokens in a week of September 2023, under a description that begins walk the line until you reach the happy path. #1 is here.",
        "room": "after-nifty-ink--an-index",
    },
    {
        "id": "objkt-paint",
        "title": "objkt Paint 98 (Tezos)",
        "year": "2024",
        "contracts": ["tezos:KT1X5W2akGCxvykmHoqoQzJfEgg1RGNGBCDd"],
        "note": "Six tokens made with objkt's paint tool, February to March 2024. None is in this collection.",
        "room": None,
    },
    {
        "id": "hic-et-nunc",
        "title": "hic et nunc (Tezos)",
        "year": "2024",
        "contracts": ["tezos:KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton"],
        "note": "Fifteen tokens on the hic et nunc contract, May 29 to 30, 2024. None is in this collection.",
        "room": None,
    },
    {
        "id": "openlike",
        "title": "OpenLike (Zora)",
        "year": "2024",
        "contracts": ["zora:0x4d799e5b1217a436dac87cac0b6dce9e40e15ca8"],
        "note": "Three CC0 graphics minted June 13, 2024, the artist's answer to hidden likes on X (posts of that day: right-click save or mint, free on Zora). None is in this collection.",
        "room": None,
    },
    {
        "id": "base",
        "title": "BasedCaps and nnxyz (Base)",
        "year": "2024",
        "contracts": [
            "base:0xc7f990188a6a182772eb82a37085411a908de890",
            "base:0x0f84df25934b176f9927558220f972010fd18c77",
            "base:0x1ce9b41e020c85b0ff0949be15c0a6ad9df2c709",
            "base:0x712a590f626a9c32cb7186d4595fbd0da2e6a070",
            "base:0x8267872711208d5eb81212fc9fd87eab10486626",
        ],
        "note": "Sixteen BasedCaps and two single tokens, June 2024, posted in the voice of a hype account (are you a hypebeast and craving klout). No collector wallet holds a Base token.",
        "room": None,
    },
    {
        "id": "nnxyz-polygon-2024",
        "title": "nnxyz (Polygon, 2024)",
        "year": "2024",
        "contracts": ["polygon:0xb00096a74fc0d24ee139ad21bea8b1fe904eee93"],
        "note": "An empty contract from June 2024.",
        "room": None,
    },
]
SHARED = [
    {
        "id": "rari-masks",
        "title": "Rari Masks (Rarible, Ethereum)",
        "year": "2021 to 2022",
        "note": "Masks listed on Rarible's shared Ethereum ERC-1155 from December 2021 (posts of December 9 and 10, 2021; April 25, 2022, when the artist folded them into the Nifty Faces px airdrop). The October 16 scan (rarible.json) found no transfer involving an artist address on Rarible's Ethereum contracts, so the masks were lazy-minted listings, and no collector wallet holds or ever held a Rarible token.",
        "status": "scanned",
    },
    {
        "id": "canvas-is-everywhere",
        "title": "canvas is everywhere (Rarible)",
        "year": "2022",
        "note": "Photographs of graffiti, fully biodegradable art (posts of March 29 to May 1, 2022), listed on Rarible. On July 20, 2022 the artist posted that every token in the series would be burned and that Tezos was the better home for it. The contract those posts link to is Rarible's own (0xc91544\u2026), and the October 16 scan found no transfer on it involving an artist address, so the listings were lazy-minted and there was nothing on chain to burn; the series continued on Tezos as canvas everywhere. Nothing survives to collect here.",
        "status": "scanned",
    },
    {
        "id": "opensea-storefront",
        "title": "OpenSea shared storefront (Polygon)",
        "year": "2022",
        "note": "Tokens the artist lazy-minted on OpenSea's shared Polygon contract, identified by the creator bits of the token id; the scan found none in the collector's wallets.",
        "status": "scanned",
    },
]


def main():
    contracts = load("contracts.json")
    holdings = load("holdings.json")
    tezos = load("tezos.json")
    fantom = load("fantom.json")
    onchain = json.loads((ROOT / "data/onchain.json").read_text())["artworks"]
    gallery = json.loads((ROOT / "data/gallery.json").read_text())
    by_key = {f"{c['chain']}:{c['address'].lower()}": c for c in contracts["contracts"]}
    for address, info in fantom["contracts"].items():
        if "index" in (info.get("name") or ""):
            by_key[f"fantom:{address}"] = {
                "chain": "fantom",
                "address": address,
                "name": info["name"],
                "standard": "ERC-721",
                "tokenCount": info["totalSupply"],
                "deploy": {"time": info["mintTx"]["date"]},
                "explorerUrl": f"https://ftmscan.com/address/{address}",
            }
    for col in tezos["collections"]:
        by_key[f"tezos:{col['contract']}"] = {
            "chain": "tezos",
            "address": col["contract"],
            "name": col["name"],
            "standard": "FA2",
            "tokenCount": col["tokens"],
            "editions": col["totalSupply"],
            "deploy": {"time": col["first"]},
            "last": col["last"],
            "explorerUrl": f"https://objkt.com/collections/{col['contract']}",
        }
    held_tokens = collections.defaultdict(set)
    for h in holdings["holdings"]:
        held_tokens[f"{h['chain']}:{h['contract'].lower()}"].add(str(h["tokenId"]))
    tz_held = {
        (h["contract"], str(h["tokenId"])): h["quantity"] for h in tezos["collectorHoldings"]
    }
    for (contract, token), qty in tz_held.items():
        held_tokens[f"tezos:{contract}"].add(token)
    shown = collections.Counter(
        f"{w['chain']}:{w['contract'].lower() if w['chain'] != 'tezos' else w['contract']}"
        for w in onchain
    )
    shown["polygon:0x73cc4478c5d3adf01d78d95d774bf4006d48f3a3"] = 52
    groups = []
    for g in GROUPS:
        rows = []
        for key in g["contracts"]:
            c = by_key[key]
            rows.append(
                {
                    "chain": c["chain"],
                    "contract": c["address"],
                    "name": c.get("name"),
                    "standard": c.get("standard"),
                    "tokens": c.get("tokenCount"),
                    "editions": c.get("editions"),
                    "from": ((c.get("deploy") or {}).get("time") or "")[:10] or None,
                    "to": (c.get("last") or "")[:10] or None,
                    "held": len(held_tokens.get(key, ())),
                    "shown": shown.get(key, 0),
                    "explorerUrl": c.get("explorerUrl"),
                }
            )
        groups.append(
            {
                **g,
                "contracts": rows,
                "heldWorks": sum(r["held"] for r in rows),
                "shownWorks": sum(r["shown"] for r in rows),
                "tokensMinted": sum(r["tokens"] or 0 for r in rows),
            }
        )
    series = collections.Counter(w["collectionId"] for w in gallery)
    nifty_ink = {
        "platform": "Nifty Ink (Gnosis)",
        "inksCreated": 593,
        "inksCreatedBasis": "createInk calls in the ledger; the artist's page shows 595",
        "inksOwned": len(gallery),
        "editionsOwned": holdings["niftyInk"]["nnxyzTokensHeld"],
        "series": [
            {"id": "nifty-faces", "title": "Nifty Faces", "owned": series["nifty-faces"]},
            {"id": "nnotb", "title": "New Nifty on the Block", "owned": series["nnotb"]},
            {"id": "rawblocks", "title": "Rawblocks", "owned": series["rawblocks"]},
            {"id": "nnxyz-other", "title": "Other nnxyz", "owned": series["nnxyz-other"]},
        ],
        "note": "Every ink the collector holds is on the site. Twenty or so of the artist's inks are held by others or were burned unsold; nnxyz #65 (January 2025) is one.",
    }
    census = {
        "schemaVersion": 1,
        "builtAt": "2026-10-16T18:00:00Z",
        "method": __doc__.strip(),
        "chainsSearched": contracts["chainsSearched"] + ["fantom (250)", "tezos"],
        "niftyInk": nifty_ink,
        "collections": groups,
        "sharedContracts": SHARED,
        "totals": {
            "artistContracts": len(by_key),
            "collectionsWithWorks": sum(1 for g in groups if g["tokensMinted"]),
            "collectionsHeld": sum(1 for g in groups if g["heldWorks"]),
            "worksOnSite": len(gallery) + 52 + len(onchain),
        },
    }
    (R / "census.json").write_text(json.dumps(census, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(census["totals"]))
    for g in groups:
        print(
            f"{g['title'][:40]:40} minted {g['tokensMinted']:5} held {g['heldWorks']:3} shown {g['shownWorks']:3}"
        )


if __name__ == "__main__":
    main()
