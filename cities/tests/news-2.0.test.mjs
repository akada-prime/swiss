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
  assert.match(html, /prime-communes-1\.1\.js\?v=27/);
  assert.match(loader, /prime-communes-1\.1-base\.js\?v=12/);
  assert.match(loader, /prime-communes-news-2\.0\.js\?v=10/);
  assert.match(loader, /prime-communes-news-2\.0\.css\?v=11/);
  assert.match(loader, /prime-communes-roadmap-2\.0\.css\?v=3/);
  assert.match(html, /class="news-beta-note"/);
  assert.match(html, /class="news-nav-badge">BÊTA/);
  assert.doesNotMatch(html, /news-nav-dot/);
  assert.match(html, /La source publique primaire reste la référence/);
  assert.ok(html.indexOf('news-beta-note') < html.indexOf('news-intro'));
  assert.match(html, /Prime Communes · version 2\.0\.5/);
});

test('all five view headers share one responsive typography contract', async () => {
  const html = await read('index.html');
  const globals = await read('app/globals.css');
  const news = await read('app/prime-communes-news-2.0.css');
  const roadmap = await read('app/prime-communes-roadmap-2.0.css');
  assert.equal((html.match(/view-intro"/g) || []).length, 5);
  assert.equal((html.match(/view-intro-copy"/g) || []).length, 5);
  assert.match(globals, /\.view-intro-copy\{[^}]*font-size:16px/);
  assert.match(globals, /@media\(max-width:680px\)[\s\S]*\.view-intro-copy\{[^}]*font-size:16px/);
  assert.doesNotMatch(news, /\.news-intro(?:-copy)?\s*\{/);
  assert.doesNotMatch(roadmap, /\.roadmap-intro(?:-copy)?\s*\{/);
  assert.match(globals, /\.workspace\{padding-top:50px\}/);
  assert.match(globals, /@media\(max-width:680px\)[\s\S]*\.workspace\{padding-top:26px\}/);
  assert.match(news, /\.news-nav-badge\{/);
});

test('2.0.3 interprets every signal without blurring fact, deduction and Prime reading', async () => {
  const runtime = await read('app/prime-communes-news-2.0.js');
  const css = await read('app/prime-communes-news-2.0.css');
  const radar = JSON.parse(await read('public/data/news-radar-v1.json'));
  const analysis = JSON.parse(await read('public/data/news-analysis-v1.json'));
  assert.equal(analysis.meta.version, '2.0.4-v1');
  assert.equal(analysis.meta.mode, 'human-validation');
  assert.match(runtime, /ANALYSIS_URL = 'public\/data\/news-analysis-v1\.json/);
  assert.match(runtime, /1 · Fait public/);
  assert.match(runtime, /2 · Déduction documentée/);
  assert.match(runtime, /3 · Lecture Prime/);
  assert.match(runtime, /Communes.*Territoires.*Produits.*Intégrateurs/s);
  assert.match(css, /\.news-proof-line/);
  assert.match(css, /@media\(max-width:680px\).*\.news-affected\{grid-template-columns:1fr\}/s);
  assert.deepEqual(
    analysis.items.map(item => item.signalId).sort(),
    radar.signals.map(signal => signal.id).sort()
  );
  for (const item of analysis.items) {
    assert.ok(item.interpretation.change);
    assert.ok(item.interpretation.deduction);
    assert.ok(item.interpretation.primeReading);
    for (const key of ['municipalities', 'territories', 'products', 'integrators']) {
      assert.ok(Array.isArray(item.interpretation.affected[key]));
      assert.ok(item.interpretation.affected[key].length >= 1);
    }
  }
});

test('2.0.4 keeps qualification lightweight, local and tied to its source signal', async () => {
  const html = await read('index.html');
  const runtime = await read('app/prime-communes-news-2.0.js');
  const analysis = JSON.parse(await read('public/data/news-analysis-v1.json'));
  assert.match(html, /Qualification légère · 2\.0\.4/);
  assert.match(html, /id="newsForecastGross"/);
  assert.match(html, /id="newsForecastWeighted"/);
  assert.match(runtime, /QUALIFICATION_KEY/);
  assert.match(runtime, /localStorage\.setItem\(QUALIFICATION_KEY/);
  assert.match(runtime, /data-qualification-form/);
  assert.match(runtime, /estimatedValue/);
  assert.match(runtime, /probability/);
  assert.doesNotMatch(runtime, /fetch\([^)]*qualification|rpc\/.*qualification/i);
  for (const item of analysis.items) {
    const proposal = item.qualificationProposal;
    assert.ok(['to_qualify', 'watch', 'act', 'discard'].includes(proposal.decision));
    assert.ok(proposal.nextAction);
    assert.equal(proposal.probability, null);
    assert.equal(proposal.estimatedValue, null);
    assert.match(proposal.basis, /valider humainement/i);
  }
});

test('2.0.2 publishes a sourced story without mixing facts and interpretation', async () => {
  const html = await read('index.html');
  const runtime = await read('app/prime-communes-news-2.0.js');
  const css = await read('app/prime-communes-news-2.0.css');
  const data = JSON.parse(await read('public/data/news-stories-v1.json'));
  assert.equal(data.meta.version, '2.0.2-v1');
  assert.equal(data.meta.mode, 'editorial');
  assert.match(html, /Une commune, une histoire · 2\.0\.2/);
  assert.match(html, /id="newsStoryFeed"/);
  assert.match(runtime, /STORY_URL = 'public\/data\/news-stories-v1\.json/);
  assert.match(runtime, /data-story-angle/);
  assert.match(runtime, /Angle copié ✓/);
  assert.match(css, /\.story-reading-grid/);
  assert.match(css, /@media\(max-width:680px\).*\.story-angle-tabs\{grid-template-columns:1fr\}/s);
  const story = data.stories.find(item => item.id === 'avenches-le-noirmont-prime');
  assert.equal(story?.bfsId, 5451);
  assert.equal(story?.municipality, 'Avenches');
  assert.equal(story?.counterpart, 'Le Noirmont');
  assert.ok(story?.facts.length >= 3);
  assert.ok(story?.angles.length >= 3);
  assert.ok(story?.primeFact?.text);
  assert.ok(story?.axelReading?.text);
  const publicSources = story?.sources.filter(source => source.type === 'Source publique') || [];
  assert.ok(publicSources.length >= 2);
  assert.ok(publicSources.every(source => source.url.startsWith('https://')));
  assert.ok(story?.facts.every(fact => publicSources.some(source => source.id === fact.sourceId)));
});

test('Radar data distinguishes level, provenance, confidence and municipality', async () => {
  const radar = JSON.parse(await read('public/data/news-radar-v1.json'));
  assert.equal(radar.meta.mode, 'editorial');
  assert.ok(radar.signals.length >= 3);
  assert.equal(radar.meta.updatedOn, '2026-09-14');
  const yverdon = radar.signals.find(signal => signal.id === 'yverdon-sey-normes-tic-2026');
  assert.equal(yverdon?.bfsId, 5938);
  assert.equal(yverdon?.level, 'strong');
  assert.match(yverdon?.sourceUrl || '', /yverdon-les-bains\.ch/);
  const gland = radar.signals.find(signal => signal.id === 'gland-sit-qgis-cartolacote-2026');
  assert.equal(gland?.level, 'watch');
  assert.ok(gland?.tags.includes('Client Prime'));
  assert.ok(gland?.tags.includes('À confirmer en interne'));
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
  assert.match(runtime, /n'exclus jamais un signal uniquement parce que la commune est cliente Prime/);
  assert.match(runtime, /publie-le avec une réserve explicite/);
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

test('roadmap preserves old phases while completing NEWS 2.0', async () => {
  const html = await read('index.html');
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
  assert.match(roadmap, /2\.0 — NEWS! · Faire parler les communes · terminé/);
  assert.match(roadmap, /2\.0\.5 — Portrait communal · livré/);
  assert.match(html, /journey-understand journey-done/);
  assert.match(html, /history-stage completed-20/);
  assert.match(html, /<span class="roadmap-done">Terminé ✓<\/span>/);
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
