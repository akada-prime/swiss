(() => {
  'use strict';

  // Prime Communes · application loader
  // One canonical module per view. Carte is MapLibre-only at runtime.
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
  loadStyle('app/prime-communes-stats-1.2.css?v=3');
  loadStyle('app/prime-communes-maplibre-1.2.css?v=6');

  // Carte loads first so it owns the global loadMap entry point before the
  // historical state/deep-link bridge restores a deep-linked map view.
  loadScript('app/prime-communes-maplibre-1.2.js?v=5', () => {
    loadScript('app/prime-communes-1.1-base.js?v=2', () => {
      loadScript('app/prime-communes-communes-1.2.js?v=1', () => {
        loadScript('app/prime-communes-roadmap-1.2.js?v=1');
      });
    });
  });
})();