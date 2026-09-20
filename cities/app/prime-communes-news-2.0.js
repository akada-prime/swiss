(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json?v=20260914-2';
  const STORY_URL = 'public/data/news-stories-v1.json?v=20260919-1';
  const ANALYSIS_URL = 'public/data/news-analysis-v1.json?v=20260920-1';
  const CHAT_URL = 'https://chatgpt.com/c/6a9ef456-9284-83ed-9f8b-5e32c1fdfcc3';
  const levelOrder = { strong: 0, watch: 1, info: 2 };
  const levelLabels = { strong: 'Signal fort', watch: 'Ã€ surveiller', info: 'Information' };
  const confidenceLabels = { confirmed: 'ConfirmÃ©', probable: 'Probable', verify: 'Ã€ vÃ©rifier' };
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
  let activeLevel = 'all';
  const REFRESH_REQUEST_KEY = 'primeCommunesNewsRefreshRequest';
  const QUALIFICATION_KEY = 'primeCommunesNewsQualificationsV1';

  function refreshPrompt() {
    const lastUpdate = radarMeta.updatedOn || 'la derniÃ¨re publication du Radar';
    const currentSignals = signals.length
      ? signals.map(signal => `${signal.municipality} â€” ${signal.title} (${signal.id})`).join('\n- ')
      : 'aucun';
    return `Mets Ã  jour le Radar communal NEWS! du site Prime Communes.

Inspecte d'abord la version actuelle dans le dÃ©pÃ´t akada-prime/swiss, notamment cities/public/data/news-radar-v1.json. La derniÃ¨re veille Ã©ditoriale indiquÃ©e est le ${lastUpdate}.

Cherche des faits publics nouveaux ou toujours actionnables concernant les communes suisses romandes : budgets votÃ©s ou proposÃ©s, crÃ©dits d'Ã©tude, planifications financiÃ¨res, stratÃ©gies numÃ©riques, prÃ©avis, messages municipaux, nominations ou dÃ©parts clÃ©s, mutualisations, changements rÃ©glementaires et appels d'offres Ã  venir. Le but est de dÃ©tecter un projet possible avant qu'il soit dÃ©jÃ  gagnÃ©, livrÃ© ou fÃªtÃ©.

RÃ¨gles impÃ©ratives :
- chaque signal repose sur une source publique primaire, datÃ©e et accessible ;
- sÃ©pare strictement le fait public de la lecture de l'IA d'Axel ;
- ne transforme jamais une hypothÃ¨se en fait ;
- exclue les projets Prime dÃ©jÃ  devisÃ©s, gagnÃ©s, prestÃ©s ou payÃ©s ;
- n'exclus jamais un signal uniquement parce que la commune est cliente Prime : si son statut commercial interne est inconnu, publie-le avec les tags Â« Client Prime Â» et Â« Ã€ confirmer en interne Â» ;
- privilÃ©gie peu de signaux solides plutÃ´t qu'une longue liste ;
- limite la recherche et l'analyse au nÃ©cessaire pour une veille sobre ;
- ne supprime un signal existant que s'il est devenu obsolÃ¨te, erronÃ© ou non actionnable.

Signaux actuellement publiÃ©s :
- ${currentSignals}

Pour chaque signal retenu, renseigne : niveau, date, commune et canton, titre, fait public, lecture de l'IA d'Axel, source primaire avec URL, confiance et tags.

ExÃ©cute directement la mise Ã  jour : modifie le JSON, adapte les tests si nÃ©cessaire, vÃ©rifie le site puis publie. Ne demande pas une validation supplÃ©mentaire. Si le statut commercial Prime d'un signal est inconnu, publie-le avec une rÃ©serve explicite. Ã‰carte-le uniquement lorsqu'une information interne ou publique confirme qu'il est dÃ©jÃ  devisÃ©, attribuÃ©, gagnÃ©, livrÃ© ou payÃ©. Ã€ la fin, rÃ©sume briÃ¨vement ce qui a Ã©tÃ© publiÃ© et ce qui a Ã©tÃ© Ã©cartÃ©.`;
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
    return `<a class="news-source-link" href="${escapeHtml(signal.sourceUrl)}" target="_blank" rel="noopener noreferrer">${label} â†—</a>`;
  }

  function storySource(story, sourceId) {
    return (story.sources || []).find(source => source.id === sourceId) || null;
  }

  function storySourceLink(source, compact = false) {
    if (!source) return '';
    const label = compact ? 'Source' : source.label;
    if (!source.url) return `<span>${escapeHtml(label)}</span>`;
    return `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} â†—</a>`;
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
            <i aria-hidden="true">â†”</i>
            <span><img src="public/cantons/${escapeHtml(story.counterpartCanton.toLowerCase())}.svg" alt="">${escapeHtml(story.counterpart)}</span>
          </div>
        </div>
        <p>${escapeHtml(story.standfirst)}</p>
      </header>
      <div class="story-timeline">${facts}</div>
      <div class="story-reading-grid">
        <section class="story-prime-fact"><span>${escapeHtml(story.primeFact.label)}</span><p>${escapeHtml(story.primeFact.text)}</p><small>${escapeHtml(story.primeFact.sourceLabel)} Â· ${escapeHtml(story.primeFact.confidence)}</small></section>
        <section class="story-axel-reading"><span>${escapeHtml(story.axelReading.label)}</span><p>${escapeHtml(story.axelReading.text)}</p></section>
      </div>
      <section class="story-angles">
        <header><div><span>Angles Ã©ditoriaux</span><strong>Une histoire, plusieurs usages</strong></div><button type="button" class="story-copy" data-story-copy="${escapeHtml(story.id)}">Copier cet angle</button></header>
        <div class="story-angle-tabs" role="group" aria-label="Choisir un angle Ã©ditorial">${angleButtons}</div>
        <div class="story-angle-copy" data-story-angle-copy="${escapeHtml(story.id)}" aria-live="polite"><strong>${escapeHtml(firstAngle.title)}</strong><p>${escapeHtml(firstAngle.text)}</p></div>
        <div class="story-deliverables"><b>PrÃªt pour</b>${deliverables}</div>
      </section>
      <footer class="story-sources"><strong>Sources du rÃ©cit</strong><ul>${sources}</ul></footer>
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
      button.textContent = 'Angle copiÃ© âœ“';
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
      feed.innerHTML = stories.length ? stories.map(storyCard).join('') : '<div class="news-empty"><strong>Aucun rÃ©cit publiÃ©.</strong><span>Les histoires validÃ©es apparaÃ®tront ici.</span></div>';
      bindStories();
    } catch (error) {
      console.error(error);
      feed.innerHTML = '<div class="news-empty"><strong>Le rÃ©cit ne peut pas Ãªtre chargÃ©.</strong><span>Le Radar reste disponible.</span></div>';
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
    }).format(value) : 'Ã€ complÃ©ter';
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
      ['IntÃ©grateurs', affected.integrators]
    ];
    return groups.map(([label, values]) => `<div><span>${label}</span><p>${(values || []).map(value => `<b>${escapeHtml(value)}</b>`).join('') || '<b>Non Ã©tabli</b>'}</p></div>`).join('');
  }

  function decisionOptions(selected) {
    return [
      ['to_qualify', 'Ã€ qualifier'], ['watch', 'Surveiller'], ['act', 'Agir'], ['discard', 'Ã‰carter']
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
        <header><div><span>ActualitÃ© interprÃ©tÃ©e Â· 2.0.3</span><strong>Ce que ce fait change</strong></div><small>Trois niveaux, jamais confondus</small></header>
        <div class="news-proof-line">
          <article class="is-fact"><span>1 Â· Fait public</span><p>${escapeHtml(signal.summary)}</p></article>
          <article class="is-deduction"><span>2 Â· DÃ©duction documentÃ©e</span><p>${escapeHtml(interpretation.deduction)}</p></article>
          <article class="is-prime"><span>3 Â· Lecture Prime</span><p>${escapeHtml(interpretation.primeReading)}</p></article>
        </div>
        <div class="news-change"><span>En clair</span><strong>${escapeHtml(interpretation.change)}</strong></div>
        <div class="news-affected">${affectedMarkup(interpretation.affected)}</div>
      </section>
      <section class="news-tool-panel news-qualification-panel" data-news-panel="qualification" data-mõ×Kh‘éì¶»§q«^tÛÛ[H	Ô›Û\ÛÜpêH0­ÈZ\ÙH0è›Ý\ˆ[˜ðêYx )‰ÎÂˆÚ[™ÝËœÙ][Y[Ý]


HOˆÚ[™ÝË›ØØ][Û‹˜\ÜÚYÛŠÒUÕT“
KL
NÂˆHØ]Ú
\œ›ÜŠHÂˆÛÛœÛÛK™\œ›ÜŠ\œ›ÜŠNÂˆYˆ
Ý]\ÊHÝ]\Ë^ÛÛ[H	ÐÛÜYH[\ÜÜÚX›H0­È°êY\ÜØZYIÎÂˆBˆJNÂˆØÝ[Y[œ]Y\žTÙ[XÝÜ[
	ÖÙ]K[™]ÜË[]™[IÊK™›Ü‘XXÚ
]ÛˆOˆÂˆ]Û‹˜Y]™[\Ý[™\Š	ØÛXÚÉË

HOˆÂˆXÝ]™S]™[H]Û‹™]\Ù]›™]ÜÓ]™[	Ø[	ÎÂˆØÝ[Y[œ]Y\žTÙ[XÝÜ[
	ÖÙ]K[™]ÜË[]™[IÊK™›Ü‘XXÚ
][HOˆ][K˜Û\ÜÓ\ÝÙÙÛJ	ØXÝ]™IË][HOOH]ÛŠJNÂˆ™[™\Š
NÂˆJNÂˆJNÂ‚ˆÚ[™ÝË”š[YPÛÛ[][™\Ó™]ÜÈHÈ™[™\‹™[ØYˆØYNÂˆ›ÚYØY[˜[\Ú\Ê
K[ŠØY
NÂˆ›ÚYØYÝÜšY\Ê
NÂŸJJ
NÂ