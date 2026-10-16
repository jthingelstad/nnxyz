#!/usr/bin/env python3
"""Per-work story facts and the 2022 timeline, from the ledger and the artist's posts.

Writes curation/story/facts.json (keyed by drawing CID: the day the work reached
the collector and how, and the artist's own post announcing it) and
curation/story/timeline-2022.json (month by month counts from the ledger, the
archive and the posts, plus the dated events the 2022 story page names).

Reads only committed research: data/gallery.json,
curation/research/onchain/collector-acquisitions.json,
curation/research/onchain/nnxyz-onchain.json and
curation/research/social/x-posts.json. No network, no model.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "curation/story"
GALLERY = ROOT / "data/gallery.json"
ACQUISITIONS = ROOT / "curation/research/onchain/collector-acquisitions.json"
LEDGER = ROOT / "curation/research/onchain/nnxyz-onchain.json"
POSTS = ROOT / "curation/research/social/x-posts.json"
QUOTES = ROOT / "curation/research/social/quotes.json"
PROFILES = ROOT / "curation/research/social/profiles.json"
X_PROFILE = ROOT / "curation/research/social/x-profile.json"

ARTIST = "0000nnxyz"
PRICE = re.compile(r"(\d+(?:[.,]\d+)?)\s*xdai", re.IGNORECASE)
PRICE_LINE = re.compile(r"^/?\s*\d+(?:[.,]\d+)?\s*xdai\s*$", re.IGNORECASE)
EDITION_LINE = re.compile(r"^\d+\s*/\s*\d+$")
ZERO = "0x0000000000000000000000000000000000000000"
# The complete sets were delivered by direct transfer in the hours after each
# origin work was bought (collector-acquisitions.json, highlights).
HANDOVERS = (
    ("2022-08-13T22:00:00Z", "2022-08-15T00:00:00Z", "Nifty Faces"),
    ("2022-10-16T11:00:00Z", "2022-10-17T00:00:00Z", "New Nifty on the Block"),
    ("2023-03-15T21:00:00Z", "2023-03-18T00:00:00Z", "Rawblocks"),
)
CID = re.compile(r"nifty\.ink/ink/(Qm[1-9A-HJ-NP-Za-km-z]{44})")
URL = re.compile(r"https?://\S+")
# Only the collector is named on the site. The two other household wallets in
# the research data are shown as "another wallet" and never described.
COLLECTOR_WALLETS = {
    "thingelstad.eth",
    "nnxyz.thingelstad.eth",
    "niftyink.thingelstad.eth",
}
HANDLES = {
    "@niftyink": "Nifty Ink",
    "@austingriffith": "Austin Griffith",
    "@gnosischain": "Gnosis Chain",
    "@rarible": "Rarible",
    "@opensea": "OpenSea",
    "@notionhq": "Notion",
    "@thirdweb_": "thirdweb",
}

# Dated events the 2022 page names, each with the record it comes from. The
# market dates are the public record; the artist's dates are the ledger and
# the posts (ids in curation/research/social/x-posts.json).
EVENTS_2022 = [
    ("2022-02-01", "artist", "austingriffith.eth funds the artist's first Ethereum wallet with 0.06 ETH.", "Ethereum ledger"),
    ("2022-03-02", "artist", "The artist posts why they work on Nifty Ink: easy and fun entry, no entry costs, an active community.", "post 1499050033068584965"),
    ("2022-03-20", "collector", "The Weekly Thing #216 recommends Nifty Ink, found through its Gitcoin grant: not about going to the moon, all about fun.", "The Weekly Thing #216"),
    ("2022-03-30", "artist", "The fifty-two Abstract paintings begin minting on Polygon, through April 4.", "Polygon ledger"),
    ("2022-04-02", "artist", "Forty-six Abstract paintings are given to collectors and artists on the board, over the following days.", "Polygon ledger"),
    ("2022-04-12", "artist", "The artist explains the proof-of-support airdrop: value outside Nifty Ink for every holder, as a small thank you.", "post 1513745968646262787"),
    ("2022-04-14", "collector", "The first purchase: Nifty Faces #109, for 20 xDai.", "Gnosis ledger"),
    ("2022-04-23", "collector", "The collector mints fifty copies of an ink reading UKRAINE and matches every sale with a donation.", "thingelstad.com, April 23, 2022"),
    ("2022-04-25", "artist", "The artist mints 200 nifties, the drawing for two hundred inks, straight into the collector's wallet.", "Gnosis ledger"),
    ("2022-04-27", "artist", "Every holder of a Nifty Face receives its pixel twin on Polygon, through May 4.", "Polygon ledger; posts of April 21 and May 4"),
    ("2022-05-06", "artist", "\"Today I noticed that I have already created 552 NFTs as nnxyz.\"", "post 1522493952661856257"),
    ("2022-05-09", "market", "Terra's stablecoin loses its peg; by May 13 the UST and LUNA tokens are near zero and the crypto market has fallen with them.", "public record"),
    ("2022-05-10", "collector", "Three purchases from the collector's wallet for a single xDai each; two other wallets buy three inks each the same day.", "Gnosis ledger"),
    ("2022-05-11", "collector", "\"I'm the top collector on Nifty Ink. I just have so much fun here.\"", "thingelstad.com, May 11, 2022"),
    ("2022-05-23", "artist", "New Nifty on the Block #100 is minted into the collector's wallet, unpaid.", "Gnosis ledger"),
    ("2022-05-29", "collector", "A hundred copies of a stranger's HELLO ink go to the readers who hold a newsletter token.", "thingelstad.com, May 29, 2022"),
    ("2022-06-20", "artist", "300 nifties is minted into the collector's wallet.", "Gnosis ledger"),
    ("2022-07-15", "artist", "Chic City Cat Club: a cat for every holder of an ink, no roadmap, no utility.", "Polygon ledger; post 1548675109338206209"),
    ("2022-07-20", "artist", "The artist decides to burn the Canvas is Everywhere series and move that kind of work to Tezos.", "post 1549574173256810496"),
    ("2022-08-02", "artist", "The index collection is named, after Warhol's Index Book, and described as open, never-ending and planned completely openly.", "posts 1554286514615582720 and 1554449359135281153"),
    ("2022-08-05", "artist", "The index collection contract is deployed on Ethereum; Heaven or Hell follows on Ethereum, Optimism and Arbitrum.", "Ethereum and Optimism ledgers"),
    ("2022-08-11", "artist", "\"My first ink will be the last burned.\" The artist announces that every unsold Nifty Ink edition will be burned.", "post 1557869984587595782"),
    ("2022-08-13", "collector", "Nifty Faces #0000 is bought for 500 xDai; within hours the artist sends 126 Faces and the first five of New Nifty on the Block.", "Gnosis ledger"),
    ("2022-08-15", "artist", "\"Why should an artist disclose the tools he uses?\"", "post 1559284888775409671"),
    ("2022-08-21", "artist", "i was famous: Duchamp's Fountain four times over, in editions of three on the artist's own Ethereum contract.", "Ethereum ledger"),
    ("2022-08-23", "artist", "\"All 400 created nifties will be gradually burned. Everything after that is part of a new story.\"", "post 1561950869066846208"),
    ("2022-09-15", "market", "Ethereum completes the Merge and stops mining.", "public record"),
    ("2022-09-28", "collector", "The collector draws nnxyz fan art #0001.", "thingelstad.com, September 28, 2022"),
    ("2022-10-15", "artist", "The last New Nifty on the Block drawing in the collection is recorded.", "archive"),
    ("2022-10-16", "collector", "New Nifty on the Block #0000 is bought for 750 xDai in the morning; 275 drawings arrive that afternoon over four hours.", "Gnosis ledger"),
    ("2022-11-06", "market", "FTX begins to fail; it files for bankruptcy on November 11.", "public record"),
    ("2022-11-06", "artist", "oink, eleven painted pictures on Optimism, through November 8; the collector buys #1 on November 7.", "Optimism ledger"),
    ("2022-11-16", "artist", "opticals, three series of stripe and noise fields on Optimism, through November 20.", "Optimism ledger"),
    ("2022-11-20", "artist", "lord of the inks: one picture of about five hundred of the artist's own Nifty Ink drawings, on Ethereum.", "Ethereum ledger"),
    ("2022-11-24", "collector", "Over Thanksgiving brunch the collector moves an nnxyz ink from Gnosis to Ethereum to show two friends how a bridge works.", "thingelstad.com, November 24, 2022"),
]


def read(path: Path):
    return json.loads(path.read_text())


def print_text(text: str) -> str:
    """The post as the page prints it: links and hashtag-only lines removed,
    handles expanded, emoji removed. The verbatim text is kept beside it."""
    lines = []
    for line in text.split("\n"):
        line = URL.sub("", line)
        words = line.split()
        if words and all(w.startswith(("#", "@")) or not re.search(r"\w", w) for w in words):
            continue
        lines.append(line)
    out = "\n".join(lines)
    for handle, name in HANDLES.items():
        out = re.sub(re.escape(handle), name, out, flags=re.IGNORECASE)
    out = re.sub(r"(?<!\w)#(\w)", r"\1", out)  # "#nnxyz" -> "nnxyz"
    out = "".join(
        " " if unicodedata.category(ch) in {"So", "Sk", "Cs", "Co"} else ch
        for ch in out
        if ch not in "‍️"
    )
    out = re.sub(r" +([,.!?;:])", r"\1", out)
    out = re.sub(r"\*\*\s*", "", out)
    out = re.sub(r"[ \t]+", " ", out)
    out = re.sub(r" ?\n ?", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip(" \n-")


def remark(printed: str, title: str) -> str:
    """What the post says beyond naming the drawing and its price."""
    title_words = set(re.findall(r"[a-z0-9]+", title.lower()))
    kept = []
    for line in printed.split("\n"):
        bare = line.strip(" /")
        if not bare:
            kept.append("")
            continue
        if PRICE_LINE.match(bare) or EDITION_LINE.match(bare):
            continue
        words = re.findall(r"[a-z0-9]+", re.sub(r"\b\d+\s*/\s*\d+\b", " ", bare.lower()))
        extra = [
            w
            for w in words
            if not w.isdigit()
            and w not in title_words | {"nifty", "ink", "inks", "nnxyz", "new", "on", "the", "block", "faces", "rawblocks", "newniftyontheblock", "nnotb", "xdai"}
        ]
        # A line that only names the drawing (title words, "Nifty Ink", an edition
        # count or a price) is the announcement itself, not a remark.
        if len(extra) <= 1 and (PRICE.search(bare) or len(words) <= 9):
            continue
        kept.append(bare)
    return re.sub(r"\n{2,}", "\n", "\n".join(kept)).strip()


def how_collected(acquisition: dict, artist_name: str) -> str:
    """One quiet line for the details panel. Only the collector is named."""
    kind = acquisition["kind"]
    paid = acquisition.get("paidToArtistXDai")
    when = acquisition["collectedOn"]
    if kind == "purchase":
        amount = f"{paid:g} xDai" if paid else "an unrecorded price"
        return f"Bought from the artist for {amount}"
    if kind == "gift":
        for start, end, series in HANDOVERS:
            if start <= when < end:
                return f"Sent by the artist with the complete {series} set"
        return "Sent by the artist"
    if acquisition["from"] == ZERO and not paid and artist_name == "nnxyz":
        return "Minted into the collector's wallet by the artist"
    return "Collected"


def main() -> None:
    gallery = read(GALLERY)
    acquisitions = read(ACQUISITIONS)
    ledger = read(LEDGER)
    posts = [p for p in read(POSTS)["posts"] if p["author"] == ARTIST]
    owned = {work["inkId"]: work for work in gallery}

    by_cid: dict[str, list[dict]] = defaultdict(list)
    for post in posts:
        for cid in sorted(set(CID.findall(json.dumps(post)))):
            if cid in owned:
                by_cid[cid].append(post)

    # The artist's income per transaction from the ledger: a purchase can pay
    # the artist in two legs (the share and the fee), and the acquisitions file
    # recorded only one of them for the three origin pieces.
    paid_by_tx: dict[str, float] = defaultdict(float)
    for payment in ledger["gnosis"]["paymentsToArtist"]:
        paid_by_tx[payment["hash"]] += int(payment["value"]) / 1e18

    facts: dict[str, dict] = {}
    for cid, work in owned.items():
        record: dict = {"title": work["name"]}
        acquisition = acquisitions["works"].get(cid)
        if acquisition:
            if acquisition["kind"] == "purchase" and acquisition.get("txHash") in paid_by_tx:
                acquisition = {**acquisition, "paidToArtistXDai": round(paid_by_tx[acquisition["txHash"]], 6)}
            wallet = acquisition["wallet"]
            record["collected"] = {
                "on": acquisition["collectedOn"],
                "kind": acquisition["kind"],
                "wallet": wallet if wallet in COLLECTOR_WALLETS else None,
                "paidXDai": acquisition.get("paidToArtistXDai"),
                "how": how_collected(acquisition, work["artistName"]),
            }
        linked = sorted(by_cid.get(cid, []), key=lambda p: p["postedAt"])
        if linked:
            first = linked[0]
            printed = print_text(first["text"])
            price = next(
                (PRICE.search(line) for line in first["text"].split("\n") if PRICE_LINE.match(line.strip())),
                None,
            )
            record["post"] = {
                "id": first["id"],
                "url": first["url"],
                "postedAt": first["postedAt"],
                "text": first["text"],
                "printed": printed,
                "remark": remark(printed, work["name"]),
                "priceXDai": float(price.group(1).replace(",", ".")) if price else None,
                "laterPosts": [p["id"] for p in linked[1:]],
            }
        facts[cid] = record

    with_post = sum("post" in r for r in facts.values())
    with_collected = sum("collected" in r for r in facts.values())
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "facts.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "method": (
                    "collected: the first inbound transfer of each owned Nifty Ink work into one of the "
                    "collector's wallets, from collector-acquisitions.json (purchase = bought from the "
                    "artist in that transaction; gift = sent by the artist; transfer = any other inbound "
                    "move); paidXDai is the artist's total income in that transaction from the Gnosis "
                    "ledger (nnxyz-onchain.json), which corrects the three origin pieces where the "
                    "acquisitions file kept only the fee leg. Wallets other than the collector's three named wallets are null. post: the "
                    "earliest post by @0000nnxyz whose text links the drawing's nifty.ink page, from "
                    "x-posts.json; text is verbatim, printed removes links, hashtag-only lines and emoji "
                    "and expands handles; remark is printed minus the lines that only name the "
                    "drawing, its edition or its price; priceXDai is the price the post states. "
                    "how: the one line the artwork page shows. Nothing is paraphrased."
                ),
                "counts": {
                    "works": len(facts),
                    "withCollected": with_collected,
                    "withPost": with_post,
                },
                "works": dict(sorted(facts.items())),
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n"
    )

    # The year, month by month.
    gnosis = ledger["gnosis"]
    months = [f"2022-{m:02d}" for m in range(1, 13)]
    created = Counter(
        t["t"][:7] for t in gnosis["transactions"] if t["method"] == "createInk" and t["ok"]
    )
    owned_drawn = Counter(
        datetime.fromtimestamp(int(w["createdAt"]), timezone.utc).strftime("%Y-%m")
        for w in gallery
        if w["artistName"] == "nnxyz"
    )
    posted = Counter(p["postedAt"][:7] for p in posts)
    payments = Counter(p["t"][:7] for p in gnosis["paymentsToArtist"])
    xdai: dict[str, float] = defaultdict(float)
    for p in gnosis["paymentsToArtist"]:
        xdai[p["t"][:7]] += int(p["value"]) / 1e18
    burn_mints = Counter(
        t["t"][:7]
        for t in gnosis["transactions"]
        if t["method"] == "mint" and (t.get("mintTo") or "").startswith("0xdead")
    )
    likes = Counter(like["date"][:7] for like in gnosis["likes"])
    # Bought and given count the collector's named wallets; works that entered
    # through any other wallet are counted apart and not described.
    collected = Counter(
        (a["collectedOn"][:7], a["kind"] if a["wallet"] in COLLECTOR_WALLETS else "transfer")
        for a in acquisitions["works"].values()
    )
    collector_xdai: dict[str, float] = defaultdict(float)
    for a in acquisitions["works"].values():
        if a["wallet"] in COLLECTOR_WALLETS and a["kind"] == "purchase":
            paid = paid_by_tx.get(a.get("txHash"), a.get("paidToArtistXDai") or 0)
            collector_xdai[a["collectedOn"][:7]] += paid
    timeline = []
    for month in months:
        timeline.append(
            {
                "month": month,
                "inksCreated": created.get(month, 0),
                "ownedInksDrawn": owned_drawn.get(month, 0),
                "artistPosts": posted.get(month, 0),
                "sales": payments.get(month, 0),
                "salesXDai": round(xdai.get(month, 0)),
                "collectorBought": collected.get((month, "purchase"), 0),
                "collectorPaidXDai": round(collector_xdai.get(month, 0)),
                "collectorGiven": collected.get((month, "gift"), 0),
                "collectorOther": collected.get((month, "transfer"), 0),
                "burnMints": burn_mints.get(month, 0),
                "artistLikes": likes.get(month, 0),
                "events": [
                    {"date": d, "who": who, "text": text, "source": source}
                    for d, who, text, source in EVENTS_2022
                    if d.startswith(month)
                ],
            }
        )
    (OUT / "timeline-2022.json").write_text(
        json.dumps(
            {
                "schemaVersion": 1,
                "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "method": (
                    "inksCreated: successful createInk calls by the artist on Nifty Ink (Gnosis ledger). "
                    "ownedInksDrawn: nnxyz works in this collection by archived creation month. "
                    "artistPosts: posts by @0000nnxyz captured in x-posts.json. sales and salesXDai: "
                    "payments to the artist through Nifty Ink. collectorBought/Given/Other: works in "
                    "this collection by the month and kind of their first inbound transfer; "
                    "collectorPaidXDai counts the collector's named wallets only. burnMints: editions "
                    "minted to the dead address. artistLikes: the artist's likes of other inks. events: "
                    "dated facts with their record; market dates are the public record."
                ),
                "year": 2022,
                "totals": {
                    "inksCreated": sum(created.get(m, 0) for m in months),
                    "ownedInksDrawn": sum(owned_drawn.get(m, 0) for m in months),
                    "artistPosts": sum(posted.get(m, 0) for m in months),
                    "sales": sum(payments.get(m, 0) for m in months),
                    "salesXDai": round(sum(xdai.get(m, 0) for m in months)),
                    "burnMints": sum(burn_mints.get(m, 0) for m in months),
                },
                "months": timeline,
            },
            indent=1,
            ensure_ascii=False,
        )
        + "\n"
    )
    # The artist's words: the thirty posts chosen for the gallery and the bios,
    # verbatim beside a printed form, dated and linked.
    quotes = read(QUOTES)
    profiles = {p["site"]: p for p in read(PROFILES)["profiles"]}
    x_profile = read(X_PROFILE)
    bios = [
        {"site": "Linktree", "url": profiles["Linktree"]["url"], "text": profiles["Linktree"]["bio"]},
        {"site": "objkt", "url": profiles["objkt"]["url"], "text": profiles["objkt"]["bio"]},
        {"site": "Threads", "url": profiles["Threads"]["url"], "text": print_text(profiles["Threads"]["bio"])},
        {
            "site": "TikTok",
            "url": ledger["artistWords"]["bioLine"]["source"],
            "text": print_text(ledger["artistWords"]["bioLine"]["text"]),
        },
    ]
    words = {
        "schemaVersion": 1,
        "builtAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "method": (
            "quotes: the posts in curation/research/social/quotes.json, in date order; text is "
            "verbatim and printed applies the same light edits as facts.json (links, hashtag-only "
            "lines and emoji removed, handles expanded). bios: the profile lines in profiles.json "
            "and the TikTok line recorded in nnxyz-onchain.json. xProfile: the X profile's bio and "
            "location as captured."
        ),
        "xProfile": {
            "bio": x_profile["profile"]["bio"],
            "location": x_profile["profile"]["location"],
            "joined": x_profile["profile"]["joined"],
            "url": x_profile["url"],
        },
        "bios": bios,
        "quotes": [
            {
                "id": q["id"],
                "url": q["url"],
                "postedAt": q["postedAt"],
                "topic": q["topic"],
                "note": q["curatorNote"],
                "text": q["text"],
                "printed": print_text(q["text"]),
            }
            for q in sorted(quotes["quotes"], key=lambda q: q["postedAt"])
        ],
    }
    (OUT / "words.json").write_text(json.dumps(words, indent=1, ensure_ascii=False) + "\n")

    print(
        f"words: {len(words['quotes'])} quotes, {len(bios)} bios; "
        f"facts: {len(facts)} works, {with_collected} with a collected date, {with_post} with the artist's post; "
        f"timeline: {sum(created.get(m, 0) for m in months)} inks created in 2022"
    )


if __name__ == "__main__":
    main()
