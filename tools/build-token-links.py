#!/usr/bin/env python3
"""Extract the collected token identities the site links to from the archive.

The archive's provenance records are large and stay in the private snapshot;
the site needs only chain, contract, token and owner for each owned edition.
Rerun after importing a new archive snapshot.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

tokens = {}
for work in json.loads((ROOT / "data/gallery.json").read_text()):
    record = json.loads((ROOT / work["provenancePath"]).read_text())
    tokens[work["inkId"]] = [
        {key: token[key] for key in ("chainId", "contract", "tokenId", "owner")}
        for token in record["ownedTokens"]
    ]
(ROOT / "data/tokens.json").write_text(json.dumps(tokens, indent=1) + "\n")
print(f"Token links for {len(tokens)} drawings, {sum(map(len, tokens.values()))} owned editions")
