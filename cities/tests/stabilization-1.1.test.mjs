import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('1.1 state bridge keeps the minimal software view as the real default state', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  assert.match(js, /let logicielsMode = false;/);
  assert.match(js, /logicielsMode = truthyParam\(params\.get\('logiciels'\)\);/);
  assert.match(js, /if \(logicielsMode\) params\.set\('logiciels', '1'\);/);
  assert.match(js, /byId\('reset'\).*?[\s\S]*?logicielsMode = false;/);
});

test('software columns are controlled by one semantic class', async () => {
  const css = await read('app/styles/components.css');
  assert.doesNotMatch(css, /\.table-wrap\.logiciels-hidden \.ecosystem-start/);
  assert.doesNotMatch(css, /\.table-wrap\.logiciels-hidden \.metier-cell/);
  assert.match(css, /\.table-wrap\.logiciels-hidden \.erp-cell/);
  assert.match(css, /\.table-wrap\.logiciels-hidden \.modules-cell/);
  assert.match(css, /\.table-wrap\.logiciels-hidden \.hosting-cell/);
  assert.match(css, /th\[data-software-column="hosting"\]/);
  assert.doesNotMatch(css, /:not\(\.logiciels-hidden\)/);
  assert.match(css, /--pc-table-secondary/);
  assert.match(css, /\.cell-empty/);
  assert.doesNotMatch(css, /\.hosting-cell\s*\{[^}]*color:/);
});

test('hosting is appended after Modules by the canonical Communes view', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  assert.match(js, /decorateHostingColumn/);
  assert.match(js, /textContent = t\('common\.hosting'\)/);
  assert.match(js, /dataset\.softwareColumn = 'hosting'/);
  assert.match(js, /modulesHeading\.insertAdjacentElement\('afterend', hostingHeading\)/);
  assert.match(js, /cell-empty/);
  assert.match(js, /normalizeEmptyCells/);
});

test('2.0.5 opens a sourced commune portrait from the row number without AI or eager loading', async () => {
  const html = await read('index.html');
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/styles/components.css');
  assert.match(html, /id="portraitRoot"/);
  assert.match(js, /const rank = document\.createElement\('button'\)/);
  assert.match(js, /event\.stopPropagation\(\)/);
  assert.match(js, /openCommunePortrait\(commune\)/);
  assert.match(js, /row\.onclick = \(\) => openCommunePortrait\(commune\)/);
  assert.doesNotMatch(js, /MutationObserver/);
  assert.match(js, /class="portrait-edit"/);
  assert.match(js, /openDrawer\(commune\)/);
  assert.doesNotMatch(js, /closeMobileSearch\(\);\s*openCommunePortrait\(commune\)/);
  assert.match(js, /https:\/\/fr\.wikipedia\.org\/w\/api\.php/);
  assert.match(js, /https:\/\/www\.wikidata\.org\/w\/api\.php/);
  assert.match(js, /origin: '\*'/);
  assert.match(js, /WIKIPEDIA_CACHE_TTL/);
  assert.match(js, /wikipediaCandidateScore/);
  assert.match(js, /claims\?\.P771/);
  assert.match(js, /t\('communes\.ofsMatched'/);
  assert.match(js, /t\('communes\.wikiFallback'/);
  assert.match(js, /t\('communes\.noAi'\)/);
  assert.doesNotMatch(js, /openai|chatgpt|anthropic/i);
  assert.match(css, /\.portrait-backdrop\{/);
  assert.match(css, /html\.portrait-open,body\.portrait-open\{overflow:hidden\}/);
  assert.match(css, /\.portrait-hint\{/);
  assert.match(css, /\.portrait-edit\{/);
});

test('the communal portrait shows known systems and multiline notes without empty fields', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/styles/components.css');
  const source = js.slice(js.indexOf('function portraitSystemMarkup('), js.indexOf('async function openCommunePortrait('));
  const renderSystem = runInNewContext(`${source}\nportraitSystemMarkup`, {
    t: key => ({ 'common.integrator':'Intégrateur','communes.businessSolution':'Métier','communes.hosting':'Hébergeur','common.modules':'Modules','communes.relationship':'Relation','communes.salesStatus':'Statut','communes.systemProfile':'Profil système','communes.system':'Système communal','common.notes':'Notes','communes.systemEmpty':'Aucune information système renseignée' }[key] || key),
    esc: value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
  });
  const rich = renderSystem({ integrator: 'Prime', software: 'innosolvcity', erp: 'Abacus', hosting: 'AZ', products: ['eAdmin'], isPrime: true, notes: 'Ligne 1\n<script>alert(1)</script>' });
  for (const value of ['Système communal', 'Prime', 'innosolvcity', 'Abacus', 'AZ', 'eAdmin', 'Client Prime', 'Ligne 1\n&lt;script&gt;']) assert.ok(rich.includes(value));
  assert.ok(rich.indexOf('portrait-system-facts') < rich.indexOf('portrait-system-notes'));
  const notesOnly = renderSystem({ products: [], notes: 'Information libre' });
  assert.match(notesOnly, /portrait-system-notes/);
  assert.doesNotMatch(notesOnly, /portrait-system-facts/);
  const sparse = renderSystem({ products: [], salesStatus: 'none' });
  assert.match(sparse, /Aucune information système renseignée/);
  assert.doesNotMatch(sparse, /<dt>|portrait-system-notes/);
  assert.ok(js.indexOf('portrait-wikipedia') < js.indexOf('${portraitSystemMarkup(commune)}'));
  assert.match(css, /\.portrait-system-notes p\{[^}]*white-space:pre-wrap/);
  assert.match(css, /@media\(max-width:680px\)[\s\S]*\.portrait-system\{padding:17px\}/);
});

test('mobile peer filters remain a strict two-column grid', async () => {
  const css = await read('app/styles/responsive.css');
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  for (const id of ['primeOnly', 'eadminOnly', 'districtsToggle', 'logicielsToggle']) {
    assert.match(css, new RegExp(`#${id}`));
  }
});

test('Delimo is a premium control mode, not a fourth statistic or ordinary filter', async () => {
  const html = await read('index.html');
  const css = await read('app/styles/product-assets.css');
  const styles = await read('app/styles/main.css');
  const bridge = await read('app/prime-communes-1.1-base.js');
  assert.match(html, /app\/styles\/main\.css/);
  assert.match(styles, /product-assets\.css/);
  assert.doesNotMatch(bridge, /createElement\(['"]link|product-assets\.css\?v=/);
  assert.match(html, /class="delimo-control" id="issuesCard"/);
  assert.match(html, /Outil de contrôle · Delimo/);
  assert.match(html, /id="ofsAction"><!--i18n:page\.029-->Ouvrir le contrôle/);
  assert.match(html, /public\/assets\/delimo\/favicon\.ico/);
  assert.doesNotMatch(html, /class="kpi-card alert-card"/);
  const kpis = html.match(/<section class="kpi-grid">([\s\S]*?)<\/section>/)?.[1] || '';
  assert.doesNotMatch(kpis, /issuesCard|delimo-control/);
  assert.match(css, /\.kpi-grid\s*\{\s*grid-template-columns: 1\.35fr 1fr 1fr;/);
  assert.match(css, /\.delimo-control\.ofs-active/);
  assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.delimo-control-action/);
  assert.match(bridge, /setAttribute\('aria-pressed', String\(ofsMode\)\)/);
  assert.match(bridge, /t\('common\.reloadMarket'\)/);
  assert.match(await read('app/core/runtime.js'), /t\('common\.watchCount'/);
});

test('language markets always filter while Territoire only reveals optional columns', async () => {
  const html = await read('index.html');
  const bridge = await read('app/prime-communes-1.1-base.js');
  assert.doesNotMatch(html, /id="territoryFilters"[^>]*hidden/);
  assert.match(html, /id="districtsToggle"[^>]*><!--i18n:page\.037-->Territoire<\/button>/);
  assert.match(html, /data-market="Welsch"/);
  assert.match(html, /data-market="Uf Tüütsch"/);
  assert.match(html, /data-market="Ticino"/);
  assert.match(bridge, /decorateTerritoryControls/);
  assert.match(bridge, /controls\.hidden = false/);
  assert.match(bridge, /validMarkets\.has\(params\.get\('market'\)\)/);
  assert.doesNotMatch(bridge, /Boolean\(marketOnly\)/);
});

test('commune search ignores accents and iPhone form controls do not zoom', async () => {
  const runtime = await read('app/core/runtime.js');
  const mobile = await read('app/styles/responsive.css');
  assert.match(runtime, /normalizeSearchText/);
  assert.match(runtime, /normalize\('NFD'\)/);
  assert.match(runtime, /replace\(\/\[\\u0300-\\u036f\]\//);
  assert.match(mobile, /\.filters input,[\s\S]*font-size:16px/);
});

test('commune save keeps the drawer editable after a rejected key and refreshes it after success', async () => {
  const bridge = await read('app/prime-communes-1.1-base.js');
  const css = await read('app/styles/components.css');
  const html = await read('index.html');
  assert.match(bridge, /t\('communes\.invalidKey'\)/);
  assert.match(bridge, /openDrawer\(refreshed\)/);
  assert.match(bridge, /t\('common\.saved'\)/);
  const save = bridge.slice(bridge.indexOf('async function saveDrawerProfile('), bridge.indexOf('// Full editable non-OFS ecosystem.'));
  assert.ok(save.indexOf("button.textContent = t('common.saving')") < save.indexOf('let response = await send(editKey)'));
  assert.ok(save.indexOf('syncUrl(false)') < save.indexOf('await loadData()'));
  assert.match(save, /savedButton\.textContent = t\('common\.saved'\);\s*savedButton\.disabled = true/);
  assert.match(save, /finally \{\s*button\.disabled = false;\s*button\.textContent = t\('common\.record'\)/);
  assert.match(bridge, /addEventListener\('input', resetSaveButton\)/);
  assert.match(bridge, /addEventListener\('change', resetSaveButton\)/);
  assert.match(css, /\.save-button\[data-saved="true"\]\{cursor:default;opacity:1\}/);
  assert.match(html, /<a href="\.\/" aria-label="Retour à l’accueil Prime Communes"><img src="public\/prime-communes-helvetia\.webp"/);
  assert.doesNotMatch(bridge, /setTimeout\(\(\) => openDrawer\(refreshed\)/);
});

test('a rejected save retains edits; a successful retry syncs filters before refreshing the selected commune', async () => {
  const bridge = await read('app/prime-communes-1.1-base.js');
  const save = bridge.slice(bridge.indexOf('async function saveDrawerProfile('), bridge.indexOf('// Full editable non-OFS ecosystem.'));
  const originalButton = { disabled: false, textContent: 'Enregistrer les informations' };
  const savedButton = { disabled: false, textContent: '', dataset: {} };
  const hosting = { value: 'Ofisa' };
  const nodes = {
    drawerSave: originalButton, drawerHosting: hosting, drawerNotes: { value: 'Saisie conservée' },
    drawerPrimeClient: { checked: false }, drawerIntegrator: { value: '' }, drawerSoftware: { value: '' }, drawerErp: { value: '' }
  };
  const values = new Map([['primeCommunesEditKey', 'bad-key']]);
  const events = [];
  let reply = 403;
  const context = {
    t: key => ({ 'common.saving': 'Enregistrement…', 'common.saved': 'Enregistré ✓', 'common.record': 'Enregistrer les informations', 'communes.invalidKey': 'Clé incorrecte', 'communes.saveError': 'Erreur' }[key] || key),
    byId: id => nodes[id], document: { documentElement: { lang: 'fr' }, querySelectorAll: () => [], querySelector: selector => selector === '.drawer' ? { scrollTop: 0 } : null },
    window: { scrollY: 0, scrollTo: () => {}, prompt: () => 'good-key' },
    sessionStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
    fetch: async () => ({ ok: reply === 200, status: reply, text: async () => 'invalid key' }),
    SUPABASE_URL: 'https://example.invalid', SUPABASE_KEY: 'public', EDIT_RPC: 'save',
    saveStatus: message => events.push(message), syncUrl: () => events.push('filters synced'),
    loadData: async () => { events.push('data loaded'); context.all = [{ id: 42, hosting: 'Ofisa' }]; },
    openDrawer: row => { events.push(`opened ${row.id}`); nodes.drawerSave = savedButton; context.document.querySelector = selector => selector === '.drawer' ? { scrollTop: 0 } : null; },
    all: [], console: { error: () => {} }
  };
  const saveProfile = runInNewContext(`${save}\nsaveDrawerProfile`, context);
  await saveProfile({ id: 42 });
  assert.equal(hosting.value, 'Ofisa');
  assert.equal(nodes.drawerNotes.value, 'Saisie conservée');
  assert.equal(originalButton.textContent, 'Enregistrer les informations');
  assert.equal(values.has('primeCommunesEditKey'), false);
  reply = 200;
  await saveProfile({ id: 42 });
  assert.ok(events.indexOf('filters synced') < events.indexOf('data loaded'));
  assert.ok(events.indexOf('data loaded') < events.indexOf('opened 42'));
  assert.equal(savedButton.textContent, 'Enregistré ✓');
  assert.equal(savedButton.disabled, true);
});

test('the editable hosting field is saved through the key-protected catalogue RPC', async () => {
  const bridge = await read('app/prime-communes-1.1-base.js');
  const migration = await read('supabase/migrations/20260922193000_edit_commune_hosting.sql');
  assert.match(bridge, /id="drawerHosting"/);
  assert.match(bridge, /p_hosting: byId\('drawerHosting'\)\?\.value \|\| null/);
  assert.match(bridge, /save_commune_profile_v12/);
  assert.match(migration, /Clé d''édition invalide/);
  assert.match(migration, /Hébergeur inconnu/);
  assert.match(migration, /hosting_id = v_hosting_id/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_commune_profile_v12/);
});

test('Systèmes keeps Intégrateur and Métier visible while extended details stay optional', async () => {
  const bridge = await read('app/prime-communes-1.1-base.js');
  const desktop = await read('app/styles/components.css');
  const mobile = await read('app/styles/responsive.css');
  assert.match(bridge, /button\.textContent = t\('common\.systems'\)/);
  assert.match(bridge, /t\('communes\.systemsTitle'\)/);
  assert.doesNotMatch(desktop, /logiciels-hidden \.ecosystem-start/);
  assert.doesNotMatch(desktop, /logiciels-hidden \.metier-cell/);
  assert.match(mobile, /#logicielsToggle,[\s\S]*#issuesOnly\{/);
});

test('Natel header keeps all views and commune refresh reachable', async () => {
  const css = await read('app/styles/responsive.css');
  const rebuild = await read('app/styles/responsive.css');
  assert.match(rebuild, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(rebuild, /\[hidden\] \{ display: none !important; \}/);
  assert.match(css, /content:attr\(data-mobile-label\)/);
  assert.match(rebuild, /min-width: 116px/);
});

test('deep-linked views are selected before the first paint', async () => {
  const html = await read('index.html');
  const bridge = await read('app/prime-communes-1.1-base.js');
  assert.match(html, /document\.documentElement\.dataset\.initialView = initialView/);
  assert.match(html, /data-initial-view="news"\] #newsView/);
  assert.match(html, /data-initial-view\]:not\(\[data-initial-view="communes"\]\) #communesView/);
  assert.match(bridge, /removeAttribute\('data-initial-view'\)/);
});

test('commune refresh never flashes in NEWS or other views', async () => {
  const html = await read('index.html');
  const bridge = await read('app/prime-communes-1.1-base.js');
  assert.match(html, /id="syncReload"[^>]*hidden/);
  assert.match(bridge, /byId\('syncReload'\)\.hidden = next !== 'communes'/);
  assert.match(bridge, /\n  restoreFromUrl\(\);\n\}\)\(\);/);
});

test('row ranking belongs to commune identity on every viewport', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/styles/components.css');
  const mobile = await read('app/styles/responsive.css');
  assert.match(js, /commune-rank/);
  assert.match(js, /rowIndex \+ 1/);
  assert.match(css, /\.commune-rank/);
  assert.doesNotMatch(mobile, /commune-cell::before|counter-reset:commune-rank|counter-increment:commune-rank/);
});

test('commune identity owns the canton flag and standalone Canton is hidden', async () => {
  const js = await read('app/prime-communes-communes-1.2.js');
  const css = await read('app/styles/components.css');
  assert.match(js, /commune-identity/);
  assert.match(js, /commune-canton-flag/);
  assert.match(js, /public\/cantons\//);
  assert.match(css, /\.canton-column\s*\{\s*display:none;/);
});

test('roadmap records stabilization and moves audit to technical 2.5', async () => {
  const js = await read('app/prime-communes-1.1-base.js');
  const html = await read('index.html');
  assert.match(html, /Stabilisation 1\.1/);
  assert.match(html, /<span class="roadmap-version">2\.5<\/span>/);
  assert.match(html, /Audit trail et temporalité/);
  assert.match(html, /<span class="roadmap-version">1\.5<\/span>/);
  assert.match(html, /Mettre en perspective/);
  assert.doesNotMatch(js, /items15|stage15/);
});

test('Roadmap completed stages keep their colors, checks and one-line status badges', async () => {
  const css = await read('app/styles/views/roadmap.css');
  assert.doesNotMatch(css, /journey-done\{opacity:/);
  assert.match(css, /journey-done::before\{content:"✓"/);
  assert.match(css, /journey-bridge\{border-color:/);
  assert.match(css, /\.roadmap-done\{[^}]*display:inline-flex/);
  assert.match(css, /\.roadmap-done\{[^}]*white-space:nowrap/);
  assert.match(css, /\.roadmap-done\{[^}]*color:#7bddb7/);
});

test('Roadmap styling is canonical and absent from legacy stabilization layers', async () => {
  const loader = await read('app/styles/main.css');
  const legacy = `${await read('app/styles/foundation.css')}\n${await read('app/styles/components.css')}\n${await read('app/styles/components.css')}`;
  const css = await read('app/styles/views/roadmap.css');
  assert.match(loader, /views\/roadmap\.css/);
  assert.doesNotMatch(legacy, /roadmap-|journey-/);
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.completed-15\{/);
  assert.match(css, /\.completed-20\{/);
  assert.match(css, /\.history-stage\.current\{/);
});

test('Roadmap infrastructure is a real semantic item, never CSS pseudo-content', async () => {
  const html = await read('index.html');
  const css = await read('app/styles/components.css');
  assert.match(html, /<strong><!--i18n:page\.204-->Infrastructure Prime<\/strong>/);
  assert.match(html, /serveurs Prime/);
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
  const runtime = await read('app/main.js');
  const styles = await read('app/styles/main.css');
  assert.match(html, /<script type="module" src="app\/main\.js"><\/script>/);
  assert.equal((html.match(/<script type="module"/g) || []).length, 1);
  assert.match(runtime, /prime-communes-maplibre-1\.2\.js/);
  assert.match(runtime, /prime-communes-communes-1\.2\.js/);
  assert.match(runtime, /prime-communes-news-2\.0\.js/);
  assert.match(runtime, /prime-communes-stories-2\.0\.js/);
  assert.match(styles, /views\/map\.css/);
  assert.match(styles, /views\/stats\.css/);
  assert.doesNotMatch(html, /prime-communes-1\.1\.js|const fmt=/);
  assert.match(html, /id="communesView"/);
  assert.match(html, /id="mapView"/);
  assert.match(html, /id="statsView"/);
  assert.match(html, /id="newsView"/);
  assert.match(html, /id="roadmapView"/);
});

test('Carte 1.2 keeps Switzerland on desktop, opens Romandie on Natel and uses the official national border', async () => {
  const js = await read('app/prime-communes-maplibre-1.2.js');
  const css = await read('app/styles/views/map.css');
  assert.match(js, /MAPLIBRE_VERSION = '6\.7\.0'/);
  assert.match(js, /mapLibreModulePromise = import/);
  assert.match(js, /geometryPromise = fetch/);
  assert.match(js, /rasterPreload\.src = RASTER_URL/);
  assert.match(js, /legacyStage\.remove\(\)/);
  assert.match(js, /window\.loadMap = ensureMapLibre/);
  assert.match(js, /data-map-view="impact"[^>]*>\$\{t\('map\.impact'\)\}<\/button>/);
  assert.match(js, /data-map-view="integrator"[^>]*>\$\{t\('common\.integrator'\)\}<\/button>/);
  assert.match(js, /data-map-view="software"[^>]*>\$\{t\('map\.software'\)\}<\/button>/);
  assert.doesNotMatch(js, /<select id="mapViewFilter"/);
  assert.match(css, /\.maplibre-view-buttons\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(js, /mapProductFilter/);
  assert.match(js, /mapLibreRomandieRatio/);
  assert.match(js, /mapLibreActiveRatio/);
  assert.match(js, /renderMetricMaps/);
  assert.match(js, /t\('map\.activeTerritory'\)/);
  assert.match(js, /mapAutocomplete/);
  assert.match(js, /municipalities-line/);
  assert.match(js, /municipality-labels/);
  assert.match(js, /cantons-border/);
  assert.match(js, /country-border-casing/);
  assert.match(js, /country-border'/);
  assert.match(js, /COUNTRY_BORDER_URL = 'public\/data\/switzerland-border-2026\.geojson'/);
  assert.match(js, /countryBorderPromise = fetch/);
  assert.doesNotMatch(js, /buildCountryBorderGeoJSON/);
  assert.match(js, /map\.setMaxBounds\(bounds\)/);
  assert.match(js, /Math\.min\(zoomX, zoomY\)/);
  assert.match(js, /function romandieBounds\(\)/);
  assert.match(js, /mobile \? romandieBounds\(\) : countryBounds\(\)/);
  assert.match(js, /renderWorldCopies: false/);
  assert.match(js, /closeButton: false/);
  assert.match(js, /RASTER_URL = `\$\{import\.meta\.env\?\.BASE_URL \|\| 'public\/'\}swiss-base\.webp`/);
  assert.match(css, /\.maplibre-stage\{[^}]*height:clamp\(820px,58vw,980px\);min-height:820px/);
  assert.match(css, /@media\(max-width:900px\)[\s\S]*\.maplibre-stage\{height:560px;min-height:560px\}/);
  assert.match(css, /maplibre-mini-map/);
  assert.match(css, /metric-swiss-base/);
  assert.match(css, /metric-swiss-active/);
  assert.match(css, /maplibre-progress/);
  assert.match(css, /maplibre-loading/);
  assert.match(js, /style\.backgroundImage[\s\S]*RASTER_URL/);
  assert.doesNotMatch(css, /!important/);
});

test('Stats 1.2 uses one responsive KPI contract independent of label line count', async () => {
  const css = await read('app/styles/views/stats.css');
  assert.match(css, /--pc-kpi-accent:#6ec7ff/);
  assert.match(css, /--pc-kpi-label-height/);
  assert.doesNotMatch(css, /--pc-kpi-label-lines/);
  assert.match(css, /\.stats-kpi:not\(\.stats-kpi-prime\)>strong[\s\S]*color:#f3f6fa/);
  const runtime = await read('app/prime-communes-stats-1.5.js');
  assert.match(runtime, /syncContextKpiLabelHeight/);
  assert.match(css, /\.stats-kpi>span/);
  assert.match(css, /\.stats-kpi>strong/);
  assert.doesNotMatch(css, /#statsMunicipalities/);
  assert.doesNotMatch(css, /#statsCompetitor/);
  assert.doesNotMatch(css, /nth-child/);
  assert.doesNotMatch(css, /:has\(/);
});

test('official national border is a stored swissBOUNDARIES3D 2026 geometry', async () => {
  const geo = JSON.parse(await read('public/data/switzerland-border-2026.geojson'));
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(geo.features[0]?.properties?.referenceDate, '2026-01-01');
  assert.equal(geo.features[0]?.properties?.icc, 'CH');
  assert.match(String(geo.features[0]?.geometry?.type), /LineString/);
});

test('desktop dark mode raises contrast without changing the Natel theme', async () => {
  const loader = await read('app/styles/main.css');
  const css = await read('app/styles/responsive.css');
  assert.match(loader, /responsive\.css/);
  assert.ok(loader.indexOf('responsive.css') > loader.indexOf('views/roadmap.css'));
  assert.match(css, /@media \(min-width:1101px\)/);
  assert.match(css, /@media \(min-width:1600px\)/);
  assert.doesNotMatch(css, /pointer:fine/);
  assert.match(css, /prefers-contrast:more/);
  assert.match(css, /max-width:680px/);
});
