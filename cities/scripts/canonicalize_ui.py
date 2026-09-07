from pathlib import Path
import glob
import json
import re

import geopandas as gpd
import pyogrio
from shapely import force_2d
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 exact match, found {count}')
    return text.replace(old, new, 1)


def build_official_border():
    files = glob.glob('/tmp/swissboundaries/**/*.gpkg', recursive=True)
    if not files:
        raise SystemExit('No GeoPackage found in swissBOUNDARIES3D archive')
    gpkg = files[0]
    layers = [name for name, *_ in pyogrio.list_layers(gpkg)]
    layer = next((name for name in layers if 'TLM_LANDESGEBIET' in name.upper()), None)
    if not layer:
        raise SystemExit(f'TLM_LANDESGEBIET not found. Layers: {layers}')

    gdf = gpd.read_file(gpkg, layer=layer, engine='pyogrio')
    if 'ICC' in gdf.columns:
        swiss = gdf[gdf['ICC'].astype(str).str.upper().eq('CH')]
    elif 'NAME' in gdf.columns:
        swiss = gdf[gdf['NAME'].astype(str).str.lower().str.contains('schweiz|suisse|svizzera|switzerland', regex=True)]
    else:
        raise SystemExit(f'No country discriminator in {list(gdf.columns)}')
    if swiss.empty:
        raise SystemExit('Switzerland row not found in TLM_LANDESGEBIET')

    swiss = swiss.to_crs(4326)
    geom = swiss.geometry.union_all() if hasattr(swiss.geometry, 'union_all') else swiss.geometry.unary_union
    geom = force_2d(geom)
    border = geom.boundary.simplify(0.00004, preserve_topology=True)
    minx, miny, maxx, maxy = border.bounds
    if not (5.8 < minx < 6.3 and 10.2 < maxx < 10.7 and 45.7 < miny < 46.1 and 47.6 < maxy < 48.0):
        raise SystemExit(f'Unexpected Switzerland bounds: {border.bounds}')

    output = {
        'type': 'FeatureCollection',
        'features': [{
            'type': 'Feature',
            'properties': {
                'name': 'Suisse',
                'icc': 'CH',
                'source': 'swissBOUNDARIES3D',
                'referenceDate': '2026-01-01'
            },
            'geometry': mapping(border)
        }]
    }
    path = ROOT / 'public/data/switzerland-border-2026.geojson'
    path.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('official border:', border.geom_type, border.bounds)


def patch_stats():
    css_path = ROOT / 'app/prime-communes-stats-1.2.css'
    css = css_path.read_text()
    css = css.replace('  --pc-kpi-label-lines:2;\n  --pc-kpi-label-line-height:1.08;\n', '')
    old_block = re.search(r'/\* Compact KPI contract\.[\s\S]*?/\* Territory cards use the same bounded-heading principle\. \*/', css)
    if not old_block:
        raise SystemExit('Stats compact KPI contract block not found')
    new_block = """/* Compact KPI contract.
   The runtime measures the tallest visible label and exposes one shared
   --pc-kpi-label-height. This keeps values aligned without reserving empty
   lines on wide screens. */
.stats-kpi:not(.stats-kpi-prime){
  display:grid;
  grid-template-rows:var(--pc-kpi-label-height,auto) auto auto;
  align-content:start;
  row-gap:2px;
  min-height:0;
  padding:8px 14px 9px;
}

.stats-kpi:not(.stats-kpi-prime)>span{
  min-height:0;
  align-self:start;
  line-height:1.08;
}

/* Context / market KPIs are deliberately neutral. Prime emphasis stays blue
   in the hero and territory cards. */
.stats-kpi:not(.stats-kpi-prime)>strong{
  margin:0;
  align-self:start;
  color:#f3f6fa;
  line-height:1;
}

.stats-kpi:not(.stats-kpi-prime)>small{
  margin:0;
  align-self:start;
  line-height:var(--pc-kpi-detail-line-height);
}

/* Territory cards use the same bounded-heading principle. */"""
    css = css[:old_block.start()] + new_block + css[old_block.end():]
    css = css.replace('    --pc-kpi-label-lines:3;\n', '')
    css = css.replace('    padding:7px 12px;\n    row-gap:2px;', '    padding:7px 12px 8px;\n    row-gap:2px;')
    css_path.write_text(css)

    js_path = ROOT / 'app/prime-communes-stats-1.5.js'
    js = js_path.read_text()
    old = """  function queueRender() {
    window.requestAnimationFrame(renderHero);
  }
"""
    new = """  function syncContextKpiLabelHeight() {
    const cards = [...root.querySelectorAll('.stats-kpi:not(.stats-kpi-prime)')];
    if (!cards.length || root.hidden) return;
    cards.forEach(card => card.style.removeProperty('--pc-kpi-label-height'));
    const height = Math.ceil(Math.max(0, ...cards.map(card => card.querySelector(':scope > span')?.getBoundingClientRect().height || 0)));
    if (!height) return;
    cards.forEach(card => card.style.setProperty('--pc-kpi-label-height', `${height}px`));
  }

  function queueRender() {
    window.requestAnimationFrame(() => {
      renderHero();
      window.requestAnimationFrame(syncContextKpiLabelHeight);
    });
  }
"""
    js = replace_once(js, old, new, 'Stats measured heading runtime')
    anchor = "  statsTab?.addEventListener('click', queueRender);\n"
    js = replace_once(js, anchor, anchor + "  window.addEventListener('resize', () => window.requestAnimationFrame(syncContextKpiLabelHeight));\n", 'Stats resize measurement')
    js_path.write_text(js)


def patch_communes():
    js_path = ROOT / 'app/prime-communes-communes-1.2.js'
    js = js_path.read_text()
    old = """      const hostingCell = document.createElement('td');
      hostingCell.className = 'hosting-cell';
      hostingCell.dataset.softwareColumn = 'hosting';
      hostingCell.textContent = commune.hosting || '—';
      modulesCell.insertAdjacentElement('afterend', hostingCell);
"""
    new = """      const hostingCell = document.createElement('td');
      hostingCell.className = 'hosting-cell';
      hostingCell.dataset.softwareColumn = 'hosting';
      const hosting = String(commune.hosting || '').trim();
      hostingCell.innerHTML = hosting ? esc(hosting) : '<span class=\"cell-empty\">—</span>';
      modulesCell.insertAdjacentElement('afterend', hostingCell);
"""
    js = replace_once(js, old, new, 'Hosting empty-value rendering')
    old_render = """  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
  };
"""
    new_render = """  function normalizeEmptyCells() {
    document.querySelectorAll('.table-wrap tbody .empty').forEach(node => {
      node.classList.remove('empty');
      node.classList.add('cell-empty');
    });
  }

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
    normalizeEmptyCells();
  };
"""
    js = replace_once(js, old_render, new_render, 'Canonical empty-cell normalization')
    js_path.write_text(js)

    css_path = ROOT / 'app/prime-communes-1.1.5.css'
    css = css_path.read_text()
    css = css.replace('/* Prime Communes 1.1 · stabilized visual layer */\n', """/* Prime Communes 1.1 · stabilized visual layer */

:root{
  --pc-table-secondary:#98a4b5;
  --pc-table-empty:#6f7d90;
}
""")
    css = css.replace('  font-size:13px;\n}', '  font-size:13px;\n  color:var(--pc-table-secondary);\n}', 1)
    css = css.replace('  color:#a9b5c5;\n  white-space:nowrap;', '  white-space:nowrap;')
    css = css.replace('  color:#98a4b5;\n  background:transparent;', '  color:var(--pc-table-secondary);\n  background:transparent;')
    marker = '.modules-cell .eadmin-mark,\n.clevertax-mark{\n'
    empty_rule = """.cell-empty{
  color:var(--pc-table-empty);
  font-style:normal;
  font-weight:400;
}

"""
    if marker not in css:
        raise SystemExit('Table empty-value CSS insertion point not found')
    css = css.replace(marker, empty_rule + marker, 1)
    css_path.write_text(css)


def patch_map():
    js_path = ROOT / 'app/prime-communes-maplibre-1.2.js'
    js = js_path.read_text()
    js = replace_once(js, "  const RASTER_URL = 'public/swiss-base.webp';\n", "  const RASTER_URL = 'public/swiss-base.webp';\n  const COUNTRY_BORDER_URL = 'public/data/switzerland-border-2026.geojson';\n", 'Country border constant')
    geometry_anchor = """  const geometryPromise = fetch(GEOMETRY_URL, { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Géométrie cartographique indisponible.');
      return response.json();
    });
"""
    border_promise = geometry_anchor + """  const countryBorderPromise = fetch(COUNTRY_BORDER_URL, { cache: 'force-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Frontière nationale indisponible.');
      return response.json();
    });
"""
    js = replace_once(js, geometry_anchor, border_promise, 'Official border preload')
    js, count = re.subn(r'\n  function buildCountryBorderGeoJSON\(\) \{[\s\S]*?\n  \}\n\n  function municipalityFeature', '\n  function municipalityFeature', js, count=1)
    if count != 1:
        raise SystemExit(f'Approximate country-border helper removal: found {count}')
    js = replace_once(js, "    countryBorderGeoJSON = buildCountryBorderGeoJSON();\n", '', 'Remove inferred border assignment')
    js = replace_once(js, "      await Promise.all([waitForData(), ensureGeometry()]);\n", "      const [, , officialBorder] = await Promise.all([waitForData(), ensureGeometry(), countryBorderPromise]);\n      countryBorderGeoJSON = officialBorder;\n", 'Await official border')
    js_path.write_text(js)

    css_path = ROOT / 'app/prime-communes-maplibre-1.2.css'
    css = css_path.read_text()
    css = replace_once(css, '.maplibre-stage{position:relative;height:760px;min-height:760px;', '.maplibre-stage{position:relative;height:clamp(820px,58vw,980px);min-height:820px;', 'Desktop map height')
    css_path.write_text(css)


def bump_loader():
    path = ROOT / 'app/prime-communes-1.1.js'
    text = path.read_text()
    swaps = {
        'prime-communes-1.1.5.css?v=7': 'prime-communes-1.1.5.css?v=8',
        'prime-communes-stats-1.2.css?v=9': 'prime-communes-stats-1.2.css?v=10',
        'prime-communes-maplibre-1.2.css?v=9': 'prime-communes-maplibre-1.2.css?v=10',
        'prime-communes-maplibre-1.2.js?v=7': 'prime-communes-maplibre-1.2.js?v=8',
        'prime-communes-stats-1.5.js?v=3': 'prime-communes-stats-1.5.js?v=4',
        'prime-communes-communes-1.2.js?v=3': 'prime-communes-communes-1.2.js?v=4',
    }
    for old, new in swaps.items():
        text = replace_once(text, old, new, f'Cache bump {old}')
    path.write_text(text)


def patch_tests():
    path = ROOT / 'tests/stabilization-1.1.test.mjs'
    tests = path.read_text()
    tests = tests.replace(
        "  assert.match(js, /fitBounds\\(romandieBounds\\(\\)/);\n  assert.match(css, /\\.maplibre-stage\\{[^}]*height:760px;min-height:760px/);",
        "  assert.match(js, /COUNTRY_BORDER_URL = 'public\\/data\\/switzerland-border-2026\\.geojson'/);\n  assert.match(js, /countryBorderPromise = fetch/);\n  assert.doesNotMatch(js, /buildCountryBorderGeoJSON/);\n  assert.match(js, /map\\.fitBounds\\(countryBounds\\(\\)/);\n  assert.match(css, /\\.maplibre-stage\\{[^}]*height:clamp\\(820px,58vw,980px\\);min-height:820px/);"
    )
    tests = tests.replace(
        "  assert.match(css, /--pc-kpi-label-lines:2/);\n  assert.match(css, /@media\\(max-width:760px\\)[\\s\\S]*--pc-kpi-label-lines:3/);",
        "  assert.match(css, /--pc-kpi-label-height/);\n  assert.doesNotMatch(css, /--pc-kpi-label-lines/);\n  assert.match(css, /\\.stats-kpi:not\\(\\.stats-kpi-prime\\)>strong[\\s\\S]*color:#f3f6fa/);\n  assert.match(await read('app/prime-communes-stats-1.5.js'), /syncContextKpiLabelHeight/);"
    )
    tests = tests.replace("  assert.match(js, /commune\\.hosting \\|\\| '—'/);\n", "  assert.match(js, /cell-empty/);\n  assert.match(js, /normalizeEmptyCells/);\n")
    anchor = "  assert.doesNotMatch(css, /:not\\(\\.logiciels-hidden\\)/);\n"
    tests = replace_once(tests, anchor, anchor + "  assert.match(css, /--pc-table-secondary/);\n  assert.match(css, /\\.cell-empty/);\n  assert.doesNotMatch(css, /\\.hosting-cell\\s*\\{[^}]*color:/);\n", 'Table canonical color test')
    border_test = """

test('official national border is a stored swissBOUNDARIES3D 2026 geometry', async () => {
  const geo = JSON.parse(await read('public/data/switzerland-border-2026.geojson'));
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(geo.features[0]?.properties?.referenceDate, '2026-01-01');
  assert.equal(geo.features[0]?.properties?.icc, 'CH');
  assert.match(String(geo.features[0]?.geometry?.type), /LineString/);
});
"""
    if 'official national border is a stored swissBOUNDARIES3D 2026 geometry' not in tests:
        tests += border_test
    path.write_text(tests)


if __name__ == '__main__':
    build_official_border()
    patch_stats()
    patch_communes()
    patch_map()
    bump_loader()
    patch_tests()
    print('canonical UI migration prepared')
