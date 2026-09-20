(() => {
  'use strict';

  // Prime Communes · Communes view
  // Municipality identity is one semantic unit on every viewport:
  // row number → canton flag → commune name.
  // Hosting belongs to the enriched Logiciels view, alongside ERP and Modules.
  const baseRender = render;

  function decorateCommuneIdentity() {
    const table = document.querySelector('.table-wrap table');
    const headRow = table?.querySelector('thead tr');
    const bodyRows = [...(table?.querySelectorAll('tbody tr') || [])];
    if (!table || !headRow) return;

    const headings = [...headRow.children];
    const communeIndex = headings.findIndex(th => /^Commune\b/i.test(th.textContent.trim()));
    const cantonIndex = headings.findIndex(th => th.textContent.trim().toLocaleLowerCase('fr-CH') === 'canton');
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

      const cells = [...row.children];
      const communeCell = cells[communeIndex];
      if (!communeCell) return;

      communeCell.dataset.column = 'commune';
      communeCell.classList.add('commune-cell');

      const name = communeCell.querySelector('strong');
      if (name && !communeCell.querySelector('.commune-identity')) {
        const identity = document.createElement('span');
        identity.className = 'commune-identity';

        const rank = document.createElement('span');
        rank.className = 'commune-rank';
        rank.textContent = String(rowIndex + 1);
        rank.setAttribute('aria-label', `Ligne ${rowIndex + 1}`);

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
    const modulesIndex = headings.findIndex(th => th.textContent.trim().toLocaleLowerCase('fr-CH') === 'modules');
    if (modulesIndex < 0) return;

    const modulesHeading = headings[modulesIndex];
    const hostingHeading = document.createElement('th');
    hostingHeading.className = 'hosting-heading';
    hostingHeading.dataset.softwareColumn = 'hosting';
    hostingHeading.textContent = 'Hébergeur';
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
    if (count) count.textContent = `${fmt.format(results.length)} résultat${results.length > 1 ? 's' : ''}`;
    if (!list) return;
    list.innerHTML = results.slice(0, 80).map(commune => `
      <button class="mobile-search-result" data-commune-id="${esc(commune.id)}">
        <img src="public/cantons/${esc(String(commune.canton || '').toLowerCase())}.svg" alt="">
        <span class="mobile-search-result-main">
          <strong>${esc(commune.name)}</strong>
          <small>${esc(commune.canton)}${commune.district ? ` · ${esc(commune.district)}` : ''} · ${fmt.format(commune.expectedPopulation)} habitants</small>
          ${matchExplanation(commune, query)}
        </span>
        ${commune.isPrime ? '<img class="mobile-search-prime" src="public/prime-one-negative.png?v=4" alt="Client Prime">' : ''}
        <i aria-hidden="true">›</i>
      </button>`).join('') || '<p class="mobile-search-empty"><strong>Aucune commune trouvée.</strong><span>Essaie un autre nom, logiciel, intégrateur, ERP ou module.</span></p>';
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

  function openMobileSearch() {
    if (!mobileMedia.matches || !mobileSearchOverlay) return;
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
    mobileSearchOverlay.setAttribute('aria-label', 'Recherche universelle des communes');
    mobileSearchOverlay.innerHTML = `
      <header class="mobile-search-header">
        <button class="mobile-search-back" type="button" aria-label="Revenir aux communes">‹</button>
        <label><span aria-hidden="true">⌕</span><input type="search" placeholder="Commune, logiciel, ERP, module…" autocomplete="off" autocapitalize="none" enterkeyhint="search"></label>
      </header>
      <div class="mobile-search-scopes" aria-label="Filtres rapides">
        <button type="button" data-mobile-market="Welsch">Welsch</button>
        <button type="button" data-mobile-market="Uf Tüütsch">Uf Tüütsch</button>
        <button type="button" data-mobile-market="Ticino">TI</button>
        <button type="button" data-mobile-filter="prime">Clients Prime</button>
        <button type="button" data-mobile-filter="eadmin">eAdmin</button>
      </div>
      <div class="mobile-search-summary">
        <strong data-mobile-search-count>0 résultat</strong>
        <span>Toutes les colonnes · accents et petites fautes tolérées</span>
      </div>
      <div class="mobile-search-results" data-mobile-search-results></div>
      <p class="mobile-search-limit" data-mobile-search-limit hidden>80 premiers résultats · précise ta recherche pour aller plus loin.</p>`;
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
      sourceInput.value = mobileInput.value;
      sourceInput.dispatchEvent(new Event('input', { bubbles: true }));
      // The desktop listener was registered before the mobile render wrapper.
      // Refresh the visible overlay explicitly on every mobile keystroke.
      renderMobileSearchResults();
    });
    mobileInput.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileSearch();
    });
    mobileSearchOverlay.querySelector('.mobile-search-back').onclick = closeMobileSearch;
    mobileSearchOverlay.querySelectorAll('[data-mobile-market]').forEach(button => {
      button.onclick = () => document.querySelector(`#territoryFilters [data-market="${CSS.escape(button.dataset.mobileMarket)}"]`)?.click();
    });
    mobileSearchOverlay.querySelector('[data-mobile-filter="prime"]').onclick = () => document.getElementById('primeOnly')?.click();
    mobileSearchOverlay.querySelector('[data-mobile-filter="eadmin"]').onclick = () => document.getElementById('eadminOnly')?.click();
    mobileSearchOverlay.querySelector('[data-mobile-search-results]').onclick = event => {
      const result = event.target.closest('[data-commune-id]');
      if (!result) return;
      const commune = all.find(item => String(item.id) === result.dataset.communeId);
      if (!commune) return;
      closeMobileSearch();
      openDrawer(commune);
    };
    mobileMedia.addEventListener('change', event => { if (!event.matches) closeMobileSearch(); });
  }

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
    normalizeEmptyCells();
    renderMobileSearchResults();
  };

  buildMobileSearch();

  // Apply the canonical layout immediately if the live data arrived before
  // this view module finished loading.
  if (all.length) render();
})();
