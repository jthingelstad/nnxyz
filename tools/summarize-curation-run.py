#!/usr/bin/env python3
"""Summarize saved completion and metered API evidence without inventing costs."""

import hashlib
import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]


def main():
    labels = json.loads((ROOT / "curation/catalog/labels.json").read_text())
    dossiers = json.loads((ROOT / "curation/catalog/dossiers.json").read_text())
    byid = {d["artworkId"]: d for d in dossiers}
    receipts = {}
    for p in (ROOT / "curation/full-pass/receipts").glob("*.json"):
        for r in json.loads(p.read_text()):
            receipts[r["requestId"]] = r
    usage = Counter()
    stages = Counter()
    for r in receipts.values():
        usage.update(
            {k: r["usage"].get(k, 0) for k in ["inputTokens", "outputTokens", "totalTokens"]}
        )
        stages[r["stage"]] += 1
    cross = sum(
        byid[c["targetArtworkId"]]["collectionId"] != label["collectionId"]
        for label in labels
        for c in label["connections"]
    )
    audit = json.loads((ROOT / "curation/full-pass/language-audit.json").read_text())
    notes = {
        e["artworkId"]: e
        for e in json.loads((ROOT / "curation/editorial/full-collection.json").read_text())
    }
    unhandled = [
        f
        for f in audit["flags"]
        if f not in notes[f["artworkId"]]["imageReview"].get("collectionReviewFlags", [])
    ]
    assert not unhandled
    report = {
        "generatedAtCentralTime": datetime.now(ZoneInfo("America/Chicago")).isoformat(),
        "status": "complete" if len(labels) == len(dossiers) else "incomplete",
        "artworks": len(dossiers),
        "reviewedLabels": len(labels),
        "pending": len(dossiers) - len(labels),
        "labelsByCollection": dict(Counter(e["collectionId"] for e in labels)),
        "editorialConnections": sum(len(e["connections"]) for e in labels),
        "connectionsAcrossCollectionGroups": cross,
        "reviewMethod": {
            "initialAssistantReviewedLabels": sum("imageReviewEvidence" not in e for e in labels),
            "newImageBackedModelReviewedLabels": sum("imageReviewEvidence" in e for e in labels),
            "generationModels": dict(
                Counter(
                    e["generation"]["modelIdentifier"] for e in labels if "imageReviewEvidence" in e
                )
            ),
            "reviewModels": dict(
                Counter(
                    e["imageReviewEvidence"]["reviewer"]
                    for e in labels
                    if "imageReviewEvidence" in e
                )
            ),
            "assistantFinalWordingChecks": sum(
                "assistantFinalReview" in e.get("imageReviewEvidence", {}) for e in labels
            ),
            "description": "Separate multimodal draft and review calls, collection-wide wording audit, targeted image-backed corrections and assistant visual spot checks. AI review is not individual human approval.",
        },
        "uniqueSavedInvocationReceipts": len(receipts),
        "invocationsByStage": dict(stages),
        "languageAudit": {
            "unresolvedFlags": len(unhandled),
            "retainedReviewedFlaggedArtworks": len({f["artworkId"] for f in audit["flags"]}),
            "repeatedReadingSentences": len(audit["repeatedReadingSentences"]),
        },
        "savedReceiptUsage": dict(usage),
        "earlyNovaCalibration": {
            "totalTokensFromRunOutput": 60538,
            "detail": "Rejected for generic wording and unsupported development claims. Detailed Nova receipts were superseded during calibration; this token total comes from the saved run output, not the later Sonnet receipts.",
        },
        "cost": "Not an invoice. Token usage is recorded; billed charges have not been retrieved.",
        "sourceBoundary": "Imported collection bytes and the permanent archive are untouched.",
        "liveCuratorImplemented": False,
        "websiteImplemented": False,
        "labelFileSHA256": hashlib.sha256(
            (ROOT / "curation/catalog/labels.json").read_bytes()
        ).hexdigest(),
    }
    (ROOT / "curation/full-pass/run-summary.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
