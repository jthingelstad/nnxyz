#!/usr/bin/env python3
"""Measure how each Nifty Ink drawing was built from its archived strokes.

Reads the ordered stroke record (react-canvas-draw `lines`) of every Nifty Ink
work in data/gallery.json and writes per-work measures and collection
summaries under curation/analysis/strokes/. Everything here is computed from
the record; nothing is a judgment of quality, effort or elapsed time. The
archive stores no per-point timing, so "sequence" means stroke order, and
"session" means works grouped by their recorded creation timestamps.

Method strokes-v1. Rasterization happens on a 160x160 grid for coverage and
overpainting only; geometry measures use the recorded coordinates.
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import math
import pathlib
import re
import statistics

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
METHOD = "strokes-v1"
GRID = 160
DECILES = 10


def parse_color(color: str):
    m = re.fullmatch(r"rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)", color)
    if m:
        r, g, b, a = (float(x) for x in m.groups())
        return (round(r), round(g), round(b)), a
    m = re.fullmatch(r"rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)", color)
    if m:
        r, g, b = (float(x) for x in m.groups())
        return (round(r), round(g), round(b)), 1.0
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", color)
    if m:
        h = m.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)), 1.0
    m = re.fullmatch(r"#([0-9a-fA-F]{3})", color)
    if m:
        h = m.group(1)
        return (int(h[0] * 2, 16), int(h[1] * 2, 16), int(h[2] * 2, 16)), 1.0
    return None, 1.0


def luminance(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def polyline_length(points):
    total = 0.0
    for a, b in zip(points, points[1:]):
        total += math.hypot(b["x"] - a["x"], b["y"] - a["y"])
    return total


def decile_of(index, count):
    return min(DECILES - 1, index * DECILES // max(1, count))


def measure(drawing: dict) -> dict:
    width = float(drawing["width"])
    height = float(drawing["height"])
    all_lines = [line for line in drawing["lines"] if line.get("points")]
    short = min(width, height) or 1.0
    scale = GRID / max(width, height)

    # Helper passes: the board records the canvas background as one giant brush
    # stroke, and may record a reference-image pass. strokes.json flags them
    # (`background`, `ref`); a rebuilt record from SVG has no flags, so a stroke
    # at least 0.9 of the longer canvas side wide is read as a background pass.
    def is_helper(line):
        if line.get("background") is True or line.get("ref") is True:
            return True
        return float(line["brushRadius"]) * 2 >= 0.9 * max(width, height)

    helpers = [line for line in all_lines if is_helper(line)]
    lines = [line for line in all_lines if not is_helper(line)]
    n = len(lines)
    ground = None
    for line in helpers:
        rgb, a = parse_color(str(line.get("brushColor", "")))
        if rgb is not None and ground is None:
            ground = {"rgb": list(rgb), "alpha": a, "dark": luminance(rgb) < 80}

    painted = Image.new("1", (GRID, GRID), 0)
    painted_draw = ImageDraw.Draw(painted)
    canvas_pixels = GRID * GRID

    coverage_by_decile = [0.0] * DECILES
    width_by_decile = [[] for _ in range(DECILES)]
    alpha_by_decile = [[] for _ in range(DECILES)]
    length_by_decile = [[] for _ in range(DECILES)]
    palette_by_decile = [0] * DECILES
    overpaint_by_decile = [[] for _ in range(DECILES)]
    dark_by_decile = [[] for _ in range(DECILES)]

    widths, alphas, lengths, points_per_stroke = [], [], [], []
    colors_seen: dict = {}
    overpaint_shares = []
    first_stroke = None
    translucent = 0
    dots = 0
    edge_ink = 0
    total_ink_points = 0
    sum_x = sum_y = 0.0

    for index, line in enumerate(lines):
        pts = line["points"]
        d = decile_of(index, n)
        w = float(line["brushRadius"]) * 2
        rgb, a = parse_color(str(line.get("brushColor", "")))
        length = polyline_length(pts) / short
        widths.append(w / short)
        alphas.append(a)
        lengths.append(length)
        points_per_stroke.append(len(pts))
        width_by_decile[d].append(w / short)
        alpha_by_decile[d].append(a)
        length_by_decile[d].append(length)
        if a < 0.999:
            translucent += 1
        if len(pts) == 1 or length == 0:
            dots += 1
        key = (rgb, round(a, 2))
        if key not in colors_seen:
            colors_seen[key] = index
        palette_by_decile[d] = len(colors_seen)
        if rgb is not None:
            dark_by_decile[d].append(luminance(rgb) < 80)
        for p in pts:
            total_ink_points += 1
            sum_x += p["x"]
            sum_y += p["y"]
            if (
                p["x"] < width * 0.08
                or p["x"] > width * 0.92
                or p["y"] < height * 0.08
                or p["y"] > height * 0.92
            ):
                edge_ink += 1

        # raster pass: this stroke alone, then compare with what was painted
        mask = Image.new("1", (GRID, GRID), 0)
        md = ImageDraw.Draw(mask)
        pw = max(1, round(w * scale))
        xy = [(p["x"] * scale, p["y"] * scale) for p in pts]
        if len(xy) == 1:
            x, y = xy[0]
            md.ellipse([x - pw / 2, y - pw / 2, x + pw / 2, y + pw / 2], fill=1)
        else:
            md.line(xy, fill=1, width=pw, joint="curve")
            for x, y in (xy[0], xy[-1]):
                md.ellipse([x - pw / 2, y - pw / 2, x + pw / 2, y + pw / 2], fill=1)
        stroke_pixels = mask.getbbox() and sum(1 for v in mask.getdata() if v)
        if stroke_pixels:
            already = sum(1 for m, p in zip(mask.getdata(), painted.getdata()) if m and p)
            share = already / stroke_pixels
        else:
            share = 0.0
        overpaint_shares.append(share)
        overpaint_by_decile[d].append(share)
        if index == 0:
            first_stroke = {
                "coverageShare": (stroke_pixels or 0) / canvas_pixels,
                "width": w / short,
                "length": length,
                "alpha": a,
                "dark": bool(rgb is not None and luminance(rgb) < 80),
            }
        painted_draw.bitmap((0, 0), mask, fill=1)
        coverage_by_decile[d] = sum(1 for v in painted.getdata() if v) / canvas_pixels

    # fill deciles that received no stroke with the running coverage
    running = 0.0
    for i in range(DECILES):
        if coverage_by_decile[i] == 0.0 and i > 0:
            coverage_by_decile[i] = running
        running = coverage_by_decile[i]

    def med(xs):
        return statistics.median(xs) if xs else None

    def mean(xs):
        return sum(xs) / len(xs) if xs else None

    return {
        "recordedStrokes": len(all_lines),
        "helperStrokes": len(helpers),
        "ground": ground,
        "strokes": n,
        "points": sum(points_per_stroke),
        "dots": dots,
        "translucentStrokes": translucent,
        "distinctColors": len(colors_seen),
        "paletteEntrySequence": sorted(colors_seen.values()),
        "width": {"min": min(widths), "median": med(widths), "max": max(widths)}
        if widths
        else None,
        "lengthMedian": med(lengths),
        "finalCoverage": coverage_by_decile[-1],
        "firstStroke": first_stroke,
        "inkCentroid": [sum_x / total_ink_points / width, sum_y / total_ink_points / height]
        if total_ink_points
        else None,
        "edgeInkShare": edge_ink / total_ink_points if total_ink_points else None,
        "overpaintMean": mean(overpaint_shares),
        "buriedStrokes": sum(1 for s in overpaint_shares if s > 0.9),
        "deciles": {
            "coverage": coverage_by_decile,
            "widthMedian": [med(x) for x in width_by_decile],
            "alphaMean": [mean(x) for x in alpha_by_decile],
            "lengthMedian": [med(x) for x in length_by_decile],
            "paletteSize": palette_by_decile,
            "overpaintMean": [mean(x) for x in overpaint_by_decile],
            "darkShare": [mean([1.0 if v else 0.0 for v in x]) for x in dark_by_decile],
        },
    }


PATH_RE = re.compile(r"<path ([^>]*?)/>")
ATTR_RE = re.compile(r'([a-zA-Z-]+)="([^"]*)"')
NUM_RE = re.compile(r"-?\d+(?:\.\d+)?(?:e-?\d+)?")


def drawing_from_svg(text: str) -> dict:
    """Rebuild the stroke record from a native SVG written by tools/export-svg.py.

    Each path is one stroke: M p0, then Q a b for consecutive point pairs, then
    L p(last). The Q control points are the recorded points in order, so the
    original point list is p0 followed by the control point of every Q after
    the first, then the final L point.
    """
    m = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', text)
    if not m:
        raise ValueError("SVG without viewBox")
    width, height = float(m.group(1)), float(m.group(2))
    lines = []
    for raw in PATH_RE.findall(text):
        attrs = dict(ATTR_RE.findall(raw))
        if "data-stroke" not in attrs:
            continue
        d = attrs["d"]
        nums = [float(x) for x in NUM_RE.findall(d)]
        cmds = re.findall(r"[MQL]", d)
        points = []
        i = 0
        first_q = True
        for c in cmds:
            if c == "M":
                points.append({"x": nums[i], "y": nums[i + 1]})
                i += 2
            elif c == "Q":
                # the control point is the recorded point; the end point is a midpoint.
                # The first Q's control point is p0, already recorded by the M.
                if first_q:
                    first_q = False
                else:
                    points.append({"x": nums[i], "y": nums[i + 1]})
                i += 4
            elif c == "L":
                points.append({"x": nums[i], "y": nums[i + 1]})
                i += 2
        # a single-point stroke is written "M x y L x y" with no Q: collapse it
        if "Q" not in cmds and len(points) == 2 and points[0] == points[1]:
            points = points[:1]
        color = attrs.get("stroke", "")
        if "stroke-opacity" in attrs and color.startswith("rgb("):
            color = "rgba(" + color[4:-1] + "," + attrs["stroke-opacity"] + ")"
        lines.append(
            {
                "points": points,
                "brushColor": color,
                "brushRadius": float(attrs["stroke-width"]) / 2,
                "_declaredPoints": int(attrs.get("data-points", "0") or 0),
            }
        )
    return {"width": width, "height": height, "lines": lines}


def sessions(items):
    by_day = collections.Counter()
    by_hour = collections.Counter()
    for item in items:
        t = dt.datetime.fromtimestamp(int(item["createdAt"]), dt.UTC)
        by_day[t.strftime("%Y-%m-%d")] += 1
        by_hour[t.hour] += 1
    days = sorted(by_day)
    streaks, run, prev = [], 0, None
    for day in days:
        d = dt.date.fromisoformat(day)
        if prev is not None and (d - prev).days == 1:
            run += 1
        else:
            if run:
                streaks.append(run)
            run = 1
        prev = d
    if run:
        streaks.append(run)
    return {
        "activeDays": len(days),
        "worksPerActiveDayMedian": statistics.median(by_day.values()) if by_day else None,
        "busiestDays": by_day.most_common(10),
        "longestStreakDays": max(streaks) if streaks else 0,
        "byUtcHour": [by_hour.get(h, 0) for h in range(24)],
        "byMonth": sorted(collections.Counter(d[:7] for d in by_day.elements()).items()),
    }


def aggregate(records):
    def col(key):
        return [r[key] for r in records if r.get(key) is not None]

    def med(xs):
        return statistics.median(xs) if xs else None

    def dec(name):
        return [
            med([r["deciles"][name][i] for r in records if r["deciles"][name][i] is not None])
            for i in range(DECILES)
        ]

    return {
        "works": len(records),
        "strokesMedian": med(col("strokes")),
        "recordedStrokesMedian": med(col("recordedStrokes")),
        "worksWithHelperPass": sum(1 for r in records if r.get("helperStrokes")),
        "darkGroundShare": (
            sum(1 for r in records if r.get("ground") and r["ground"]["dark"]) / len(records)
            if records
            else None
        ),
        "distinctColorsMedian": med(col("distinctColors")),
        "finalCoverageMedian": med(col("finalCoverage")),
        "overpaintMeanMedian": med(col("overpaintMean")),
        "translucentShareMedian": med(
            [r["translucentStrokes"] / r["strokes"] for r in records if r["strokes"]]
        ),
        "firstStrokeCoverageMedian": med(
            [r["firstStroke"]["coverageShare"] for r in records if r.get("firstStroke")]
        ),
        "firstStrokeDarkShare": (
            sum(1 for r in records if r.get("firstStroke") and r["firstStroke"]["dark"])
            / len(records)
            if records
            else None
        ),
        "groundFirstShare": (
            sum(
                1
                for r in records
                if r.get("firstStroke") and r["firstStroke"]["coverageShare"] > 0.25
            )
            / len(records)
            if records
            else None
        ),
        "decileMedians": {
            name: dec(name)
            for name in [
                "coverage",
                "widthMedian",
                "alphaMean",
                "lengthMedian",
                "paletteSize",
                "overpaintMean",
                "darkShare",
            ]
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, help="measure only the first N works (testing)")
    parser.add_argument("--out", default="curation/analysis/strokes")
    parser.add_argument(
        "--svg-dir",
        help="read strokes from native SVGs named <inkId>.svg in this folder when collection/ is not hydrated; hashes are checked against data/media.json",
    )
    args = parser.parse_args()
    media = json.loads((ROOT / "data/media.json").read_text())["objects"] if args.svg_dir else {}
    out = ROOT / args.out
    out.mkdir(parents=True, exist_ok=True)
    gallery = json.loads((ROOT / "data/gallery.json").read_text())
    items = [g for g in gallery if g.get("strokesPath") and g["artistName"] == "nnxyz"]
    if args.limit:
        items = items[: args.limit]
    per_work = []
    missing = []
    for item in items:
        path = ROOT / item["strokesPath"]
        source = "strokes.json"
        if path.exists():
            raw = path.read_bytes()
            drawing = json.loads(raw)
        elif args.svg_dir and (pathlib.Path(args.svg_dir) / f"{item['inkId']}.svg").exists():
            svg_path = pathlib.Path(args.svg_dir) / f"{item['inkId']}.svg"
            raw = svg_path.read_bytes()
            expected = media.get(f"art/{item['inkId']}.svg")
            if expected and hashlib.sha256(raw).hexdigest() != expected:
                missing.append(item["inkId"])
                continue
            drawing = drawing_from_svg(raw.decode("utf-8"))
            source = "published-svg"
            declared = sum(line["_declaredPoints"] for line in drawing["lines"])
            got = sum(len(line["points"]) for line in drawing["lines"])
            if declared and declared != got:
                raise SystemExit(f"{item['inkId']}: SVG declares {declared} points, parsed {got}")
        else:
            missing.append(item["inkId"])
            continue
        m = measure(drawing)
        m["source"] = source
        m.update(
            {
                "artworkId": item["inkId"],
                "title": item["name"],
                "collectionId": item["collectionId"],
                "recordedAt": dt.datetime.fromtimestamp(int(item["createdAt"]), dt.UTC).strftime(
                    "%Y-%m-%dT%H:%M:%SZ"
                ),
                "sourceSHA256": hashlib.sha256(raw).hexdigest(),
            }
        )
        per_work.append(m)
    per_work.sort(key=lambda r: r["recordedAt"])
    by_collection = collections.defaultdict(list)
    by_month = collections.defaultdict(list)
    for r in per_work:
        by_collection[r["collectionId"]].append(r)
        by_month[r["recordedAt"][:7]].append(r)

    # repeated titles and forks
    by_title = collections.defaultdict(list)
    for r in per_work:
        by_title[r["title"]].append(r["artworkId"])
    repeated = {t: ids for t, ids in by_title.items() if len(ids) > 1}

    summary = {
        "methodVersion": METHOD,
        "generatedAt": dt.datetime.now(dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "grid": GRID,
        "measuredWorks": len(per_work),
        "missingStrokeFiles": missing,
        "notes": [
            "Widths and lengths are divided by the shorter canvas side.",
            "Coverage and overpainting are measured on a 160x160 raster of the stroke paths with round caps; alpha is ignored for coverage.",
            "A stroke counts as buried when more than 90% of its pixels were already painted when it was laid down.",
            "firstStroke is the first drawn stroke after the helper passes; coverageShare above 0.25 is read as a large shape laid before any detail.",
            "Sessions come from recorded creation timestamps (UTC); the archive has no per-point timing.",
            "Helper passes (the recorded background fill and any reference pass) are excluded from every measure except recordedStrokes, helperStrokes and ground. From strokes.json they are the flagged lines; from a rebuilt SVG record, any stroke at least 0.9 of the longer canvas side wide.",
            "strokes is the count of drawn strokes without helper passes; recordedStrokes matches the archive and the site's stroke count.",
        ],
        "all": aggregate(per_work),
        "byCollection": {k: aggregate(v) for k, v in sorted(by_collection.items())},
        "byMonth": {k: aggregate(v) for k, v in sorted(by_month.items())},
        "sessions": {
            "all": sessions([g for g in items if g["inkId"] in {r["artworkId"] for r in per_work}]),
            "byCollection": {
                k: sessions([g for g in items if g["collectionId"] == k])
                for k in sorted(by_collection)
            },
        },
        "repeatedTitles": repeated,
    }
    (out / "measures.json").write_text(json.dumps(per_work, indent=1))
    (out / "summary.json").write_text(json.dumps(summary, indent=1))
    shown = out.relative_to(ROOT) if out.is_relative_to(ROOT) else out
    print(
        f"measured {len(per_work)} works; missing {len(missing)}; wrote {shown}/measures.json and summary.json"
    )


if __name__ == "__main__":
    main()
