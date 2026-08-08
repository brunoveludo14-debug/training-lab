const { chromium } = require('playwright');
const { strict: assert } = require('node:assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:4173/index.html', {
    waitUntil: 'load',
    timeout: 5000
  });

  await page.getByRole('button', { name: /Novo Treino/i }).click();

  await page.locator('#input-session-name').fill('E2E Smoke Treino');
  await page.locator('#input-session-date').fill(new Date().toISOString().split('T')[0]);
  await page.locator('#form-new-session .intensity-btn[data-int="med"]').click();
  await page.locator('#form-new-session button[type="submit"]').click();

  await page.getByText('E2E Smoke Treino').waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole('button', { name: /Voltar/i }).waitFor({ state: 'visible', timeout: 5000 });

  const sessionTitle = (await page.locator('#sd-title').textContent()).trim();
  assert.equal(sessionTitle, 'E2E Smoke Treino');

  await page.locator('#sd-add-exercise').click();

  const activeView = await page.locator('#view-biblioteca').evaluate(el => ({
    className: el.className
  }));

  assert.ok(activeView.className.includes('active'));

  await page.screenshot({ path: 'test-e2e.png', fullPage: true });

  await browser.close();
  console.log('E2E smoke: PASS');
})();
