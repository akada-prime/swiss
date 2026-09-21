(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json?v=20260914-2';
  const STORY_URL = 'public/data/news-stories-v1.json?v=20260919-1';
  const ANALYSIS_URL = 'public/data/news-analysis-v1.json?v=20260920-1';
  const RADAR_STATUS_URL = 'public/data/radar-state-v1.json?v=20260921-1';
  const RADAR_CANDIDATES_URL = 'public/data/radar-candidates-v1.json?v=20260921-1';
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
  let analysisItems = [];
  let radarMeta = {};
  let radarStatus = null;
  let radarCandidates = [];
  let activeLevel = 'all';
  const REFRESH_REQUEST_KEY = 'primeCommunesNewsRefreshRequest';
  const QUALIFICATION_KEY = 'primeCommunesNewsQualificationsV1';

  function refreshPrompt() {
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');
    const lines = pending.map(item => [
      '- ' + (item.municipality || item.scopeLabel || 'Périmètre communal'),
      item.title || item.url,
      item.url ? 'Source: ' + item.url : '',
      item.reason ? 'Détection mécanique: ' + item.reason : ''
    ].filter(Boolean).join(' · '));
    return [
      'Analyse uniquement les candidats détectés mécaniquement par Radar! dans Prime Communes.',
      '',
      'Ne lance pas une veille générale du web. Ne cherche pas de nouvelles communes au hasard : la collecte est le rôle du Radar déterministe.',
      'Pour chaque candidat ci-dessous, consulte la source primaire indiquée seulement si nécessaire, puis décide s’il mérite un signal Prime.',
      '',
      'Sépare strictement : fait public → déduction documentée → lecture Prime.',
      'Ne transforme jamais une hypothèse en fait.',
      'Exclus les projets déjà devisés, attribués, gagnés, livrés ou payés lorsqu’ils sont connus.',
      "n'exclus jamais un signal uniquement parce que la commune est cliente Prime : publie-le avec une réserve explicite si son statut commercial est inconnu.",
      'Ne demande pas une validation supplémentaire : si un candidat est solide et actionnable, mets à jour news-radar-v1.json et news-analysis-v1.json.',
      'Après traitement, marque le candidat comme analyzed ou discarded dans radar-candidates-v1.json afin qu’il ne soit pas réanalysé.',
      '',
      'Candidats détectés (' + pending.length + ') :',
      lines.length ? lines.join('\\n') : '- aucun',
      '',
      'À la fin, résume uniquement les candidats analysés, publiés ou écartés.'
    ].join('\\n');
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

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function renderRadarOperations() {
    const coverage = radarStatus?.coverage || {};
    const sourceHealth = radarStatus?.sources || {};
    const detection = radarStatus?.detection || {};
    const economy = radarStatus?.economy || {};
    const analysis = radarStatus?.analysis || {};
    const target = Number(coverage.targetMunicipalities || 621);
    const direct = Number(coverage.directMunicipalities || 0);
    const procurement = Number(coverage.procurementMunicipalities || 0);
    const configured = Number(sourceHealth.configured || 0);
    const active = Number(sourceHealth.active || 0);
    const errors = Number(sourceHealth.error || 0);
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');

    setText('radarCoverageCount', procurement + '/' + target);
    setText('radarCoverageDetail', 'marchés publics · ' + direct + '/' + target + ' sources communales directes');
    setText('radarSourceCount', active + '/' + configured);
    setText('radarSourceDetail', errors ? errors + ' source' + (errors > 1 ? 's' : '') + ' en erreur' : 'aucune erreur connue');
    setText('radarChangeCount', String(Number(detection.newDocuments || 0)));
    setText('radarChangeDetail', Number(detection.changes || 0) + ' changement' + (Number(detection.changes || 0) > 1 ? 's' : '') + ' au dernier passage');
    setText('radarCandidateCount', String(pending.length));
    setText('radarPublishedCount', String(Number(analysis.published || signals.length || 0)));
    setText('radarEconomyDetail',
      Number(economy.requests || 0) + ' requêtes · ' +
      Number(economy.notModified || 0) + ' réponses sans contenu · ' +
      Number(economy.aiCalls || 0) + ' appel IA automatique');

    const button = byId('newsManualRefresh');
    const status = byId('newsRefreshStatus');
    if (button) button.disabled = pending.length === 0;
    if (status) {
      if (pending.length) status.textContent = pending.length + ' candidat' + (pending.length > 1 ? 's' : '') + ' détecté' + (pending.length > 1 ? 's' : '') + ' · prêt' + (pending.length > 1 ? 's' : '') + ' à analyser';
      else if (radarStatus?.meta?.generatedAt) status.textContent = 'Aucun candidat · 0 appel IA nécessaire ✓';
      else status.textContent = 'Premier passage mécanique en attente';
    }
  }

  async function loadRadarOperations() {
    try {
      const [statusResponse, candidatesResponse] = await Promise.all([
        fetch(RADAR_STATUS_URL, { cache: 'no-store' }),
        fetch(RADAR_CANDIDATES_URL, { cache: 'no-store' })
      ]);
      if (!statusResponse.ok) throw new Error('Radar status ' + statusResponse.status);
      if (!candidatesResponse.ok) throw new Error('Radar candidates ' + candidatesResponse.status);
      radarStatus = await statusResponse.json();
      const candidateData = await candidatesResponse.json();
      radarCandidates = Array.isArray(candidateData.items) ? candidateData.items : [];
    } catch (error) {
      console.error(error);
      radarStatus = null;
      radarCandidates = [];
    }
    renderRadarOperations();
  }

  function filteredSignals() {
    const needle = byId('newsQuery')?.value.trim().toLocaleLowerCase('fr-CH') || '';
    return signals.filter(signal => {
      const interpretation = analysisItems.find(item => item.signalId === signal.id)?.interpretation || {};
      const affected = interpretation.affected || {};
      const haystack = [signal.municipality, signal.canton, signal.title, signal.summary,
        signal.why, signal.sourceLabel, interpretation.change, interpretation.deduction,
        interpretation.primeReading, ...Object.values(affected).flat(), ...(signal.tags || [])]
        .join(' ').toLocaleLowerCase('fr-CH');
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

  function analysisFor(signalId) {
    return analysisItems.find(item => item.signalId === signalId) || null;
  }

  function readQualifications() {
    try {
      return JSON.parse(localStorage.getItem(QUALIFICATION_KEY) || '{}') || {};
    } catch {
      localStorage.removeItem(QUALIFICATION_KEY);
      return {};
    }
  }

  function writeQualifications(value) {
    localStorage.setItem(QUALIFICATION_KEY, JSON.stringify(value));
  }

  function qualificationFor(signalId) {
    const proposal = analysisFor(signalId)?.qualificationProposal || {};
    const saved = readQualifications()[signalId] || {};
    return { ...proposal, ...saved, saved: Boolean(saved.savedAt) };
  }

  function money(value) {
    return value > 0 ? new Intl.NumberFormat('fr-CH', {
      style: 'currency', currency: 'CHF', maximumFractionDigits: 0
    }).format(value) : 'À compléter';
  }

  function renderForecast() {
    const drafts = signals.map(signal => qualificationFor(signal.id));
    const saved = drafts.filter(item => item.saved);
    const actions = saved.filter(item => item.decision === 'act');
    const gross = saved.reduce((sum, item) => sum + (Number(item.estimatedValue) || 0), 0);
    const weighted = saved.reduce((sum, item) => sum + ((Number(item.estimatedValue) || 0) * (Number(item.probability) || 0) / 100), 0);
    if (byId('newsQualifiedCount')) byId('newsQualifiedCount').textContent = `${saved.length}/${signals.length}`;
    if (byId('newsActionCount')) byId('newsActionCount').textContent = String(actions.length);
    if (byId('newsForecastGross')) byId('newsForecastGross').textContent = money(gross);
    if (byId('newsForecastWeighted')) byId('newsForecastWeighted').textContent = money(weighted);
  }

  function affectedMarkup(affected = {}) {
    const groups = [
      ['Communes', affected.municipalities],
      ['Territoires', affected.territories],
      ['Produits', affected.products],
      ['Intégrateurs', affected.integrators]
    ];
    return groups.map(([label, values]) => `<div><span>${label}</span><p>${(values || []).map(value => `<b>${escapeHtml(value)}</b>`).join('') || '<b>Non établi</b>'}</p></div>`).join('');
  }

  function decisionOptions(selected) {
    return [
      ['to_qualify', 'À qualifier'], ['watch', 'Surveiller'], ['act', 'Agir'], ['discard', 'Écarter']
    ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
  }

  function signalTools(signal) {
    const item = analysisFor(signal.id);
    if (!item) return '';
    const interpretation = item.interpretation || {};
    const qualification = qualificationFor(signal.id);
    return `<div class="news-tools">
      <div class="news-tool-buttons" role="group" aria-label="Approfondir ${escapeHtml(signal.municipality)}">
        <button type="button" data-news-tool="impact" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.3</span> Comprendre l'impact</button>
        <button type="button" data-news-tool="qualification" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.4</span> Qualifier ce signal</button>
      </div>
      <section class="news-tool-panel news-impact-panel" data-news-panel="impact" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>Actualité interprétée · 2.0.3</span><strong>Ce que ce fait change</strong></div><small>Trois niveaux, jamais confondus</small></header>
        <div class="news-proof-line">
          <article class="is-fact"><span>1 · Fait public</span><p>${escapeHtml(signal.summary)}</p></article>
          <article class="is-deduction"><span>2 · Déduction documentée</span><p>${escapeHtml(interpretation.deduction)}</p></article>
          <article class="is-prime"><span>3 · Lecture Prime</span><p>${escapeHtml(interpretation.primeReading)}</p></article>
        </div>
        <div class="news-change"><span>En clair</span><strong>${escapeHtml(interpretation.change)}</strong></div>
        <div class="news-affected">${affectedMarkup(interpretation.affected)}</div>
      </section>
      <section class="news-tool-panel news-qualification-panel" data-news-panel="qualification" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>Qualification légère · 2.0.4</span><strong>Décider de la prochaine action</strong></div><small>Brouillon sur cet appareil · aucun CRM créé</small></header>
        <form data-qualification-form="${escapeHtml(signal.id)}">
          <label><span>Décision</span><select name="decision">${decisionOptions(qualification.decision)}</select></label>
          <label><span>Responsable</span><input name="owner" value="${escapeHtml(qualification.owner || '')}" placeholder="À attribuer"></label>
          <label class="wide"><span>Prochaine action</span><textarea name="nextAction" rows="2">${escapeHtml(qualification.nextAction || '')}</textarea></label>
          <label><span>Échéance</span><input name="dueDate" type="date" value="${escapeHtml(qualification.dueDate || '')}"></label>
          <label><span>Probabilité</span><div class="news-unit-input"><input name="probability" type="number" min="0" max="100" inputmode="numeric" value="${qualification.probability ?? ''}" placeholder="—"><b>%</b></div></label>
          <label><span>Valeur estimée</span><div class="news-unit-input"><input name="estimatedValue" type="number" min="0" step="1000" inputmode="numeric" value="${qualification.estimatedValue ?? ''}" placeholder="—"><b>CHF</b></div></label>
          <div class="news-qualification-actions wide"><button type="submit">Enregistrer sur cet appareil</button><button type="button" data-qualification-reset="${escapeHtml(signal.id)}">Réinitialiser</button><small data-qualification-status>${qualification.saved ? 'Brouillon enregistré ✓' : escapeHtml(qualification.basis || '')}</small></div>
        </form>
      </section>
    </div>`;
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
        ${signalTools(signal)}
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
    renderForecast();
    renderRadarOperations();
    const feed = byId('newsFeed');
    if (!feed) return;
    feed.innerHTML = list.length ? list.map(signalCard).join('') : '<div class="news-empty"><strong>Aucun signal dans cette vue.</strong><span>Essaie un autre niveau ou efface la recherche.</span></div>';
    feed.querySelectorAll('[data-news-bfs]').forEach(button => {
      button.addEventListener('click', () => {
        const municipality = all.find(item => Number(item.id) === Number(button.dataset.newsBfs));
        if (municipality && typeof openDrawer === 'function') openDrawer(municipality);
      });
    });
    feed.querySelectorAll('[data-news-tool]').forEach(button => {
      button.addEventListener('click', () => {
        const card = button.closest('.news-card');
        const panel = card?.querySelector(`[data-news-panel="${button.dataset.newsTool}"]`);
        const opening = Boolean(panel?.hidden);
        card?.querySelectorAll('[data-news-panel]').forEach(item => { item.hidden = true; });
        card?.querySelectorAll('[data-news-tool]').forEach(item => {
          item.classList.remove('active');
          item.setAttribute('aria-expanded', 'false');
        });
        if (panel && opening) {
          panel.hidden = false;
          button.classList.add('active');
          button.setAttribute('aria-expanded', 'true');
        }
      });
    });
    feed.querySelectorAll('[data-qualification-form]').forEach(form => {
      form.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(form);
        const values = readQualifications();
        values[form.dataset.qualificationForm] = {
          decision: formData.get('decision'),
          owner: String(formData.get('owner') || '').trim(),
          nextAction: String(formData.get('nextAction') || '').trim(),
          dueDate: formData.get('dueDate') || '',
          probability: formData.get('probability') === '' ? null : Number(formData.get('probability')),
          estimatedValue: formData.get('estimatedValue') === '' ? null : Number(formData.get('estimatedValue')),
          currency: 'CHF',
          savedAt: new Date().toISOString()
        };
        writeQualifications(values);
        const status = form.querySelector('[data-qualification-status]');
        if (status) status.textContent = 'Brouillon enregistré sur cet appareil ✓';
        renderForecast();
      });
    });
    feed.querySelectorAll('[data-qualification-reset]').forEach(button => {
      button.addEventListener('click', () => {
        const values = readQualifications();
        delete values[button.dataset.qualificationReset];
        writeQualifications(values);
        render();
      });
    });
  }

  async function loadAnalysis() {
    try {
      const response = await fetch(ANALYSIS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Analyses ${response.status}`);
      const data = await response.json();
      analysisItems = Array.isArray(data.items) ? data.items : [];
    } catch (error) {
      console.error(error);
      analysisItems = [];
    }
  }

  async function load() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Radar ${response.status}`);
      const data = await response.json();
      radarMeta = data.meta || {};
      signals = Array.isArray(data.signals) ? data.signals : [];
      renderRadarOperations();
      render();
    } catch (error) {
      console.error(error);
      if (byId('newsFeed')) byId('newsFeed').innerHTML = '<div class="news-empty"><strong>Le Radar ne peut pas être chargé.</strong><span>Les autres vues restent disponibles.</span></div>';
    }
  }

  byId('newsQuery')?.addEventListener('input', render);
  byId('newsManualRefresh')?.addEventListener('click', async () => {
    const status = byId('newsRefreshStatus');
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');
    if (!pending.length) {
      if (status) status.textContent = 'Aucun candidat · aucun appel IA lancé ✓';
      return;
    }
    try {
      localStorage.setItem(REFRESH_REQUEST_KEY, JSON.stringify({
        candidateCount: pending.length,
        requestedAt: new Date().toISOString()
      }));
      await copyRefreshPrompt();
      byId('newsManualRefresh')?.classList.add('is-launching');
      if (status) status.textContent = 'Candidats copiés · ouverture de l’analyse…';
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
  void loadAnalysis().then(load);
  void loadStories();
  void loadRadarOperations();
})();
