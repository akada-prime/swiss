import {t} from './core/i18n.js?v=20260926-preferences-2';
(() => {
  'use strict';

  // Prime Communes · Communes view
  // Municipality identity is one semantic unit on every viewport:
  // row number → canton flag → commune name.
  // Hosting belongs to the enriched Logiciels view, alongside ERP and Modules.
  const baseRender = render;
  const WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php';
  const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
  const WIKIPEDIA_CACHE_KEY = 'primeCommunesWikipediaV1';
  const WIKIPEDIA_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  const CANTON_NAMES = {
    AG:'Argovie', AI:'Appenzell Rhodes-Intérieures', AR:'Appenzell Rhodes-Extérieures', BE:'Berne',
    BL:'Bâle-Campagne', BS:'Bâle-Ville', FR:'Fribourg', GE:'Genève', GL:'Glaris', GR:'Grisons',
    JU:'Jura', LU:'Lucerne', NE:'Neuchâtel', NW:'Nidwald', OW:'Obwald', SG:'Saint-Gall',
    SH:'Schaffhouse', SO:'Soleure', SZ:'Schwytz', TG:'Thurgovie', TI:'Tessin', UR:'Uri',
    VD:'Vaud', VS:'Valais', ZG:'Zoug', ZH:'Zurich'
  };

  function normalizeWikiText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr-CH');
  }

  function wikipediaCache() {
    try { return JSON.parse(localStorage.getItem(WIKIPEDIA_CACHE_KEY) || '{}'); }
    catch { return {}; }
  }

  function readWikipediaCache(commune) {
    const item = wikipediaCache()[String(commune.id)];
    return item && Date.now() - item.savedAt < WIKIPEDIA_CACHE_TTL ? item.data : null;
  }

  function writeWikipediaCache(commune, data) {
    try {
      const cache = wikipediaCache();
      cache[String(commune.id)] = { savedAt: Date.now(), data };
      localStorage.setItem(WIKIPEDIA_CACHE_KEY, JSON.stringify(cache));
    } catch { /* A private browser may refuse storage; the portrait still works. */ }
  }

  function wikipediaCandidateScore(page, commune) {
    if (!page?.extract || page.pageprops?.disambiguation !== undefined) return -1;
    const title = normalizeWikiText(page.title);
    const extract = normalizeWikiText(page.extract);
    const name = normalizeWikiText(commune.name);
    const canton = normalizeWikiText(CANTON_NAMES[commune.canton] || commune.canton);
    const district = normalizeWikiText(commune.district);
    const nameTokens = name.split(/[^a-z0-9]+/).filter(token => token.length > 2);
    if (!nameTokens.every(token => `${title} ${extract}`.includes(token))) return -1;
    let score = title === name ? 120 : title.startsWith(`${name} (`) ? 105 : title.includes(name) ? 75 : 30;
    if (/commune|ville suisse|municipalite/.test(extract)) score += 30;
    if (canton && extract.includes(canton)) score += 25;
    if (district && extract.includes(district)) score += 15;
    return score;
  }

  async function wikipediaPageMatchingOFS(ranked, commune) {
    const ids = [...new Set(ranked.map(item => item.page.pageprops?.wikibase_item).filter(Boolean))];
    if (!ids.length) throw new Error('Aucun identifiant Wikidata communal');
    const params = new URLSearchParams({
      action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json', origin: '*'
    });
    const response = await fetch(`${WIKIDATA_API}?${params}`);
    if (!response.ok) throw new Error(`Wikidata ${response.status}`);
    const entities = (await response.json())?.entities || {};
    const expected = String(commune.id).replace(/\D/g, '');
    return ranked.find(item => {
      const entity = entities[item.page.pageprops?.wikibase_item];
      const claims = entity?.claims?.P771 || [];
      return claims.some(claim => String(claim?.mainsnak?.datavalue?.value || '').replace(/\D/g, '') === expected);
    })?.page || null;
  }

  async function fetchWikipediaPortrait(commune) {
    const cached = readWikipediaCache(commune);
    if (cached) return cached;
    const canton = CANTON_NAMES[commune.canton] || commune.canton || '';
    const params = new URLSearchParams({
      action: 'query', generator: 'search', gsrsearch: `"${commune.name}" commune ${canton}`,
      gsrnamespace: '0', gsrlimit: '6', prop: 'extracts|pageimages|info|pageprops',
      exintro: '1', explaintext: '1', exsentences: '5', piprop: 'thumbnail', pithumbsize: '720',
      inprop: 'url', redirects: '1', format: 'json', formatversion: '2', origin: '*'
    });
    const response = await fetch(`${WIKIPEDIA_API}?${params}`);
    if (!response.ok) throw new Error(`Wikipédia ${response.status}`);
    const payload = await response.json();
    const pages = payload?.query?.pages || [];
    const ranked = pages.map(page => ({ page, score: wikipediaCandidateScore(page, commune) }))
      .filter(item => item.score >= 0).sort((a, b) => b.score - a.score);
    const page = await wikipediaPageMatchingOFS(ranked, commune);
    if (!page) throw new Error(`Aucun article correspondant à l’OFS ${commune.id}`);
    const data = { title: page.title, extract: page.extract, url: page.fullurl, thumbnail: page.thumbnail?.source || '', ofs: String(commune.id), ofsVerified: true };
    writeWikipediaCache(commune, data);
    return data;
  }

  function closeCommunePortrait() {
    const root = document.getElementById('portraitRoot');
    if (root) root.innerHTML = '';
    document.documentElement.classList.remove('portrait-open');
    document.body.classList.remove('portrait-open');
  }

  function portraitWikipediaMarkup(data) {
    if (!data) return `<div class="portrait-wiki-fallback"><strong>${t('communes.wikiFallback')}</strong><p>${t('communes.wikiFallbackDetail')}</p></div>`;
    return `<span class="portrait-ofs-match">${t('communes.ofsMatched',{id:esc(data.ofs)})}</span><article class="portrait-wiki-card">
      ${data.thumbnail ? `<img src="${esc(data.thumbnail)}" alt="${t('communes.illustration',{title:esc(data.title)})}">` : ''}
      <div><p>${esc(data.extract)}</p><a href="${esc(data.url)}" target="_blank" rel="noopener noreferrer">${t('communes.readWiki')}</a></div>
    </article>`;
  }

  function portraitSystemMarkup(commune) {
    const fields = [
      [t('common.integrator'), commune.integrator],
      [t('communes.businessSolution'), commune.software],
      ['ERP', commune.erp],
      [t('communes.hosting'), commune.hosting],
      [t('common.modules'), (commune.products || []).filter(Boolean).join(' · ')],
      [t('communes.relationship'), commune.isPrime ? 'Client Prime' : ''],
      [t('communes.salesStatus'), commune.salesStatus !== 'none' ? commune.salesStatus : '']
    ].filter(([, value]) => String(value ?? '').trim());
    const notes = String(commune.notes || '').trim();
    return `<section class="portrait-system">
      <div class="portrait-section-title"><div><span>${t('communes.systemProfile')}</span><h3>${t('communes.system')}</h3></div></div>
      ${fields.length ? `<dl class="portrait-facts portrait-system-facts">${fields.map(([label, value]) =>
        `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : ''}
      ${notes ? `<div class="portrait-system-notes"><span>${t('common.notes')}</span><p>${esc(notes)}</p></div>` : ''}
      ${!fields.length && !notes ? `<p class="portrait-system-empty">${t('communes.systemEmpty')}</p>` : ''}
    </section>`;
  }

  async function openCommunePortrait(commune) {
    if (!commune) return;
    const root = document.getElementById('portraitRoot');
    if (!root) return;
    const cantonName = CANTON_NAMES[commune.canton] || commune.canton || '—';
    root.innerHTML = `<div class="portrait-backdrop">
      <aside class="commune-portrait" data-commune-id="${commune.id}" role="dialog" aria-modal="true" aria-labelledby="portraitTitle">
        <button class="portrait-close" type="button" aria-label="${t('communes.portraitClose')}">×</button>
        <header class="portrait-heading">
          <img src="public/cantons/${esc(String(commune.canton || '').toLowerCase())}.svg" alt="">
          <div><p>${t('communes.portraitTitle')}</p><h2 id="portraitTitle">${esc(commune.name)}</h2><span>OFS ${esc(commune.id)}</span></div>
        </header>
        <dl class="portrait-facts">
          <div><dt>${t('page.030')}</dt><dd>${esc(cantonName)}</dd></div>
          <div><dt>${t('common.district')}</dt><dd>${esc(commune.district || '—')}</dd></div>
          <div><dt>${t('common.population')}</dt><dd>${fmt.format(commune.expectedPopulation || 0)}</dd></div>
          <div><dt>${t('common.market')}</dt><dd>${esc(commune.market || '—')}</dd></div>
        </dl>
        <section class="portrait-public-context">
          <div class="portrait-section-title"><div><span>${t('communes.publicContext')}</span><h3>${t('communes.shortSummary')}</h3></div><span class="portrait-no-ai">${t('communes.noAi')}</span></div>
          <div class="portrait-wikipedia" aria-live="polite"><div class="portrait-loading"><i></i><span>${t('communes.wikipediaLoading')}</span></div></div>
          <p class="portrait-source">${t('communes.wikipediaSource')}</p>
        </section>
        ${portraitSystemMarkup(commune)}
        <button class="portrait-edit" type="button"><span aria-hidden="true">✎</span> ${t('communes.edit')}</button>
      </aside>
    </div>`;
    document.documentElement.classList.add('portrait-open');
    document.body.classList.add('portrait-open');
    root.querySelector('.portrait-close').onclick = closeCommunePortrait;
    root.querySelector('.portrait-backdrop').onclick = event => { if (event.target === event.currentTarget) closeCommunePortrait(); };
    root.querySelector('.portrait-edit').onclick = () => {
      closeCommunePortrait();
      if (mobileSearchIsOpen()) closeMobileSearch();
      openDrawer(commune);
    };
    const target = root.querySelector('.portrait-wikipedia');
    try { target.innerHTML = portraitWikipediaMarkup(await fetchWikipediaPortrait(commune)); }
    catch (error) { console.warn('Prime Communes · portrait Wikipédia indisponible', error); target.innerHTML = portraitWikipediaMarkup(null); }
  }

  window.openCommunePortrait = openCommunePortrait;
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && document.body.classList.contains('portrait-open')) closeCommunePortrait(); });

  function decorateCommuneIdentity() {
    const table = document.querySelector('.table-wrap table');
    const headRow = table?.querySelector('thead tr');
    const bodyRows = [...(table?.querySelectorAll('tbody tr') || [])];
    if (!table || !headRow) return;

    const headings = [...headRow.children];
    const communeIndex = headings.findIndex(th => th.id === 'sortName');
    const cantonIndex = headings.findIndex(th => th.id === 'columnCanton');
    if (communeIndex < 0) return;

    headings[communeIndex].dataset.column = 'commune';
    headings[communeIndex].classList.add('commune-heading');

    if (cantonIndex >= 0) {
      headings[cantonIndex].dataset.column = 'canton';
      headings[cantonIndex].classList.add('canton-column');
    }

    bodyRows.forEach((row, rowIndex) => {
      const commune = all.find(item => String(item.id) === String(row.dataset.id));
      if (!commune) return;

      row.title = `Consulter le portrait de ${commune.name}`;
      row.onclick = () => openCommunePortrait(commune);

      const cells = [...row.children];
      const communeCell = cells[communeIndex];
      if (!communeCell) return;

      communeCell.dataset.column = 'commune';
      communeCell.classList.add('commune-cell');

      const name = communeCell.querySelector('strong');
      if (name && !communeCell.querySelector('.commune-identity')) {
        const identity = document.createElement('span');
        identity.className = 'commune-identity';

        const rank = document.createElement('button');
        rank.type = 'button';
        rank.className = 'commune-rank';
        rank.textContent = String(rowIndex + 1);
        rank.title = t('communes.discover',{name:commune.name});
        rank.setAttribute('aria-label', t('communes.discoverPortrait',{name:commune.name}));
        rank.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          openCommunePortrait(commune);
        });

        const flag = document.createElement('img');
        flag.className = 'commune-canton-flag';
        flag.src = `public/cantons/${String(commune.canton || '').toLowerCase()}.svg`;
        flag.alt = '';
        flag.title = `Canton ${commune.canton || ''}`;
        flag.setAttribute('aria-hidden', 'true');

        name.replaceWith(identity);
        identity.append(rank, flag, name);
      }

      if (cantonIndex >= 0 && cells[cantonIndex]) {
        cells[cantonIndex].dataset.column = 'canton';
        cells[cantonIndex].classList.add('canton-column');
      }
    });
  }

  function decorateHostingColumn() {
    const table = document.querySelector('.table-wrap table');
    const headRow = table?.querySelector('thead tr');
    const bodyRows = [...(table?.querySelectorAll('tbody tr') || [])];
    if (!table || !headRow || headRow.querySelector('.hosting-heading')) return;

    const headings = [...headRow.children];
    const modulesIndex = headings.findIndex(th => th.id === 'columnModules');
    if (modulesIndex < 0) return;

    const modulesHeading = headings[modulesIndex];
    const hostingHeading = document.createElement('th');
    hostingHeading.className = 'hosting-heading';
    hostingHeading.dataset.softwareColumn = 'hosting';
    hostingHeading.textContent = t('common.hosting');
    modulesHeading.insertAdjacentElement('afterend', hostingHeading);

    bodyRows.forEach(row => {
      const commune = all.find(item => String(item.id) === String(row.dataset.id));
      const modulesCell = row.children[modulesIndex];
      if (!commune || !modulesCell) return;

      const hostingCell = document.createElement('td');
      hostingCell.className = 'hosting-cell';
      hostingCell.dataset.softwareColumn = 'hosting';
      const hosting = String(commune.hosting || '').trim();
      hostingCell.innerHTML = hosting ? esc(hosting) : '<span class="cell-empty">—</span>';
      modulesCell.insertAdjacentElement('afterend', hostingCell);
    });
  }

  function normalizeEmptyCells() {
    document.querySelectorAll('.table-wrap tbody .empty').forEach(node => {
      node.classList.remove('empty');
      node.classList.add('cell-empty');
    });
  }


  const mobileMedia = window.matchMedia('(max-width:680px)');
  let mobileSearchOverlay = null;
  let mobileSearchPreviousFilters = null;
  let mobileSearchSuspended = false;
  let mobileSearchScopeTouched = null;

  function mobileSearchIsOpen() {
    return Boolean(mobileSearchOverlay && !mobileSearchOverlay.hidden);
  }

  function matchExplanation(commune, query) {
    const meta = typeof communeSearchMeta === 'function' ? communeSearchMeta(commune, query) : null;
    if (!meta || meta.label === 'Commune') return '';
    const value = String(meta.value || '').trim();
    return value ? `<span><b>${esc(meta.label)}</b>${esc(value)}</span>` : '';
  }

  function syncMobileSearchFilters() {
    if (!mobileSearchOverlay) return;
    mobileSearchOverlay.querySelectorAll('[data-mobile-market]').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileMarket === marketOnly);
    });
    mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]')?.classList.toggle('active', primeOnly);
    mobileSearchOverlay.querySelector('[data-mobile-filter="eadmin"]')?.classList.toggle('active', eadminOnly);
  }

  function renderMobileSearchResults() {
    if (!mobileSearchIsOpen()) return;
    const results = filtered();
    const query = document.getElementById('query')?.value || '';
    const count = mobileSearchOverlay.querySelector('[data-mobile-search-count]');
    const list = mobileSearchOverlay.querySelector('[data-mobile-search-results]');
    if (count) count.textContent = t('communes.filterResult',{count:fmt.format(results.length)});
    if (!list) return;
    list.innerHTML = results.slice(0, 80).map(commune => `
      <button class="mobile-search-result" data-commune-id="${esc(commune.id)}">
        <img src="public/cantons/${esc(String(commune.canton || '').toLowerCase())}.svg" alt="">
        <span class="mobile-search-result-main">
          <strong>${esc(commune.name)}</strong>
          <small>${esc(commune.canton)}${commune.district ? ` · ${esc(commune.district)}` : ''} · ${fmt.format(commune.expectedPopulation)} ${t('common.inhabitants')}</small>
          ${matchExplanation(commune, query)}
        </span>
        ${commune.isPrime ? '<img class="mobile-search-prime" src="public/prime-one-negative.png?v=4" alt="Client Prime">' : ''}
        <i aria-hidden="true">›</i>
      </button>`).join('') || `<p class="mobile-search-empty"><strong>${t('communes.noSearch')}</strong><span>${t('communes.searchHint')}</span></p>`;
    const limited = mobileSearchOverlay.querySelector('[data-mobile-search-limit]');
    if (limited) limited.hidden = results.length <= 80;
    syncMobileSearchFilters();
  }

  function closeMobileSearch() {
    if (!mobileSearchOverlay) return;
    mobileSearchOverlay.hidden = true;
    document.documentElement.classList.remove('mobile-search-open');
    document.body.classList.remove('mobile-search-open');
    mobileSearchOverlay.querySelector('input')?.blur();
  }

  function syncSearchFilterControls() {
    document.querySelectorAll('.market-toggle').forEach(button => {
      button.classList.toggle('on', button.dataset.market === marketOnly);
    });
    document.getElementById('primeOnly')?.classList.toggle('on', primeOnly);
    document.getElementById('eadminOnly')?.classList.toggle('on', eadminOnly);
    document.getElementById('eadminOnly')?.classList.toggle('eadmin-on', eadminOnly);
    document.getElementById('issuesOnly')?.classList.toggle('on', issuesOnly);
    document.getElementById('issuesOnly')?.classList.toggle('warning', issuesOnly);
  }

  function suspendMobileSearchFilters() {
    if (mobileSearchSuspended) return;
    mobileSearchSuspended = true;
    document.getElementById('canton').value = 'Tous';
    document.getElementById('solution').value = 'Tous';
    marketOnly = mobileSearchScopeTouched.market ? marketOnly : '';
    primeOnly = mobileSearchScopeTouched.prime ? primeOnly : false;
    eadminOnly = mobileSearchScopeTouched.eadmin ? eadminOnly : false;
    issuesOnly = false;
    updateDistrictOptions();
    syncSearchFilterControls();
  }

  function cancelMobileSearch() {
    if (!mobileSearchIsOpen()) return;
    const previous = mobileSearchPreviousFilters;
    mobileSearchPreviousFilters = null;
    closeMobileSearch();
    if (!previous) return;
    const sourceInput = document.getElementById('query');
    document.getElementById('canton').value = previous.canton;
    document.getElementById('solution').value = previous.solution;
    marketOnly = previous.marketOnly;
    primeOnly = previous.primeOnly;
    eadminOnly = previous.eadminOnly;
    issuesOnly = previous.issuesOnly;
    updateDistrictOptions();
    document.getElementById('district').value = previous.district;
    syncSearchFilterControls();
    sourceInput.value = previous.query;
    sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function scrollToCommuneRow(commune) {
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll('.table-wrap tbody tr')]
        .find(item => item.dataset.id === String(commune.id));
      (row || document.querySelector('.result-line'))?.scrollIntoView({ block: row ? 'center' : 'start' });
    });
  }

  function showCommuneInList(commune, sourceInput) {
    mobileSearchPreviousFilters = null;
    sourceInput.value = commune.name;
    sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
    closeMobileSearch();
    scrollToCommuneRow(commune);
  }

  function openMobileSearch() {
    if (!mobileMedia.matches || !mobileSearchOverlay) return;
    if (!mobileSearchIsOpen()) {
      mobileSearchPreviousFilters = {
        query: document.getElementById('query')?.value || '',
        canton: document.getElementById('canton').value,
        district: document.getElementById('district').value,
        solution: document.getElementById('solution').value,
        marketOnly, primeOnly, eadminOnly, issuesOnly
      };
      mobileSearchSuspended = false;
      mobileSearchScopeTouched = { market: false, prime: false, eadmin: false };
    }
    const mobileInput = mobileSearchOverlay.querySelector('input');
    mobileInput.value = document.getElementById('query')?.value || '';
    mobileSearchOverlay.hidden = false;
    document.documentElement.classList.add('mobile-search-open');
    document.body.classList.add('mobile-search-open');
    renderMobileSearchResults();
    // iOS only opens the keyboard when focus stays inside the original tap.
    mobileInput.focus({ preventScroll: true });
  }

  function buildMobileSearch() {
    if (mobileSearchOverlay) return;
    mobileSearchOverlay = document.createElement('section');
    mobileSearchOverlay.className = 'mobile-search-overlay';
    mobileSearchOverlay.hidden = true;
    mobileSearchOverlay.setAttribute('role', 'dialog');
    mobileSearchOverlay.setAttribute('aria-modal', 'true');
    mobileSearchOverlay.setAttribute('aria-label', t('communes.searchTitle'));
    mobileSearchOverlay.innerHTML = `
      <header class="mobile-search-header">
        <button class="mobile-search-back" type="button" aria-label="${t('communes.searchBack')}">‹</button>
        <label><span aria-hidden="true">⌕</span><input type="search" placeholder="${t('communes.mobileSearch')}" autocomplete="off" autocapitalize="none" enterkeyhint="search"></label>
      </header>
      <div class="mobile-search-scopes" aria-label="${t('communes.quickFilters')}">
        <button type="button" data-mobile-market="Welsch">Welsch</button>
        <button type="button" data-mobile-market="Uf Tüütsch">Uf Tüütsch</button>
        <button type="button" data-mobile-market="Ticino">TI</button>
        <button type="button" data-mobile-filter="prime">${t('common.primeClients')}</button>
        <button type="button" data-mobile-filter="eadmin">eAdmin</button>
      </div>
      <div class="mobile-search-summary">
        <strong data-mobile-search-count>${t('communes.filterResult',{count:0})}</strong>
        <span>${t('communes.touchHint')}</span>
      </div>
      <div class="mobile-search-results" data-mobile-search-results></div>
      <p class="mobile-search-limit" data-mobile-search-limit hidden>${t('communes.mobileLimit')}</p>`;
    document.body.append(mobileSearchOverlay);

    const sourceInput = document.getElementById('query');
    const mobileInput = mobileSearchOverlay.querySelector('input');
    sourceInput?.addEventListener('pointerdown', event => {
      if (!mobileMedia.matches) return;
      event.preventDefault();
      openMobileSearch();
    });
    sourceInput?.addEventListener('focus', () => {
      if (mobileMedia.matches) openMobileSearch();
    });
    mobileInput.addEventListener('input', () => {
      if (mobileInput.value.trim()) suspendMobileSearchFilters();
      sourceInput.value = mobileInput.value;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    mobileInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') cancelMobileSearch();
      if (event.key === 'Enter') {
        event.preventDefault();
        if (!mobileInput.value.trim()) cancelMobileSearch();
        else {
          mobileSearchPreviousFilters = null;
          closeMobileSearch();
          requestAnimationFrame(() => document.querySelector('.result-line')?.scrollIntoView({ block: 'start' }));
        }
      }
    });
    mobileSearchOverlay.querySelector('.mobile-search-back').onclick = cancelMobileSearch;
    mobileSearchOverlay.querySelectorAll('[data-mobile-market]').forEach(button => {
      button.onclick = () => {
        mobileSearchScopeTouched.market = true;
        document.querySelector(`#territoryFilters [data-market="${CSS.escape(button.dataset.mobileMarket)}"]`)?.click();
      };
    });
    mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]').onclick = () => {
      mobileSearchScopeTouched.prime = true;
      document.getElementById('primeOnly')?.click();
    };
    mobileSearchOverlay.querySelector('[data-mobile-filter="eadmin"]').onclick = () => {
      mobileSearchScopeTouched.eadmin = true;
      document.getElementById('eadminOnly')?.click();
    };
    mobileSearchOverlay.querySelector('[data-mobile-search-results]').onclick = event => {
      const result = event.target.closest('[data-commune-id]');
      if (!result) return;
      const commune = all.find(item => String(item.id) === result.dataset.communeId);
      if (!commune) return;
      showCommuneInList(commune, sourceInput);
    };
    mobileMedia.addEventListener('change', event => { if (!event.matches) cancelMobileSearch(); });
  }

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
    normalizeEmptyCells();
    renderMobileSearchResults();
  };

  buildMobileSearch();
  document.addEventListener('prime-language-change', () => {
    const portrait = document.querySelector('#portraitRoot .commune-portrait[data-commune-id]');
    const commune = portrait && all.find(item => String(item.id) === portrait.dataset.communeId);
    if (commune) {
      const scroll = portrait.scrollTop;
      void openCommunePortrait(commune).then(() => {
        const current = document.querySelector('#portraitRoot .commune-portrait');
        if (current) current.scrollTop = scroll;
      });
    }
    if (mobileSearchOverlay) {
      mobileSearchOverlay.setAttribute('aria-label', t('communes.searchTitle'));
      mobileSearchOverlay.querySelector('.mobile-search-back')?.setAttribute('aria-label', t('communes.searchBack'));
      mobileSearchOverlay.querySelector('input')?.setAttribute('placeholder', t('communes.mobileSearch'));
      mobileSearchOverlay.querySelector('.mobile-search-scopes')?.setAttribute('aria-label', t('communes.quickFilters'));
      const prime = mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]');
      if (prime) prime.textContent = t('common.primeClients');
      const hint = mobileSearchOverlay.querySelector('.mobile-search-summary span');
      if (hint) hint.textContent = t('communes.touchHint');
      const limit = mobileSearchOverlay.querySelector('[data-mobile-search-limit]');
      if (limit) limit.textContent = t('communes.mobileLimit');
      renderMobileSearchResults();
    }
  });

  // Desktop uses the existing field and list. Keep its filters until typing
  // starts, then allow Escape or clearing the query to restore them.
  const desktopInput = document.getElementById('query');
  let desktopPreviousFilters = null;
  let desktopFocusFilters = null;
  const desktopFilters = () => ({
    query: desktopInput.value,
    canton: document.getElementById('canton').value,
    district: document.getElementById('district').value,
    solution: document.getElementById('solution').value,
    marketOnly, primeOnly, eadminOnly, issuesOnly
  });
  desktopInput?.addEventListener('focus', () => {
    if (!mobileMedia.matches) desktopFocusFilters = desktopFilters();
  });
  desktopInput?.addEventListener('input', () => {
    if (mobileMedia.matches) return;
    if (desktopPreviousFilters && !desktopInput.value.trim()) {
      const previous = desktopPreviousFilters;
      desktopPreviousFilters = null;
      desktopInput.value = previous.query;
      document.getElementById('canton').value = previous.canton;
      document.getElementById('solution').value = previous.solution;
      marketOnly = previous.marketOnly;
      primeOnly = previous.primeOnly;
      eadminOnly = previous.eadminOnly;
      issuesOnly = previous.issuesOnly;
      updateDistrictOptions();
      document.getElementById('district').value = previous.district;
      syncSearchFilterControls();
      render();
    } else if (!desktopPreviousFilters && desktopInput.value.trim()) {
      desktopPreviousFilters = desktopFocusFilters || desktopFilters();
      document.getElementById('canton').value = 'Tous';
      document.getElementById('solution').value = 'Tous';
      marketOnly = '';
      primeOnly = eadminOnly = issuesOnly = false;
      updateDistrictOptions();
      syncSearchFilterControls();
      render();
    }
  });
  desktopInput?.addEventListener('keydown', event => {
    if (mobileMedia.matches) return;
    if (event.key === 'Enter') desktopPreviousFilters = desktopFocusFilters = null;
    if (event.key === 'Escape' && desktopPreviousFilters) {
      event.preventDefault();
      desktopInput.value = '';
      desktopInput.dispatchEvent(new Event('input', { bubbles: true }));
      desktopInput.blur();
    }
  });
  document.getElementById('reset')?.addEventListener('click', () => {
    desktopPreviousFilters = desktopFocusFilters = null;
  });

  // Apply the canonical layout immediately if the live data arrived before
  // this view module finished loading.
  if (all.length) render();
})();
