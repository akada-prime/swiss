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

test('Stats compact cards use one measured responsive label contract', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  const js = await read('app/prime-communes-stats-1.5.js');
  assert.match(css, /--pc-kpi-label-height/);
  assert.doesNotMatch(css, /--pc-kpi-label-lines/);
  assert.match(css, /grid-template-rows:var\(--pc-kpi-label-height,auto\)/);
  assert.match(css, /\.stats-kpi:not\(\.stats-kpi-prime\)>strong[\s\S]*?color:#f3f6fa/);
  assert.match(css, /align-content:start/);
  assert.match(css, /min-height:0/);
  assert.match(js, /syncContextKpiLabelHeight/);
  assert.match(css, /stats-prime-progress/);
  assert.match(css, /stats-swiss-active/);
  assert.doesNotMatch(css, /stats-prime-watermark|nth-child|:has\(|!important/);
});

test('application loader includes canonical Stats 1.5 runtime', async () => {
  const loader = await read('app/prime-communes-1.1.js');
  assert.match(loader, /prime-communes-stats-1\.5\.js\?v=\d+/);
  assert.match(loader, /prime-communes-stats-1\.2\.css\?v=\d+/);
});
