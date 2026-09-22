import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function searchRuntime() {
  const runtime = await read('app/core/runtime.js');
  const start = runtime.indexOf('const normalizeSearchText');
  const end = runtime.indexOf('const SUPABASE_URL', start);
  assert.ok(start >= 0 && end > start, 'search runtime must remain independently testable');
  const context = { window: { PrimeCommunesData: null } };
  vm.runInNewContext(runtime.slice(start, end), context);
  return context;
}

const commune = overrides => ({
  name: 'Châtel-Saint-Denis', canton: 'FR', market: 'Welsch', district: 'Veveyse',
  integrator: 'Ofisa', software: 'innosolvcity', erp: 'Abacus', products: ['eAdmin'],
  hosting: 'AZ Informatique', isPrime: false, expectedPopulation: 8512, notes: 'Migration prévue',
  ...overrides
});

test('universal search ranks commune identity before matches in other names', async () => {
  const runtime = await searchRuntime();
  const chatel = runtime.communeSearchMeta(commune({}), 'chatel');
  const neuchatel = runtime.communeSearchMeta(commune({ name: 'Neuchâtel' }), 'chatel');
  assert.equal(chatel.label, 'Commune');
  assert.ok(chatel.score < neuchatel.score);
});

test('universal search ignores accents, accepts a small typo and covers every data column', async () => {
  const runtime = await searchRuntime();
  assert.equal(runtime.communeSearchMeta(commune({ name: 'Châtel' }), 'chatel').score, 0);
  assert.equal(runtime.communeSearchMeta(commune({}), 'chatle').label, 'Commune approchante');
  assert.equal(runtime.communeSearchMeta(commune({}), 'ofisa').label, 'Intégrateur');
  assert.equal(runtime.communeSearchMeta(commune({}), 'eadmin').label, 'Modules');
  assert.equal(runtime.communeSearchMeta(commune({}), 'az informatique').label, 'Hébergeur');
  assert.equal(runtime.communeSearchMeta(commune({}), 'migration').label, 'Notes');
  assert.equal(runtime.communeSearchMeta(commune({}), '8512').label, 'Population');
  assert.equal(runtime.communeSearchMeta(commune({}), "8'512").label, 'Population');
});

test('Natel gets a dedicated search surface while desktop keeps the compact table', async () => {
  const runtime = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/styles/responsive.css');
  assert.match(runtime, /Recherche universelle des communes/);
  assert.match(runtime, /data-mobile-search-results/);
  assert.match(runtime, /Touchez une commune · portrait public/);
  assert.match(runtime, /sourceInput\.dispatchEvent\(new Event\('input'/);
  assert.match(runtime, /sourceInput\.dispatchEvent\(new Event\('input'[\s\S]{0,260}renderMobileSearchResults\(\)/);
  assert.match(runtime, /mobileInput\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(runtime, /requestAnimationFrame\(\(\) => mobileInput\.focus/);
  assert.match(runtime, /openDrawer\(commune\)/);
  assert.doesNotMatch(runtime, /\bbyId\(/);
  assert.match(css, /\.mobile-search-overlay\{display:none\}/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.mobile-search-overlay\{/);
  assert.match(css, /height:100dvh/);
  assert.match(css, /font-size:16px/);
});
