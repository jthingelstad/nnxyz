#!/usr/bin/env python3
"""Package recovered immutable originals separately from the Nifty Ink snapshot."""

import hashlib
import json
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def main():
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads((ROOT / "data/abstract.json").read_text())
    entries = [{"projectPath": entry["path"], "sha256": entry["sha256"]} for entry in data["files"]]
    for entry in entries:
        source = ROOT / entry["projectPath"]
        if (
            source.is_symlink()
            or not source.resolve().is_relative_to(ROOT / "collection/recovered-abstract")
            or digest(source) != entry["sha256"]
        ):
            raise ValueError("Recovered source changed: " + entry["projectPath"])
    manifest_path = ROOT / "infra/abstract-dataset-files.json"
    manifest_path.write_text(json.dumps(entries, indent=2) + "\n")
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
    config = {
        "schemaVersion": 1,
        "bucket": "nnxyz-storage-archive-999153317627",
        "key": f"datasets/abstract/{sha}/collection.tar.gz",
        "sha256": sha,
        "bytes": output.stat().st_size,
        "uniqueBlobs": len(unique),
        "restoredFiles": len(entries),
        "manifestPath": "infra/abstract-dataset-files.json",
        "manifestSHA256": digest(manifest_path),
    }
    (ROOT / "infra/abstract-dataset.json").write_text(json.dumps(config, indent=2) + "\n")
    print(json.dumps(config, indent=2))


if __name__ == "__main__":
    main()
