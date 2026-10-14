#!/usr/bin/env python3
"""Verify pinned generated artwork independently of the immutable source snapshots."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify(root=ROOT):
    root = root.resolve()
    config = json.loads((root / "infra/derived-dataset.json").read_text())
    for name, sha in config["inputHashes"].items():
        if digest(root / name) != sha:
            raise ValueError("Derived snapshot inputs changed: " + name)
    manifest = root / config["manifestPath"]
    if digest(manifest) != config["manifestSHA256"]:
        raise ValueError("Derived file manifest checksum mismatch")
    entries = json.loads(manifest.read_text())
    if len(entries) != config["restoredFiles"]:
        raise ValueError("Derived file manifest count mismatch")
    for entry in entries:
        target = root / entry["projectPath"]
        if (
            not target.is_file()
            or target.is_symlink()
            or not target.resolve().is_relative_to(root / "public")
            or digest(target) != entry["sha256"]
        ):
            raise ValueError("Missing or changed derived asset: " + entry["projectPath"])
    print(f"Verified {len(entries)} pinned artwork derivatives; no image generation")


if __name__ == "__main__":
    verify()
