import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export async function checkAbstract(browser, base, output) {
  const data = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'));
  const map = JSON.parse(
    await fs.readFile('curation/abstract/exhibitions.json', 'utf8'),
  );
  const first = data.artworks.find((work) => work.number === '01');
  const artworkURL = `/artworks/${first.id}/`;
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [],
    analytics = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.url().includes('tinylytics.app')) analytics.push(request.url());
  });
  const noOverflow = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'Horizontal overflow',
    );
  try {
    await page.goto(base + '/');
    assert.equal(await page.locator('.collection-entrance').count(), 5);
    await page
      .getByRole('link', { name: /Abstract.*Explore Abstract/ })
      .click();
    assert.ok(page.url().endsWith('/collections/abstract/'));
    assert.equal(await page.locator('.exhibition-entrance').count(), 3);
    await page.getByText('Collection history', { exact: true }).click();
    assert.match(
      await page.locator('.collection-history').innerText(),
      /scrimshaw.eth/,
    );
    await page.getByText('Collection history', { exact: true }).click();
    await page.screenshot({
      path: `${output}/abstract-wing-desktop.png`,
      fullPage: true,
    });
    for (const gallery of map.collections[0].galleries) {
      await page.goto(base + `/galleries/${gallery.id}/`);
      assert.equal(await page.locator('h1').innerText(), gallery.title);
      assert.equal(
        await page.locator('.exhibition-work').count(),
        gallery.chapters.flatMap((chapter) => chapter.stops).length,
      );
      for (let i = 0; i < gallery.chapters.length; i++) {
        await page.locator('.chapter-nav a').nth(i).click();
        await page.waitForFunction(
          (chapter) =>
            document.querySelector('[data-exhibition]').dataset
              .currentChapter === String(chapter),
          i + 1,
        );
        assert.equal(
          await page.locator('[data-chapter]:visible .exhibition-work').count(),
          gallery.chapters[i].stops.length,
        );
        assert.equal(
          await page.getByText('View & watch drawing', { exact: true }).count(),
          0,
        );
        await noOverflow();
      }
      await page
        .getByRole('link', { name: 'Leave with a question', exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-exhibition]').dataset.currentChapter ===
          'closing',
      );
      assert.ok(await page.locator('[data-closing]').isVisible());
    }
    await page.goto(base + artworkURL);
    await page.locator('.raster-stage img').evaluate((img) => img.decode());
    assert.equal(
      await page.locator('[data-viewer], .player, [data-play]').count(),
      0,
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute('href'),
      `https://nnxyz.thingelstad.xyz${artworkURL}`,
    );
    await page.getByRole('button', { name: 'Enlarge', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.getByRole('dialog').isVisible());
    await page
      .locator('[data-raster-dialog] img')
      .evaluate((img) => img.decode());
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.ok(
      await page
        .getByRole('button', { name: 'Enlarge', exact: true })
        .evaluate((element) => element === document.activeElement),
    );
    await page.getByText('Details & provenance', { exact: true }).click();
    assert.match(
      await page.locator('#provenance').innerText(),
      /Polygon · chain 137/,
    );
    assert.match(
      await page.locator('#provenance').innerText(),
      /does not establish current/,
    );
    await page.getByRole('button', { name: /^Give kudos/ }).click();
    assert.ok(await page.locator('#kudos-notice').isVisible());
    const pending = page.waitForEvent('download');
    await page
      .getByRole('link', { name: 'Download original JPEG', exact: true })
      .click();
    const download = await pending;
    const original = await fs.readFile(await download.path());
    assert.equal(
      createHash('sha256').update(original).digest('hex'),
      first.imageSHA256,
    );
    for (const [name, width, height] of [
      ['desktop', 1440, 1000],
      ['tablet', 834, 1112],
      ['mobile', 390, 844],
      ['landscape', 844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      for (const theme of ['light', 'dark']) {
        await page.evaluate(
          (value) => localStorage.setItem('nnxyz-theme', value),
          theme,
        );
        for (const url of [
          '/collections/abstract/',
          '/galleries/abstract--crossing-lines/',
          artworkURL,
        ]) {
          await page.goto(base + url);
          assert.equal(
            await page.locator('html').getAttribute('data-theme'),
            theme,
          );
          await noOverflow();
          const img = page.locator('main img:visible').first();
          await img.evaluate((element) => element.decode());
          assert.ok(
            await img.evaluate(
              (element) =>
                element.naturalWidth > 0 &&
                getComputedStyle(element).filter === 'none',
            ),
          );
        }
        await page.screenshot({
          path: `${output}/abstract-artwork-${name}-${theme}.png`,
          fullPage: true,
        });
        await page
          .getByRole('button', { name: 'Enlarge', exact: true })
          .click();
        assert.ok(await page.getByRole('dialog').isVisible());
        await noOverflow();
        await page
          .getByRole('button', { name: 'Close enlarged artwork' })
          .click();
      }
    }
    await page.goto(base + artworkURL);
    await page
      .getByRole('link', { name: /^Back to Marks Crossing Fields/ })
      .click();
    assert.ok(
      page
        .url()
        .includes(`/galleries/abstract--crossing-lines/#work-${first.id}`),
    );
    await page.goto(base + '/collections/nnotb/');
    assert.equal(
      await page.locator('h1').innerText(),
      'New Nifty on the Block',
    );
    assert.match(await page.locator('.wing-introduction').innerText(), /NNOTB/);
    assert.deepEqual(errors, []);
    assert.deepEqual(analytics, []);
  } finally {
    await context.close();
  }
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await noJS.newPage();
    await staticPage.goto(base + '/galleries/abstract--crossing-lines/');
    assert.equal(await staticPage.locator('[data-chapter]:visible').count(), 5);
    await staticPage.goto(base + artworkURL);
    await staticPage.getByText('Details & provenance', { exact: true }).click();
    assert.ok(
      (await staticPage.locator('#provenance').getAttribute('open')) !== null,
    );
    assert.ok(
      await staticPage
        .getByRole('link', { name: 'Download original JPEG' })
        .isVisible(),
    );
  } finally {
    await noJS.close();
  }
  return {
    check:
      'Abstract: three bounded exhibitions, keyboard enlargement, exact original download, provenance, canonical kudos, responsive light/dark layouts, reduced motion and no-JS reading; no live analytics',
    passed: true,
  };
}
