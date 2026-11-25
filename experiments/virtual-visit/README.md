# Virtual visit to The nnxyz Rooms

The local site preview offers a first-person visit at `/visit/`. Double-click **Open site preview.command** on the Mac to open the gallery home page. Choose **Walk through the museum** below the collector’s welcome. The Terminal window serves the review on loopback. Control-C closes it.

## How a visitor enters

| Starting point      | Destination                               | Return       |
| ------------------- | ----------------------------------------- | ------------ |
| Collector’s welcome | Ground-floor gallery hall                 | Gallery home |
| Museum map          | Ground-floor gallery hall                 | Museum map   |
| Room introduction   | The first chapter of that room            | Room page    |
| Artwork page        | A viewing position facing that exact work | Artwork page |

A shared room link uses `/visit/#room=<room-id>`. An artwork link uses `/visit/#work=<artwork-id>`. Copies with repeated titles keep their distinct catalog IDs. Each hall presents a representative work for every room on its floor. Selecting its picture or destination label takes the visitor into that room. The map inside the visit shows the walking plan and the actual doorways from the current room.

## The building and its collection

The walking plan retains the museum’s three floors and neighboring rooms. Its narrow rooms widen to a short dimension of at least 16.5 metres, with a 13-metre end wall for the two landscapes. Splayed corners carry the art around the perimeter in chapter order. A visitor can cross directly between any two door approaches. The ribbed gallery halls present room previews along a terrazzo promenade.

Three rooms hang drawings roughly five metres tall. In warm light, **Numbered Masks, 2022 to 2024** shows up to three at once. **Black Silhouettes** does the same under a cool sawtooth roof. Select **Next hanging** on a wall label or in the room controls to move through the original sequence. A link to an individual work brings up its hanging. **Coda: Two Landscapes** places the pair together on a folded end wall under amber light, with three doorways onward. The large stills and replays are rendered from the published vector paths, with a white drawing surface. Lighting falls on the architecture.

Each of the 574 works with recorded strokes has a drawing control on the small identification card beside its frame. The card carries the title, artist, medium and recorded year when available. Playback uses the published display SVG, the gallery’s reconstructed timing, continuous strokes, and a white drawing canvas. Several works in the same hanging can draw together. Each keeps its own pause, progress and speed. Choose a title in the playback controls to adjust it. In Coda, **Draw both landscapes** starts the pair together. Leaving the room or changing the hanging releases its replays. The 98 works in Abstract and After Nifty Ink use their stills. _GM_ hangs in its source room as a related work. The **Room audio** switch opts a visitor into opening narration once per room per visit. Entering another space stops it. The full audio tour and individual recorded work labels remain available on demand.

Walking defaults to Brisk. The pace selector offers Slow, Brisk and Fast. Hold Shift for a quicker crossing, or select visible floor to jump there. In a capable WebXR browser on a secure origin, **Enter VR** offers tracked viewing, controller teleportation, room previews, drawing plaques and 30-degree snap turns.

## Preview and release

From the repository root, install the root and experiment packages with `npm ci` and `npm ci --prefix experiments/virtual-visit`.

```sh
NNXYZ_VIRTUAL_VISIT=1 npm run dev
npm run check --prefix experiments/virtual-visit
NNXYZ_VIRTUAL_VISIT=1 npm run build
NNXYZ_VIRTUAL_VISIT=1 npm run validate:site
npm run test:ci-browser
```

The opt-in Astro build produces the visit and its entry links together. Ordinary pages carry a link. The Three.js runtime loads on the visit page. The building and curatorial metadata are static. The browser reads existing published media on demand, including the selected drawing SVG. The site build needs neither archived originals nor the offline drawing packs.

Before opening the visit publicly, walk one route on a physical phone and headset, including starting narration, turning, moving between rooms and playing a dense drawing. Review scale, label legibility, frame pacing and comfort in the hall and the three-exit Coda. After collector acceptance, install the locked runtime dependencies in site CI, enable the visit in both quality and publication builds, and use the existing verified main deployment. The site bucket, CDN, media keys and ownership records already support the feature.

For the offline edition run `npm run build --prefix experiments/virtual-visit`. Open `.build/virtual-visit/The nnxyz Rooms.html` for the hall. The same folder has direct entrances named `Coda.html`, `Numbered Masks.html` and `Black Silhouettes.html`. Keep the adjacent `drawings/` folder with them. The build checks thumbnails and display SVGs against the published SHA-256 manifest. The portable visitor loads the requested drawing packs on demand. Run `npm run check:playback --prefix experiments/virtual-visit` after building it to exercise both landscapes and check that scrubbing one changes only its wall. Listening to the recorded audio needs a connection.
