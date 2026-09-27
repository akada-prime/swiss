import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, calculatePce, calculateSql, effective, priceCatalogItem,
  selectInnosolvItem } from '../app/chiffrage/calculate.js';

test('catalog follows the declared tier rule, preserves its source and does not interpolate', () => {
  const item = { item_code: 'TEST', catalog_version: 'synthetic', source: 'fixture',
    pricing_rule: { kind: 'lookup', basis: 'population', tiers: [
      { up_to: 1000, value: 100 }, { up_to: 5000, value: 290 } ] } };
  assert.equal(priceCatalogItem(item, { population: 1001 }).value, 290);
  assert.equal(priceCatalogItem(item, { population: 1001 }).explanation.catalog_version, 'synthetic');
  assert.throws(() => priceCatalogItem(item, { population: 5001 }), /Missing tier/);
});

test('declared linear rule rounds midpoint halves away from zero', () => {
  const item = { item_code: 'INTERPOLATED', catalog_version: 'synthetic', source: 'fixture',
    pricing_rule: { kind: 'linear_rounded', basis: 'population', round_to: 100,
      tiers: [{ up_to: 1000, value: 500 }, { up_to: 2000, value: 800 }] } };
  assert.equal(priceCatalogItem(item, { population: 1500 }).value, 700);
  assert.throws(() => priceCatalogItem(item, { population: 300 }), /lower anchor/);
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
