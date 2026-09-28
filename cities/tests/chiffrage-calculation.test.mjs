import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, calculatePce, calculateSql, calculateLcm, calculatePublisherRent,
  effective, licensedPopulation, priceCatalogItem,
  selectInnosolvItem } from '../app/chiffrage/calculate.js';

test('catalog follows the declared tier rule, preserves its source and does not interpolate', () => {
  const item = { item_code: 'TEST', catalog_version: 'synthetic', source: 'fixture',
    pricing_rule: { kind: 'lookup', basis: 'population', tiers: [
      { up_to: 1000, value: 100 }, { up_to: 5000, value: 290 } ] } };
  assert.equal(priceCatalogItem(item, { population: 1001 }).value, 290);
  assert.equal(priceCatalogItem(item, { population: 1001 }).explanation.catalog_version, 'synthetic');
  assert.throws(() => priceCatalogItem(item, { population: 500 }), /Missing lower tier/);
  assert.throws(() => priceCatalogItem(item, { population: 5001 }), /Missing tier/);
});

test('declared linear rule rounds midpoint halves away from zero', () => {
  const item = { item_code: 'INTERPOLATED', catalog_version: 'synthetic', source: 'fixture',
    pricing_rule: { kind: 'linear_rounded', basis: 'population', round_to: 100,
      tiers: [{ up_to: 1000, value: 500 }, { up_to: 2000, value: 800 }] } };
  assert.equal(priceCatalogItem(item, { population: 1500 }).value, 700);
  assert.throws(() => priceCatalogItem(item, { population: 300 }), /lower anchor/);
});

test('larger Abacus commune uses a declared, bounded estimate above the source grid', () => {
  const item = { item_code: 'TEST', catalog_version: 'synthetic', source: 'fixture',
    pricing_rule: { kind: 'lookup', basis: 'population', tiers: [
      { up_to: 15000, value: 100 }, { up_to: 40000, value: 350 } ],
    above_last: { kind: 'linear_tail_estimate', from: 15000,
      max_population: 60000, round_to: 1 } } };
  assert.equal(priceCatalogItem(item, { population: 50000 }).value, 450);
  assert.equal(priceCatalogItem(item, { population: 50000 }).explanation.kind,
    'linear_tail_estimate');
  assert.throws(() => priceCatalogItem(item, { population: 60001 }), /Missing tier/);
});

test('VD chooses explicit 129VD variant', () => {
  const items = [{ item_code: '129' }, { item_code: '129VD' }];
  assert.equal(selectInnosolvItem(items, '129', 'VD').item_code, '129VD');
  assert.equal(selectInnosolvItem(items, '129', 'JU').item_code, '129');
});

test('PCE explains its rounding and retains the theoretical value beside override', () => {
  const result = calculatePce({ innosolvPaBase: 1900, interfacePa: 100,
    financePaOverride: 850 }, { finance_ratio: 0.4, finance_adjustment: 100,
    finance_round_to: 100, salary_round_to: 50, pv_margin: 0.2, pv_round_to: 50 });
  assert.equal(result.explanation.beforeFinanceRounding, 800);
  assert.equal(result.pa.finances.calculated_value, 700);
  assert.equal(result.pa.finances.effective_value, 850);
  assert.equal(result.pa.salaires.calculated_value, 400);
  assert.equal(result.pv.finances.calculated_value, 900);
  assert.deepEqual(effective(100, 0), { calculated_value: 100,
    override_value: 0, effective_value: 0, difference: -100 });
});

test('SQL uses editable suggestion and configurable threshold', () => {
  const rule = { suggestion: { lowerPopulation: 1000, lowerUsers: 2,
    upperPopulation: 9000, upperUsers: 10 }, core_from_population: 6000,
    user_base: 100, price_per_user: 20, default_cores: 2, price_per_core: 200 };
  assert.equal(calculateSql({ population: 5000, users: 9 }, rule).amount.effective_value, 280);
  assert.equal(calculateSql({ population: 6000 }, rule).amount.effective_value, 400);
  assert.throws(() => calculateSql({ population: 6000 }, {
    ...rule, price_per_core: null }), /price unconfirmed/);
  const manual = calculateSql({ population: 6000, override: 12500 },
    { ...rule, price_per_core: null });
  assert.equal(manual.amount.calculated_value, null);
  assert.equal(manual.amount.effective_value, 12500);
});

test('year one has no recurring charge; publisher PA is halved only in year two', () => {
  const catalog = { items: [{ vendor: 'innosolv', item_code: 'S1', label_fr: 'A',
    catalog_version: 'synthetic', source: 'fixture', pricing_rule: {
      kind: 'lookup', basis: 'population', tiers: [{ up_to: 5000, value: 1000 }] } }],
  parameters: { publisher_rent: { innosolv: { standard: { pa_rate: 0.1, pv_rate: 0.2 } } },
    sql: { suggestion: { lowerPopulation: 1000, lowerUsers: 2,
      upperPopulation: 5000, upperUsers: 10 }, core_from_population: 6000,
      user_base: 100, price_per_user: 20, default_cores: 2, price_per_core: 200 } } };
  const quote = calculateQuote({ canton: 'JU', products: ['innosolv'],
    dimensions: { population: 5000 }, modules: [{ vendor: 'innosolv', item_code: 'S1' }],
    sql: { users: 10 }, services: [{ family: 'prestations', label: 'Setup', investment_pv: 50 }],
    lcm: { gold: 99, platinium: 150 } }, catalog);
  assert.equal(quote.summary.investment, 350);
  assert.equal(quote.summary.annual, 200);
  assert.equal(quote.summary.tco5y_excluding_lcm, 1150);
  assert.equal(quote.summary.software_margin_year2, 150);
  assert.equal(quote.summary.software_margin_year3plus, 100);
  assert.equal(quote.summary.software_margin_5y, 450);
  assert.equal(quote.summary.lcm.gold.effective_value, 99);
  assert.equal(quote.summary.lcm.missing_reference, true);
  assert.deepEqual(quote.summary.incomplete_costs, ['sql', 'Setup']);
});

test('LCM options preserve estimate provenance and stay outside the main TCO', () => {
  const rule = [{ up_to: 5000, gold: 200, platinium: 400,
    status: 'draft_unapproved', gold_evidence: { method: 'observed_median', sample_size: 4 } }];
  const result = calculateLcm(4800, rule, { gold: 250 });
  assert.equal(result.gold.calculated_value, 200);
  assert.equal(result.gold.effective_value, 250);
  assert.equal(result.gold.five_year_option, 1000);
  assert.equal(result.gold.source.sample_size, 4);
  assert.equal(result.platinium.five_year_option, 1600);
});

test('Prime 2027 publisher rent uses 20% PA and 27% PV on the licence value', () => {
  assert.deepEqual(calculatePublisherRent(5500, { pa_rate: .2, pv_rate: .27 }),
    { pa: 1100, pv: 1485 });
});

test('LCM uses the strict Habitants < boundary, including irregular bands', () => {
  const bands = [
    [2000, 6400, 16000], [3000, 8000, 20000], [5000, 10000, 25000],
    [8000, 12000, 35000], [12000, 15000, 50000],
    [15000, 18000, 60000], [20000, 20000, 80000],
    [30000, 24000, 100000]
  ].map(([up_to, gold, platinium]) => ({ up_to, gold, platinium }));
  for (const [population, band, gold, platinium] of [
    [1999, 2000, 6400, 16000], [2000, 3000, 8000, 20000],
    [2999, 3000, 8000, 20000], [3000, 5000, 10000, 25000],
    [5000, 8000, 12000, 35000], [12000, 15000, 18000, 60000],
    [29999, 30000, 24000, 100000]
  ]) {
    const result = calculateLcm(population, bands);
    assert.equal(result.block, band);
    assert.equal(result.gold.effective_value, gold);
    assert.equal(result.platinium.effective_value, platinium);
  }
  const beyond = calculateLcm(30000, bands);
  assert.equal(beyond.block, null);
  assert.equal(beyond.missing_reference, true);
  assert.equal(calculateLcm(30000, bands, { gold: 25000 }).gold.effective_value, 25000);
});

test('standalone ERP and combined ERPs remain calculable, with quantity applied to extra lines', () => {
  const catalog = { items: [{ vendor: 'abacus', product: 'ERP', item_code: 'A1',
    label_fr: 'Comptabilité', source: 'fixture', pricing_rule: { kind: 'lookup',
      basis: 'population', tiers: [{ up_to: 5000, value: 1000 }] } }],
  parameters: { publisher_rent: { abacus: { standard: {
    pa_rate: 0.1, pv_rate: 0.2 } } },
    pce: { finance_ratio: 0.4, finance_adjustment: 100,
      finance_round_to: 100, salary_round_to: 50, pv_margin: 0.2, pv_round_to: 50 },
    oracle: { full_price: 100, light_price: 50,
      full_maintenance: 10, light_maintenance: 5 } } };
  const input = { products: ['abacus'], dimensions: { population: 5000 },
    modules: [{ vendor: 'abacus', product: 'ERP', item_code: 'A1' }],
    primeLines: [{ family: 'prime', item_code: 'H1', label: 'Hébergement',
      quantity: 3, investment_pv: 100, investment_pa: 80,
      annual_pv: 40, annual_pa: 20 }] };
  const standalone = calculateQuote(input, catalog);
  assert.equal(standalone.summary.investment, 300);
  assert.equal(standalone.summary.annual, 320);
  assert.equal(standalone.lines.find(line => line.item_code === 'H1').annual_pa, 60);
  const combined = calculateQuote({ ...input, products: ['abacus', 'pce'],
    pce: { finances: true, salaires: false, innosolvPaBaseOverride: 1000 },
    oracle: { full: 1, light: 0 } }, catalog);
  assert.ok(combined.lines.some(line => line.item_code === 'finances'));
  assert.equal(combined.lines.find(line => line.item_code === 'oracle').investment_pv, 100);
});

test('licensed population is rounded for new quotes but old revisions retain their base', () => {
  assert.equal(licensedPopulation(1100), 1500);
  assert.equal(licensedPopulation(1900), 2000);
  const catalog = { items: [{ vendor: 'innosolv', product: 'Gemeinde', item_code: '1',
    label_fr: 'Base', pricing_rule: { kind: 'lookup', basis: 'population', tiers: [
      { up_to: 1100, value: 100 }, { up_to: 1500, value: 150 },
      { up_to: 2000, value: 200 }] } }],
  parameters: { publisher_rent: { innosolv: { standard: { pa_rate: .2, pv_rate: .27 } } } } };
  const input = { products: ['innosolv'], modules: [{ vendor: 'innosolv', product: 'Gemeinde', item_code: '1' }],
    dimensions: { population: 1100 }, lcm: {}, sql: {} };
  // SQL is part of an innosolv quote and must be explicitly priced.
  catalog.parameters.sql = { suggestion: { lowerPopulation: 0, lowerUsers: 0,
    upperPopulation: 5000, upperUsers: 5 }, core_from_population: 6000,
  user_base: 0, price_per_user: 0, default_cores: 1, price_per_core: 0 };
  assert.equal(calculateQuote(input, catalog).lines[0].license_value, 100);
  assert.equal(calculateQuote({ ...input, dimensions: { population: 1100,
    licensedPopulation: licensedPopulation(1100) } }, catalog).lines[0].license_value, 150);
  assert.throws(() => calculateQuote({ ...input, dimensions: {
    population: 1100, licensedPopulation: 1000 } }, catalog), /must cover/);
});

test('LCM enters annual total and five-year total only when selected', () => {
  const input = { products: [], modules: [], dimensions: { population: 1900 },
    lcm: { gold: 8000 } };
  const catalog = { items: [], parameters: { lcm: [{ up_to: 5000,
    gold: 6400, platinium: 15000 }] } };
  const optional = calculateQuote(input, catalog);
  assert.equal(optional.summary.annual, 0);
  assert.equal(optional.summary.tco5y, 0);
  const included = calculateQuote({ ...input, lcm: { gold: 8000, selection: 'gold' } }, catalog);
  assert.equal(included.summary.annual, 8000);
  assert.equal(included.summary.tco5y, 32000);
  assert.equal(included.summary.tco5y_excluding_lcm, 0);
  assert.deepEqual(included.summary.incomplete_costs, ['gold']);
});

test('Prime support splits existing innosolv annual PV without changing revenue or margin', () => {
  const catalog = { items: [{ vendor: 'innosolv', product: 'Gemeinde', item_code: '1',
    label_fr: 'Base', pricing_rule: { kind: 'lookup', basis: 'population',
      tiers: [{ up_to: 2000, value: 1000 }] } }],
  parameters: { publisher_rent: { innosolv: { standard: { pa_rate: .2, pv_rate: .27 } } },
    sql: { suggestion: { lowerPopulation: 0, lowerUsers: 0, upperPopulation: 2000,
      upperUsers: 1 }, core_from_population: 6000, user_base: 0,
      price_per_user: 0, default_cores: 1, price_per_core: 0 } } };
  const input = { products: ['innosolv'], dimensions: { population: 1900, licensedPopulation: 2000 },
    modules: [{ vendor: 'innosolv', product: 'Gemeinde', item_code: '1' }], sql: {} };
  const before = calculateQuote(input, catalog);
  const after = calculateQuote({ ...input, primeLines: [{ family: 'prime',
    category: 'support', label: 'Support Prime annuel', annual_pv: 35 }] }, catalog);
  assert.equal(before.summary.annual, 270);
  assert.equal(after.summary.annual, 270);
  assert.equal(after.lines.find(line => line.family === 'innosolv').annual_pv, 235);
  assert.equal(after.lines.find(line => line.category === 'support').annual_pv, 35);
  assert.equal(after.summary.software_margin_year3plus, before.summary.software_margin_year3plus);
  assert.throws(() => calculateQuote({ ...input, primeLines: [{ family: 'prime',
    category: 'support', annual_pv: 300 }] }, catalog), /exceeds/);
});
