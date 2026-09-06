(() => {
  'use strict';

  // Prime Communes 1.2 · presentation guard.
  // Business data is never changed here. This only restores the intended
  // default visibility of ERP + Modules in the Communes table.
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const button = document.getElementById('logicielsToggle');
    const table = document.querySelector('.table-wrap');

    if (button && table) {
      // Use the existing control so its internal state stays coherent with
      // subsequent renders, URL state and the user's own manual toggles.
      if (!button.classList.contains('on') || table.classList.contains('logiciels-hidden')) {
        button.click();
      }
      window.clearInterval(timer);
      return;
    }

    if (attempts >= 30) window.clearInterval(timer);
  }, 100);
})();