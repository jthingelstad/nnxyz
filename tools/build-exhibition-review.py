#!/usr/bin/env python3
"""Offline image sheets, exhibition assembly, validation and local review.

Use the bundled Pillow runtime for sheets. This script never invokes a model.
Sheets preserve full artwork canvases and are derived review evidence only.
"""

import argparse
import copy
import hashlib
import html
import json
import math
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "curation/exhibitions"


def read(path):
    return json.loads(path.read_text())


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def now():
    return datetime.now(ZoneInfo("America/Chicago")).isoformat()


def white_canvas_image(image):
    """Display source alpha over the original white drawing canvas."""
    from PIL import Image

    rgba = image.convert("RGBA")
    return Image.alpha_composite(Image.new("RGBA", image.size, "white"), rgba).convert("RGB")


def sheets(collection=None, white_canvas=False):
    from PIL import Image, ImageDraw, ImageFont, ImageOps

    directory = BASE / ("sheets-white-v2" if white_canvas else "sheets")
    affected = (
        {g["id"] for g in read(BASE / "alpha-affected-galleries.json")} if white_canvas else None
    )
    directory.mkdir(parents=True, exist_ok=True)
    font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    font = ImageFont.truetype(font_path, 18)
    small = ImageFont.truetype(font_path, 14)
    count = 0
    for path in sorted((BASE / "plans").glob("*.json")):
        record = read(path)
        cid = record["plan"]["collectionId"]
        if collection and cid != collection:
            continue
        byslot = {r["slot"]: r for r in record["records"]}
        for gallery in record["plan"]["galleries"]:
            key = f"{cid}--{gallery['id']}"
            if affected is not None and key not in affected:
                continue
            target = directory / f"{key}.json"
            if target.exists():
                continue
            members = [byslot[s] for s in gallery["slots"]]
            evidence = []
            for page, start in enumerate(range(0, len(members), 12)):
                batch = members[start : start + 12]
                cell, gap, text_height = 416, 16, 60
                columns = 3
                rows = math.ceil(len(batch) / columns)
                canvas = Image.new(
                    "RGB",
                    (columns * (cell + gap) + gap, rows * (cell + text_height + gap) + gap),
                    "white",
                )
                draw = ImageDraw.Draw(canvas)
                positions = []
                for index, member in enumerate(batch):
                    image_path = ROOT / member["imagePath"]
                    assert digest(image_path) == member["imageSHA256"]
                    with Image.open(image_path) as original:
                        image = ImageOps.contain(
                            white_canvas_image(original), (cell, cell), Image.Resampling.LANCZOS
                        )
                    x = gap + index % columns * (cell + gap)
                    y = gap + index // columns * (cell + text_height + gap)
                    canvas.paste(
                        image, (x + (cell - image.width) // 2, y + (cell - image.height) // 2)
                    )
                    draw.text(
                        (x, y + cell + 7),
                        f"{member['slot']} — {member['title']}",
                        fill="black",
                        font=font,
                    )
                    draw.text((x, y + cell + 32), member["artworkId"], fill="#444", font=small)
                    positions.append(
                        {
                            "slot": member["slot"],
                            "artworkId": member["artworkId"],
                            "imagePath": member["imagePath"],
                            "imageSHA256": member["imageSHA256"],
                            "cell": {"row": index // columns, "column": index % columns},
                            "renderedSize": [image.width, image.height],
                        }
                    )
                output = directory / f"{key}-{page + 1}.jpg"
                canvas.save(output, "JPEG", quality=95, subsampling=0)
                evidence.append(
                    {
                        "path": str(output.relative_to(ROOT)),
                        "sha256": digest(output),
                        "caption": f"Gallery {key}, sheet {page + 1}. Full canvases, read left to right, top to bottom. Labels identify exact inventory slots.",
                        "kind": "uncropped-ensemble-sheet",
                        "size": list(canvas.size),
                        "members": positions,
                    }
                )
            anchors = [members[0], members[len(members) // 2], members[-1]]
            for anchor in anchors:
                anchor_path = ROOT / anchor["imagePath"]
                anchor_sha = anchor["imageSHA256"]
                kind = "original-anchor"
                if white_canvas:
                    with Image.open(anchor_path) as original:
                        if (
                            "A" in original.getbands()
                            and original.getchannel("A").getextrema()[0] < 255
                        ):
                            anchor_path = directory / f"{anchor['artworkId']}-white.png"
                            white_canvas_image(original).save(anchor_path)
                            anchor_sha = digest(anchor_path)
                            kind = "white-canvas-anchor"
                evidence.append(
                    {
                        "path": str(anchor_path.relative_to(ROOT)),
                        "sha256": anchor_sha,
                        "caption": f"Larger anchor on original white drawing canvas: {anchor['slot']}, {anchor['title']}",
                        "kind": kind,
                        "artworkId": anchor["artworkId"],
                        "sourceImagePath": anchor["imagePath"],
                        "sourceImageSHA256": anchor["imageSHA256"],
                    }
                )
            save(
                target,
                {
                    "galleryId": key,
                    "methodVersion": "uncropped-sheets-white-v2",
                    "createdAt": now(),
                    "imageCount": len(members),
                    "images": evidence,
                },
            )
            count += 1
    print(json.dumps({"newGalleryImageSets": count}))


def apply_assistant_wording():
    path = BASE / "assistant-wording.json"
    corrections = read(path)
    backups_path = BASE / "wording" / "assistant-before.json"
    backups = read(backups_path) if backups_path.exists() else {}
    for gallery_id, changes in corrections["edits"].items():
        target = BASE / "galleries" / f"{gallery_id}.json"
        gallery = read(target)
        backups.setdefault(gallery_id, copy.deepcopy(gallery))
        gallery = {**gallery, **changes}
        gallery["evidence"]["assistantWordingPath"] = "curation/exhibitions/assistant-wording.json"
        gallery["evidence"]["assistantWordingSHA256"] = digest(path)
        gallery["evidence"]["assistantWordingScope"] = corrections["scope"]
        if "assistantWordedAt" not in gallery:
            gallery["assistantWordedAt"] = now()
        save(target, gallery)
    save(backups_path, backups)


def expand_editorial_references():
    """Replace transport aliases with real titles, retaining exact CID edges."""
    backups_path = BASE / "wording" / "before-reference-expansion.json"
    backups = read(backups_path) if backups_path.exists() else {}
    changes = []
    for path in sorted((BASE / "galleries").glob("*.json")):
        gallery = read(path)
        records = read(BASE / "plans" / f"{gallery['collectionId']}.json")["records"]
        byslot = {record["slot"]: record for record in records}
        members = {s["artworkId"] for c in gallery["chapters"] for s in c["stops"]}
        backups.setdefault(gallery["id"], copy.deepcopy(gallery))
        for chapter in gallery["chapters"]:
            for stop in chapter["stops"]:
                references = stop.get("editorialReferences", [])
                for field in ["whyHere", "transitionFromPrevious"]:
                    if stop[field] is None:
                        continue

                    def expand(match):
                        token = match.group(0)
                        source = byslot[token]
                        assert source["artworkId"] in members
                        reference = {
                            "sourceToken": token,
                            "artworkId": source["artworkId"],
                            "title": source["title"],
                        }
                        if reference not in references:
                            references.append(reference)
                        changes.append(
                            {
                                "galleryId": gallery["id"],
                                "artworkId": stop["artworkId"],
                                "field": field,
                                **reference,
                            }
                        )
                        return source["title"]

                    stop[field] = re.sub(r"\bW\d{3}\b", expand, stop[field])
                if references:
                    stop["editorialReferences"] = references
        gallery["evidence"]["referenceExpansionMethod"] = (
            "Exact collection-plan slot to title and CID lookup; no new interpretation"
        )
        save(path, gallery)
    if changes:
        save(backups_path, backups)
        save(
            BASE / "reference-expansion.json",
            {"method": "exact-source-identifier-expansion-v1", "changes": changes},
        )


def correct_chapter_counts():
    words = {
        "one": 1,
        "two": 2,
        "three": 3,
        "four": 4,
        "five": 5,
        "six": 6,
        "seven": 7,
        "eight": 8,
        "nine": 9,
        "ten": 10,
    }
    reversed_words = {value: key for key, value in words.items()}
    path = BASE / "chapter-count-corrections.json"
    corrections = read(path) if path.exists() else []
    for target in sorted((BASE / "galleries").glob("*.json")):
        gallery = read(target)
        changed = False
        for index, chapter in enumerate(gallery["chapters"]):
            match = re.match(
                r"(?:these )?(one|two|three|four|five|six|seven|eight|nine|ten) (?:works|drawings|images)\b",
                chapter["introduction"],
                re.I,
            )
            if match and words[match[1].lower()] != len(chapter["stops"]):
                original = chapter["introduction"]
                replacement = reversed_words[len(chapter["stops"])]
                if match[1][0].isupper():
                    replacement = replacement.capitalize()
                chapter["introduction"] = (
                    original[: match.start(1)] + replacement + original[match.end(1) :]
                )
                corrections.append(
                    {
                        "galleryId": gallery["id"],
                        "chapterIndex": index,
                        "original": original,
                        "corrected": chapter["introduction"],
                        "basis": "Chapter membership count supplied by software",
                    }
                )
                changed = True
        if changed:
            gallery["evidence"]["chapterCountCorrections"] = (
                "curation/exhibitions/chapter-count-corrections.json"
            )
            save(target, gallery)
    save(path, corrections)


def assemble():
    apply_assistant_wording()
    expand_editorial_references()
    correct_chapter_counts()
    introductions = read(BASE / "collection-introductions.json")
    works = {w["inkId"]: w for w in read(ROOT / "data/gallery.json")}
    collections = []
    missing = []
    display = {
        "nifty-faces": "Faces",
        "nnotb": "On the Block",
        "rawblocks": "Rawblocks",
        "nnxyz-other": "Other nnxyz works",
        "scrimshaw": "Scrimshaw",
    }
    for cid in read(BASE / "brief.json")["planningGalleryCounts"]:
        plan_path = BASE / "plans" / f"{cid}.json"
        if not plan_path.exists():
            missing.append(cid)
            continue
        plan = read(plan_path)["plan"]
        galleries = []
        for proposed in plan["galleries"]:
            path = BASE / "galleries" / f"{cid}--{proposed['id']}.json"
            if path.exists():
                galleries.append(read(path))
            else:
                missing.append(f"{cid}--{proposed['id']}")
        collections.append(
            {
                "id": cid,
                "title": display[cid],
                "entrance": "Other & related"
                if cid in ["nnxyz-other", "scrimshaw"]
                else display[cid],
                "introduction": introductions[cid],
                "galleries": galleries,
            }
        )
    assert not missing, "Pending: " + ", ".join(missing)
    map_data = {
        "schemaVersion": 1,
        "status": "ai-image-reviewed-exhibition-draft",
        "assembledAt": now(),
        "sourceLabelSHA256": digest(ROOT / "curation/catalog/labels.json"),
        "briefPath": "curation/exhibitions/brief.json",
        "allWorksLink": False,
        "attribution": "AI curator",
        "individualHumanApproval": False,
        "collections": collections,
    }
    save(BASE / "map.json", map_data)
    validate()
    render(map_data, works)


def validate_home_assignments(data, works):
    """Verify complete bounded navigation without merging names or identities."""
    assert data["allWorksLink"] is False
    assert len({c["id"] for c in data["collections"]}) == len(data["collections"])
    assigned, gallery_ids = [], []
    for collection in data["collections"]:
        for gallery in collection["galleries"]:
            gallery_ids.append(gallery["id"])
            stops = [s for c in gallery["chapters"] for s in c["stops"]]
            assert 1 <= len(stops) <= 30, "Gallery exceeds ceiling or is empty"
            for stop in stops:
                work = works[stop["artworkId"]]
                assert work["collectionId"] == collection["id"], "Cross-collection home"
                assigned.append(stop["artworkId"])
    assert len(set(gallery_ids)) == len(gallery_ids), "Repeated gallery ID"
    assert len(assigned) == len(set(assigned)), "Repeated primary home"
    assert set(assigned) == set(works), "Missing primary home"


def validate():
    data = read(BASE / "map.json")
    works = {w["inkId"]: w for w in read(ROOT / "data/gallery.json")}
    labels = {r["artworkId"]: r for r in read(ROOT / "curation/catalog/labels.json")}
    validate_home_assignments(data, works)
    baseline = read(BASE / "source-baseline.json")
    assert all(digest(ROOT / path) == fingerprint for path, fingerprint in baseline.items()), (
        "Existing source records changed"
    )
    assert data["sourceLabelSHA256"] == digest(ROOT / "curation/catalog/labels.json")
    assert data["allWorksLink"] is False and data["individualHumanApproval"] is False
    assigned, sizes, gallery_ids = [], [], []
    source_count = 0
    receipts_seen = set()
    affected = {
        g["id"]: g["affectedArtworks"] for g in read(BASE / "alpha-affected-galleries.json")
    }
    canvas_reviews = 0
    for collection in data["collections"]:
        expected = {w["inkId"] for w in works.values() if w["collectionId"] == collection["id"]}
        actual = []
        for gallery in collection["galleries"]:
            assert gallery["collectionId"] == collection["id"]
            assert gallery["status"] == "ai-image-reviewed-exhibition-draft"
            assert 3 <= len(gallery["chapters"]) <= 5
            gallery_ids.append(gallery["id"])
            stops = [s for c in gallery["chapters"] for s in c["stops"]]
            assert 1 <= len(stops) <= 30
            assert stops[0]["transitionFromPrevious"] is None
            assert gallery["evidence"]["individualHumanApproval"] is False
            for index, stop in enumerate(stops):
                work = works[stop["artworkId"]]
                assert work["collectionId"] == collection["id"]
                assert stop["title"] == work["name"]
                assert stop["imageSHA256"] == labels[work["inkId"]]["sources"]["imageSHA256"]
                assert digest(ROOT / work["imagePath"]) == stop["imageSHA256"]
                assert stop["whyHere"].strip()
                assert not re.search(
                    r"\bW\d{3}\b", stop["whyHere"] + (stop["transitionFromPrevious"] or "")
                )
                assert all(
                    r["artworkId"] in {s["artworkId"] for s in stops}
                    for r in stop.get("editorialReferences", [])
                )
                if index:
                    assert stop["transitionFromPrevious"].strip()
                actual.append(stop["artworkId"])
                source_count += 1
            manifest = read(ROOT / gallery["evidence"]["imageManifest"])
            depicted = []
            for img in manifest["images"]:
                assert digest(ROOT / img["path"]) == img["sha256"]
                if img["kind"] == "uncropped-ensemble-sheet":
                    depicted.extend(member["artworkId"] for member in img["members"])
                    for member in img["members"]:
                        assert digest(ROOT / member["imagePath"]) == member["imageSHA256"]
            assert set(depicted) == {s["artworkId"] for s in stops}
            assert len(depicted) == len(stops)
            for field, stage in [
                ("draftReceipt", "image-draft"),
                ("reviewReceipt", "image-review"),
            ]:
                receipt_path = ROOT / gallery["evidence"][field]
                receipt = read(receipt_path)
                receipts_seen.add(receipt_path)
                assert receipt["stage"] in (
                    ["image-review", "review-repair"] if stage == "image-review" else [stage]
                )
                assert receipt["stopReason"] == "end_turn"
                prompt = read(ROOT / receipt["promptPath"])
                assert (
                    hashlib.sha256(prompt["system"].encode()).hexdigest()
                    == receipt["systemPromptSHA256"]
                )
                assert (
                    hashlib.sha256(prompt["instruction"].encode()).hexdigest()
                    == receipt["instructionSHA256"]
                )
                assert receipt["images"] == manifest["images"] == prompt["images"]
                assert receipt["outputConfig"] == prompt["outputConfig"]
                assert receipt["usage"]["inputTokens"] > 0 and receipt["usage"]["outputTokens"] > 0
            sizes.append(len(stops))
            if gallery["id"] in affected:
                assert "canvasReviewReceipt" in gallery["evidence"], (
                    "Pending white-canvas fidelity review"
                )
                canvas_receipt = read(ROOT / gallery["evidence"]["canvasReviewReceipt"])
                canvas_prompt = read(ROOT / canvas_receipt["promptPath"])
                assert (
                    canvas_receipt["stage"] == "white-canvas-review"
                    and canvas_receipt["stopReason"] == "end_turn"
                )
                assert (
                    hashlib.sha256(canvas_prompt["system"].encode()).hexdigest()
                    == canvas_receipt["systemPromptSHA256"]
                )
                assert (
                    hashlib.sha256(canvas_prompt["instruction"].encode()).hexdigest()
                    == canvas_receipt["instructionSHA256"]
                )
                assert canvas_receipt["images"] == canvas_prompt["images"]
                for img in canvas_receipt["images"]:
                    assert digest(ROOT / img["path"]) == img["sha256"]
                    if "sourceImagePath" in img:
                        assert digest(ROOT / img["sourceImagePath"]) == img["sourceImageSHA256"]
                assert not gallery["evidence"]["canvasMembershipConcerns"]
                larger = {
                    img["artworkId"]
                    for img in canvas_receipt["images"]
                    if img["kind"] in ["white-canvas-detail", "white-canvas-anchor"]
                }
                assert set(affected[gallery["id"]]).issubset(larger)
                canvas_reviews += 1
            wording_path = ROOT / gallery["evidence"]["wordingReviewReceipt"]
            wording = read(wording_path)
            wording_prompt = read(ROOT / wording["promptPath"])
            assert (
                wording["stage"] == "museum-wording-review" and wording["stopReason"] == "end_turn"
            )
            assert not wording["images"]
            assert (
                hashlib.sha256(wording_prompt["system"].encode()).hexdigest()
                == wording["systemPromptSHA256"]
            )
            assert (
                hashlib.sha256(wording_prompt["instruction"].encode()).hexdigest()
                == wording["instructionSHA256"]
            )
        assert set(actual) == expected and len(actual) == len(expected), collection["id"]
        assigned.extend(actual)
    assert len(set(gallery_ids)) == len(gallery_ids)
    assert len(assigned) == len(set(assigned)) == len(works) and set(assigned) == set(works)
    for collection in data["collections"]:
        for gallery in collection["galleries"]:
            if "assistantWordingPath" in gallery["evidence"]:
                corrections_path = ROOT / gallery["evidence"]["assistantWordingPath"]
                assert digest(corrections_path) == gallery["evidence"]["assistantWordingSHA256"]
                changes = read(corrections_path)["edits"][gallery["id"]]
                assert all(gallery[key] == value for key, value in changes.items())
    receipts = [read(p) for p in (BASE / "receipts").glob("*.json")]
    report = {
        "complete": True,
        "validatedAt": now(),
        "artworks": len(assigned),
        "galleries": len(sizes),
        "gallerySizeRange": [min(sizes), max(sizes)],
        "gallerySizes": dict(sorted(Counter(sizes).items())),
        "exactlyOnePrimaryHomePerArtwork": True,
        "maximum30Verified": True,
        "sourceImagesHashVerified": source_count,
        "separateImageDraftAndReviewReceipts": len(receipts_seen),
        "labelFileUnchanged": True,
        "whiteCanvasFollowupReviews": canvas_reviews,
        "transparentSourcesRechecked": sum(len(ids) for ids in affected.values()),
        "sourceLabelSHA256": data["sourceLabelSHA256"],
        "usage": {
            "savedInvocations": len(receipts),
            "inputTokens": sum(r["usage"]["inputTokens"] for r in receipts),
            "outputTokens": sum(r["usage"]["outputTokens"] for r in receipts),
        },
        "limitations": "Identity, coverage, counts, hashes and provenance checks are deterministic. Aesthetic judgments received AI ensemble-image draft/review; no individual human approval or visitor study. Token usage is not a billing invoice.",
    }
    save(BASE / "verification.json", report)
    print(json.dumps(report, indent=2))


def render(data, works):
    esc = html.escape
    sections = []
    links = []
    for collection in data["collections"]:
        links.append(f'<a href="#{esc(collection["id"])}">{esc(collection["title"])}</a>')
        galleries = []
        for gallery in collection["galleries"]:
            chapters = []
            for chapter in gallery["chapters"]:
                figures = []
                for stop in chapter["stops"]:
                    work = works[stop["artworkId"]]
                    transition = (
                        f'<p class="transition">{esc(stop["transitionFromPrevious"])}</p>'
                        if stop["transitionFromPrevious"]
                        else ""
                    )
                    figures.append(f'''<figure>
<img src="../../{esc(work["imagePath"])}" width="{work["width"]}" height="{work["height"]}" loading="lazy" alt="{esc(work["name"])}">
<figcaption><h4>{esc(work["name"])}</h4><p class="artist">{esc(work["artistName"])}</p>
<p>{esc(stop["whyHere"])}</p>{transition}<details class="provenance"><summary>Review identity</summary><code>{esc(work["inkId"])}</code></details></figcaption></figure>''')
                chapters.append(
                    f'<section class="chapter"><h3>{esc(chapter["title"])}</h3><p class="chapter-intro">{esc(chapter["introduction"])}</p><div class="works">{"".join(figures)}</div></section>'
                )
            total = sum(len(c["stops"]) for c in gallery["chapters"])
            galleries.append(f'''<details class="gallery" id="{esc(gallery["id"])}"><summary><span>{esc(gallery["title"])}</span><small>{total} works · {len(gallery["chapters"])} chapters</small></summary>
<p class="question">{esc(gallery["question"])}</p><p class="gallery-intro">{esc(gallery["introduction"])}</p>
{"".join(chapters)}<p class="closing">{esc(gallery["closing"])}</p><p class="note">AI curator · Exhibition draft · Ensemble image review with original anchors; not individual human approval.</p></details>''')
        sections.append(
            f'<section class="collection" id="{esc(collection["id"])}"><h2>{esc(collection["title"])}</h2><p class="collection-intro">{esc(collection["introduction"])}</p>{"".join(galleries)}</section>'
        )
    gallery_count = sum(len(c["galleries"]) for c in data["collections"])
    work_count = len(works)
    document = (
        """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>nnxyz — Exhibition map review</title>
<style>*{box-sizing:border-box}body{margin:0;background:#fff;color:#333;font:17px/1.65 Georgia,serif}main{max-width:1280px;margin:auto;padding:50px 6vw}h1,h2,h3,h4{font-weight:400;line-height:1.2}h1{font-size:40px}h2{font-size:34px}h3{font-size:27px}h4{font:16px/1.4 Arial,sans-serif;margin:0}.note,.artist,nav,small,summary,.provenance{font-family:Arial,sans-serif}.note{color:#666;font-size:14px;max-width:80ch}nav{display:flex;gap:24px;flex-wrap:wrap;margin:36px 0}a{color:inherit;text-underline-offset:5px}.collection{margin-top:90px;scroll-margin-top:30px}.collection-intro,.gallery-intro,.chapter-intro{max-width:68ch}.gallery{margin:36px 0}.gallery>summary{cursor:pointer;font-size:22px;display:flex;justify-content:space-between;gap:20px}.gallery>summary small{font-size:13px;color:#666;white-space:nowrap}.gallery[open]>summary{font-size:30px}.question{font-size:24px;max-width:60ch}.chapter{margin:72px 0}.works{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:55px 50px;margin-top:32px}figure{margin:0}img{display:block;width:100%;height:auto;object-fit:contain;background:white}figcaption{margin-top:15px}figcaption p{font-size:16px;margin:10px 0}.artist{font-size:13px!important;color:#777}.transition{color:#666}.provenance{font-size:12px;color:#777}.provenance code{overflow-wrap:anywhere}.closing{font-size:23px;max-width:68ch;margin-top:50px}@media(max-width:700px){main{padding:24px 7vw}.works{grid-template-columns:1fr;gap:40px}.gallery>summary{display:block}.gallery>summary small{display:block;margin-top:8px}h1{font-size:30px}.collection{margin-top:60px}}</style>
<main><h1>Exhibition map for the owned collection</h1><p class="note">Curatorial review document, October 14, 2026. Open a gallery to inspect its chapter sequence, artwork roles and transitions. This is a content proposal, not the live website.</p>
<p class="note">"""
        + str(gallery_count)
        + " bounded galleries · "
        + str(work_count)
        + """ works · About 20 works per gallery, ceiling 30 · Entry through collections only. Other nnxyz works and Scrimshaw will share the “Other &amp; related” entrance while keeping their identities separate.</p>
<nav aria-label="Collections">"""
        + "".join(links)
        + "</nav>"
        + "".join(sections)
        + "</main><script>const selected=document.getElementById(location.hash.slice(1));if(selected?.classList.contains('gallery'))selected.open=true;</script></html>"
    )
    (BASE / "review.html").write_text(document)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["sheets", "sheets-white", "assemble", "verify"])
    parser.add_argument("--collection")
    args = parser.parse_args()
    if args.stage == "sheets":
        sheets(args.collection)
    elif args.stage == "sheets-white":
        sheets(args.collection, white_canvas=True)
    elif args.stage == "assemble":
        assemble()
    else:
        validate()


if __name__ == "__main__":
    main()
