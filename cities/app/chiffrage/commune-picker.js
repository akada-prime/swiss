import { workspaceEscape as escape } from './workspace-ui.js?v=20261112-coherence-r1';

const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function matchingCommunes(rows, query) {
  const text = normalize(query.trim());
  return rows.filter(row => normalize(`${row.name} ${row.id}`).includes(text));
}

// Each form owns its picker, including its keyboard and focus lifecycle.
export function bindCommunePicker(container, rows, { option, label }) {
  const input = container.querySelector('input');
  const list = container.querySelector('[role="listbox"]');
  const status = container.querySelector('[role="status"]');
  let matches = [], active = -1;
  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const select = index => {
    if (!matches[index]) return;
    input.value = option(matches[index]);
    close();
  };
  const highlight = index => {
    active = index;
    list.querySelectorAll('[role="option"]').forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
    const node = list.children[active];
    if (node) {
      input.setAttribute('aria-activedescendant', node.id);
      node.scrollIntoView({ block: 'nearest' });
    }
  };
  const show = () => {
    const found = matchingCommunes(rows, input.value.replace(/ · OFS /, ' '));
    matches = found.slice(0, 12);
    active = -1;
    input.removeAttribute('aria-activedescendant');
    list.innerHTML = matches.map((row, i) => `<button type="button" tabindex="-1" role="option" id="commune-option-${i}" data-index="${i}" aria-selected="false"><strong>${escape(row.name)}</strong><span>${escape(row.canton)} · OFS ${escape(row.id)}</span></button>`).join('');
    status.textContent = found.length ? `${found.length} ${found.length === 1 ? label('commune trouvée','gefundene Gemeinde') : label('communes trouvées','gefundene Gemeinden')}${found.length > 12 ? ' · ' + label('Affiner la recherche','Suche eingrenzen') : ''}` : label('Aucune commune trouvée','Keine Gemeinde gefunden');
    list.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(matches.length > 0));
  };
  input.addEventListener('input', show);
  input.addEventListener('focus', show);
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); event.preventDefault(); return; }
    if (event.key === 'Enter' && !list.hidden && active >= 0) {
      event.preventDefault(); select(active); return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    if (list.hidden) show();
    if (!matches.length) return;
    highlight(event.key === 'ArrowDown' ? (active + 1) % matches.length : (active < 0 ? matches.length - 1 : (active - 1 + matches.length) % matches.length));
  });
  list.addEventListener('pointerdown', event => event.preventDefault());
  list.addEventListener('click', event => {
    const node = event.target.closest('[data-index]');
    if (node) select(Number(node.dataset.index));
  });
  container.addEventListener('focusout', event => { if (!container.contains(event.relatedTarget)) close(); });
}
