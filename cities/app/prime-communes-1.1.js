(() => {
  'use strict';

  // Prime Communes · application loader
  // Communes 1.1 stays stable. Carte and Stats 1.2 are isolated UI modules.
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

  // One canonical stylesheet per UI layer. No fix/override stylesheet is loaded.
  loadStyle('app/prime-communes-map-1.1.css?v=1');
  loadStyle('app/prime-communes-stats-1.2.css?v=2');
  loadStyle('app/prime-communes-maplibre-1.2.css?v=3');

  loadScript('app/prime-communes-1.1-base.js?v=1', () => {
    loadScript('app/prime-communes-map-1.1.js?v=1', () => {
      loadScript('app/prime-communes-maplibre-1.2.js?v=3');
    });
  });
})();