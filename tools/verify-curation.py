#!/usr/bin/env python3
"""Read-only checks for the measured collection and nine editorial pilot records."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text())


def digest(path):
    with path.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def main():
    gallery = {e["inkId"]: e for e in read("data/gallery.json")}
    features = read("curation/features.json")
    byid = {e["inkId"]: e for e in features}
    relations = read("curation/relationship-candidates.json")
    labels = read("curation/pilot/labels.json")
    summary = read("curation/measurement-summary.json")
    assert (
        set(byid) == set(gallery) and len(features) == len(gallery) == summary["measuredArtworks"]
    )
    assert sum(e["recordedStrokes"] for e in features) == summary["totalRecordedStrokes"]
    assert sum(e["sampledPoints"] for e in features) == summary["totalSampledPoints"]
    assert {e["inkId"] for e in relations} == set(gallery)
    for e in features:
        item = gallery[e["inkId"]]
        assert e["recordedStrokes"] == item["strokes"] and e["sampledPoints"] == item["points"]
        assert digest(ROOT / item["imagePath"]) == e["imageSHA256"]
        assert digest(ROOT / item["strokesPath"]) == e["strokesSHA256"]
        for palette in [e["paletteWholeImage"], e["paletteWithEstimatedBackgroundRemoved"]]:
            if palette:
                assert abs(sum(p["fraction"] for p in palette) - 1) < 0.0001
    for r in relations:
        for relation in [r["numberedOwnedNeighbors"], r["recordedCreationNeighbors"]]:
            if relation:
                for side in ["previous", "next"]:
                    if relation[side]:
                        assert (
                            relation[side]["inkId"] in gallery
                            and relation[side]["inkId"] != r["inkId"]
                        )
        for e in r["strokeCountCandidates"]:
            assert e["inkId"] in gallery and e["inkId"] != r["inkId"]
        for method in r["paletteCandidates"]:
            assert method["method"] in ["whole-palette", "background-adjusted-palette"]
            for e in method["candidates"]:
                assert e["inkId"] in gallery and 0 <= e["distance"] <= 1
    assert len(labels) == 9 and len({e["artworkId"] for e in labels}) == 9
    for label in labels:
        e = byid[label["artworkId"]]
        assert (
            label["sources"]["imageSHA256"] == e["imageSHA256"]
            and label["sources"]["strokesSHA256"] == e["strokesSHA256"]
        )
        assert label["status"] == "ai-editorial-draft"
        facts = {e["id"]: e["value"] for e in label["technical"]}
        assert (
            facts["recorded-strokes"] == e["recordedStrokes"]
            and facts["sampled-points"] == e["sampledPoints"]
        )
        assert (
            facts["helper-strokes"] == e["backgroundFlaggedStrokes"] + e["referenceFlaggedStrokes"]
        )
        assert facts["canvas"] == e["logicalCanvas"] and facts["png"] == e["pngPixels"]
        assert facts["recorded-creation"] == e["recordedCreationCentralTime"]
        assert 45 <= len(label["curatorialReading"]["text"].split()) <= 80
        observations = {x["id"] for x in label["visualObservations"]}
        assert set(label["curatorialReading"]["observationIds"]).issubset(observations)
        for connection in label["connections"]:
            assert (
                connection["targetArtworkId"] in gallery
                and connection["targetArtworkId"] != label["artworkId"]
            )
    print(
        json.dumps(
            {
                "complete": True,
                "measuredArtworks": len(features),
                "sourceFingerprintsVerified": len(features) * 2,
                "relationshipRecords": len(relations),
                "editorialDrafts": len(labels),
                "recordedStrokes": summary["totalRecordedStrokes"],
                "sampledPoints": summary["totalSampledPoints"],
                "scope": "Facts, source hashes, relation IDs, numeric evidence and editorial record structure. Does not validate aesthetic judgments or a live chatbot.",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
