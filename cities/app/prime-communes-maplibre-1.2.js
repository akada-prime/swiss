(() => {
  'use strict';

  // Prime Communes · Carte 1.2
  // Canonical map module: one MapLibre UI, mobile-first search, no business-data writes.
  const MAPLIBRE_VERSION = '6.7.0';
  const MAPLIBRE_MODULE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
  const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';
  const ACTIVE_TERRITORIES = new Set(['JU', 'BE', 'VD', 'FR']);
  const ACTIVE_TERRITORY_LABEL = 'Jura · Berne · Vaud · Fribourg (romands)';

  const panel = document.getElementById('mapPanel');
  const legacyStage = document.getElementById('mapStage');
  let query = document.getElementById('mapQuery');
  if (!panel || !legacyStage || !query) return;

  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const html = value => typeof esc === 'function'
    ? esc(value)
    : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  let metrics = null;
  let stage = null;
  let map = null;
  let maplibregl = null;
  let hoverPopup = null;
  let clickPopup = null;
  let municipalityGeoJSON = null;
  let cantonGeoJSON = null;
  let pointGeoJSON = null;
  let loadingPromise = null;
  let selectedId = '';
  let cantonFilter = '';
  let cantonSelect = null;
  let viewSelect = null;
  let productSelect = null;
  let suggestionsBox = null;
  let suggestions = [];
  let suggestionIndex = -1;
  let resizeTimer = null;

  const normalizeText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-CH')
    .trim();

  function injectAssets() {
    // The local Carte stylesheet is loaded once by the application loader.
    // This module only owns the third-party MapLibre stylesheet.
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const external = document.createElement('link');
      external.rel = 'stylesheet';
      external.href = MAPLIBRE_CSS;
      document.head.append(external);
    }
  }

  function ensureMetrics() {
    if (metrics) return metrics;
    metrics = document.createElement('div');
    metrics.className = 'maplibre-metrics maplibre-metrics-b';
    metrics.id = 'mapLibreMetrics';
    metrics.innerHTML = `
      <article class="maplibre-metric">
        <div class="maplibre-metric-copy">
          <p>Suisse romande</p>
          <strong id="mapLibreRomandieRatio">—</strong>
          <span id="mapLibreRomandiePopulation">—</span>
          <div class="maplibre-progress" aria-hidden="true"><i id="mapLibreRomandieProgress"></i></div>
          <small id="mapLibreRomandieTotal">—</small>
        </div>
        <div class="maplibre-mini-map" id="mapLibreRomandieMap" aria-hidden="true"></div>
      </article>
      <article class="maplibre-metric">
        <div class="maplibre-metric-copy">
          <p>Territoire innosolvcity Prime</p>
          <strong id="mapLibreActiveRatio">—</strong>
          <span id="mapLibreActivePopulation">—</span>
          <div class="maplibre-progress" aria-hidden="true"><i id="mapLibreActiveProgress"></i></div>
          <small>${ACTIVE_TERRITORY_LABEL}</small>
          <div class="maplibre-territory-chips" aria-hidden="true">
            <i>JU</i><i>BE</i><i>VD</i><i>FR</i>
          </div>
        </div>
        <div class="maplibre-mini-map" id="mapLibreActiveMap" aria-hidden="true"></div>
      </article>`;
    panel.insertAdjacentElement('beforebegin', metrics);
    return metrics;
  }

  function ensureStage() {
    if (stage) return stage;
    stage = document.createElement('div');
    stage.className = 'maplibre-stage';
    stage.id = 'mapLibreStage';
    stage.innerHTML = `
      <div id="primeMapLibre" aria-label="Carte interactive des communes suisses"></div>
      <div class="maplibre-loading" id="mapLibreLoading"><span></span>Chargement de la carte…</div>`;
    legacyStage.insertAdjacentElement('afterend', stage);
    legacyStage.hidden = true;
    return stage;
  }

  function configureToolbar() {
    const toolbar = panel.querySelector('.map-toolbar');
    const search = toolbar?.querySelector('.map-search');
    if (!toolbar || !search) return;

    const freshQuery = query.cloneNode(true);
    query.replaceWith(freshQuery);
    query = freshQuery;
    query.setAttribute('autocomplete', 'off');
    query.setAttribute('spellcheck', 'false');
    query.setAttribute('aria-autocomplete', 'list');
    query.setAttribute('aria-expanded', 'false');
    query.placeholder = 'Rechercher une commune…';

    // Keep the historical controls in the DOM because the stable 1.1 data
    // bridge still references #mapProduct. Carte 1.2 simply hides that UI.
    const legacyControls = toolbar.querySelector('.map-controls');
    if (legacyControls) {
      legacyControls.hidden = true;
      legacyControls.setAttribute('aria-hidden', 'true');
    }

    toolbar.classList.add('maplibre-toolbar');
    search.classList.add('maplibre-search');

    suggestionsBox = document.createElement('div');
    suggestionsBox.id = 'mapAutocomplete';
    suggestionsBox.className = 'map-autocomplete';
    suggestionsBox.hidden = true;
    suggestionsBox.setAttribute('role', 'listbox');
    search.append(suggestionsBox);

    const cantonLabel = document.createElement('label');
    cantonLabel.className = 'maplibre-filter';
    cantonLabel.innerHTML = '<span>Canton</span><select id="mapCantonFilter" aria-label="Filtrer par canton"><option value="">Tous</option></select>';
    toolbar.append(cantonLabel);
    cantonSelect = cantonLabel.querySelector('select');

    const viewLabel = document.createElement('label');
    viewLabel.className = 'maplibre-filter';
    viewLabel.innerHTML = `
      <span>Affichage</span>
      <select id="mapViewFilter" aria-label="Choisir la lecture cartographique">
        <option value="impact">Empreinte Prime</option>
        <option value="integrator">Intégrateur</option>
        <option value="software">Logiciel</option>
        <option value="product">Produit</option>
      </select>`;
    toolbar.append(viewLabel);
    viewSelect = viewLabel.querySelector('select');

    const productLabel = document.createElement('label');
    productLabel.className = 'maplibre-filter maplibre-product-filter';
    productLabel.hidden = true;
    productLabel.innerHTML = '<span>Produit</span><select id="mapProductFilter" aria-label="Choisir un produit"></select>';
    toolbar.append(productLabel);
    productSelect = productLabel.querySelector('select');

    bindSearch();

    cantonSelect.addEventListener('change', () => {
      cantonFilter = cantonSelect.value;
      syncLayerFilters();
      fitActiveScope();
      closeSuggestions();
    });
    viewSelect.addEventListener('change', () => {
      syncViewSelection();
      closeSuggestions();
    });
    productSelect.addEventListener('change', () => {
      mapProduct = productSelect.value;
      syncStyle();
    });
  }

  function populateToolbarOptions() {
    if (!all.length) return;
    if (cantonSelect) {
      const selected = cantonSelect.value;
      const cantons = [...new Set(all.map(row => row.canton).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr-CH'));
      cantonSelect.innerHTML = '<option value="">Tous</option>' +
        cantons.map(canton => `<option value="${html(canton)}">${html(canton)}</option>`).join('');
      cantonSelect.value = cantons.includes(selected) ? selected : '';
      cantonFilter = cantonSelect.value;
    }
    if (productSelect) {
      const selected = productSelect.value || mapProduct || '';
      const products = [...new Set(all.flatMap(row => row.products || []).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'fr-CH'));
      productSelect.innerHTML = products.map(product =>
        `<option value="${html(product)}">${html(product)}</option>`
      ).join('');
      if (products.length) {
        productSelect.value = products.includes(selected) ? selected : products[0];
        mapProduct = productSelect.value;
      }
    }
  }

  function coverage(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const covered = rows.filter(row => row.isPrime)
      .reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    return {
      total,
      covered,
      share: total ? covered / total * 100 : 0,
      ratio: covered ? Math.max(1, Math.round(total / covered)) : 0
    };
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setProgress(id, value) {
    const node = document.getElementById(id);
    if (node) node.style.width = `${Math.max(0, Math.min(100, value))}%`;
  }

  function syncMetrics() {
    if (!all.length) return;
    const romandie = all.filter(row => row.market === 'Welsch');
    const active = all.filter(row => row.market === 'Welsch' && ACTIVE_TERRITORIES.has(row.canton));
    const r = coverage(romandie);
    const a = coverage(active);

    setText('mapLibreRomandieRatio', r.ratio ? `1 Romand sur ${r.ratio}` : '—');
    setText('mapLibreRomandiePopulation', `${nf.format(r.covered)} habitants · ${pf.format(r.share)}%`);
    setText('mapLibreRomandieTotal', `Sur ${nf.format(r.total)} habitants en Suisse romande`);
    setProgress('mapLibreRomandieProgress', r.share);

    setText('mapLibreActiveRatio', a.ratio ? `1 habitant sur ${a.ratio}` : '—');
    setText('mapLibreActivePopulation', `${nf.format(a.covered)} habitants · ${pf.format(a.share)}%`);
    setProgress('mapLibreActiveProgress', a.share);
  }

  function renderMetricMap(targetId, predicate) {
    const target = document.getElementById(targetId);
    if (!target || !mapGeometry?.meta?.viewBox) return;
    const [x, y, w, h] = mapGeometry.meta.viewBox.map(Number);
    const lookup = new Map(all.map(row => [String(row.id), row]));
    const base = (mapGeometry.cantons || []).map(shape =>
      `<path class="metric-swiss-base" d="${html(shape.d)}"></path>`
    ).join('');
    const active = (mapGeometry.municipalities || [])
      .filter(shape => {
        const commune = lookup.get(String(shape.id));
        return commune && predicate(commune);
      })
      .map(shape => `<path class="metric-swiss-active" d="${html(shape.d)}"></path>`)
      .join('');
    target.innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${base}${active}</svg>`;
  }

  function renderMetricMaps() {
    if (!mapGeometry || !all.length) return;
    renderMetricMap('mapLibreRomandieMap', row => row.market === 'Welsch');
    renderMetricMap('mapLibreActiveMap', row => row.market === 'Welsch' && ACTIVE_TERRITORIES.has(row.canton));
  }

  function lv95ToWgs84(easting, northing) {
    const y = (Number(easting) - 2600000) / 1000000;
    const x = (Number(northing) - 1200000) / 1000000;
    const lon = 2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y * y * y;
    const lat = 16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x * x * x;
    return [lon * 100 / 36, lat * 100 / 36];
  }

  function parsePathRings(d) {
    const tokens = String(d || '').match(/[MLZ]|-?\d+(?:\.\d+)?/gi) || [];
    const rings = [];
    let ring = [];
    let command = '';
    const closeRing = () => {
      if (ring.length < 3) { ring = []; return; }
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
      if (ring.length >= 4) rings.push(ring);
      ring = [];
    };
    for (let i = 0; i < tokens.length;) {
      const token = tokens[i++];
      if (/^[MLZ]$/i.test(token)) {
        command = token.toUpperCase();
        if (command === 'M' && ring.length) closeRing();
        if (command === 'Z') closeRing();
        continue;
      }
      const px = Number(token);
      const py = Number(tokens[i++]);
      if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
      if (command === 'M' && ring.length) closeRing();
      ring.push(lv95ToWgs84(px, -py));
      command = 'L';
    }
    if (ring.length) closeRing();
    return rings;
  }

  function geometryFromRings(rings) {
    if (!rings.length) return null;
    return rings.length === 1
      ? { type: 'Polygon', coordinates: [rings[0]] }
      : { type: 'MultiPolygon', coordinates: rings.map(ring => [ring]) };
  }

  function municipalityFeature(shape, lookup) {
    const commune = lookup.get(String(shape.id));
    const geometry = geometryFromRings(parsePathRings(shape.d));
    if (!geometry) return null;
    return {
      type: 'Feature',
      id: String(shape.id),
      properties: {
        id: String(shape.id),
        name: commune?.name || '',
        canton: commune?.canton || '',
        market: commune?.market || '',
        population: Number(commune?.expectedPopulation || 0),
        isPrime: Boolean(commune?.isPrime),
        integrator: commune?.integrator || '',
        software: commune?.software || '',
        erp: commune?.erp || '',
        products: (commune?.products || []).join(' · '),
        isInnosolv: commune?.software === 'innosolvcity',
        hasEadmin: Boolean(commune?.products?.includes('eAdmin')),
        productMatch: Boolean(commune?.products?.includes(mapProduct))
      },
      geometry
    };
  }

  function cantonFeature(shape) {
    const geometry = geometryFromRings(parsePathRings(shape.d));
    if (!geometry) return null;
    return {
      type: 'Feature',
      id: String(shape.code),
      properties: { code: String(shape.code) },
      geometry
    };
  }

  function coordinatesOf(geometry) {
    const result = [];
    const walk = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        result.push([Number(value[0]), Number(value[1])]);
      } else {
        value.forEach(walk);
      }
    };
    walk(geometry?.coordinates);
    return result;
  }

  function pointFeature(feature, commune) {
    if (!feature || !commune) return null;
    const points = coordinatesOf(feature.geometry);
    if (!points.length) return null;
    const lngs = points.map(point => point[0]);
    const lats = points.map(point => point[1]);
    return {
      type: 'Feature',
      id: String(commune.id),
      properties: {
        id: String(commune.id),
        name: commune.name || '',
        canton: commune.canton || '',
        population: Number(commune.expectedPopulation || 0),
        isPrime: Boolean(commune.isPrime),
        isInnosolv: commune.software === 'innosolvcity',
        hasEadmin: Boolean(commune.products?.includes('eAdmin'))
      },
      geometry: {
        type: 'Point',
        coordinates: [
          (Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2
        ]
      }
    };
  }

  function buildGeoJSON() {
    const lookup = new Map(all.map(row => [String(row.id), row]));
    const municipalities = [];
    const points = [];

    for (const shape of mapGeometry?.municipalities || []) {
      const feature = municipalityFeature(shape, lookup);
      if (!feature) continue;
      municipalities.push(feature);
      const point = pointFeature(feature, lookup.get(String(shape.id)));
      if (point) points.push(point);
    }

    municipalityGeoJSON = { type: 'FeatureCollection', features: municipalities };
    pointGeoJSON = { type: 'FeatureCollection', features: points };
    cantonGeoJSON = {
      type: 'FeatureCollection',
      features: (mapGeometry?.cantons || []).map(cantonFeature).filter(Boolean)
    };
  }

  function paletteExpression(key, palette) {
    const values = Object.entries(palette || {}).flatMap(([name, color]) => [name, color]);
    return ['match', ['get', key], ...values, mapFallback];
  }

  function fillColorExpression() {
    if (mapPerspective === 'impact') {
      return ['case', ['==', ['get', 'isPrime'], true], '#1596e6', '#d8e1e6'];
    }
    if (mapMode === 'product') {
      return ['case', ['==', ['get', 'productMatch'], true], '#36d494', '#50616e'];
    }
    return paletteExpression(mapMode === 'software' ? 'software' : 'integrator', mapPalettes[mapMode]);
  }

  function fillOpacityExpression() {
    if (mapPerspective === 'impact') {
      return ['case', ['==', ['get', 'isPrime'], true], 0.54, 0.09];
    }
    return 0.72;
  }

  function syncMapData() {
    if (!mapGeometry || !all.length) return;
    buildGeoJSON();
    map?.getSource('municipalities')?.setData(municipalityGeoJSON);
    map?.getSource('municipality-points')?.setData(pointGeoJSON);
    map?.getSource('cantons')?.setData(cantonGeoJSON);
  }

  function cantonExpression() {
    return cantonFilter ? ['==', ['get', 'canton'], cantonFilter] : null;
  }

  function syncLayerFilters() {
    if (!map || !map.isStyleLoaded()) return;
    const canton = cantonExpression();
    const combine = specific => canton ? ['all', canton, specific] : specific;

    for (const id of ['municipalities-fill', 'municipalities-line', 'municipality-labels']) {
      if (map.getLayer(id)) map.setFilter(id, canton);
    }
    if (map.getLayer('prime-halo')) map.setFilter('prime-halo', combine(['==', ['get', 'isPrime'], true]));
    if (map.getLayer('prime-core')) map.setFilter('prime-core', combine(['==', ['get', 'isPrime'], true]));
    if (map.getLayer('innosolv-dots')) map.setFilter('innosolv-dots', combine(['==', ['get', 'isInnosolv'], true]));
    if (map.getLayer('eadmin-dots')) {
      map.setFilter('eadmin-dots', combine(['all', ['==', ['get', 'hasEadmin'], true], ['==', ['get', 'isPrime'], true]]));
    }
    if (map.getLayer('municipality-selected')) {
      const selection = ['==', ['get', 'id'], selectedId || '__none__'];
      map.setFilter('municipality-selected', canton ? ['all', canton, selection] : selection);
    }
  }

  function syncStyle({ fit = false } = {}) {
    if (!map || !map.isStyleLoaded()) return;
    syncMapData();

    if (map.getLayer('municipalities-fill')) {
      map.setPaintProperty('municipalities-fill', 'fill-color', fillColorExpression());
      map.setPaintProperty('municipalities-fill', 'fill-opacity', fillOpacityExpression());
    }
    for (const id of ['prime-halo', 'prime-core', 'innosolv-dots', 'eadmin-dots']) {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', mapPerspective === 'impact' ? 'visible' : 'none');
      }
    }
    syncLayerFilters();
    syncMetrics();
    if (fit) fitActiveScope();
  }

  function boundsFromBox(box) {
    const [x, y, w, h] = box.map(Number);
    const points = [
      lv95ToWgs84(x, -y),
      lv95ToWgs84(x + w, -y),
      lv95ToWgs84(x + w, -(y + h)),
      lv95ToWgs84(x, -(y + h))
    ];
    return [
      [Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1]))],
      [Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1]))]
    ];
  }

  function boundsFromFeatures(features) {
    const points = (features || []).flatMap(feature => coordinatesOf(feature.geometry));
    if (!points.length) return null;
    return [
      [Math.min(...points.map(point => point[0])), Math.min(...points.map(point => point[1]))],
      [Math.max(...points.map(point => point[0])), Math.max(...points.map(point => point[1]))]
    ];
  }

  function swissBounds() {
    return boundsFromBox(mapGeometry?.meta?.viewBox || [2480000, -1305000, 360000, 260000]);
  }

  function romandieBounds() {
    const features = municipalityGeoJSON?.features?.filter(feature => feature.properties.market === 'Welsch') || [];
    return boundsFromFeatures(features) || [[5.75, 45.78], [7.75, 47.55]];
  }

  function mercatorX(lon) {
    return (Number(lon) + 180) / 360;
  }

  function mercatorY(lat) {
    const radians = Number(lat) * Math.PI / 180;
    return (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  }

  function applyMapBounds() {
    if (!map || !mapGeometry) return;
    const bounds = swissBounds();
    map.setMaxBounds(bounds);

    const container = map.getContainer();
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const dx = Math.abs(mercatorX(bounds[1][0]) - mercatorX(bounds[0][0]));
    const dy = Math.abs(mercatorY(bounds[0][1]) - mercatorY(bounds[1][1]));
    const zoomX = Math.log2(width / (512 * Math.max(dx, 1e-9)));
    const zoomY = Math.log2(height / (512 * Math.max(dy, 1e-9)));
    const coverZoom = Math.max(0, zoomX, zoomY) + 0.03;
    map.setMinZoom(coverZoom);
  }

  function fitActiveScope() {
    if (!map || !mapGeometry) return;
    let bounds = null;

    if (cantonFilter) {
      bounds = boundsFromFeatures(
        municipalityGeoJSON?.features?.filter(feature => feature.properties.canton === cantonFilter)
      );
    }
    if (!bounds) bounds = romandieBounds();

    map.fitBounds(bounds, {
      padding: window.matchMedia('(max-width:680px)').matches ? 12 : 28,
      duration: 380
    });
  }

  function addLayers() {
    const [x, y, w, h] = mapGeometry.meta.viewBox;
    const imageCoordinates = [
      lv95ToWgs84(x, -y),
      lv95ToWgs84(x + w, -y),
      lv95ToWgs84(x + w, -(y + h)),
      lv95ToWgs84(x, -(y + h))
    ];

    map.addSource('swisstopo-base', {
      type: 'image',
      url: 'public/swiss-base.webp',
      coordinates: imageCoordinates
    });
    map.addLayer({
      id: 'swisstopo-base',
      type: 'raster',
      source: 'swisstopo-base',
      paint: {
        'raster-opacity': 1,
        'raster-brightness-min': 0.24,
        'raster-brightness-max': 0.98,
        'raster-contrast': -0.15,
        'raster-saturation': -0.08
      }
    });

    map.addSource('municipalities', {
      type: 'geojson',
      data: municipalityGeoJSON,
      promoteId: 'id'
    });
    map.addLayer({
      id: 'municipalities-fill',
      type: 'fill',
      source: 'municipalities',
      paint: {
        'fill-color': fillColorExpression(),
        'fill-opacity': fillOpacityExpression()
      }
    });
    map.addLayer({
      id: 'municipalities-line',
      type: 'line',
      source: 'municipalities',
      paint: {
        'line-color': 'rgba(236,247,252,.98)',
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.08, 8, 0.25, 10, 0.68, 12, 0.94],
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.22, 8, 0.42, 10, 0.9, 12, 1.5]
      }
    });

    map.addSource('cantons', { type: 'geojson', data: cantonGeoJSON });
    map.addLayer({
      id: 'cantons-border-casing',
      type: 'line',
      source: 'cantons',
      paint: {
        'line-color': 'rgba(13,28,39,.86)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 9, 3.5, 12, 4.6],
        'line-opacity': 0.82
      }
    });
    map.addLayer({
      id: 'cantons-border',
      type: 'line',
      source: 'cantons',
      paint: {
        'line-color': 'rgba(242,249,252,.96)',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 9, 1.25, 12, 1.85],
        'line-opacity': 0.92
      }
    });

    map.addSource('municipality-points', {
      type: 'geojson',
      data: pointGeoJSON,
      promoteId: 'id'
    });

    map.addLayer({
      id: 'prime-halo',
      type: 'circle',
      source: 'municipality-points',
      filter: ['==', ['get', 'isPrime'], true],
      paint: {
        'circle-color': '#159cff',
        'circle-opacity': 0.12,
        'circle-blur': 0.68,
        'circle-radius': ['interpolate', ['linear'], ['get', 'population'], 0, 11, 10000, 18, 100000, 29, 500000, 43]
      }
    });
    map.addLayer({
      id: 'prime-core',
      type: 'circle',
      source: 'municipality-points',
      filter: ['==', ['get', 'isPrime'], true],
      paint: {
        'circle-color': '#087bc4',
        'circle-opacity': 0.92,
        'circle-stroke-color': 'rgba(229,247,255,.85)',
        'circle-stroke-width': 0.6,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4.2, 13, 6.5]
      }
    });
    map.addLayer({
      id: 'innosolv-dots',
      type: 'circle',
      source: 'municipality-points',
      filter: ['==', ['get', 'isInnosolv'], true],
      paint: {
        'circle-color': ['case', ['==', ['get', 'isPrime'], true], '#44dc98', 'rgba(247,250,252,.92)'],
        'circle-stroke-color': '#31be7f',
        'circle-stroke-width': ['case', ['==', ['get', 'isPrime'], true], 1.1, 2.1],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 10, 4.2, 13, 6]
      }
    });
    map.addLayer({
      id: 'eadmin-dots',
      type: 'circle',
      source: 'municipality-points',
      filter: ['all', ['==', ['get', 'hasEadmin'], true], ['==', ['get', 'isPrime'], true]],
      paint: {
        'circle-color': '#e52332',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 1,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4, 13, 5.8]
      }
    });

    map.addLayer({
      id: 'municipality-labels',
      type: 'symbol',
      source: 'municipality-points',
      minzoom: 9.2,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 9.2, 10, 11, 11.5, 13, 13],
        'text-offset': [0, 0.95],
        'text-anchor': 'top',
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': '#f7fbfd',
        'text-halo-color': 'rgba(13,25,34,.95)',
        'text-halo-width': 1.35,
        'text-halo-blur': 0.25
      }
    });

    map.addLayer({
      id: 'municipality-selected',
      type: 'line',
      source: 'municipalities',
      filter: ['==', ['get', 'id'], '__none__'],
      paint: {
        'line-color': '#ff7047',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3.2, 13, 4.2],
        'line-opacity': 0.96
      }
    });

    applyMapBounds();
    syncStyle({ fit: true });
  }

  function popupNode(commune, interactive = false) {
    const root = document.createElement('div');
    root.className = 'maplibre-popup';
    const tags = [
      commune.isPrime ? 'Client Prime' : '',
      commune.integrator || '',
      commune.software || '',
      commune.erp ? `ERP ${commune.erp}` : ''
    ].filter(Boolean);

    root.innerHTML = `
      <strong>${html(commune.name)}</strong>
      <span>${html(commune.canton)} · ${nf.format(commune.expectedPopulation)} habitants</span>
      <div class="maplibre-popup-meta">${tags.map(tag => `<i>${html(tag)}</i>`).join('')}</div>
      ${commune.products?.length ? `<small>Modules · ${html(commune.products.join(' · '))}</small>` : ''}`;

    if (interactive) {
      const button = document.createElement('button');
      button.className = 'maplibre-popup-action';
      button.type = 'button';
      button.textContent = 'Fiche complète →';
      button.onclick = event => {
        event.stopPropagation();
        clickPopup?.remove();
        if (typeof openDrawer === 'function') openDrawer(commune);
      };
      root.append(button);
    }
    return root;
  }

  function selectMunicipality(id) {
    selectedId = String(id || '');
    syncLayerFilters();
  }

  function showClickPopup(commune, lngLat) {
    hoverPopup?.remove();
    if (!clickPopup) {
      clickPopup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: true,
        offset: 10,
        maxWidth: '300px'
      });
    }
    clickPopup
      .setLngLat(lngLat)
      .setDOMContent(popupNode(commune, true))
      .addTo(map);
    selectMunicipality(commune.id);
  }

  function bindInteractions() {
    map.on('mouseenter', 'municipalities-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'municipalities-fill', () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mousemove', 'municipalities-fill', event => {
      if (window.matchMedia('(max-width:680px)').matches || clickPopup?.isOpen()) return;
      const id = event.features?.[0]?.properties?.id;
      const commune = all.find(row => String(row.id) === String(id));
      if (!commune) return;
      if (!hoverPopup) {
        hoverPopup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 9,
          maxWidth: '280px'
        });
      }
      hoverPopup
        .setLngLat(event.lngLat)
        .setDOMContent(popupNode(commune))
        .addTo(map);
    });
    map.on('mouseleave', 'municipalities-fill', () => hoverPopup?.remove());
    map.on('click', 'municipalities-fill', event => {
      const id = event.features?.[0]?.properties?.id;
      const commune = all.find(row => String(row.id) === String(id));
      if (commune) showClickPopup(commune, event.lngLat);
    });
    map.on('click', event => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['municipalities-fill'] });
      if (!features.length) {
        selectMunicipality('');
        clickPopup?.remove();
      }
    });
  }

  async function waitForData() {
    if (all.length) return;
    await new Promise(resolve => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (all.length || Date.now() - started > 7000) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  }

  async function ensureGeometry() {
    if (!mapGeometry && typeof loadMap === 'function') await loadMap();
    if (!mapGeometry) throw new Error('Géométrie cartographique indisponible.');
  }

  async function ensureMapLibre() {
    if (map) {
      setTimeout(() => {
        map.resize();
        applyMapBounds();
      }, 0);
      return map;
    }
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      ensureMetrics();
      ensureStage();
      await waitForData();
      populateToolbarOptions();
      syncMetrics();
      await ensureGeometry();
      renderMetricMaps();
      if (!all.length) throw new Error('Données communales indisponibles.');
      buildGeoJSON();

      maplibregl = await import(MAPLIBRE_MODULE);
      const bounds = swissBounds();

      map = new maplibregl.Map({
        container: document.getElementById('primeMapLibre'),
        style: {
          version: 8,
          glyphs: GLYPHS_URL,
          sources: {},
          layers: [{
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#26343f' }
          }]
        },
        center: [6.75, 46.65],
        zoom: 7.25,
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        renderWorldCopies: false,
        maxBounds: bounds
      });

      map.addControl(new maplibregl.NavigationControl({
        showCompass: false,
        visualizePitch: false
      }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({
        maxWidth: 80,
        unit: 'metric'
      }), 'bottom-left');

      map.touchZoomRotate.disableRotation();

      map.on('load', () => {
        addLayers();
        bindInteractions();
        syncMetrics();
        renderMetricMaps();
        const loading = document.getElementById('mapLibreLoading');
        if (loading) loading.hidden = true;
      });

      map.on('error', event => {
        if (event?.error) console.error('Prime Communes · MapLibre', event.error);
      });

      return map;
    })().catch(error => {
      const loading = document.getElementById('mapLibreLoading');
      if (loading) {
        loading.innerHTML = `<div class="maplibre-error">La carte n’a pas pu démarrer sur cet appareil.<br>${html(error?.message || error)}</div>`;
      }
      loadingPromise = null;
      throw error;
    });

    return loadingPromise;
  }

  function closeSuggestions() {
    suggestions = [];
    suggestionIndex = -1;
    if (suggestionsBox) suggestionsBox.hidden = true;
    query?.setAttribute('aria-expanded', 'false');
  }

  function suggestionMatches(value) {
    const needle = normalizeText(value);
    if (needle.length < 2) return [];
    const filtered = all.filter(row => !cantonFilter || row.canton === cantonFilter);

    return filtered
      .map(row => {
        const name = normalizeText(row.name);
        if (!name.includes(needle)) return null;
        return { row, rank: name.startsWith(needle) ? 0 : 1 };
      })
      .filter(Boolean)
      .sort((a, b) =>
        a.rank - b.rank ||
        a.row.name.localeCompare(b.row.name, 'fr-CH')
      )
      .slice(0, 8)
      .map(item => item.row);
  }

  function renderSuggestions(value) {
    if (!suggestionsBox) return;
    suggestions = suggestionMatches(value);
    suggestionIndex = -1;

    if (!suggestions.length) {
      closeSuggestions();
      return;
    }

    suggestionsBox.innerHTML = suggestions.map((commune, index) => `
      <button type="button" role="option" data-index="${index}">
        <strong>${html(commune.name)}</strong>
        <b>${nf.format(commune.expectedPopulation)}</b>
      </button>`
    ).join('');

    suggestionsBox.hidden = false;
    query.setAttribute('aria-expanded', 'true');

    suggestionsBox.querySelectorAll('button').forEach(button => {
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => chooseSuggestion(Number(button.dataset.index)));
    });
  }

  function paintSuggestionIndex() {
    suggestionsBox?.querySelectorAll('button').forEach((button, index) => {
      button.classList.toggle('active', index === suggestionIndex);
    });
  }

  function findCommune(value) {
    const needle = normalizeText(value);
    if (!needle) return null;
    const filtered = all.filter(row => !cantonFilter || row.canton === cantonFilter);
    return filtered.find(row => normalizeText(row.name) === needle)
      || filtered.find(row => normalizeText(row.name).startsWith(needle))
      || filtered.find(row => normalizeText(row.name).includes(needle))
      || null;
  }

  function focusCommune(commune) {
    if (!commune) return;
    query.value = commune.name;
    closeSuggestions();

    ensureMapLibre().then(() => {
      const point = pointGeoJSON?.features?.find(feature =>
        String(feature.properties.id) === String(commune.id)
      );
      if (!point) return;

      if (cantonSelect && cantonFilter && commune.canton !== cantonFilter) {
        cantonFilter = '';
        cantonSelect.value = '';
        syncLayerFilters();
      }

      map.easeTo({
        center: point.geometry.coordinates,
        zoom: Math.max(map.getZoom(), 11),
        duration: 520
      });
      showClickPopup(commune, point.geometry.coordinates);
    }).catch(() => {});
  }

  function chooseSuggestion(index) {
    const commune = suggestions[index];
    if (commune) focusCommune(commune);
  }

  function bindSearch() {
    query.addEventListener('input', event => renderSuggestions(event.currentTarget.value));
    query.addEventListener('focus', event => renderSuggestions(event.currentTarget.value));
    query.addEventListener('blur', () => window.setTimeout(closeSuggestions, 120));
    query.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown' && suggestions.length) {
        event.preventDefault();
        suggestionIndex = (suggestionIndex + 1) % suggestions.length;
        paintSuggestionIndex();
        return;
      }
      if (event.key === 'ArrowUp' && suggestions.length) {
        event.preventDefault();
        suggestionIndex = (suggestionIndex - 1 + suggestions.length) % suggestions.length;
        paintSuggestionIndex();
        return;
      }
      if (event.key === 'Escape') {
        closeSuggestions();
        return;
      }
      if (event.key !== 'Enter') return;

      const commune = suggestionIndex >= 0
        ? suggestions[suggestionIndex]
        : findCommune(event.currentTarget.value);
      if (!commune) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      focusCommune(commune);
      query.blur();
    }, true);
  }

  function syncViewSelection() {
    if (!viewSelect) return;
    const value = viewSelect.value;

    if (value === 'impact') {
      mapPerspective = 'impact';
      mapMode = 'integrator';
    } else {
      mapPerspective = 'factual';
      mapMode = value;
    }

    const productLabel = productSelect?.closest('.maplibre-product-filter');
    if (productLabel) productLabel.hidden = value !== 'product';
    if (value === 'product' && productSelect?.value) mapProduct = productSelect.value;

    syncStyle();
    fitActiveScope();
  }

  function recordRoadmap() {
    const stage11 = [...document.querySelectorAll('.roadmap-stage')]
      .find(node => node.querySelector('.roadmap-version')?.textContent.trim() === '1.1');
    const items = stage11?.querySelector('.roadmap-items');
    if (!items) return;

    const existing = [...items.querySelectorAll('div')]
      .find(node => /MapLibre|Carte 1\.2/i.test(node.textContent));
    const roadHtml = '<strong>Carte 1.2 · MapLibre</strong><span>Carte unique : stats compactes, recherche commune avec habitants, cadrage Romandie, limites bloquées au raster, frontières officielles, noms au zoom et infobulles légères.</span><small>Ancienne carte et comparateur retirés de l’interface.</small>';

    if (existing) existing.innerHTML = roadHtml;
    else {
      const item = document.createElement('div');
      item.innerHTML = roadHtml;
      items.prepend(item);
    }
  }

  injectAssets();
  ensureMetrics();
  ensureStage();
  configureToolbar();
  recordRoadmap();
  legacyStage.hidden = true;

  waitForData().then(async () => {
    populateToolbarOptions();
    syncMetrics();
    try {
      await ensureGeometry();
      renderMetricMaps();
    } catch (_) {
      // The map itself will surface a clear error if geometry truly cannot load.
    }
  });

  document.getElementById('syncReload')?.addEventListener('click', () => {
    setTimeout(() => {
      populateToolbarOptions();
      syncMetrics();
      renderMetricMaps();
      if (map) syncStyle();
    }, 700);
  });

  document.querySelector('[data-view="map"]')?.addEventListener('click', () => {
    ensureMapLibre().then(() => {
      setTimeout(() => {
        map?.resize();
        applyMapBounds();
        fitActiveScope();
      }, 120);
    }).catch(() => {});
  });

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (!map) return;
      map.resize();
      applyMapBounds();
    }, 140);
  });
})();