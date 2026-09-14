(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json';
  const CHAT_URL = 'https://chatgpt.com/c/6a9ef456-9284-83ed-9f8b-5e32c1fdfcc3';
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
  let radarMeta = {};
  let activeLevel = 'all';
  const REFRESH_REQUEST_KEY = 'primeCommunesNewsRefreshRequest';

  function refreshPrompt() {
    const lastUpdate = radarMeta.updatedOn || 'la dernière publication du Radar';
    const currentSignals = signals.length
      ? signals.map(signal => `${signal.municipality} — ${signal.title} (${signal.id})`).join('\n- ')
      : 'aucun';
    return `Mets à jour le Radar communal NEWS! du site Prime Communes.

Inspecte d'abord la version actuelle dans le dépôt akada-prime/swiss, notamment cities/public/data/news-radar-v1.json. La dernière veille éditoriale indiquée est le ${lastUpdate}.

Cherche des faits publics nouveaux ou toujours actionnables concernant les communes suisses romandes : budgets votés ou proposés, crédits d'étude, planifications financières, stratégies numériques, préavis, messages municipaux, nominations ou départs clés, mutualisations, changements réglementaires et appels d'offres à venir. Le but est de détecter un projet possible avant qu'il soit déjà gagné, livré ou fêté.

Règles impératives :
- chaque signal repose sur une source publique primaire, datée et accessible ;
- sépare strictement le fait public de la lecture de l'IA d'Axel ;
- ne transforme jamais une hypothèse en fait ;
- exclue les projets Prime déjà devisés, gagnés, prestés ou payés ;
- n'exclus jamais un signal uniquement parce que la commune est cliente Prime : si son statut commercial interne est inconnu, publie-le avec les tags « Client Prime » et « À confirmer en interne » ;
- privilégie peu de signaux solides plutôt qu'une longue liste ;
- limite la recherche et l'analyse au nécessaire pour une veille sobre ;
- ne supprime un signal existant que s'il est devenu obsolète, erroné ou non actionnable.

Signaux actuellement publiés :
- ${currentSignals}

Pour chaque signal retenu, renseigne : niveau, date, commune et canton, titre, fait public, lecture de l'IA d'Axel, source primaire avec URL, confiance et tags.

Exécute directement la mise à jour : modifie le JSON, adapte les tests si nécessaire, vérifie le site puis publie. Ne demande pas une validation supplémentaire. Si le statut commercial Prime d'un signal est inconnu, publie-le avec une réserve explicite. Écarte-le uniquement lorsqu'une information interne ou publique confirme qu'il est déjà devisé, attribué, gagné, livré ou payé. À la fin, résume brièvement ce qui a été publié et ce qui a été écarté.`;
  }

  async function copyRefreshPrompt() {
    const prompt = refreshPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = prompt;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

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
        <div class="news-fact"><span>Fait public</span><p>${escapeHtml(signal.summary)}</p></div>
        <div class="news-why"><span>Lecture de l'IA d'Axel</span><p>${escapeHtml(signal.why)}</p></div>
        <div class="news-tags">${tags}</div>
      </div>
      <aside class="news-card-proof">
        <span>Provenance</span><strong>${escapeHtml(signal.sourceType)}</strong>
        ${sourceMarkup(signal)}
        <div class="news-update"><span>Mise à jour</span><b>${escapeHtml(signal.updatedBy || "IA d'Axel")}</b></div>
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
      radarMeta = data.meta || {};
      signals = Array.isArray(data.signals) ? data.signals : [];
      const status = byId('newsRefreshStatus');
      const refreshButton = byId('newsManualRefresh');
      let request = null;
      try {
        request = JSON.parse(localStorage.getItem(REFRESH_REQUEST_KEY) || 'null');
      } catch {
        localStorage.removeItem(REFRESH_REQUEST_KEY);
      }
      const changedAfterRequest = request && (
        radarMeta.updatedOn !== request.updatedOn || signals.length !== request.signalCount
      );
      if (status && changedAfterRequest) {
        status.textContent = `Radar actualisé ✓ · ${signals.length} signal${signals.length > 1 ? 's' : ''}`;
        refreshButton?.classList.add('is-success');
        localStorage.removeItem(REFRESH_REQUEST_KEY);
      } else if (status && radarMeta.updatedOn) {
        status.textContent = `Dernière veille · ${formatDate(radarMeta.updatedOn)}`;
      }
      render();
    } catch (error) {
      console.error(error);
      if (byId('newsFeed')) byId('newsFeed').innerHTML = '<div class="news-empty"><strong>Le Radar ne peut pas être chargé.</strong><span>Les autres vues restent disponibles.</span></div>';
    }
  }

  byId('newsQuery')?.addEventListener('input', render);
  byId('newsManualRefresh')?.addEventListener('click', async () => {
    const status = byId('newsRefreshStatus');
    try {
      localStorage.setItem(REFRESH_REQUEST_KEY, JSON.stringify({
        updatedOn: radarMeta.updatedOn || null,
        signalCount: signals.length,
        requestedAt: new Date().toISOString()
      }));
      await copyRefreshPrompt();
      byId('newsManualRefresh')?.classList.add('is-launching');
      if (status) status.textContent = 'Prompt copié · mise à jour lancée…';
      window.setTimeout(() => window.location.assign(CHAT_URL), 900);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = 'Copie impossible · réessaie';
    }
  });
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
