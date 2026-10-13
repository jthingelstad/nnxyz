#!/usr/bin/env python3
"""Package verified source bytes once per SHA256 without touching the archive."""

import hashlib
import json
from pathlib import Path
import sys
import tarfile

root = Path(__file__).resolve().parents[1]
output = Path(sys.argv[1])
entries = []
for source in sorted((root / "collection").rglob("*")):
    if source.is_file():
        if source.is_symlink():
            raise ValueError("Collection must contain independent regular files")
        with source.open("rb") as stream:
            sha = hashlib.file_digest(stream, "sha256").hexdigest()
        entries.append({"projectPath": source.relative_to(root).as_posix(), "sha256": sha})
file_manifest = root / "infra/dataset-files.json"
file_manifest.write_text(json.dumps(entries, indent=2) + "\n")
unique = {e["sha256"]: e for e in entries}
with tarfile.open(output, "w:gz", compresslevel=6, format=tarfile.PAX_FORMAT) as bundle:
    for digest, entry in sorted(unique.items()):
        source = root / entry["projectPath"]
        with source.open("rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != digest:
                raise ValueError("Source hash mismatch: " + str(source))
        info = bundle.gettarinfo(str(source), arcname="blobs/" + digest)
        info.uid = info.gid = 0
        info.uname = info.gname = ""
        info.mtime = 0
        with source.open("rb") as stream:
            bundle.addfile(info, stream)
with output.open("rb") as stream:
    digest = hashlib.file_digest(stream, "sha256").hexdigest()
manifest = {
    "schemaVersion": 1,
    "bucket": "nnxyz-storage-archive-999153317627",
    "key": f"datasets/{digest}/collection.tar.gz",
    "sha256": digest,
    "bytes": output.stat().st_size,
    "uniqueBlobs": len(unique),
    "restoredFiles": len(entries),
    "manifestPath": "infra/dataset-files.json",
    "manifestSHA256": hashlib.sha256(file_manifest.read_bytes()).hexdigest(),
}
(root / "infra/dataset.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
