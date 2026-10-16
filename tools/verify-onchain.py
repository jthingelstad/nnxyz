#!/usr/bin/env python3
"""Verify data/onchain.json offline: identities, counts, hashes of present sources, and the rooms."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    catalog = json.loads((ROOT / "data/onchain.json").read_text())
    works = catalog["artworks"]
    ids = [w["id"] for w in works]
    require(
        len(ids) == len(set(ids)) == 46, "After Nifty Ink must hold 46 distinct token identities"
    )
    for w in works:
        if w["chain"] == "tezos":
            require(
                w["id"] == f"tezos-{w['contract']}-{w['tokenId']}" and w["chainId"] is None,
                "Tezos identity differs",
            )
        else:
            require(
                w["id"] == f"{w['chain']}-{w['contract']}-{w['tokenId']}", "Token identity differs"
            )
            require(w["chainId"] in (1, 10, 137, 42161), "Unexpected chain id")
        require(w["ownershipEvidence"] == "chain", "Ownership must rest on the chain record")
        require(len(w["imageSHA256"]) == 64 and w["imageBytes"] > 0, "Missing source hash")
        path = ROOT / w["sourcePath"]
        if path.exists():
            require(
                hashlib.sha256(path.read_bytes()).hexdigest() == w["imageSHA256"],
                f"Source differs: {w['name']}",
            )
    structure = json.loads(
        (ROOT / "curation/exhibitions/structure/after-nifty-ink.json").read_text()
    )
    hung = [x["artworkId"] for g in structure["galleries"] for x in g["works"]]
    require(sorted(hung) == sorted(ids), "Every work hangs once in the wing")
    for g in structure["galleries"]:
        require(20 <= len(g["works"]) <= 30, f"Room size: {g['key']}")
    print(f"verified {len(works)} works in {len(structure['galleries'])} rooms")


if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        sys.exit(str(error))
