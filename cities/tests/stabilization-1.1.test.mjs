import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('1.1 state bridge keeps the minimal software view as the real default state', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  assert.match(js, /let logicielsMode = false;/);
  assert.match(js, /logicielsMode = truthyParam\(params\.get\('logiciels'\)\);/);
  assert.match(js, /if \(logicielsMode\) params\.set\('logiciels', '1'\);/);
  assert.match(js, /byId\('reset'\).*?[\s\S]*?logicielsMode = false;/);
});

test('software columns are controlled by one semantic class', async () => {
  const css = await read('app/prime-communes-1.1.5.css');
  assert.match(css, /\.table-wrap\.logiciels-hidden \.erp-cell/);
  assert.match(css, /\.table-wrap\.logiciels-hidden \.modules-cell/);
  assert.match(css, /\.table-wrap\.logiciels-hidden \.hosting-cell/);
  assert.match(css, /th\[data-software-column="hosting"\]/);
  assert.doesNotMatch(css, /:not\(\.logiciels-hidden\)/);
});

test('hosting is appended after Modules by the canonical Communes view', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  assert.match(js, /decorateHostingColumn/);
  assert.match(js, /textContent = 'Hébergeur'/);
  assert.match(js, /dataset\.softwareColumn = 'hosting'/);
  assert.match(js, /modulesHeading\.insertAdjacentElement\('afterend', hostingHeading\)/);
  assert.match(js, /commune\.hosting \|\| '—'/);
});

test('mobile peer filters remain a strict two-column grid', async () => {
  const css = await read('app/prime-communes-1.1.7-mobile.css');
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  for (const id of ['primeOnly', 'eadminOnly', 'districtsToggle', 'logicielsToggle']) {
    assert.match(css, new RegExp(`#${id}`));
  }
});

test('row ranking belongs to commune identity on every viewport', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/prime-communes-1.1.5.css');
  const mobile = await read('app/prime-communes-1.1.7-mobile.css');
  assert.match(js, /commune-rank/);
  assert.match(js, /rowIndex \+ 1/);
  assert.match(css, /\.commune-rank/);
  assert.doesNotMatch(mobile, /commune-cell::before|counter-reset:commune-rank|counter-increment:commune-rank/);
});

test('commune identity owns the canton flag and standalone Canton is hidden', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/prime-communes-1.1.5.css');
  assert.match(js, /commune-identity/);
  assert.match(js, /commune-canton-flag/);
  assert.match(js, /public\/cantons\//);
  assert.match(css, /\.canton-column\s*\{\s*display:none;/);
});

test('roadmap records stabilization and keeps audit in 1.5', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  assert.match(js, /Stabilisation 1\.1/);
  assert.match(js, /const audit = findItem\(items11, 'Audit trail'\)/);
  assert.match(js, /if \(audit\) items15\.prepend\(audit\)/);
});

test('Roadmap infrastructure is a real semantic item, never CSS pseudo-content', async () => {
  const js = await read('app/prime-communes-roadmap-1.2.js');
  const css = await read('app/prime-communes-1.1.5.css');
  assert.match(js, /<strong>Infrastructure Prime<\/strong>/);
  assert.match(js, /serveurs Prime/);
  assert.doesNotMatch(css, /roadmap-items::after/);
});

test('production DB stabilization migration never writes business rows', async () => {
  const sql = await read('supabase/migrations/20260904190000_prime_communes_1_1_stabilization.sql');
  assert.match(sql, /DISABLE TRIGGER gemeinde_profil_audit/);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE/);
  assert.doesNotMatch(sql, /\bUPDATE\s+public\."GemeindeProfil"/i);
  assert.doesNotMatch(sql, /\bINSERT\s+INTO\s+public\."GemeindeProfil"/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\s+public\."GemeindeProfil"/i);
});

test('public live projection remains readable without opening underlying business tables', async () => {
  const sql = await read('supabase/migrations/20260907100418_restore_public_gemeinde_aktuell_projection.sql');
  assert.match(sql, /ALTER VIEW public\."GemeindeAktuell"/);
  assert.match(sql, /security_invoker = false/);
  assert.doesNotMatch(sql, /GRANT SELECT ON public\."GemeindeProfil" TO anon/i);
});

test('current site loads one canonical runtime per view and no SVG map runtime', async () => {
  const html = await read('index.html');
  const loader = await read('app/prime-communes-1.1.js');
  assert.match(html, /<script src="app\/prime-communes-1\.1\.js\?v=\d+"><\/script>/);
  assert.match(loader, /prime-communes-1\.1-base\.js/);
  assert.match(loader, /prime-communes-communes-1\.2\.js/);
  assert.match(loader, /prime-communes-roadmap-1\.2\.js/);
  assert.match(loader, /prime-communes-maplibre-1\.2\.js\?v=\d+/);
  assert.match(loader, /prime-communes-1\.1\.5\.css\?v=\d+/);
  assert.match(loader, /prime-communes-stats-1\.2\.css\?v=\d+/);
  assert.match(loader, /prime-communes-maplibre-1\.2\.css\?v=\d+/);
  assert.doesNotMatch(loader, /prime-communes-map-1\.1\.js/);
  assert.doesNotMatch(loader, /prime-communes-map-1\.1\.css/);
  assert.doesNotMatch(loader, /stats-fix\.css|visual-fix\.css|MutationObserver|ensureLegacyMapProduct/);
  assert.match(html, /id="communesView"/);
  assert.match(html, /id="mapView"/);
  assert.match(html, /id="statsView"/);
  assert.match(html, /id="roadmapView"/);
});

test('Carte 1.2 is MapLibre-only, fits all Switzerland and exposes a national border', async () => {
  const js = await read('app/prime-communes-maplibre-1.2.js');
  const css = await read('app/prime-communes-maplibre-1.2.css');
  assert.match(js, /MAPLIBRE_VERSION = '6\.7\.0'/);
  assert.match(js, /mapLibreModulePromise = import/);
  assert.match(js, /geometryPromise = fetch/);
  assert.match(js, /rasterPreload\.src = RASTER_URL/);
  assert.match(js, /legacyStage\.remove\(\)/);
  assert.match(js, /window\.loadMap = ensureMapLibre/);
  assert.match(js, /<option value="impact">Empreinte Prime<\/option>/);
  assert.match(js, /<option value="integrator">Intégrateur<\/option>/);
  assert.match(js, /<option value="software">Logiciel<\/option>/);
  assert.doesNotMatch(js, /<option value="product">/);
  assert.doesNotMatch(js, /mapProductFilter/);
  assert.match(js, /mapLibreRomandieRatio/);
  assert.match(js, /mapLibreActiveRatio/);
  assert.match(js, /renderMetricMaps/);
  assert.match(js, /ACTIVE_TERRITORY_LABEL = 'Jura · Berne · Vaud · Fribourg \(romands\)'/);
  assert.match(js, /mapAutocomplete/);
  assert.match(js, /municipalities-line/);
  assert.match(js, /municipality-labels/);
  assert.match(js, /cantons-border/);
  assert.match(js, /country-border-casing/);
  assert.match(js, /country-border'/);
  assert.match(js, /buildCountryBorderGeoJSON/);
  assert.match(js, /map\.setMaxBounds\(bounds\)/);
  assert.match(js, /Math\.min\(zoomX, zoomY\)/);
  assert.match(js, /map\.fitBounds\(countryBounds\(\)/);
  assert.match(js, /renderWorldCopies: false/);
  assert.match(js, /closeButton: false/);
  assert.match(js, /RASTER_URL = 'public\/swiss-base\.webp'/);
  assert.match(css, /\.maplibre-stage\{[^}]*height:clamp\(820px,58vw,980px\);min-height:820px/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*\.maplibre-stage\{height:560px;min-height:560px\}/);
  assert.match(css, /maplibre-mini-map/);
  assert.match(css, /metric-swiss-base/);
  assert.match(css, /metric-swiss-active/);
  assert.match(css, /maplibre-progress/);
  assert.match(css, /maplibre-loading/);
  assert.match(css, /swiss-base\.webp/);
  assert.doesNotMatch(css, /!important/);
});

test('Stats 1.2 uses one responsive KPI contract independent of label line count', async () => {
  const css = await read('app/prime-communes-stats-1.2.css');
  assert.match(css, /--pc-kpi-accent:#6ec7ff/);
  assert.match(css, /--pc-kpi-label-lines:2/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*--pc-kpi-label-lines:3/);
  assert.match(css, /\.stats-kpi>span/);
  assert.match(css, /\.stats-kpi>strong/);
  assert.doesNotMatch(css, /#statsMunicipalities/);
  assert.doesNotMatch(css, /#statsCompetitor/);
  assert.doesNotMatch(css, /nth-child/);
  assert.doesNotMatch(css, /:has\(/);
});