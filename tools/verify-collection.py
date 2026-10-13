#!/usr/bin/env python3
"""Verify the gallery dataset and optionally compare it to the permanent archive."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(path.read_text())


def digest(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def local(path, base=ROOT):
    p = Path(path)
    require(not p.is_absolute(), "Absolute project path: " + str(path))
    target = base / p
    require(target.resolve(strict=True).is_relative_to(ROOT), "Path leaves project: " + str(path))
    return target


def verify(compare_archive=False):
    proof = read(ROOT / "source/import-manifest.json")
    archive = Path(proof["archiveRoot"])
    for item in proof["copiedFiles"]:
        target = local(item["projectPath"])
        require(not target.is_symlink() and target.is_file(), "Copied source is not a regular file")
        require(digest(target) == item["sha256"], "Copied file changed: " + item["projectPath"])
        if compare_archive:
            source = archive / item["archivePath"]
            require(
                digest(source) == item["sha256"], "Archive source differs: " + item["archivePath"]
            )
            require(
                (source.stat().st_dev, source.stat().st_ino)
                != (target.stat().st_dev, target.stat().st_ino),
                "Gallery file shares archive inode",
            )
    if compare_archive:
        require(
            digest(archive / "SHA256SUMS") == proof["archiveChecksumSHA256"],
            "Archive checksum baseline changed",
        )
    collection = ROOT / "collection"
    catalog = read(collection / "catalog.json")
    artists = read(collection / "artists.json")
    holdings = read(collection / "holdings.json")
    snapshots = read(collection / "snapshots/index.json")
    gallery = read(ROOT / "data/gallery.json")
    groups = read(ROOT / "data/collections.json")
    by_id = {e["inkId"]: e for e in catalog}
    require(
        len(by_id) == len(catalog) == len(gallery) == proof["distinctArtworks"],
        "Artwork count mismatch",
    )
    require(len(holdings) == proof["ownedEditions"], "Holding count mismatch")
    require(len(artists) == proof["creatorAddresses"], "Artist count mismatch")
    require({e["inkId"] for e in gallery} == set(by_id), "Gallery and source catalog differ")
    require(
        len({(h["chainId"], h["contract"], h["tokenId"]) for h in holdings}) == len(holdings),
        "Duplicate token identities",
    )
    require(
        {a["directory"] for a in artists}
        == {p.relative_to(collection).as_posix() for p in (collection / "artists").iterdir()},
        "Artist directory mismatch",
    )
    for e in catalog:
        folder = local(e["directory"], collection)
        require(read(folder / "artwork.json") == e, "Original artwork record differs")
        for field in [
            "imagePath",
            "metadataPath",
            "strokesPath",
            "compressedStrokesPath",
            "strokeSummaryPath",
        ]:
            local(e[field], collection)

        def order(h):
            return (h["owner"], h["chainId"], h["contract"], h["tokenId"])

        require(
            sorted((h for h in holdings if h["inkId"] == e["inkId"]), key=order)
            == sorted(e["ownedTokens"], key=order),
            "Artwork holdings differ",
        )
        for source in e["sourceRecords"]:
            base = local(
                next(s["directory"] for s in snapshots if s["id"] == source["snapshot"]), collection
            )
            for field in [
                "originalManifestPath",
                "historyPath",
                "indexedMetadataPath",
                "onchainInkStatePath",
            ]:
                local(source[field], collection)
            for asset in read(local(source["originalManifestPath"], collection))["assets"]:
                require(
                    digest(local(asset["path"], base)) == asset["sha256"],
                    "Retained IPFS object differs",
                )
    for h in holdings:
        state = read(local(h["onchainRecordPath"], collection))
        require(
            state["tokenId"] == h["tokenId"]
            and state["owner"].lower() == h["owner"]
            and state["inkId"] == h["inkId"],
            "Copied ownership evidence differs",
        )
        local(h["indexedInventoryPath"], collection)
    for e in gallery:
        source = by_id[e["inkId"]]
        require(
            all(
                e[k] == source[k]
                for k in [
                    "name",
                    "artist",
                    "artistName",
                    "metadataCID",
                    "width",
                    "height",
                    "strokes",
                    "points",
                ]
            ),
            "Gallery metadata differs",
        )
        require(
            e["ownedEditionCount"] == len(source["ownedTokens"]), "Gallery edition count differs"
        )
        for field in [
            "imagePath",
            "metadataPath",
            "strokesPath",
            "compressedStrokesPath",
            "strokeSummaryPath",
            "provenancePath",
        ]:
            local(e[field])
    require(sum(g["artworkCount"] for g in groups) == len(gallery), "Collection counts differ")
    require(
        sum(g["ownedEditionCount"] for g in groups) == len(holdings),
        "Collection edition counts differ",
    )
    for g in groups:
        rows = [e for e in gallery if e["collectionId"] == g["id"]]
        require(
            g["artworkIds"] == [e["inkId"] for e in rows] and g["artworkCount"] == len(rows),
            "Collection membership differs",
        )
    samples = read(ROOT / "previews/spot-check/sources.json")
    for line in (ROOT / "previews/SHA256SUMS").read_text().splitlines():
        expected, name = line.split("  ", 1)
        require(
            digest(local(name, ROOT / "previews")) == expected, "Preview checksum differs: " + name
        )
    for sample in samples:
        require(
            digest(local(sample["sourceStrokes"])) == sample["sourceSHA256"],
            "Preview stroke source differs",
        )
        require(digest(local(sample["svgPath"])) == sample["svgSHA256"], "Preview SVG differs")
        local(sample["originalPNG"])
        svg = ET.parse(local(sample["svgPath"]))
        require(
            len(svg.findall(".//{http://www.w3.org/2000/svg}path")) == sample["strokes"],
            "SVG stroke count differs",
        )
    comparison = ROOT / "previews/spot-check/svg-validation.html"
    jobs = json.loads(
        re.search(
            r'<script id="jobs" type="application/json">(.*?)</script>',
            comparison.read_text(),
            re.S,
        )[1]
    )
    for job in jobs:
        local(job["pngPath"], comparison.parent)
        local(job["svgPath"], comparison.parent)
    require(
        not any(p.is_symlink() for p in (ROOT / "collection").rglob("*")),
        "Dataset contains a symlink",
    )
    return {
        "complete": True,
        "copiedFilesVerified": len(proof["copiedFiles"]),
        "comparedWithArchive": compare_archive,
        "distinctArtworks": len(gallery),
        "ownedEditions": len(holdings),
        "creatorAddresses": len(artists),
        "collections": {g["id"]: g["artworkCount"] for g in groups},
        "previewReferencesVerified": len(jobs) * 2,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compare-archive", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.compare_archive), indent=2))
    except (ValueError, OSError, KeyError, StopIteration, ET.ParseError) as error:
        print("Collection verification FAILED: " + str(error), file=sys.stderr)
        sys.exit(1)
