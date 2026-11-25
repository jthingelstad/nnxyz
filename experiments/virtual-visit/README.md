# Virtual visit to The nnxyz Rooms

Open the generated **The nnxyz Rooms.html** in a browser. The visit starts beside the first wall in _Heads Built from Boxes_. Drag to look, use WASD to walk, or select a patch of floor to move there. The floor plan and artwork list also let you jump to a particular room or work. The help button includes the wall color switch.

Select _Nifty Faces #1_ to try a reconstructed drawing on the wall. Its display SVG supplies the paths and the gallery's timeline supplies the reconstructed timing. The pilot uses this one drawing for in-room replay. Each Nifty Ink label also links to the full artwork viewer. The audio tour uses the existing recordings, transcripts, and silent holds. You decide when to listen. Leaving the room stops playback.

An immersive-capable WebXR browser offers **Enter VR**. The headset must have access to the file in a browser context that permits immersive sessions, such as a trusted HTTPS origin. Select the floor with a tracked controller to teleport, press the thumbstick sideways to turn 30 degrees, or aim through a doorway to enter the adjoining room. The lift has a selector for each floor. Select a painting to hear its recorded work segment where available, or select the room tour plaque under the first picture. That first picture in _Heads Built from Boxes_ also has a drawing playback plaque.

## Build a portable copy

From the repository root, with the project's Node version:

```sh
npm ci --prefix experiments/virtual-visit
npm run build --prefix experiments/virtual-visit
open ".build/virtual-visit/The nnxyz Rooms.html"
```

The build reads the museum's existing floor plan, locked exhibitions, thumbnail paths and audio tour. Three.js and Vite dependencies are local to this experiment. The build fetches the published 640 px images and one display SVG, verifies their SHA-256 against the media manifest, and embeds them with the application. The finished HTML file can be moved on its own. Images and the sample replay work offline. Audio streams from the published media host. Artwork-page links open the public gallery.

Floor areas, room sequence, doorways and stair positions come from the printed map. Heights, physical scale, lighting, bench placement, a lift at the stair landing and the clockwise hanging are prototype choices. The hanging uses the primary works in the locked rooms. Related works are available at their recorded tour stops. Only nearby rooms acquire artwork textures on the GPU.

This is a local experiment outside the Astro site and its deployment. The portable file favors offline review. For a hosted version, the room textures could load on demand from the gallery's existing media paths.
