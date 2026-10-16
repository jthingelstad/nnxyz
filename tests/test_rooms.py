"""The locked structure and the gallery text that the site renders."""

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REWRITE = ROOT / "curation/exhibitions/rewrite"
STRUCTURE = ROOT / "curation/exhibitions/structure"


def read(path):
    return json.loads(path.read_text())


class RoomTests(unittest.TestCase):
    def setUp(self):
        self.wings = read(REWRITE / "wings.json")["wings"]
        self.rooms = {p.stem: read(p) for p in REWRITE.glob("*--*.json")}
        self.gallery = read(ROOT / "data/gallery.json")
        self.abstract = read(ROOT / "data/abstract.json")["artworks"]
        self.onchain = read(ROOT / "data/onchain.json")["artworks"]

    def room_ids(self):
        for wing in self.wings:
            if "parts" in wing:
                for part in wing["parts"]:
                    for key in part["roomOrder"]:
                        yield f"{wing['collectionId']}--{part['key']}--{key}", wing, key
            else:
                for key in wing["roomOrder"]:
                    yield f"{wing['collectionId']}--{key}", wing, key

    def test_every_room_in_the_wing_order_has_text_and_follows_the_structure(self):
        ids = list(self.room_ids())
        self.assertEqual(sorted(i for i, _, _ in ids), sorted(self.rooms))
        for room_id, wing, key in ids:
            structure = read(STRUCTURE / f"{wing['collectionId']}.json")
            galleries = structure.get("galleries") or [
                g for part in structure["parts"] for g in part["galleries"]
            ]
            locked = next(g for g in galleries if g["key"] == key)
            written = [w for c in self.rooms[room_id]["chapters"] for w in c["works"]]
            self.assertEqual(
                [w["artworkId"] for w in written],
                [w["artworkId"] for w in locked["works"]],
                room_id,
            )
            size = len(written)
            if not locked.get("isCoda"):
                self.assertTrue(20 <= size <= 30, f"{room_id}: {size} works")

    def test_every_work_hangs_once_and_gm_is_the_only_related_item(self):
        hung = [
            w["artworkId"]
            for room in self.rooms.values()
            for c in room["chapters"]
            for w in c["works"]
        ]
        self.assertEqual(len(hung), len(set(hung)))
        owned = (
            {w["inkId"] for w in self.gallery}
            | {w["id"] for w in self.abstract}
            | {w["id"] for w in self.onchain}
        )
        related = [r for room in self.rooms.values() for r in room.get("relatedItems", [])]
        self.assertEqual([r["title"] for r in related], ["GM"])
        self.assertEqual(set(hung) | {related[0]["artworkId"]}, owned)
        self.assertNotIn(related[0]["artworkId"], hung)

    def test_every_work_has_a_caption_reading_and_utc_facts(self):
        for room in self.rooms.values():
            for work in [w for c in room["chapters"] for w in c["works"]] + room.get(
                "relatedItems", []
            ):
                self.assertTrue(work["caption"] and work["reading"], work["artworkId"])
                self.assertLessEqual(len(work["caption"].split()), 22)
                recorded = work["facts"]["recordedAt"]
                if room["collectionId"] == "abstract":
                    self.assertIsNone(recorded)
                elif room["collectionId"] == "after-nifty-ink":
                    # Mint instants are known for some chains only; null is allowed.
                    if recorded:
                        self.assertTrue(recorded.endswith("Z"), work["artworkId"])
                        self.assertEqual(work["facts"]["recordedDate"], recorded[:10])
                else:
                    self.assertTrue(recorded and recorded.endswith("Z"), work["artworkId"])
                    self.assertEqual(work["facts"]["recordedDate"], recorded[:10])

    def test_the_text_is_unsigned_and_uses_utc(self):
        # The curation is unsigned (no "AI curator") and dates are UTC. Since
        # October 16, 2026 the collector may be named in room text, so that is
        # no longer checked here.
        for room in self.rooms.values():
            text = json.dumps(
                {
                    k: v
                    for k, v in room.items()
                    if k not in ("method", "voice", "collectorDecisions")
                }
            ).lower()
            for phrase in ("ai curator", "chicago", "central time"):
                self.assertNotIn(phrase, text, f"{room['id']}: {phrase}")


if __name__ == "__main__":
    unittest.main()
