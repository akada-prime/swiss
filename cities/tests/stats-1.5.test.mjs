import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Stats 1.5 hero is data-driven Prime + innosolvcity', async () => {
  const js = await read('app/prime-communes-stats-1.5.js');
  assert.match(js, /PrimeCommunesData\.isPrimeInnosolv/);
  assert.match(js, /PrimeCommunesData\.scopeRows/);
  assert.match(js, /statsPrimeProgress/);
  assert.match(js, /statsPrimeMap/);
  assert.match(js, /stats-swiss-active/);
  assert.doesNotMatch(js, /stats-prime-watermark|prime-logo-negative\.svg/);
  assert.doesNotMatch(js, /\b63\b|\b64\b|420264|18\.8/);
});

test('Stats compact cards use one bounded 3-line layout without oversized outer padding', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(css, /--pc-kpi-label-lines:3/);
  assert.match(css, /grid-template-rows:[\s\S]*?var\(--pc-kpi-label-lines\)/);
  assert.match(css, /min-height:0/);
  assert.match(css, /align-self:start/);
  assert.match(css, /align-self:end/);
  assert.match(css, /stats-prime-progress/);
  assert.match(css, /stats-swiss-active/);
  assert.doesNotMatch(css, /stats-prime-watermark|nth-child|:has\(|!important/);
});

test('application loader includes canonical Stats 1.5 runtime', async () => {
  const loader = await read('app/prime-communes-1.1.js');
  assert.match(loader, /prime-communes-stats-1\.5\.js\?v=\d+/);
  assert.match(loader, /prime-communes-stats-1\.2\.css\?v=\d+/);
});
