# Gallery implementation baseline

The collector approved building the October 13 v2 concepts as the baseline. Active references: `concepts/2026-10-13-v2/collection-desktop.png`, `artwork-desktop.png`, and `artwork-mobile.png`.

Use Astro and TypeScript for static artwork pages with a small client-side viewer. No cloud service or live curator inference is required. The saved curation catalog is the source of labels and relationships.

Tokens: pure white `#fff`, primary `#171717`, secondary `#555`, quiet controls `#777`; Helvetica Neue, Helvetica, Arial, sans-serif, regular weight. Desktop collection gutter 4vw, three equal columns with 2vw gaps. Grid labels 16px; collection navigation 16px; desktop header navigation 15px. Mobile artwork title 18px, reading 13px, header wordmark 16px. On the artwork page, centered full square artwork, approximately 61% of a square desktop concept width, then one playback row, modest label and curator paragraph. No dividing rules, cards, rail or shadows. On mobile, 7% gutters, art before the title, vertical text flow and the same quiet controls. Icons: small outlined heart, triangle play, simple arrows/reset/enlarge, current text color.

Initial gallery order reproduces the six artwork references in the concept, followed by the remainder of the owned catalog. Collection filters have stable URLs and work without client JavaScript. Artwork routes use drawing CIDs. The collection introduction appears lower down and on About; its first-person copy is an edited draft of the collector response.

Continuous replay reveals one SVG brush path progressively while preserving completed paths and hiding future paths. No original timestamps exist: use reconstructed path-length pacing. Default to finished artwork, start only on visitor request, and expose pause, seek, speed and reset. Respect reduced motion for optional effects. Built-in browser fullscreen is the baseline enlargement experience; PixiJS flourishes remain a later refinement.

Tinylytics loads only when explicitly enabled for production and the browser hostname matches the public domain. Preview kudos controls explain that kudos become available on the published gallery. No fake counts or production traffic during QA.

Implementation/QA evidence is recorded in `qa-baseline.md`. Source artwork and curation records remain immutable.

Full artwork pages use SVG for every drawing. Dense works above 12,000 points use the archived PNG as browsing thumbnails; native vectors total about 1.5 GiB. This preserves accurate full artwork while preventing enormous gallery grid downloads. SVG HTTP compression is required when choosing production hosting.

October 13 theme extension: collector requested a visitor-switchable dark mode. Shared header offers Dark/Light with moon/sun icons; default white, optional pure black with light neutral text. Save the explicit preference locally and apply it before first paint. Browser storage failure must not block switching. Theme changes do not recolor artwork, reset replay or alter downloads. White drawing canvases remain beneath translucent/unpainted strokes; fullscreen/dialog surrounds follow the selected theme.
