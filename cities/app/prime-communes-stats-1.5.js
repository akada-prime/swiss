(() => {
  'use strict';

  // Prime Communes · Stats 1.5
  // Canonical Stats enhancement: Prime + innosolvcity hero, compact KPI rhythm,
  // and a data-driven Switzerland footprint. Reads DATA 1.5 only.
  const GEOMETRY_URL = 'public/data/swiss-map-v1.json';
  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const root = document.getElementById('statsView');
  const hero = root?.querySelector('.stats-kpi-prime');
  const scopeSelect = document.getElementById('statsScope');
  const metricButtons = [...document.querySelectorAll('[data-stats-metric]')];
  const thresholdButtons = [...document.querySelectorAll('[data-stats-threshold]')];
  const statsTab = document.querySelector('[data-view="stats"]');
  if (!root || !hero || !window.PrimeCommunesData) return;

  let snapshot = null;
  let geometry = null;
  const geometryPromise = fetch(GEOMETRY_URL, { cache: 'force-cache' })
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);

  function currentMetric() {
    return metricButtons.find(button => button.classList.contains('active'))?.dataset.statsMetric || 'population';
  }

  function currentThreshold() {
    return Number(thresholdButtons.find(button => button.classList.contains('active'))?.dataset.statsThreshold || 0);
  }

  function scopeLabel() {
    return scopeSelect?.selectedOptions?.[0]?.textContent?.trim() || 'Suisse romande';
  }

  function isRomandieScope() {
    return (scopeSelect?.value || 'romandie') === 'romandie';
  }

  function ensureHeroMarkup() {
    if (hero.dataset.stats15 === '1') return;
    hero.dataset.stats15 = '1';
    hero.classList.add('stats-prime-hero');
    hero.innerHTML = `
      <div class="stats-prime-copy">
        <span class="stats-prime-eyebrow">Part Prime · innosolvcity</span>
        <strong id="statsPrimeShare">—</strong>
        <small id="statsPrimeDetail">—</small>
        <div class="stats-prime-meta">
          <span id="statsPrimeCommunes">—</span>
          <span id="statsPrimeRatio">—</span>
        </div>
        <div class="stats-prime-progress" aria-hidden="true"><i id="statsPrimeProgress"></i></div>
      </div>
      <div class="stats-prime-visual" aria-hidden="true">
        <div class="stats-prime-map" id="statsPrimeMap"></div>
      </div>`;
  }

  function scopedRows() {
    if (!snapshot) return [];
    return window.PrimeCommunesData.scopeRows(snapshot.rows, scopeSelect?.value || 'romandie', currentThreshold());
  }

  function primeInnosolvRows(rows) {
    return rows.filter(window.PrimeCommunesData.isPrimeInnosolv);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setProgress(share) {
    const node = document.getElementById('statsPrimeProgress');
    if (node) node.style.width = `${Math.max(0, Math.min(100, share))}%`;
  }

  function renderHero() {
    ensureHeroMarkup();
    const rows = scopedRows();
    const coveredRows = primeInnosolvRows(rows);
    const metric = currentMetric();
    const totalPopulation = rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const coveredPopulation = coveredRows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);
    const totalCommunes = rows.length;
    const coveredCommunes = coveredRows.length;
    const total = metric === 'communes' ? totalCommunes : totalPopulation;
    const covered = metric === 'communes' ? coveredCommunes : coveredPopulation;
    const share = total ? covered / total * 100 : 0;
    const ratio = covered ? Math.max(1, Math.round(total / covered)) : 0;
    const label = scopeLabel();

    setText('statsPrimeShare', `${pf.format(share)}%`);
    setText('statsPrimeDetail', metric === 'communes'
      ? `${nf.format(coveredCommunes)} communes couvertes`
      : `${nf.format(coveredPopulation)} habitants couverts`);
    setText('statsPrimeCommunes', `${nf.format(coveredCommunes)} communes clientes Prime · ${label}`);
    setText('statsPrimeRatio', ratio
      ? (metric === 'population'
          ? `${isRomandieScope() ? '1 Romand' : '1 habitant'} sur ${ratio}`
          : `1 commune sur ${ratio}`)
      : '—');
    setProgress(share);
    renderMiniMap(rows, coveredRows);
  }

  function renderMiniMap(rows, coveredRows) {
    const target = document.getElementById('statsPrimeMap');
    if (!target || !geometry?.meta?.viewBox) return;
    const [x, y, w, h] = geometry.meta.viewBox.map(Number);
    const scopeIds = new Set(rows.map(row => String(row.id)));
    const coveredIds = new Set(coveredRows.map(row => String(row.id)));
    const base = (geometry.cantons || [])
      .map(shape => `<path class="stats-swiss-base" d="${shape.d}"></path>`)
      .join('');
    const scope = (geometry.municipalities || [])
      .filter(shape => scopeIds.has(String(shape.id)))
      .map(shape => `<path class="stats-swiss-scope" d="${shape.d}"></path>`)
      .join('');
    const active = (geometry.municipalities || [])
      .filter(shape => coveredIds.has(String(shape.id)))
      .map(shape => `<path class="stats-swiss-active" d="${shape.d}"></path>`)
      .join('');
    target.innerHTML = `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${base}${scope}${active}</svg>`;
  }

  function queueRender() {
    window.requestAnimationFrame(renderHero);
  }

  window.PrimeCommunesData.subscribe(next => {
    snapshot = next;
    queueRender();
  });

  geometryPromise.then(result => {
    geometry = result;
    if (snapshot) queueRender();
  });

  scopeSelect?.addEventListener('change', queueRender);
  metricButtons.forEach(button => button.addEventListener('click', queueRender));
  thresholdButtons.forEach(button => button.addEventListener('click', queueRender));
  statsTab?.addEventListener('click', queueRender);

  ensureHeroMarkup();
  window.PrimeCommunesData.whenReady().then(next => {
    snapshot = next;
    queueRender();
  });
})();
