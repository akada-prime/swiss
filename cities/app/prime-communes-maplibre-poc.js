(() => {
  'use strict';

  // Prime Communes · Carte 1.2 / MapLibre.
  // MapLibre is now the single visible map engine. swisstopo and Prime data stay unchanged.
  const MAPLIBRE_VERSION = '6.7.0';
  const MAPLIBRE_MODULE = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
  const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  const ACTIVE_TERRITORIES = new Set(['JU', 'BE', 'VD', 'FR']);
  const mobileMq = window.matchMedia('(max-width:680px)');

  const panel = document.getElementById('mapPanel');
  const currentStage = document.getElementById('mapStage');
  const query = document.getElementById('mapQuery');
  if (!panel || !currentStage || !query) return;

  let stage = null;
  let metrics = null;
  let map = null;
  let maplibregl = null;
  let hoverPopup = null;
  let clickPopup = null;
  let municipalityGeoJSON = null;
  let cantonGeoJSON = null;
  let pointGeoJSON = null;
  let loadingPromise = null;
  let selectedId = '';
  let suggestionIndex = -1;
  let currentSuggestions = [];
  const labelMarkers = new Map();
  const layerState = { prime: true, innosolvPrime: true, innosolvEco: true, eadmin: true };

  function injectStyles() {
    if (!document.querySelector('link[href*="prime-communes-maplibre-poc.css"]')) {
      const local = document.createElement('link');
      local.rel = 'stylesheet';
      local.href = 'app/prime-communes-maplibre-poc.css?v=3';
      document.head.append(local);
    }
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
    metrics.className = 'maplibre-metrics';
    metrics.id = 'mapLibreMetrics';
    metrics.hidden = true;
    metrics.innerHTML = `
      <article class="stats-kpi maplibre-metric">
        <span>Romandie · empreinte Prime</span>
        <strong id="mapLibreRomandieRatio">—</strong>
        <small id="mapLibreRomandiePopulation">—</small>
      </article>
      <article class="stats-kpi maplibre-metric">
        <span>Territoires innosolvcity Prime</span>
        <strong id="mapLibreActiveRatio">—</strong>
        <small id="mapLibreActivePopulation">—</small>
        <em>Jura · Jura bernois · Vaud · Fribourg francophone</em>
      </article>`;
    currentStage.insertAdjacentElement('beforebegin', metrics);
    return metrics;
  }

  function ensureStage() {
    if (stage) return stage;
    stage = document.createElement('div');
    stage.className = 'maplibre-stage';
    stage.id = 'mapLibreStage';
    stage.hidden = true;
    stage.innerHTML = `
      <div id="primeMapLibre" aria-label="Carte MapLibre de la Suisse romande"></div>
      <div class="maplibre-badge">Carte 1.2 · MapLibre + swisstopo</div>
      <div class="maplibre-loading" id="mapLibreLoading"><span></span>Chargement de la carte…</div>`;
    currentStage.insertAdjacentElement('afterend', stage);
    return stage;
  }

  function arrangeProfessionalLayout() {
    ensureMetrics();
    ensureStage();
    const toolbar = panel.querySelector('.map-toolbar');
    if (toolbar) {
      toolbar.classList.add('maplibre-toolbar');
      metrics.insertAdjacentElement('afterend', toolbar);
      toolbar.insertAdjacentElement('afterend', stage);
    }
    currentStage.hidden = true;
    const frOption = document.querySelector('#statsScope option[value="FR-welsch"]');
    if (frOption) frOption.textContent = 'Fribourg francophone';
  }

  function coverage(rows) {
    const total = rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const covered = rows.filter(row => row.isPrime).reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    return { covered, share: total ? covered / total * 100 : 0, ratio: covered ? Math.max(1, Math.round(total / covered)) : 0 };
  }

  function syncMetrics() {
    if (!all.length) return;
    const romandie = all.filter(row => row.market === 'Welsch');
    const active = all.filter(row => row.market === 'Welsch' && ACTIVE_TERRITORIES.has(row.canton));
    const r = coverage(romandie);
    const a = coverage(active);
    const set = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value; };
    set('mapLibreRomandieRatio', r.ratio ? `1 Romand sur ${r.ratio}` : '—');
    set('mapLibreRomandiePopulation', `${fmt.format(r.covered)} habitants · ${pct.format(r.share)}%`);
    set('mapLibreActiveRatio', a.ratio ? `1 habitant sur ${a.ratio}` : '—');
    set('mapLibreActivePopulation', `${fmt.format(a.covered)} habitants · ${pct.format(a.share)}%`);
    renderLayerLegend();
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
      const x = Number(token);
      const y = Number(tokens[i++]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (command === 'M' && ring.length) closeRing();
      ring.push(lv95ToWgs84(x, -y));
      command = 'L';
    }
    if (ring.length) closeRing();
    return rings;
  }

  function geometryFromRings(rings) {
    if (!rings.length) return null;
    return rings.length === 1 ? { type: 'Polygon', coordinates: [rings[0]] } : { type: 'MultiPolygon', coordinates: rings.map(ring => [ring]) };
  }

  function municipalityFeature(shape, lookup) {
    const commune = lookup.get(String(shape.id));
    const geometry = geometryFromRings(parsePathRings(shape.d));
    if (!geometry) return null;
    return {
      type: 'Feature', id: String(shape.id),
      properties: {
        id: String(shape.id), name: commune?.name || '', canton: commune?.canton || '', market: commune?.market || '',
        population: Number(commune?.expectedPopulation || 0), isPrime: Boolean(commune?.isPrime), integrator: commune?.integrator || '',
        software: commune?.software || '', erp: commune?.erp || '', products: (commune?.products || []).join(' · '),
        isInnosolv: commune?.software === 'innosolvcity', hasEadmin: Boolean(commune?.products?.includes('eAdmin')),
        productMatch: Boolean(commune?.products?.includes(mapProduct))
      },
      geometry
    };
  }

  function cantonFeature(shape) {
    const geometry = geometryFromRings(parsePathRings(shape.d));
    if (!geometry) return null;
    return { type: 'Feature', id: String(shape.code), properties: { code: String(shape.code) }, geometry };
  }

  function coordinatesOf(geometry) {
    const result = [];
    const walk = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) result.push([Number(value[0]), Number(value[1])]);
      else value.forEach(walk);
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
      type: 'Feature', id: String(commune.id),
      properties: { id: String(commune.id), name: commune.name, canton: commune.canton, population: Number(commune.expectedPopulation || 0), isPrime: Boolean(commune.isPrime), isInnosolv: commune.software === 'innosolvcity', hasEadmin: Boolean(commune.products?.includes('eAdmin')) },
      geometry: { type: 'Point', coordinates: [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2] }
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
    cantonGeoJSON = { type: 'FeatureCollection', features: (mapGeometry?.cantons || []).map(cantonFeature).filter(Boolean) };
  }

  function paletteExpression(key, palette) {
    const values = Object.entries(palette || {}).flatMap(([name, color]) => [name, color]);
    return ['match', ['get', key], ...values, mapFallback];
  }

  function fillColorExpression() {
    if (mapPerspective === 'impact') return layerState.prime ? ['case', ['==', ['get', 'isPrime'], true], '#1596e6', '#d8e1e6'] : '#d8e1e6';
    if (mapMode === 'product') return ['case', ['==', ['get', 'productMatch'], true], '#36d494', '#50616e'];
    return paletteExpression(mapMode === 'software' ? 'software' : 'integrator', mapPalettes[mapMode]);
  }

  function fillOpacityExpression() {
    if (mapPerspective === 'impact') return layerState.prime ? ['case', ['==', ['get', 'isPrime'], true], 0.54, 0.09] : 0.09;
    return 0.72;
  }

  function innosolvFilter() {
    if (layerState.innosolvPrime && layerState.innosolvEco) return ['==', ['get', 'isInnosolv'], true];
    if (layerState.innosolvPrime) return ['all', ['==', ['get', 'isInnosolv'], true], ['==', ['get', 'isPrime'], true]];
    if (layerState.innosolvEco) return ['all', ['==', ['get', 'isInnosolv'], true], ['==', ['get', 'isPrime'], false]];
    return ['==', ['get', 'isInnosolv'], '__hidden__'];
  }

  function applyLayerState() {
    if (!map || !map.isStyleLoaded()) return;
    const impact = mapPerspective === 'impact';
    for (const id of ['prime-halo', 'prime-core']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', impact && layerState.prime ? 'visible' : 'none');
    if (map.getLayer('innosolv-dots')) {
      map.setFilter('innosolv-dots', innosolvFilter());
      map.setLayoutProperty('innosolv-dots', 'visibility', impact && (layerState.innosolvPrime || layerState.innosolvEco) ? 'visible' : 'none');
    }
    if (map.getLayer('eadmin-dots')) map.setLayoutProperty('eadmin-dots', 'visibility', impact && layerState.eadmin ? 'visible' : 'none');
  }

  function syncMapData() {
    if (!mapGeometry || !all.length) return;
    buildGeoJSON();
    map?.getSource('municipalities')?.setData(municipalityGeoJSON);
    map?.getSource('municipality-points')?.setData(pointGeoJSON);
    map?.getSource('cantons')?.setData(cantonGeoJSON);
  }

  function syncStyle({ fit = false } = {}) {
    if (!map || !map.isStyleLoaded()) return;
    syncMapData();
    if (map.getLayer('municipalities-fill')) {
      map.setPaintProperty('municipalities-fill', 'fill-color', fillColorExpression());
      map.setPaintProperty('municipalities-fill', 'fill-opacity', fillOpacityExpression());
    }
    applyLayerState();
    syncMetrics();
    syncMunicipalityLabels();
    if (fit) fitCurrentPerspective();
  }

  function boundsFromBox(box) {
    const [x, y, w, h] = box.map(Number);
    const points = [lv95ToWgs84(x, -y), lv95ToWgs84(x + w, -y), lv95ToWgs84(x + w, -(y + h)), lv95ToWgs84(x, -(y + h))];
    return [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]];
  }

  function boundsFromFeatures(features) {
    const points = (features || []).flatMap(feature => coordinatesOf(feature.geometry));
    if (!points.length) return null;
    return [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]];
  }

  function territoryFeatures(key) {
    const features = municipalityGeoJSON?.features || [];
    if (key === 'romandie') return features.filter(feature => feature.properties.market === 'Welsch');
    if (key === 'JU') return features.filter(feature => feature.properties.canton === 'JU');
    if (key === 'BE-welsch') return features.filter(feature => feature.properties.canton === 'BE' && feature.properties.market === 'Welsch');
    if (key === 'VD') return features.filter(feature => feature.properties.canton === 'VD');
    if (key === 'FR-welsch') return features.filter(feature => feature.properties.canton === 'FR' && feature.properties.market === 'Welsch');
    if (key === 'GE') return features.filter(feature => feature.properties.canton === 'GE');
    if (key === 'VS-welsch') return features.filter(feature => feature.properties.canton === 'VS' && feature.properties.market === 'Welsch');
    return [];
  }

  function fitTerritory(key = 'romandie') {
    if (!map) return;
    const bounds = boundsFromFeatures(territoryFeatures(key));
    if (!bounds) return;
    document.querySelectorAll('[data-map-territory]').forEach(button => button.classList.toggle('active', button.dataset.mapTerritory === key));
    map.fitBounds(bounds, { padding: mobileMq.matches ? 12 : 26, duration: 420, maxZoom: 10.4 });
  }

  function fitCurrentPerspective() {
    if (!map || !mapGeometry) return;
    if (mapPerspective === 'impact') return fitTerritory('romandie');
    map.fitBounds(boundsFromBox(mapGeometry.meta.viewBox), { padding: mobileMq.matches ? 8 : 18, duration: 380 });
  }

  function addLayers() {
    const [x, y, w, h] = mapGeometry.meta.viewBox;
    const imageCoordinates = [lv95ToWgs84(x, -y), lv95ToWgs84(x + w, -y), lv95ToWgs84(x + w, -(y + h)), lv95ToWgs84(x, -(y + h))];

    map.addSource('swisstopo-base', { type: 'image', url: 'public/swiss-base.webp', coordinates: imageCoordinates });
    map.addLayer({ id: 'swisstopo-base', type: 'raster', source: 'swisstopo-base', paint: { 'raster-opacity': 1, 'raster-brightness-min': 0.24, 'raster-brightness-max': 0.98, 'raster-contrast': -0.15, 'raster-saturation': -0.08 } });

    map.addSource('municipalities', { type: 'geojson', data: municipalityGeoJSON, promoteId: 'id' });
    map.addLayer({ id: 'municipalities-fill', type: 'fill', source: 'municipalities', paint: { 'fill-color': fillColorExpression(), 'fill-opacity': fillOpacityExpression() } });
    map.addLayer({ id: 'municipalities-line', type: 'line', source: 'municipalities', paint: { 'line-color': 'rgba(236,247,252,.98)', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.08, 8, 0.25, 10, 0.68, 12, 0.94], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.22, 8, 0.42, 10, 0.9, 12, 1.5] } });

    map.addSource('cantons', { type: 'geojson', data: cantonGeoJSON });
    map.addLayer({ id: 'cantons-border-casing', type: 'line', source: 'cantons', paint: { 'line-color': 'rgba(13,28,39,.86)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 9, 3.5, 12, 4.6], 'line-opacity': 0.82 } });
    map.addLayer({ id: 'cantons-border', type: 'line', source: 'cantons', paint: { 'line-color': 'rgba(242,249,252,.96)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.9, 9, 1.25, 12, 1.85], 'line-opacity': 0.92 } });

    map.addSource('municipality-points', { type: 'geojson', data: pointGeoJSON, promoteId: 'id' });
    map.addLayer({ id: 'prime-halo', type: 'circle', source: 'municipality-points', filter: ['==', ['get', 'isPrime'], true], paint: { 'circle-color': '#159cff', 'circle-opacity': 0.12, 'circle-blur': 0.68, 'circle-radius': ['interpolate', ['linear'], ['get', 'population'], 0, 11, 10000, 18, 100000, 29, 500000, 43] } });
    map.addLayer({ id: 'prime-core', type: 'circle', source: 'municipality-points', filter: ['==', ['get', 'isPrime'], true], paint: { 'circle-color': '#087bc4', 'circle-opacity': 0.92, 'circle-stroke-color': 'rgba(229,247,255,.85)', 'circle-stroke-width': 0.6, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4.2, 13, 6.5] } });
    map.addLayer({ id: 'innosolv-dots', type: 'circle', source: 'municipality-points', filter: innosolvFilter(), paint: { 'circle-color': ['case', ['==', ['get', 'isPrime'], true], '#44dc98', 'rgba(247,250,252,.92)'], 'circle-stroke-color': '#31be7f', 'circle-stroke-width': ['case', ['==', ['get', 'isPrime'], true], 1.1, 2.1], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.8, 10, 4.2, 13, 6] } });
    map.addLayer({ id: 'eadmin-dots', type: 'circle', source: 'municipality-points', filter: ['all', ['==', ['get', 'hasEadmin'], true], ['==', ['get', 'isPrime'], true]], paint: { 'circle-color': '#e52332', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.4, 10, 4, 13, 5.8] } });
    map.addLayer({ id: 'municipality-selected', type: 'line', source: 'municipalities', filter: ['==', ['get', 'id'], '__none__'], paint: { 'line-color': '#ff7047', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 10, 3.2, 13, 4.2], 'line-opacity': 0.96 } });

    syncStyle({ fit: true });
  }

  function popupNode(commune, interactive = false) {
    const root = document.createElement('div');
    root.className = 'maplibre-popup';
    const tags = [commune.isPrime ? 'Client Prime' : '', commune.integrator || '', commune.software || '', commune.erp ? `ERP ${commune.erp}` : ''].filter(Boolean);
    root.innerHTML = `<strong>${esc(commune.name)}</strong><span>${esc(commune.canton)} · ${fmt.format(commune.expectedPopulation)} habitants</span><div class="maplibre-popup-meta">${tags.map(tag => `<i>${esc(tag)}</i>`).join('')}</div>${commune.products?.length ? `<small>Modules · ${esc(commune.products.join(' · '))}</small>` : ''}`;
    if (interactive) {
      const button = document.createElement('button');
      button.className = 'maplibre-popup-action';
      button.type = 'button';
      button.textContent = 'Fiche complète →';
      button.onclick = event => { event.stopPropagation(); clickPopup?.remove(); openDrawer(commune); };
      root.append(button);
    }
    return root;
  }

  function selectMunicipality(id) {
    selectedId = String(id || '');
    if (map?.getLayer('municipality-selected')) map.setFilter('municipality-selected', ['==', ['get', 'id'], selectedId || '__none__']);
  }

  function showClickPopup(commune, lngLat) {
    hoverPopup?.remove();
    if (!clickPopup) clickPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 10, maxWidth: '300px' });
    clickPopup.setLngLat(lngLat).setDOMContent(popupNode(commune, true)).addTo(map);
    selectMunicipality(commune.id);
  }

  function bindInteractions() {
    map.on('mouseenter', 'municipalities-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'municipalities-fill', () => { map.getCanvas().style.cursor = ''; });
    map.on('mousemove', 'municipalities-fill', event => {
      if (mobileMq.matches || clickPopup?.isOpen()) return;
      const id = event.features?.[0]?.properties?.id;
      const commune = all.find(row => String(row.id) === String(id));
      if (!commune) return;
      if (!hoverPopup) hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 9, maxWidth: '280px' });
      hoverPopup.setLngLat(event.lngLat).setDOMContent(popupNode(commune)).addTo(map);
    });
    map.on('mouseleave', 'municipalities-fill', () => hoverPopup?.remove());
    map.on('click', 'municipalities-fill', event => {
      const id = event.features?.[0]?.properties?.id;
      const commune = all.find(row => String(row.id) === String(id));
      if (commune) showClickPopup(commune, event.lngLat);
    });
    map.on('click', event => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['municipalities-fill'] });
      if (!features.length) { selectMunicipality(''); clickPopup?.remove(); }
    });
    map.on('moveend', syncMunicipalityLabels);
    map.on('zoomend', syncMunicipalityLabels);
  }

  function clearLabels() {
    labelMarkers.forEach(marker => marker.remove());
    labelMarkers.clear();
  }

  function syncMunicipalityLabels() {
    if (!map || !maplibregl || !pointGeoJSON) return;
    if (map.getZoom() < 10.1) return clearLabels();
    const bounds = map.getBounds();
    const visible = pointGeoJSON.features.filter(feature => bounds.contains(feature.geometry.coordinates)).slice(0, 90);
    const ids = new Set(visible.map(feature => String(feature.properties.id)));
    labelMarkers.forEach((marker, id) => { if (!ids.has(id)) { marker.remove(); labelMarkers.delete(id); } });
    visible.forEach(feature => {
      const id = String(feature.properties.id);
      if (labelMarkers.has(id)) return;
      const el = document.createElement('span');
      el.className = 'maplibre-commune-label';
      el.textContent = feature.properties.name;
      const marker = new maplibregl.Marker({ element: el, anchor: 'center', offset: [0, -12] }).setLngLat(feature.geometry.coordinates).addTo(map);
      labelMarkers.set(id, marker);
    });
  }

  function normalise(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-CH').trim();
  }

  function candidates(value) {
    const q = normalise(value);
    if (q.length < 3) return [];
    return all.filter(row => row.market === 'Welsch' && normalise(row.name).includes(q)).sort((a, b) => {
      const as = normalise(a.name).startsWith(q) ? 0 : 1;
      const bs = normalise(b.name).startsWith(q) ? 0 : 1;
      return as - bs || a.name.localeCompare(b.name, 'fr-CH', { sensitivity: 'base' });
    }).slice(0, 8);
  }

  function focusCommune(commune) {
    if (!map || !commune || !pointGeoJSON) return;
    const point = pointGeoJSON.features.find(feature => String(feature.properties.id) === String(commune.id));
    if (!point) return;
    map.easeTo({ center: point.geometry.coordinates, zoom: Math.max(map.getZoom(), 11), duration: 550 });
    showClickPopup(commune, point.geometry.coordinates);
  }

  function ensureSearchUi() {
    const label = query.closest('.map-search');
    if (!label || document.getElementById('mapSuggestions')) return;
    label.classList.add('map-search-smart');
    const ghost = document.createElement('div');
    ghost.className = 'map-search-ghost';
    ghost.id = 'mapSearchGhost';
    const suggestions = document.createElement('div');
    suggestions.className = 'map-suggestions';
    suggestions.id = 'mapSuggestions';
    suggestions.hidden = true;
    label.append(ghost, suggestions);

    const render = () => {
      currentSuggestions = candidates(query.value);
      suggestionIndex = currentSuggestions.length ? 0 : -1;
      suggestions.hidden = !currentSuggestions.length;
      suggestions.innerHTML = currentSuggestions.map((row, index) => `<button type="button" data-map-suggestion="${esc(String(row.id))}" class="${index === suggestionIndex ? 'active' : ''}"><strong>${esc(row.name)}</strong><span>${esc(row.canton)} · ${fmt.format(row.expectedPopulation)} hab.</span></button>`).join('');
      const best = currentSuggestions[0];
      if (best && normalise(best.name).startsWith(normalise(query.value))) {
        const typed = query.value;
        ghost.innerHTML = `<i>${esc(typed)}</i>${esc(best.name.slice(typed.length))}`;
      } else ghost.textContent = '';
    };

    query.addEventListener('input', render);
    query.addEventListener('keydown', event => {
      if (!currentSuggestions.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        suggestionIndex = (suggestionIndex + (event.key === 'ArrowDown' ? 1 : -1) + currentSuggestions.length) % currentSuggestions.length;
        [...suggestions.querySelectorAll('button')].forEach((button, index) => button.classList.toggle('active', index === suggestionIndex));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        const commune = currentSuggestions[Math.max(0, suggestionIndex)];
        if (!commune) return;
        query.value = commune.name;
        suggestions.hidden = true;
        ghost.textContent = '';
        query.blur();
        focusCommune(commune);
      }
      if (event.key === 'Escape') { suggestions.hidden = true; ghost.textContent = ''; }
    }, true);
    suggestions.addEventListener('click', event => {
      const button = event.target.closest('[data-map-suggestion]');
      if (!button) return;
      const commune = all.find(row => String(row.id) === button.dataset.mapSuggestion);
      if (!commune) return;
      query.value = commune.name;
      suggestions.hidden = true;
      ghost.textContent = '';
      focusCommune(commune);
    });
    document.addEventListener('pointerdown', event => { if (!label.contains(event.target)) suggestions.hidden = true; });
  }

  function ensureTerritoryControls() {
    const toolbar = panel.querySelector('.map-toolbar');
    if (!toolbar || document.getElementById('mapTerritories')) return;
    const row = document.createElement('div');
    row.className = 'map-utility-row map-territories';
    row.id = 'mapTerritories';
    row.innerHTML = `<span>Territoire</span><div>
      <button class="active" data-map-territory="romandie">Romandie</button><button data-map-territory="JU">Jura</button><button data-map-territory="BE-welsch">Jura bernois</button><button data-map-territory="VD">Vaud</button><button data-map-territory="FR-welsch">Fribourg francophone</button><button data-map-territory="GE">Genève</button><button data-map-territory="VS-welsch">Valais</button>
    </div>`;
    toolbar.append(row);
    row.addEventListener('click', event => { const button = event.target.closest('[data-map-territory]'); if (button) fitTerritory(button.dataset.mapTerritory); });
  }

  function renderLayerLegend() {
    const legend = document.getElementById('mapLegend');
    if (!legend || !all.length) return;
    const rows = all.filter(row => row.market === 'Welsch');
    const counts = {
      prime: rows.filter(row => row.isPrime).length,
      innosolvPrime: rows.filter(row => row.isPrime && row.software === 'innosolvcity').length,
      innosolvEco: rows.filter(row => !row.isPrime && row.software === 'innosolvcity').length,
      eadmin: rows.filter(row => row.isPrime && row.products?.includes('eAdmin')).length
    };
    legend.classList.add('maplibre-layer-legend');
    legend.innerHTML = [
      ['prime', 'prime', 'Communes Prime', counts.prime],
      ['innosolvPrime', 'innosolv-prime', 'innosolvcity · Prime', counts.innosolvPrime],
      ['innosolvEco', 'innosolv-eco', 'innosolvcity · écosystème', counts.innosolvEco],
      ['eadmin', 'eadmin', 'eAdmin · Prime', counts.eadmin]
    ].map(([key, dot, label, count]) => `<button type="button" data-map-layer="${key}" class="${layerState[key] ? 'active' : ''}"><i class="${dot}"></i><span>${label}</span><b>${count}</b></button>`).join('');
    if (!legend.dataset.bound12) {
      legend.dataset.bound12 = '1';
      legend.addEventListener('click', event => {
        const button = event.target.closest('[data-map-layer]');
        if (!button) return;
        const key = button.dataset.mapLayer;
        layerState[key] = !layerState[key];
        renderLayerLegend();
        if (map?.getLayer('municipalities-fill')) {
          map.setPaintProperty('municipalities-fill', 'fill-color', fillColorExpression());
          map.setPaintProperty('municipalities-fill', 'fill-opacity', fillOpacityExpression());
        }
        applyLayerState();
      });
    }
  }

  async function waitForData() {
    if (all.length) return;
    await new Promise(resolve => {
      const started = Date.now();
      const timer = setInterval(() => { if (all.length || Date.now() - started > 5000) { clearInterval(timer); resolve(); } }, 80);
    });
  }

  async function ensureMapLibre() {
    if (map) { setTimeout(() => map.resize(), 0); return map; }
    if (loadingPromise) return loadingPromise;
    loadingPromise = (async () => {
      await waitForData();
      if (!mapGeometry) await loadMap();
      if (!mapGeometry || !all.length) throw new Error('Données cartographiques indisponibles.');
      buildGeoJSON();
      maplibregl = await import(MAPLIBRE_MODULE);
      map = new maplibregl.Map({
        container: document.getElementById('primeMapLibre'),
        style: { version: 8, sources: {}, layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#c8d2d8' } }] },
        center: [6.75, 46.65], zoom: 7.25, attributionControl: false, dragRotate: false, pitchWithRotate: false,
        maxBounds: [[5.55, 45.35], [10.85, 48.05]]
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
      map.touchZoomRotate.disableRotation();
      map.on('load', () => {
        addLayers();
        bindInteractions();
        syncMetrics();
        ensureSearchUi();
        ensureTerritoryControls();
        const loading = document.getElementById('mapLibreLoading');
        if (loading) loading.hidden = true;
      });
      map.on('error', event => { if (event?.error) console.error('Prime Communes · MapLibre', event.error); });
      return map;
    })().catch(error => {
      const loading = document.getElementById('mapLibreLoading');
      if (loading) loading.innerHTML = `<div class="maplibre-error">La carte n’a pas pu démarrer sur cet appareil.<br>${esc(error?.message || error)}</div>`;
      loadingPromise = null;
      throw error;
    });
    return loadingPromise;
  }

  async function activateMapLibre() {
    arrangeProfessionalLayout();
    currentStage.hidden = true;
    stage.hidden = false;
    metrics.hidden = false;
    try {
      await ensureMapLibre();
      syncStyle();
      setTimeout(() => { map?.resize(); fitCurrentPerspective(); }, 0);
    } catch (_) {}
  }

  document.querySelectorAll('[data-map-perspective],[data-map-mode]').forEach(button => {
    button.addEventListener('click', () => setTimeout(() => { if (map) syncStyle({ fit: button.hasAttribute('data-map-perspective') }); }, 0));
  });
  document.getElementById('mapProduct')?.addEventListener('change', () => setTimeout(() => { if (map) syncStyle(); }, 0));
  document.getElementById('syncReload')?.addEventListener('click', () => setTimeout(() => { if (map) syncStyle(); }, 700));
  document.querySelector('[data-view="map"]')?.addEventListener('click', () => setTimeout(activateMapLibre, 80));

  function recordRoadmap() {
    const stage15 = [...document.querySelectorAll('.roadmap-stage')].find(node => node.querySelector('.roadmap-version')?.textContent.trim() === '1.5');
    const items = stage15?.querySelector('.roadmap-items');
    if (!items) return;
    const existing = [...items.querySelectorAll('div')].find(node => /MapLibre|Carte 1\.2/i.test(node.textContent));
    const html = '<strong>Carte 1.2 · MapLibre</strong><span>Carte professionnelle unique : swisstopo, navigation native, recherche assistée, cadrages territoriaux, couches interactives, frontières et libellés au zoom.</span><small>Étape réalisée avant la 1.5 · ancien moteur retiré de l’interface</small>';
    if (existing) existing.innerHTML = html;
    else { const item = document.createElement('div'); item.innerHTML = html; items.prepend(item); }
  }

  injectStyles();
  arrangeProfessionalLayout();
  ensureSearchUi();
  ensureTerritoryControls();
  recordRoadmap();
  setTimeout(() => { if (!document.getElementById('mapView')?.hidden) activateMapLibre(); }, 120);
})();