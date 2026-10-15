// Audio tour: one MP3 per spoken segment of every room, rendered with OpenAI
// text to speech using the voice the collector chose (curation/voice/voice.json).
//
//   node --env-file=.env tools/build-audio-tour.mjs [--dry-run] [--room <id>] [--concurrency <n>]
//
// Files go to the ignored media/audio/<roomId>/ folder and are published by
// npm run media:publish (write-once). curation/exhibitions/audio/manifest.json
// records every segment's exact spoken text, hashes, duration and request id.
// A segment whose spoken text, model and voice already match an entry with a
// file on disk or in data/media.json is skipped; a changed segment gets a new
// key with a bumped version, never an overwrite.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REWRITE = 'curation/exhibitions/rewrite';
const MANIFEST = 'curation/exhibitions/audio/manifest.json';
const MEDIA = 'media';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

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
  const key = process.env.OPENAI_API_KEY;
  if (!key && !dryRun) throw new Error('OPENAI_API_KEY is not set');

  const planned = [];
  for (const roomId of roomOrder(wings)) {
    if (only && roomId !== only) continue;
    const room = await readJson(`${REWRITE}/${roomId}.json`);
    const shorts = new Map();
    for (const chapter of room.chapters)
      for (const work of chapter.works) shorts.set(work.artworkId, work.short);
    for (const item of room.relatedItems || [])
      shorts.set(item.artworkId, item.short);
    room.tour.segments.forEach((segment, index) => {
      if (!segment.text) return;
      const text = spokenText(segment.text, pronunciation.entries);
      const spokenTextSHA256 = sha256(text);
      const old = previous.get(`${roomId}:${index}`);
      const unchanged =
        old &&
        old.spokenTextSHA256 === spokenTextSHA256 &&
        old.model === voiceConfig.model &&
        old.voice === voiceConfig.voice;
      planned.push({
        roomId,
        index,
        kind: segment.kind,
        artworkId: segment.artworkId ?? null,
        secondArtworkId: segment.secondArtworkId ?? null,
        short: shorts.get(segment.artworkId) ?? null,
        spokenText: text,
        spokenTextSHA256,
        old,
        unchanged,
      });
    });
  }

  const entries = [];
  const todo = [];
  for (const item of planned) {
    if (item.unchanged) {
      const published = item.old.key in media.objects;
      const onDisk = await fs
        .access(`${MEDIA}/${item.old.key}`)
        .then(() => true)
        .catch(() => false);
      if (published || onDisk) {
        entries.push(item.old);
        continue;
      }
    }
    const version = item.old
      ? (item.old.version ?? 1) + (item.old.key in media.objects ? 1 : 0)
      : 1;
    todo.push({ ...item, version });
  }

  if (dryRun) {
    for (const item of todo)
      console.log(
        `${segmentKey(item.roomId, item.index, item.kind, item.short, item.version)}\n  ${item.spokenText}`,
      );
    console.log(`${todo.length} segments to render, ${entries.length} kept`);
    return;
  }

  const order = new Map(planned.map((p, i) => [`${p.roomId}:${p.index}`, i]));
  // Keep entries for rooms outside a --room run untouched.
  const kept = manifest.entries.filter(
    (entry) => !order.has(`${entry.roomId}:${entry.index}`),
  );
  const made = [];
  // The manifest is rewritten after every render, so an interrupted run
  // resumes from the files already on disk.
  async function flush() {
    const all = [...entries, ...made].sort(
      (a, b) =>
        order.get(`${a.roomId}:${a.index}`) -
        order.get(`${b.roomId}:${b.index}`),
    );
    const out = {
      schemaVersion: 1,
      purpose:
        'Record of every audio tour segment rendered: spoken text, hashes, duration and request id. Keys are published write-once under audio/.',
      voiceFile: 'curation/voice/voice.json',
      pronunciationFile: 'curation/voice/pronunciation.json',
      entries: [...kept, ...all],
    };
    await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
    await fs.writeFile(MANIFEST, JSON.stringify(out, null, 2) + '\n');
    return all;
  }

  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < todo.length) {
        const item = todo[next++];
        const objectKey = segmentKey(
          item.roomId,
          item.index,
          item.kind,
          item.short,
          item.version,
        );
        const file = `${MEDIA}/${objectKey}`;
        await fs.mkdir(path.dirname(file), { recursive: true });
        const { bytes, requestId } = await synthesize(
          voiceConfig,
          item.spokenText,
          key,
        );
        await fs.writeFile(file, bytes);
        made.push({
          roomId: item.roomId,
          index: item.index,
          kind: item.kind,
          artworkId: item.artworkId,
          secondArtworkId: item.secondArtworkId,
          key: objectKey,
          version: item.version,
          spokenText: item.spokenText,
          spokenTextSHA256: item.spokenTextSHA256,
          model: voiceConfig.model,
          voice: voiceConfig.voice,
          instructionsSHA256,
          durationSeconds: durationOf(file),
          bytes: bytes.length,
          fileSHA256: sha256(bytes),
          generatedAt: new Date().toISOString(),
          requestId,
        });
        console.log(`${objectKey} ${bytes.length} bytes ${requestId}`);
        await flush();
      }
    }),
  );
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
    `${all.length} segments, ${made.length} rendered now, ${(total / 60).toFixed(1)} minutes in all`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
