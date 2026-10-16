#!/usr/bin/env python3
"""Measure the gallery and generate explainable relationship candidates.

Requires Pillow and NumPy. Writes only curation/; source collection is read-only.
"""

from collections import Counter, defaultdict
from datetime import datetime
import hashlib
import json
from pathlib import Path
import platform
import re
from zoneinfo import ZoneInfo

import numpy as np
from PIL import Image, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "curation"
SIZE = 128
VERSION = "curation-features-v1"


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def palette(rgb, limit=6):
    if not len(rgb):
        return []
    im = Image.fromarray(rgb.reshape(1, -1, 3).astype("uint8"), "RGB")
    q = im.quantize(colors=limit, method=Image.Quantize.MEDIANCUT)
    indices = np.asarray(q).reshape(-1)
    result = []
    for index, count in Counter(indices.tolist()).most_common():
        color = np.rint(rgb[indices == index].mean(axis=0)).astype(int)
        result.append(
            {
                "hex": "#%02x%02x%02x" % tuple(color),
                "rgb": color.tolist(),
                "fraction": round(count / len(rgb), 5),
            }
        )
    return result


def node(item):
    return {"inkId": item["inkId"], "name": item["name"], "collectionId": item["collectionId"]}


def neighbors(ordered, item):
    index = next(i for i, x in enumerate(ordered) if x["inkId"] == item["inkId"])
    return {
        "position": index + 1,
        "total": len(ordered),
        "previous": node(ordered[index - 1]) if index else None,
        "next": node(ordered[index + 1]) if index + 1 < len(ordered) else None,
    }


def title_sequence(item):
    patterns = [
        (r"^nnxyz nifty faces #(\d+)(.*)$", "nifty-faces"),
        (r"^nnxyz nnotb #(\d+)(.*)$", "nnotb"),
        (r"^nnxyz rawblocks #(\d+)(.*)$", "rawblocks"),
        (r"^nnxyz #(\d+)$", "nnxyz-numbered"),
        (r"^Scrimshaw\s*(\d+)$", "scrimshaw-numbered"),
    ]
    for pattern, family in patterns:
        match = re.match(pattern, item["name"], re.I)
        if match:
            return family, int(match[1])
    return None, None


def numbered_neighbors(gallery, item):
    family, number = title_sequence(item)
    if family is None:
        return None
    peers = [e for e in gallery if title_sequence(e)[0] == family]
    ordered = sorted(peers, key=lambda e: (title_sequence(e)[1], e["name"].lower(), e["inkId"]))
    result = neighbors(ordered, item)
    result.update(
        sequenceFamily=family,
        parsedTitleNumber=number,
        basis="Title-derived order of owned works in the same numbered title family only; gaps and variants exist. This is not necessarily creation order.",
        sameNumberVariants=[
            node(e) for e in peers if e["inkId"] != item["inkId"] and title_sequence(e)[1] == number
        ],
    )
    return result


def main():
    gallery = read(ROOT / "data/gallery.json")
    feature_rows, whole_hists, foreground_hists = [], [], []
    grouped = defaultdict(list)
    for item in gallery:
        grouped[item["collectionId"]].append(item)
    for index, item in enumerate(gallery):
        source = ROOT / item["imagePath"]
        original = Image.open(source)
        rgba = original.convert("RGBA")
        matte = Image.new("RGBA", rgba.size, "white")
        matte.alpha_composite(rgba)
        rgb = np.asarray(matte.convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS))
        flat = rgb.reshape(-1, 3).astype(np.float64)
        bins = rgb.astype(int) // 32
        keys = (bins[:, :, 0] * 64 + bins[:, :, 1] * 8 + bins[:, :, 2]).reshape(-1)
        hist = np.bincount(keys, minlength=512).astype(float)
        hist /= hist.sum()
        whole_hists.append(hist)
        edge_rgb = np.concatenate([rgb[0], rgb[-1], rgb[1:-1, 0], rgb[1:-1, -1]])
        edge_bins = edge_rgb.astype(int) // 32
        edge_keys = edge_bins[:, 0] * 64 + edge_bins[:, 1] * 8 + edge_bins[:, 2]
        common, count = Counter(edge_keys.tolist()).most_common(1)[0]
        edge_share = count / len(edge_keys)
        background = None
        foreground_mask = np.ones(len(flat), dtype=bool)
        if edge_share >= 0.70:
            color = np.median(edge_rgb[edge_keys == common], axis=0)
            foreground_mask = np.linalg.norm(flat - color, axis=1) > 24
            background = {
                "rgb": np.rint(color).astype(int).tolist(),
                "hex": "#%02x%02x%02x" % tuple(np.rint(color).astype(int)),
                "borderAgreement": round(edge_share, 5),
                "pixelFractionEstimate": round(1 - float(foreground_mask.mean()), 5),
                "method": "Heuristic uniform-border color; may also remove similar interior colors.",
            }
        foreground = flat[foreground_mask]
        foreground_hist = np.bincount(keys[foreground_mask], minlength=512).astype(float)
        foreground_valid = len(foreground) >= SIZE * SIZE * 0.01
        if foreground_valid:
            foreground_hist /= foreground_hist.sum()
        else:
            foreground_hist = hist.copy()
        foreground_hists.append(foreground_hist)
        luminance = (flat @ np.array([0.2126, 0.7152, 0.0722])).reshape(SIZE, SIZE)
        # A reproducible raster edge proxy, not a judgment of artistic complexity.
        dx = np.abs(np.diff(luminance, axis=1))
        dy = np.abs(np.diff(luminance, axis=0))
        edge_fraction = float(
            (np.count_nonzero(dx > 20) + np.count_nonzero(dy > 20)) / (dx.size + dy.size)
        )
        drawing_path = ROOT / item["strokesPath"]
        raw = drawing_path.read_bytes()
        drawing = json.loads(raw)
        lines = drawing["lines"]
        assert len(lines) == item["strokes"]
        assert sum(len(line["points"]) for line in lines) == item["points"]
        assert drawing["width"] == item["width"] and drawing["height"] == item["height"]
        background_count = sum(line.get("background") is True for line in lines)
        reference_count = sum(line.get("ref") is True for line in lines)
        marked = sum(line.get("background") is True or line.get("ref") is True for line in lines)
        lengths, radii = [], []
        for line in lines:
            if line.get("background") is True or line.get("ref") is True:
                continue
            points = np.array([(p["x"], p["y"]) for p in line["points"]], dtype=float)
            length = (
                float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())
                if len(points) > 1
                else 0.0
            )
            lengths.append(length)
            radii.append(line["brushRadius"])
        peers = grouped[item["collectionId"]]
        values = sorted(e["strokes"] for e in peers)
        lower = sum(v < item["strokes"] for v in values)
        equal = sum(v == item["strokes"] for v in values)
        percentile = 100 * (lower + 0.5 * equal) / len(values)
        row = {
            "inkId": item["inkId"],
            "name": item["name"],
            "collectionId": item["collectionId"],
            "createdAt": item["createdAt"],
            "recordedCreationCentralTime": datetime.fromtimestamp(
                int(item["createdAt"]), ZoneInfo("America/Chicago")
            ).isoformat(),
            "recordedStrokes": len(lines),
            "backgroundFlaggedStrokes": background_count,
            "referenceFlaggedStrokes": reference_count,
            "nonHelperStrokes": len(lines) - marked,
            "sampledPoints": item["points"],
            "logicalCanvas": {"width": item["width"], "height": item["height"]},
            "pngPixels": {"width": original.width, "height": original.height},
            "strokeCountPercentileWithinCollection": round(percentile, 2),
            "paletteWholeImage": palette(flat),
            "backgroundEstimate": background,
            "paletteWithEstimatedBackgroundRemoved": palette(foreground)
            if foreground_valid
            else [],
            "rasterEdgeFraction": round(edge_fraction, 5),
            "medianNonHelperBrushRadius": round(float(np.median(radii)), 5) if radii else None,
            "normalizedSampledPolylineLength": round(
                sum(lengths) / min(item["width"], item["height"]), 5
            ),
            "imageSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "strokesSHA256": hashlib.sha256(raw).hexdigest(),
            "methodVersion": VERSION,
        }
        feature_rows.append(row)
        if (index + 1) % 100 == 0:
            print("Measured", index + 1, "of", len(gallery), flush=True)
    features = {e["inkId"]: e for e in feature_rows}
    whole = np.sqrt(np.stack(whole_hists))
    foreground = np.sqrt(np.stack(foreground_hists))
    distance_whole = np.sqrt(np.maximum(0, 1 - whole @ whole.T))
    distance_foreground = np.sqrt(np.maximum(0, 1 - foreground @ foreground.T))
    relationships = []
    for i, item in enumerate(gallery):
        peers = grouped[item["collectionId"]]
        dated = sorted(peers, key=lambda e: (int(e["createdAt"]), e["inkId"]))
        number_order = numbered_neighbors(gallery, item)
        count_neighbors = sorted(
            (e for e in gallery if e["inkId"] != item["inkId"]),
            key=lambda e: (abs(np.log1p(e["strokes"]) - np.log1p(item["strokes"])), e["inkId"]),
        )[:3]
        count_matches = [
            node(e)
            | {
                "recordedStrokes": e["strokes"],
                "absoluteDifference": abs(e["strokes"] - item["strokes"]),
                "basis": "Similar recorded stroke count; background/reference passes are included. This does not imply visual similarity or equal time/effort.",
            }
            for e in count_neighbors
        ]
        matches = []
        for metric, distances in [
            ("whole-palette", distance_whole),
            ("background-adjusted-palette", distance_foreground),
        ]:
            candidates = [j for j in np.argsort(distances[i]).tolist() if j != i][:3]
            matches.append(
                {
                    "method": metric,
                    "candidates": [
                        node(gallery[j])
                        | {
                            "distance": round(float(distances[i, j]), 5),
                            "basis": "Visible-color histogram proximity at 128×128; ignores subject and composition.",
                        }
                        for j in candidates
                    ],
                }
            )
        relationships.append(
            {
                "inkId": item["inkId"],
                "numberedOwnedNeighbors": number_order,
                "recordedCreationNeighbors": neighbors(dated, item),
                "strokeCountCandidates": count_matches,
                "paletteCandidates": matches,
            }
        )
    summary = {
        "methodVersion": VERSION,
        "generatedAtCentralTime": datetime.now(ZoneInfo("America/Chicago")).isoformat(),
        "measuredArtworks": len(gallery),
        "totalRecordedStrokes": sum(e["recordedStrokes"] for e in feature_rows),
        "totalSampledPoints": sum(e["sampledPoints"] for e in feature_rows),
        "uniformBorderBackgroundCandidates": sum(
            e["backgroundEstimate"] is not None for e in feature_rows
        ),
        "runtime": {
            "python": platform.python_version(),
            "pillow": pillow_version,
            "numpy": np.__version__,
        },
        "methods": {
            "raster": "PNG composited on white, resampled to 128×128 with Lanczos; RGB histogram 8 bins/channel; Hellinger distance.",
            "palette": "Median-cut 6-color quantization, reported weighted RGB means; not artist-chosen paint-color counts.",
            "background": "Remove RGB pixels within Euclidean distance 24 of the modal border-bin median when at least 70% of border samples agree. Experimental heuristic, not semantic segmentation.",
            "strokePercentile": "Midrank within imported collection; includes all recorded lines.",
            "trajectory": "Sum of point-to-point polyline distances excluding explicitly marked background/ref passes, divided by smaller logical canvas dimension; not smoothed SVG length or creation time.",
            "edge": "Share of adjacent 128px luminance samples differing by more than 20; a display-scale texture proxy, not artistic quality.",
        },
        "limitations": [
            "Palette similarities are candidate links requiring visual/editorial review.",
            "Background removal may suppress meaningful interior colors or frames.",
            "No per-point timestamps: duration, speed and effort cannot be recovered.",
            "Sequence describes owned works, not a complete artist catalogue.",
            "Metadata creation dates are recorded ink creation, not necessarily when the artist finished painting.",
        ],
    }
    summary["collections"] = {}
    for key, peers in grouped.items():
        rows = [features[e["inkId"]] for e in peers]
        summary["collections"][key] = {
            "count": len(rows),
            "minRecordedStrokes": min(e["recordedStrokes"] for e in rows),
            "medianRecordedStrokes": float(np.median([e["recordedStrokes"] for e in rows])),
            "maxRecordedStrokes": max(e["recordedStrokes"] for e in rows),
            "firstRecordedCreation": min(e["recordedCreationCentralTime"] for e in rows),
            "lastRecordedCreation": max(e["recordedCreationCentralTime"] for e in rows),
        }
    write(OUT / "features.json", feature_rows)
    write(OUT / "relationship-candidates.json", relationships)
    write(OUT / "measurement-summary.json", summary)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
