#!/usr/bin/env python3
"""Restore hash-pinned public source bytes; refuse changed existing copies."""

import hashlib
import json
from pathlib import Path
import urllib.request
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def restore_file(entry, root=ROOT):
    target = root / entry["path"]
    base = (root / "collection/recovered-abstract").resolve()
    if not target.resolve().is_relative_to(base) or target.is_symlink():
        raise ValueError("Unsafe recovered source path")
    url = urlsplit(entry["url"])
    if url.scheme != "https" or url.hostname not in {
        "www.thingelstad.com",
        "files.thingelstad.com",
    }:
        raise ValueError("Unexpected recovery source")
    if target.exists():
        raw = target.read_bytes()
    else:
        with urllib.request.urlopen(entry["url"], timeout=90) as response:
            if urlsplit(response.url).hostname != url.hostname:
                raise ValueError("Recovery redirected to another host")
            raw = response.read(entry["bytes"] + 1)
    if len(raw) != entry["bytes"] or hashlib.sha256(raw).hexdigest() != entry["sha256"]:
        raise ValueError("Recovered source differs: " + entry["path"])
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive creation also prevents overwriting a concurrently restored file.
        with target.open("xb") as stream:
            stream.write(raw)


def main():
    data = json.loads((ROOT / "data/abstract.json").read_text())
    for entry in data["files"]:
        restore_file(entry)
    print(f"Restored or verified {len(data['files'])} independent Abstract source files")


if __name__ == "__main__":
    main()
