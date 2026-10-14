#!/usr/bin/env python3
"""Verify recovered JPEG identities, immutable bytes and image-grounded curation offline."""

import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_records(data, editorial, exhibitions):
    works = data["artworks"]
    ids = {work["id"] for work in works}
    require(len(ids) == len(works) == 52, "Abstract must contain 52 distinct token identities")
    require(
        {work["number"] for work in works} == {"0000", "pos", *(f"{n:02}" for n in range(1, 51))},
        "Abstract title-family members differ",
    )
    by_id = {work["id"]: work for work in works}
    for work in works:
        require(work["chainId"] == 137, "Unexpected token network")
        require(
            work["id"] == f"polygon-{work['contract']}-{work['tokenId']}",
            "Token identity differs",
        )
        require(
            work["tokenUrl"]
            == f"https://opensea.io/assets/matic/{work['contract']}/{work['tokenId']}",
            "Token link differs",
        )
        require(
            work["drawingData"] is None and work["ownershipEvidence"] == "collector-account",
            "Unsupported drawing or ownership assertion",
        )
    records = editorial["records"]
    require(
        len(records) == len(works) and {r["artworkId"] for r in records} == ids,
        "Editorial coverage differs",
    )
    homes = {}
    for collection in exhibitions["collections"]:
        require(collection["id"] == "abstract", "Unexpected recovered collection")
        for gallery in collection["galleries"]:
            stops = [s for chapter in gallery["chapters"] for s in chapter["stops"]]
            require(0 < len(stops) <= 30, "Exhibition exceeds 30-work ceiling")
            for index, stop in enumerate(stops):
                artwork_id = stop["artworkId"]
                require(artwork_id in ids, "Unknown exhibition work")
                require(artwork_id not in homes, "Repeated primary home")
                require(stop["title"] == by_id[artwork_id]["name"], "Exhibition title differs")
                require(stop["whyHere"], "Missing inspected reading")
                require(index == 0 or stop["transitionFromPrevious"], "Missing adjacent comparison")
                homes[artwork_id] = gallery["id"]
    require(set(homes) == ids, "Missing primary home")
    for record in records:
        work = by_id[record["artworkId"]]
        facts = record["technical"]
        require(record["title"] == work["name"], "Editorial title differs")
        require(
            facts["canvas"] == {"width": work["width"], "height": work["height"]},
            "Dimensions differ",
        )
        for fact, field in [
            ("sourceBytes", "imageBytes"),
            ("imageSHA256", "imageSHA256"),
            ("chainId", "chainId"),
            ("contract", "contract"),
            ("tokenId", "tokenId"),
        ]:
            require(facts[fact] == work[field], "Technical fact differs: " + fact)
        require(facts["drawingData"] is None, "Invented brush data")
        require(
            record["collectionContext"]["primaryGallery"] == homes[work["id"]],
            "Editorial home differs",
        )
        require(
            record["imageReviewEvidence"]["sourceImageSHA256"] == work["imageSHA256"],
            "Image review source differs",
        )
        require(
            record["status"] == "assistant-image-inspected" and record["reading"],
            "Uninspected editorial record",
        )


def main():
    def read(name):
        return json.loads((ROOT / name).read_text())

    def digest(path):
        with path.open("rb") as stream:
            return hashlib.file_digest(stream, "sha256").hexdigest()

    data = read("data/abstract.json")
    validate_records(
        data, read("curation/abstract/editorial.json"), read("curation/abstract/exhibitions.json")
    )
    paths = set()
    for entry in data["files"]:
        target = ROOT / entry["path"]
        require(
            target.resolve().is_relative_to(ROOT / "collection/recovered-abstract"),
            "Source path escapes collection",
        )
        require(
            entry["path"] not in paths and not target.is_symlink(), "Duplicate or linked source"
        )
        require(
            target.stat().st_size == entry["bytes"] and digest(target) == entry["sha256"],
            "Recovered source changed: " + entry["path"],
        )
        require(urlsplit(entry["url"]).scheme == "https", "Insecure recovery URL")
        paths.add(entry["path"])
    by_path = {entry["path"]: entry for entry in data["files"]}
    for work in data["artworks"]:
        source = by_path[work["imagePath"]]
        require(
            source["sha256"] == work["imageSHA256"]
            and source["bytes"] == work["imageBytes"]
            and source["url"] == work["imageUrl"],
            "Image receipt differs",
        )
        require((ROOT / work["imagePath"]).read_bytes()[:2] == b"\xff\xd8", "Source is not JPEG")
    review = read("curation/abstract/review.json")
    for field, name in [
        ("sourceCatalogSHA256", "data/abstract.json"),
        ("editorialSHA256", "curation/abstract/editorial.json"),
        ("exhibitionsSHA256", "curation/abstract/exhibitions.json"),
    ]:
        require(review[field] == digest(ROOT / name), "Review fingerprint differs")
    require(
        review["individualHumanApproval"] is False and review["separateModelReview"] is False,
        "Review authority differs",
    )
    inspected = [artwork_id for sheet in review["sheets"] for artwork_id in sheet["artworkIds"]]
    require(
        len(inspected) == 52 and set(inspected) == {work["id"] for work in data["artworks"]},
        "Image inspection coverage differs",
    )
    for history in read("curation/collection-history.json")["collections"]:
        require(
            digest(ROOT / history["sourcePath"]) == history["sourceSHA256"],
            "Historical source changed",
        )
    print(
        json.dumps(
            {
                "recoveredJPEGs": 52,
                "sourceFilesVerified": len(paths),
                "inspectedReadings": 52,
                "exhibitions": 3,
                "strokeDataRecovered": False,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
