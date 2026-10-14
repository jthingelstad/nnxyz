#!/usr/bin/env python3
"""Validate generated routes, links, metadata, and every native vector asset."""

import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.title = False
        self.canonical = False
        self.main = False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        self.title |= tag == "title"
        self.main |= tag == "main"
        self.canonical |= tag == "link" and data.get("rel") == "canonical"
        for key in ["href", "src", "data-src"]:
            if data.get(key):
                self.refs.append(data[key])


def main():
    gallery = json.loads((ROOT / "data/gallery.json").read_text())
    abstract = json.loads((ROOT / "data/abstract.json").read_text())["artworks"]
    pages = sorted(DIST.rglob("*.html"))
    exhibitions = json.loads((ROOT / "curation/exhibitions/map.json").read_text())
    rooms = [g for c in exhibitions["collections"] for g in c["galleries"]]
    recovered_exhibitions = json.loads((ROOT / "curation/abstract/exhibitions.json").read_text())
    rooms += [g for c in recovered_exhibitions["collections"] for g in c["galleries"]]
    # 3 utility pages, 7 collection entrances, and the 6 preserved short-walk routes.
    assert len(pages) == len(gallery) + len(abstract) + len(rooms) + 16, "Missing generated routes"
    for room in rooms:
        assert (DIST / "galleries" / room["id"] / "index.html").is_file()
    assert (DIST / "collections/other-related/index.html").is_file()
    for path in pages:
        page = Page()
        page.feed(path.read_text())
        assert page.title and page.main and page.canonical, f"Empty or incomplete page: {path}"
        for ref in page.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc or not url.path:
                continue
            target = (
                DIST / unquote(url.path).lstrip("/")
                if url.path.startswith("/")
                else path.parent / unquote(url.path)
            )
            assert target.resolve().is_relative_to(DIST), f"Link escapes output: {ref}"
            if url.path.endswith("/"):
                target /= "index.html"
            assert target.is_file(), f"Broken local link in {path}: {ref}"
    manifest = json.loads((DIST / "asset-manifest.json").read_text())
    byid = {x["id"]: x for x in manifest["artworks"]}
    assert len(byid) == len(gallery)
    for work in gallery:
        cid = work["inkId"]
        svg = DIST / "art" / f"{cid}.svg"
        tree = ET.parse(svg)
        namespace = "{http://www.w3.org/2000/svg}"
        assert len(tree.findall(".//" + namespace + "path")) == work["strokes"], cid
        assert not tree.findall(".//" + namespace + "image"), "Raster content in SVG"
        assert hashlib.sha256(svg.read_bytes()).hexdigest() == byid[cid]["svgSHA256"], cid
        for name, suffix in [
            ("png", ".png"),
            ("records", ".metadata.json"),
            ("records", ".provenance.json"),
        ]:
            assert (DIST / name / (cid + suffix)).is_file(), cid
        assert (DIST / "artworks" / cid / "index.html").is_file(), cid
    recovered_manifest = json.loads((DIST / "abstract/asset-manifest.json").read_text())
    recovered_by_id = {entry["id"]: entry for entry in recovered_manifest["artworks"]}
    assert len(recovered_by_id) == len(abstract)
    for work in abstract:
        page = DIST / "artworks" / work["id"] / "index.html"
        assert page.is_file()
        assert "data-viewer" not in page.read_text(), "Replay exposed for a raster work"
        entry = recovered_by_id[work["id"]]
        original = DIST / entry["originalPath"].lstrip("/")
        assert hashlib.sha256(original.read_bytes()).hexdigest() == work["imageSHA256"]
        for image in entry["images"]:
            target = DIST / image["path"].lstrip("/")
            assert hashlib.sha256(target.read_bytes()).hexdigest() == image["sha256"]
        assert (DIST / "abstract/records" / (work["id"] + ".json")).is_file()
    print(
        json.dumps(
            {
                "pages": len(pages),
                "nativeSVGs": len(gallery),
                "recoveredJPEGs": len(abstract),
                "brokenLinks": 0,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
