# Revised concept for collector review

Status: collector approved building this concept as the local gallery baseline on October 13, 2026. The concept files retain their original generation evidence. Implementation and verification are recorded in `../../implementation.md` and `../../qa-baseline.md`.

The collector found the first concept's type out of step with the art and its layout too structured. This revision uses neutral sans-serif typography, smaller labels, fewer controls competing for attention, no dividing rules or sidebar rail, and a centered artwork on the detail page. The collection opens directly onto the artwork; the collector introduction remains available through About and can appear lower on the collection page. Moving that introduction is a proposed design choice for review.

The detail label, AI reading, collection relationships and provenance remain available below the artwork. The desktop, collection and mobile images are generated raster design references, not production artwork or functional playback. Implementation must use original assets and derived SVGs, preserve complete artwork bounds including artist-painted borders, and avoid treating image-generated brush detail as archival evidence.

## Drawing playback

Requested behavior: visibly draw each brush path progressively in recorded order. Whole-stroke appearance is not the desired playback.

Checked sample: Nifty Faces #72, drawing CID `QmbM9pwfyX86HxXetyVZkBKJ7WTLE7BNeVVkc7TkUeSCA5`, has 26 strokes with 15,283 ordered points. The decoded drawing contains width, height and lines; each line has points, brush color and radius. Points contain x and y, with no timestamps.

The existing exporter already reconstructs quadratic SVG paths. A prototype can progressively expose each path using a changing visible path length (for example, SVG dash offset), retaining earlier completed strokes and hiding future strokes. Preserve brush radius, opacity and drawing order, including background passes. Test dots, zero-length paths, large background brushes, translucent intersections and dense paths. At completion remove reveal styling and compare against the unchanged SVG still. Pause, scrubbing and speed controls should share one deterministic progress state.

Recommended pacing is based on path length with modest pauses between strokes, adjustable by the visitor. This is reconstructed playback timing, not a recording of the artist's actual speed or pauses. The next motion prototype should compare sparse and dense artworks before deciding the rendering approach; SVG remains the proposed primary medium, with PixiJS optional for surrounding effects.

SVG's dash-offset attribute is animatable: [MDN reference](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/stroke-dashoffset). This reference establishes browser capability; the images here do not validate animation performance or rendering fidelity.

Prompts and generated-source paths are preserved in `manifest.json`. Generation used the built-in image_gen tool. Source artwork bytes and the permanent archive remain unchanged.
