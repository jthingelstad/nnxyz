"""Coverage regressions from the one-time exhibition planning pass."""

import copy
import hashlib
import importlib.util
import json
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools/build-exhibition-review.py"
SPEC = importlib.util.spec_from_file_location("exhibition_review", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
try:
    from PIL import Image
except ImportError:
    Image = None


def fixture(count=2):
    works = {
        f"drawing-{i}": {"collectionId": "faces", "name": "Repeated title"} for i in range(count)
    }
    data = {
        "allWorksLink": False,
        "collections": [
            {
                "id": "faces",
                "galleries": [
                    {
                        "id": "faces-example",
                        "chapters": [{"stops": [{"artworkId": cid} for cid in works]}],
                    }
                ],
            }
        ],
    }
    return data, works


class ExhibitionCoverageTests(unittest.TestCase):
    def test_saved_exhibitions_cover_the_owned_subset_once(self):
        root = SCRIPT.parents[1]
        data = json.loads((root / "curation/exhibitions/map.json").read_text())
        works = {
            work["inkId"]: work for work in json.loads((root / "data/gallery.json").read_text())
        }
        MODULE.validate_home_assignments(data, works)

    def test_presentation_corrections_match_the_preserved_source(self):
        root = SCRIPT.parents[1]
        source = root / "curation/exhibitions/map.json"
        data = json.loads(source.read_text())
        changes = json.loads((root / "curation/exhibitions/presentation.json").read_text())
        self.assertEqual(
            changes["sourceMapSHA256"], hashlib.sha256(source.read_bytes()).hexdigest()
        )
        galleries = {g["id"]: g for c in data["collections"] for g in c["galleries"]}
        for change in changes["chapterCorrections"]:
            chapter = galleries[change["galleryId"]]["chapters"][change["chapterIndex"]]
            self.assertEqual(change["original"], chapter["introduction"])
            self.assertEqual(len(chapter["stops"]), 1)

    @unittest.skipIf(Image is None, "Pillow is required for the review-sheet fidelity check")
    def test_alpha_uses_white_canvas_and_keeps_source_pixels(self):
        source = Image.new("RGBA", (3, 1))
        source.putdata([(0, 0, 0, 0), (255, 0, 0, 128), (0, 0, 0, 255)])
        original = source.tobytes()
        displayed = MODULE.white_canvas_image(source)
        self.assertEqual(
            [displayed.getpixel((i, 0)) for i in range(3)],
            [(255, 255, 255), (255, 127, 127), (0, 0, 0)],
        )
        self.assertEqual(source.tobytes(), original)

    def test_repeated_names_remain_distinct_drawings(self):
        data, works = fixture()
        MODULE.validate_home_assignments(data, works)

    def test_missing_home_is_rejected(self):
        data, works = fixture()
        data["collections"][0]["galleries"][0]["chapters"][0]["stops"].pop()
        with self.assertRaisesRegex(AssertionError, "Missing primary home"):
            MODULE.validate_home_assignments(data, works)

    def test_duplicate_home_is_rejected(self):
        data, works = fixture()
        duplicate = copy.deepcopy(data["collections"][0]["galleries"][0])
        duplicate["id"] = "second-room"
        data["collections"][0]["galleries"].append(duplicate)
        with self.assertRaisesRegex(AssertionError, "Repeated primary home"):
            MODULE.validate_home_assignments(data, works)

    def test_thirty_is_allowed_and_thirty_one_is_rejected(self):
        MODULE.validate_home_assignments(*fixture(30))
        with self.assertRaisesRegex(AssertionError, "ceiling"):
            MODULE.validate_home_assignments(*fixture(31))

    def test_other_artist_is_not_absorbed_into_faces(self):
        data, works = fixture()
        works["drawing-1"]["collectionId"] = "scrimshaw"
        with self.assertRaisesRegex(AssertionError, "Cross-collection home"):
            MODULE.validate_home_assignments(data, works)

    def test_all_works_entrance_is_rejected(self):
        data, works = fixture()
        data["allWorksLink"] = True
        with self.assertRaises(AssertionError):
            MODULE.validate_home_assignments(data, works)


if __name__ == "__main__":
    unittest.main()
