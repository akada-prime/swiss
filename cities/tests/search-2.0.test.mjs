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

test('Natel keeps the expanded search; selection returns to the normal commune list', async () => {
  const runtime = await read('app/prime-communes-communes-1.2.js');
  const shell = await read('app/core/runtime.js');
  const html = await read('index.html');
  const css = await read('app/styles/responsive.css');
  assert.match(html, /id="query" type="search" enterkeyhint="search"/);
  assert.match(shell, /\$\('query'\)\.addEventListener\('input',render\)/);
  assert.match(runtime, /row\.onclick = \(\) => openCommunePortrait\(commune\)/);
  assert.match(runtime, /function openMobileSearch\(\)/);
  assert.match(css, /\.mobile-search-overlay\{/);
  assert.match(runtime, /showCommuneInList\(commune, sourceInput\)/);
  assert.doesNotMatch(runtime, /closeMobileSearch\(\);\s*openCommunePortrait\(commune\)/);
});

test('selecting a mobile search result filters the table and scrolls to its row without opening a portrait', async () => {
  const runtime = await read('app/prime-communes-communes-1.2.js');
  const start = runtime.indexOf('  function closeMobileSearch()');
  const end = runtime.indexOf('  function openMobileSearch()', start);
  assert.ok(start >= 0 && end > start);

  let event, scroll, blurred = false;
  let rows = [];
  const overlay = { hidden: false, querySelector: () => ({ blur: () => { blurred = true; } }) };
  const sourceInput = {
    value: 'Del',
    dispatchEvent(inputEvent) {
      event = inputEvent;
      rows = [{ dataset: { id: '6711' }, scrollIntoView: options => { scroll = options; } }];
    }
  };
  const context = {
    mobileSearchOverlay: overlay,
    sourceInput,
    document: {
      documentElement: { classList: { remove() {} } },
      body: { classList: { remove() {} } },
      querySelectorAll: () => rows,
      querySelector: () => { throw new Error('commune row missing from filtered table'); }
    },
    requestAnimationFrame: callback => callback(),
    Event: class { constructor(type, options) { this.type = type; this.bubbles = options.bubbles; } }
  };
  vm.runInNewContext(`${runtime.slice(start, end)}\nshowCommuneInList({ id: 6711, name: 'Delémont' }, sourceInput);`, context);
  assert.equal(sourceInput.value, 'Delémont');
  assert.equal(event.type, 'input');
  assert.equal(event.bubbles, true);
  assert.equal(overlay.hidden, true);
  assert.equal(blurred, true);
  assert.equal(scroll.block, 'center');
});
