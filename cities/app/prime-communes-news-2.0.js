(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json';
  const levelOrder = { strong: 0, watch: 1, info: 2 };
  const levelLabels = { strong: 'Signal fort', watch: 'À surveiller', info: 'Information' };
  const confidenceLabels = { confirmed: 'Confirmé', probable: 'Probable', verify: 'À vérifier' };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('fr-CH', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  let signals = [];
  let activeLevel = 'all';

  function filteredSignals() {
    const needle = byId('newsQuery')?.value.trim().toLocaleLowerCase('fr-CH') || '';
    return signals.filter(signal => {
      const haystack = [signal.municipality, signal.canton, signal.title, signal.summary,
        signal.why, signal.sourceLabel, ...(signal.tags || [])].join(' ').toLocaleLowerCase('fr-CH');
      return (activeLevel === 'all' || signal.level === activeLevel) && (!needle || haystack.includes(needle));
    }).sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || b.date.localeCompare(a.date));
  }

  function sourceMarkup(signal) {
    const label = escapeHtml(signal.sourceLabel);
    if (!signal.sourceUrl) return `<span class="news-source-label">${label}</span>`;
    return `<a class="news-source-link" href="${escapeHtml(signal.sourceUrl)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function signalCard(signal) {
    const tags = (signal.tags || []).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
    return `<article class="news-card news-card-${escapeHtml(signal.level)}">
      <div class="news-card-rail" aria-hidden="true"></div>
      <div class="news-card-main">
        <header>
          <span class="news-level news-level-${escapeHtml(signal.level)}"><i></i>${levelLabels[signal.level] || 'Information'}</span>
          <time datetime="${escapeHtml(signal.date)}">${formatDate(signal.date)}</time>
        </header>
        <button class="news-municipality" data-news-bfs="${Number(signal.bfsId)}" title="Ouvrir la fiche de ${escapeHtml(signal.municipality)}">
          <img src="public/cantons/${escapeHtml(signal.canton.toLowerCase())}.svg" alt="">
          <span><strong>${escapeHtml(signal.municipality)}</strong><small>${escapeHtml(signal.canton)} · OFS ${Number(signal.bfsId)}</small></span><b>Ouvrir la fiche&nbsp;›</b>
        </button>
        <h3>${escapeHtml(signal.title)}</h3>
        <p class="news-summary">${escapeHtml(signal.summary)}</p>
        <div class="news-why"><span>Pourquoi c'est important</span><p>${escapeHtml(signal.why)}</p></div>
        <div class="news-tags">${tags}</div>
      </div>
      <aside class="news-card-proof">
        <span>Provenance</span><strong>${escapeHtml(signal.sourceType)}</strong>
        ${sourceMarkup(signal)}
        <div><span>Confiance</span><b class="news-confidence news-confidence-${escapeHtml(signal.confidence)}"><i></i>${confidenceLabels[signal.confidence] || 'À vérifier'}</b></div>
      </aside>
    </article>`;
  }

  function render() {
    const list = filteredSignals();
    if (byId('newsResultCount')) byId('newsResultCount').textContent = String(list.length);
    if (byId('newsStrongCount')) byId('newsStrongCount').textContent = String(signals.filter(item => item.level === 'strong').length);
    if (byId('newsWatchCount')) byId('newsWatchCount').textContent = String(signals.filter(item => item.level === 'watch').length);
    if (byId('newsMunicipalityCount')) byId('newsMunicipalityCount').textContent = String(new Set(signals.map(item => item.bfsId)).size);
    if (byId('newsSourceCount')) byId('newsSourceCount').textContent = String(new Set(signals.map(item => item.sourceLabel)).size);
    const feed = byId('newsFeed');
    if (!feed) return;
    feed.innerHTML = list.length ? list.map(signalCard).join('') : '<div class="news-empty"><strong>Aucun signal dans cette vue.</strong><span>Essaie un autre niveau ou efface la recherche.</span></div>';
    feed.querySelectorAll('[data-news-bfs]').forEach(button => {
      button.addEventListener('click', () => {
        const municipality = all.find(item => Number(item.id) === Number(button.dataset.newsBfs));
        if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
      });
    });
  }

  async function load() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar ${response.status}`);
      const data = await response.json();
      signals = Array.isArray(data.signals) ? data.signals : [];
      render();
    } catch (error) {
      console.error(error);
      if (byId('newsFeed')) byId('newsFeed').innerHTML = '<div class="news-empty"><strong>Le Radar ne peut pas être chargé.</strong><span>Les autres vues restent disponibles.</span></div>';
    }
  }

  byId('newsQuery')?.addEventListener('input', render);
  document.querySelectorAll('[data-news-level]').forEach(button => {
    button.addEventListener('click', () => {
      activeLevel = button.dataset.newsLevel || 'all';
      document.querySelectorAll('[data-news-level]').forEach(item => item.classList.toggle('active', item === button));
      render();
    });
  });

  window.PrimeCommunesNews = { render, reload: load };
  void load();
})();
