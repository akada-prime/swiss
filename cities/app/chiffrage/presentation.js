// Presentation contracts only. Never mutate inputs or recalculate saved snapshots.
import { hostingIncluded } from './configuration.js';
import { moduleId } from './standards.js';

export const productNames = { innosolv: 'innosolvcity', abacus: 'Abacus', pce: 'ProConcept' };
export const stableValue = value => JSON.stringify(value, (_, entry) => entry &&
  typeof entry === 'object' && !Array.isArray(entry) ?
  Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry);

export function comparisonRows(variants) {
  const rows = [];
  const add = (group, key, values, kind = 'value', label = null) => {
    rows.push({ group, key, values, kind, label,
      different: new Set(values.map(stableValue)).size > 1 });
  };
  add('scope', 'products', variants.map(({ input }) =>
    [...(input.products ?? [])].sort().map(key => productNames[key] ?? key).join(' · ')));
  const modules = [...new Set(variants.flatMap(row => (row.input.modules ?? []).map(moduleId)))];
  for (const id of modules) {
    const item = variants.flatMap(row => row.catalog.items ?? []).find(item => moduleId(item) === id);
    add('modules', id, variants.map(row => {
      const selected = (row.input.modules ?? []).some(item => moduleId(item) === id);
      const line = row.result?.lines?.find(line => `${line.family}/${line.product}/${line.item_code}` === id);
      return { selected, investment: selected ? line?.investment_pv ?? null : null, annual: selected ? line?.annual_pv ?? null : null };
    }), 'module', item);
  }
  for (const key of ['population', 'licensedPopulation', 'meters', 'taxes', 'employees'])
    add('dimensions', key, variants.map(row => row.input.dimensions?.[key] ?? null));
  for (const [section, keys] of [['sql', ['users', 'cores']], ['oracle', ['full', 'light']],
    ['pce', ['finances', 'salaires']]]) for (const key of keys)
    add('dimensions', `${section}.${key}`, variants.map(row => row.input[section]?.[key] ?? null),
      section === 'pce' ? 'boolean' : 'value');
  const services = [...new Set(variants.flatMap(row => (row.result?.lines ?? [])
    .filter(line => ['prestations_module', 'prestations'].includes(line.family))
    .map(line => `${line.family}/${line.item_code}`)))];
  for (const id of services) {
    const lines = variants.map(row => row.result?.lines?.find(line => `${line.family}/${line.item_code}` === id));
    const sample = lines.find(Boolean);
    const module = variants.flatMap(row => row.catalog.items ?? []).find(item => moduleId(item) === sample?.item_code);
    add('services', id, lines.map(line => line ?
      { days: line.selected_days ?? line.quantity ?? null, amount: line.investment_pv ?? null } : null), 'service', module ?? sample);
  }
  add('hosting', 'hosting', variants.map(row => hostingIncluded(row.input)), 'boolean');
  add('hosting', 'lcm', variants.map(row => row.input.lcm?.selection ?? 'none'));
  for (const [section, keys] of [['projectManagement', ['percent']], ['travel', ['rate', 'percent', 'waived']]])
    for (const key of keys) add('services', `${section}.${key}`, variants.map(row => row.input[section]?.[key] ?? null));
  for (const kind of ['primeLines', 'partners']) {
    const ids = [...new Set(variants.flatMap(row => (row.input[kind] ?? []).map(line => line.item_code || line.label)))];
    for (const id of ids) add('hosting', `${kind}/${id}`, variants.map(row => {
      const line = row.input[kind]?.find(line => (line.item_code || line.label) === id);
      return line ? { investment: line.investment_pv ?? null, annual: line.annual_pv ?? null, quantity: line.quantity ?? 1 } : null;
    }), 'extra', { label: id });
  }
  return rows;
}

export function mapLocation(map, bfsId) {
  const selected = map?.municipalities?.find(row => Number(row.id) === Number(bfsId));
  if (!selected) return null;
  const points = [...selected.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    .map(match => [Number(match[1]), Number(match[2])]);
  if (!points.length) return null;
  const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
  return { selected, x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2, viewBox: map.meta.viewBox.join(' ') };
}

export function verifiedCoat(entities, bfsId) {
  const current = list => (list ?? []).filter(statement => statement.rank !== 'deprecated' &&
    !statement.qualifiers?.P582);
  const matches = Object.values(entities ?? {}).filter(entity => current(entity.claims?.P771)
    .some(statement => Number(statement.mainsnak?.datavalue?.value) === Number(bfsId)));
  if (matches.length !== 1) return null;
  const entity = matches[0];
  const arms = current(entity.claims?.P94);
  const preferred = arms.filter(statement => statement.rank === 'preferred');
  const eligible = preferred.length ? preferred : arms;
  if (eligible.length !== 1) return null;
  const filename = eligible[0].mainsnak?.datavalue?.value;
  if (typeof filename !== 'string' || !/\.(svg|png|jpe?g|webp)$/i.test(filename)) return null;
  return { filename, source: `https://www.wikidata.org/wiki/${entity.id}` };
}
