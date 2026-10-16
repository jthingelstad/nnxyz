#!/usr/bin/env python3
"""Apply the assistant's directly inspected final wording corrections, offline."""

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]


def main():
    items = json.loads((ROOT / "curation/full-pass/assistant-final-review-input.json").read_text())
    corrections = {
        "nnxyz nifty faces #34": {
            "observations": [
                "A tilted oval head fills the white canvas. Two dark eye forms sit across the upper face, surrounded by crossing colored lines; a separate outlined ear-like oval occupies the right edge.",
                "The mouth left of center has a red-and-black rim, pale upper teeth and a dark lower opening crossed by gray zigzag tooth marks.",
                "Cyan, magenta, yellow, green, white and brown lines cross the head and its outline, while white space remains around the tilted form.",
            ],
            "reading": "The tilted head directs attention diagonally across the white field. Two dark eyes hold the upper face, while the red-rimmed mouth pulls the gaze down and left; an outlined ear extends the shape to the right. Dense crossing lines can read as agitation, but the white space keeps the head distinct from its own tangle. Recognition survives inside the competing marks.",
            "lookingQuestion": "How do the tilted eyes, red-rimmed mouth and outlined ear guide your eye around the head?",
        },
        "Wobbler": {
            "observations": [
                "Three eye-like forms occupy the head: a small tilted diamond high on the forehead, a broad blue oval below left and a rounded blue frame below right.",
                "A dark horizontal mouth is crossed by closely spaced black vertical bars and white tooth-like marks, above a small outlined chin form.",
                "Yellow and orange marks cover the crown, while teal, lavender and magenta lines surround the head and cross its outline.",
            ],
            "reading": "The three eye-like forms offer different ways into the face: a small diamond high on the forehead, a broad oval and a tightly ringed lower eye. Their uneven placement can read as startled or unsteady. Vertical bars across the mouth make the expression harder to settle. Warm yellows and oranges gather above while cool teal surrounds the head, keeping that unsettled gaze in a bright field.",
            "lookingQuestion": "Which of the three eye-like forms draws your attention first, and how does your gaze move between them?",
        },
        "nnxyz nnotb #53": {
            "observations": [
                "A solid black animal silhouette bends its four narrow limbs toward a single black circle at the bottom, with its tail raised high and a light-blue outline around the body.",
                "Two light-blue spiral eyes and a white zigzag tooth line stand out inside the black head.",
                "Short dark-red wavy and angular lines scatter across the saturated yellow field around the silhouette.",
            ],
            "tags": [
                "black animal silhouette",
                "spiral eyes",
                "zigzag teeth",
                "yellow ground",
                "scattered wavy lines",
                "single-point balance",
            ],
        },
        "nnxyz rawblocks #61": {
            "observations": [
                "A large head-like form fills the left and lower image, with a horizontal row of pale teeth; a smaller yellow, pointed-tooth head projects from the upper right.",
                "Magenta rings surround the eye of each head. The left ring encloses a dark center, while crossed lines run through the smaller head's coral-colored eye.",
                "White jagged marks flare around the larger head against a teal ground, and a long coral-red projection extends from the smaller head toward the right edge.",
            ],
            "reading": "Two tooth-bearing forms share the frame: a large head with a horizontal pale tooth row and a smaller yellow head with sharp triangular teeth. Magenta rings draw attention to their unequal eyes. White jagged marks flare around the larger face, while a long coral projection points outward from the smaller one. Their overlap can read as fierce or absurd, without settling whether they belong together.",
        },
        "nnxyz nnotb #51": {
            "observationReplacements": {
                "A solid black four-legged animal sits": "A solid black crouched animal silhouette rests"
            }
        },
        "nnxyz rawblocks #49": {
            "observationReplacements": {
                "against a deep red interior": "around a dark central gap edged in red"
            },
            "readingReplacements": {"its red cavity": "its dark central gap"},
        },
        "nnxyz rawblocks #55": {
            "observations": [
                "A red-rimmed mouth occupies the lower face, with irregular pale tooth marks along its upper edge and a dark, vertically elongated area below.",
                "Two eye areas sit above it: an outlined dark oval on the left and a gold-ringed eye inside a white almond outline on the right.",
                "Blue, yellow, red and black lines cross the olive and brown head, while thin colored marks and heavier black strokes extend beyond its outline.",
            ],
            "reading": "Two unequal eyes draw attention across a tilted face: a dark outlined oval on the left and a gold-ringed stare on the right. Below them, pale tooth marks gather at the top of an elongated mouth. Heavy black outlines hold the form together while thinner colored lines wander past its edges. That contrast can make the face feel both contained and unsettled.",
            "contextAngle": "Within the owned rawblocks subset, this piece sits between nnxyz rawblocks #54 and nnxyz rawblocks #56 by title number. Its two unequal eye zones, elongated mouth and scattered colored lines offer several distinct points of entry.",
            "tags": [
                "unequal eye forms",
                "pale tooth marks",
                "elongated mouth",
                "layered scribble lines",
                "brown and olive ground",
                "scattered colored marks",
            ],
            "dropConnectionContaining": "single round eye",
        },
        "nnxyz nnotb #47": {
            "observationReplacements": {
                "A four-limbed figure": "A figure with several splayed limbs"
            }
        },
        "nnxyz nnotb #181": {
            "observationReplacements": {
                "two diamond-shaped red-filled forms": "two red-filled heart forms"
            },
            "readingReplacements": {
                "two red diamond shapes": "two red heart shapes",
                "read as eyes locked open": "occupy the eye zones",
            },
            "tagReplacements": {"diamond eye forms": "heart eye forms"},
            "questionReplacements": {"red diamond shapes": "red heart shapes"},
        },
        "nnxyz nifty faces #125": {
            "observations": [
                "A dark rounded head sits on lavender, with finger-like projections along its upper edge, a large ear on the left and rounded extensions at the lower corners.",
                "The left eye area contains several gold-outlined vertical shapes crossed by long bars; the right contains a brightly colored spiral inside a dark rounded socket.",
                "Thin pink, teal, yellow and black lines cross the modeled dark surfaces, with pale highlights on the nose, projections and teeth inside the lower mouth.",
            ],
            "reading": "The two eye zones resist a single expression: crossed gold forms on the left face a tightly coiled spiral on the right. Finger-like projections along the upper edge blur the boundary between head and hand without explaining their relationship. Pale highlights make the dark volumes feel rounded, while colored scribbles unsettle their surfaces. The lavender field holds this strange assembly apart from any setting.",
            "tags": [
                "spiral eye",
                "crossed gold eye forms",
                "finger-like projections",
                "dark rounded volumes",
                "layered colored lines",
                "lavender ground",
            ],
            "lookingQuestion": "How do the finger-like projections change the way you follow the head's outer edge?",
            "connectionReplacements": {
                "with no hands": "without the finger-like upper-edge projections"
            },
        },
        "nnxyz #20": {
            "observationReplacements": {
                "a skeletal hand grips a thin dark rod that rises vertically": "an outlined hand has one long finger raised vertically"
            },
            "tags": [
                "wide-brimmed cap",
                "toothed mouth",
                "white loops over dark ground",
                "red stripe fill",
                "raised finger gesture",
                "purple letter-like marks",
            ],
            "readingReplacements": {
                "The open-tooth mouth and narrowed eyes sit in tension — one reads as a shout, the other as a squint.": "The tooth-filled mouth and narrowed eyes can read as a tense grin, while the raised finger beside the head adds a blunt gesture."
            },
        },
        "nnxyz nifty faces #110": {
            "readingReplacements": {
                "one open and releasing, the other sharp and upward-pointing": "one broad and tooth-filled, the other sharp and upward-pointing"
            }
        },
    }
    stamp = datetime.now(ZoneInfo("America/Chicago")).isoformat()
    report = []
    for item in items:
        cid = item["artworkId"]
        path = ROOT / f"curation/full-pass/records/{cid}.json"
        note = json.loads(path.read_text())
        before = json.loads(path.read_text())
        assert (
            hashlib.sha256(Path(item["path"]).read_bytes()).hexdigest()
            == note["imageReview"]["imageSHA256"]
        )
        edit = corrections.get(item["title"], {})
        for key in ["observations", "reading", "contextAngle", "tags", "lookingQuestion"]:
            if key in edit:
                note[key] = edit[key]
        for key, mappingkey in [
            ("observations", "observationReplacements"),
            ("reading", "readingReplacements"),
            ("tags", "tagReplacements"),
            ("lookingQuestion", "questionReplacements"),
        ]:
            for old, new in edit.get(mappingkey, {}).items():
                if isinstance(note[key], list):
                    note[key] = [v.replace(old, new) for v in note[key]]
                else:
                    note[key] = note[key].replace(old, new)
        for connection in note["connections"]:
            for old, new in edit.get("connectionReplacements", {}).items():
                connection["reason"] = connection["reason"].replace(old, new)
        if "dropConnectionContaining" in edit:
            note["connections"] = [
                c
                for c in note["connections"]
                if edit["dropConnectionContaining"] not in c["reason"]
            ]
        # For these inspected images, describe the tooth forms rather than inferring gape.
        if item["title"] != "nnxyz rawblocks #49":

            def restrained(s):
                return re.sub(
                    r"wide[ -]open(?:-toothed)? mouth", "tooth-filled mouth", s, flags=re.I
                )

            note["observations"] = [restrained(s) for s in note["observations"]]
            note["tags"] = [
                restrained(s)
                .replace("open mouth with teeth", "exposed teeth")
                .replace("open-tooth mouth", "toothed mouth")
                for s in note["tags"]
            ]
        if item["title"] == "nnxyz nnotb #27":
            note["reading"] = note["reading"].replace(
                "crouches and opens wide", "crouches with a long tooth-filled mouth"
            )
        evidence = {
            "reviewer": "OpenAI assistant in this conversation",
            "recordedAtCentralTime": stamp,
            "method": "Direct visual inspection of original PNG; final wording review after model quota. No additional model invocation.",
            "imageSHA256": note["imageReview"]["imageSHA256"],
            "reviewedFlags": [item["flag"]],
            "findings": "Checked the flagged form against the original image; corrected overly literal or unsupported descriptions where needed. Retained visible body/teeth descriptions where supported.",
        }
        note["imageReview"]["assistantFinalReview"] = evidence
        note["imageReview"].setdefault("collectionReviewFlags", []).append(item["flag"])
        backup = ROOT / f"curation/full-pass/pre-assistant-final-review/{cid}.json"
        backup.parent.mkdir(parents=True, exist_ok=True)
        if not backup.exists():
            backup.write_text(json.dumps(before, indent=2, ensure_ascii=False) + "\n")
        assert 45 <= len(note["reading"].split()) <= 80, (
            item["title"],
            len(note["reading"].split()),
        )
        assert 25 <= len(note["contextAngle"].split()) <= 55
        path.write_text(json.dumps(note, indent=2, ensure_ascii=False) + "\n")
        report.append(
            {
                "artworkId": cid,
                "title": item["title"],
                "evidence": evidence,
                "changedFields": [
                    k
                    for k in [
                        "observations",
                        "reading",
                        "contextAngle",
                        "connections",
                        "tags",
                        "lookingQuestion",
                    ]
                    if note[k] != before[k]
                ],
            }
        )
    (ROOT / "curation/full-pass/assistant-final-review.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    )
    notes = [
        json.loads(p.read_text())
        for p in sorted((ROOT / "curation/full-pass/records").glob("*.json"))
    ]
    (ROOT / "curation/editorial/full-collection.json").write_text(
        json.dumps(notes, indent=2, ensure_ascii=False) + "\n"
    )
    print(
        json.dumps({"directlyInspectedFinalWordingChecks": len(report), "savedRecords": len(notes)})
    )


if __name__ == "__main__":
    main()
