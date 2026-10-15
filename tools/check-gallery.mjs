import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { checkAbstract } from './check-abstract.mjs';
import { checkProvenance } from './check-provenance.mjs';

const base = process.env.GALLERY_TEST_URL || 'http://127.0.0.1:4321';
const output = '/tmp/nnxyz-gallery-qa';
await fs.mkdir(output, { recursive: true });
const catalog = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1672, height: 941 },
});
const page = await context.newPage();
const errors = [],
  requests = [],
  results = [];
page.on('pageerror', (error) => errors.push(String(error)));
// Astro's redirect pages carry no icon link, so Chromium asks for
// /favicon.ico there; that request is harmless and not a page error.
const ignorable = (msg) => msg.location().url.endsWith('/favicon.ico');
page.on('console', (msg) => {
  if (msg.type() === 'error' && !ignorable(msg)) errors.push(msg.text());
});
page.on('request', (request) => {
  if (request.url().includes('tinylytics.app')) requests.push(request.url());
});
const face = 'QmbM9pwfyX86HxXetyVZkBKJ7WTLE7BNeVVkc7TkUeSCA5';
// Rooms come from the locked structure's gallery text, in wing and room order.
const wingsFile = JSON.parse(
  await fs.readFile('curation/exhibitions/rewrite/wings.json', 'utf8'),
);
const roomOrder = wingsFile.wings.flatMap((wing) =>
  wing.parts
    ? wing.parts.flatMap((part) =>
        part.roomOrder.map(
          (key) => `${wing.collectionId}--${part.key}--${key}`,
        ),
      )
    : wing.roomOrder.map((key) => `${wing.collectionId}--${key}`),
);
const rooms = await Promise.all(
  roomOrder.map(async (id) =>
    JSON.parse(
      await fs.readFile(`curation/exhibitions/rewrite/${id}.json`, 'utf8'),
    ),
  ),
);
const roomWorks = (room) => room.chapters.flatMap((chapter) => chapter.works);
const firstGallery = rooms[0];
const galleryURL = `/galleries/${firstGallery.id}/`;
async function go(url) {
  await page.goto(base + url);
  await page.locator('main').waitFor();
  if (page.url().includes('/galleries/'))
    await page.waitForFunction(() =>
      Boolean(
        document.querySelector('[data-exhibition]')?.dataset.currentChapter,
      ),
    );
}
async function waitChapter(value) {
  await page.waitForFunction(
    (value) =>
      document.querySelector('[data-exhibition]').dataset.currentChapter ===
      value,
    value,
  );
}
async function waitArt() {
  await page.locator('.finished-art').evaluate((img) => img.decode());
}
async function paintScreenshot() {
  const box = await page.locator('.art-stage').boundingBox();
  // Fractional layout bounds include a row of surrounding gallery pixels in an
  // element screenshot. Compare only the drawing canvas, with an integer clip.
  return page.screenshot({
    clip: {
      x: Math.ceil(box.x) + 1,
      y: Math.ceil(box.y) + 1,
      width: Math.floor(box.width) - 2,
      height: Math.floor(box.height) - 2,
    },
  });
}
async function seek(fraction) {
  const slider = page.locator('[data-seek]');
  const box = await slider.boundingBox();
  await slider.click({
    position: {
      x: Math.max(8, Math.min(box.width - 8, 8 + fraction * (box.width - 16))),
      y: box.height / 2,
    },
  });
  await page.waitForFunction(
    () =>
      document.querySelector('[data-viewer]').dataset.progress !== undefined,
  );
}
try {
  results.push(await checkProvenance(browser, base, output));
  results.push(await checkAbstract(browser, base, output));
  await go('/');
  assert.equal(await page.locator('h1').textContent(), 'A collection of nnxyz');
  assert.equal(
    await page
      .locator('h1')
      .evaluate((element) => getComputedStyle(element).color),
    'rgb(72, 72, 72)',
  );
  assert.equal(await page.locator('.collection-entrance').count(), 5);
  assert.equal(
    await page.getByRole('link', { name: /^All works$/i }).count(),
    0,
  );
  assert.equal(await page.locator('.art-card').count(), 0);
  await waitArt();
  await page.waitForFunction(
    () => Number(document.querySelector('[data-viewer]').dataset.progress) > 0,
  );
  await page.locator('[data-speed]').selectOption('4');
  await page.waitForFunction(
    () => document.querySelector('[data-viewer]').dataset.progress === '1',
    null,
    { timeout: 40000 },
  );
  await page.waitForTimeout(1500);
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-progress'),
    '1',
    'Opening replay must hold its finished image',
  );
  await page.waitForFunction(
    () => Number(document.querySelector('[data-viewer]').dataset.progress) < 1,
  );
  await page
    .getByRole('button', { name: 'Pause drawing', exact: true })
    .click();
  const openingProgress = await page
    .locator('[data-viewer]')
    .getAttribute('data-progress');
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-progress'),
    openingProgress,
  );
  await page.locator('[data-seek]').press('End');
  await page.locator('[data-speed]').selectOption('1');
  await page.locator('[data-seek]').blur();
  await page.screenshot({
    path: path.join(output, 'entrance-desktop.png'),
    fullPage: true,
  });
  results.push({
    check:
      'Five collection entrances, no global grid, real automatic replay and manual pause',
    passed: true,
  });
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page
    .getByRole('button', { name: 'Use dark background', exact: true })
    .press('Enter');
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    'rgb(0, 0, 0)',
  );
  await page.screenshot({
    path: path.join(output, 'entrance-dark-desktop.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Use light background', exact: true })
    .click();
  for (const [id, count] of [
    ['nifty-faces', 6],
    ['nnotb', 13],
    ['rawblocks', 4],
    ['other-related', 3],
    ['abstract', 2],
  ]) {
    await go(`/collections/${id}/`);
    assert.equal(await page.locator('.exhibition-entrance').count(), count);
    assert.equal(await page.locator('.art-card').count(), 0);
  }
  for (const id of ['nnxyz-other', 'scrimshaw']) {
    await go(`/collections/${id}/`);
    await page.waitForURL(`**/collections/other-related/#${id}`);
  }
  const relatedGallery = rooms.find((room) =>
    roomWorks(room).some(
      (work) =>
        catalog.find((item) => item.inkId === work.artworkId)?.artistName ===
        'scrimshaw.eth',
    ),
  );
  await go(`/galleries/${relatedGallery.id}/`);
  assert.ok(
    (await page
      .locator('.exhibition-artist', { hasText: 'scrimshaw' })
      .count()) > 0,
  );
  await go('/collections/nifty-faces/');
  await page.screenshot({
    path: path.join(output, 'faces-wing-desktop.png'),
    fullPage: true,
  });
  results.push({
    check: 'Five wings and separate related artists lead to all 28 rooms',
    passed: true,
  });
  const firstCount = roomWorks(firstGallery).length;
  const chapters = firstGallery.chapters.length;
  await page.locator('.exhibition-entrance').first().click();
  await waitChapter('1');
  assert.ok(page.url().endsWith(galleryURL));
  assert.equal(await page.locator('.exhibition-work').count(), firstCount);
  assert.equal(
    await page.locator('.watch-work, .exhibition-artist').count(),
    0,
  );
  assert.equal(
    await page.locator('.exhibition-work figcaption h3 a').count(),
    firstCount,
  );
  assert.equal(
    await page
      .locator('.exhibition-chapter:not([hidden]) .exhibition-work')
      .count(),
    firstGallery.chapters[0].works.length,
  );
  assert.equal(await page.locator('.chapter-nav a').count(), chapters);
  await page
    .locator('.exhibition-solo img')
    .first()
    .evaluate((img) => img.decode());
  await page.screenshot({
    path: path.join(output, 'first-gallery-desktop.png'),
    fullPage: true,
  });
  await page.locator('.chapter-nav a').nth(1).press('Enter');
  await waitChapter('2');
  assert.equal(
    await page
      .locator('[data-exhibition]')
      .getAttribute('data-current-chapter'),
    '2',
  );
  assert.equal(await page.locator('details, summary').count(), 0);
  assert.ok(
    await page
      .locator('#chapter-2 .exhibition-work figcaption p')
      .first()
      .isVisible(),
  );
  const chosen = firstGallery.chapters[1].works[0].artworkId;
  await page.locator('#chapter-2 .exhibition-art').first().click();
  assert.ok(page.url().endsWith(`/artworks/${chosen}/`));
  assert.equal(
    await page.locator('link[rel=canonical]').getAttribute('href'),
    `https://nnxyz.thingelstad.xyz/artworks/${chosen}/`,
  );
  assert.equal(
    await page.locator('.back-link').getAttribute('href'),
    `${galleryURL}#work-${chosen}`,
  );
  await page.locator('.back-link').click();
  await waitChapter('2');
  assert.equal(
    await page.evaluate(
      () => document.activeElement.closest('.exhibition-work')?.id,
    ),
    `work-${chosen}`,
  );
  assert.equal(
    await page
      .locator('[data-exhibition]')
      .getAttribute('data-current-chapter'),
    '2',
  );
  await page.reload();
  await waitChapter('2');
  assert.equal(
    await page
      .locator('[data-exhibition]')
      .getAttribute('data-current-chapter'),
    '2',
  );
  await page.locator('.chapter-nav a').last().click();
  await waitChapter(String(chapters));
  await page
    .locator(`#chapter-${chapters} .chapter-pagination a`)
    .last()
    .click();
  await waitChapter('closing');
  assert.equal(
    await page
      .locator('[data-exhibition]')
      .getAttribute('data-current-chapter'),
    'closing',
  );
  await page
    .getByRole('link', { name: 'Return to the first chapter', exact: true })
    .click();
  await waitChapter('1');
  assert.equal(
    await page
      .locator('[data-exhibition]')
      .getAttribute('data-current-chapter'),
    '1',
  );
  results.push({
    check:
      'Keyboard chapter navigation, visible interpretation, canonical artwork, precise return, reload and closing',
    passed: true,
  });
  // Every room preserves membership, chapter bounds and the locked order; a
  // related item hangs after the room and is not counted in it.
  for (const room of rooms) {
    await go(`/galleries/${room.id}/`);
    const works = roomWorks(room);
    assert.equal(
      await page.locator('.exhibition-work:not(.related-item)').count(),
      works.length,
    );
    assert.equal(
      await page.locator('.exhibition-work.related-item').count(),
      room.relatedItems.length,
    );
    assert.ok(works.length <= 30);
    assert.deepEqual(
      await page
        .locator('.exhibition-work:not(.related-item)')
        .evaluateAll((items) => items.map((item) => item.id)),
      works.map((work) => `work-${work.artworkId}`),
    );
    assert.equal(
      await page.locator('.exhibition-chapter:not([hidden])').count(),
      1,
    );
  }
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJS.newPage();
  await staticPage.goto(base + galleryURL);
  assert.equal(
    await staticPage.locator('.exhibition-work:visible').count(),
    firstCount,
  );
  await noJS.close();
  results.push({
    check:
      'All galleries retain exact curated order and work without JavaScript',
    passed: true,
  });
  // Audio tour: the button appears with the script, the first segment plays,
  // skipping brings the stop's work on screen, pause holds, Escape ends it.
  await go(galleryURL);
  const tourButton = page.locator('[data-tour-start]');
  assert.ok(await tourButton.isVisible());
  assert.match(await tourButton.textContent(), /about \d+ min/);
  await tourButton.click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-tour-player]')?.dataset.tourState ===
      'playing',
  );
  await page.waitForFunction(
    () => document.querySelector('[data-tour-audio]').currentTime > 0.5,
  );
  const firstStop = JSON.parse(
    await page.locator('[data-tour-stops]').textContent(),
  );
  assert.equal(firstStop.length, firstGallery.tour.segments.length);
  const firstWorkStop = firstStop.findIndex((stop) => stop.artworkId);
  for (let i = 0; i < firstWorkStop; i++)
    await page.locator('[data-tour-next]').click();
  await page.waitForFunction(
    (id) =>
      document.getElementById(`work-${id}`)?.classList.contains('tour-current'),
    firstStop[firstWorkStop].artworkId,
  );
  await page.locator('[data-tour-toggle]').click();
  assert.equal(
    await page.locator('[data-tour-player]').getAttribute('data-tour-state'),
    'paused',
  );
  const held = await page.evaluate(
    () => document.querySelector('[data-tour-audio]').currentTime,
  );
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(
      () => document.querySelector('[data-tour-audio]').currentTime,
    ),
    held,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await page.locator('[data-tour-player]').getAttribute('data-tour-state'),
    'idle',
  );
  assert.ok(await tourButton.isVisible());
  results.push({
    check: 'Audio tour plays, follows the stop, pauses and ends',
    passed: true,
  });
  // Screen saver: works load, the overlay names the work, keys step and pause.
  await go('/screensaver/');
  await page.waitForFunction(() =>
    Boolean(document.querySelector('[data-saver]')?.dataset.current),
  );
  const saverCount = (
    await (await page.request.get(base + '/screensaver/data.json')).json()
  ).works.length;
  assert.equal(saverCount, catalog.length + 52);
  assert.ok((await page.locator('[data-caption]').textContent()).length > 10);
  const firstShown = await page
    .locator('[data-saver]')
    .getAttribute('data-current');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(
    (id) => document.querySelector('[data-saver]').dataset.current !== id,
    firstShown,
  );
  await page.keyboard.press(' ');
  assert.equal(
    await page.locator('[data-saver]').getAttribute('data-playing'),
    'false',
  );
  assert.ok(
    (await page.locator('[data-title-link]').getAttribute('href')).startsWith(
      '/artworks/',
    ),
  );
  // A hash-only navigation keeps the page; the saver reselects on hashchange.
  const roomContext = `${wingsFile.wings[0].title} · ${firstGallery.title}`;
  await go(`/screensaver/#room=${firstGallery.id}`);
  await page.waitForFunction(
    (text) => document.querySelector('[data-context]')?.textContent === text,
    roomContext,
  );
  await page.reload();
  await page.waitForFunction(
    (text) => document.querySelector('[data-context]')?.textContent === text,
    roomContext,
  );
  results.push({
    check:
      'Screen saver rotates every work with captions, pauses and limits to a room',
    passed: true,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [443, 887],
    [768, 1024],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      '/',
      '/collections/nifty-faces/',
      '/collections/nnotb/',
      '/collections/rawblocks/',
      '/collections/other-related/',
      '/map/',
      '/screensaver/',
      galleryURL,
    ]) {
      await go(route);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${route} overflows at ${width}`,
      );
    }
    if (width === 390) {
      await go(`${galleryURL}#chapter-${chapters}`);
      await waitChapter(String(chapters));
      const activeChapterVisible = await page
        .locator('.chapter-nav a[aria-current]')
        .evaluate((link) => {
          const item = link.getBoundingClientRect();
          const nav = link.parentElement.getBoundingClientRect();
          return item.left >= nav.left - 1 && item.right <= nav.right + 1;
        });
      assert.ok(activeChapterVisible, 'The active phone chapter stays in view');
      await go(galleryURL);
      await page.screenshot({
        path: path.join(output, 'first-gallery-mobile.png'),
        fullPage: true,
      });
      await go('/');
      await waitArt();
      await page.screenshot({
        path: path.join(output, 'entrance-mobile.png'),
        fullPage: true,
      });
    }
    results.push({
      check: 'Responsive white museum surfaces',
      viewport: [width, height],
      passed: true,
    });
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1254, height: 1254 });
  await go(`/artworks/${face}/`);
  await waitArt();
  await page.screenshot({ path: path.join(output, 'artwork-desktop.png') });
  await page
    .getByRole('button', { name: 'Enlarge', exact: true })
    .press('Enter');
  await page.waitForFunction(() => Boolean(document.fullscreenElement));
  await page
    .getByRole('button', { name: 'Exit fullscreen', exact: true })
    .click();
  await page.waitForFunction(() => !document.fullscreenElement);
  const before = await page.locator('.art-stage').screenshot();
  await page
    .getByRole('button', { name: 'Watch drawing', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Pause drawing', exact: true })
    .waitFor();
  await page.waitForTimeout(300);
  const firstOffset = await page
    .locator('[stroke-dashoffset]')
    .first()
    .getAttribute('stroke-dashoffset');
  await page.waitForTimeout(100);
  const nextOffset = await page
    .locator('[stroke-dashoffset]')
    .first()
    .getAttribute('stroke-dashoffset');
  assert.notEqual(
    firstOffset,
    nextOffset,
    'Brush path must change within a stroke',
  );
  await page
    .getByRole('button', { name: 'Pause drawing', exact: true })
    .click();
  const paused = await page
    .locator('[data-viewer]')
    .getAttribute('data-progress');
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-progress'),
    paused,
  );
  await seek(0.5);
  assert.ok(
    Math.abs(
      Number(
        await page.locator('[data-viewer]').getAttribute('data-progress'),
      ) - 0.5,
    ) < 0.04,
  );
  await page.locator('[data-speed]').selectOption('4');
  await page.screenshot({ path: path.join(output, 'drawing-midway.png') });
  await page.locator('[data-seek]').press('End');
  await page.waitForFunction(
    () => !document.querySelector('[data-viewer]').hasAttribute('data-active'),
  );
  assert.equal(await page.locator('[stroke-dashoffset]').count(), 0);
  const after = await page.locator('.art-stage').screenshot();
  assert.ok(
    before.equals(after),
    'Completed playback must restore exactly the same SVG still',
  );
  await page
    .getByRole('button', { name: 'Reset drawing', exact: true })
    .click();
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-progress'),
    '0',
  );
  await page.locator('[data-seek]').press('End');
  assert.ok(await page.locator('#provenance').isVisible());
  assert.equal(await page.locator('#provenance dl').isVisible(), false);
  await page.locator('#provenance summary').focus();
  await page.keyboard.press('Space');
  assert.ok(await page.locator('#provenance dl').isVisible());
  assert.ok(
    (await page.locator('#provenance').innerText()).includes(
      'Timing is reconstructed',
    ),
  );
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download SVG', exact: true }).click();
  assert.ok((await download).suggestedFilename().endsWith('.svg'));
  await page
    .getByRole('button', { name: 'Give kudos to Nifty Faces #72', exact: true })
    .click();
  await page
    .getByRole('status')
    .filter({ hasText: 'published gallery' })
    .waitFor();
  results.push({
    check:
      'Continuous replay, pause, seek, speed, reset, exact completion, provenance, SVG download, preview kudos',
    passed: true,
  });

  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [443, 887],
    [768, 1024],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await go(`/artworks/${face}/`);
    await waitArt();
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      art: document
        .querySelector('.art-stage')
        .getBoundingClientRect()
        .toJSON(),
    }));
    assert.equal(geometry.width, width);
    assert.equal(geometry.overflow, false);
    if (width === 443)
      await page.screenshot({
        path: path.join(output, 'artwork-mobile.png'),
        fullPage: true,
      });
    results.push({
      check: 'Responsive artwork',
      viewport: [width, height],
      overflow: false,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Enlarge', exact: true }).click();
  await page.waitForFunction(() =>
    Boolean(
      document.fullscreenElement || document.querySelector('dialog[open]'),
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      Boolean(
        document.fullscreenElement || document.querySelector('dialog[open]'),
      ),
    ),
  );
  await page.keyboard.press('Escape');
  await go('/');
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, 'collection-mobile.png') });
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page
    .getByRole('link', {
      name: 'Explore the collection galleries →',
      exact: true,
    })
    .click();
  assert.equal(await page.locator('.collection-entrance').count(), 5);
  await page.locator('.collection-entrance').first().click();
  await page.locator('.exhibition-entrance').first().click();
  await page.locator('#chapter-1 .exhibition-art').first().click();
  assert.ok(page.url().includes('/artworks/'));
  results.push({
    check: 'Mobile enlargement, About and collection-to-gallery navigation',
    passed: true,
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    'auto',
  );
  await go('/');
  await waitArt();
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-active'),
    null,
  );
  assert.equal(
    await page
      .getByRole('button', { name: 'Watch drawing', exact: true })
      .count(),
    1,
  );
  results.push({
    check: 'Reduced motion starts with the native still and optional playback',
    passed: true,
  });

  // Compare real canvas brush geometry with derived SVG across distinct rendering cases.
  const dense = [...catalog].sort((a, b) => b.points - a.points)[0];
  const mostStrokes = [...catalog].sort((a, b) => b.strokes - a.strokes)[0];
  const samples = [
    face,
    'QmTdPjPwTgTZWs6u25HvDsmoaAkTycNx8pY8fX3ChsqMbf',
    'Qmf3XADpBhuqtGJoqk34VhNYwPjoqCTJm7yDA3tzghcnQv',
    'QmV8UybASXWtrDbQEKHFJa8oMSLehb8PqkLKrHjQtxPycJ',
    dense.inkId,
    mostStrokes.inkId,
  ];
  await page.setViewportSize({ width: 1254, height: 1254 });
  for (const cid of samples) {
    const work = catalog.find((x) => x.inkId === cid);
    // The raw strokes live only in the private archive; site CI checks the
    // SVG against the published PNG, and the archive workflow checks both.
    const drawing = await fs
      .readFile(work.strokesPath, 'utf8')
      .then(JSON.parse, (error) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
    await go(`/artworks/${cid}/`);
    await waitArt();
    const fidelity = await page.evaluate(
      async ({ drawing, cid }) => {
        // Compare at source raster resolution. Rendering vectors straight to a tiny
        // thumbnail aliases dense brush texture differently from downsampling PNG.
        const archived = new Image();
        archived.src = `/png/${cid}.png`;
        await archived.decode();
        const size = archived.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.scale(size / (drawing?.width ?? 1), size / (drawing?.height ?? 1));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const line of drawing?.lines ?? []) {
          const points = line.points;
          if (points.length < 2) continue;
          ctx.strokeStyle = line.brushColor;
          ctx.lineWidth = line.brushRadius * 2;
          // Current Chromium drops zero-length canvas strokes. The archived PNG
          // preserves these round brush dots; reconstruct that historical behavior.
          if (points.every((p) => p.x === points[0].x && p.y === points[0].y)) {
            ctx.beginPath();
            ctx.arc(points[0].x, points[0].y, line.brushRadius, 0, Math.PI * 2);
            ctx.fillStyle = line.brushColor;
            ctx.fill();
            continue;
          }
          let p1 = points[0],
            p2 = points[1];
          ctx.moveTo(p2.x, p2.y);
          ctx.beginPath();
          for (let i = 1; i < points.length; i++) {
            ctx.quadraticCurveTo(
              p1.x,
              p1.y,
              (p1.x + p2.x) / 2,
              (p1.y + p2.y) / 2,
            );
            p1 = points[i];
            p2 = points[i + 1];
          }
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        const actual = document.createElement('canvas');
        actual.width = size;
        actual.height = size;
        const other = actual.getContext('2d', { willReadFrequently: true });
        other.fillStyle = '#fff';
        other.fillRect(0, 0, size, size);
        other.drawImage(
          document.querySelector('.finished-art'),
          0,
          0,
          size,
          size,
        );
        const a = ctx.getImageData(0, 0, size, size).data,
          b = other.getImageData(0, 0, size, size).data;
        let total = 0,
          significant = 0;
        for (let i = 0; i < a.length; i += 4) {
          let delta = 0;
          for (let c = 0; c < 3; c++) {
            const v = Math.abs(a[i + c] - b[i + c]);
            total += v;
            delta += v;
          }
          if (delta > 90) significant++;
        }
        other.clearRect(0, 0, size, size);
        other.fillStyle = '#fff';
        other.fillRect(0, 0, size, size);
        other.drawImage(archived, 0, 0, size, size);
        const png = other.getImageData(0, 0, size, size).data;
        let pngTotal = 0;
        for (let i = 0; i < b.length; i += 4)
          for (let c = 0; c < 3; c++)
            pngTotal += Math.abs(b[i + c] - png[i + c]);
        return {
          meanChannelDifference: drawing ? total / (size * size * 3) : null,
          significantPixelFraction: significant / (size * size),
          archivedPNGMeanDifference: pngTotal / (size * size * 3),
        };
      },
      { drawing, cid },
    );
    assert.ok(
      !drawing || fidelity.meanChannelDifference < 5,
      `${work.name}: vector geometry disagrees with canvas ${JSON.stringify(fidelity)}`,
    );
    assert.ok(
      fidelity.archivedPNGMeanDifference < 5,
      `${work.name}: vector rendering disagrees with archived PNG ${JSON.stringify(fidelity)}`,
    );
    await page
      .getByRole('button', { name: 'Watch drawing', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Pause drawing', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Pause drawing', exact: true })
      .click();
    await seek(0.5);
    assert.equal(await page.locator('.drawing-art path').count(), work.strokes);
    await page.locator('[data-seek]').press('End');
    await page.waitForFunction(
      () =>
        !document.querySelector('[data-viewer]').hasAttribute('data-active'),
    );
    results.push({
      check: 'SVG/canvas fidelity and replay',
      artwork: work.name,
      strokes: work.strokes,
      points: work.points,
      ...fidelity,
    });
  }
  // Theme changes affect the surrounding gallery, preserving the drawing canvas.
  await go(`/artworks/${face}/`);
  await waitArt();
  const lightArt = await paintScreenshot();
  await page
    .getByRole('button', { name: 'Use dark background', exact: true })
    .click();
  assert.ok(
    lightArt.equals(await paintScreenshot()),
    'Changing theme must not recolor paint',
  );
  await page.screenshot({
    path: path.join(output, 'artwork-dark-desktop.png'),
  });
  await page.reload();
  await waitArt();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page
    .getByRole('button', { name: 'Watch drawing', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Pause drawing', exact: true })
    .click();
  await seek(0.5);
  const progress = await page
    .locator('[data-viewer]')
    .getAttribute('data-progress');
  await page
    .getByRole('button', { name: 'Use light background', exact: true })
    .click();
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-progress'),
    progress,
  );
  await page
    .getByRole('button', { name: 'Use dark background', exact: true })
    .click();
  await page.locator('[data-seek]').press('End');
  assert.ok(
    lightArt.equals(await paintScreenshot()),
    'Dark-mode replay must restore the same artwork',
  );
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of [
      '/',
      '/collections/nifty-faces/',
      '/collections/nnotb/',
      '/collections/other-related/',
      galleryURL,
      `/artworks/${face}/`,
      '/about/',
    ]) {
      await go(route);
      assert.equal(
        await page.locator('html').getAttribute('data-theme'),
        'dark',
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`/artworks/${face}/`);
  await waitArt();
  await page.screenshot({
    path: path.join(output, 'artwork-dark-mobile.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Enlarge', exact: true }).click();
  await page.waitForFunction(() =>
    Boolean(
      document.fullscreenElement || document.querySelector('dialog[open]'),
    ),
  );
  assert.equal(
    await page.evaluate(
      () =>
        getComputedStyle(
          document.fullscreenElement || document.querySelector('dialog[open]'),
        ).backgroundColor,
    ),
    'rgb(0, 0, 0)',
  );
  await page.keyboard.press('Escape');
  // Exercise the dialog fallback on browsers without fullscreen support.
  await go(`/artworks/${face}/`);
  await waitArt();
  await page
    .locator('[data-viewer]')
    .evaluate((viewer) =>
      Object.defineProperty(viewer, 'requestFullscreen', { value: undefined }),
    );
  await page.getByRole('button', { name: 'Enlarge', exact: true }).click();
  await page.locator('dialog[open]').waitFor();
  assert.equal(
    await page
      .locator('dialog[open]')
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgb(0, 0, 0)',
  );
  await page
    .getByRole('button', { name: 'Close enlarged artwork', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Use light background', exact: true })
    .click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  results.push({
    check:
      'Persisted theme, unchanged SVG paint/replay, responsive navigation and both enlargement modes',
    passed: true,
  });
  const blockedStorage = await browser.newContext();
  await blockedStorage.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Storage blocked', 'SecurityError');
      },
    }),
  );
  const fallback = await blockedStorage.newPage();
  fallback.on('pageerror', (error) => errors.push(String(error)));
  fallback.on('console', (msg) => {
    if (msg.type() === 'error' && !ignorable(msg)) errors.push(msg.text());
  });
  fallback.on('request', (request) => {
    if (request.url().includes('tinylytics.app')) requests.push(request.url());
  });
  await fallback.goto(base + '/');
  await fallback
    .getByRole('button', { name: 'Use dark background', exact: true })
    .click();
  assert.equal(
    await fallback.locator('html').getAttribute('data-theme'),
    'dark',
  );
  await fallback
    .getByRole('button', { name: 'Use light background', exact: true })
    .click();
  assert.equal(
    await fallback.locator('html').getAttribute('data-theme'),
    'light',
  );
  await blockedStorage.close();
  results.push({
    check: 'Theme switch still works when browser storage is blocked',
    passed: true,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  // Failure path: retain the finished artwork if the separate replay request fails.
  await go(`/artworks/${face}/`);
  await waitArt();
  await page.route(`**/art/${face}.svg`, (route) => route.abort());
  await page
    .getByRole('button', { name: 'Watch drawing', exact: true })
    .click();
  await page
    .locator('[data-player-status]')
    .filter({ hasText: 'finished artwork is still available' })
    .waitFor();
  assert.equal(
    await page.locator('[data-viewer]').getAttribute('data-active'),
    null,
  );
  results.push({
    check: 'Replay network failure preserves finished artwork',
    passed: true,
  });
  await fs.writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(
      { base, results, unexpectedErrors: [], tinylyticsRequests: requests },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ output, checks: results.length, results }, null, 2),
  );
} finally {
  await browser.close();
}
