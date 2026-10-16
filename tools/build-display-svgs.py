#!/usr/bin/env python3
"""Derive the display SVGs the site serves from the full-precision native SVGs.

tools/export-svg.py (archived with the collection) writes every coordinate at
full float64 precision, 13 to 15 decimals, so numbers are over 90% of each
file. A drawing is about 790 units across: two decimals keep every point
within 0.005 units, far under a pixel at any size the site draws, and cut the
compressed download to about a third. The full-precision art/<cid>.svg stays
published as the archival vector and the source of the gallery WebPs; this
writes media/art/display/<cid>.svg for the replay, the build sequence, the
screen saver and the download link. Only path data and stroke widths are
rounded; colors, opacities, titles and the data- attributes are unchanged.

  python3 tools/build-display-svgs.py
"""

import gzip
import hashlib
import json
from multiprocessing import Pool
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media"
SITE = "https://nnxyz.thingelstad.xyz"
DECIMALS = 2
TOLERANCE = 0.5 * 10**-DECIMALS + 1e-9
NUMBER = re.compile(r"-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
ROUNDED = re.compile(r' (d|stroke-width)="([^"]*)"')


def fmt(value):
    text = f"{value:.{DECIMALS}f}".rstrip("0").rstrip(".")
    return "0" if text in ("", "-0") else text


def rounded(svg):
    def attribute(match):
        values = NUMBER.sub(lambda n: fmt(float(n.group())), match.group(2))
        return f' {match.group(1)}="{values}"'

    return ROUNDED.sub(attribute, svg)


def check(original, display):
    """Same structure, same attributes, and no number moved past rounding."""
    ET.fromstring(display)
    a, b = ROUNDED.split(original), ROUNDED.split(display)
    assert len(a) == len(b), "Different number of paths"
    for i in range(len(a)):
        if i % 3 != 2:
            assert a[i] == b[i], "Text outside path data changed"
    for i in range(2, len(a), 3):
        x, y = NUMBER.findall(a[i]), NUMBER.findall(b[i])
        assert len(x) == len(y), "Different number of coordinates"
        assert NUMBER.sub("", a[i]) == NUMBER.sub("", b[i]), "Commands changed"
        assert all(abs(float(p) - float(q)) <= TOLERANCE for p, q in zip(x, y))


def source(cid, expected):
    path = MEDIA / "art" / f"{cid}.svg"
    if path.exists():
        data = path.read_bytes()
    else:
        with urllib.request.urlopen(f"{SITE}/art/{cid}.svg") as response:
            data = response.read()
            if response.headers.get("Content-Encoding") == "gzip":
                data = gzip.decompress(data)
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError(f"Native SVG differs from data/media.json: {cid}")
    return data.decode()


def build(job):
    cid, expected = job
    original = source(cid, expected)
    display = rounded(original)
    check(original, display)
    out = MEDIA / "art" / "display" / f"{cid}.svg"
    data = display.encode()
    if not out.exists() or out.read_bytes() != data:
        out.write_bytes(data)
    return len(original.encode()), len(data)


def main():
    media = json.loads((ROOT / "data/media.json").read_text())["objects"]
    works = json.loads((ROOT / "data/gallery.json").read_text())
    (MEDIA / "art" / "display").mkdir(parents=True, exist_ok=True)
    jobs = [(w["inkId"], media[f"art/{w['inkId']}.svg"]) for w in works]
    with Pool() as pool:
        sizes = pool.map(build, jobs, chunksize=4)
    before = sum(a for a, _ in sizes)
    after = sum(b for _, b in sizes)
    print(
        f"{len(sizes)} display SVGs, {after / 2**20:.1f} MiB from "
        f"{before / 2**20:.1f} MiB ({100 * after / before:.1f}%)"
    )


if __name__ == "__main__":
    main()
