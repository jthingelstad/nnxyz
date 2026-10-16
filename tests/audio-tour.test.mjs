import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  spokenText,
  segmentKey,
  roomOrder,
  displayTitle,
  segmentTags,
  coverKey,
  MASTERING,
} from '../tools/build-audio-tour.mjs';

const pronunciation = JSON.parse(
  await fs.readFile('curation/voice/pronunciation.json', 'utf8'),
);
const wings = JSON.parse(
  await fs.readFile('curation/exhibitions/rewrite/wings.json', 'utf8'),
);

test('spoken forms replace whole words, longest first', () => {
  const say = (t) => spokenText(t, pronunciation.entries);
  assert.equal(
    say('nnxyz nnotb #49.'),
    'n n x y z New Nifty on the Block number forty-nine.',
  );
  assert.equal(say('by scrimshaw.eth and X eyes'), 'by Scrimshaw and ex eyes');
  assert.equal(say('says SCAFFOLD ETH in'), 'says Scaffold eeth in');
  assert.equal(say('Xylophone'), 'Xylophone');
});

test('number rule', () => {
  const say = (t) => spokenText(t, []);
  assert.equal(say('ends on #0000.'), 'ends on number zero zero zero zero.');
  assert.equal(say('#1 fork and #75,'), 'number 1 fork and number 75,');
  assert.equal(say('a #tag'), 'a #tag');
});

test('keys are file safe and versioned', () => {
  assert.equal(
    segmentKey('nnotb--p1--beams', 5, 'work', '#73'),
    'audio/nnotb--p1--beams/05-work-73.mp3',
  );
  assert.equal(
    segmentKey('nnotb--p1--beams', 0, 'introduction', null),
    'audio/nnotb--p1--beams/00-introduction.mp3',
  );
  assert.equal(
    segmentKey('x', 12, 'label', '#1 fork', 2),
    'audio/x/12-label-1-fork-v2.mp3',
  );
});

test('every room in wing order has a rewrite file', async () => {
  const rooms = roomOrder(wings);
  assert.equal(rooms.length, 30);
  assert.equal(rooms[0], 'nifty-faces--boxes');
  for (const room of rooms)
    await fs.access(`curation/exhibitions/rewrite/${room}.json`);
});

test('manifest entries match the rooms and carry every field', async () => {
  const manifest = JSON.parse(
    await fs.readFile('curation/exhibitions/audio/manifest.json', 'utf8'),
  );
  const media = JSON.parse(await fs.readFile('data/media.json', 'utf8'));
  const seen = new Set();
  for (const entry of manifest.entries) {
    for (const field of [
      'roomId',
      'index',
      'kind',
      'key',
      'spokenText',
      'spokenTextSHA256',
      'model',
      'voice',
      'instructionsSHA256',
      'durationSeconds',
      'bytes',
      'fileSHA256',
      'generatedAt',
      'requestId',
      'mastering',
      'coverKey',
      'tags',
      'sourceSHA256',
      'loudnessLUFS',
    ])
      assert.ok(field in entry, `${entry.key} lacks ${field}`);
    assert.ok(entry.key.startsWith('audio/'));
    assert.ok(!seen.has(entry.key), `duplicate ${entry.key}`);
    seen.add(entry.key);
    if (entry.key in media.objects)
      assert.equal(media.objects[entry.key], entry.fileSHA256);
    // Every segment is mastered the current way, and its loudness landed
    // near the -16 LUFS target.
    assert.equal(entry.mastering, MASTERING.id, `${entry.key} not mastered`);
    assert.equal(manifest.mastering.id, MASTERING.id);
    assert.ok(
      Math.abs(entry.loudnessLUFS + 16) < 2.5,
      `${entry.key} at ${entry.loudnessLUFS} LUFS`,
    );
    assert.match(entry.coverKey, /^audio\/covers\/[\w-]+\.jpg$/);
    if (entry.sourceKey)
      assert.notEqual(entry.sourceKey, entry.key, 'a source is never reused');
  }
  let expected = 0;
  for (const room of roomOrder(wings)) {
    const file = JSON.parse(
      await fs.readFile(`curation/exhibitions/rewrite/${room}.json`, 'utf8'),
    );
    if (file.tour.audioStale) {
      // Rewritten text waiting for re-recording: its old entries stay in the
      // manifest and are counted, but their spoken text is expected to differ.
      expected += manifest.entries.filter((e) => e.roomId === room).length;
      continue;
    }
    file.tour.segments.forEach((segment, index) => {
      if (!segment.text) return;
      expected++;
      const entry = manifest.entries.find(
        (e) => e.roomId === room && e.index === index,
      );
      assert.ok(entry, `${room} segment ${index} has no audio`);
      assert.equal(
        entry.spokenText,
        spokenText(segment.text, pronunciation.entries),
        `${entry.key} spoken text is stale`,
      );
    });
  }
  assert.equal(manifest.entries.length, expected);
});

test('tags read like the page', () => {
  assert.equal(displayTitle('nnxyz nifty faces #0000'), 'Nifty Faces #0000');
  assert.equal(displayTitle('nnxyzic Heaven or Hell #3'), 'Heaven or Hell #3');
  const room = { title: 'Heads Built from Boxes', tour: { segments: [1, 2] } };
  assert.deepEqual(segmentTags(room, 1, null), {
    title: 'Heads Built from Boxes',
    artist: 'nnxyz',
    album: 'The nnxyz Rooms: Heads Built from Boxes',
    track: '2/2',
  });
  assert.equal(coverKey('Qm1'), 'audio/covers/Qm1.jpg');
});
