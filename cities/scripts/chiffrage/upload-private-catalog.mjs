#!/usr/bin/env node
// Run only after the schema has been approved and applied. Source and parameter
// JSON files must stay outside this public repository.
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';

const [sourcePath, parametersPath] = process.argv.slice(2);
if (!sourcePath || !parametersPath) {
  process.stderr.write('Usage: node upload-private-catalog.mjs <private-catalog.json> <private-parameters.json>\n');
  process.exit(2);
}
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: import.meta.dirname, encoding: 'utf8' }).trim();
for (const path of [sourcePath, parametersPath]) {
  const absolute = resolve(path);
  if (absolute === root || absolute.startsWith(root + sep))
    throw new Error('Private files must be outside the Git checkout');
}
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const parameters = JSON.parse(readFileSync(parametersPath, 'utf8'));
if (!Array.isArray(source.items) || !source.items.length ||
    !source.version || !source.effective_from ||
    !parameters.publisher_rent?.innosolv?.standard ||
    !parameters.publisher_rent?.abacus?.standard ||
    !parameters.publisher_rent?.abacus?.rh_sal_ebanking ||
    !parameters.pce || !parameters.sql || !parameters.oracle ||
    !Number.isFinite(parameters.day_rate)) throw new Error('Incomplete private input');
if (!Array.isArray(parameters.lcm) || parameters.lcm.some(row =>
  row.status === 'draft_unapproved'))
  throw new Error('LCM candidates require explicit commercial review before import');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Server credentials are required');

async function send(table, method, data, query = '') {
  const response = await fetch(`${url}/rest/v1/${table}${query}`, { method,
    headers: { apikey: key, Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Private import failed at ${table} (${response.status})`);
  return response.json();
}

const vendors = [...new Set(source.items.map(item => item.vendor))];
const versions = {};
for (const vendor of [...vendors, 'commercial']) {
  // Versions are inserted inactive. An interrupted upload cannot become an
  // active incomplete tariff. A new version label is required for each run.
  const [row] = await send('chiffrage_catalog_versions', 'POST', {
    vendor, version: vendor === 'abacus' ? source.items.find(item => item.vendor === vendor)
      .catalog_version : source.version,
    effective_from: source.effective_from, active: false
  });
  versions[vendor] = row.id;
}
for (const vendor of vendors) {
  const entries = source.items.filter(item => item.vendor === vendor);
  for (let i = 0; i < entries.length; i += 100)
    await send('chiffrage_catalog_items', 'POST', entries.slice(i, i + 100)
      .map(item => ({ catalog_version_id: versions[vendor], product: item.product,
        item_code: item.item_code, content: item })));
}
await send('chiffrage_parameters', 'POST', {
  catalog_version_id: versions.commercial, content: parameters
});
// Activation is intentionally a distinct, human-reviewed operation. The new
// rows can be checked in private storage before any quote can use them.
process.stdout.write(`Inactive catalog versions uploaded: ${Object.keys(versions).join(', ')}.\n`);
