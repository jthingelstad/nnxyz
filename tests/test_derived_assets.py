import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("derived", Path("tools/verify-derived-assets.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DerivedTests(unittest.TestCase):
    def fixture(self, folder):
        root = Path(folder)
        (root / "infra").mkdir()
        (root / "public/art").mkdir(parents=True)
        (root / "public/art/drawing.svg").write_text("<svg/>")
        source = root / "infra/dataset.json"
        source.write_text("source snapshot identity")
        manifest = root / "infra/derived-dataset-files.json"
        manifest.write_text(
            json.dumps(
                [
                    {
                        "projectPath": "public/art/drawing.svg",
                        "sha256": module.digest(root / "public/art/drawing.svg"),
                    }
                ]
            )
        )
        config = {
            "inputHashes": {"infra/dataset.json": module.digest(source)},
            "manifestPath": "infra/derived-dataset-files.json",
            "manifestSHA256": module.digest(manifest),
            "restoredFiles": 1,
        }
        (root / "infra/derived-dataset.json").write_text(json.dumps(config))
        return root

    def test_verified_bytes_are_reused(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder)
            module.verify(root)

    def test_changed_source_snapshot_requires_new_derivative_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder)
            (root / "infra/dataset.json").write_text("a different snapshot")
            with self.assertRaisesRegex(ValueError, "inputs changed"):
                module.verify(root)

    def test_corrupt_artwork_is_rejected_instead_of_regenerated(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder)
            target = root / "public/art/drawing.svg"
            target.write_bytes(b"wrong geometry")
            with self.assertRaisesRegex(ValueError, "changed derived asset"):
                module.verify(root)
            self.assertEqual(target.read_bytes(), b"wrong geometry")

    def test_tampered_manifest_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.fixture(folder)
            (root / "infra/derived-dataset-files.json").write_text("[]")
            with self.assertRaisesRegex(ValueError, "manifest checksum mismatch"):
                module.verify(root)


if __name__ == "__main__":
    unittest.main()
