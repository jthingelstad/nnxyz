import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const root = path.resolve('dist');
const deployment = JSON.parse(
  await fs.readFile('infra/deployment.json', 'utf8'),
);
// Only published keys are proxied, to URLs built here from the manifest.
const { objects } = JSON.parse(await fs.readFile('data/media.json', 'utf8'));
const published = new Map(
  Object.keys(objects).map((key) => [
    `/${key}`,
    new URL(key, deployment.productionUrl).href,
  ]),
);
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};
const server = createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(
      new URL(req.url, 'http://localhost').pathname,
    );
    // Media is never part of the build; the pages reference published URLs.
    const mediaUrl = published.get(name);
    if (mediaUrl) {
      const media = await fetch(mediaUrl);
      res
        .writeHead(media.status, {
          'content-type':
            media.headers.get('content-type') || 'application/octet-stream',
        })
        .end(Buffer.from(await media.arrayBuffer()));
      return;
    }
    const target = path.resolve(
      root,
      '.' + name + (name.endsWith('/') ? 'index.html' : ''),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const body = await fs.readFile(target);
    res
      .writeHead(200, {
        'content-type':
          mime[path.extname(target)] || 'application/octet-stream',
      })
      .end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
function run(script, env) {
  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}
try {
  process.exitCode = await run('tools/check-gallery.mjs', {
    GALLERY_TEST_URL: origin,
  });
  if (process.exitCode === 0)
    process.exitCode = await run(
      'experiments/virtual-visit/verify-playback.mjs',
      {
        VISIT_TEST_URL: origin + '/visit/#room=rawblocks--rb-coda',
      },
    );
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
