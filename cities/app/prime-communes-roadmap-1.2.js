(() => {
  'use strict';

  // Prime Communes · Roadmap view
  // Roadmap items are real semantic nodes, never CSS-generated pseudo-content.
  const stage15 = [...document.querySelectorAll('.roadmap-stage')]
    .find(stage => stage.querySelector('.roadmap-version')?.textContent.trim() === '1.5');
  const items = stage15?.querySelector('.roadmap-items');
  if (!items) return;

  const existing = [...items.children]
    .find(item => /Infrastructure Prime|Déplacement serveurs Prime/i.test(item.textContent));
  if (existing) return;

  const infrastructure = document.createElement('div');
  infrastructure.innerHTML = `
    <strong>Infrastructure Prime</strong>
    <span>Déplacer l’application et la base stabilisées vers les serveurs Prime, puis figer l’architecture cible avant les fonctions 1.5.</span>
    <small>Migration contrôlée · séparation frontend / configuration / secrets · point de restauration 1.1</small>`;
  items.prepend(infrastructure);
})();