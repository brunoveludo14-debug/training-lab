const { strict: assert } = require('node:assert');
const path = require('node:path');

const BASE_URL = process.env.TRAINING_LAB_BASE_URL || 'http://localhost:4173';

async function fetchUrl(url) {
  const response = await fetch(url, { redirect: 'follow' });
  return response;
}

(async () => {
  const checks = [
    { label: 'index HTML', url: `${BASE_URL}/index.html`, expectedStatus: 200, contentType: 'text/html' },
    { label: 'CSS asset', url: `${BASE_URL}/css/style.css`, expectedStatus: 200, contentType: 'text/css' },
    { label: 'app entrypoint', url: `${BASE_URL}/js/app.js`, expectedStatus: 200, contentType: 'text/javascript' },
    { label: 'storage module', url: `${BASE_URL}/js/modules/storage.js`, expectedStatus: 200, contentType: 'text/javascript' },
    { label: 'manifest', url: `${BASE_URL}/manifest.json`, expectedStatus: 200, contentType: 'application/json' },
    { label: 'service worker', url: `${BASE_URL}/sw.js`, expectedStatus: 200, contentType: 'text/javascript' }
  ];

  for (const item of checks) {
    const response = await fetchUrl(item.url);
    assert.equal(response.status, item.expectedStatus, `${item.label} returned ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    const isScriptAsset = contentType.includes(item.contentType) || contentType.includes('application/x-javascript') || contentType.includes('application/javascript');
    assert.ok(isScriptAsset, `${item.label} wrong content type: ${contentType}`);
  }

  const html = await fetchUrl(`${BASE_URL}/index.html`).then(r => r.text());
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('css/style.css'));
  assert.ok(html.includes('js/app.js'));

  console.log('Smoke test: PASS');
})();
