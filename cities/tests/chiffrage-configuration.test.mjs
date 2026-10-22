import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestedVolume, updatePopulation, setEnergy, hostingIncluded } from '../app/chiffrage/configuration.js';
import { calculateQuote, licensedPopulation } from '../app/chiffrage/calculate.js';
import { calculationError } from '../app/chiffrage/errors.js';

test('suggested volumes round population thirds upwards to 500, including exact boundaries', () => {
  for (const [population, expected] of [[0,0],[1,500],[1403,500],[1500,500],
    [1501,1000],[4500,1500],[4501,2000],[10000,3500]])
    assert.equal(suggestedVolume(population), expected);
});

test('population changes update suggestions but retain human volumes and historic inputs', () => {
  const dimensions = { population: 1403, licensedPopulation: 1500, meters: 500, taxes: 720 };
  updatePopulation(dimensions, 4501, licensedPopulation);
  assert.deepEqual(dimensions, { population: 4501, licensedPopulation: 5000, meters: 2000, taxes: 720 });
  const historic = { population: 1403, meters: 0, taxes: 468 };
  updatePopulation(historic, 2000, licensedPopulation);
  assert.deepEqual(historic, { population: 2000, meters: 0, taxes: 468 });
});

const catalog = { items: ['501','502','533'].map(item_code => ({ vendor: 'innosolv',
  product: 'Versorger', item_code, pricing_rule: { kind: 'unverified', basis: 'meters',
    tiers: [{ up_to: 500, value: 100 }] } })), parameters: {
  publisher_rent: { innosolv: { standard: { pa_rate: .1, pv_rate: .2 } } },
  sql: { suggestion: { lowerPopulation: 0, lowerUsers: 0, upperPopulation: 2000,
    upperUsers: 2 }, core_from_population: 5000, user_base: 0, price_per_user: 0,
  default_cores: 1, price_per_core: 0 } } };
const draft = () => ({ products: ['innosolv'], dimensions: { population: 1500, meters: 500 },
  modules: [], moduleServices: [], sql: {} });

test('energy adds the three licenses once, preserves other modules and removes related services', () => {
  const input = draft();
  input.modules.push({ vendor: 'innosolv', product: 'Gemeinde', item_code: '1' });
  assert.equal(setEnergy(input, true, catalog), true);
  setEnergy(input, true, catalog);
  assert.equal(input.modules.length, 4);
  input.moduleServices.push({ item_code: 'innosolv/Versorger/501', days: 2 });
  setEnergy(input, false, catalog);
  assert.equal(input.modules.length, 1);
  assert.equal(input.moduleServices.length, 0);
  assert.equal(setEnergy(draft(), true, { items: catalog.items.slice(1) }), false);
  assert.equal(setEnergy({ ...draft(), products: [] }, true, catalog), false);
});

test('unverified energy tariffs cannot be silently calculated; explicit PA and PV remain possible', () => {
  const input = draft(); setEnergy(input, true, catalog);
  assert.throws(() => calculateQuote(input, catalog), /Manual publisher prices required: 501/);
  for (const row of input.modules) Object.assign(row, { pa_override: 12, pv_override: 20 });
  const result = calculateQuote(input, catalog);
  assert.equal(result.summary.annual, 60);
  assert.equal(result.lines[0].license_value, null);
  assert.equal(result.lines[0].explanation.kind, 'manual');
});

test('hosting choice excludes retained rows from investment, annual, TCO and costs, and preserves historic quotes', () => {
  const input = { products: [], dimensions: { population: 1500 }, primeLines: [{
    family: 'prime', category: 'hosting', investment_pv: 100, annual_pv: 30,
    investment_pa: 70, annual_pa: 20 }] };
  const simpleCatalog = { parameters: {} };
  assert.equal(hostingIncluded(input), true);
  const historic = calculateQuote(input, simpleCatalog);
  assert.equal(historic.summary.tco5y, 220);
  input.hosting = { included: false };
  const excluded = calculateQuote(input, simpleCatalog);
  assert.equal(excluded.summary.investment, 0);
  assert.equal(excluded.summary.annual, 0);
  assert.equal(excluded.summary.known_costs5y, 0);
  assert.equal(input.primeLines.length, 1);
  input.hosting.included = true;
  assert.deepEqual(calculateQuote(input, simpleCatalog), historic);
  input.primeLines = [];
  assert.throws(() => calculateQuote(input, simpleCatalog), /Hosting prices required/);
});

test('known calculation failures produce safe actionable categories without leaking internal errors', () => {
  assert.deepEqual(calculationError(new Error('SQL core price unconfirmed: enter an investment PV')),
    { code: 'sqlPriceRequired' });
  assert.deepEqual(calculationError(new Error('Missing lower tier for 123.45: 500')),
    { code: 'catalogTierMissing', item: '123.45' });
  assert.equal(calculationError(new Error('Storage operation failed (500)')), null);
});
