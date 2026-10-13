#!/usr/bin/env python3
"""Copy selected artist datasets from the permanent archive; never modify it."""

import argparse
from datetime import datetime
import hashlib
import json
from pathlib import Path
import re
import shutil
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT.parent / "nifty-ink-archive"


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def digest(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def group(item):
    title = item["name"].lower()
    if item["artistName"] == "nnxyz":
        for prefix, identifier in [
            ("nnxyz nifty faces", "nifty-faces"),
            ("nnxyz nnotb", "nnotb"),
            ("nnxyz rawblocks", "rawblocks"),
        ]:
            if title.startswith(prefix):
                return identifier
        return "nnxyz-other"
    if item["artistName"] == "scrimshaw.eth":
        return "scrimshaw"
    return "related"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-related",
        action="store_true",
        help="Also copy every other owned artist into the optional related dataset",
    )
    args = parser.parse_args()
    catalog = read(ARCHIVE / "catalog.json")
    selected = [
        e for e in catalog if args.include_related or e["artistName"] in ("nnxyz", "scrimshaw.eth")
    ]
    addresses = {e["artist"] for e in selected}
    artists = [a for a in read(ARCHIVE / "artists.json") if a["address"] in addresses]
    holdings = [
        h for h in read(ARCHIVE / "holdings.json") if h["inkId"] in {e["inkId"] for e in selected}
    ]
    checksums = dict(
        (name, sha)
        for sha, name in (
            line.split("  ", 1) for line in (ARCHIVE / "SHA256SUMS").read_text().splitlines()
        )
    )
    records_path = ROOT / "source/import-manifest.json"
    previous = read(records_path) if records_path.exists() else None
    if previous and previous["includeRelatedArtists"] and not args.include_related:
        raise ValueError(
            "This project already includes other artists. Refresh with --include-related, or explicitly prune their copies before importing the narrower selection."
        )
    records = {r["projectPath"]: r for r in previous["copiedFiles"]} if previous else {}

    def copy(source_relative, destination_relative=None):
        destination_relative = destination_relative or "collection/" + source_relative
        source = ARCHIVE / source_relative
        target = ROOT / destination_relative
        assert source.resolve().is_relative_to(ARCHIVE) and not source.is_symlink(), str(source)
        assert target.resolve().is_relative_to(ROOT), str(target)
        expected = checksums[source_relative]
        assert digest(source) == expected, "Archive checksum mismatch: " + source_relative
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        assert target.is_file() and not target.is_symlink()
        assert digest(target) == expected, "Destination differs: " + destination_relative
        assert (source.stat().st_dev, source.stat().st_ino) != (
            target.stat().st_dev,
            target.stat().st_ino,
        ), "Copy shares archive inode"
        records[destination_relative] = {
            "projectPath": destination_relative,
            "archivePath": source_relative,
            "sha256": expected,
            "bytes": target.stat().st_size,
        }

    for artist in artists:
        for source in sorted((ARCHIVE / artist["directory"]).rglob("*")):
            if source.is_file():
                copy(source.relative_to(ARCHIVE).as_posix())
        print("Copied artist:", artist["name"], artist["artworkCount"], "artworks", flush=True)

    original_snapshots = read(ARCHIVE / "snapshots/index.json")
    snapshots = []
    for snapshot in original_snapshots:
        entries = [
            e for e in selected if any(s["snapshot"] == snapshot["id"] for s in e["sourceRecords"])
        ]
        if not entries:
            continue
        base = snapshot["directory"]
        # Exact published bytes referenced by each retained artwork manifest.
        assets = set()
        for entry in entries:
            for source in entry["sourceRecords"]:
                if source["snapshot"] == snapshot["id"]:
                    assets.update(
                        base + "/" + a["path"]
                        for a in read(ARCHIVE / source["originalManifestPath"])["assets"]
                    )
        for path in sorted(assets):
            copy(path)
        for h in holdings:
            if h["snapshot"] == snapshot["id"]:
                copy(h["onchainRecordPath"])
        # Retain block-pinned inventory and format/identity context, not unrelated transaction archives.
        context = [
            "archive/collection-summary.json",
            "archive/source-provenance.json",
            "archive/snapshot/inventory.json",
            "archive/snapshot/schema.json",
            "archive/snapshot/contract-bytecode.json",
            "archive/snapshot/ethereum-inventory.json",
        ]
        for path in context:
            if (ARCHIVE / base / path).exists():
                copy(base + "/" + path)
        snapshots.append(
            {k: snapshot[k] for k in ["id", "owner", "directory", "chains"]}
            | {
                "copiedArtworkCount": len(entries),
                "copiedOwnedEditions": sum(h["snapshot"] == snapshot["id"] for h in holdings),
                "originalArchiveChecksumSHA256": snapshot["originalChecksumSHA256"],
                "scope": "Selected gallery artworks and their IPFS assets, ownership evidence and snapshot context.",
            }
        )
    write(ROOT / "collection/catalog.json", selected)
    write(ROOT / "collection/artists.json", artists)
    write(ROOT / "collection/holdings.json", holdings)
    write(ROOT / "collection/snapshots/index.json", snapshots)

    gallery = []
    for e in selected:
        item = {
            k: e[k]
            for k in [
                "inkId",
                "inkNumber",
                "name",
                "createdAt",
                "metadataCID",
                "artist",
                "artistName",
                "width",
                "height",
                "strokes",
                "points",
            ]
        }
        item.update(
            {
                k: "collection/" + e[k]
                for k in [
                    "directory",
                    "imagePath",
                    "metadataPath",
                    "strokesPath",
                    "compressedStrokesPath",
                    "strokeSummaryPath",
                ]
            }
        )
        number = re.search(r"#(\d+)", e["name"])
        item.update(
            {
                "collectionId": group(e),
                "seriesNumber": int(number[1]) if number else None,
                "ownedEditionCount": len(e["ownedTokens"]),
                "wallets": sorted({h["owner"] for h in e["ownedTokens"]}),
                "provenancePath": "collection/" + e["directory"] + "/artwork.json",
            }
        )
        gallery.append(item)
    gallery.sort(
        key=lambda e: (
            e["collectionId"],
            e["seriesNumber"] is None,
            e["seriesNumber"] or 0,
            e["name"].lower(),
            e["inkId"],
        )
    )
    write(ROOT / "data/gallery.json", gallery)
    definitions = [
        ("nifty-faces", "Nifty Faces", "nnxyz"),
        ("nnotb", "NNOTB", "nnxyz"),
        ("rawblocks", "Rawblocks", "nnxyz"),
        ("nnxyz-other", "Other nnxyz works", "nnxyz"),
        ("scrimshaw", "Scrimshaw", "related-artist"),
        ("related", "Related collection", "other-artists"),
    ]
    groups = []
    for identifier, name, role in definitions:
        rows = [e for e in gallery if e["collectionId"] == identifier]
        groups.append(
            {
                "id": identifier,
                "name": name,
                "role": role,
                "artworkCount": len(rows),
                "ownedEditionCount": sum(e["ownedEditionCount"] for e in rows),
                "included": bool(rows),
                "artworkIds": [e["inkId"] for e in rows],
            }
        )
    write(ROOT / "data/collections.json", groups)

    for source in sorted((ARCHIVE / "vendor").rglob("*")):
        if source.is_file():
            copy(
                source.relative_to(ARCHIVE).as_posix(),
                "source/" + source.relative_to(ARCHIVE).as_posix(),
            )
    # Existing self-contained previews and SVGs provide working stroke/render references.
    for source in sorted((ARCHIVE / "previews").rglob("*")):
        if source.is_file() and "__pycache__" not in source.parts:
            copy(
                source.relative_to(ARCHIVE).as_posix(),
                "source/archive/" + source.relative_to(ARCHIVE).as_posix(),
            )
            target = ROOT / source.relative_to(ARCHIVE)
            if not target.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
    copy("tools/export-svg.py", "source/archive/tools/export-svg.py")
    exporter = (
        (ARCHIVE / "tools/export-svg.py")
        .read_text()
        .replace("ROOT/'catalog.json'", "ROOT/'data/gallery.json'")
    )
    (ROOT / "tools/export-svg.py").write_text(exporter)
    sample_file = ROOT / "previews/spot-check/sources.json"
    samples = read(sample_file)
    for sample in samples:
        for field in ["originalPNG", "sourceStrokes"]:
            if not sample[field].startswith("collection/"):
                sample[field] = "collection/" + sample[field]
    write(sample_file, samples)
    comparison = ROOT / "previews/spot-check/svg-validation.html"
    comparison.write_text(
        comparison.read_text().replace("../../artists/", "../../collection/artists/")
    )
    preview_root = ROOT / "previews"
    paths = sorted(
        p
        for p in preview_root.rglob("*")
        if p.is_file() and p.name != "SHA256SUMS" and "__pycache__" not in p.parts
    )
    (preview_root / "SHA256SUMS").write_text(
        "".join(digest(p) + "  " + p.relative_to(preview_root).as_posix() + "\n" for p in paths)
    )

    manifest = {
        "copiedAtCentralTime": datetime.now(ZoneInfo("America/Chicago")).isoformat(),
        "archiveRoot": str(ARCHIVE),
        "archiveChecksumSHA256": digest(ARCHIVE / "SHA256SUMS"),
        "includeRelatedArtists": args.include_related,
        "distinctArtworks": len(selected),
        "ownedEditions": len(holdings),
        "creatorAddresses": len(artists),
        "copyMethod": "Independent regular-file copies; no archive symlinks or hard links.",
        "copiedFiles": sorted(records.values(), key=lambda r: r["projectPath"]),
    }
    write(records_path, manifest)
    print(json.dumps({k: v for k, v in manifest.items() if k != "copiedFiles"}, indent=2))
    print("Copied source files:", len(records))


if __name__ == "__main__":
    main()
