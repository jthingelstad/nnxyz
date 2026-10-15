#!/usr/bin/env python3
"""Package already-verified SVG/WebP bytes for read-only reuse by routine builds."""

import hashlib
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pack(output):
    gallery = json.loads((ROOT / "data/gallery.json").read_text())
    abstract = json.loads((ROOT / "data/abstract.json").read_text())["artworks"]
    names = [
        "public/asset-manifest.json",
        "public/abstract/asset-manifest.json",
        "public/raster/asset-manifest.json",
    ]
    names += [f"public/art/{work['inkId']}.svg" for work in gallery]
    raster = json.loads((ROOT / "public/raster/asset-manifest.json").read_text())
    names += ["public" + image["path"] for work in raster["artworks"] for image in work["images"]]
    names += [
        f"public/abstract/images/{work['id']}-{width}.webp"
        for work in abstract
        for width in [640, 1200, 2000]
    ]
    entries = []
    for name in sorted(names):
        source = ROOT / name
        if source.is_symlink() or not source.resolve().is_relative_to(ROOT / "public"):
            raise ValueError("Unsafe derived asset: " + name)
        entries.append({"projectPath": name, "sha256": digest(source)})
    manifest = ROOT / "infra/derived-dataset-files.json"
    manifest.write_text(json.dumps(entries, indent=2) + "\n")
    output.parent.mkdir(parents=True, exist_ok=True)
    unique = {entry["sha256"]: entry for entry in entries}
    with tarfile.open(output, "w:gz", compresslevel=1, format=tarfile.PAX_FORMAT) as bundle:
        for sha, entry in sorted(unique.items()):
            source = ROOT / entry["projectPath"]
            info = bundle.gettarinfo(str(source), arcname="blobs/" + sha)
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            info.mtime = 0
            with source.open("rb") as stream:
                bundle.addfile(info, stream)
    sha = digest(output)
    input_names = [
        "infra/dataset.json",
        "infra/abstract-dataset.json",
        "data/gallery.json",
        "data/abstract.json",
        "tools/export-svg.py",
        "tools/build-web-assets.py",
        "tools/build-raster-assets.mjs",
        "tools/build-abstract-assets.mjs",
    ]
    config = {
        "schemaVersion": 1,
        "bucket": "nnxyz-storage-archive-999153317627",
        "key": f"datasets/derived/{sha}/assets.tar.gz",
        "sha256": sha,
        "bytes": output.stat().st_size,
        "restoredFiles": len(entries),
        "manifestPath": "infra/derived-dataset-files.json",
        "manifestSHA256": digest(manifest),
        "inputHashes": {name: digest(ROOT / name) for name in input_names},
    }
    (ROOT / "infra/derived-dataset.json").write_text(json.dumps(config, indent=2) + "\n")
    print(json.dumps(config, indent=2))


if __name__ == "__main__":
    pack(Path(sys.argv[1]))
