(() => {
  'use strict';

  // Prime Communes · DATA 1.5
  // One read-only source layer for every view. It owns transport, normalization,
  // language scopes and the shared data-ready event; views only consume rows.
  const LOCAL_FALLBACK = 'public/data/municipalities-v4.json';
  const PAGE_SIZE = 1000;
  const FRENCH_MARKET = 'Welsch';
  const PRIME_INNOSOLV_SOFTWARE = new Set(['innosolvcity', 'innosolv']);
  const ERP_BY_METIER_LOCAL = {
    ETIC: 'Abacus', Urbanus: 'Urbanus', Citizen: 'Citizen', BDI: 'BDI',
    Epsilon: 'Epsilon', 'Crésus': 'Crésus', Ruf: 'Ruf', Calvin: 'Opale'
  };

  const listeners = new Set();
  let snapshot = null;
  let readyResolve;
  const firstReady = new Promise(resolve => { readyResolve = resolve; });

  const nf = new Intl.NumberFormat('fr-CH');
  const pf = new Intl.NumberFormat('fr-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const byId = id => document.getElementById(id);
  const normalizeText = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-CH')
    .trim();
  const decode = value => {
    const node = document.createElement('textarea');
    node.innerHTML = String(value ?? '');
    return node.value;
  };

  function mapRow(row) {
    return {
      id: row.bfs_id,
      name: row.name,
      canton: row.canton,
      market: row.market,
      districtCode: row.bezirk_code ?? '',
      district: row.bezirk ?? '',
      expectedPopulation: row.expected_population ?? 0,
      receivedPopulation: row.received_population,
      receivedOn: row.received_on ?? '',
      comment: row.comment ?? '',
      echVersion: row.ech_version ?? '',
      missingEwid: row.missing_ewid,
      ewidErrorRate: row.ewid_error_rate,
      deliveryStatus: row.delivery_status ?? 'unknown',
      software: row.software ?? '',
      integrator: row.integrator ?? '',
      primeClient: row.prime_client,
      erp: row.erp ?? '',
      salesStatus: row.sales_status ?? 'none',
      notes: row.notes ?? '',
      products: row.products ?? []
    };
  }

  function normalizeMunicipality(row) {
    const products = [...(row.products ?? [])];
    if (Number(row.id) === 2206 && !products.includes('Clever.Tax')) products.push('Clever.Tax');
    const explicitPrime = row.primeClient ?? row.prime_client;
    const isPrime = explicitPrime == null
      ? Boolean(row.isPrime || row.integrator === 'Prime' || (row.canton === 'GE' && products.includes('eAdmin')))
      : Boolean(explicitPrime);
    const hasExplicitErp = Object.prototype.hasOwnProperty.call(row, 'erp');
    const erp = hasExplicitErp ? (row.erp || '') : (ERP_BY_METIER_LOCAL[row.software] || '');
    return {
      ...row,
      name: decode(row.name),
      district: decode(row.district),
      comment: decode(row.comment),
      products,
      isPrime,
      primeClient: isPrime,
      erp
    };
  }

  const isFrench = row => row?.market === FRENCH_MARKET;
  const isInnosolv = row => PRIME_INNOSOLV_SOFTWARE.has(normalizeText(row?.software));
  const isPrimeInnosolv = row => Boolean(row?.isPrime) && isInnosolv(row);

  function scopeRows(rows, scope = 'romandie', threshold = 0) {
    const source = Array.isArray(rows) ? rows : [];
    let scoped;
    if (scope === 'romandie') {
      scoped = source.filter(isFrench);
    } else if (scope === 'jura-bernois') {
      scoped = source.filter(row => row.canton === 'BE' && isFrench(row) && /jura bernois/i.test(row.district || ''));
    } else if (scope === 'FR-welsch') {
      scoped = source.filter(row => row.canton === 'FR' && isFrench(row));
    } else if (scope === 'VS-welsch') {
      scoped = source.filter(row => row.canton === 'VS' && isFrench(row));
    } else {
      scoped = source.filter(row => row.canton === scope);
    }
    return scoped.filter(row => Number(row.expectedPopulation || 0) >= Number(threshold || 0));
  }

  function publish(rows, meta, source) {
    snapshot = { rows, meta, source };
    if (readyResolve) {
      readyResolve(snapshot);
      readyResolve = null;
    }
    listeners.forEach(listener => {
      try { listener(snapshot); } catch (error) { console.error('Prime Communes · data consumer', error); }
    });
    window.dispatchEvent(new CustomEvent('prime:data-ready', { detail: snapshot }));
  }

  function populateSharedUi(rows, meta, source) {
    const expectedPopulation = Number(meta?.expectedPopulation ?? rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0));
    const municipalityCount = Number(meta?.municipalityCount ?? rows.length);
    const over = rows.filter(row => row.expectedPopulation >= 10000);
    const prime = rows.filter(row => row.isPrime);
    const issues = rows.filter(row => row.deliveryStatus !== 'accepted');
    const overPopulation = over.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0);

    if (byId('population')) byId('population').textContent = nf.format(expectedPopulation);
    if (byId('communeCount')) byId('communeCount').textContent = nf.format(municipalityCount);
    if (byId('headerCommuneCount')) byId('headerCommuneCount').textContent = nf.format(municipalityCount);
    if (byId('over10k')) byId('over10k').textContent = nf.format(over.length);
    if (byId('over10kPop')) byId('over10kPop').textContent = nf.format(overPopulation);
    if (byId('over10kShare')) byId('over10kShare').textContent = `${pf.format(rows.length ? over.length / rows.length * 100 : 0)}%`;
    if (byId('over10kPopShare')) byId('over10kPopShare').textContent = `${pf.format(expectedPopulation ? overPopulation / expectedPopulation * 100 : 0)}%`;
    if (byId('prime')) byId('prime').textContent = nf.format(prime.length);
    if (byId('primePop')) byId('primePop').textContent = nf.format(prime.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0));
    if (byId('issues')) byId('issues').textContent = nf.format(issues.length);
    if (byId('mapCommuneCount')) byId('mapCommuneCount').textContent = nf.format(scopeRows(rows, 'romandie', 0).length);

    const cantonSelect = byId('canton');
    if (cantonSelect) {
      const cantons = [...new Set(rows.map(row => row.canton).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr-CH'));
      cantonSelect.innerHTML = '<option>Tous</option>' + cantons.map(canton => `<option>${String(canton).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))}</option>`).join('');
    }
    if (typeof updateDistrictOptions === 'function') updateDistrictOptions();

    const solutionSelect = byId('solution');
    if (solutionSelect) {
      const solutions = [...new Map(rows.filter(row => row.integrator || row.software).map(row => {
        const value = `${row.integrator || ''}|||${row.software || ''}`;
        const label = `${row.integrator || 'À compléter'} | ${row.software || '—'}`;
        return [value, { value, label }];
      })).values()].sort((a, b) => a.label.localeCompare(b.label, 'fr-CH', { sensitivity: 'base' }));
      const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      solutionSelect.innerHTML = '<option value="Tous">Toutes</option>' + solutions.map(item => `<option value="${escape(item.value)}">${escape(item.label)}</option>`).join('');
    }

    if (typeof updateStatsScopeOptions === 'function') updateStatsScopeOptions();
    const syncText = byId('syncText');
    if (syncText) {
      const referenceDate = meta?.referenceDate || '2026-06-30';
      syncText.textContent = `Données au ${new Date(`${referenceDate}T00:00:00`).toLocaleDateString('fr-CH')} · ${source}`;
    }
  }

  function applyPayload(data, source = 'base live') {
    const rows = (data?.municipalities || []).map(normalizeMunicipality);
    const meta = {
      referenceDate: data?.meta?.referenceDate || '2026-06-30',
      municipalityCount: data?.meta?.municipalityCount ?? rows.length,
      expectedPopulation: data?.meta?.expectedPopulation ?? rows.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
    };

    // `all` remains the temporary compatibility store for the 1.1 shell.
    // Consumers in 1.5 can use PrimeCommunesData.getSnapshot()/subscribe().
    all = rows;
    populateSharedUi(rows, meta, source);
    if (typeof render === 'function') render();
    if (typeof renderStats === 'function') renderStats();
    publish(rows, meta, source);
  }

  async function fetchLive() {
    const supabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
    const supabaseKey = typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : '';
    if (!supabaseUrl || !supabaseKey) throw new Error('Configuration Supabase indisponible.');

    const rows = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const response = await fetch(`${supabaseUrl}/rest/v1/GemeindeAktuell?select=*&order=bfs_id`, {
        headers: { apikey: supabaseKey, Range: `${from}-${from + PAGE_SIZE - 1}` },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      const page = await response.json();
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const municipalities = rows.map(mapRow);
    const referenceDate = rows.find(row => row.reference_date)?.reference_date ?? '2026-06-30';
    return {
      data: {
        meta: {
          referenceDate,
          municipalityCount: municipalities.length,
          expectedPopulation: municipalities.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
        },
        municipalities
      },
      source: 'base live'
    };
  }

  async function load() {
    try {
      return await fetchLive();
    } catch (liveError) {
      const response = await fetch(LOCAL_FALLBACK, { cache: 'no-store' });
      if (!response.ok) throw liveError;
      return { data: await response.json(), source: 'copie locale' };
    }
  }

  async function reload() {
    const syncText = byId('syncText');
    if (syncText) syncText.textContent = 'Actualisation…';
    try {
      const result = await load();
      applyPayload(result.data, result.source);
      return result;
    } catch (error) {
      if (syncText) syncText.textContent = 'Erreur de chargement';
      const rowsNode = byId('rows');
      if (rowsNode) rowsNode.innerHTML = `<tr><td colspan="8">${String(error?.message || error)}</td></tr>`;
      throw error;
    }
  }

  const api = {
    load,
    reload,
    mapRow,
    normalizeMunicipality,
    normalizeText,
    isFrench,
    isInnosolv,
    isPrimeInnosolv,
    scopeRows,
    getSnapshot: () => snapshot,
    whenReady: () => snapshot ? Promise.resolve(snapshot) : firstReady,
    subscribe(listener) {
      listeners.add(listener);
      if (snapshot) listener(snapshot);
      return () => listeners.delete(listener);
    }
  };

  window.PrimeCommunesData = api;

  // Replace the historical transport/scope functions as soon as this layer loads.
  // The visible shell remains unchanged while data ownership moves out of index.html.
  try { mapDb = mapRow; } catch (_) {}
  try { applyData = applyPayload; } catch (_) {}
  try { loadData = reload; } catch (_) {}
  try {
    statsScopeRows = (scope, threshold = statsThreshold) => scopeRows(all, scope, threshold);
  } catch (_) {}

  const reloadButton = byId('syncReload');
  if (reloadButton) reloadButton.onclick = () => reload().catch(() => {});

  // If the very first legacy request won the race before this file loaded,
  // adopt its rows so 1.5 consumers still receive a canonical ready signal.
  queueMicrotask(() => {
    try {
      if (!snapshot && Array.isArray(all) && all.length) {
        const meta = {
          referenceDate: '2026-06-30',
          municipalityCount: all.length,
          expectedPopulation: all.reduce((sum, row) => sum + Number(row.expectedPopulation || 0), 0)
        };
        publish(all, meta, 'base live');
      }
    } catch (_) {}
  });
})();