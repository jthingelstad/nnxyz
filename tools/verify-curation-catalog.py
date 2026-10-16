#!/usr/bin/env python3
"""Verify catalog facts, identity, provenance, editorial structure and links."""

import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text())


def digest(path):
    with (ROOT / path).open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def main():
    gallery = {e["inkId"]: e for e in read("data/gallery.json")}
    dossiers = read("curation/catalog/dossiers.json")
    byid = {e["artworkId"]: e for e in dossiers}
    labels = read("curation/catalog/labels.json")
    labels_byid = {e["artworkId"]: e for e in labels}
    manifest = read("curation/catalog/manifest.json")
    queue = read("curation/catalog/editorial-queue.json")
    exceptions = read("curation/catalog/exceptions.json")
    assert set(gallery) == set(byid) and len(dossiers) == len(gallery)
    assert len(labels) == len(labels_byid)
    checked_sources = 0
    for dossier in dossiers:
        e = gallery[dossier["artworkId"]]
        assert dossier["title"] == e["name"] and dossier["collectionId"] == e["collectionId"]
        assert dossier["identity"]["creatorAddress"] == e["artist"]
        source = read(e["provenancePath"])
        assert source["inkId"] == e["inkId"] and source["artist"] == e["artist"]
        assert source["metadataCID"] == dossier["identity"]["metadataCID"]
        assert (
            len(source["ownedTokens"])
            == dossier["ownership"]["ownedEditionCount"]
            == e["ownedEditionCount"]
        )
        for kind in ["image", "strokes", "metadata", "provenance"]:
            assert digest(dossier["sources"][kind + "Path"]) == dossier["sources"][kind + "SHA256"]
            checked_sources += 1
        body = {k: v for k, v in dossier.items() if k != "dossierSHA256"}
        expected = hashlib.sha256(
            json.dumps(body, sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()
        assert expected == dossier["dossierSHA256"]
        for path in dossier["sources"]["archivedFiles"]:
            assert (ROOT / path).is_file() and (ROOT / path).resolve().is_relative_to(
                (ROOT / "collection").resolve()
            )
        facts = {x["id"]: x["value"] for x in dossier["technical"]}
        assert facts["recorded-strokes"] == source["strokes"]
        assert facts["sampled-points"] == source["points"]
        assert facts["canvas"] == {"width": source["width"], "height": source["height"]}
        assert set(dossier["ownership"]["wallets"]) == {t["owner"] for t in source["ownedTokens"]}
    word_counts = []
    for label in labels:
        d = byid[label["artworkId"]]
        assert label["title"] == d["title"] and label["collectionId"] == d["collectionId"]
        assert label["sources"] == d["sources"] and label["technical"] == d["technical"]
        assert label["dossierSHA256"] == d["dossierSHA256"]
        assert (
            label["status"] == "ai-reviewed"
            and label["review"]["standardAcceptedByCollector"] is True
        )
        assert label["review"]["individualHumanApproval"] is False
        assert len(label["visualObservations"]) == 3
        ids = {x["id"] for x in label["visualObservations"]}
        assert set(label["curatorialReading"]["observationIds"]).issubset(ids)
        count = len(label["curatorialReading"]["text"].split())
        assert 45 <= count <= 80
        word_counts.append(count)
        assert 3 <= len(label["discoveryTags"]) <= 6
        assert len(label["connections"]) <= 2
        if "imageReviewEvidence" in label:
            evidence = label["imageReviewEvidence"]
            assert evidence["imageSHA256"] == d["sources"]["imageSHA256"]
            receipts = read(evidence["receiptPath"])
            assert len(receipts) >= 2 and receipts[0]["stage"] == "draft"
            assert any(r["stage"] == "image-review" for r in receipts)
            assert receipts[0]["stopReason"] == receipts[-1]["stopReason"] == "end_turn"
            for receipt in receipts:
                if receipt["stage"] == "draft":
                    assert receipt["modelId"] == label["generation"]["modelIdentifier"]
                assert receipt["stopReason"] in {"end_turn", "max_tokens"}
                assert receipt["usage"]["inputTokens"] > 0 and receipt["usage"]["outputTokens"] > 0
                assert digest(receipt["systemPromptPath"]) == receipt["systemPromptSHA256"]
                assert receipt["images"][0]["artworkId"] == label["artworkId"]
                for img in receipt["images"]:
                    assert img["imageSHA256"] == byid[img["artworkId"]]["sources"]["imageSHA256"]
            inspected = {e["artworkId"] for e in evidence["comparisonImages"]}
            assert receipts[-1]["modelId"] == evidence["reviewer"] == label["review"]["reviewer"]
            assert all(c["targetArtworkId"] in inspected for c in label["connections"])
            if "assistantFinalReview" in evidence:
                assert (
                    evidence["assistantFinalReview"]["imageSHA256"] == d["sources"]["imageSHA256"]
                )
                assert evidence["assistantFinalReview"]["method"].startswith(
                    "Direct visual inspection"
                )
        for connection in label["connections"]:
            target = connection["targetArtworkId"]
            assert target in labels_byid and target != label["artworkId"]
            assert connection["targetTitle"] == byid[target]["title"]
            assert connection["reason"] and connection["status"] == "ai-reviewed"
    counts = Counter(e["curatorialReading"]["text"] for e in labels)
    assert max(counts.values()) == 1, "Duplicate complete curatorial readings"
    assert len(queue) == len(gallery) and {x["artworkId"] for x in queue} == set(gallery)
    for e in queue:
        assert e["dossierSHA256"] == byid[e["artworkId"]]["dossierSHA256"]
        assert e["status"] == (
            "ai-reviewed" if e["artworkId"] in labels_byid else "awaiting-image-review"
        )
    assert manifest["artworksWithValidatedDossiers"] == len(gallery)
    assert manifest["artworksWithAIReviewedLabels"] == len(labels)
    assert manifest["artworksAwaitingImageReview"] == len(gallery) - len(labels)
    assert manifest["ownedEditions"] == sum(e["ownedEditionCount"] for e in gallery.values())
    for file, fingerprint in manifest["files"].items():
        assert digest("curation/catalog/" + file) == fingerprint
    for e in exceptions:
        assert all(ink_id in gallery for ink_id in e["artworkIds"])
        if e["kind"] == "duplicate-title":
            assert len(e["artworkIds"]) > 1
            assert len({gallery[ink_id]["name"].strip() for ink_id in e["artworkIds"]}) == 1
    routes = read("curation/catalog/routes.json")
    for route in routes:
        assert 3 <= len(route["stops"]) <= 5
        assert len({x["artworkId"] for x in route["stops"]}) == len(route["stops"])
        assert all(x["artworkId"] in labels_byid and x["reason"] for x in route["stops"])
    report = {
        "complete": True,
        "dossiersVerified": len(dossiers),
        "sourceFilesHashVerified": checked_sources,
        "individualLabelsVerified": len(labels),
        "readingWordRange": [min(word_counts), max(word_counts)],
        "duplicateCompleteReadings": 0,
        "inspectedConnectionEndpointsVerified": True,
        "curatorialRoutes": len(routes),
        "unreviewedWorksExplicitlyPending": len(gallery) - len(labels),
        "scope": "Checks source facts/hashes, identities, record structure, statuses, model invocation evidence and links. New batch readings received separate image-backed model review; the assistant inspected a stratified sample. This is not individual human approval or a visitor study.",
    }
    target = ROOT / "curation/catalog/verification.json"
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
