import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("restore", Path("tools/restore-collection.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RestoreTests(unittest.TestCase):
    def fixture(self, folder, member=None):
        root = Path(folder)
        (root / "infra").mkdir()
        source = b"original source bytes"
        sha = hashlib.sha256(source).hexdigest()
        entries = [{"projectPath": f"collection/{name}", "sha256": sha} for name in ["a", "b"]]
        manifest = root / "infra/dataset-files.json"
        manifest.write_text(json.dumps(entries))
        bundle = root / "bundle.tar.gz"
        with tarfile.open(bundle, "w:gz") as archive:
            info = tarfile.TarInfo(member or "blobs/" + sha)
            info.size = len(source)
            archive.addfile(info, io.BytesIO(source))
        config = {
            "manifestPath": "infra/dataset-files.json",
            "manifestSHA256": module.digest(manifest),
            "sha256": module.digest(bundle),
        }
        (root / "infra/dataset.json").write_text(json.dumps(config))
        return root, bundle

    def test_exact_independent_copies(self):
        with tempfile.TemporaryDirectory() as folder:
            root, bundle = self.fixture(folder)
            module.restore(bundle, root)
            a, b = root / "collection/a", root / "collection/b"
            self.assertEqual(a.read_bytes(), b.read_bytes())
            self.assertNotEqual(a.stat().st_ino, b.stat().st_ino)
            a.write_bytes(b"changed")
            self.assertEqual(b.read_bytes(), b"original source bytes")

    def test_changed_existing_file_is_preserved_without_partial_restore(self):
        with tempfile.TemporaryDirectory() as folder:
            root, bundle = self.fixture(folder)
            (root / "collection").mkdir()
            (root / "collection/b").write_bytes(b"local edit")
            with self.assertRaisesRegex(ValueError, "Existing source differs"):
                module.restore(bundle, root)
            self.assertFalse((root / "collection/a").exists())
            self.assertEqual((root / "collection/b").read_bytes(), b"local edit")

    def test_unsafe_tar_path_is_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            root, bundle = self.fixture(folder, "blobs/../../outside")
            with self.assertRaisesRegex(ValueError, "Unsafe bundle entry"):
                module.restore(bundle, root)
            self.assertFalse((root / "collection").exists())

    def test_corrupt_bundle_is_refused(self):
        with tempfile.TemporaryDirectory() as folder:
            root, bundle = self.fixture(folder)
            with bundle.open("ab") as stream:
                stream.write(b"corruption")
            with self.assertRaisesRegex(ValueError, "Dataset bundle checksum mismatch"):
                module.restore(bundle, root)
            self.assertFalse((root / "collection").exists())


if __name__ == "__main__":
    unittest.main()
