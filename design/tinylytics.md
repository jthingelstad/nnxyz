# Tinylytics integration

Recorded October 13, 2026 for `https://nnxyz.thingelstad.xyz`.
Status: implemented. Production analytics and per-artwork kudos are live, gated by `PUBLIC_TINYLYTICS_ENABLED=true` and the production hostname. The notes below are the original plan, with the embed updated on November 2, 2026.

## Collector-supplied embed

```html
<script defer src="https://tinylytics.app/js/script.js" data-site="7MaUUztU7BVzhcxntCUh"></script>
```

Since November 2, 2026 Tinylytics serves one script for every site, keyed by `data-site`; the tag takes no query parameters. Widgets and options (custom kudos, events) are set in the site's Tinylytics settings, not in the URL. The site ID is a public browser identifier, not an API credential. Preserve it in the eventual site configuration. The configured domain in Tinylytics has not been independently verified.

## Planned implementation

Load one script in the shared production layout. Keep it disabled in local development and review previews. `src/layouts/Layout.astro` creates the element on the production host only, sets `defer`, `src = 'https://tinylytics.app/js/script.js'` and `dataset.site = '7MaUUztU7BVzhcxntCUh'`, and appends it. The script counts document loads and also `pushState`, `replaceState` (when the address other than its hash changes), `popstate` and `turbo:load` by itself. A router that changes the page without touching history calls `window.tinylytics?.triggerUpdate()`, which also draws widgets for newly added elements.

Custom kudos controls and interaction events were first enabled with `?kudos=custom&events` on the old per-site embed URL; they are now the site's Tinylytics settings.

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
