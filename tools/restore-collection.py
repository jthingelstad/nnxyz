#!/usr/bin/env python3
"""Restore a hash-pinned bundle as independent, exact source copies."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import tarfile
import tempfile


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def restore(bundle, root):
    root = root.resolve()
    config = json.loads((root / "infra/dataset.json").read_text())
    if digest(bundle) != config["sha256"]:
        raise ValueError("Dataset bundle checksum mismatch")
    manifest = root / config["manifestPath"]
    if digest(manifest) != config["manifestSHA256"]:
        raise ValueError("Dataset file manifest checksum mismatch")
    entries = json.loads(manifest.read_text())
    expected = {e["sha256"] for e in entries}
    with tempfile.TemporaryDirectory(prefix="nnxyz-blobs-") as temporary:
        blobs = Path(temporary)
        seen = set()
        with tarfile.open(bundle, "r:gz") as archive:
            for member in archive:
                if not member.isfile() or not re.fullmatch(r"blobs/[a-f0-9]{64}", member.name):
                    raise ValueError("Unsafe bundle entry: " + member.name)
                sha = member.name.split("/")[1]
                if sha not in expected or sha in seen:
                    raise ValueError("Unexpected or duplicate source blob")
                target = blobs / sha
                with archive.extractfile(member) as source, target.open("wb") as dest:
                    shutil.copyfileobj(source, dest)
                if digest(target) != sha:
                    raise ValueError("Source blob checksum mismatch")
                seen.add(sha)
        if seen != expected:
            raise ValueError("Source bundle is incomplete")
        # Validate every destination before writing; never overwrite changed artwork.
        for entry in entries:
            dest = root / entry["projectPath"]
            if not dest.resolve().is_relative_to(root / "collection") or dest.is_symlink():
                raise ValueError("Unsafe source destination")
            if dest.exists() and digest(dest) != entry["sha256"]:
                raise ValueError("Existing source differs: " + entry["projectPath"])
        for entry in entries:
            dest = root / entry["projectPath"]
            if not dest.exists():
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(blobs / entry["sha256"], dest)
    print(f"Restored and verified {len(entries)} source files from {len(expected)} unique blobs")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    restore(args.bundle, args.root)
