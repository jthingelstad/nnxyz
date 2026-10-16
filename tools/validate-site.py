#!/usr/bin/env python3
"""Validate generated routes, links and metadata, and that every media URL is published."""

from html.parser import HTMLParser
import json
import re
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
# Same prefixes as tools/delivery-plan.mjs. Media is published once and only
# referenced; it must never be part of the built site.
MEDIA_PREFIXES = (
    "art/",
    "png/",
    "raster/",
    "records/",
    "abstract/images/",
    "abstract/originals/",
    "abstract/records/",
    "audio/",
)


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.title = False
        self.canonical = False
        self.main = False
        self.redirect = False

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        self.title |= tag == "title"
        self.main |= tag == "main"
        self.canonical |= tag == "link" and data.get("rel") == "canonical"
        self.redirect |= tag == "meta" and data.get("http-equiv") == "refresh"
        for key in ["href", "src", "data-src"]:
            if data.get(key):
                self.refs.append(data[key])
        for candidate in (data.get("srcset") or "").split(","):
            if candidate.strip():
                self.refs.append(candidate.split()[0])


def main():
    gallery = json.loads((ROOT / "data/gallery.json").read_text())
    abstract = json.loads((ROOT / "data/abstract.json").read_text())["artworks"]
    pages = sorted(DIST.rglob("*.html"))
    media = json.loads((ROOT / "data/media.json").read_text())["objects"]
    built = [str(path.relative_to(DIST)) for path in DIST.rglob("*") if path.is_file()]
    assert not [key for key in built if key.startswith(MEDIA_PREFIXES)], "Media in the build"
    referenced = set()
    # Rooms come from the locked structure's gallery text; the October 14 map's
    # galleries are retired addresses that redirect to their wings.
    rooms = [
        json.loads(path.read_text())
        for path in sorted((ROOT / "curation/exhibitions/rewrite").glob("*--*.json"))
    ]
    retired = json.loads((ROOT / "curation/exhibitions/map.json").read_text())["collections"]
    retired += json.loads((ROOT / "curation/abstract/exhibitions.json").read_text())["collections"]
    redirects = {"collections/nnxyz-other/index.html", "collections/scrimshaw/index.html"}
    redirects |= {f"galleries/{g['id']}/index.html" for c in retired for g in c["galleries"]}
    # 6 utility pages (home, about, notes, map, screen saver, 404) and 5 entrances.
    assert len(pages) == len(gallery) + len(abstract) + len(rooms) + len(redirects) + 11, (
        "Missing generated routes"
    )
    hung = [w["artworkId"] for room in rooms for c in room["chapters"] for w in c["works"]]
    assert len(hung) == len(set(hung)) == len(gallery) + len(abstract) - 1, "Every work hangs once"
    related = [r["artworkId"] for room in rooms for r in room.get("relatedItems", [])]
    assert len(related) == 1 and related[0] not in hung, "GM hangs only as a related item"
    assert not (DIST / "walks").exists(), "Retired walk pages were generated"
    sitemap = (DIST / "sitemap-0.xml").read_text()
    locs = {loc.split("</loc>")[0] for loc in sitemap.split("<loc>")[1:]}
    site = "https://nnxyz.thingelstad.xyz/"
    expected = {
        site + str(path.relative_to(DIST)).removesuffix("index.html")
        for path in pages
        if path.name == "index.html" and str(path.relative_to(DIST)) not in redirects
    }
    assert locs == expected, "Sitemap differs from the generated pages"
    assert f"Sitemap: {site}sitemap-index.xml" in (DIST / "robots.txt").read_text()
    for room in rooms:
        assert (DIST / "galleries" / room["id"] / "index.html").is_file()
    assert (DIST / "collections/other-related/index.html").is_file()
    for path in pages:
        page = Page()
        page.feed(path.read_text())
        if str(path.relative_to(DIST)) in redirects:
            assert page.redirect and page.refs, f"Redirect page lost its target: {path}"
        else:
            assert page.title and page.main and page.canonical, f"Empty or incomplete page: {path}"
        for ref in page.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc or not url.path:
                continue
            key = unquote(url.path).lstrip("/")
            if url.path.startswith("/") and key.startswith(MEDIA_PREFIXES):
                assert key in media, f"Unpublished media in {path}: {ref}"
                referenced.add(key)
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
    # The screen saver fetches its works as JSON; every image it names is published.
    saver = json.loads((DIST / "screensaver/data.json").read_text())["works"]
    assert len(saver) == len(gallery) + len(abstract), "Screen saver covers every work"
    # The widths and prefixes mirror src/lib/media-paths.ts and the >= 1200
    # filter in src/scripts/screensaver.ts; change all three together.
    for item in saver:
        assert item["caption"], item["id"]
        widths = [1200, 1600, 2000] if item["kind"] == "ink" else [1200, 2000]
        prefix = "raster/" if item["kind"] == "ink" else "abstract/images/"
        for width in widths:
            key = f"{prefix}{item['id']}-{width}.webp"
            assert key in media, f"Unpublished screen saver image: {key}"
    # The audio tour embeds each room's stops as JSON; every key is published.
    import re as _re

    tours = 0
    stale = 0
    for room in rooms:
        room_file = json.loads(
            (ROOT / "curation/exhibitions/rewrite" / f"{room['id']}.json").read_text()
        )
        html = (DIST / "galleries" / room["id"] / "index.html").read_text()
        found = _re.search(r"data-tour-stops>(.*?)</script>", html, _re.S)
        if room_file["tour"].get("audioStale"):
            # Rewritten text waiting for re-recording shows no player.
            assert not found, f"Stale audio must not render a player: {room['id']}"
            stale += 1
            continue
        if not found:
            continue
        tours += 1
        for stop in json.loads(found.group(1)):
            if stop["src"]:
                assert stop["src"].lstrip("/") in media, f"Unpublished tour audio: {stop['src']}"
    assert tours + stale == len(rooms), "Every room has an audio tour or is marked stale"
    # llms.txt and its full-text companion name only pages that exist.
    for name in ["llms.txt", "llms-full.txt"]:
        text = (DIST / name).read_text()
        for link in set(re.findall(r"https://nnxyz\.thingelstad\.xyz(/[^\s)>#]*)", text)):
            target = DIST / link.lstrip("/")
            if link.endswith("/"):
                target /= "index.html"
            assert target.is_file(), f"{name} links to a missing page: {link}"
    assert "## Rooms" in (DIST / "llms.txt").read_text()
    for work in gallery:
        cid = work["inkId"]
        assert (DIST / "artworks" / cid / "index.html").is_file(), cid
        for key in [f"art/{cid}.svg", f"png/{cid}.png", f"raster/{cid}-640.webp"]:
            assert key in referenced, f"Artwork media not used: {key}"
    for work in abstract:
        page = DIST / "artworks" / work["id"] / "index.html"
        assert page.is_file()
        assert "data-viewer" not in page.read_text(), "Replay exposed for a raster work"
        assert media[f"abstract/originals/{work['id']}.jpg"] == work["imageSHA256"]
    print(
        json.dumps(
            {
                "pages": len(pages),
                "mediaReferenced": len(referenced),
                "brokenLinks": 0,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
