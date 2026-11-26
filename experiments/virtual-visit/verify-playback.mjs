import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import sharp from 'sharp';

const url =
  process.env.VISIT_TEST_URL ??
  new URL('../../.build/virtual-visit/Coda.html', import.meta.url).href;
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  args: ['--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (process.env.VISIT_TEST_URL) {
    const origin = new URL(url).origin;
    await page.goto(origin);
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Virtual visit', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Choose a room', exact: true })
      .click();
    await page.getByRole('button', { name: 'Floor 2', exact: true }).click();
    await page.getByRole('button', { name: /Coda: Two Landscapes/ }).click();
    assert.match(page.url(), /#room=rawblocks--rb-coda/);
    assert.equal(
      await page.locator('#return-link').getAttribute('href'),
      '/galleries/rawblocks--rb-coda/',
    );
  } else await page.goto(url);
  await page.getByRole('button', { name: 'Draw both landscapes' }).click();
  const picker = page.getByLabel('Painting to control'),
    time = page.getByLabel('Drawing progress');
  const speed = page.getByLabel('Drawing speed'),
    toggle = page.locator('#draw-toggle');
  const choose = (i) => picker.selectOption({ index: i });
  const elapsed = () => time.inputValue().then(Number);
  const advances = async (previous) =>
    page.waitForFunction(
      (t) => Number(document.querySelector('#draw-time').value) > t + 0.12,
      previous,
    );
  await advances(0);
  await choose(1);
  await advances(0);
  await speed.selectOption('2');
  await choose(0);
  assert.equal(await speed.inputValue(), '1');
  const first = await elapsed();
  await choose(1);
  await advances(await elapsed());
  await choose(0);
  await advances(first);
  await toggle.click();
  const paused = await elapsed();
  await choose(1);
  await advances(await elapsed());
  assert.equal(await speed.inputValue(), '2');
  await toggle.click();
  await choose(0);
  assert.equal(await elapsed(), paused);
  async function seek(key) {
    await time.focus();
    await page.keyboard.press(key);
    await page.evaluate(
      () =>
        new Promise((ok) =>
          requestAnimationFrame(() => requestAnimationFrame(ok)),
        ),
    );
  }
  // With both clocks paused, only the wall that is scrubbed should change.
  await seek('Home');
  await seek('ArrowRight');
  assert(
    Number(await time.inputValue()) > 0,
    'Arrow keys must scrub the focused slider',
  );
  await seek('Home');
  await choose(1);
  await seek('Home');
  const before = await page.screenshot();
  await choose(0);
  await seek('End');
  const leftFinished = await page.screenshot();
  await choose(1);
  await seek('End');
  const bothFinished = await page.screenshot();
  async function difference(a, b, left) {
    const rect = { left, top: 255, width: 200, height: 175 };
    const pixels = async (buf) =>
      sharp(buf).extract(rect).removeAlpha().raw().toBuffer();
    const p = await pixels(a),
      q = await pixels(b);
    return (
      p.reduce((sum, value, i) => sum + Math.abs(value - q[i]), 0) / p.length
    );
  }
  for (const [left, a, b] of [
    [330, before, leftFinished],
    [825, leftFinished, bothFinished],
  ])
    assert(
      (await difference(a, b, left)) > 12,
      'Scrub did not repaint the selected wall',
    );
  for (const [left, a, b] of [
    [825, before, leftFinished],
    [330, leftFinished, bothFinished],
  ])
    assert(
      (await difference(a, b, left)) < 0.5,
      'Scrub changed the other wall',
    );
  await page.getByLabel('Close selected drawing replay').click();
  assert.equal(await picker.locator('option').count(), 1);
  assert.equal(await toggle.innerText(), 'Replay');
  await page.getByRole('button', { name: 'Gallery hall', exact: true }).click();
  assert(await page.locator('#replay').isHidden());
  assert.equal(await picker.locator('option').count(), 0);
  if (process.env.VISIT_TEST_URL) {
    const origin = new URL(url).origin;
    await page.goto(origin + '/galleries/rawblocks--rb-coda/');
    await page
      .getByRole('link', { name: 'Walk into this room', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Browse works', exact: true })
      .click();
    await page.locator('.work-list button').nth(1).click();
    await page.getByRole('button', { name: 'Stand here', exact: true }).click();
    const work = new URLSearchParams(new URL(page.url()).hash.slice(1)).get(
      'work',
    );
    assert(work);
    await page.getByRole('link', { name: 'Artwork page', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/artworks/' + work + '/');
    await page.getByRole('link', { name: 'See this work on the wall' }).click();
    await page
      .getByRole('button', { name: 'Browse works', exact: true })
      .waitFor();
    assert.match(page.url(), new RegExp('#work=' + work));
  }
  if (process.env.VISIT_TEST_URL) {
    const phone = await browser.newPage({ ...devices['iPhone 13'] });
    try {
      phone.on('pageerror', (e) => errors.push(e.message));
      await phone.goto(url);
      const walk = phone.getByRole('button', {
        name: 'Walk forward',
        exact: true,
      });
      await walk.waitFor();
      assert(await phone.getByRole('button', { name: 'Turn left' }).isHidden());
      const dock = await phone.locator('.location').boundingBox();
      const position = async () => {
        await phone
          .getByRole('button', { name: 'Floor plan', exact: true })
          .tap();
        const transform = await phone
          .locator('[aria-label="Your position"]')
          .getAttribute('transform');
        await phone
          .getByRole('button', { name: 'Close panel', exact: true })
          .tap();
        const [x, z, angle] = transform.match(/[-\d.]+/g).map(Number);
        return { x, z, angle };
      };
      const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
      const start = await position();
      await walk.tap();
      const forward = await position();
      assert(
        distance(start, forward) > 0.27,
        'A quick Walk tap must take a step',
      );
      await phone.getByRole('button', { name: 'Back up', exact: true }).tap();
      const backed = await position();
      assert(distance(start, backed) < distance(start, forward));
      await phone.touchscreen.tap(
        phone.viewportSize().width / 2,
        Math.round(dock.y - 6),
      );
      // Wait for the walk to advance before opening the map, which cancels it.
      await phone.waitForTimeout(700);
      const walked = await position();
      assert(
        distance(backed, walked) > 0.6,
        'A floor tap must walk toward its destination',
      );
      assert.equal(
        walked.angle,
        backed.angle,
        'Walking preserves the viewing direction',
      );

      const cdp = await phone.context().newCDPSession(phone);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: 115, y: 288 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 250, y: 288 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      const turned = await position();
      assert(
        turned.angle < walked.angle - 12,
        'Dragging right should pull the scene right',
      );
      assert(
        distance(turned, walked) < 0.01,
        'A look gesture must not move the visitor',
      );
      await phone.setViewportSize({ width: 568, height: 320 });
      const roomPanel = await phone.locator('.location').boundingBox();
      const walkControls = await phone.locator('.movement').boundingBox();
      assert(
        roomPanel.x + roomPanel.width < walkControls.x,
        'The touch controls must leave room actions accessible in landscape',
      );
      console.log(
        'iPhone-size tap to walk, forward and backward steps, and drag to look passed.',
      );
    } finally {
      await phone.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    'Both landscapes advance independently. Each speed, pause, scrub, wall image and close is isolated.',
  );
} finally {
  await browser.close();
}
