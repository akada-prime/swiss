(() => {
  'use strict';

  // Prime Communes 1.1 · stable loader.
  // Communes keeps its 1.1 behaviour; Carte 1.2 is layered on top only.
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'app/prime-communes-map-1.1.css?v=1';
  document.head.append(style);

  const loadStyle = href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.append(link);
  };

  const loadScript = (src, onload) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload || null;
    script.onerror = () => console.error(`Prime Communes · chargement impossible: ${src}`);
    document.body.append(script);
  };

  // Stats-only visual polish. No data/business behaviour.
  loadStyle('app/prime-communes-stats-fix.css?v=1');

  // The historical data loader still writes the legacy #mapProduct select when
  // Supabase data arrives. Carte 1.2 may hide/remove its old visual controls,
  // so keep a hidden compatibility select available without changing Communes.
  const panel = document.getElementById('mapPanel');
  const ensureLegacyMapProduct = () => {
    if (document.getElementById('mapProduct')) return;
    const select = document.createElement('select');
    select.id = 'mapProduct';
    select.hidden = true;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    (panel || document.body).append(select);
  };

  let mapProductGuard = null;
  if (panel && typeof MutationObserver !== 'undefined') {
    mapProductGuard = new MutationObserver(ensureLegacyMapProduct);
    mapProductGuard.observe(panel, { childList: true, subtree: true });
  }

  loadScript('app/prime-communes-1.1-base.js?v=1', () => {
    loadScript('app/prime-communes-map-1.1.js?v=1', () => {
      loadScript('app/prime-communes-maplibre-1.2.js?v=2', () => {
        ensureLegacyMapProduct();
        if (mapProductGuard) {
          window.setTimeout(() => mapProductGuard.disconnect(), 1000);
        }
        loadStyle('app/prime-communes-1.2-visual-fix.css?v=2');
      });
    });
  });
})();