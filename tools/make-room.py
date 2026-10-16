#!/usr/bin/env python3
"""Create a room file and its structure entry for the After Nifty Ink wing.

Usage: tools/make-room.py <spec.json>

spec: {"id", "collectionId", "galleryKey", "title", "theme", "introduction": [...],
       "closing", "chapters": [{"key","title","opening","works":[{"artworkId","short",
       "treatment","text","caption","reading"}]}], "method", "collectorDecision"}

Facts (dates, chain, acquisition) come from data/onchain.json; the tour and the
checks are built the way tools/rewrite-room.py builds them. The tour is marked
audioStale until the Mac records it.
"""

import collections
import datetime
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
HABITS = [
    "reads as",
    "can read as",
    "may suggest",
    "rather than",
    "pushes forward",
    "pulls the eye",
    "tension",
    "pressure",
    "refuses to settle",
    "without resolving",
    "holds both",
    "the artist",
]


def main():
    spec = json.loads(pathlib.Path(sys.argv[1]).read_text())
    catalog = {w["id"]: w for w in json.loads((ROOT / "data/onchain.json").read_text())["artworks"]}
    now = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    chapters = []
    for c in spec["chapters"]:
        works = []
        for w in c["works"]:
            art = catalog[w["artworkId"]]
            works.append(
                {
                    "artworkId": w["artworkId"],
                    "title": art["name"],
                    "short": w["short"],
                    "treatment": w["treatment"],
                    "text": w.get("text") or "",
                    "caption": w["caption"],
                    "reading": w["reading"],
                    "facts": {
                        "recordedAt": art["createdAt"],
                        "recordedDate": (art["createdAt"] or "")[:10] or None,
                        "createdAtBasis": art["createdAtBasis"],
                        "collectedAt": art["acquiredAt"],
                        "chain": art["chain"],
                        "animated": art["animated"],
                    },
                }
            )
        chapters.append(
            {"key": c["key"], "title": c["title"], "opening": c["opening"], "works": works}
        )
    room = {
        "schemaVersion": 1,
        "id": spec["id"],
        "collectionId": spec["collectionId"],
        "partKey": None,
        "galleryKey": spec["galleryKey"],
        "structureFile": f"curation/exhibitions/structure/{spec['collectionId']}.json",
        "title": spec["title"],
        "status": "rewrite-for-collector-review",
        "writtenAt": now,
        "voice": "Unsigned gallery voice; curation/voice/style-guide.md as amended 2026-10-16 (Feeling and message)",
        "dateBasis": "UTC. recordedAt is the token's mint instant where the chain records it (Tezos; tokens the collector minted); otherwise null. collectedAt is the first transfer into the collector's wallet.",
        "method": spec["method"],
        "scope": f"The owned subset: the {sum(len(c['works']) for c in chapters)} works the locked structure places in this room, in room order.",
        "introduction": spec["introduction"],
        "chapters": chapters,
        "relatedItems": [],
        "closing": spec["closing"],
        "collectorDecisions": [{"date": "2026-10-16", "decision": spec["collectorDecision"]}],
    }
    hold = 4
    segs = [{"kind": "introduction", "artworkId": None, "text": p} for p in room["introduction"]]
    for c in chapters:
        segs.append(
            {
                "kind": "chapter",
                "chapter": c["key"],
                "artworkId": c["works"][0]["artworkId"],
                "text": c["opening"],
            }
        )
        for w in c["works"]:
            if w["treatment"] == "none" or not w["text"]:
                segs.append(
                    {
                        "kind": "work",
                        "artworkId": w["artworkId"],
                        "treatment": "none",
                        "holdSeconds": hold,
                    }
                )
            else:
                segs.append(
                    {
                        "kind": "work",
                        "artworkId": w["artworkId"],
                        "treatment": w["treatment"],
                        "text": w["text"],
                    }
                )
    segs.append(
        {
            "kind": "closing",
            "artworkId": chapters[-1]["works"][-1]["artworkId"],
            "text": room["closing"],
        }
    )
    words = sum(len(s["text"].split()) for s in segs if s.get("text"))
    silent = sum(1 for s in segs if not s.get("text"))
    room["tour"] = {
        "silentHoldSeconds": hold,
        "segments": segs,
        "spokenWords": words,
        "estimatedMinutesAt150wpm": round(words / 150 + silent * hold / 60, 1),
        "audioStale": True,
        "audioStaleNote": "New room; no player until the Mac records it (curation/exhibitions/audio/HANDOFF.md) and removes this flag.",
    }
    all_text = " ".join(
        [*room["introduction"], room["closing"]]
        + [c["opening"] for c in chapters]
        + [w["text"] for c in chapters for w in c["works"]]
    ).lower()
    room["checks"] = {
        "treatmentCounts": dict(
            collections.Counter(w["treatment"] for c in chapters for w in c["works"])
        ),
        "captionMaxWords": 20,
        "captionProblems": [
            w["short"] for c in chapters for w in c["works"] if len(w["caption"].split()) > 20
        ],
        "habitWordHits": {h: all_text.count(h) for h in HABITS if all_text.count(h)},
        "lineOpeners": dict(
            collections.Counter(
                w["text"].split()[0] for c in chapters for w in c["works"] if w["text"]
            )
        ),
        "everyWorkHasCaptionAndReading": all(
            w["caption"] and w["reading"] for c in chapters for w in c["works"]
        ),
    }
    (ROOT / "curation/exhibitions/rewrite" / f"{spec['id']}.json").write_text(
        json.dumps(room, indent=2, ensure_ascii=False) + "\n"
    )
    # structure entry
    spath = ROOT / "curation/exhibitions/structure" / f"{spec['collectionId']}.json"
    structure = json.loads(spath.read_text())
    gallery = {
        "key": spec["galleryKey"],
        "title": spec["title"],
        "theme": spec["theme"],
        "works": [
            {
                "artworkId": w["artworkId"],
                "title": w["title"],
                "recordedDate": w["facts"]["recordedDate"],
                "recordedAt": w["facts"]["recordedAt"],
                "visualNote": w["caption"],
            }
            for c in chapters
            for w in c["works"]
        ],
    }
    structure["galleries"] = [
        g for g in structure["galleries"] if g["key"] != spec["galleryKey"]
    ] + [gallery]
    spath.write_text(json.dumps(structure, indent=2, ensure_ascii=False) + "\n")
    bad = {h: n for h, n in room["checks"]["habitWordHits"].items() if h != "the artist"}
    print(
        spec["id"],
        "works",
        len(gallery["works"]),
        "words",
        words,
        "minutes",
        room["tour"]["estimatedMinutesAt150wpm"],
        "habits",
        bad or "none",
        "captionProblems",
        room["checks"]["captionProblems"],
    )


if __name__ == "__main__":
    main()
