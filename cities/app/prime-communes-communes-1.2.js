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

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
    decorateHostingColumn();
    normalizeEmptyCells();
  };

  // Apply the canonical layout immediately if the live data arrived before
  // this view module finished loading.
  if (all.length) render();
})();