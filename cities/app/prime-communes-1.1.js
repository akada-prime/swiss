(() => {
  'use strict';

  // Prime Communes · stable loader.
  // Keep the stabilized 1.1 bridge, then load the single visible Carte 1.2 engine.
  const loadScript = (src, onload) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = onload || null;
    script.onerror = () => console.error(`Prime Communes · chargement impossible: ${src}`);
    document.body.append(script);
  };

  loadScript('app/prime-communes-1.1-base.js?v=1', () => {
    loadScript('app/prime-communes-maplibre-poc.js?v=3');
  });
})();