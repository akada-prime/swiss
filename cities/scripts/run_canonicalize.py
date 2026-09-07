from pathlib import Path
import re
import runpy

path = Path(__file__).with_name('canonicalize_ui.py')
text = path.read_text()

# swissBOUNDARIES3D field names vary in casing between deliveries.
old = """    if 'ICC' in gdf.columns:
        swiss = gdf[gdf['ICC'].astype(str).str.upper().eq('CH')]
    elif 'NAME' in gdf.columns:
        swiss = gdf[gdf['NAME'].astype(str).str.lower().str.contains('schweiz|suisse|svizzera|switzerland', regex=True)]
    else:
        raise SystemExit(f'No country discriminator in {list(gdf.columns)}')
"""
new = """    columns = {str(column).upper(): column for column in gdf.columns}
    if 'ICC' in columns:
        field = columns['ICC']
        swiss = gdf[gdf[field].astype(str).str.upper().eq('CH')]
    elif 'NAME' in columns:
        field = columns['NAME']
        swiss = gdf[gdf[field].astype(str).str.lower().str.contains('schweiz|suisse|svizzera|switzerland', regex=True)]
    else:
        raise SystemExit(f'No country discriminator in {list(gdf.columns)}')
"""
if text.count(old) != 1:
    raise SystemExit('swisstopo field normalization target not found')
text = text.replace(old, new, 1)

# Desktop height is already canonical on the current HEAD.
old_height = """    css = replace_once(css, '.maplibre-stage{position:relative;height:760px;min-height:760px;', '.maplibre-stage{position:relative;height:clamp(820px,58vw,980px);min-height:820px;', 'Desktop map height')
"""
new_height = """    old_stage = '.maplibre-stage{position:relative;height:760px;min-height:760px;'
    canonical_stage = '.maplibre-stage{position:relative;height:clamp(820px,58vw,980px);min-height:820px;'
    if old_stage in css:
        css = css.replace(old_stage, canonical_stage, 1)
    elif canonical_stage not in css:
        raise SystemExit('Desktop map height: neither historical nor canonical rule found')
"""
if text.count(old_height) != 1:
    raise SystemExit('desktop map idempotency target not found')
text = text.replace(old_height, new_height, 1)

# Cache-bust only files changed by this pass, from the versions actually live
# on the current HEAD. Map CSS is already v10 and unchanged here.
bump_start = text.find('def bump_loader():')
bump_end = text.find('\n\ndef patch_tests():', bump_start)
if bump_start < 0 or bump_end < 0:
    raise SystemExit('bump_loader function not found')
bump_loader = """def bump_loader():
    path = ROOT / 'app/prime-communes-1.1.js'
    text = path.read_text()
    swaps = {
        'prime-communes-1.1.5.css?v=7': 'prime-communes-1.1.5.css?v=8',
        'prime-communes-stats-1.2.css?v=9': 'prime-communes-stats-1.2.css?v=10',
        'prime-communes-maplibre-1.2.js?v=8': 'prime-communes-maplibre-1.2.js?v=9',
        'prime-communes-stats-1.5.js?v=3': 'prime-communes-stats-1.5.js?v=4',
        'prime-communes-communes-1.2.js?v=3': 'prime-communes-communes-1.2.js?v=4',
    }
    for old, new in swaps.items():
        text = replace_once(text, old, new, f'Cache bump {old}')
    path.write_text(text)
"""
text = text[:bump_start] + bump_loader + text[bump_end:]

# Replace the historical-test patcher with a direct canonical contract patch.
start = text.find('def patch_tests():')
end = text.find("\n\nif __name__ == '__main__':", start)
if start < 0 or end < 0:
    raise SystemExit('patch_tests function not found')
patch_tests = r"""def patch_tests():
    path = ROOT / 'tests/stabilization-1.1.test.mjs'
    tests = path.read_text()

    tests = tests.replace(
        "  assert.match(css, /--pc-kpi-label-lines:2/);\n  assert.match(css, /@media\\(max-width:760px\\)[\\s\\S]*--pc-kpi-label-lines:3/);",
        "  assert.match(css, /--pc-kpi-label-height/);\n  assert.doesNotMatch(css, /--pc-kpi-label-lines/);\n  assert.match(css, /\\.stats-kpi:not\\(\\.stats-kpi-prime\\)>strong[\\s\\S]*color:#f3f6fa/);\n  const runtime = await read('app/prime-communes-stats-1.5.js');\n  assert.match(runtime, /syncContextKpiLabelHeight/);"
    )

    tests = tests.replace(
        "  assert.match(js, /commune\\.hosting \\|\\| '—'/);",
        "  assert.match(js, /cell-empty/);\n  assert.match(js, /normalizeEmptyCells/);"
    )

    table_anchor = "  assert.doesNotMatch(css, /:not\\(\\.logiciels-hidden\\)/);"
    if '--pc-table-secondary' not in tests:
        tests = tests.replace(
            table_anchor,
            table_anchor + "\n  assert.match(css, /--pc-table-secondary/);\n  assert.match(css, /\\.cell-empty/);\n  assert.doesNotMatch(css, /\\.hosting-cell\\s*\\{[^}]*color:/);",
            1
        )

    tests = tests.replace(
        "  assert.match(js, /buildCountryBorderGeoJSON/);",
        "  assert.match(js, /COUNTRY_BORDER_URL = 'public\\/data\\/switzerland-border-2026\\.geojson'/);\n  assert.match(js, /countryBorderPromise = fetch/);\n  assert.doesNotMatch(js, /buildCountryBorderGeoJSON/);"
    )

    tests = tests.replace(
        "test('Carte 1.2 is MapLibre-only, fits all Switzerland and exposes a national border', async () => {",
        "test('Carte 1.2 is MapLibre-only, fits all Switzerland and uses the official national border', async () => {"
    )

    border_test = r'''

test('official national border is a stored swissBOUNDARIES3D 2026 geometry', async () => {
  const geo = JSON.parse(await read('public/data/switzerland-border-2026.geojson'));
  assert.equal(geo.type, 'FeatureCollection');
  assert.equal(geo.features[0]?.properties?.referenceDate, '2026-01-01');
  assert.equal(geo.features[0]?.properties?.icc, 'CH');
  assert.match(String(geo.features[0]?.geometry?.type), /LineString/);
});
'''
    if 'official national border is a stored swissBOUNDARIES3D 2026 geometry' not in tests:
        tests += border_test

    path.write_text(tests)
"""
text = text[:start] + patch_tests + text[end:]

path.write_text(text)
runpy.run_path(str(path), run_name='__main__')
