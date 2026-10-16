#!/usr/bin/env python3
"""Package the After Nifty Ink originals as a hash-pinned bundle, like pack-abstract.py.

Usage: python3 tools/pack-onchain.py .build/onchain-collection.tar.gz [--pointer]

Files: every sourcePath and stillPath in data/onchain.json (checked against its
imageSHA256 and stillSHA256) and every metadataPath in data/onchain-works.json
(checked against the SHA-256 in collection/recovered-onchain/manifest.json).
Writes infra/onchain-dataset-files.json and a deterministic tar.gz of unique
blobs named by hash. --pointer also writes infra/onchain-dataset.json; pass it
only after the uploaded object's length and checksum have been verified.
"""

import gzip
import hashlib
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
TREES = [ROOT / "collection/recovered-onchain", ROOT / "collection/recovered-tezos"]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inside_trees(path):
    """Refuse symlinks anywhere on the path and anything outside the two recovered trees."""
    current = path
    while current != ROOT and current != current.parent:
        if current.is_symlink():
            return False
        current = current.parent
    return any(path.resolve().is_relative_to(tree) for tree in TREES)


def main():
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((ROOT / "data/onchain.json").read_text())["artworks"]
    works = json.loads((ROOT / "data/onchain-works.json").read_text())["artworks"]
    recovered = json.loads((ROOT / "collection/recovered-onchain/manifest.json").read_text())["files"]
    recorded = {f["path"]: f["sha256"] for f in recovered if f.get("path")}
    expected = {}
    for work in catalog:
        expected[work["sourcePath"]] = work["imageSHA256"]
        if work.get("stillPath"):
            expected[work["stillPath"]] = work["stillSHA256"]
    for work in works:
        if work.get("metadataPath"):
            expected[work["metadataPath"]] = recorded[work["metadataPath"]]
    entries = [{"projectPath": path, "sha256": sha} for path, sha in sorted(expected.items())]
    for entry in entries:
        source = ROOT / entry["projectPath"]
        if not inside_trees(source) or not source.is_file() or digest(source) != entry["sha256"]:
            raise ValueError("Recovered source changed or unsafe: " + entry["projectPath"])
    manifest_path = ROOT / "infra/onchain-dataset-files.json"
    manifest_path.write_text(json.dumps(entries, indent=2) + "\n")
    unique = {entry["sha256"]: entry for entry in entries}
    # Fixed gzip header time, owner, mode and mtime: the same files always pack to the same bytes.
    with output.open("wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", compresslevel=6, mtime=0, filename="") as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as bundle:
            for sha, entry in sorted(unique.items()):
                source = ROOT / entry["projectPath"]
                info = tarfile.TarInfo("blobs/" + sha)
                info.size = source.stat().st_size
                info.mode = 0o444
                info.mtime = 0
                with source.open("rb") as stream:
                    bundle.addfile(info, stream)
    sha = digest(output)
    config = {
        "schemaVersion": 1,
        "bucket": "nnxyz-storage-archive-999153317627",
        "key": f"datasets/onchain/{sha}/collection.tar.gz",
        "sha256": sha,
        "bytes": output.stat().st_size,
        "uniqueBlobs": len(unique),
        "restoredFiles": len(entries),
        "manifestPath": "infra/onchain-dataset-files.json",
        "manifestSHA256": digest(manifest_path),
    }
    if "--pointer" in sys.argv[2:]:
        (ROOT / "infra/onchain-dataset.json").write_text(json.dumps(config, indent=2) + "\n")
    print(json.dumps(config, indent=2))


if __name__ == "__main__":
    main()
