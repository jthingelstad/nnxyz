#!/usr/bin/env python3
"""Resolve collection-wide wording flags against the original images."""

import concurrent.futures
import json
import runpy
from collections import defaultdict

import boto3
from botocore.config import Config

COMMON = runpy.run_path(__file__.replace("review-curation-flags.py", "curate-collection.py"))
ROOT, load, save = (COMMON[k] for k in ["ROOT", "load", "save"])


def main():
    byid = {e["artworkId"]: e for e in load("curation/catalog/dossiers.json")}
    flags = defaultdict(list)
    audit = load("curation/full-pass/language-audit.json")
    for flag in audit["flags"]:
        flags[flag["artworkId"]].append(flag)
    visual_flags = ROOT / "curation/full-pass/visual-review-flags.json"
    if visual_flags.exists():
        for flag in json.loads(visual_flags.read_text()):
            flags[flag["artworkId"]].append(flag)
    for duplicate in audit["repeatedReadingSentences"]:
        for cid in duplicate["artworkIds"]:
            flags[cid].append({"rule": "repeated-sentence", "text": duplicate["text"]})
    for opening in audit["repeatedFiveWordOpenings"]:
        if opening["count"] >= 4:
            for cid in opening["artworkIds"][1:]:
                flags[cid].append(
                    {
                        "rule": "repeated-opening",
                        "text": opening["text"],
                        "instruction": "Open on a specific color, placement, shape or contrast in this image, with fresh wording.",
                    }
                )
    session = boto3.Session(profile_name="cloud-engineer", region_name="us-east-1")
    config = Config(
        retries={"mode": "adaptive", "total_max_attempts": 5},
        connect_timeout=10,
        read_timeout=120,
        max_pool_connections=6,
    )
    identity = session.client("sts", config=config).get_caller_identity()
    assert identity["Account"] == "999153317627"
    assert "assumed-role/ProjectsCloudEngineer/projects-cloud-engineer" in identity["Arn"]
    client = session.client("bedrock-runtime", config=config)
    prompt = (ROOT / "curation/curator-prompt.md").read_text()

    def revise(cid):
        path = f"curation/full-pass/records/{cid}.json"
        original = load(path)
        handled = {
            json.dumps(f, sort_keys=True)
            for f in original["imageReview"].get("collectionReviewFlags", [])
        }
        if all(json.dumps(f, sort_keys=True) in handled for f in flags[cid]):
            return original
        backup = f"curation/full-pass/pre-quality-review/{cid}.json"
        if not (ROOT / backup).exists():
            save(backup, original)
        receipt_path = original["imageReview"]["receiptPath"]
        receipts = load(receipt_path)
        images = receipts[0]["images"]
        allowed = {i["artworkId"] for i in images if i["artworkId"] != cid}
        content = []
        for image in images:
            raw = (ROOT / image["imagePath"]).read_bytes()
            assert COMMON["digest"](raw) == image["imageSHA256"]
            content += [
                {
                    "text": ("PRIMARY" if image["artworkId"] == cid else "COMPARISON")
                    + "\n"
                    + json.dumps(COMMON["facts"](byid[image["artworkId"]]))
                },
                {"image": {"format": "png", "source": {"bytes": raw}}},
            ]
        current = {
            k: original[k]
            for k in [
                "observations",
                "reading",
                "contextAngle",
                "connections",
                "tags",
                "lookingQuestion",
                "ambiguities",
            ]
        }
        for attempt in range(3):
            instruction = (
                """Perform final collection-level editorial review against these images.
Resolve the listed flags by describing visible results, never presumed intention, evolution,
named influence, biography, historical conventions or physical paint media. Avoid jargon.
For mouth-openness-check flags, visible teeth alone do not establish a wide-open mouth.
Prefer the specific tooth row, outline or visible dark opening; re-examine before retaining
a claim of openness. Preserve expressive interpretation as a reading, not artist psychology.
For body-extent-check flags, distinguish a head-and-torso or cropped upper body from a
full quadruped: only claim four legs when four legs are visible in the supplied image.
Do not claim global visual maxima or complexity rankings from these candidate images;
replace unscoped superlatives with specific visible contrasts between inspected works.
Do not insert CIDs or counts into public prose. No deliberately, intentional, purposeful,
carefully, evolving, or usual in editorial prose. Keep reading 55-65 words, context 30-40
words (owned subset), exactly 3 observations, 3-6 visible-form tags, 0-2 image-backed
connections with exact supplied targetArtworkId, one lookingQuestion, and ambiguities.
Return ONLY JSON with those seven keys plus reviewFindings (up to 3 brief statements).
CURRENT:\n"""
                + json.dumps(current, ensure_ascii=False)
                + "\nFLAGS:\n"
                + json.dumps(flags[cid])
            )
            response = client.converse(
                modelId=COMMON["MODEL"],
                system=[{"text": prompt}],
                messages=[{"role": "user", "content": content + [{"text": instruction}]}],
                inferenceConfig={"maxTokens": 2400, "temperature": 0.2},
            )
            text = "\n".join(
                c["text"] for c in response["output"]["message"]["content"] if "text" in c
            )
            receipts.append(
                {
                    "stage": "collection-review",
                    "modelId": COMMON["MODEL"],
                    "promptVersion": "museum-curator-collection-review-v1",
                    "timeCentral": COMMON["now"](),
                    "usage": response["usage"],
                    "metrics": response.get("metrics"),
                    "requestId": response["ResponseMetadata"]["RequestId"],
                    "stopReason": response["stopReason"],
                    "responseText": text,
                    "images": images,
                    "instruction": instruction,
                    "systemPromptSHA256": COMMON["digest"](prompt.encode()),
                }
            )
            save(receipt_path, receipts)
            if response["stopReason"] != "end_turn":
                continue
            current = COMMON["parse_json"](text)
            try:
                COMMON["validate"](current, allowed)
            except (AssertionError, KeyError, TypeError) as exc:
                flags[cid].append({"rule": "validation", "detail": str(exc)})
                continue
            final = current | {
                k: original[k] for k in ["artworkId", "imageReview", "generationEvidence"]
            }
            final["imageReview"] = original["imageReview"] | {
                "reviewer": COMMON["MODEL"],
                "recordedAtCentralTime": receipts[-1]["timeCentral"],
                "collectionReviewFindings": final.pop("reviewFindings", []),
                "collectionReviewFlags": flags[cid],
            }
            final["generationEvidence"] = original["generationEvidence"] | {
                "reviewedAtCentralTime": receipts[-1]["timeCentral"],
                "collectionReviewPromptVersion": "museum-curator-collection-review-v1",
                "reviewerModelIdentifier": COMMON["MODEL"],
            }
            save(path, final)
            print(json.dumps({"revised": cid}), flush=True)
            return final
        raise RuntimeError("Unable to resolve " + cid)

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(revise, flags))
    notes = [
        json.loads(p.read_text())
        for p in sorted((ROOT / "curation/full-pass/records").glob("*.json"))
    ]
    save("curation/editorial/full-collection.json", notes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
