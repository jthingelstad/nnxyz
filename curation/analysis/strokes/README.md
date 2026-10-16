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

## Findings, first run (October 16, 2026)

548 works measured from the published SVGs, none missing. 527 carry the
board's background pass; the 21 without one are drawn straight on the white
canvas. Medians unless stated.

**The board lays the ground; the hand starts with line.** The first drawn
stroke after the background covers almost nothing (median 0.0% of the canvas;
only 1% of works open with a stroke covering more than a quarter). nnxyz does
not block in a big shape and refine it. The drawing begins as line and the
mass accumulates.

**Broad to fine, every time.** Median stroke width falls across the sequence
from 0.022 of the canvas side in the first tenth to 0.003 in the last, and
median stroke length from 1.5 canvas sides to 0.08. The last tenth is dots
and short marks: details, highlights, the signature. Every series follows the
same curve.

**Burying is the method.** Overpainting rises from 46% in the first tenth to
98% in the last: by the midpoint nearly every new stroke lands on paint already
laid. The Faces are the most buried (mean overpainting 0.92) and reach 98%
coverage; NNOTB 0.82 and 92%; Rawblocks 0.81 and 84%; the Other works 0.80 and
83%. The square fills up in the Faces and is left to breathe later.

**Paint arrives with the portraits.** Translucent strokes are 6% of the Faces
and 19% of Rawblocks. By month, the two peaks are January 2022 (27%, the pale
winter portraits) and November 2022 (20%, the Rawblocks portraits). The
summer masks of 2022 are almost entirely opaque (4% in June).

**Dark grounds have seasons.** 40% of all grounds are dark. December 2021 is
the darkest month (69% dark), then May 2022 (57%) and January 2023 (50%).
From July 2023 on the ground is almost never dark (0 to 9% in most months).

**Density has seasons too.** Median drawn strokes per work: 338 in October
2021 (the first four, tangled), 170 in December 2021, under 100 through
January to April 2022 (the sparer faces and silhouettes), 233 in May 2022 (the
beams), 88 in September 2022 (the flat creatures), 275 in March 2023, 394 in
December 2024 (the two late masks). The palette grows steadily to a median of
20 color and alpha pairs per work.

**Sessions.** 197 drawing days over three years, a median of two works on a
working day, a longest run of ten consecutive days. The busiest days: May 25,
2022 (10 works), December 1, 2021 (9), February 9, 2022 (9), April 25, 2022
(8), November 9, 2022 (8). By UTC hour the record peaks from 19:00 to 01:00
and is quietest from 02:00 to 08:00, which is an evening practice in Central
European time, consistent with the artist's own posts placing them in Europe.

**Against the thesis.** "The ground is laid first" is true only of the board's
background pass; the drawn work opens with line, and the rooms should say so.
"Teeth come last" is not directly measured; what is measured is that the
finest, shortest marks come last, which is where white bars and highlights
live. "The mask summer is drawn by burying" is weaker than expected: the Faces
bury more than the summer masks. "Rawblocks portraits are paint with line on
top" holds. "The late masks are heavier" holds for stroke count (200 to 400
drawn strokes) but not for width; they are dense, not broad. The repeated
title in the Nifty Ink record is NNOTB #249 (two drawings).
