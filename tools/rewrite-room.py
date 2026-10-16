#!/usr/bin/env python3
"""Apply a feeling-and-message rewrite to one room file.

Usage: tools/rewrite-room.py <roomId> <edits.json>

edits.json: {"introduction": [...], "closing": "...", "chapters": {key: {"opening": "..."}},
             "works": {short: {"treatment": "label|line|none", "text": "...", "caption": "..."}},
             "collectorDecision": "..."}

Keeps ids, order, facts, readings and compareWith; rebuilds the tour segments
and the checks; preserves the previous text under rewrite/superseded/; marks
the tour audioStale so the site shows no player until the Mac re-records it.
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
    room_id, edits_path = sys.argv[1:3]
    path = ROOT / "curation/exhibitions/rewrite" / f"{room_id}.json"
    room = json.loads(path.read_text())
    edits = json.loads(pathlib.Path(edits_path).read_text())
    old = json.loads(json.dumps(room))
    if "introduction" in edits:
        room["introduction"] = edits["introduction"]
    if "closing" in edits:
        room["closing"] = edits["closing"]
    chapters = {c["key"]: c for c in room["chapters"]}
    for key, e in edits.get("chapters", {}).items():
        chapters[key]["opening"] = e["opening"]
    works = {w["short"]: w for c in room["chapters"] for w in c["works"]}
    missing = [s for s in edits.get("works", {}) if s not in works]
    if missing:
        raise SystemExit(f"unknown works: {missing}")
    for short, e in edits.get("works", {}).items():
        w = works[short]
        if "treatment" in e:
            w["treatment"] = e["treatment"]
        if "text" in e:
            w["text"] = e["text"]
        if "caption" in e:
            w["caption"] = e["caption"]
        if w["treatment"] == "none":
            w["text"] = ""
    # tour segments
    hold = room["tour"].get("silentHoldSeconds", 4)
    segs = [{"kind": "introduction", "artworkId": None, "text": p} for p in room["introduction"]]
    for c in room["chapters"]:
        segs.append(
            {
                "kind": "chapter",
                "chapter": c["key"],
                "artworkId": c["works"][0]["artworkId"],
                "text": c["opening"],
            }
        )
        for w in c["works"]:
            if w["treatment"] == "none" or not w.get("text"):
                segs.append(
                    {
                        "kind": "work",
                        "artworkId": w["artworkId"],
                        "treatment": "none",
                        "holdSeconds": hold,
                    }
                )
            elif w.get("compareWith"):
                segs.append(
                    {
                        "kind": "comparison",
                        "artworkId": w["artworkId"],
                        "secondArtworkId": w["compareWith"]["artworkId"],
                        "treatment": w["treatment"],
                        "text": w["text"],
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
    for item in room.get("relatedItems", []):
        prev = next(
            (
                s
                for s in old["tour"]["segments"]
                if s["kind"] == "related" and s.get("artworkId") == item.get("artworkId")
            ),
            None,
        )
        if prev:
            segs.append(prev)
    last = old["tour"]["segments"][-1]
    closing = {"kind": "closing", "artworkId": last.get("artworkId"), "text": room["closing"]}
    if last.get("secondArtworkId"):
        closing["secondArtworkId"] = edits.get("closingSecondArtworkId", last["secondArtworkId"])
    segs.append(closing)
    old_kinds = [s["kind"] for s in old["tour"]["segments"]]
    if [s["kind"] for s in segs] != old_kinds:
        raise SystemExit(f"segment kinds changed: {old_kinds} -> {[s['kind'] for s in segs]}")
    words = sum(len(s["text"].split()) for s in segs if s.get("text"))
    silent = sum(1 for s in segs if not s.get("text"))
    room["tour"]["segments"] = segs
    room["tour"]["spokenWords"] = words
    room["tour"]["estimatedMinutesAt150wpm"] = round(words / 150 + silent * hold / 60, 1)
    room["tour"]["audioStale"] = True
    room["tour"]["audioStaleNote"] = (
        "Text rewritten for feeling and message; every spoken segment changed. "
        "No player until the Mac re-records it (curation/exhibitions/audio/HANDOFF.md) and removes this flag."
    )
    # checks
    all_text = " ".join(
        [*room["introduction"], room["closing"]]
        + [c["opening"] for c in room["chapters"]]
        + [w.get("text") or "" for c in room["chapters"] for w in c["works"]]
    ).lower()
    room["checks"] = {
        "treatmentCounts": dict(
            collections.Counter(w["treatment"] for c in room["chapters"] for w in c["works"])
        ),
        "captionMaxWords": 20,
        "captionProblems": [
            w["short"]
            for c in room["chapters"]
            for w in c["works"]
            if len(w["caption"].split()) > 20
        ],
        "habitWordHits": {h: all_text.count(h) for h in HABITS if all_text.count(h)},
        "lineOpeners": dict(
            collections.Counter(
                (w.get("text") or "x").split()[0]
                for c in room["chapters"]
                for w in c["works"]
                if w.get("text")
            )
        ),
        "everyWorkHasCaptionAndReading": all(
            w.get("caption") and w.get("reading") for c in room["chapters"] for w in c["works"]
        ),
    }
    room["status"] = "rewrite-for-collector-review"
    room["writtenAt"] = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    room["voice"] = (
        "Unsigned gallery voice; curation/voice/style-guide.md as amended 2026-10-16 (Feeling and message)"
    )
    room["method"] = edits.get(
        "method",
        (
            "Rewrite for feeling and message after the collector approved the pilot room (Skulls and Shadows) on 2026-10-16. "
            "Every work was inspected again from the published WebP at 1200 px in room order and as one wall. Facts come from "
            "data/gallery.json and curation/analysis/strokes/measures.json; readings rest on the pictures, the record and the "
            "artist's sourced words. No model inference calls were made; the text was written and image-checked by the assistant. "
            "Captions and readings from the 2026-10-15 text are kept except where the feeling changes the one thing to see."
        ),
    )
    room.setdefault("collectorDecisions", []).append(
        {
            "date": "2026-10-16",
            "decision": edits.get(
                "collectorDecision",
                "Rewrite the rest of the Faces wing on the model of the approved pilot room.",
            ),
        }
    )
    sup = ROOT / "curation/exhibitions/rewrite/superseded" / f"{room_id}.2026-10-15.json"
    if not sup.exists():
        sup.write_text(json.dumps(old, indent=2, ensure_ascii=False) + "\n")
    path.write_text(json.dumps(room, indent=2, ensure_ascii=False) + "\n")
    bad = {h: n for h, n in room["checks"]["habitWordHits"].items() if h != "the artist"}
    print(
        room_id,
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
