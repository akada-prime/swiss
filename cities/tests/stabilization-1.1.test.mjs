import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('1.1 bridge keeps the minimal software view as the real default state', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  assert.match(js, /let logicielsMode = false;/);
  assert.match(js, /logicielsMode = truthyParam\(params\.get\('logiciels'\)\);/);
  assert.match(js, /if \(logicielsMode\) params\.set\('logiciels', '1'\);/);
  assert.match(js, /byId\('reset'\).*?[\s\S]*?logicielsMode = false;/);
});

test('software columns are controlled by one semantic class, not inverted CSS hacks', async () => {
  const css = await read('app/prime-communes-1.1.5.css');
  assert.match(css, /\.table-wrap\.logiciels-hidden \.erp-cell/);
  assert.doesNotMatch(css, /:not\(\.logiciels-hidden\)/);
});

test('mobile peer filters remain a strict two-column grid', async () => {
  const css = await read('app/prime-communes-1.1.7-mobile.css');
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  for (const id of ['primeOnly', 'eadminOnly', 'districtsToggle', 'logicielsToggle']) {
    assert.match(css, new RegExp(`#${id}`));
  }
});

test('roadmap records stabilization and keeps audit in 1.5', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  assert.match(js, /Stabilisation 1\.1/);
  assert.match(js, /const audit = findItem\(items11, 'Audit trail'\)/);
  assert.match(js, /if \(audit\) items15\.prepend\(audit\)/);
});

test('production DB stabilization migration never writes business rows', async () => {
  const sql = await read('supabase/migrations/20260904190000_prime_communes_1_1_stabilization.sql');
  assert.match(sql, /DISABLE TRIGGER gemeinde_profil_audit/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE/);
  assert.doesNotMatch(sql, /\bUPDATE\s+public\."GemeindeProfil"/i);
  assert.doesNotMatch(sql, /\bINSERT\s+INTO\s+public\."GemeindeProfil"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\s+public\."GemeindeProfil"/i);
});

test('current site loads one canonical stylesheet per UI layer', async () => {
  const html = await read('index.html');
  const loader = await read('app/prime-communes-1.1.js');
  assert.match(html, /<script src="app\/prime-communes-1\.1\.js\?v=\d+"><\/script>/);
  assert.match(loader, /prime-communes-1\.1-base\.js/);
  assert.match(loader, /prime-communes-map-1\.1\.js/);
  assert.match(loader, /prime-communes-maplibre-1\.2\.js\?v=\d+/);
  assert.match(loader, /prime-communes-map-1\.1\.css\?v=\d+/);
  assert.match(loader, /prime-communes-stats-1\.2\.css\?v=\d+/);
  assert.match(loader, /prime-communes-maplibre-1\.2\.css\?v=\d+/);
  assert.doesNotMatch(loader, /stats-fix\.css/);
  assert.doesNotMatch(loader, /visual-fix\.css/);
  assert.doesNotMatch(loader, /MutationObserver/);
  assert.doesNotMatch(loader, /ensureLegacyMapProduct/);
  assert.match(html, /id="communesView"/);
  assert.match(html, /id="mapView"/);
  assert.match(html, /id="statsView"/);
  assert.match(html, /id="roadmapView"/);
});

test('legacy SVG bridge stays available only as the stable geometry/mobile fallback layer', async () => {
  const js = await read('app/prime-communes-map-1.1.js');
  const css = await read('app/prime-communes-map-1.1.css');
  assert.match(js, /two-finger pinch/);
  assert.match(js, /clampViewBox/);
  assert.match(js, /focusCommune/);
  assert.match(css, /touch-action:none!important/);
});

test('Carte 1.2 cannot remove legacy controls needed by Communes data loading', async () => {
  const js = await read('app/prime-communes-maplibre-1.2.js');
  assert.match(js, /const legacyControls = toolbar\.querySelector\('\.map-controls'\)/);
  assert.match(js, /legacyControls\.hidden = true/);
  assert.doesNotMatch(js, /toolbar\.querySelector\('\.map-controls'\)\?\.remove\(\)/);
});

test('Carte 1.2 exposes the validated professional map tools and Swiss KPI silhouettes', async () => {
  const js = await read('app/prime-communes-maplibre-1.2.js');
  const css = await read('app/prime-communes-maplibre-1.2.css');
  assert.match(js, /MAPLIBRE_VERSION = '6\.7\.0'/);
  assert.match(js, /legacyStage\.hidden = true/);
  assert.match(js, /mapLibreRomandieRatio/);
  assert.match(js, /mapLibreActiveRatio/);
  assert.match(js, /renderMetricMaps/);
  assert.match(js, /ACTIVE_TERRITORY_LABEL = 'Jura · Berne · Vaud · Fribourg \(romands\)'/);
  assert.match(js, /mapAutocomplete/);
  assert.match(js, /suggestionMatches/);
  assert.match(js, /nf\.format\(commune\.expectedPopulation\)/);
  assert.match(js, /mapCantonFilter/);
  assert.match(js, /mapViewFilter/);
  assert.match(js, /municipalities-line/);
  assert.match(js, /municipality-labels/);
  assert.match(js, /cantons-border/);
  assert.match(js, /map\.setMaxBounds\(bounds\)/);
  assert.match(js, /renderWorldCopies: false/);
  assert.match(js, /if \(!bounds\) bounds = romandieBounds\(\)/);
  assert.match(js, /closeButton: false/);
  assert.match(js, /public\/swiss-base\.webp/);
  assert.match(js, /lv95ToWgs84/);
  assert.match(js, /openDrawer\(commune\)/);
  assert.doesNotMatch(js, /mapEngineCurrent/);
  assert.doesNotMatch(js, /mapEngineMapLibre/);
  assert.match(css, /grid-template-columns:1fr;/);
  assert.match(css, /maplibre-mini-map/);
  assert.match(css, /metric-swiss-base/);
  assert.match(css, /metric-swiss-active/);
  assert.match(css, /maplibre-progress/);
  assert.match(css, /map-autocomplete/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /maplibre-stage/);
  assert.doesNotMatch(css, /!important/);
});

test('Stats 1.2 uses one KPI contract independent of label line count', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(css, /--pc-kpi-accent:#6ec7ff/);
  assert.match(css, /--pc-kpi-label-lines:3/);
  assert.match(css, /\.stats-kpi>span/);
  assert.match(css, /\.stats-kpi>strong/);
  assert.doesNotMatch(css, /#statsMunicipalities/);
  assert.doesNotMatch(css, /#statsCompetitor/);
  assert.doesNotMatch(css, /nth-child/);
  assert.doesNotMatch(css, /:has\(/);
});
