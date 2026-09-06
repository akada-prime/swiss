(() => {
  'use strict';

  // Prime Communes 1.1 · stable loader.
  // Keep the frozen 1.1 bridge intact; Carte 1.2 is the single visible map UI.
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

  loadScript('app/prime-communes-1.1-base.js?v=1', () => {
    loadScript('app/prime-communes-1.2-ui-fix.js?v=1');
    loadScript('app/prime-communes-map-1.1.js?v=1', () => {
      loadScript('app/prime-communes-maplibre-1.2.js?v=1', () => {
        loadStyle('app/prime-communes-1.2-visual-fix.css?v=1');
      });
    });
  });
})();