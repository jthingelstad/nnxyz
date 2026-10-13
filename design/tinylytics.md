# Tinylytics integration

Recorded October 13, 2026 for `https://nnxyz.thingelstad.xyz`.
Status: integration notes only; website implementation remains pending design review.

## Collector-supplied embed

```html
<script src="https://tinylytics.app/embed/7MaUUztU7BVzhcxntCUh.js" defer></script>
```

This is a public browser embed identifier, not an API credential. Preserve it in the eventual site configuration. The configured domain in Tinylytics has not been independently verified.

## Planned implementation

Load one script in the shared production layout. Keep it disabled in local development and review previews. The base script supports normal document navigation. If client-side navigation is introduced, consult the SPA integration and call `window.tinylytics?.triggerUpdate()` after navigation using the `spa` option.

For custom kudos controls and interaction events, the proposed production embed is:

```html
<script src="https://tinylytics.app/embed/7MaUUztU7BVzhcxntCUh.js?kudos=custom&amp;events" defer></script>
```

Every kudos button must use `class="tinylytics_kudos"` and a `data-path` matching the artwork's canonical pathname, beginning with `/`. Use the same path on cards and detail pages. Derive routes from drawing CIDs, not titles or editions. Final route shape remains to be chosen.

The custom mode supplies the count for a site-designed control. Preserve an accessible button name and visible selected/disabled state (`.did_select`). Tinylytics supports `data-private="true"` to hide counts. Count visibility remains a design decision. Do not add built-in effects or sounds by default.

Proposed click events:

| Event | Control | Value |
| --- | --- | --- |
| `drawing.play` | Visitor presses play | Drawing CID |
| `artwork.enlarge` | Visitor enlarges a work | Drawing CID |
| `file.download` | Visitor downloads an SVG | Drawing CID |
| `curation.follow` | Visitor follows a connection | Destination drawing CID |

Use `data-tinylytics-event` and `data-tinylytics-event-value` on the clicked element. A play click measures a requested interaction, not playback completion. Avoid recording every scrub movement. Event tracking is currently documented as beta. For navigation/download events, evaluate the documented `beacon` option before implementation.

Verify markup, paths and script loading locally without sending production hits or kudos. No live tracking or kudos writes were performed while preparing these notes.

## Documentation checked

- [Documentation discovery](https://tinylytics.app/llms.txt)
- [Embed the script](https://tinylytics.app/docs/getting-started/embed)
- [Kudos](https://tinylytics.app/docs/widgets/kudos)
- [Event tracking](https://tinylytics.app/docs/analytics/events)

Recheck the documentation when implementing; these notes capture the guidance read on October 13, 2026.
