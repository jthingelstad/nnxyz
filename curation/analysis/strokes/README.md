# Stroke analysis: how the drawings were built

Method `strokes-v1`, `tools/analyze-strokes.py`. Phase 1 of
`design/depth-plan.md`, October 16, 2026. Everything here is computed from the
archived stroke record; nothing is a judgment of quality or effort, and
nothing is a duration, because the archive stores no timing.

## Source

The ordered stroke record of every Nifty Ink work by nnxyz in
`data/gallery.json`: 548 works. When `collection/` is hydrated the tool reads
`strokes.json` directly. In this first run the archive could not be hydrated
from the cloud session (the container's AWS key is not valid for the archive
bucket), so the tool rebuilt each record from the published native SVG under
`art/` on the site's CDN, verifying every file's SHA-256 against
`data/media.json`. The SVGs are written by `tools/export-svg.py` from the same
`strokes.json`, one path per stroke, with the recorded points as the control
points of the quadratic segments, so the rebuilt record has the same strokes,
points, widths, colors and alpha as the archive. Each record's `source` field
says which path was used; `sourceSHA256` is the hash of the file read.

## Measures per work (`measures.json`)

- `strokes`, `points`, `dots` (one-point strokes), `translucentStrokes`
  (alpha below 1), `distinctColors` (color and alpha pairs).
- `width` (min, median, max) and `lengthMedian`, both divided by the shorter
  canvas side so works of different sizes compare.
- `firstStroke`: share of the canvas it covers, its width, length, alpha and
  whether it is dark. A first stroke covering more than a quarter of the
  canvas is read as a ground laid first.
- `finalCoverage`: share of the canvas with paint on it when the drawing is
  complete.
- `overpaintMean`: for each stroke, the share of its pixels that already had
  paint when it was laid down, averaged; `buriedStrokes`: strokes more than
  90% over existing paint.
- `inkCentroid` (as a fraction of width and height) and `edgeInkShare` (share
  of recorded points within 8% of an edge).
- `paletteEntrySequence`: the stroke index at which each new color first
  appears.
- `deciles`: ten slices of the stroke order, each with coverage reached,
  median width, mean alpha, median length, palette size so far, mean
  overpainting and the share of dark strokes. This is the build order.

Coverage and overpainting are measured on a 160 by 160 raster of the stroke
paths with round caps; alpha is ignored for coverage. Geometry measures use
the recorded coordinates.

## Summaries (`summary.json`)

Medians across all works, per collection and per month, including the decile
medians, so the shape of a typical build can be read for the Faces, for
NNOTB, for Rawblocks and for the late masks. `sessions` counts works per UTC
day and hour from the recorded creation timestamps, with the busiest days and
the longest run of consecutive days. `repeatedTitles` lists titles shared by
more than one drawing, for fork comparisons.

## Reading the numbers in gallery text

A sentence may use a finding ("the black ground is laid first in every work in
this room") when the measure supports it for the works named. The number
itself stays in the details panel. Where a measure contradicts a sentence in
`curation/exhibitions/thesis.md`, the sentence changes.
