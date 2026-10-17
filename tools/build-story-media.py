#!/usr/bin/env python3
"""Write the SVGs for the drawings on the story pages (curation/story/works.json).

These drawings are not in the collection's catalog, so the gallery's media
tools skip them. This reads each one's strokes from the permanent Nifty Ink
archive beside this project, checks them against the pinned SHA-256, and
writes the same two files the gallery has for every drawing: the
full-precision native SVG (media/art/<cid>.svg, tools/export-svg.py) and the
two-decimal display SVG the replay loads (media/art/display/<cid>.svg,
tools/build-display-svgs.py). tools/build-story-rasters.mjs then renders the
WebPs; npm run media:publish uploads whatever the bucket lacks.

  python3 tools/build-story-media.py
"""

import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ARCHIVE = ROOT.parent / "nifty-ink-archive"
MEDIA = ROOT / "media"


def load(name):
    spec = importlib.util.spec_from_file_location(
        name.replace("-", "_"), ROOT / "tools" / f"{name}.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def pinned(path, expected):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"Archive file differs from curation/story/works.json: {path}")
    return data


def main():
    export, display = load("export-svg"), load("build-display-svgs")
    works = json.loads((ROOT / "curation/story/works.json").read_text())["works"]
    (MEDIA / "art" / "display").mkdir(parents=True, exist_ok=True)
    for work in works:
        folder = ARCHIVE / work["archive"]["directory"]
        strokes = json.loads(pinned(folder / "strokes.json", work["archive"]["strokesSHA256"]))
        pinned(folder / "image.png", work["archive"]["imageSHA256"])
        if len(strokes["lines"]) != work["strokes"]:
            raise ValueError(f"Stroke count differs: {work['inkId']}")
        # Nifty Ink drew on a canvas, which prunes zero-length strokes (every
        # point the same); an SVG path with round caps would draw them as dots
        # the archived PNG does not have. Emptied lines are skipped by the
        # exporter and keep the stroke numbering.
        for line in strokes["lines"]:
            if len({(p["x"], p["y"]) for p in line["points"]}) == 1:
                line["points"] = []
        native = export.svg(strokes, work["name"])
        rounded = display.rounded(native)
        display.check(native, rounded)
        (MEDIA / "art" / f"{work['inkId']}.svg").write_text(native)
        (MEDIA / "art" / "display" / f"{work['inkId']}.svg").write_text(rounded)
        print(
            f"{work['name']}: {len(strokes['lines'])} strokes, display SVG {len(rounded.encode()) // 1024} KiB"
        )


if __name__ == "__main__":
    main()
