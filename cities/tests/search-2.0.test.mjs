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
  assert.match(shell, /\$\('query'\)\.addEventListener\('input',\(\)=>render\(\)\)/);
  assert.match(runtime, /row\.onclick = \(\) => openCommunePortrait\(commune\)/);
  assert.match(runtime, /function openMobileSearch\(\)/);
  assert.match(css, /\.mobile-search-overlay\{/);
  assert.match(runtime, /showCommuneInList\(commune, sourceInput\)/);
  assert.doesNotMatch(runtime, /closeMobileSearch\(\);\s*openCommunePortrait\(commune\)/);
});

test('search inputs call the current enhanced renderer after the commune module loads', async () => {
  const shell = await read('app/core/runtime.js');
  const match = shell.match(/\$\('query'\)\.addEventListener\('input',\(\)=>render\(\)\)/);
  assert.ok(match, 'input listener must resolve render at event time');
  let listener, rendered = '';
  const context = {
    $: () => ({ addEventListener: (_type, callback) => { listener = callback; } }),
    render: () => { rendered = 'base'; }
  };
  vm.runInNewContext(match[0], context);
  context.render = () => { rendered = 'enhanced'; };
  listener();
  assert.equal(rendered, 'enhanced');
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

test('mobile search suspends inherited filters on typing and restores them on cancel', async () => {
  const runtime = await read('app/prime-communes-communes-1.2.js');
  const start = runtime.indexOf('  function syncSearchFilterControls()');
  const end = runtime.indexOf('  function scrollToCommuneRow(', start);
  assert.ok(start >= 0 && end > start);

  const controls = Object.fromEntries(['query', 'canton', 'district', 'solution', 'primeOnly', 'eadminOnly', 'issuesOnly']
    .map(id => [id, { value: '', classList: { toggle() {} } }]));
  controls.query.value = 'ancien';
  controls.canton.value = 'VD';
  controls.district.value = '2222';
  controls.solution.value = 'Prime|||innosolvcity';
  let dispatched = 0, closed = 0;
  controls.query.dispatchEvent = () => { dispatched++; };
  const previous = {
    query: 'ancien', canton: 'VD', district: '2222', solution: 'Prime|||innosolvcity',
    marketOnly: 'Uf Tüütsch', primeOnly: true, eadminOnly: false, issuesOnly: true
  };
  const context = {
    document: { getElementById: id => controls[id], querySelectorAll: () => [{ dataset: { market: 'Welsch' }, classList: { toggle() {} } }] },
    mobileSearchPreviousFilters: previous,
    mobileSearchSuspended: false,
    mobileSearchScopeTouched: { market: true, prime: false, eadmin: false },
    marketOnly: 'Welsch', primeOnly: true, eadminOnly: false, issuesOnly: true,
    updateDistrictOptions() { if (controls.canton.value === 'Tous') controls.district.value = ''; },
    mobileSearchIsOpen: () => true,
    closeMobileSearch: () => { closed++; },
    Event: class { constructor(type) { this.type = type; } }
  };
  vm.runInNewContext(`${runtime.slice(start, end)}\nsuspendMobileSearchFilters()`, context);
  assert.equal(controls.canton.value, 'Tous');
  assert.equal(controls.district.value, '');
  assert.equal(controls.solution.value, 'Tous');
  assert.equal(context.marketOnly, 'Welsch', 'quick filter chosen in search remains active');
  assert.equal(context.primeOnly, false);
  assert.equal(context.issuesOnly, false);

  controls.query.value = 'Delémont';
  vm.runInNewContext('cancelMobileSearch()', context);
  assert.equal(controls.query.value, 'ancien');
  assert.equal(controls.canton.value, 'VD');
  assert.equal(controls.district.value, '2222');
  assert.equal(controls.solution.value, 'Prime|||innosolvcity');
  assert.equal(context.marketOnly, 'Uf Tüütsch');
  assert.equal(context.primeOnly, true);
  assert.equal(context.issuesOnly, true);
  assert.equal(closed, 1);
  assert.equal(dispatched, 1);
});

test('desktop search restores an incompatible filter on cancel, then commits global results on Enter', async () => {
  const runtime = await read('app/prime-communes-communes-1.2.js');
  const start = runtime.indexOf('  // Desktop uses the existing field and list.');
  const end = runtime.indexOf('  // Apply the canonical layout immediately', start);
  assert.ok(start >= 0 && end > start);
  const events = {};
  const input = { value: '', addEventListener(type, fn) { events[type] = fn; }, blur() {} };
  const controls = {
    query: input,
    canton: { value: 'VD' },
    district: { value: '' },
    solution: { value: 'Tous' },
    reset: { addEventListener() {} }
  };
  let renders = 0;
  const context = {
    document: { getElementById: id => controls[id] },
    mobileMedia: { matches: false },
    marketOnly: '', primeOnly: false, eadminOnly: false, issuesOnly: false,
    updateDistrictOptions() { controls.district.value = ''; },
    syncSearchFilterControls() {}, render() { renders++; }
  };
  vm.runInNewContext(runtime.slice(start, end), context);
  events.focus();
  assert.equal(controls.canton.value, 'VD');
  input.value = 'D';
  events.input();
  assert.equal(controls.canton.value, 'Tous');
  input.value = '';
  events.input();
  assert.equal(controls.canton.value, 'VD');
  events.focus();
  input.value = 'Delémont';
  events.input();
  events.keydown({ key: 'Enter' });
  assert.equal(controls.canton.value, 'Tous');
  assert.equal(input.value, 'Delémont');
  assert.ok(renders >= 3);
});
