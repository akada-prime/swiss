import {t, number, date, locale} from './core/i18n.js';
import { signals as germanSignals, analysis as germanAnalysis } from './i18n/editorial-de.js';
import { getPreference } from './core/preferences.js';
(() => {
  'use strict';

  const DATA_URL = 'public/data/news-radar-v1.json?v=20260914-2';
  const ANALYSIS_URL = 'public/data/news-analysis-v1.json?v=20260920-1';
  const RADAR_STATUS_URL = 'public/data/radar-state-v1.json?v=20260921-1';
  const RADAR_CANDIDATES_URL = 'public/data/radar-candidates-v1.json?v=20260921-1';
  const CHAT_URL = 'https://chatgpt.com/c/6a9ef456-9284-83ed-9f8b-5e32c1fdfcc3';
  const levelOrder = { strong: 0, watch: 1, info: 2 };
  const levelLabels = { strong: 'radar.strong', watch: 'radar.watch', info: 'radar.info' };
  const confidenceLabels = { confirmed: 'radar.confirmed', probable: 'radar.probable', verify: 'radar.verify' };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const formatDate = value => date(new Date(`${value}T12:00:00`), {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  let signals = [];
  let analysisItems = [];
  let radarMeta = {};
  let radarStatus = null;
  let radarCandidates = [];
  let activeLevel = 'all';
  const displayedSignal = signal => getPreference('language') === 'de'
    ? { ...signal, ...germanSignals[signal.id], sourceLabel: signal.sourceLabel }
    : signal;
  const displayedAnalysis = item => {
    const translation = getPreference('language') === 'de' && germanAnalysis[item.signalId];
    const affectedTerms = {
      'Aucun produit Prime établi':'Kein Prime-Produkt belegt',
      'Non identifié dans la source':'In der Quelle nicht genannt',
      'innosolvcity · contexte client seulement':'innosolvcity · nur Kundenkontext',
      'Cartolacôte · cité par le préavis':'Cartolacôte · in der Vorlage erwähnt',
      'Intégration / données · contexte potentiel':'Integration / Daten · möglicher Bezug',
      'Facturation / données débiteurs · contexte potentiel':'Fakturierung / Debitorendaten · möglicher Bezug',
      'Loyco SA · conseil en marchés publics, pas intégrateur technique établi':'Loyco SA · Beratung für öffentliches Beschaffungswesen, kein technischer Integrationspartner belegt',
      // Territorial labels are stored data and retain their original wording.
    };
    return translation ? {
      ...item,
      interpretation: { ...item.interpretation, ...translation,
        affected: Object.fromEntries(Object.entries(item.interpretation?.affected || {}).map(([key,values]) =>
          [key, values.map(value => affectedTerms[value] || value)])) },
      qualificationProposal: { ...item.qualificationProposal, nextAction: translation.nextAction }
    } : item;
  };
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
    setText('radarCoverageDetail', t('radar.coverageDetail', {direct,target}));
    setText('radarSourceCount', active + '/' + configured);
    setText('radarSourceDetail', errors ? t('radar.sourceError', {count:errors}) : t('radar.noSourceError'));
    setText('radarChangeCount', String(Number(detection.newDocuments || 0)));
    setText('radarChangeDetail', t('radar.changeDetail', {count:Number(detection.changes || 0)}));
    setText('radarCandidateCount', String(pending.length));
    setText('radarPublishedCount', String(Number(analysis.published || signals.length || 0)));
    setText('radarEconomyDetail', t('radar.economyDetail', {
      requests:Number(economy.requests || 0),unchanged:Number(economy.notModified || 0),ai:Number(economy.aiCalls || 0)
    }));

    const button = byId('newsManualRefresh');
    const status = byId('newsRefreshStatus');
    if (button) button.disabled = pending.length === 0;
    if (status) {
      if (pending.length) status.textContent = t('radar.candidateStatus', {count:pending.length});
      else if (radarStatus?.meta?.generatedAt) status.textContent = t('radar.noCandidates');
      else status.textContent = t('radar.waiting');
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
      const interpretation = analysisFor(signal.id)?.interpretation || {};
      const affected = interpretation.affected || {};
      const display = displayedSignal(signal);
      const haystack = [signal.municipality, signal.canton, signal.title, signal.summary,
        signal.why, display.title, display.summary, display.why, signal.sourceLabel, interpretation.change, interpretation.deduction,
        interpretation.primeReading, ...Object.values(affected).flat(), ...(signal.tags || []), ...(display.tags || [])]
        .join(' ').toLocaleLowerCase('fr-CH');
      return (activeLevel === 'all' || signal.level === activeLevel) && (!needle || haystack.includes(needle));
    }).sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || b.date.localeCompare(a.date));
  }

  function sourceMarkup(signal) {
    const label = escapeHtml(signal.sourceLabel);
    if (!signal.sourceUrl) return `<span class="news-source-label">${label}</span>`;
    return `<a class="news-source-link" href="${escapeHtml(signal.sourceUrl)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
  }

  function analysisFor(signalId) {
    const item = analysisItems.find(item => item.signalId === signalId);
    return item ? displayedAnalysis(item) : null;
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
    return value > 0 ? new Intl.NumberFormat(locale(), {
      style: 'currency', currency: 'CHF', maximumFractionDigits: 0
    }).format(value) : t('radar.toComplete');
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
      [t('radar.affectedMunicipalities'), affected.municipalities],
      [t('radar.affectedTerritories'), affected.territories],
      [t('radar.affectedProducts'), affected.products],
      [t('radar.affectedIntegrators'), affected.integrators]
    ];
    return groups.map(([label, values]) => `<div><span>${label}</span><p>${(values || []).map(value => `<b>${escapeHtml(value)}</b>`).join('') || `<b>${t('radar.notEstablished')}</b>`}</p></div>`).join('');
  }

  function decisionOptions(selected) {
    return [
      ['to_qualify', 'radar.qualify'], ['watch', 'radar.monitor'], ['act', 'radar.act'], ['discard', 'radar.discard']
    ].map(([value, label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${t(label)}</option>`).join('');
  }

  function signalTools(signal) {
    const item = analysisFor(signal.id);
    if (!item) return '';
    const interpretation = item.interpretation || {};
    const qualification = qualificationFor(signal.id);
    return `<div class="news-tools">
      <div class="news-tool-buttons" role="group" aria-label="${t('radar.deepen',{name:escapeHtml(signal.municipality)})}">
        <button type="button" data-news-tool="impact" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.3</span> ${t('radar.impact')}</button>
        <button type="button" data-news-tool="qualification" data-news-signal="${escapeHtml(signal.id)}" aria-expanded="false"><span>2.0.4</span> ${t('radar.qualification')}</button>
      </div>
      <section class="news-tool-panel news-impact-panel" data-news-panel="impact" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>${t('radar.impactHeader')}</span><strong>${t('radar.impactChange')}</strong></div><small>${t('radar.levels')}</small></header>
        <div class="news-proof-line">
          <article class="is-fact"><span>${t('radar.publicFact')}</span><p>${escapeHtml(signal.summary)}</p></article>
          <article class="is-deduction"><span>${t('radar.deduction')}</span><p>${escapeHtml(interpretation.deduction)}</p></article>
          <article class="is-prime"><span>${t('radar.primeReading')}</span><p>${escapeHtml(interpretation.primeReading)}</p></article>
        </div>
        <div class="news-change"><span>${t('radar.inShort')}</span><strong>${escapeHtml(interpretation.change)}</strong></div>
        <div class="news-affected">${affectedMarkup(interpretation.affected)}</div>
      </section>
      <section class="news-tool-panel news-qualification-panel" data-news-panel="qualification" data-news-signal="${escapeHtml(signal.id)}" hidden>
        <header><div><span>${t('radar.qualificationHeader')}</span><strong>${t('radar.decisionHeader')}</strong></div><small>${t('radar.localDraft')}</small></header>
        <form data-qualification-form="${escapeHtml(signal.id)}">
          <label><span>${t('radar.decision')}</span><select name="decision">${decisionOptions(qualification.decision)}</select></label>
          <label><span>${t('radar.owner')}</span><input name="owner" value="${escapeHtml(qualification.owner || '')}" placeholder="${t('radar.assign')}"></label>
          <label class="wide"><span>${t('radar.nextAction')}</span><textarea name="nextAction" rows="2">${escapeHtml(qualification.nextAction || '')}</textarea></label>
          <label><span>${t('radar.dueDate')}</span><input name="dueDate" type="date" value="${escapeHtml(qualification.dueDate || '')}"></label>
          <label><span>${t('radar.probability')}</span><div class="news-unit-input"><input name="probability" type="number" min="0" max="100" inputmode="numeric" value="${qualification.probability ?? ''}" placeholder="—"><b>%</b></div></label>
          <label><span>${t('radar.value')}</span><div class="news-unit-input"><input name="estimatedValue" type="number" min="0" step="1000" inputmode="numeric" value="${qualification.estimatedValue ?? ''}" placeholder="—"><b>CHF</b></div></label>
          <div class="news-qualification-actions wide"><button type="submit">${t('radar.saveLocal')}</button><button type="button" data-qualification-reset="${escapeHtml(signal.id)}">${t('page.040')}</button><small data-qualification-status>${qualification.saved ? t('radar.draftSaved') : t('radar.proposalBasis')}</small></div>
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
          <span class="news-level news-level-${escapeHtml(signal.level)}"><i></i>${t(levelLabels[signal.level] || 'radar.info')}</span>
          <time datetime="${escapeHtml(signal.date)}">${formatDate(signal.date)}</time>
        </header>
        <button class="news-municipality" data-news-bfs="${Number(signal.bfsId)}" title="${t('radar.openMunicipality',{name:escapeHtml(signal.municipality)})}">
          <img src="public/cantons/${escapeHtml(signal.canton.toLowerCase())}.svg" alt="">
          <span><strong>${escapeHtml(signal.municipality)}</strong><small>${escapeHtml(signal.canton)} · OFS ${Number(signal.bfsId)}</small></span><b>Ouvrir la fiche&nbsp;›</b>
        </button>
        <h3>${escapeHtml(signal.title)}</h3>
        <div class="news-fact"><span>${t('radar.publicFactShort')}</span><p>${escapeHtml(signal.summary)}</p></div>
        <div class="news-why"><span>${t('radar.aiReading')}</span><p>${escapeHtml(signal.why)}</p></div>
        <div class="news-tags">${tags}</div>
        ${signalTools(signal)}
      </div>
      <aside class="news-card-proof">
        <span>${t('radar.provenance')}</span><strong>${signal.sourceType === 'Source publique' ? t('radar.publicSource') : escapeHtml(signal.sourceType)}</strong>
        ${sourceMarkup(signal)}
        <div class="news-update"><span>${t('radar.updated')}</span><b>${signal.updatedBy === "IA d'Axel" || !signal.updatedBy ? t('radar.updatedBy') : escapeHtml(signal.updatedBy)}</b></div>
        <div><span>${t('radar.confidence')}</span><b class="news-confidence news-confidence-${escapeHtml(signal.confidence)}"><i></i>${t(confidenceLabels[signal.confidence] || 'radar.verify')}</b></div>
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
    feed.innerHTML = list.length ? list.map(signal => signalCard(displayedSignal(signal))).join('') : `<div class="news-empty"><strong>${t('radar.emptyTitle')}</strong><span>${t('radar.emptyDetail')}</span></div>`;
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
        if (status) status.textContent = t('radar.draftSavedLocal');
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
      if (byId('newsFeed')) byId('newsFeed').innerHTML = `<div class="news-empty"><strong>${t('radar.loadError')}</strong><span>${t('radar.otherViews')}</span></div>`;
    }
  }

  byId('newsQuery')?.addEventListener('input', render);
  byId('newsManualRefresh')?.addEventListener('click', async () => {
    const status = byId('newsRefreshStatus');
    const pending = radarCandidates.filter(item => (item.status || 'pending') === 'pending');
    if (!pending.length) {
      if (status) status.textContent = t('radar.noCalls');
      return;
    }
    try {
      localStorage.setItem(REFRESH_REQUEST_KEY, JSON.stringify({
        candidateCount: pending.length,
        requestedAt: new Date().toISOString()
      }));
      await copyRefreshPrompt();
      byId('newsManualRefresh')?.classList.add('is-launching');
      if (status) status.textContent = t('radar.copied');
      window.setTimeout(() => window.location.assign(CHAT_URL), 900);
    } catch (error) {
      console.error(error);
      if (status) status.textContent = t('radar.copyFailed');
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
  document.addEventListener('prime-language-change', () => {
    const openTools = [...document.querySelectorAll('#newsFeed [data-news-tool][aria-expanded="true"]')]
      .map(button => ({signal:button.dataset.newsSignal,tool:button.dataset.newsTool}));
    const forms = [...document.querySelectorAll('#newsFeed [data-qualification-form]')]
      .map(form => ({id:form.dataset.qualificationForm,fields:[...new FormData(form).entries()]}));
    render();
    for (const {signal,tool} of openTools) document.querySelector(`#newsFeed [data-news-tool="${tool}"][data-news-signal="${signal}"]`)?.click();
    for (const {id,fields} of forms) {
      const form = document.querySelector(`#newsFeed [data-qualification-form="${id}"]`);
      for (const [name,value] of fields) if (form?.elements[name]) form.elements[name].value = value;
    }
  });
  void loadAnalysis().then(load);
  void loadRadarOperations();
})();
