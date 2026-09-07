import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('DATA 1.5 loads before view runtimes and owns live transport', async () => {
  const loader = await read('app/prime-communes-1.1.js');
  const data = await read('app/prime-communes-data-1.5.js');

  const dataIndex = loader.indexOf('prime-communes-data-1.5.js');
  const mapIndex = loader.indexOf('prime-communes-maplibre-1.2.js');
  const baseIndex = loader.indexOf('prime-communes-1.1-base.js');
  assert.ok(dataIndex >= 0 && dataIndex < mapIndex && dataIndex < baseIndex);
  assert.match(data, /GemeindeAktuell\?select=\*&order=bfs_id/);
  assert.match(data, /window\.PrimeCommunesData = api/);
  assert.match(data, /window\.dispatchEvent\(new CustomEvent\('prime:data-ready'/);
  assert.match(data, /try \{ loadData = reload; \}/);
});

test('French statistical scopes are centralized and strict for bilingual cantons', async () => {
  const data = await read('app/prime-communes-data-1.5.js');
  assert.match(data, /const FRENCH_MARKET = 'Welsch'/);
  assert.match(data, /scope === 'romandie'/);
  assert.match(data, /scope === 'FR-welsch'/);
  assert.match(data, /row\.canton === 'FR' && isFrench\(row\)/);
  assert.match(data, /scope === 'VS-welsch'/);
  assert.match(data, /row\.canton === 'VS' && isFrench\(row\)/);
  assert.match(data, /row\.canton === 'BE' && isFrench\(row\).*jura bernois/i);
});

test('hosting is a first-class DATA 1.5 field from the live view', async () => {
  const data = await read('app/prime-communes-data-1.5.js');
  assert.match(data, /hosting: row\.hosting \?\? ''/);
  assert.match(data, /hostingCode: row\.hosting_code \?\? ''/);
});

test('retired map product control is no longer part of the data contract', async () => {
  const data = await read('app/prime-communes-data-1.5.js');
  assert.doesNotMatch(data, /mapProduct['"]?\)\.innerHTML/);
  assert.match(data, /byId\('mapProduct'\)\?\.remove\(\)/);
});

test('Stats territory cards reserve one standard heading zone', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(css, /--pc-territory-heading-height:/);
  assert.match(css, /\.territory-comparison button>span/);
  assert.match(css, /min-height:var\(--pc-territory-heading-height\)/);
  assert.doesNotMatch(css, /nth-child/);
});
