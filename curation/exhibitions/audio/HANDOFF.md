# Audio tour: handoff for a local session on the Mac

Paste the prompt below into a Claude Code session running in this repository
on the Mac, where the local `.env` holds the OpenAI key. The cloud sessions
cannot read that file. Do the voice sampling first and stop for the
collector's choice before generating anything at scale.

---

## Prompt

Work in the `nnxyz` repository on branch `curation-voice-pilot`. Commit and
push only to that branch; never merge, push to main or open a pull request.
Read `AGENTS.md`, `curation/exhibitions/HANDOFF.md`, this file and
`curation/voice/style-guide.md` first.

The gallery text is final and the site renders it from
`curation/exhibitions/rewrite/*--*.json`. Each file carries `tour.segments`:
an ordered list of `{kind, artworkId?, secondArtworkId?, text?, treatment?,
holdSeconds?}` for one room. Segments with `text` are spoken; a `work` segment
with no text holds its work on screen in silence. There are 28 rooms and about
34,000 spoken words. The job is to turn those segments into audio with OpenAI
text to speech, in two stages.

The OpenAI key is in the local `.env` at the repository root. Load it from
there into the environment; never print it, copy it, or commit it or `.env`.
The key expires about seven days after October 15, 2026.

### Stage 1: sample voices, then stop

1. Pick three segments that show the range of the voice: the first
   introduction paragraph of Black Silhouettes
   (`rewrite/nnotb--p1--silhouettes.json`), one `label` segment from the same
   room, and that room's `closing`.
2. Apply the spoken forms before synthesis (see "Spoken text" below) so the
   samples say "n n x y z" and "number forty-nine" the way the tour will.
3. Render each of the three in every current OpenAI TTS voice using the
   `gpt-4o-mini-tts` model with this instruction, and once more with
   `tts-1-hd` for the two or three voices that sound best: "A museum audio
   guide. Calm, unhurried, warm but neutral. Plain delivery with natural
   pauses at full stops. No enthusiasm, no emphasis on adjectives." Check the
   current voice list in the OpenAI docs rather than assuming it.
4. Save the files under the ignored folder `media/audio-samples/<model>/<voice>/`
   and write `media/audio-samples/index.html`, one row per voice with the three
   players side by side and the model noted, so the collector can listen in
   one page. Do not commit audio.
5. Report the cost of the samples and stop. The collector listens and names a
   voice and model. Record the choice in `curation/voice/voice.json`:
   `{ "model", "voice", "instructions", "chosenBy": "collector",
   "chosenAt": "<UTC date>", "note": "<anything the collector said>" }`.
   Commit that file.

Before stage 2, the three `proposed` entries in
`curation/voice/pronunciation.json` need the collector's yes or no. Ask with
the samples.

### Stage 2: generate every segment

1. Write `tools/build-audio-tour.mjs`. For every rewrite file in wing and
   room order (`rewrite/wings.json` gives the order), for every segment with
   text, synthesize one MP3 with the chosen model, voice and instructions.
   Output key: `audio/<roomId>/<nn>-<kind>[-<short>].mp3`, where `nn` is the
   segment index padded to two digits and `short` is the work's short title
   made file safe (for example `audio/nnotb--p1--beams/05-work-73.mp3`).
   Render into the ignored `media/` folder, as the other media generators do.
2. Spoken text: start from the segment text and apply
   `curation/voice/pronunciation.json` as whole-word replacements, longest
   written form first. Then apply the number rule: a title such as `#49`
   becomes `number 49`, `#0000` becomes `number zero zero zero zero`, and a
   title like `#1 fork` becomes `number 1 fork`. Leave every other word as
   written. Save the exact spoken text for each segment in the manifest so it
   can be reviewed and so a changed segment is regenerated.
3. Manifest: `curation/exhibitions/audio/manifest.json`, one entry per
   segment with `roomId`, `index`, `kind`, `artworkId`, `secondArtworkId`,
   `key`, `spokenText`, `spokenTextSHA256`, `model`, `voice`,
   `instructionsSHA256`, `durationSeconds`, `bytes`, `fileSHA256`,
   `generatedAt` (UTC) and the response's request id as the receipt. The
   build is idempotent: a segment whose `spokenTextSHA256`, model and voice
   already match an entry with a file on disk or in `data/media.json` is
   skipped. Commit the manifest; it is the record of what was made.
4. Measure durations with `ffprobe` or by decoding the file; do not estimate.
   Report total minutes per room and in all, and the total cost.
5. Publish through the write-once media pipeline, not by hand: add `audio/`
   to `mediaPrefixes` in `tools/delivery-plan.mjs` and to `MEDIA_PREFIXES`
   in `tools/validate-site.py`, then run `npm run media:publish`, which
   uploads only missing keys and records every SHA-256 in `data/media.json`.
   A regenerated segment is a new key (bump a version in the file name),
   never an overwrite. Commit `data/media.json` and the tool changes.
6. Run `npm run lint`, `npm run format:check`, `npm test` and
   `python3 tools/validate-site.py` after `npm run build`. Push.

What not to do: no audio in git, no key in git, no live Tinylytics, no
changes to the gallery text itself (if a segment needs a spoken-form fix, add
it to `pronunciation.json` rather than editing the room file), and no model
names in commit messages.

The tour player on the site is separate work and will be built in the cloud
once the manifest and `data/media.json` carry the audio keys.
