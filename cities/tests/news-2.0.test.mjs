import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('NEWS is a first-class deep-linked view', async () => {
  const html = await read('index.html');
  const bridge = await read('app/prime-communes-1.1-base.js');
  const loader = await read('app/prime-communes-1.1.js');
  assert.match(html, /data-view="news"/);
  assert.match(html, /id="newsView"/);
  assert.match(bridge, /'communes', 'map', 'stats', 'news', 'roadmap'/);
  assert.match(bridge, /byId\('newsView'\)\.hidden = next !== 'news'/);
  assert.match(loader, /prime-communes-news-2\.0\.js/);
  assert.match(loader, /prime-communes-news-2\.0\.css/);
  assert.match(html, /Prime Communes · version 2\.0\.1/);
});

test('Radar data distinguishes level, provenance, confidence and municipality', async () => {
  const radar = JSON.parse(await read('public/data/news-radar-v1.json'));
  assert.equal(radar.meta.mode, 'editorial');
  assert.ok(radar.signals.length >= 5);
  for (const signal of radar.signals) {
    assert.ok(['strong', 'watch', 'info'].includes(signal.level));
    assert.ok(Number.isInteger(signal.bfsId));
    assert.ok(signal.municipality);
    assert.ok(signal.sourceType);
    assert.ok(signal.sourceLabel);
    assert.ok(['confirmed', 'probable', 'verify'].includes(signal.confidence));
    assert.ok(signal.why);
  }
});

test('Radar is functional without a new database write path', async () => {
  const runtime = await read('app/prime-communes-news-2.0.js');
  assert.match(runtime, /fetch\(DATA_URL/);
  assert.match(runtime, /data-news-level/);
  assert.match(runtime, /data-news-bfs/);
  assert.match(runtime, /openDrawer\(municipality\)/);
  assert.doesNotMatch(runtime, /method:\s*['"]POST|method:\s*['"]PATCH|method:\s*['"]DELETE/);
  assert.doesNotMatch(runtime, /SUPABASE|rpc\//i);
});

test('roadmap preserves old phases while making NEWS 2.0 current', async () => {
  const roadmap = await read('Prime-Communes-Roadmap.md');
  for (const item of [
    'Qualification légère et forecast',
    'Authentification · SSO · rôles · RLS',
    'Audit trail et temporalité métier',
    'Données financières sécurisées',
    'Historique Delimo',
    'Mouvements de marché',
    'Carte et statistiques temporelles',
    'Collecte et intelligence Web'
  ]) assert.match(roadmap, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
