import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

export async function checkProvenance(browser, base, output) {
  const catalog = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
  const abstract = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'))
    .artworks[0];
  const samples = [
    catalog[0],
    catalog.find(
      (work) => work.inkId === 'QmUxE7WejRom44EW7QcLX58h5KtKosBAF33TkQhvLgFzwX',
    ),
    catalog.find((work) => work.ownedEditionCount > 2),
  ];
  const context = await browser.newContext({ reducedMotion: 'reduce' });
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
  async function checkLink(url) {
    const link = page.getByRole('link', { name: 'View NFT ↗', exact: true });
    assert.equal(await page.locator('[data-nft-link]').count(), 1);
    assert.equal(await link.getAttribute('href'), url);
    assert.ok(await link.isVisible());
    assert.equal(
      await page
        .locator('.token-provenance, .transfer-history, .collector-wallets')
        .count(),
      0,
    );
    assert.equal(await page.locator('details').count(), 1);
    assert.equal(await page.locator('#provenance').getAttribute('open'), null);
    assert.equal(await page.locator('#provenance dl').isVisible(), false);
    assert.ok(await page.locator('.curator-reading p').isVisible());
    assert.equal(await page.locator('.work-caption .byline').count(), 0);
    assert.equal(
      await page
        .locator('a[href*="/tx/"], a[href*="/address/"], a[href*="/block/"]')
        .count(),
      0,
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.equal(await page.locator('astro-error-overlay').count(), 0);
  }
  try {
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      for (const theme of ['light', 'dark']) {
        await page.addInitScript(
          (theme) => localStorage.setItem('nnxyz-theme', theme),
          theme,
        );
        for (const work of samples) {
          const token = JSON.parse(
            await fs.readFile(work.provenancePath, 'utf8'),
          ).ownedTokens[0];
          const explorer =
            token.chainId === 1
              ? 'https://etherscan.io'
              : 'https://gnosisscan.io';
          await page.goto(`${base}/artworks/${work.inkId}/`);
          assert.ok((await page.title()).includes('nnxyz'));
          await checkLink(
            `${explorer}/token/${token.contract}?a=${token.tokenId}`,
          );
          assert.equal(
            await page
              .locator(`a[href="/records/${work.inkId}.provenance.json"]`)
              .count(),
            1,
          );
          await page.locator('#provenance summary').click();
          assert.ok(
            await page
              .getByRole('link', { name: 'Download SVG', exact: true })
              .isVisible(),
          );
          await page.locator('#provenance summary').click();
          if (work === samples[0]) {
            await page.locator('.work-caption').scrollIntoViewIfNeeded();
            await page.screenshot({
              path: `${output}/nft-link-${viewport.width}-${theme}.png`,
            });
          }
        }
        await page.goto(`${base}/artworks/${abstract.id}/`);
        await checkLink(
          `https://polygonscan.com/token/${abstract.contract}?a=${abstract.tokenId}`,
        );
        await page.locator('#provenance summary').focus();
        await page.keyboard.press('Enter');
        assert.ok(await page.locator('#provenance dl').isVisible());
        assert.ok(
          await page
            .getByRole('link', { name: 'Download original JPEG', exact: true })
            .isVisible(),
        );
        assert.match(
          await page.locator('#provenance').innerText(),
          /does not establish current/,
        );
        await page.goto(`${base}/about/`);
        assert.equal(await page.locator('.collector-wallets').count(), 0);
        assert.equal(await page.locator('a[href*="/address/"]').count(), 0);
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(analytics, []);
  } finally {
    await context.close();
  }
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${base}/artworks/${samples[0].inkId}/`);
    assert.equal(await staticPage.locator('[data-nft-link]').count(), 1);
    assert.equal(await staticPage.locator('#provenance dl').isVisible(), false);
    await staticPage.locator('#provenance summary').click();
    assert.ok(await staticPage.locator('#provenance dl').isVisible());
    assert.ok(
      await staticPage
        .getByRole('link', { name: 'View NFT ↗', exact: true })
        .isVisible(),
    );
  } finally {
    await noScript.close();
  }
  return {
    pass: true,
    coverage:
      'One collected NFT link per artwork; exact chain/contract/token identity, no transaction/address panels, closed archive details with keyboard and no-JS access, desktop/mobile light/dark, no JavaScript and no analytics',
  };
}
