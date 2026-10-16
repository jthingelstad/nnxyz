#!/usr/bin/env python3
"""Fetch the After Nifty Ink originals from IPFS into the ignored collection/ trees.

Usage: python3 tools/fetch-onchain-sources.py [--gateway https://ipfs.filebase.io/ipfs/]

For every work in data/onchain.json whose sourcePath is missing, download the
token's own image URI through a public gateway, verify the SHA-256 recorded in
the catalog, and write it to sourcePath. For the one video, extract the still
with ffmpeg and verify it too. Never overwrites a file that already matches.
"""

import argparse
import hashlib
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gateway", default="https://ipfs.filebase.io/ipfs/")
    args = parser.parse_args()
    catalog = json.loads((ROOT / "data/onchain.json").read_text())
    fetched = verified = 0
    for work in catalog["artworks"]:
        path = ROOT / work["sourcePath"]
        if not (
            path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == work["imageSHA256"]
        ):
            uri = work["imageSourceURI"].replace("ipfs://ipfs/", "ipfs://").replace("ipfs://", "")
            request = urllib.request.Request(
                args.gateway + uri, headers={"User-Agent": "nnxyz-gallery"}
            )
            data = urllib.request.urlopen(request, timeout=300).read()
            if hashlib.sha256(data).hexdigest() != work["imageSHA256"]:
                raise SystemExit(f"Hash differs for {work['name']} from {uri}")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            fetched += 1
        verified += 1
        if work["stillPath"]:
            still = ROOT / work["stillPath"]
            if not (
                still.exists()
                and hashlib.sha256(still.read_bytes()).hexdigest() == work["stillSHA256"]
            ):
                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-loglevel",
                        "error",
                        "-ss",
                        "1",
                        "-i",
                        str(path),
                        "-frames:v",
                        "1",
                        str(still),
                    ],
                    check=True,
                )
                if hashlib.sha256(still.read_bytes()).hexdigest() != work["stillSHA256"]:
                    raise SystemExit(
                        f"Extracted still differs for {work['name']}; use the same ffmpeg build or copy the still"
                    )
    print(f"verified {verified} originals, fetched {fetched}")


if __name__ == "__main__":
    sys.exit(main())
