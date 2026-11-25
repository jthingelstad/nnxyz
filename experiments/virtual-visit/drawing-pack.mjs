import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import path from 'node:path';

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
// Classic scripts allow a double-clicked local visit to load just one drawing.
const prefix = 'document.currentScript.textContent="',
  suffix = '";\n';
export async function packDrawings(works, hashes, origin, output) {
  const dir = path.join(output, 'drawings');
  await mkdir(dir, { recursive: true });
  const drawings = new Map();
  for (const work of works.filter((w) => w.replay)) {
    const key = 'art/display/' + work.id + '.svg',
      hash = hashes[key];
    if (!hash) throw Error('Unpublished drawing ' + key);
    work.drawingFile = 'drawings/' + hash + '.js';
    drawings.set(hash, key);
  }
  const queue = [...drawings];
  async function pack() {
    for (;;) {
      const item = queue.pop();
      if (!item) return;
      const [hash, key] = item,
        file = path.join(dir, hash + '.js');
      try {
        const saved = await readFile(file, 'ascii');
        if (
          saved.startsWith(prefix) &&
          saved.endsWith(suffix) &&
          digest(
            gunzipSync(
              Buffer.from(saved.slice(prefix.length, -suffix.length), 'base64'),
            ),
          ) === hash
        )
          continue;
      } catch {
        /* Fetch missing or damaged packs from the immutable manifest. */
      }
      const response = await fetch(new URL(key, origin), {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw Error(key + ' HTTP ' + response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (digest(bytes) !== hash) throw Error('Drawing hash mismatch ' + key);
      await writeFile(
        file + '.tmp',
        prefix + gzipSync(bytes).toString('base64') + suffix,
      );
      await rename(file + '.tmp', file);
    }
  }
  await Promise.all(Array.from({ length: 6 }, pack));
  console.log(drawings.size + ' distinct drawing packs verified');
}
