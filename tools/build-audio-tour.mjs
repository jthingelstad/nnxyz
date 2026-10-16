// Audio tour: one MP3 per spoken segment of every room, rendered with OpenAI
// text to speech using the voice the collector chose (curation/voice/voice.json)
// and then mastered (MASTERING below) with the segment's cover embedded.
//
//   node --env-file=.env tools/build-audio-tour.mjs [--dry-run] [--room <id>] [--concurrency <n>]
//
// Files go to the ignored media/audio/<roomId>/ folder and are published by
// npm run media:publish (write-once). curation/exhibitions/audio/manifest.json
// records every segment's exact spoken text, hashes, duration and request id.
// A segment whose spoken text, model, voice, mastering, cover and tags already
// match an entry with a file on disk or in data/media.json is skipped; a
// changed segment gets a new key with a bumped version, never an overwrite.
// A segment whose text is unchanged but whose mastering, cover or tags changed
// is re-mastered from its published text-to-speech source without a new
// request; only a segment with no such source is spoken again.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const REWRITE = 'curation/exhibitions/rewrite';
const MANIFEST = 'curation/exhibitions/audio/manifest.json';
const MEDIA = 'media';
const SITE = 'https://nnxyz.thingelstad.xyz';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const run = promisify(execFile);

// Mastering, applied to every segment after text to speech. Leading silence is
// trimmed to 0.1 s and trailing silence to 0.25 s (the player adds its own
// breath between stops), loudness is normalized in two passes to -16 LUFS
// with a -3 dBTP ceiling (speech peaks send most segments through loudnorm's
// limiter rather than a plain gain, and the 64 kbps encode overshoots the
// ceiling by up to 1.5 dB, so decoded peaks stay under -1 dBTP), and the
// result is encoded as 64 kbps mono
// MP3 with an Info header so a player knows the length from the first frame.
// Changing any of this needs a new id: every segment is then re-mastered
// under a new key.
export const MASTERING = {
  id: 'speech-16lufs-64k-1',
  trim: 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.25,areverse',
  loudnorm: 'loudnorm=I=-16:TP=-3:LRA=11',
  encode: ['-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k'],
};
// Covers: the work a segment is about, square on white, embedded in its MP3
// and shown on the lock screen by the site's player. Published write-once, so
// a change to the cover rendering needs a new prefix.
export const COVER_PREFIX = 'audio/covers/';
const COVER_SIZE = 480;
export const coverKey = (artworkId) => `${COVER_PREFIX}${artworkId}.jpg`;

// Mirrors displayTitle in src/lib/catalog.ts, so a file's title tag reads as
// the work's title on the page.
export function displayTitle(name) {
  return name
    .replace(/^nnxyz nifty faces/i, 'Nifty Faces')
    .replace(/^nnxyz nnotb/i, 'NNOTB')
    .replace(/^nnxyz rawblocks/i, 'Rawblocks')
    .replace(/^nnxyz abstract/i, 'Abstract')
    .replace(/^nnxyz nifty faces px/i, 'Nifty Faces px')
    .replace(/^nnxyzcccc/i, 'Chic City Cat')
    .replace(/^nnxyzic Heaven or Hell/i, 'Heaven or Hell')
    .replace(/^nnxyz foca/i, 'Friends of Country Air')
    .replace(/^nnxyz\s+shrine of - /i, 'Shrine of ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Spoken forms as whole-word replacements, longest written form first, then
// the number rule: "#49" becomes "number 49" and a zero-padded title such as
// "#0000" is read digit by digit. Every other word stays as written.
export function spokenText(text, entries) {
  let out = text;
  const ordered = [...entries].sort(
    (a, b) => b.written.length - a.written.length,
  );
  for (const entry of ordered) {
    const re = new RegExp(`(?<![\\w#])${escapeRe(entry.written)}(?!\\w)`, 'gi');
    out = out.replace(re, entry.spoken);
  }
  return out.replace(/#(\d+)/g, (_, digits) =>
    digits.startsWith('0')
      ? 'number ' +
        digits
          .split('')
          .map((c) => (c === '0' ? 'zero' : c))
          .join(' ')
      : `number ${digits}`,
  );
}

export function fileSafe(short) {
  return (short || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function segmentKey(roomId, index, kind, short, version = 1) {
  const safe = fileSafe(short);
  const suffix = version > 1 ? `-v${version}` : '';
  return `audio/${roomId}/${String(index).padStart(2, '0')}-${kind}${safe ? `-${safe}` : ''}${suffix}.mp3`;
}

export function roomOrder(wings) {
  return wings.wings.flatMap((wing) =>
    wing.parts
      ? wing.parts.flatMap((part) =>
          part.roomOrder.map(
            (room) => `${wing.collectionId}--${part.key}--${room}`,
          ),
        )
      : wing.roomOrder.map((room) => `${wing.collectionId}--${room}`),
  );
}

// The ID3 tags for one segment: each room is an album, its stops are tracks
// numbered as the player counts them, and a segment about a work is titled
// with the work.
export function segmentTags(room, index, workTitle) {
  return {
    title: workTitle ?? room.title,
    artist: 'nnxyz',
    album: `The nnxyz Rooms: ${room.title}`,
    track: `${index + 1}/${room.tour.segments.length}`,
  };
}

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const exists = (file) =>
  fs
    .access(file)
    .then(() => true)
    .catch(() => false);

async function synthesize(voiceConfig, input, key) {
  const body = {
    model: voiceConfig.model,
    voice: voiceConfig.voice,
    input,
    response_format: 'mp3',
    ...(voiceConfig.model.startsWith('gpt-4o-mini-tts')
      ? { instructions: voiceConfig.instructions }
      : {}),
  };
  for (let attempt = 1; ; attempt++) {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (response.ok)
      return {
        bytes: Buffer.from(await response.arrayBuffer()),
        requestId: response.headers.get('x-request-id'),
      };
    const text = await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < 6) {
      await new Promise((f) => setTimeout(f, 3000 * attempt));
      continue;
    }
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
}

const durationOf = (file) =>
  Number(
    execFileSync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      file,
    ])
      .toString()
      .trim(),
  );

// A published key as a local file: media/<key> if it holds the published
// bytes, otherwise downloaded from the site and checked against data/media.json.
async function published(key, media) {
  const file = `${MEDIA}/${key}`;
  const want = media.objects[key];
  if (await exists(file)) {
    if (!want || sha256(await fs.readFile(file)) === want) return file;
  }
  if (!want) throw new Error(`Not on disk or published: ${key}`);
  const response = await fetch(`${SITE}/${key}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (sha256(bytes) !== want) throw new Error(`Published bytes differ: ${key}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return file;
}

// The image a cover is made from: the drawing's PNG, or the largest published
// still of an Abstract or After Nifty Ink work.
function coverSource(artworkId, sources) {
  const kind = sources.get(artworkId);
  if (kind === 'ink') return `png/${artworkId}.png`;
  if (kind === 'abstract') return `abstract/images/${artworkId}-1200.webp`;
  if (kind === 'onchain') return `onchain/images/${artworkId}-1200.webp`;
  throw new Error(`Unknown artwork for a cover: ${artworkId}`);
}

async function buildCover(artworkId, sources, media) {
  const file = `${MEDIA}/${coverKey(artworkId)}`;
  const input = await published(coverSource(artworkId, sources), media);
  const bytes = await sharp(input, { animated: false })
    .flatten({ background: '#ffffff' })
    .resize(COVER_SIZE, COVER_SIZE, {
      fit: 'contain',
      background: '#ffffff',
    })
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  return file;
}

const lastJson = (text) =>
  JSON.parse(text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1));

// Two-pass loudnorm over the trimmed speech, then one encode with the cover
// as the attached picture. Source tags are dropped and the encoder version is
// left out, so the same inputs give the same bytes.
export async function master(source, cover, tags, out) {
  const ffmpeg = (args) =>
    run('ffmpeg', ['-hide_banner', '-nostats', ...args], {
      maxBuffer: 1 << 24,
    }).then(({ stderr }) => stderr);
  const measured = lastJson(
    await ffmpeg([
      '-i',
      source,
      '-af',
      `${MASTERING.trim},${MASTERING.loudnorm}:print_format=json`,
      '-f',
      'null',
      '-',
    ]),
  );
  const second = [
    MASTERING.loudnorm,
    'linear=true',
    `measured_I=${measured.input_i}`,
    `measured_TP=${measured.input_tp}`,
    `measured_LRA=${measured.input_lra}`,
    `measured_thresh=${measured.input_thresh}`,
    `offset=${measured.target_offset}`,
    'print_format=json',
  ].join(':');
  const result = lastJson(
    await ffmpeg([
      '-y',
      '-i',
      source,
      '-i',
      cover,
      '-map',
      '0:a',
      '-map',
      '1:v',
      '-af',
      `${MASTERING.trim},${second}`,
      ...MASTERING.encode,
      '-c:v',
      'copy',
      '-disposition:v',
      'attached_pic',
      '-metadata:s:v',
      'title=Album cover',
      '-metadata:s:v',
      'comment=Cover (front)',
      '-map_metadata',
      '-1',
      ...Object.entries(tags).flatMap(([name, value]) => [
        '-metadata',
        `${name}=${value}`,
      ]),
      '-id3v2_version',
      '3',
      '-write_xing',
      '1',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      out,
    ]),
  );
  return {
    loudnessLUFS: Number(result.output_i),
    truePeakDBTP: Number(result.output_tp),
    normalization: result.normalization_type,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const only = args.includes('--room')
    ? args[args.indexOf('--room') + 1]
    : null;
  const concurrency = args.includes('--concurrency')
    ? Number(args[args.indexOf('--concurrency') + 1])
    : 8;
  const voiceConfig = await readJson('curation/voice/voice.json');
  const pronunciation = await readJson('curation/voice/pronunciation.json');
  const wings = await readJson(`${REWRITE}/wings.json`);
  const media = await readJson('data/media.json');
  const sources = new Map([
    ...(await readJson('data/gallery.json')).map((w) => [w.inkId, 'ink']),
    ...(await readJson('data/abstract.json')).artworks.map((w) => [
      w.id,
      'abstract',
    ]),
    ...(await readJson('data/onchain.json')).artworks.map((w) => [
      w.id,
      'onchain',
    ]),
  ]);
  const instructionsSHA256 = sha256(voiceConfig.instructions);
  let manifest;
  try {
    manifest = await readJson(MANIFEST);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    manifest = { schemaVersion: 1, entries: [] };
  }
  const previous = new Map(
    manifest.entries.map((entry) => [`${entry.roomId}:${entry.index}`, entry]),
  );

  const planned = [];
  for (const roomId of roomOrder(wings)) {
    if (only && roomId !== only) continue;
    const room = await readJson(`${REWRITE}/${roomId}.json`);
    const works = new Map();
    for (const chapter of room.chapters)
      for (const work of chapter.works) works.set(work.artworkId, work);
    for (const item of room.relatedItems || []) works.set(item.artworkId, item);
    // Introductions are about the room; they carry its first work's cover.
    const roomCover = room.chapters[0].works[0].artworkId;
    room.tour.segments.forEach((segment, index) => {
      if (!segment.text) return;
      const text = spokenText(segment.text, pronunciation.entries);
      const spokenTextSHA256 = sha256(text);
      const work = works.get(segment.artworkId);
      const cover = coverKey(segment.artworkId ?? roomCover);
      const tags = segmentTags(
        room,
        index,
        work ? displayTitle(work.title) : null,
      );
      const old = previous.get(`${roomId}:${index}`);
      const spoken =
        old &&
        old.spokenTextSHA256 === spokenTextSHA256 &&
        old.model === voiceConfig.model &&
        old.voice === voiceConfig.voice;
      const unchanged =
        spoken &&
        old.mastering === MASTERING.id &&
        old.coverKey === cover &&
        JSON.stringify(old.tags) === JSON.stringify(tags);
      // The unmastered text-to-speech file this segment can be mastered from.
      const sourceKey = !spoken
        ? null
        : old.mastering
          ? (old.sourceKey ?? null)
          : old.key;
      planned.push({
        roomId,
        index,
        kind: segment.kind,
        artworkId: segment.artworkId ?? null,
        secondArtworkId: segment.secondArtworkId ?? null,
        short: work?.short ?? null,
        spokenText: text,
        spokenTextSHA256,
        coverKey: cover,
        tags,
        old,
        unchanged,
        sourceKey,
      });
    });
  }

  const entries = [];
  const todo = [];
  for (const item of planned) {
    if (item.unchanged) {
      const isPublished = item.old.key in media.objects;
      if (isPublished || (await exists(`${MEDIA}/${item.old.key}`))) {
        entries.push(item.old);
        continue;
      }
    }
    let version = item.old
      ? (item.old.version ?? 1) + (item.old.key in media.objects ? 1 : 0)
      : 1;
    // A lost manifest entry must never send a render to a published key.
    while (
      segmentKey(item.roomId, item.index, item.kind, item.short, version) in
      media.objects
    )
      version++;
    const sourceReady =
      item.sourceKey &&
      (item.sourceKey in media.objects ||
        (await exists(`${MEDIA}/${item.sourceKey}`)));
    todo.push({
      ...item,
      version,
      key: segmentKey(item.roomId, item.index, item.kind, item.short, version),
      sourceKey: sourceReady ? item.sourceKey : null,
    });
  }

  const speak = todo.filter((item) => !item.sourceKey).length;
  if (dryRun) {
    for (const item of todo)
      console.log(
        `${item.key} ${item.sourceKey ? `master from ${item.sourceKey}` : 'speak'}\n  ${item.spokenText}`,
      );
    console.log(
      `${todo.length} segments to make (${speak} to speak, ${todo.length - speak} to re-master), ${entries.length} kept`,
    );
    return;
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key && speak) throw new Error('OPENAI_API_KEY is not set');

  // Covers first: every segment waits on its cover, and a cover is shared by
  // the segments about the same work.
  const covers = new Map();
  const coverFile = (item) => {
    if (!covers.has(item.coverKey)) {
      const artworkId = item.coverKey.slice(COVER_PREFIX.length, -4);
      covers.set(
        item.coverKey,
        item.coverKey in media.objects
          ? published(item.coverKey, media)
          : exists(`${MEDIA}/${item.coverKey}`).then((ok) =>
              ok
                ? `${MEDIA}/${item.coverKey}`
                : buildCover(artworkId, sources, media),
            ),
      );
    }
    return covers.get(item.coverKey);
  };

  const order = new Map(planned.map((p, i) => [`${p.roomId}:${p.index}`, i]));
  // Keep every entry outside this run's plan, including a segment that has
  // lost its text: its key is published write-once, and keeping the entry is
  // what lets a later re-render of that index take a new version.
  const kept = manifest.entries.filter(
    (entry) => !order.has(`${entry.roomId}:${entry.index}`),
  );
  const made = [];
  // The manifest is rewritten after every render, so an interrupted run
  // resumes from the files already on disk. Writes are serialized so
  // concurrent workers never interleave on the file.
  let writing = Promise.resolve();
  function flush() {
    const result = writing.then(() => writeManifest());
    writing = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  async function writeManifest() {
    const all = [...entries, ...made].sort(
      (a, b) =>
        order.get(`${a.roomId}:${a.index}`) -
        order.get(`${b.roomId}:${b.index}`),
    );
    const out = {
      schemaVersion: 1,
      purpose:
        'Record of every audio tour segment rendered: spoken text, hashes, mastering, cover, duration and request id. Keys are published write-once under audio/.',
      voiceFile: 'curation/voice/voice.json',
      pronunciationFile: 'curation/voice/pronunciation.json',
      mastering: MASTERING,
      entries: [...kept, ...all],
    };
    await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
    await fs.writeFile(MANIFEST, JSON.stringify(out, null, 2) + '\n');
    return all;
  }

  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-tour-'));
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < todo.length) {
        const item = todo[next++];
        const file = `${MEDIA}/${item.key}`;
        await fs.mkdir(path.dirname(file), { recursive: true });
        let source;
        let spoken;
        if (item.sourceKey) {
          source = await published(item.sourceKey, media);
          spoken = {
            requestId: item.old.requestId,
            generatedAt: item.old.generatedAt,
          };
        } else {
          const { bytes, requestId } = await synthesize(
            voiceConfig,
            item.spokenText,
            key,
          );
          source = path.join(scratch, `${item.roomId}-${item.index}.mp3`);
          await fs.writeFile(source, bytes);
          spoken = { requestId, generatedAt: new Date().toISOString() };
        }
        const loudness = await master(
          source,
          await coverFile(item),
          item.tags,
          file,
        );
        const bytes = await fs.readFile(file);
        made.push({
          roomId: item.roomId,
          index: item.index,
          kind: item.kind,
          artworkId: item.artworkId,
          secondArtworkId: item.secondArtworkId,
          key: item.key,
          version: item.version,
          spokenText: item.spokenText,
          spokenTextSHA256: item.spokenTextSHA256,
          model: voiceConfig.model,
          voice: voiceConfig.voice,
          instructionsSHA256,
          sourceKey: item.sourceKey,
          sourceSHA256: sha256(await fs.readFile(source)),
          mastering: MASTERING.id,
          coverKey: item.coverKey,
          tags: item.tags,
          ...loudness,
          durationSeconds: durationOf(file),
          bytes: bytes.length,
          fileSHA256: sha256(bytes),
          generatedAt: spoken.generatedAt,
          masteredAt: new Date().toISOString(),
          requestId: spoken.requestId,
        });
        console.log(
          `${item.key} ${bytes.length} bytes ${loudness.loudnessLUFS} LUFS ${item.sourceKey ? 're-mastered' : spoken.requestId}`,
        );
        await flush();
      }
    }),
  );
  await fs.rm(scratch, { recursive: true, force: true });
  const all = await flush();

  const perRoom = new Map();
  for (const entry of all)
    perRoom.set(
      entry.roomId,
      (perRoom.get(entry.roomId) || 0) + entry.durationSeconds,
    );
  let total = 0;
  for (const [roomId, seconds] of perRoom) {
    total += seconds;
    console.log(`${roomId.padEnd(30)} ${(seconds / 60).toFixed(1)} min`);
  }
  console.log(
    `${all.length} segments, ${made.length} made now, ${(total / 60).toFixed(1)} minutes in all`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
