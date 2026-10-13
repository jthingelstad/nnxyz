#!/usr/bin/env python3
"""Save exact prompt texts matching receipt hashes, including earlier versions."""

import ast
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    tree = ast.parse((ROOT / "tools/curate-collection.py").read_text())
    schema = next(
        n.value.value
        for n in ast.walk(tree)
        if isinstance(n, ast.Assign)
        and any(isinstance(t, ast.Name) and t.id == "schema" for t in n.targets)
    )
    v5 = """Aim for 55-65 words in reading and 30-40 words in context, leaving room inside the limits.
Do not use deliberately, intentional, purposeful, carefully, evolving, or usual: these
imply intent or unsupported conventions. Describe the visible result instead.
"""
    v4 = """Return only these keys and, during review, reviewFindings. Keep each observation under 35
words, each comparison under 35 words, and ambiguities to at most two short statements.
Keep reviewFindings to at most three short statements. Do not repeat the entire audit.
Use familiar words: avoid centripetal, centrifugal, register, chromatic, gestural vocabulary.
No CIDs, ordinal positions, totals, dates or stroke counts in public editorial prose. Exact
IDs belong only in targetArtworkId. Context may use titles, but must say owned subset.
"""
    prompt = (ROOT / "curation/curator-prompt.md").read_text()
    texts = [prompt] + [
        prompt + "\n" + s
        for s in [schema, schema.replace(v5, ""), schema.replace(v5, "").replace(v4, "")]
    ]
    paths = {}
    for text in texts:
        digest = hashlib.sha256(text.encode()).hexdigest()
        path = f"curation/full-pass/prompts/{digest}.txt"
        (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / path).write_text(text)
        paths[digest] = path
    missing = []
    for path in (ROOT / "curation/full-pass/receipts").glob("*.json"):
        receipts = json.loads(path.read_text())
        for receipt in receipts:
            digest = receipt["systemPromptSHA256"]
            if digest in paths:
                receipt["systemPromptPath"] = paths[digest]
            else:
                missing.append({"receipt": str(path.relative_to(ROOT)), "hash": digest})
        path.write_text(json.dumps(receipts, indent=2, ensure_ascii=False) + "\n")
    print(
        json.dumps(
            {"savedPromptVersions": len(paths), "unmatchedReceiptPrompts": missing}, indent=2
        )
    )
    assert not missing


if __name__ == "__main__":
    main()
