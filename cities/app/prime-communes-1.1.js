(() => {
  'use strict';

  // Prime Communes · application loader
  // DATA loads first; Communes, Carte, Stats and Roadmap consume the same source.
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

  loadStyle('app/prime-communes-1.1.5.css?v=5');
  loadStyle('app/prime-communes-stats-1.2.css?v=4');
  loadStyle('app/prime-communes-maplibre-1.2.css?v=7');

  // First 1.5 plumbing step: transport/normalization/language scopes are owned
  // by DATA before any view-specific runtime starts.
  loadScript('app/prime-communes-data-1.5.js?v=2', () => {
    // Carte still loads before the state bridge so deep-linked map views resolve
    // to MapLibre, never to the retired SVG runtime.
    loadScript('app/prime-communes-maplibre-1.2.js?v=7', () => {
      loadScript('app/prime-communes-1.1-base.js?v=2', () => {
        loadScript('app/prime-communes-communes-1.2.js?v=1', () => {
          loadScript('app/prime-communes-roadmap-1.2.js?v=1');
        });
      });
    });
  });
})();