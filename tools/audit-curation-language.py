#!/usr/bin/env python3
"""Find editorial review candidates; flags are questions, not quality verdicts."""

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    notes = [
        json.loads(p.read_text())
        for p in sorted((ROOT / "curation/full-pass/records").glob("*.json"))
    ]
    flags = []
    sentences = defaultdict(set)
    openings = Counter()
    opening_ids = defaultdict(list)
    patterns = {
        "intent-or-evolution": r"\b(deliberat\w*|purposeful\w*|intentional\w*|evolv\w*|carefully|the artist wanted|the artist intends|the artist sought)\b",
        "unsourced-convention": r"\b(usual|traditional|convention\w*|histor\w*|influenc\w*|inspired by|reminiscent of|masterpiece|masterful)\b",
        "named-media": r"\b(watercolou?r|oil paint|acrylic|charcoal|pastel drawing|physical paint|engraved|engraving|etched|etching)\b",
        "medical-or-cultural-identity": r"\b(schizophren\w*|psychot\w*|autistic|bipolar|van gogh|basquiat|picasso|munch)\b",
        "public-id": r"Qm[1-9A-HJ-NP-Za-km-z]{44}",
        "jargon": r"\b(centripetal|centrifugal|chromatic|liminal|semiotic|ontolog\w*)\b",
        "mouth-openness-check": r"\b(wide[ -]open|mouth forced)\b",
        "body-extent-check": r"\b(four[ -]legged|four legs|crouching animal)\b",
        "unscoped-superlative": r"\b(maximum density|most complex|most densely|the most detailed)\b",
    }
    for note in notes:
        fields = {
            "reading": note["reading"],
            "contextAngle": note["contextAngle"],
            "connections": " ".join(c["reason"] for c in note["connections"]),
            "observations": " ".join(note["observations"]),
            "tags": " ".join(note["tags"]),
        }
        for field, text in fields.items():
            for rule, pattern in patterns.items():
                matches = re.findall(pattern, text, re.I)
                if matches:
                    flags.append(
                        {
                            "artworkId": note["artworkId"],
                            "field": field,
                            "rule": rule,
                            "matches": matches,
                        }
                    )
        for sentence in re.split(r"(?<=[.!?])\s+", note["reading"]):
            if len(sentence.split()) >= 8:
                sentences[sentence.strip().lower()].add(note["artworkId"])
        opening = " ".join(note["reading"].split()[:5]).lower()
        openings[opening] += 1
        opening_ids[opening].append(note["artworkId"])
    report = {
        "recordsAudited": len(notes),
        "flags": flags,
        "repeatedReadingSentences": [
            {"text": s, "artworkIds": sorted(ids)} for s, ids in sentences.items() if len(ids) > 1
        ],
        "repeatedFiveWordOpenings": [
            {"text": s, "count": n, "artworkIds": opening_ids[s]}
            for s, n in openings.most_common()
            if n > 2
        ],
        "scope": "Text scan prioritizes review. It does not prove visual accuracy or classify an artwork.",
    }
    (ROOT / "curation/full-pass/language-audit.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "records": len(notes),
                "flaggedArtworks": len({f["artworkId"] for f in flags}),
                "repeatedSentences": len(report["repeatedReadingSentences"]),
                "repeatedOpenings": report["repeatedFiveWordOpenings"][:10],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
