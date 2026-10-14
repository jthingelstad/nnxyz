import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

export async function checkProvenance(browser, base, output) {
  const catalog = JSON.parse(await fs.readFile('data/gallery.json', 'utf8'));
  const abstract = JSON.parse(await fs.readFile('data/abstract.json', 'utf8'))
    .artworks[0];
  const origin = catalog[0];
  const upgraded = catalog.find(
    (work) => work.inkId === 'QmUxE7WejRom44EW7QcLX58h5KtKosBAF33TkQhvLgFzwX',
  );
  const multiple = catalog.find((work) => work.ownedEditionCount > 2);
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
        for (const work of [origin, upgraded, multiple]) {
          const provenance = JSON.parse(
            await fs.readFile(work.provenancePath, 'utf8'),
          );
          await page.goto(`${base}/artworks/${work.inkId}/`);
          assert.ok((await page.title()).includes('nnxyz'));
          assert.ok(await page.locator('#provenance').isVisible());
          assert.equal(await page.locator('details, summary').count(), 0);
          await page
            .getByRole('link', { name: 'Token provenance', exact: true })
            .click();
          assert.ok(page.url().endsWith('#provenance'));
          assert.equal(
            await page.locator('.token-record').count(),
            provenance.ownedTokens.length,
          );
          for (const token of provenance.ownedTokens) {
            const network = token.chainId === 1 ? 'Ethereum' : 'Gnosis';
            const explorer =
              token.chainId === 1
                ? 'https://etherscan.io'
                : 'https://gnosisscan.io';
            const section = page.getByRole('region', {
              name: `${network} token ${token.tokenId}`,
              exact: true,
            });
            assert.equal(
              await section.locator('h3 a').getAttribute('href'),
              `${explorer}/token/${token.contract}?a=${token.tokenId}`,
            );
            assert.equal(
              await section
                .getByRole('link', { name: token.owner, exact: true })
                .getAttribute('href'),
              `${explorer}/address/${token.owner}`,
            );
            if (await section.locator('.transfer-history').count()) {
              assert.ok(await section.locator('.transfer-history').isVisible());
              assert.ok(
                (await section.locator('.transfer-history li').count()) > 0,
              );
            }
          }
          if (work === upgraded) {
            const eth = page.getByRole('region', {
              name: 'Ethereum token 43864',
              exact: true,
            });
            assert.equal(
              await eth.locator('.transfer-history a[href*="/tx/"]').count(),
              2,
            );
            assert.equal(
              await eth
                .locator(
                  '.transfer-history a[href^="https://etherscan.io/tx/"]',
                )
                .count(),
              0,
            );
          }
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            'Provenance must not overflow',
          );
          assert.equal(await page.locator('astro-error-overlay').count(), 0);
          if (work === origin) {
            await page.locator('.token-provenance').scrollIntoViewIfNeeded();
            await page.screenshot({
              path: `${output}/provenance-${viewport.width}-${theme}.png`,
            });
          }
        }
        await page.goto(`${base}/artworks/${abstract.id}/`);
        await page
          .getByRole('link', { name: 'Token provenance', exact: true })
          .click();
        assert.ok(await page.locator('#provenance').isVisible());
        assert.equal(await page.locator('details, summary').count(), 0);
        assert.equal(
          await page
            .getByRole('link', { name: abstract.tokenId, exact: true })
            .getAttribute('href'),
          `https://polygonscan.com/token/${abstract.contract}?a=${abstract.tokenId}`,
        );
        assert.match(
          await page.locator('#provenance').innerText(),
          /does not establish current/,
        );
        assert.equal(
          await page.locator('.token-record').count(),
          0,
          'Abstract must not invent a snapshot wallet',
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.goto(`${base}/about/#collector-wallets`);
        assert.equal(await page.locator('.collector-wallets li').count(), 2);
        assert.equal(await page.locator('.collector-wallets a').count(), 3);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(analytics, []);
  } finally {
    await context.close();
  }
  const noScript = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${base}/artworks/${origin.inkId}/`);
    assert.ok(await staticPage.locator('#provenance').isVisible());
    assert.equal(await staticPage.locator('details, summary').count(), 0);
    assert.ok(
      await staticPage.locator('.transfer-history li').first().isVisible(),
    );
  } finally {
    await noScript.close();
  }
  return {
    pass: true,
    coverage:
      'Token provenance: Gnosis/Ethereum editions, per-network transactions, exact Polygon IDs, collector wallets, desktop/mobile light/dark, reduced motion, no JavaScript and no analytics',
  };
}
