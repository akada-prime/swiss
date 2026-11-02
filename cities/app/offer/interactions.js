// Presentation-only controls shared by the customer page and internal offer.
// Delegation also handles an offer rerender without installing extra listeners.
const bound = new WeakSet();
export function setScopeExpanded(scope, expanded) {
  for (const detail of scope.querySelectorAll('details.prime-offer-scope-section')) detail.open = expanded;
  refreshScopeToggle(scope);
}
function refreshScopeToggle(scope) {
  const button = scope?.querySelector('[data-scope-toggle]');
  if (!button) return;
  const sections = [...scope.querySelectorAll('details.prime-offer-scope-section')];
  const expanded = sections.length > 0 && sections.every(detail => detail.open);
  button.textContent = expanded ? button.dataset.collapseLabel : button.dataset.expandLabel;
  button.setAttribute('aria-expanded', String(expanded));
}
export function bindOfferScope(root) {
  if (!root?.addEventListener || bound.has(root)) return;
  bound.add(root);
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-scope-toggle]');
    const scope = button?.closest('.prime-offer-scope');
    if (!scope || !root.contains(scope)) return;
    const sections = [...scope.querySelectorAll('details.prime-offer-scope-section')];
    setScopeExpanded(scope, sections.some(detail => !detail.open));
  });
  root.addEventListener('toggle', event => {
    if (event.target.matches?.('details.prime-offer-scope-section'))
      refreshScopeToggle(event.target.closest('.prime-offer-scope'));
  }, true);
}
