"""The story layer: the pages under curation/story/ and the per-work facts."""

import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORY = ROOT / "curation/story"
# Only the collector is named on the site (collector's instruction, October 16,
# 2026). The names of the other members of the household never appear in the
# site source, the story pages or the curation text.
FORBIDDEN = re.compile(r"\b(Tammy|Tyler|Mazie)\b")
SITE_TEXT = [
    *STORY.glob("*.md"),
    *STORY.glob("*.json"),
    *(ROOT / "curation/exhibitions/rewrite").glob("*.json"),
    *(ROOT / "src").rglob("*.astro"),
    *(ROOT / "src").rglob("*.ts"),
    ROOT / "curation/collector-statement.json",
]


def front_matter(path):
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", path.read_text(), re.S)
    assert match, f"{path.name}: missing front matter"
    meta = {}
    for line in match.group(1).split("\n"):
        kv = re.match(r"^(\w+):\s*(.*)$", line)
        if kv and kv.group(1) != "sources":
            meta[kv.group(1)] = kv.group(2).strip()
    return meta, match.group(2)


class StoryPageTests(unittest.TestCase):
    def setUp(self):
        self.pages = sorted(p for p in STORY.glob("*.md") if p.name != "README.md")
        self.facts = json.loads((STORY / "facts.json").read_text())
        self.timeline = json.loads((STORY / "timeline-2022.json").read_text())
        self.words = json.loads((STORY / "words.json").read_text())
        self.gallery = json.loads((ROOT / "data/gallery.json").read_text())

    def test_six_pages_with_distinct_order_titles_and_summaries(self):
        self.assertEqual(len(self.pages), 6)
        orders, titles = [], []
        for path in self.pages:
            meta, body = front_matter(path)
            for key in ("title", "summary", "order"):
                self.assertTrue(meta.get(key), f"{path.name}: {key}")
            self.assertIn(meta.get("kind", "prose"), {"prose", "timeline", "words"})
            orders.append(int(meta["order"]))
            titles.append(meta["title"])
            self.assertGreater(len(body.split()), 150, f"{path.name}: too short to be a page")
        self.assertEqual(sorted(orders), list(range(1, 7)))
        self.assertEqual(len(set(titles)), 6)

    def test_timeline_page_names_every_month_once_and_the_data_has_them(self):
        page = next(p for p in self.pages if front_matter(p)[0].get("kind") == "timeline")
        months = re.findall(r"^\{\{month (\d{4}-\d{2})\}\}$", page.read_text(), re.M)
        self.assertEqual(months, [f"2022-{m:02d}" for m in range(1, 13)])
        self.assertEqual([m["month"] for m in self.timeline["months"]], months)
        for month in self.timeline["months"]:
            for event in month["events"]:
                self.assertTrue(event["date"].startswith(month["month"]))
                self.assertIn(event["who"], {"artist", "collector", "market"})
                self.assertTrue(event["source"])

    def test_facts_cover_every_owned_nifty_ink_work_and_name_only_the_collector(self):
        ids = {work["inkId"] for work in self.gallery}
        self.assertEqual(set(self.facts["works"]), ids)
        wallets = {
            record["collected"]["wallet"]
            for record in self.facts["works"].values()
            if "collected" in record
        }
        self.assertTrue(
            wallets
            <= {None, "thingelstad.eth", "nnxyz.thingelstad.eth", "niftyink.thingelstad.eth"},
            wallets,
        )
        for record in self.facts["works"].values():
            if "post" in record:
                self.assertTrue(record["post"]["url"].startswith("https://x.com/0000nnxyz/status/"))
                self.assertNotIn("http", record["post"]["printed"])
            if "collected" in record:
                self.assertTrue(record["collected"]["how"])

    def test_words_are_verbatim_posts_in_date_order(self):
        quotes = self.words["quotes"]
        self.assertEqual(len(quotes), 30)
        self.assertEqual(quotes, sorted(quotes, key=lambda q: q["postedAt"]))
        source = {
            q["id"]: q["text"]
            for q in json.loads((ROOT / "curation/research/social/quotes.json").read_text())[
                "quotes"
            ]
        }
        for quote in quotes:
            self.assertEqual(quote["text"], source[quote["id"]])
            self.assertTrue(quote["printed"])

    def test_story_works_are_placed_once_and_have_their_media(self):
        works = json.loads((STORY / "works.json").read_text())["works"]
        media = json.loads((ROOT / "data/media.json").read_text())
        placed = re.findall(
            r"^\{\{work (\w+)\}\}$",
            "\n".join(p.read_text() for p in self.pages),
            re.M,
        )
        self.assertEqual(sorted(placed), sorted(w["inkId"] for w in works))
        gallery = {w["inkId"] for w in self.gallery}
        for work in works:
            self.assertNotIn(work["inkId"], gallery)
            keys = [f"art/{work['inkId']}.svg", f"art/display/{work['inkId']}.svg"]
            keys += [f"raster/{work['inkId']}-{w}.webp" for w in media["rasterWidths"]]
            for key in keys:
                self.assertTrue(key in media["objects"], key)

    def test_no_other_family_member_is_named_anywhere_on_the_site(self):
        for path in SITE_TEXT:
            self.assertIsNone(FORBIDDEN.search(path.read_text()), path)


if __name__ == "__main__":
    unittest.main()
