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
  assert.ok(radar.signals.length >= 2);
  assert.equal(radar.meta.updatedOn, '2026-09-14');
  const yverdon = radar.signals.find(signal => signal.id === 'yverdon-sey-normes-tic-2026');
  assert.equal(yverdon?.bfsId, 5938);
  assert.equal(yverdon?.level, 'strong');
  assert.match(yverdon?.sourceUrl || '', /yverdon-les-bains\.ch/);
  for (const signal of radar.signals) {
    assert.ok(['strong', 'watch', 'info'].includes(signal.level));
    assert.ok(Number.isInteger(signal.bfsId));
    assert.ok(signal.municipality);
    assert.ok(signal.sourceType);
    assert.ok(signal.sourceLabel);
    assert.ok(['confirmed', 'probable', 'verify'].includes(signal.confidence));
    assert.ok(signal.why);
    assert.equal(signal.updatedBy, "IA d'Axel");
  }
  assert.ok(radar.signals.every(signal => signal.sourceType !== 'Prime'));
});

test('Radar is functional without a new database write path', async () => {
  const html = await read('index.html');
  const runtime = await read('app/prime-communes-news-2.0.js');
  assert.match(html, /id="newsManualRefresh"/);
  assert.match(runtime, /fetch\(DATA_URL/);
  assert.match(runtime, /navigator\.clipboard\.writeText/);
  assert.match(runtime, /CHAT_URL = 'https:\/\/chatgpt\.com\/c\/6a9ef456-9284-83ed-9f8b-5e32c1fdfcc3'/);
  assert.match(runtime, /window\.location\.assign\(CHAT_URL\)/);
  assert.doesNotMatch(runtime, /window\.open/);
  assert.match(runtime, /Ne demande pas une validation supplémentaire/);
  assert.doesNotMatch(runtime, /Ne modifie ni le dépôt ni le site avant mon « feu »/);
  assert.match(runtime, /REFRESH_REQUEST_KEY/);
  assert.match(runtime, /Radar actualisé ✓/);
  assert.match(html, /0,1–1 recharge d’iPhone par veille/);
  assert.match(html, /aria-live="polite"/);
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

test('commune refresh confirms fast updates on desktop and Natel', async () => {
  const html = await read('index.html');
  const css = await read('app/globals.css');
  assert.match(html, /loadData\(manual=false\)/);
  assert.match(html, /À jour ✓ · /);
  assert.match(html, /sync\.dataset\.state='success'/);
  assert.match(html, /\$\('syncReload'\)\.onclick=\(\)=>loadData\(true\)/);
  assert.match(css, /sync-state\[data-state="loading"\]/);
  assert.match(css, /sync-state\[data-state="success"\]/);
  assert.match(css, /content:"À jour ✓"!important/);
});
