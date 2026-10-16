import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "build_display_svgs", ROOT / "tools" / "build-display-svgs.py"
)
DISPLAY = importlib.util.module_from_spec(spec)
spec.loader.exec_module(DISPLAY)

NATIVE = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 790.5 790.5">\n'
    '<g fill="none" stroke-linecap="round" stroke-linejoin="round">\n'
    '<path data-stroke="1" data-points="3" stroke="rgb(1,2,3)" '
    'stroke-opacity="0.123456789" stroke-width="12.3456789" '
    'd="M 10.004999999 -0.0049 Q 4.2082959339495574e-10 395.25 '
    '-1.50884136660423e-05 790.4999999999 L 7.75891169646492e-06 100"/>\n'
    "</g>\n</svg>\n"
)


class DisplaySvgTests(unittest.TestCase):
    def test_numbers(self):
        self.assertEqual(DISPLAY.fmt(10.004999999), "10")
        self.assertEqual(DISPLAY.fmt(790.4999999999), "790.5")
        self.assertEqual(DISPLAY.fmt(-0.0049), "0")
        self.assertEqual(DISPLAY.fmt(-1.50884136660423e-05), "0")
        self.assertEqual(DISPLAY.fmt(-12.346), "-12.35")
        self.assertEqual(DISPLAY.fmt(3.0), "3")

    def test_rounds_path_data_and_width_only(self):
        display = DISPLAY.rounded(NATIVE)
        self.assertIn('stroke-width="12.35" d="M 10 0 Q 0 395.25 0 790.5 L 0 100"', display)
        self.assertIn('stroke-opacity="0.123456789"', display)
        self.assertIn('viewBox="0 0 790.5 790.5"', display)
        self.assertIn('data-points="3"', display)
        DISPLAY.check(NATIVE, display)

    def test_idempotent(self):
        display = DISPLAY.rounded(NATIVE)
        self.assertEqual(DISPLAY.rounded(display), display)

    def test_check_rejects_a_dropped_coordinate(self):
        broken = DISPLAY.rounded(NATIVE).replace(" L 0 100", " L 0")
        with self.assertRaises(AssertionError):
            DISPLAY.check(NATIVE, broken)


if __name__ == "__main__":
    unittest.main()
