(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json?v=20260914-2';
  const STORY_URL = 'public/data/news-stories-v1.json?v=20260919-1';
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
  let stories = [];
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

  function storySource(story, sourceId) {
    return (story.sources || []).find(source => source.id === sourceId) || null;
  }

  function storySourceLink(source, compact = false) {
    if (!source) return '';
    const label = compact ? 'Source' : source.label;
    if (!source.url) return `<span>${escapeHtml(label)}</span>`;
    return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`;
  }

  function storyCard(story) {
    const facts = (story.facts || []).map(fact => `<article class="story-fact">
      <span>${escapeHtml(fact.dateLabel)}</span>
      <h4>${escapeHtml(fact.title)}</h4>
      <p>${escapeHtml(fact.text)}</p>
      ${storySourceLink(storySource(story, fact.sourceId), true)}
    </article>`).join('');
    const angles = story.angles || [];
    const firstAngle = angles[0] || { id: '', label: '', title: '', text: '' };
    const angleButtons = angles.map((angle, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-story-id="${escapeHtml(story.id)}" data-story-angle="${escapeHtml(angle.id)}" aria-pressed="${index === 0}">${escapeHtml(angle.label)}</button>`).join('');
    const deliverables = (story.deliverables || []).map(item => `<span>${escapeHtml(item)}</span>`).join('');
    const sources = (story.sources || []).map(source => `<li><b>${escapeHtml(source.type)}</b>${storySourceLink(source)}</li>`).join('');
    return `<article class="story-card" id="story-${escapeHtml(story.id)}">
      <header class="story-hero">
        <div>
          <p>${escapeHtml(story.kicker)}</p>
          <h3>${escapeHtml(story.title)}</h3>
          <div class="story-places">
            <button type="button" data-story-bfs="${Number(story.bfsId)}"><img src="public/cantons/${escapeHtml(story.canton.toLowerCase())}.svg" alt=""><span>${escapeHtml(story.municipality)}</span></button>
            <i aria-hidden="true">↔</i>
            <span><img src="public/cantons/${escapeHtml(story.counterpartCanton.toLowerCase())}.svg" alt="">${escapeHtml(story.counterpart)}</span>
          </div>
        </div>
        <p>${escapeHtml(story.standfirst)}</p>
      </header>
      <div class="story-timeline">${facts}</div>
      <div class="story-reading-grid">
        <section class="story-prime-fact"><span>${escapeHtml(story.primeFact.label)}</span><p>${escapeHtml(story.primeFact.text)}</p><small>${escapeHtml(story.primeFact.sourceLabel)} · ${escapeHtml(story.primeFact.confidence)}</small></section>
        <section class="story-axel-reading"><span>${escapeHtml(story.axelReading.label)}</span><p>${escapeHtml(story.axelReading.text)}</p></section>
      </div>
      <section class="story-angles">
        <header><div><span>Angles éditoriaux</span><strong>Une histoire, plusieurs usages</strong></div><button type="button" class="story-copy" data-story-copy="${escapeHtml(story.id)}">Copier cet angle</button></header>
        <div class="story-angle-tabs" role="group" aria-label="Choisir un angle éditorial">${angleButtons}</div>
        <div class="story-angle-copy" data-story-angle-copy="${escapeHtml(story.id)}" aria-live="polite"><strong>${escapeHtml(firstAngle.title)}</strong><p>${escapeHtml(firstAngle.text)}</p></div>
        <div class="story-deliverables"><b>Prêt pour</b>${deliverables}</div>
      </section>
      <footer class="story-sources"><strong>Sources du récit</strong><ul>${sources}</ul></footer>
    </article>`;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function bindStories() {
    const feed = byId('newsStoryFeed');
    if (!feed) return;
    feed.querySelectorAll('[data-story-bfs]').forEach(button => button.addEventListener('click', () => {
      const municipality = all.find(item => Number(item.id) === Number(button.dataset.storyBfs));
      if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
    }));
    feed.querySelectorAll('[data-story-angle]').forEach(button => button.addEventListener('click', () => {
      const story = stories.find(item => item.id === button.dataset.storyId);
      const angle = story?.angles?.find(item => item.id === button.dataset.storyAngle);
      if (!story || !angle) return;
      feed.querySelectorAll(`[data-story-id="${story.id}"]`).forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      const copy = feed.querySelector(`[data-story-angle-copy="${story.id}"]`);
      if (copy) copy.innerHTML = `<strong>${escapeHtml(angle.title)}</strong><p>${escapeHtml(angle.text)}</p>`;
    }));
    feed.querySelectorAll('[data-story-copy]').forEach(button => button.addEventListener('click', async () => {
      const story = stories.find(item => item.id === button.dataset.storyCopy);
      const selected = feed.querySelector(`[data-story-id="${button.dataset.storyCopy}"].active`);
      const angle = story?.angles?.find(item => item.id === selected?.dataset.storyAngle) || story?.angles?.[0];
      if (!story || !angle) return;
      await copyText(`${story.title}\n\n${angle.title}\n${angle.text}\n\n${story.standfirst}`);
      button.textContent = 'Angle copié ✓';
      window.setTimeout(() => { button.textContent = 'Copier cet angle'; }, 1800);
    }));
  }

  async function loadStories() {
    const feed = byId('newsStoryFeed');
    if (!feed) return;
    try {
      const response = await fetch(STORY_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Histoires ${response.status}`);
      const data = await response.json();
      stories = Array.isArray(data.stories) ? data.stories : [];
      feed.innerHTML = stories.length ? stories.map(storyCard).join('') : '<div class="news-empty"><strong>Aucun récit publié.</strong><span>Les histoires validées apparaîtront ici.</span></div>';
      bindStories();
    } catch (error) {
      console.error(error);
      feed.innerHTML = '<div class="news-empty"><strong>Le récit ne peut pas être chargé.</strong><span>Le Radar reste disponible.</span></div>';
    }
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
  void loadStories();
})();
