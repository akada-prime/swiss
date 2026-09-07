(() => {
  'use strict';

  // Prime Communes · Communes view
  // The canton is part of the municipality identity, not a standalone table column.
  // Data/filter/export semantics remain untouched.
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

    bodyRows.forEach(row => {
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

        const flag = document.createElement('img');
        flag.className = 'commune-canton-flag';
        flag.src = `public/cantons/${String(commune.canton || '').toLowerCase()}.svg`;
        flag.alt = '';
        flag.title = `Canton ${commune.canton || ''}`;
        flag.setAttribute('aria-hidden', 'true');

        name.replaceWith(identity);
        identity.append(flag, name);
      }

      if (cantonIndex >= 0 && cells[cantonIndex]) {
        cells[cantonIndex].dataset.column = 'canton';
        cells[cantonIndex].classList.add('canton-column');
      }
    });
  }

  render = function renderCommunesView() {
    baseRender();
    decorateCommuneIdentity();
  };

  // Apply the canonical layout immediately if the live data arrived before
  // this view module finished loading.
  if (all.length) render();
})();