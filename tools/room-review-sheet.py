#!/usr/bin/env python3
"""Write a Markdown review sheet for one rewritten room.

Usage: tools/room-review-sheet.py <roomId> [...]

The sheet lists the spoken text in reading order (introduction, chapter
openings, labelled and one-line works, closing) with the treatment of each
work, so the collector can read a whole room on a phone without opening JSON.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REWRITE = ROOT / "curation/exhibitions/rewrite"


def sheet(room_id):
    room = json.loads((REWRITE / f"{room_id}.json").read_text())
    words = sum(len(s.get("text", "").split()) for s in room["tour"]["segments"])
    out = [
        f"# {room['title']} ({room_id})",
        "",
        f"Spoken words: {words}, about {words / 150:.1f} minutes.",
        "",
    ]
    out += ["## Introduction", ""]
    for p in room["introduction"]:
        out += [p, ""]
    for c in room["chapters"]:
        out += [f"## {c['title']}", ""]
        if c.get("opening"):
            out += [c["opening"], ""]
        for w in c["works"]:
            if w["treatment"] == "none":
                out += [f"**{w['short']}** (none) (title only)", ""]
            else:
                out += [f"**{w['short']}** ({w['treatment']}) {w['text']}", ""]
    out += ["## Closing", "", room["closing"], ""]
    (REWRITE / f"review-{room_id}.md").write_text("\n".join(out))
    return words


if __name__ == "__main__":
    for rid in sys.argv[1:]:
        print(rid, sheet(rid))
