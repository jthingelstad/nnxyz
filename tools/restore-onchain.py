#!/usr/bin/env python3
"""Restore the After Nifty Ink originals from their hash-pinned bundle.

Usage: python3 tools/restore-onchain.py [.build/onchain-collection.tar.gz]

Checks the bundle against infra/onchain-dataset.json and every manifest path
against the two recovered trees (no symlinks, nothing outside them), then
restores through tools/restore-collection.py: regular-file copies, every hash
checked, and a changed local file refused rather than overwritten.
"""

import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CONFIG = "infra/onchain-dataset.json"
TREES = [ROOT / "collection/recovered-onchain", ROOT / "collection/recovered-tezos"]


def check_paths(root=ROOT):
    config = json.loads((root / CONFIG).read_text())
    for entry in json.loads((root / config["manifestPath"]).read_text()):
        target = root / entry["projectPath"]
        current = target
        while current != root and current != current.parent:
            if current.is_symlink():
                raise ValueError("Symlink in recovered source path: " + entry["projectPath"])
            current = current.parent
        if not any(target.resolve().is_relative_to(tree) for tree in TREES):
            raise ValueError("Path outside the recovered trees: " + entry["projectPath"])


def main():
    bundle = Path(sys.argv[1] if len(sys.argv) > 1 else ".build/onchain-collection.tar.gz")
    check_paths()
    spec = importlib.util.spec_from_file_location("restore_collection", ROOT / "tools/restore-collection.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.restore(bundle, ROOT, CONFIG, "collection")


if __name__ == "__main__":
    main()
