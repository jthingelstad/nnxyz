import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def module(filename, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


VERIFY = module("verify-abstract.py", "verify_abstract")
RESTORE = module("restore-abstract.py", "restore_abstract")


class AbstractRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / "data/abstract.json").read_text())
        self.editorial = json.loads((ROOT / "curation/abstract/editorial.json").read_text())
        self.exhibitions = json.loads((ROOT / "curation/abstract/exhibitions.json").read_text())

    def test_saved_records_cover_distinct_polygon_tokens_and_three_bounded_exhibitions(self):
        VERIFY.validate_records(self.data, self.editorial, self.exhibitions)

    def test_repeated_title_cannot_replace_token_identity(self):
        self.data["artworks"][1]["id"] = self.data["artworks"][0]["id"]
        with self.assertRaisesRegex(ValueError, "distinct token"):
            VERIFY.validate_records(self.data, self.editorial, self.exhibitions)

    def test_invented_replay_data_and_chain_verified_ownership_are_rejected(self):
        for field, value in [
            ("drawingData", "strokes.json"),
            ("ownershipEvidence", "chain-verified"),
        ]:
            data = copy.deepcopy(self.data)
            data["artworks"][0][field] = value
            with self.assertRaisesRegex(ValueError, "Unsupported"):
                VERIFY.validate_records(data, self.editorial, self.exhibitions)

    def test_changed_image_review_basis_is_rejected(self):
        self.editorial["records"][0]["imageReviewEvidence"]["sourceImageSHA256"] = "changed"
        with self.assertRaisesRegex(ValueError, "Image review source"):
            VERIFY.validate_records(self.data, self.editorial, self.exhibitions)

    def test_repeated_exhibition_home_is_rejected(self):
        gallery = self.exhibitions["collections"][0]["galleries"][0]
        gallery["chapters"][0]["stops"].append(copy.deepcopy(gallery["chapters"][0]["stops"][0]))
        with self.assertRaisesRegex(ValueError, "Repeated primary home"):
            VERIFY.validate_records(self.data, self.editorial, self.exhibitions)

    def test_restore_refuses_to_overwrite_changed_originals(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / "collection/recovered-abstract/image.jpg"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"changed original")
            expected = b"original"
            entry = {
                "path": str(target.relative_to(root)),
                "bytes": len(expected),
                "sha256": hashlib.sha256(expected).hexdigest(),
                "url": "https://files.thingelstad.com/art/nnxyz/abstract/image.jpg",
            }
            with self.assertRaisesRegex(ValueError, "differs"):
                RESTORE.restore_file(entry, root)
            self.assertEqual(target.read_bytes(), b"changed original")

    def test_restore_rejects_paths_outside_recovered_collection(self):
        with tempfile.TemporaryDirectory() as directory:
            entry = {
                "path": "collection/recovered-abstract/../../outside.jpg",
                "url": "https://files.thingelstad.com/image.jpg",
            }
            with self.assertRaisesRegex(ValueError, "Unsafe"):
                RESTORE.restore_file(entry, Path(directory))
