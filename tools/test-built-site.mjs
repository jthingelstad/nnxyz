import { createServer } from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { isMediaKey } from './delivery-plan.mjs';
const root = path.resolve('dist');
const deployment = JSON.parse(
  await fs.readFile('infra/deployment.json', 'utf8'),
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
    if (isMediaKey(name.slice(1))) {
      const published = await fetch(new URL(name, deployment.deliveryUrl));
      res
        .writeHead(published.status, {
          'content-type':
            published.headers.get('content-type') || 'application/octet-stream',
        })
        .end(Buffer.from(await published.arrayBuffer()));
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
const child = spawn(process.execPath, ['tools/check-gallery.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GALLERY_TEST_URL: `http://127.0.0.1:${server.address().port}`,
  },
});
try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
