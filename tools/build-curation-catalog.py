#!/usr/bin/env python3
"""Build factual dossiers for the collection and reviewed editorial records.

This tool never invents visual readings. It combines saved, inspected-image
editorial notes with deterministic archive facts. Unread works remain pending.
"""

import copy
import hashlib
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "curation/catalog"


def read(path):
    return json.loads((ROOT / path).read_text())


def save(path, value):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def sha(path):
    with (ROOT / path).open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def canonical_hash(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def main():
    gallery = read("data/gallery.json")
    byid = {e["inkId"]: e for e in gallery}
    features = {e["inkId"]: e for e in read("curation/features.json")}
    relations = {e["inkId"]: e for e in read("curation/relationship-candidates.json")}
    seed_labels = read("curation/pilot/labels.json")
    previous_labels = (
        {e["artworkId"]: e for e in read("curation/catalog/labels.json")}
        if (OUT / "labels.json").exists()
        else {}
    )
    new_selection = read("curation/expanded-pilot/new-selection.json")
    notes = []
    note_paths = ["curation/expanded-pilot/editorial-notes.json"] + [
        str(p.relative_to(ROOT)) for p in sorted((ROOT / "curation/editorial").glob("*.json"))
    ]
    for path in note_paths:
        for note in read(path):
            note["_inputPath"] = path
            notes.append(note)
    policy = read("curation/editorial-standard.json")
    timestamp = datetime.now(ZoneInfo("America/Chicago")).isoformat()
    template = seed_labels[0]["technical"]
    dossiers = []
    for e in gallery:
        f = features[e["inkId"]]
        values = {
            "artist": e["artistName"],
            "recorded-creation": f["recordedCreationCentralTime"],
            "medium": "Digital brush drawing (Nifty Ink)",
            "recorded-strokes": f["recordedStrokes"],
            "helper-strokes": f["backgroundFlaggedStrokes"] + f["referenceFlaggedStrokes"],
            "sampled-points": f["sampledPoints"],
            "canvas": f["logicalCanvas"],
            "png": f["pngPixels"],
        }
        technical = []
        for field in template:
            record = copy.deepcopy(field)
            record["value"] = values[field["id"]]
            record["source"] = (
                e["provenancePath"]
                if field["id"] in ["artist", "recorded-creation"]
                else (e["imagePath"] if field["id"] == "png" else e["strokesPath"])
            )
            technical.append(record)
        technical.append(
            {
                "id": "owned-editions",
                "label": "Owned editions in imported archive",
                "value": e["ownedEditionCount"],
                "basis": "Archived ownership snapshot, not a live balance",
                "source": e["provenancePath"],
            }
        )
        dossier = {
            "schemaVersion": 2,
            "artworkId": e["inkId"],
            "title": e["name"],
            "collectionId": e["collectionId"],
            "identity": {
                "creatorAddress": e["artist"],
                "artistDisplayName": e["artistName"],
                "inkNumber": e["inkNumber"],
                "metadataCID": e["metadataCID"],
            },
            "ownership": {
                "ownedEditionCount": e["ownedEditionCount"],
                "wallets": e["wallets"],
                "basis": "Imported archived snapshot",
            },
            "technical": technical,
            "measurements": f,
            "relationshipCandidates": relations[e["inkId"]],
            "sources": {
                "imagePath": e["imagePath"],
                "imageSHA256": f["imageSHA256"],
                "strokesPath": e["strokesPath"],
                "strokesSHA256": f["strokesSHA256"],
                "metadataPath": e["metadataPath"],
                "metadataSHA256": sha(e["metadataPath"]),
                "provenancePath": e["provenancePath"],
                "provenanceSHA256": sha(e["provenancePath"]),
                "featureMethodVersion": f["methodVersion"],
                "archivedFiles": sorted(
                    str(p.relative_to(ROOT))
                    for p in (ROOT / e["directory"]).iterdir()
                    if p.is_file()
                ),
            },
        }
        dossier["dossierSHA256"] = canonical_hash(dossier)
        dossiers.append(dossier)
    dossiers_byid = {e["artworkId"]: e for e in dossiers}
    labels = copy.deepcopy(seed_labels)
    name_matches = defaultdict(list)
    for e in gallery:
        name_matches[e["name"].strip()].append(e["inkId"])
    for note in notes:
        source = byid[note["artworkId"]]
        ink_id = source["inkId"]
        assert ink_id in byid
        if "selectionIndex" in note:
            assert new_selection[note["selectionIndex"]]["inkId"] == ink_id
        d = dossiers_byid[ink_id]
        assert note["imageReview"]["status"] == "complete"
        assert note["imageReview"]["imageSHA256"] == d["sources"]["imageSHA256"]
        connections = []
        for c in note["connections"]:
            if "targetArtworkId" in c:
                target = c["targetArtworkId"]
                assert target in byid and target != ink_id
            elif "targetSelectionIndex" in c:
                target = new_selection[c["targetSelectionIndex"]]["inkId"]
            else:
                choices = name_matches[c["targetName"].strip()]
                assert len(choices) == 1, c
                target = choices[0]
            connections.append(
                {
                    "targetArtworkId": target,
                    "targetTitle": byid[target]["name"],
                    "type": "visual-comparison",
                    "reason": c["reason"],
                    "selectionBasis": (
                        "Both original PNGs supplied to multimodal drafting and separate image review; an editorial comparison, not evidence of influence"
                        if "generationEvidence" in note
                        else "Both images inspected by the assistant; an editorial comparison, not evidence of influence"
                    ),
                    "status": "ai-reviewed",
                }
            )
        labels.append(
            {
                "schemaVersion": 2,
                "artworkId": ink_id,
                "title": source["name"],
                "collectionId": source["collectionId"],
                "generation": {
                    "agent": "Codex assistant in this conversation",
                    "modelIdentifier": "Not exposed in the conversation",
                    "promptVersion": "museum-curator-v1",
                    "generatedAtCentralTime": timestamp,
                    "editorialInput": note["_inputPath"],
                    "editorialInputSHA256": sha(note["_inputPath"]),
                    "editorialNoteSHA256": canonical_hash(
                        {k: v for k, v in note.items() if k != "_inputPath"}
                    ),
                },
                "visualObservations": [
                    {
                        "id": f"visual-{i + 1}",
                        "text": text,
                        "basis": "Assistant inspection of the archived PNG",
                    }
                    for i, text in enumerate(note["observations"])
                ],
                "curatorialReading": {
                    "text": note["reading"],
                    "basis": "AI visual interpretation, not an artist statement",
                    "observationIds": ["visual-1", "visual-2", "visual-3"],
                },
                "collectionContext": {
                    "text": note["contextAngle"],
                    "numberedOwnedNeighbors": relations[ink_id]["numberedOwnedNeighbors"],
                    "recordedCreationNeighbors": relations[ink_id]["recordedCreationNeighbors"],
                    "source": "curation/relationship-candidates.json",
                    "scope": "Imported owned subset; title order and recorded creation order are separate",
                },
                "connections": connections,
                "discoveryTags": [
                    {"term": t, "basis": "visual observation", "status": "ai-reviewed"}
                    for t in note["tags"]
                ],
                "lookingQuestion": note["lookingQuestion"],
                "ambiguities": note["ambiguities"],
                "interpretationNotice": "AI curator reading; recorded facts, collector perspective and interpretation have separate attribution.",
            }
        )
        if note.get("interpretiveTags"):
            labels[-1]["interpretiveTags"] = [
                {
                    "term": t,
                    "basis": "AI interpretation, not a visible fact or artist statement",
                    "status": "ai-reviewed",
                }
                for t in note["interpretiveTags"]
            ]
        if "generationEvidence" in note:
            evidence = note["generationEvidence"]
            assert len(read(evidence["receiptPath"])) >= 2
            assert note["imageReview"]["reviewer"] == evidence.get(
                "reviewerModelIdentifier", evidence["modelIdentifier"]
            )
            inspected = {
                e["artworkId"]: e["imageSHA256"] for e in note["imageReview"]["comparisonImages"]
            }
            for connection in connections:
                target = connection["targetArtworkId"]
                assert inspected[target] == dossiers_byid[target]["sources"]["imageSHA256"]
            labels[-1]["generation"].update(evidence)
            if note.get("identifierRepairs"):
                labels[-1]["generation"]["identifierRepairs"] = note["identifierRepairs"]
            labels[-1]["imageReviewEvidence"] = note["imageReview"]
            for observation in labels[-1]["visualObservations"]:
                observation["basis"] = (
                    "Original archived PNG supplied to multimodal drafting and separate image review"
                )
    for index, label in enumerate(labels):
        d = dossiers_byid[label["artworkId"]]
        label["schemaVersion"] = 2
        label["sources"] = d["sources"]
        label["technical"] = d["technical"]
        label["dossierSHA256"] = d["dossierSHA256"]
        label["status"] = "ai-reviewed"
        label["review"] = {
            "editorialStandard": policy["id"],
            "standardAcceptedByCollector": True,
            "individualHumanApproval": False,
            "reviewer": "Codex assistant in this conversation",
            "reviewedAtCentralTime": timestamp,
            "visualEvidence": "Original archived PNGs; existing pilot also refreshed with its contact sheet",
            "factsInsertedBySoftware": True,
            "ambiguitiesHandledInWording": True,
        }
        if "imageReviewEvidence" in label:
            label["review"].update(
                {
                    "reviewer": label["imageReviewEvidence"]["reviewer"],
                    "reviewedAtCentralTime": label["generation"]["reviewedAtCentralTime"],
                    "visualEvidence": label["imageReviewEvidence"],
                    "reviewMethod": "Separate image-backed model review; not individual human approval",
                }
            )
        label.setdefault("ambiguities", [])
        for c in label["connections"]:
            c["status"] = "ai-reviewed"
        for t in label["discoveryTags"]:
            t["status"] = "ai-reviewed"
        previous = previous_labels.get(label["artworkId"])
        if previous and previous.get("dossierSHA256") == label["dossierSHA256"]:
            # Preserve generation/review timestamps when neither evidence nor the reading changed.
            content_fields = [
                "visualObservations",
                "curatorialReading",
                "collectionContext",
                "connections",
                "discoveryTags",
                "interpretiveTags",
                "lookingQuestion",
                "ambiguities",
            ]
            if (
                all(previous.get(k) == label.get(k) for k in content_fields)
                and previous["review"]["editorialStandard"] == policy["id"]
                and previous["generation"].get("editorialNoteSHA256")
                == label["generation"].get("editorialNoteSHA256")
            ):
                labels[index] = previous
    curated_ids = {e["artworkId"] for e in labels}
    assert len(labels) == len(curated_ids) and len(seed_labels) <= len(labels) <= len(gallery)
    # Both endpoints have actually been inspected; numeric candidates never become editorial links here.
    for label in labels:
        assert all(c["targetArtworkId"] in curated_ids for c in label["connections"])
    exceptions = []
    for title, ids in name_matches.items():
        if len(ids) > 1:
            exceptions.append(
                {
                    "kind": "duplicate-title",
                    "artworkIds": ids,
                    "title": title,
                    "handling": "Keep distinct CIDs and creator identities; no inferred edition or version equivalence",
                    "status": "handled-in-editorial-catalog"
                    if set(ids) <= curated_ids
                    else "pending-editorial-review",
                }
            )
    for d in dossiers:
        r = d["relationshipCandidates"]
        n = r["numberedOwnedNeighbors"]
        if n and n["parsedTitleNumber"] == 0:
            exceptions.append(
                {
                    "kind": "zero-number-title",
                    "artworkIds": [d["artworkId"]],
                    "title": d["title"],
                    "handling": "Show title order and recorded creation separately; no assumption that zero was made first",
                    "status": "handled-in-editorial-catalog"
                    if d["artworkId"] in curated_ids
                    else "pending-editorial-review",
                }
            )
        if "fork" in d["title"].lower():
            exceptions.append(
                {
                    "kind": "fork-title",
                    "artworkIds": [d["artworkId"]],
                    "title": d["title"],
                    "handling": "Maintain distinct identity; describe visible correspondence without guessing the fork purpose",
                    "status": "handled-in-editorial-catalog"
                    if d["artworkId"] in curated_ids
                    else "pending-editorial-review",
                }
            )
    for label in labels:
        for ambiguity in label["ambiguities"]:
            exceptions.append(
                {
                    "kind": "interpretive-boundary",
                    "artworkIds": [label["artworkId"]],
                    "title": label["title"],
                    "handling": ambiguity,
                    "status": "handled-in-label-wording",
                }
            )
    queue = [
        {
            "artworkId": e["artworkId"],
            "title": e["title"],
            "collectionId": e["collectionId"],
            "status": "ai-reviewed" if e["artworkId"] in curated_ids else "awaiting-image-review",
            "dossierSHA256": e["dossierSHA256"],
        }
        for e in dossiers
    ]
    save("curation/catalog/dossiers.json", dossiers)
    save("curation/catalog/labels.json", labels)
    save("curation/catalog/exceptions.json", exceptions)
    save("curation/catalog/editorial-queue.json", queue)
    save("curation/catalog/selection.json", [byid[e["artworkId"]] for e in labels])
    save(
        "curation/catalog/manifest.json",
        {
            "schemaVersion": 2,
            "generatedAtCentralTime": timestamp,
            "editorialStandard": policy["id"],
            "artworksWithValidatedDossiers": len(dossiers),
            "artworksWithAIReviewedLabels": len(labels),
            "artworksAwaitingImageReview": len(dossiers) - len(labels),
            "ownedEditions": sum(e["ownedEditionCount"] for e in gallery),
            "stage": "editorial-pass-complete"
            if len(labels) == len(gallery)
            else "expanded-pilot-complete",
            "liveCuratorImplemented": False,
            "websiteImplemented": False,
            "files": {
                name: sha("curation/catalog/" + name)
                for name in [
                    "dossiers.json",
                    "labels.json",
                    "exceptions.json",
                    "editorial-queue.json",
                    "routes.json",
                ]
                if (OUT / name).exists()
            },
        },
    )
    print(
        json.dumps(
            {
                "dossiers": len(dossiers),
                "aiReviewedLabels": len(labels),
                "awaitingImageReview": len(dossiers) - len(labels),
                "exceptionRecords": len(exceptions),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
