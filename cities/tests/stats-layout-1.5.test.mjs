import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Stats compact KPI contract keeps alignment without oversized outer padding', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(css, /--pc-kpi-label-lines:3/);
  assert.match(css, /grid-template-rows:[\s\S]*?var\(--pc-kpi-label-lines\)/);
  assert.match(css, /align-self:start/);
  assert.match(css, /align-self:end/);
  assert.match(css, /min-height:0/);
  assert.doesNotMatch(css, /nth-child|:has\(|!important/);
});

test('Stats Prime hero is innosolvcity-based and contains no decorative watermark', async () => {
  const js = await read('app/prime-communes-stats-1.5.js');
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(js, /Part Prime · innosolvcity/);
  assert.match(js, /PrimeCommunesData\.isPrimeInnosolv/);
  assert.doesNotMatch(js, /stats-prime-watermark/);
  assert.doesNotMatch(css, /stats-prime-watermark/);
});
