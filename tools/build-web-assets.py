#!/usr/bin/env python3
"""Derive public media without modifying imported source artwork."""

import hashlib
import importlib.util
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
spec = importlib.util.spec_from_file_location("archive_svg", ROOT / "tools/export-svg.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


def build():
    for name in ["art", "png", "records"]:
        (PUBLIC / name).mkdir(parents=True, exist_ok=True)
    old_path = PUBLIC / "asset-manifest.json"
    old = json.loads(old_path.read_text()) if old_path.exists() else {}
    previous = {x["id"]: x for x in old.get("artworks", [])}
    version = hashlib.sha256((ROOT / "tools/export-svg.py").read_bytes()).hexdigest()
    records = []
    for item in json.loads((ROOT / "data/gallery.json").read_text()):
        cid = item["inkId"]
        raw = (ROOT / item["strokesPath"]).read_bytes()
        source_hash = hashlib.sha256(raw).hexdigest()
        output = PUBLIC / "art" / f"{cid}.svg"
        prev = previous.get(cid, {})
        if not (
            output.exists()
            and prev.get("sourceSHA256") == source_hash
            and old.get("exporterSHA256") == version
        ):
            output.write_text(exporter.svg(json.loads(raw), item["name"]))
        for key, dest in [
            ("imagePath", PUBLIC / "png" / f"{cid}.png"),
            ("metadataPath", PUBLIC / "records" / f"{cid}.metadata.json"),
            ("provenancePath", PUBLIC / "records" / f"{cid}.provenance.json"),
        ]:
            source = ROOT / item[key]
            if (
                not dest.exists()
                or hashlib.sha256(dest.read_bytes()).digest()
                != hashlib.sha256(source.read_bytes()).digest()
            ):
                shutil.copyfile(source, dest)
        records.append(
            {
                "id": cid,
                "sourceSHA256": source_hash,
                "svgSHA256": hashlib.sha256(output.read_bytes()).hexdigest(),
                "svgBytes": output.stat().st_size,
                "strokes": item["strokes"],
                "points": item["points"],
            }
        )
    old_path.write_text(
        json.dumps({"exporterSHA256": version, "artworks": records}, indent=2) + "\n"
    )
    total = sum(x["svgBytes"] for x in records)
    print(
        f"Derived {len(records)} native SVGs: {total / 1024**2:.1f} MiB; largest {max(x['svgBytes'] for x in records) / 1024**2:.1f} MiB"
    )


if __name__ == "__main__":
    build()
