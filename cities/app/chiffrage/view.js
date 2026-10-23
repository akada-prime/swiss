import { t, number } from '../core/i18n.js?v=20261022-configurateur-prime-r3';
import { subscribePreferences } from '../core/preferences.js';
import { calculateQuote, calculateLcm, calculateSql, licensedPopulation, suggestedSqlUsers } from './calculate.js?v=20261022-configurateur-prime-r3';
import { energyCodes, isEnergyModule, suggestedVolume, suggestedEmployees, updatePopulation, hostingIncluded, setEnergy } from './configuration.js';
import { referenceProfiles, serviceDays, applyReference, applyHosting, retainRemoved, moduleId, serviceApplies, defaultModule } from './standards.js';
import { calculationError } from './errors.js';

const root = document.getElementById('chiffrageRoot');
const runtime = window.PrimeCommunesRuntime;
const escape = runtime.escapeHtml;
const endpoint = `${window.SUPABASE_URL}/functions/v1/chiffrage`;
const sessionKey = 'prime-chiffrage-session';
const state = { authenticated: false, loaded: false, catalog: null, versions: {},
  activeVersions: {},
  quotes: [], quote: null, draft: null, revision: null, title: '', archived: false,
  showArchived: false, mode: 'list', message: '', error: false, loading: null,
  pendingCommune: null, internal: false, dirty: false,
  editorTab: 'composer', session: sessionStorage.getItem(sessionKey), comparison: [], map: null };
const money = value => value == null ? '—' : `${number(Math.round(value), {
  minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF`;
const field = (key, value, label, { min = 0, step = 1 } = {}) =>
  `<label>${label}<input data-field="${key}" type="number" min="${min}" step="${step}" value="${escape(value ?? '')}"></label>`;
const textField = (key, value, label) =>
  `<label>${label}<input data-field="${key}" value="${escape(value ?? '')}"></label>`;
const localLabel = (fr, de) => document.documentElement.lang === 'de' ? de : fr;
const cantonName = code => ({ JU: 'Jura', VD: 'Vaud', GE: 'Genève', FR: 'Fribourg',
  NE: 'Neuchâtel', VS: 'Valais', BE: 'Berne' })[code] ?? code;
const tariffLabel = catalog => [...new Set((catalog?.items??[]).map(item=>item.catalog_version).filter(Boolean))].slice(0,3).join(' · ') || '—';
const errorMessage = error => {
  if (error.status === 401) return t('chiffrage.sessionExpired');
  if (error.status === 409) return t('chiffrage.revisionConflict');
  const detail = error.code ? error : calculationError(error);
  return detail ? t(`chiffrage.${detail.code}`, { item: detail.item ?? '' }) :
    error.status === 503 ? t('chiffrage.storageUnavailable') : t('chiffrage.error');
};

async function api(action, payload, params = {}) {
  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('action', action);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { method: payload === undefined ? 'GET' : 'POST',
    headers: { ...(state.session ? { Authorization: `Bearer ${state.session}` } : {}),
      ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload), cache: 'no-store' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || t('chiffrage.error'));
    error.status = response.status;
    error.code = result.code;
    error.item = result.item;
    throw error;
  }
  return result;
}

function notice(message, error = false) {
  state.message = message;
  state.error = error;
  const node = root.querySelector('.chiffrage-status');
  if (node) { node.textContent = message; node.classList.toggle('error', error); }
}

function header() {
  return `<div class="chiffrage-header"><div>${state.draft ? `<p class="chiffrage-kicker">${escape(cantonName(state.draft.canton))} · OFS ${state.draft.bfs_id} · ${state.revision ? t('chiffrage.revision', { revision: state.revision }) : t('chiffrage.workspace.2005dfeb6b')}</p><h2>${escape(state.draft.name)}</h2>` : `<h2>${t('chiffrage.workspace.b246604ad2')}</h2>`}</div>
    <div class="chiffrage-actions">${state.draft ? `<button class="chiffrage-button quiet" data-action="list">← ${t('chiffrage.back')}</button><button class="chiffrage-button primary" data-action="save">${t('chiffrage.save')}</button>` : ''}
      <button class="chiffrage-button quiet" data-action="logout">${t('chiffrage.logout')}</button></div></div>
    <p class="chiffrage-status${state.error ? ' error' : ''}" role="status">${escape(state.message)}</p>`;
}

function renderLogin() {
  root.innerHTML = `<div class="chiffrage-panel"><h2>${t('chiffrage.title')}</h2>
    <form id="chiffrageLogin"><label>${t('chiffrage.login')}
    <input name="code" type="password" autocomplete="current-password" required></label>
    <p class="chiffrage-status${state.error ? ' error' : ''}" role="status">${escape(state.message)}</p>
    <button class="chiffrage-button primary" type="submit">${t('chiffrage.enter')}</button></form></div>`;
}

function quoteAddress(id) {
  const url=new URL(location.href);url.searchParams.set('view','chiffrage');
  if(id)url.searchParams.set('quote',id);else url.searchParams.delete('quote');
  return url;
}

function renderList() {
  history.replaceState(history.state,'',quoteAddress(null));
  state.mode = 'list'; state.draft = null; state.quote = null;
  const rows = state.quotes.filter(row => state.showArchived || !row.archived);
  root.innerHTML = header() + `<div class="chiffrage-actions">
    <button class="chiffrage-button primary" data-action="new" ${!state.catalog ? 'disabled' : ''}>${t('chiffrage.new')}</button>
    <label class="chiffrage-choice"><input type="checkbox" data-field="showArchived" ${state.showArchived ? 'checked' : ''}>${t('chiffrage.showArchived')}</label></div>
    ${state.catalog ? '' : `<p class="chiffrage-warning">${t('chiffrage.noCatalog')}</p>`}
    <div class="chiffrage-list">${rows.length ? rows.map(row =>
      `<button data-action="open" data-id="${escape(row.id)}"><strong>${escape(row.title)}</strong>
      <small>${escape(row.commune_name)} · OFS ${row.bfs_id} · ${t('chiffrage.revision', {
        revision: row.current_revision })}</small></button>`).join('') : `<p>${t('chiffrage.empty')}</p>`}</div>`;
}

function communes() { return runtime.rows ?? []; }
function communeOption(row) { return `${row.name} · OFS ${row.id}`; }
function renderNew() {
  state.mode = 'new';
  root.innerHTML = header() + `<div class="chiffrage-panel"><h2>${t('chiffrage.new')}</h2>
    <form id="chiffrageChoose"><label>${t('chiffrage.selectCommune')}
      <input id="chiffrageCommuneSearch" list="chiffrageCommuneOptions" required class="chiffrage-search" autocomplete="off">
      <datalist id="chiffrageCommuneOptions">${communes().map(row =>
        `<option value="${escape(communeOption(row))}"></option>`).join('')}</datalist></label>
      <p class="chiffrage-status${state.error ? ' error' : ''}" role="status">${escape(state.message)}</p>
      <button class="chiffrage-button primary" type="submit">${t('chiffrage.create')}</button></form></div>`;
}

async function firstDraft(row) {
  // A tab may have stayed open while a tariff version was activated.
  const active=await api('catalog');
  state.catalog=active.catalog;state.versions=active.active;state.activeVersions=active.active;
  state.draft = { bfs_id: Number(row.id), name: row.name, canton: row.canton,
    context: { integrator: row.integrator, software: row.software, erp: row.erp,
      hosting: row.hosting, notes: row.notes },
    dimensions: { population: Number(row.expectedPopulation ?? 0),
      licensedPopulation: licensedPopulation(Number(row.expectedPopulation ?? 0)),
      meters: suggestedVolume(row.expectedPopulation), taxes: suggestedVolume(row.expectedPopulation),
      employees: suggestedEmployees(row.expectedPopulation) },
    products: [], modules: [], moduleServices: [], services: [], primeLines: [],
    partners: [], pce: { finances: true, salaires: false, interfacePa: 0 },
    oracle: { full: 0, light: 0 }, sql: {}, lcm: {}, energy: false,
    hosting: { included: false } };
  state.internal = false;
  state.dirty = false;
  state.comparison=[];state.comparisonData=[];
  const profile = referenceProfiles(state.catalog).find(row => row.default) ?? referenceProfiles(state.catalog)[0];
  if (profile) { state.draft.reference = {id:profile.id}; Object.assign(state.draft.pce,profile.pce_defaults ?? {});
    Object.assign(state.draft.oracle,profile.technical_defaults?.oracle ?? {}); }
  changeProduct('innosolv', true, false);
  const erp = String(row.erp ?? '').toLowerCase();
  if (/proconcept|pce/.test(erp)) chooseErp('pce', false);
  else if (/abacus/.test(erp)) chooseErp('abacus', false);
  if (profile) applyReference(state.draft, state.catalog, profile.id,{initializeScope:true});
  state.title = `${row.name} — Variante 1`;
  state.revision = null;
  state.quote = null;
  state.archived = false;
  state.editorTab = 'composer';
  state.mode = 'editor';
  notice('');
  renderEditor();
}

async function openPendingCommune() {
  if (!state.pendingCommune || !state.authenticated || !state.catalog) return;
  const commune = state.pendingCommune;
  state.pendingCommune = null;
  await firstDraft(commune);
}

function availableModules() {
  return (state.catalog?.items ?? []).filter(item =>
    (item.product === (item.vendor === 'innosolv' ? 'Gemeinde' : 'ERP') || isEnergyModule(item)) &&
    (state.draft?.products ?? []).includes(item.vendor) &&
    (item.item_code !== '129' || state.draft.canton !== 'VD') &&
    (item.item_code !== '129VD' || state.draft.canton === 'VD'));
}

// The source Gemeinde sheet uses this business order; suffix modules follow their parent.
const gemeindeOrder = '1,36,21,28,22,23,24,30,31,122,124,116,34,35,13,26,27,38,39,41,33,40,50,54,57,51,52,53,55,56,58,29,208,209,210,25,10,11,100,101,113,104,115,120,125,132,140,135,129,119,127,138,136,143,200,201,214,205,206,202,211,212,207,215,501,509,516,517,504,523,514,502,533,528,534,531,529,530,532'.split(',');
const abacusOrder = '10510.1,10510.208,10510.206,10510.218,10510.219,10510.205,10510.211,10510.214,10510.222,10510.215,10510.21,10510.212,10510.209,10510.22,10510.207,10510.224,10510.221,10510.225,10510.228,10510.229,10510.23,10520.1,10520.222,10520.223,10520.226,10520.227,10520.224,10520.205,10520.228,10520.207,10520.231,10520.209,10520.225,10520.233,10520.235,10530.1,10530.232,10530.205,10530.207,10530.209,10530.22,10530.234,10530.235,10530.237,10530.24,10530.242,10530.244,10530.245,10530.246,10531.1,10531.101,10540.1,10540.206,10540.244,10540.205,10540.199,10540.207,10540.209,10540.21,10540.243,10540.25,10540.254,10540.255,10540.26,10540.261,10540.262,10540.263,10540.264,10540.265,10540.266,10540.267,10540.27,10570.1,10570.206,10570.27,10570.205,10570.208,10570.209,10570.207,10570.272,10570.21,10570.28,10566.1,10566.205,10566.266,10566.269,10566.274,10566.275,10560,10560.205,10560.209,10560.258,10560.206,10560.207,10560.26,10560.263,10560.264,10560.265,10560.259,10560.266,10560.267,10560.268,10560.269,10560.272,10560.274,10560.276,10560.278,10560.279,10560.28,10560.282,10575.1,10575.214,10575.205,10575.209,10575.207,10575.211,10575.216,10575.215,10575.212,10575.213,10575.21,10575.218,10575.219,10575.24,10575.242,10575.244,10555.1,10555.205,10555.25,10555.251,10555.252,10555.255,10555.256,10555.257,10555.261,10555.262,10555.263,10555.265,10555.266,10555.267,10555.268,10555.269,10555.272,10555.273,10555.274,10555.275,10555.276,10515.1,10515.205,10515.21,10515.211,10515.24,10515.241,10515.242,10515.245,10593.1,10593.214,10582.1,10582.216,10583.1,10583.221,10583.216,10587.1,10581.1,10576.1,10577.1,10575.241,10598.1,10595.1,10594.1,10572.1,10572.101,10572.205,10572.207,10572.212,10572.221,10572.222,10572.223,10572.224,10572.226,10572.23,10572.231,10573.1,10550.1,10550.205,10550.254,10550.252,10550.258,10550.256,10550.255,10550.261,10550.262,10503.1,10503.25,10503.245,10503.255,10503.256,10503.257,10503.258,10503.286'.split(',');
function moduleOrder(item) {
  const order = item.vendor === 'innosolv' ? gemeindeOrder : abacusOrder;
  const index = order.indexOf(item.item_code === '129VD' ? '129' : item.item_code);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
function presetDays(id) {
  return serviceDays(state.catalog, id, state.draft?.reference?.id);
}

function dayRate() { return state.draft?.commercial?.dayRate ?? state.catalog?.parameters.day_rate; }
function addModuleService(id) {
  const days = presetDays(id);
  if (!state.draft.moduleServices.some(line => line.item_code === id))
    state.draft.moduleServices.push({ family: 'prestations_module', item_code: id,
      label: id, level: 'standard', days, suggested_days: days });
}

function rateInventory() {
  const p = state.catalog?.parameters;
  const standard = p?.publisher_rent?.innosolv?.standard;
  const abacus = p?.publisher_rent?.abacus?.standard;
  const percentField = (key, value, label) => field(`commercial.${key}`,
    (state.draft.commercial?.[key] ?? value) * 100, label, { step: .01 });
  return `<section class="chiffrage-section chiffrage-rates"><h2>${t('chiffrage.workspace.768d70e513')}</h2>
    <p class="chiffrage-helper">${t('chiffrage.workspace.598f351793')}</p>
    <div class="chiffrage-grid">${field('commercial.dayRate', dayRate(), t('chiffrage.workspace.e46411c982'))}
      ${percentField('innosolvPaRate', standard?.pa_rate, 'innosolv · PA (%)')}
      ${percentField('innosolvPvRate', standard?.pv_rate, 'innosolv · PV (%)')}
      ${percentField('abacusPaRate', abacus?.pa_rate, 'Abacus · PA (%)')}
      ${percentField('abacusPvRate', abacus?.pv_rate, 'Abacus · PV (%)')}
      ${percentField('pcePvMargin', p?.pce?.pv_margin, 'ProConcept · ' + t('chiffrage.workspace.cfb8fc62ab'))}
    </div><p class="chiffrage-helper">${t('chiffrage.workspace.420c9faff1')}</p>
    ${publisherOverridesSection()}</section>`;
}

function productSection() {
  const selected = new Set(state.draft.modules.map(item => `${item.vendor}/${item.product}/${item.item_code}`));
  const modules = availableModules().sort((a, b) => moduleOrder(a) - moduleOrder(b));
  const groups = new Map();
  for (const item of modules) {
    const key = item.vendor;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const domain = item => item.vendor === 'abacus' ?
    (modules.find(row=>row.vendor==='abacus' && row.item_code===`${item.item_code.split('.')[0]}.1`)?.[document.documentElement.lang==='de'?'label_de':'label_fr'] ??
      localLabel('Autres fonctions Abacus','Weitere Abacus-Funktionen')) :
    item.product==='Versorger' ? localLabel('Énergie','Energie') :
      localLabel('Gestion communale','Gemeindeverwaltung');
  const entry = item => {
    const id = `${item.vendor}/${item.product}/${item.item_code}`;
    const current = state.draft.moduleServices.find(line => line.item_code === id);
    const selectedIndex = state.draft.modules.findIndex(row => `${row.vendor}/${row.product}/${row.item_code}` === id);
    const selectedModule = state.draft.modules[selectedIndex];
    const days = current?.days ?? presetDays(id);
    const required = id === 'innosolv/Gemeinde/1' || id === 'abacus/ERP/10503.1' || isEnergyModule(item) && state.draft.energy;
    return `<div class="chiffrage-module-entry"><label><input type="checkbox" data-module="${escape(id)}" ${selected.has(id) ? 'checked' : ''} ${selected.has(id) && required ? 'disabled' : ''}>
      <span class="chiffrage-module-name">${escape(document.documentElement.lang === 'de' ? item.label_de || item.label_fr || item.item_code : item.label_fr || item.label_de || item.item_code)}<small>${required ? t('chiffrage.workspace.3cef74c61d') : item.default_selected ? t('chiffrage.workspace.ef354927f1') : t('chiffrage.workspace.14eb14ece5')}</small></span></label>
      ${selected.has(id) && item.pricing_rule?.kind === 'unverified' ? `<p class="chiffrage-warning">${t('chiffrage.energyPending')}</p><div class="chiffrage-grid">
        ${state.internal ? field(`modules.${selectedIndex}.pa_override`, selectedModule?.pa_override, t('chiffrage.annualPa')) : ''}
        ${field(`modules.${selectedIndex}.pv_override`, selectedModule?.pv_override, t('chiffrage.annual') + ' PV')}
      </div>` : ''}
      ${selected.has(id) ? `<div class="chiffrage-module-service">
        <label><span class="chiffrage-visually-hidden">${t('chiffrage.days')} · ${escape(item.label_fr || item.item_code)}</span><input data-field="moduleService.${escape(id)}.days" type="number" min="0" step="0.5" value="${escape(days ?? '')}" aria-label="${t('chiffrage.days')} · ${escape(item.label_fr || item.item_code)}" placeholder="—"><span aria-hidden="true">j</span></label>
        ${referenceProfiles(state.catalog).find(row=>row.id===state.draft.reference?.id)?.module_group_labels?.[id] ? `<small>${t('chiffrage.groupedServices')}</small>` : ''}
      </div>` : ''}</div>`;
  };
  return `<section class="chiffrage-section chiffrage-catalog"><p class="chiffrage-kicker">${localLabel('Périmètre logiciel','Softwareumfang')}</p><h2>${t('chiffrage.workspace.f492367598')}</h2>
    <p class="chiffrage-helper">${localLabel('Les modules retenus en premier. Ouvre les options pour compléter le périmètre.','Gewählte Module zuerst. Weitere Optionen bei Bedarf öffnen.')}</p>
      <div class="chiffrage-module-groups">${[...groups].map(([group, entries]) => {
        const included = entries.filter(item => selected.has(`${item.vendor}/${item.product}/${item.item_code}`));
        const other = entries.filter(item => !selected.has(`${item.vendor}/${item.product}/${item.item_code}`));
        const brand = { innosolv:'innosolvcity', abacus:'Abacus', pce:'ProConcept' }[group] ?? group;
        const domains=new Map();for(const item of included){const title=domain(item);if(!domains.has(title))domains.set(title,[]);domains.get(title).push(item);}
        return `<div class="chiffrage-module-set"><h3><span>${escape(brand)}</span><small>${included.length} ${t('chiffrage.workspace.f8352fa70a')}</small></h3>
          <div class="chiffrage-module-list">${[...domains].map(([title,items])=>`<div class="chiffrage-domain"><h4>${escape(title)}</h4>${items.map(entry).join('')}</div>`).join('')}</div>
          ${other.length ? `<details class="chiffrage-subdetail"><summary>${t('chiffrage.workspace.af758b49cd')} · ${other.length}</summary><input class="chiffrage-module-search" data-module-search="${escape(group)}" type="search" placeholder="${localLabel('Chercher un module','Modul suchen')}" aria-label="${localLabel('Chercher un module','Modul suchen')}"><div class="chiffrage-module-list">${other.map(entry).join('')}</div></details>` : ''}</div>`;
      }).join('') || '—'}</div></section>`;
}

const serviceTypes = [
  ['reprise', 'Reprise de données', 'Datenübernahme'],
  ['projet', 'Gestion de projet', 'Projektleitung'],
  ['formation', 'Formation', 'Schulung'],
  ['demarrage', 'Assistance au démarrage', 'Begleitung beim Start'],
  ['technique', 'Technique', 'Technik'],
  ['interfaces', 'Interfaces / développements', 'Schnittstellen / Entwicklung'],
  ['reserve', 'Réserve', 'Reserve'],
  ['deplacements', 'Déplacements', 'Reisen']
];
function serviceSection(compact = false) {
  const de = document.documentElement.lang === 'de';
  const gp = state.draft.projectManagement;
  let gpLine;
  try { gpLine = calculateQuote(state.draft, state.catalog).lines.find(row => row.explanation?.kind === 'project_management'); } catch { /* The summary explains missing prices. */ }
  const additional = state.draft.services.filter(entry=>!serviceTypes.some(([id])=>id===entry.item_code) && serviceApplies(entry,state.draft));
  const types = compact ? serviceTypes.filter(([id]) => ['reprise','formation','demarrage','projet'].includes(id)) : [...serviceTypes,...additional.map(row=>[row.item_code,row.label,row.label_de??row.label])];
  return `<section class="chiffrage-section chiffrage-services"><div class="chiffrage-section-heading"><div><p class="chiffrage-kicker">${t('chiffrage.workspace.d71d37c3ac')}</p><h2>${t('chiffrage.workspace.8e29c71b04')}</h2></div>${compact ? `<button class="chiffrage-button quiet" data-editor-tab="prestations">${t('chiffrage.workspace.73d84590a4')} →</button>` : ''}</div>
    <p class="chiffrage-helper">${t('chiffrage.workspace.dbe3e236ca')}</p>
    <div class="chiffrage-service-grid">${types.map(([id, fr, german]) => {
      const current = state.draft.services.find(entry => entry.item_code === id);
      if(id==='deplacements' && state.draft.travel) return `<div class="chiffrage-service-item"><strong>${escape(de?german:fr)}</strong>${field('travel.rate',state.draft.travel.rate,t('chiffrage.travelUnit'))}${field('travel.percent',state.draft.travel.percent,t('chiffrage.travelPercent'),{step:.5})}<label class="chiffrage-choice"><input type="checkbox" data-field="travel.waived" ${state.draft.travel.waived?'checked':''}>${t('chiffrage.travelWaived')}</label><small>${t('chiffrage.travelBasis')}</small></div>`;
      if (id === 'projet' && gp) return `<div class="chiffrage-service-item"><div class="chiffrage-service-title"><strong>${escape(de ? german : fr)}</strong><small data-gp-explanation>${gpExplanation(gpLine)}</small></div>${field('projectManagement.percent', gp.percent, '%', {step:.5})}<output>${money(gpLine?.investment_pv)}</output></div>`;
      const amount = current?.investment_override ?? (current?.days ?? current?.suggested_days) * (current?.unit_day_rate ?? dayRate());
      return `<div class="chiffrage-service-item"><div class="chiffrage-service-title"><strong>${escape(de ? german : fr)}</strong><small>${current?.suggested_days == null ? t('chiffrage.workspace.f65d0dc796') : `${t('chiffrage.workspace.f8130bb03a')} : ${number(current.suggested_days)} ${t('chiffrage.workspace.6abe3deea7')}`}</small></div>${field(`service.${id}.days`, current?.days, t('chiffrage.days'), { step: .5 })}<output data-service-total="${escape(id)}">${money(Number.isFinite(amount) ? amount : null)}</output>${!compact ? `<details class="chiffrage-service-adjust"><summary>${t('chiffrage.override')}</summary>${field(`service.${id}.override`, current?.investment_override, t('chiffrage.investment'), {min:-1000000})}</details>` : ''}</div>`;
    }).join('')}</div>
    ${!gp ? `<p class="chiffrage-warning">${t('chiffrage.workspace.15b2f96e28')}</p>` : ''}
    ${!compact ? `<div class="chiffrage-grid">${field('commercial.dayRate', dayRate(), t('chiffrage.workspace.6f34dc40d6'))}</div>` : ''}</section>`;
}
function gpExplanation(line) {
  if (!line) return t('chiffrage.workspace.e44ddaea99');
  return `${number(line.explanation.basis_days)} ${t('chiffrage.workspace.ff84ce189d')} ${number(line.explanation.percent)} % → ${number(line.selected_days)} ${t('chiffrage.workspace.6abe3deea7')} · ${money(line.investment_pv)}. ${t('chiffrage.workspace.f6eecc2af8')} ${number(line.explanation.round_days)} ${t('chiffrage.workspace.7081c49f7d')}`;
}

function publisherOverridesSection() {
  return `<details class="chiffrage-subdetail"><summary>${t('chiffrage.workspace.9717c8a1e7')}</summary>
    ${state.draft.modules.map((module, index) => `<div class="chiffrage-line">
      <strong>${escape(module.vendor)} · ${escape(module.item_code)}</strong>
      ${field(`modules.${index}.pa_override`, module.pa_override, 'PA ' + t('chiffrage.override'))}
      ${field(`modules.${index}.pv_override`, module.pv_override, 'PV ' + t('chiffrage.override'))}
    </div>`).join('') || '—'}
    ${state.draft.products.includes('pce') ? `<div class="chiffrage-grid">
      ${['financePaOverride','financePvOverride','salaryPaOverride','salaryPvOverride',
        'innosolvPaBaseOverride'].map(key => field(`pce.${key}`, state.draft.pce[key], key)).join('')}
    </div>` : ''}</details>`;
}

function technicalSection() {
  const hasSql = state.draft.products.includes('innosolv');
  const hasOracle = state.draft.products.includes('pce');
  let suggestion = null;
  let sqlPrice = state.draft.sql.override ?? null;
  try { if (hasSql) suggestion = suggestedSqlUsers(state.draft.dimensions.population,
    state.catalog.parameters.sql.suggestion);
    if(hasSql)sqlPrice=calculateSql({population:state.draft.dimensions.population,...state.draft.sql},state.catalog.parameters.sql).amount.effective_value;
  } catch { /* Missing private rule. */ }
  return `<details class="chiffrage-section"><summary>${t('chiffrage.technical')}</summary>
    ${hasSql ? `<p>${t('chiffrage.sqlSuggested', { count: suggestion ?? '—' })}</p>
      ${state.draft.dimensions.population >= state.catalog.parameters.sql.core_from_population &&
        state.catalog.parameters.sql.price_per_core == null ?
        `<p class="chiffrage-warning">${t('chiffrage.sqlCoreUnconfirmed')}</p>` : ''}
      <div class="chiffrage-grid">${field('sql.users', state.draft.sql.users ?? suggestion,
        t('chiffrage.sqlUsers'))}
      ${field('sql.cores', state.draft.sql.cores, t('chiffrage.sqlCores'))}
      ${field('sql.override', sqlPrice, t('chiffrage.sqlInvestmentPv'))}
      ${state.internal ? field('sql.purchasePa', state.draft.sql.purchasePa, t('chiffrage.sqlInvestmentPa')) : ''}
      ${field('sql.annualPv', state.draft.sql.annualPv, t('chiffrage.sqlAnnualPv'))}
      ${state.internal ? field('sql.annualPa', state.draft.sql.annualPa, t('chiffrage.sqlAnnualPa')) : ''}</div>` : ''}
    ${hasOracle ? `<div class="chiffrage-grid">
      ${!state.draft.products.includes('innosolv') ? field('pce.financePvOverride',state.draft.pce.financePvOverride,t('chiffrage.pceFinanceAnnual'))+field('pce.salaryPvOverride',state.draft.pce.salaryPvOverride,t('chiffrage.pceSalaryAnnual')) : ''}
      ${state.catalog.parameters.pce.finance_basis === 'innosolv_plus_options' ? field('pce.interfacePv',state.draft.pce.interfacePv ?? state.catalog.parameters.pce.interface_pv,t('chiffrage.pceInterfacePv')) : ''}
      ${field('oracle.full', state.draft.oracle.full, t('chiffrage.oracleFull'))}
      ${field('oracle.light', state.draft.oracle.light, t('chiffrage.oracleLight'))}
      ${field('oracle.investmentOverride', state.draft.oracle.investmentOverride, t('chiffrage.oracleInvestmentPv'))}
      ${field('oracle.annualOverride', state.draft.oracle.annualOverride, t('chiffrage.oracleAnnualPv'))}
      ${state.internal ? field('oracle.purchasePa', state.draft.oracle.purchasePa, t('chiffrage.oracleInvestmentPa')) : ''}
      ${state.internal ? field('oracle.maintenancePa', state.draft.oracle.maintenancePa, t('chiffrage.oracleAnnualPa')) : ''}
      ${state.internal ? field('pce.interfacePa', state.draft.pce.interfacePa, 'Interface PCE–ISAG (PA)') : ''}</div>` : ''}</details>`;
}

function extraInvestment(line) {
  return (line.investment_override ?? (line.days != null ? line.days*(line.unit_day_rate??dayRate())+(line.investment_fixed_pv??0) : line.investment_pv??0))*(line.quantity??1);
}
function extraSection() {
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.partners')}</summary>
    ${[...state.draft.primeLines.map((line, index) => ({ ...line, kind: 'primeLines', index }))
      .filter(line => line.category !== 'hosting'),
      ...state.draft.partners.map((line, index) => ({ ...line, kind: 'partners', index }))]
      .map(line => `<div class="chiffrage-line">
        ${textField(`${line.kind}.${line.index}.label`, line.label, t('chiffrage.lineLabel'))}
        ${textField(`${line.kind}.${line.index}.item_code`, line.item_code, t('chiffrage.internalCode'))}
        ${line.kind === 'partners' ? textField(`${line.kind}.${line.index}.supplier`, line.supplier, t('chiffrage.supplier')) : ''}
        ${field(`${line.kind}.${line.index}.quantity`, line.quantity ?? 1, t('chiffrage.quantity'))}
        ${line.days != null ? field(`${line.kind}.${line.index}.days`,line.days,t('chiffrage.days'),{step:.5}) : ''}
        ${line.unit_day_rate != null ? field(`${line.kind}.${line.index}.unit_day_rate`,line.unit_day_rate,t('chiffrage.serviceDayRate')) : ''}
        ${field(`${line.kind}.${line.index}.${line.days != null ? 'investment_override' : 'investment_pv'}`, line.days != null ? line.investment_override : line.investment_pv,
          t(line.days != null ? 'chiffrage.investmentOverride' : 'chiffrage.investment'))}
        <small class="chiffrage-helper" data-extra-total="${line.kind}.${line.index}">${t('chiffrage.calculatedInvestment')} ${money(extraInvestment(line))}</small>
        ${state.internal ? field(`${line.kind}.${line.index}.investment_pa`, line.investment_pa, t('chiffrage.investmentPa')) : ''}
        ${field(`${line.kind}.${line.index}.annual_pv`, line.annual_pv,
          t('chiffrage.annual'))}
        ${state.internal ? field(`${line.kind}.${line.index}.annual_pa`, line.annual_pa, t('chiffrage.annualPa')) : ''}
        ${textField(`${line.kind}.${line.index}.note`, line.note, t('chiffrage.note'))}
        <button type="button" class="chiffrage-button" data-action="removeLine" data-kind="${line.kind}" data-index="${line.index}">${t('chiffrage.removeLine')}</button></div>`).join('')}
    <div class="chiffrage-actions"><button type="button" class="chiffrage-button" data-action="addLicense">${t('chiffrage.addPrimeLicense')}</button>
      <button type="button" class="chiffrage-button" data-action="addPrime">${t('chiffrage.addLine')} Prime</button>
      <button type="button" class="chiffrage-button" data-action="addPartner">${t('chiffrage.addLine')} ${t('chiffrage.partner')}</button></div></details>`;
}

function hostingSection(scope = 'composer') {
  const included = hostingIncluded(state.draft);
  const rows = state.draft.primeLines.map((line, index) => ({ ...line, index }))
    .filter(line => line.category === 'hosting');
  const scopeChanged=rows.some(line=>line.reference_products?.some(product=>!state.draft.products.includes(product)));
  const complete = rows.length > 0 && rows.every(line=>line.investment_pv != null && line.annual_pv != null);
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.hosting')}</summary>
    <fieldset class="chiffrage-choice-group"><legend>${t('chiffrage.hostingQuestion')}</legend>
      ${[true,false].map(value => `<label class="chiffrage-choice"><input type="radio" name="chiffrage-hosting-${scope}" data-hosting="${value}" ${included === value ? 'checked' : ''}>${t(value ? 'chiffrage.yes' : 'chiffrage.no')}</label>`).join('')}
    </fieldset><p class="chiffrage-helper">${t(included ? 'chiffrage.hostingIncluded' : 'chiffrage.hostingExcluded')}</p>
    ${included && scopeChanged ? `<p class="chiffrage-warning">${t('chiffrage.hostingScopeChanged')}</p><button class="chiffrage-button" data-action="confirmHosting">${t('chiffrage.confirmHosting')}</button>` : ''}
    ${included ? `<details class="chiffrage-subdetail" ${complete ? '' : 'open'}><summary>${t('chiffrage.hostingAmounts')}</summary>
    <p class="chiffrage-helper">${t(complete ? 'chiffrage.hostingPrefilled' : 'chiffrage.hostingEstimate')}</p>
    <div class="chiffrage-actions"><button type="button" class="chiffrage-button" data-action="addHosting">${
      t('chiffrage.addHosting')}</button></div>
    ${rows.map(line => `<div class="chiffrage-line chiffrage-hosting-line">
      ${textField(`primeLines.${line.index}.label`, line.label, t('chiffrage.lineLabel'))}
      ${field(`primeLines.${line.index}.investment_pv`, line.investment_pv, t('chiffrage.investment') + ' PV')}
      ${state.internal ? field(`primeLines.${line.index}.investment_pa`, line.investment_pa, t('chiffrage.investmentPa')) : ''}
      ${field(`primeLines.${line.index}.annual_pv`, line.annual_pv, t('chiffrage.annual') + ' PV')}
      ${state.internal ? field(`primeLines.${line.index}.annual_pa`, line.annual_pa, t('chiffrage.annualPa')) : ''}
      <button type="button" class="chiffrage-button" data-action="removeLine" data-kind="primeLines" data-index="${line.index}">${t('chiffrage.removeLine')}</button>
    </div>`).join('')}</details>` : ''}</details>`;
}

function lcmPrices() {
  const prices = calculateLcm(state.draft.dimensions.population,
    state.catalog.parameters.lcm, state.draft.lcm);
  return `Gold : <strong>${money(prices.gold?.effective_value)}</strong> · Platinum : <strong>${money(prices.platinium?.effective_value)}</strong>${
    prices.block == null ? ` · ${t('chiffrage.lcmMissing')}` : ` · ≤ ${number(prices.block)} ${t('chiffrage.workspace.a46028df66')}`}`;
}
function lcmSection() {
  const prices = calculateLcm(state.draft.dimensions.population,
    state.catalog.parameters.lcm, state.draft.lcm);
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.lcm')}</summary>
    <p class="chiffrage-lcm-prices">${lcmPrices()}</p>
    <div class="chiffrage-grid"><label>${t('chiffrage.lcmSelection')}<select data-field="lcm.selection">
      ${[['none', t('chiffrage.lcmNone')], ['gold','Gold'], ['platinium','Platinum']].map(([key,label]) =>
        `<option value="${key}" ${(state.draft.lcm.selection ?? 'none') === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label></div><div class="chiffrage-grid chiffrage-lcm-values">${field('lcm.gold', prices.gold?.effective_value,
      'LCM Gold · CHF')}${field('lcm.platinium', prices.platinium?.effective_value,
        'LCM Platinum · CHF')}</div><p class="chiffrage-helper">${localLabel('Valeurs de la référence, modifiables pour cette variante.','Referenzwerte, für diese Variante anpassbar.')}</p></details>`;
}

function territoryMap() {
  if (!state.map) return `<span>${escape(cantonName(state.draft.canton))}</span>`;
  const selected=state.map.municipalities.find(row=>Number(row.id)===state.draft.bfs_id);
  if (!selected) return `<span>${escape(cantonName(state.draft.canton))}</span>`;
  const coords=[...selected.d.matchAll(/(-?\d+),(-?\d+)/g)].map(match=>[Number(match[1]),Number(match[2])]);
  const x=coords.reduce((sum,point)=>sum+point[0],0)/coords.length;
  const y=coords.reduce((sum,point)=>sum+point[1],0)/coords.length;
  const cantons=state.map.cantons.filter(row=>['VD','GE','FR','NE','JU','VS','BE'].includes(row.code));
  return `<svg viewBox="2480000 -1305000 235000 195000" role="img" aria-label="${escape(state.draft.name)} · ${escape(state.draft.canton)}"><g class="chiffrage-map-region">${cantons.map(row=>`<path d="${escape(row.d)}"/>`).join('')}</g><path class="chiffrage-map-selected" d="${escape(selected.d)}"/><circle class="chiffrage-map-point" cx="${x}" cy="${y}" r="2400"/></svg>`;
}
async function loadTerritory() {
  if (state.map) return;
  try {
    const response=await fetch(new URL('data/swiss-map-v1.json',document.baseURI));
    if (!response.ok) return;
    state.map=await response.json();
    root.querySelectorAll('[data-territory]').forEach(node=>node.innerHTML=territoryMap());
  } catch { /* The canton label remains as the geographical fallback. */ }
}

function composerSection() {
  const products = state.draft.products;
  let sqlPrice=null, sqlUsers=null;
  try { if(products.includes('innosolv')){
    const sql=calculateSql({population:state.draft.dimensions.population,...state.draft.sql},state.catalog.parameters.sql);
    sqlPrice=sql.amount.effective_value;sqlUsers=sql.users;
  } } catch { /* The technical section and summary explain missing reference values. */ }
  const erp = products.includes('pce') && products.includes('abacus') ? 'both' : products.includes('pce') ? 'pce' : products.includes('abacus') ? 'abacus' : 'none';
  const choices = (name, values, selected, attr, disabled=false) => `<div class="chiffrage-choice-group">${values.map(([value,label]) => `<label class="chiffrage-choice"><input type="radio" name="chiffrage-${name}" ${attr}="${value}" ${String(selected) === String(value) ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${label}</span></label>`).join('')}</div>`;
  const profiles = referenceProfiles(state.catalog);
  return `<div class="chiffrage-composer"><section class="chiffrage-section chiffrage-commune"><div class="chiffrage-section-heading"><div><p class="chiffrage-kicker">01 · ${t('chiffrage.workspace.7f4dc1fe42')}</p><h2>${escape(state.draft.name)}</h2><p class="chiffrage-helper">${escape(cantonName(state.draft.canton))} · OFS ${state.draft.bfs_id}</p></div><div class="chiffrage-territory" data-territory>${territoryMap()}</div></div>
    <div class="chiffrage-grid chiffrage-volumes">${field('dimensions.population', state.draft.dimensions.population, t('chiffrage.population'))}${field('dimensions.meters', state.draft.dimensions.meters, t('chiffrage.meters'))}${field('dimensions.taxes', state.draft.dimensions.taxes, t('chiffrage.taxes'))}${field('dimensions.licensedPopulation', state.draft.dimensions.licensedPopulation ?? state.draft.dimensions.population, t('chiffrage.licensedPopulation'))}${field('sql.users', state.draft.sql.users ?? sqlUsers,t('chiffrage.sqlUsers'))}${field('dimensions.employees',state.draft.dimensions.employees,t('chiffrage.employees'))}</div>
    ${products.includes('pce') ? `<div class="chiffrage-grid chiffrage-erp-users">${field('oracle.full',state.draft.oracle.full,t('chiffrage.oracleFull'))}${field('oracle.light',state.draft.oracle.light,t('chiffrage.oracleLight'))}</div>` : ''}
    ${products.includes('innosolv') ? `<div class="chiffrage-grid chiffrage-erp-users">${field('sql.override',sqlPrice,t('chiffrage.sqlInvestmentPv'))}</div>` : ''}
    <p class="chiffrage-helper">${localLabel('Collaborateurs estimés ; utilisateurs SQL et ERP à vérifier avec le client.','Mitarbeitende geschätzt; SQL- und ERP-Nutzer mit der Gemeinde prüfen.')}</p>
    <p class="chiffrage-helper" data-volume-suggestion>${t('chiffrage.volumeSuggested', { count: number(suggestedVolume(state.draft.dimensions.population)) })} <button type="button" class="chiffrage-inline" data-action="suggestVolumes">${t('chiffrage.useSuggestion')}</button></p>
    <details class="chiffrage-subdetail"><summary>${t('chiffrage.workspace.d0d6bdb841')}</summary><div class="chiffrage-grid">${textField('title',state.title,t('chiffrage.name'))}</div></details></section>
    <section class="chiffrage-section chiffrage-solutions"><p class="chiffrage-kicker">02 · ${t('chiffrage.workspace.2a16c2c73f')}</p><h2>${t('chiffrage.workspace.45fb3f474a')}</h2>
    <div class="chiffrage-decision"><div><h3>${t('chiffrage.workspace.f8f770b589')}</h3><p class="chiffrage-helper">${t('chiffrage.workspace.b11d6c68f8')}</p></div><label class="chiffrage-choice chiffrage-toggle"><input type="checkbox" data-product="innosolv" ${products.includes('innosolv') ? 'checked' : ''}><span>innosolvcity</span></label></div>
    <div class="chiffrage-decision"><div><h3>ERP</h3><p class="chiffrage-helper">${t('chiffrage.workspace.0c12310977')}</p></div>${choices('erp',[['pce','ProConcept'],['abacus','Abacus'],['both',t('chiffrage.workspace.90db01b4a5')],['none',t('chiffrage.workspace.b2ed82f1bf')]],erp,'data-erp')}</div>
    <div class="chiffrage-decision"><div><h3>${t('chiffrage.energyQuestion')}</h3><p class="chiffrage-helper">${t('chiffrage.energyLicenses')}</p></div>${choices('energy',[[true,t('chiffrage.yes')],[false,t('chiffrage.no')]],state.draft.energy ?? state.draft.modules.some(isEnergyModule),'data-energy',!products.includes('innosolv'))}</div>
    <button class="chiffrage-button quiet" data-editor-tab="modules">${t('chiffrage.workspace.97360022c6')} · ${state.draft.modules.length} →</button></section>
    <div class="chiffrage-contracts">${hostingSection()}${lcmSection()}</div>
    <section class="chiffrage-section chiffrage-reference"><div><h3>${t('chiffrage.workspace.f108b8e09c')}</h3><p class="chiffrage-helper">${state.draft.reference ? escape(state.draft.reference.label) : t('chiffrage.workspace.521d2d1b07')}</p></div>${profiles.length ? `<label>${t('chiffrage.workspace.ce3d081be7')}<select data-reference><option value="">${t('chiffrage.workspace.85e0b7d0df')}</option>${profiles.map(profile => `<option value="${escape(profile.id)}">${escape(profile.label)}</option>`).join('')}</select></label>` : `<p class="chiffrage-warning">${t('chiffrage.workspace.8513a89a5d')}</p>`}</section>
    ${serviceSection(true)}</div>`;
}

function summary() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch (error) { return `<aside class="chiffrage-summary"><p class="chiffrage-kicker">${t('chiffrage.workspace.947be926eb')}</p><h2>${t('chiffrage.workspace.9b7132a4e5')}</h2><p class="chiffrage-warning">${escape(errorMessage(error))}</p><p class="chiffrage-helper">LCM · ${lcmPrices()}</p><button class="chiffrage-button" data-editor-tab="composer">${t('chiffrage.hosting')} / LCM →</button><button class="chiffrage-button" data-editor-tab="modules">${t('chiffrage.workspace.f492367598')} →</button><button class="chiffrage-button" data-editor-tab="prestations">${t('chiffrage.workspace.0438aab9f9')} →</button></aside><div class="chiffrage-mobile-total"><button data-editor-tab="analysis">${t('chiffrage.workspace.57d80505fd')} →</button></div>`; }
  const s = result.summary;
  const buckets = financialBuckets(result);
  const incomplete=result.status==='incomplete';
  return `<aside class="chiffrage-summary"><div class="chiffrage-summary-heading"><p class="chiffrage-kicker">${t('chiffrage.workspace.947be926eb')}</p><span class="chiffrage-live">${t('chiffrage.workspace.3994ec3759')}</span></div>
    <p class="chiffrage-summary-context">${escape(state.draft.name)} · ${number(state.draft.dimensions.population)} ${t('chiffrage.workspace.a46028df66')}</p>
    <dl class="chiffrage-totals"><div><dt>${incomplete ? localLabel('Investissement calculé à ce stade','Bisher berechnete Investition') : t('chiffrage.investment')} <small>CHF HT</small></dt><dd>${money(s.investment).replace(' CHF','')}</dd></div><div><dt>${t('chiffrage.annual')} <small>CHF HT · ${t('chiffrage.workspace.fe85c43980')}</small></dt><dd>${money(s.annual).replace(' CHF','')}</dd></div></dl>
    ${incomplete ? `<p class="chiffrage-warning">${s.missing_service_days?.length ? t('chiffrage.serviceDaysRequired',{count:s.missing_service_days.length}) : ''} ${s.missing_technical?.length ? localLabel('Prix SQL à préciser : investissement non final.','SQL-Preis ergänzen: Investition noch nicht endgültig.') : ''} ${s.missing_hosting?localLabel('Montants d’hébergement à préciser.','Hostingbeträge ergänzen.'):''}</p><button class="chiffrage-button" data-editor-tab="${s.missing_hosting?'composer':s.missing_technical?.length?'prestations':'modules'}">${localLabel('Compléter le chiffrage','Kalkulation ergänzen')} →</button>` : ''}
    <div class="chiffrage-cost-lines">${buckets.map(([label, filter])=>`<div><span>${escape(label)}</span><span>${money(result.lines.filter(filter).reduce((a,line)=>a+(line.investment_pv??0),0))}<small>${money(result.lines.filter(filter).reduce((a,line)=>a+(line.annual_pv??0),0))} / ${t('chiffrage.workspace.de73eac0c3')}</small></span></div>`).join('')}</div>
    <div class="chiffrage-five-year"><span>${incomplete?localLabel('5 ans · calculé à ce stade','5 Jahre · bisher berechnet'):t('chiffrage.workspace.b1aaf814f0')}</span><strong>${money(s.tco5y)}</strong></div>
    <p class="chiffrage-helper">${t('chiffrage.workspace.a855306547')}</p>
    <button class="chiffrage-button" data-editor-tab="analysis">${t('chiffrage.workspace.a602bde342')} →</button>
    <div class="chiffrage-summary-foot">${state.draft.modules.length} ${t('chiffrage.workspace.6726a0b5f9')} · ${localLabel('Base de prestations','Leistungsgrundlage')} : ${escape(state.draft.reference?.label ?? '—')}</div></aside>
    <div class="chiffrage-mobile-total"><button data-editor-tab="offer"><span>${incomplete?localLabel('Investissement en cours','Investition im Aufbau'):t('chiffrage.investment')}<strong>${money(s.investment)}</strong></span><span>${t('chiffrage.annual')}<strong>${money(s.annual)}</strong></span><b>↗</b></button></div>`;
}
function financialBuckets(result) {
  return [[t('chiffrage.licenses'),line=>line.software || line.family === 'prime' && line.category !== 'hosting'],[t('chiffrage.workspace.53df292761'),line=>['prestations','prestations_module'].includes(line.family)],[t('chiffrage.database'),line=>line.family==='technique'],[t('chiffrage.hosting'),line=>line.category==='hosting'],[t('chiffrage.partners'),line=>line.family==='partenaires' && line.category!=='hosting'],['LCM',line=>line.family==='lcm']].filter(([,filter])=>result.lines.some(filter));
}

function offerSection() {
  let result;
  try { result=calculateQuote(state.draft,state.catalog); }
  catch(error) { return `<section class="chiffrage-section"><p class="chiffrage-warning">${escape(errorMessage(error))}</p></section>`; }
  const s=result.summary, incomplete=result.status==='incomplete';
  const buckets=financialBuckets(result);
  const selected=result.lines.filter(line=>line.software && (line.annual_pv??0)>0);
  return `<article class="chiffrage-offer"><header class="chiffrage-offer-hero">
    <div class="chiffrage-offer-brand"><span>Prime<span class="chiffrage-prime-dot">.</span></span><small>${localLabel('COMMUNES / PROPOSITION','GEMEINDEN / ANGEBOT')}</small></div>
    <div class="chiffrage-offer-map" data-territory>${territoryMap()}</div><p class="chiffrage-offer-place">${escape(state.draft.name)} <span>${escape(cantonName(state.draft.canton))} · ${number(state.draft.dimensions.population)} ${t('chiffrage.workspace.a46028df66')}</span></p>
    <h2>${localLabel('Votre projet, en chiffres.','Ihr Projekt in Zahlen.')}</h2>
    <p class="chiffrage-offer-reference">${localLabel('Base de prestations','Leistungsgrundlage')} : <strong>${escape(state.draft.reference?.label??'—')}</strong> · ${localLabel('Tarifs','Tarife')} : ${escape(tariffLabel(state.catalog))}${state.dirty?` · ${localLabel('Modifications en cours','Änderungen in Bearbeitung')}`:''}</p>
    <div class="chiffrage-offer-figures"><div><span>${incomplete?localLabel('Investissement calculé à ce stade','Bisher berechnete Investition'):localLabel('Investissement initial','Anfangsinvestition')}</span><strong>${money(s.investment)}</strong><small>HT · ${localLabel('une fois','einmalig')}</small></div><div><span>${localLabel('Coût annuel récurrent','Wiederkehrende Jahreskosten')}</span><strong>${money(s.annual)}</strong><small>HT · ${localLabel('dès la 2e année','ab dem 2. Jahr')}</small></div></div>
    <div class="chiffrage-offer-horizon"><span>${localLabel('Coût total sur 5 ans','Gesamtkosten über 5 Jahre')}</span><strong>${money(s.tco5y)}</strong></div>
    ${incomplete?`<p class="chiffrage-offer-caveat">${localLabel('Chiffrage à compléter :','Kalkulation ergänzen:')} ${s.missing_service_days?.length??0} ${localLabel('prestations sans jours','Leistungen ohne Tage')}${s.missing_technical?.length?` · SQL ${localLabel('sans prix confirmé','ohne bestätigten Preis')}`:''}${s.missing_hosting?` · ${t('chiffrage.hosting')} ${localLabel('sans prix','ohne Preis')}`:''}.</p>`:''}
    </header><div class="chiffrage-offer-body"><section><p class="chiffrage-kicker">${localLabel('Votre périmètre','Ihr Umfang')}</p><h3>${localLabel('Les solutions retenues','Gewählte Lösungen')}</h3><p>${state.draft.products.map(p=>({innosolv:'innosolvcity',pce:'ProConcept',abacus:'Abacus'}[p]??p)).join(' · ')||'—'} · ${state.draft.modules.length} ${t('chiffrage.workspace.6726a0b5f9')}</p><p>LCM ${escape(({none:t('chiffrage.lcmNone'),gold:'Gold',platinium:'Platinum'})[state.draft.lcm.selection??'none']??state.draft.lcm.selection)} · ${t('chiffrage.hosting')} : ${t(hostingIncluded(state.draft)?'chiffrage.yes':'chiffrage.no')}</p><div class="chiffrage-offer-modules">${selected.slice(0,14).map(line=>`<span>${escape(lineLabel(line))}</span>`).join('')}</div></section>
    <section><p class="chiffrage-kicker">${localLabel('Lecture du prix','Preisaufteilung')}</p><h3>${localLabel('D’où viennent ces montants','Zusammensetzung der Beträge')}</h3><div class="chiffrage-offer-breakdown">${buckets.map(([label,filter])=>`<div><span>${escape(label)}</span><strong>${money(result.lines.filter(filter).reduce((sum,line)=>sum+(line.investment_pv??0),0))}</strong><strong>${money(result.lines.filter(filter).reduce((sum,line)=>sum+(line.annual_pv??0),0))}</strong></div>`).join('')}<div class="chiffrage-offer-breakdown-total"><span>${t('chiffrage.total')}</span><strong>${money(s.investment)}</strong><strong>${money(s.annual)}</strong></div></div><p class="chiffrage-helper">${localLabel('Investissement initial · annuel dès la 2e année. Le total 5 ans comprend quatre annuités.','Anfangsinvestition · jährlich ab dem 2. Jahr. Fünf Jahre umfassen vier Jahresraten.')}</p></section></div></article>`;
}

function comparisonSection() {
  const candidates=state.quotes.filter(row=>row.bfs_id===state.draft.bfs_id && !row.archived);
  const chosen=state.comparisonData??[];
  const ids=new Set(state.comparison);
  return `<section class="chiffrage-section chiffrage-compare"><p class="chiffrage-kicker">${localLabel('Décider ensemble','Gemeinsam entscheiden')}</p><h2>${localLabel('Comparer les variantes','Varianten vergleichen')}</h2><p class="chiffrage-helper">${localLabel('Choisis deux ou trois variantes enregistrées de cette commune.','Zwei oder drei gespeicherte Varianten dieser Gemeinde wählen.')}</p>
    <div class="chiffrage-compare-pick">${candidates.map(row=>`<label class="chiffrage-choice"><input type="checkbox" data-compare="${escape(row.id)}" ${ids.has(row.id)?'checked':''} ${!ids.has(row.id)&&ids.size>=3?'disabled':''}>${escape(row.title)}</label>`).join('')||localLabel('Enregistre une première variante pour comparer.','Eine Variante speichern, um zu vergleichen.')}</div>
    ${chosen.length?`<div class="chiffrage-compare-scroll"><div class="chiffrage-compare-grid" style="--compare-count:${chosen.length}"><div class="chiffrage-compare-label">${localLabel('Variante','Variante')}</div>${chosen.map(row=>`<h3>${escape(row.title)}</h3>`).join('')}
    ${[[localLabel('Investissement initial','Anfangsinvestition'),'investment'],[localLabel('Annuel dès N+1','Jährlich ab N+1'),'annual'],[localLabel('Coût total sur 5 ans','Gesamtkosten über 5 Jahre'),'tco5y']].map(([label,key])=>`<div class="chiffrage-compare-label">${label}</div>${chosen.map((row,index)=>{const amount=row.result?.summary[key],base=chosen[0].result?.summary[key];return `<strong>${money(amount)}${index && amount!=null && base!=null?`<small class="chiffrage-compare-delta">${amount-base>0?'+':''}${money(amount-base)}</small>`:''}</strong>`;}).join('')}`).join('')}
    <div class="chiffrage-compare-label">${localLabel('Périmètre','Umfang')}</div>${chosen.map(row=>`<div>${row.differences.map(label=>`<span class="chiffrage-compare-difference">${escape(label)}</span>`).join('')||'—'}</div>`).join('')}
    <div class="chiffrage-compare-label">${localLabel('Base / tarifs','Grundlage / Tarife')}</div>${chosen.map(row=>`<div class="chiffrage-compare-meta">${escape(row.reference)}<br>${escape(row.tariff)}${row.result?.status==='incomplete'||!row.result?`<br><strong>${localLabel('À compléter','Unvollständig')}</strong>`:''}</div>`).join('')}</div></div>
    ${new Set(chosen.map(row=>row.versions)).size>1?`<p class="chiffrage-warning">${localLabel('Versions tarifaires différentes : les écarts de prix ne proviennent pas uniquement du périmètre.','Unterschiedliche Tarifversionen: Preisunterschiede liegen nicht nur am Umfang.')}</p>`:''}`:''}</section>`;
}

function analysis() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch (error) { return `<p class="chiffrage-warning">${escape(errorMessage(error))}</p>`; }
  const s = result.summary;
  const incomplete=result.status==='incomplete';
  const total = (filter, key) => result.lines.filter(filter)
    .reduce((sum, line) => sum + (line[key] ?? 0), 0);
  const buckets = [
    [t('chiffrage.implementation'), line => ['prestations_module','prestations'].includes(line.family)],
    [t('chiffrage.database'), line => line.family === 'technique'],
    [t('chiffrage.licenses'), line => ['innosolv','abacus','pce'].includes(line.family) ||
      line.family === 'prime' && line.category !== 'hosting'],
    [t('chiffrage.hostingPartners'), line => line.family === 'partenaires' ||
      line.category === 'hosting'],
    ['LCM', line => line.family === 'lcm']
  ].filter(([, filter]) => result.lines.some(filter));
  return `${incomplete ? `<p class="chiffrage-warning">${t('chiffrage.serviceDaysRequired',{count:s.missing_service_days.length})}</p>` : ''}<section class="chiffrage-section"><h2>${t('chiffrage.workspace.98883312a6')}</h2>
    <div class="chiffrage-summary-breakdown">
      <div class="chiffrage-table-scroll"><table class="chiffrage-detail"><thead><tr>
        <th>${t('chiffrage.detail')}</th><th>${t('chiffrage.investment')}</th>
        <th>${t('chiffrage.annual')}</th></tr></thead><tbody>
        ${buckets.map(([label, filter]) => `<tr><th>${escape(label)}</th>
          <td>${money(total(filter,'investment_pv'))}</td><td>${money(total(filter,'annual_pv'))}</td></tr>`).join('')}
        <tr><th>${t('chiffrage.total')}</th><td>${money(s.investment)}</td><td>${money(s.annual)}</td></tr>
        </tbody></table></div>
    </div></section>${state.internal ? `<section class="chiffrage-section"><h2>${t('chiffrage.workspace.df7d91fa23')}</h2>
    <p>${t('chiffrage.tco')} : <strong>${money(s.tco5y)}</strong></p>
    <p>${t('chiffrage.margin')} · ${t('chiffrage.workspace.735185619f')} : <strong>${money(s.software_margin_5y)}</strong></p>
    <p class="chiffrage-margin-note">${t('chiffrage.year2')} : ${money(s.software_margin_year2)} · ${t('chiffrage.year3')} : ${money(s.software_margin_year3plus)}</p>
    <p class="chiffrage-margin-note">LCM Gold : ${money(s.lcm.gold?.effective_value)} · Platinum : ${money(s.lcm.platinium?.effective_value)}</p>
    ${['gold','platinium'].map(key => s.lcm[key]?.source ? `<small>${key}: ${
      t('chiffrage.lcmEstimate')} · ${escape(s.lcm[key].source.method)} · ${
      s.lcm[key].source.sample_size ?? 0} ${t('chiffrage.contracts')}</small>` : '').join('')}
    ${s.lcm.missing_reference ? `<p class="chiffrage-warning">${t('chiffrage.lcmMissing')}</p>` : ''}
    ${s.incomplete_costs.length ? `<p class="chiffrage-warning">${t('chiffrage.incomplete')}: ${escape(s.incomplete_costs.join(', '))}</p>` : ''}</section>` : ''}`;
}

function lineLabel(line) {
  const key=line.family==='prestations_module' ? line.item_code : `${line.family}/${line.product}/${line.item_code}`;
  const item=state.catalog.items.find(item=>moduleId(item)===key);
  const label=document.documentElement.lang === 'de' ? item?.label_de || item?.label_fr : item?.label_fr || item?.label_de;
  if(label && (line.family==='prestations_module' || line.family==='abacus' || line.family==='innosolv'))
    return `${line.product==='Versorger' || line.item_code.includes('/Versorger/') ? localLabel('Énergie · ','Energie · ') : ''}${label}`;
  if(document.documentElement.lang !== 'de') return line.label;
  if(item?.label_de)return item.label_de;
  if(line.family==='prestations')return serviceTypes.find(([id])=>id===line.item_code)?.[2] ?? line.label;
  if(line.family==='pce')return t(line.item_code==='finances'?'chiffrage.finances':'chiffrage.payroll');
  return line.label;
}

function lineDetail() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch { return ''; }
  const ordered = [...result.lines].sort((a, b) => {
    const rank = line => {
      const position = result.lines.indexOf(line);
      if (line.family === 'prestations_module') {
        const parent = result.lines.find(item =>
          `${item.family}/${item.product}/${item.item_code}` === line.item_code);
        return parent ? rank(parent) + .1 : 2000 + position;
      }
      if (line.family === 'innosolv') return moduleOrder({ vendor: 'innosolv',
        item_code: line.item_code });
      if (line.family === 'abacus') return 1000 + moduleOrder({ vendor: 'abacus',
        item_code: line.item_code });
      return 2000 + position;
    };
    return rank(a) - rank(b);
  });
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.detail')}</summary>
    <div class="chiffrage-table-scroll"><table class="chiffrage-detail"><thead><tr>
      <th>${t('chiffrage.modules')}</th>${state.internal ? '<th>SW-ID / ID</th>' : ''}<th>${t('chiffrage.quantity')}</th><th>${t('chiffrage.investment')}</th>
      <th>${t('chiffrage.annual')} PV</th>${state.internal ? `<th>${t('chiffrage.annual')} PA</th><th>${t('chiffrage.annualMargin')}</th><th>${t('chiffrage.catalog', { version: '' })}</th>` : ''}
    </tr></thead><tbody>${ordered.map(line => `<tr>
      <td>${line.family === 'prestations_module' ? '↳ ' + t('chiffrage.moduleServices') + ' · ' : ''}${escape(lineLabel(line))}${line.supplier ? `<small> · ${escape(line.supplier)}</small>` : ''}</td>${state.internal ? `<td>${escape(line.item_code ?? '—')}</td>` : ''}<td>${line.selected_days == null ? line.quantity ?? '—' : `${number(line.selected_days)} j`}</td>
      <td>${money(line.investment_pv)}</td><td>${money(line.annual_pv)}</td>
      ${state.internal ? `<td>${money(line.annual_pa)}</td><td>${money(line.annual_pa == null ? null : (line.annual_pv ?? 0) - line.annual_pa)}</td>` : ''}
      ${state.internal ? `<td>${escape(line.explanation?.source ?? '—')}${line.explanation?.kind ? ` · ${escape(line.explanation.kind)}` : ''}
        ${!state.internal || line.license_value == null ? '' : ` · ${t('chiffrage.theoreticalBase')} ${money(line.license_value)}`}
        ${!state.internal || line.overrides?.pa == null ? '' : ` · ${t('chiffrage.manualPa')}`}
        ${line.overrides?.pv == null ? '' : ` · ${t('chiffrage.manualPv')}`}
        ${line.overrides?.investment == null ? '' : ` · ${t('chiffrage.theoreticalPv')} ${money(line.calculated_investment)}`}</td>` : ''}</tr>`).join('')}</tbody></table></div></details>`;
}

function renderEditor() {
  const scroll = window.scrollY;
  const openDetails = [...root.querySelectorAll('details[open]')].map(node=>node.querySelector('summary')?.textContent);
  state.mode = 'editor';
  if (state.editorTab === 'rates' && !state.internal) state.editorTab = 'composer';
  const tabs = [['composer',t('chiffrage.workspace.a9de3a2603')],['modules',t('chiffrage.workspace.613aec30d2')],['prestations',t('chiffrage.workspace.0370136a74')],['offer',localLabel('Offre','Angebot')],['compare',localLabel('Comparer','Vergleichen')],['analysis',t('chiffrage.workspace.ab761b3579')],...(state.internal ? [['rates',t('chiffrage.workspace.ef73fa64a4')]] : [])];
  const legacy=state.quote && (Object.entries(state.activeVersions).some(([key,id])=>state.versions[key]!==id) || !state.draft.reference);
  root.innerHTML = `${state.internal ? `<div class="chiffrage-internal-banner"><strong>${t('chiffrage.workspace.fdbe31da16')}</strong><button class="chiffrage-button" data-action="clientMode">${t('chiffrage.workspace.689c8df402')}</button></div>` : ''}${header()}${legacy ? `<div class="chiffrage-standard-notice"><div><strong>${localLabel('Ancien standard','Älterer Standard')}</strong><p>${localLabel('Ce chiffrage conserve ses tarifs d’origine. Crée une variante avec les références actuelles et tes valeurs saisies.','Diese Kalkulation behält ihre bisherigen Tarife. Erstelle eine Variante mit aktuellen Referenzen und deinen Eingaben.')}</p></div><button class="chiffrage-button" data-action="upgrade">${localLabel('Créer la variante actuelle','Aktuelle Variante erstellen')} →</button></div>` : ''}<div class="chiffrage-reference-ribbon"><span>${localLabel('Base de prestations','Leistungsgrundlage')} <strong>${escape(state.draft.reference?.label??'—')}</strong></span><span>${localLabel('Tarifs versionnés','Versionierte Tarife')} · ${escape(tariffLabel(state.catalog))}</span>${state.dirty?`<em>${localLabel('Ajustements en cours','Änderungen in Bearbeitung')}</em>`:''}</div><div class="chiffrage-layout${state.editorTab==='offer'||state.editorTab==='compare'?' chiffrage-layout-wide':''}"><div class="chiffrage-workspace"><nav class="chiffrage-work-tabs" aria-label="${t('chiffrage.workspace.dd4e272518')}">${tabs.map(([key,label],i)=>`<button type="button" data-editor-tab="${key}" aria-current="${state.editorTab===key?'page':'false'}"><small>0${i+1}</small>${label}</button>`).join('')}</nav>
    <div class="chiffrage-fields"><div class="chiffrage-tab-panel" data-tab-panel="composer" ${state.editorTab==='composer'?'':'hidden'}>${composerSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="modules" ${state.editorTab==='modules'?'':'hidden'}>${productSection()}${state.draft.products.includes('pce') ? `<section class="chiffrage-section"><h2>ProConcept ERP</h2><div class="chiffrage-choice-group"><label class="chiffrage-choice"><input type="checkbox" data-field="pce.finances" ${state.draft.pce.finances?'checked':''}>${t('chiffrage.finances')}</label><label class="chiffrage-choice"><input type="checkbox" data-field="pce.salaires" ${state.draft.pce.salaires?'checked':''}>${t('chiffrage.payroll')}</label></div></section>`:''}${extraSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="prestations" ${state.editorTab==='prestations'?'':'hidden'}>${serviceSection()}${technicalSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="offer" ${state.editorTab==='offer'?'':'hidden'}><div id="chiffrageOffer">${offerSection()}</div></div>
    <div class="chiffrage-tab-panel" data-tab-panel="compare" ${state.editorTab==='compare'?'':'hidden'}>${comparisonSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="analysis" ${state.editorTab==='analysis'?'':'hidden'}><div id="chiffrageAnalysis">${analysis()}</div><div id="chiffrageDetail">${lineDetail()}</div></div>
    ${state.internal ? `<div class="chiffrage-tab-panel" data-tab-panel="rates" ${state.editorTab==='rates'?'':'hidden'}>${rateInventory()}${technicalSection()}${extraSection()}${hostingSection('internal')}${state.quote ? `<div class="chiffrage-section"><button class="chiffrage-button" data-action="exportInternal">${t('chiffrage.exportInternal')}</button></div>` : ''}</div>`:''}
    <footer class="chiffrage-editor-footer"><div class="chiffrage-actions"><button class="chiffrage-button primary" data-action="save">${t('chiffrage.save')}</button>${state.quote ? `<button class="chiffrage-button" data-action="export">${t('chiffrage.export')}</button><button class="chiffrage-button" data-action="duplicate">${t('chiffrage.duplicate')}</button><button class="chiffrage-button" data-action="copyLink">${t('chiffrage.resumeDesktop')}</button><details class="chiffrage-more"><summary>${t('chiffrage.workspace.93674815f7')}</summary><div class="chiffrage-actions"><button class="chiffrage-button" data-action="revisions">${t('chiffrage.revisions')}</button><button class="chiffrage-button" data-action="archive">${t('chiffrage.archive')}</button><button class="chiffrage-button chiffrage-danger" data-action="delete">${t('chiffrage.workspace.66e03d8bb9')}</button></div></details>`:''}</div><button class="chiffrage-inline" data-action="${state.internal?'clientMode':'internalMode'}">${state.internal?t('chiffrage.workspace.444c26c24e'):t('chiffrage.workspace.04c546339b')}</button></footer><div id="chiffrageHistory"></div></div></div><div id="chiffrageSummary">${summary()}</div></div>`;
  for (const node of root.querySelectorAll('details')) if (openDetails.includes(node.querySelector('summary')?.textContent)) node.open=true;
  if (scroll) window.scrollTo({top:scroll,behavior:'instant'});
  if (!state.map) void loadTerritory();
}
function refreshFinancials() {
  const summaryNode=root.querySelector('#chiffrageSummary');
  if (summaryNode) summaryNode.innerHTML=summary();
  const analysisNode=root.querySelector('#chiffrageAnalysis');
  if (analysisNode) analysisNode.innerHTML=analysis();
  const detail=root.querySelector('#chiffrageDetail');
  if (detail) detail.innerHTML=lineDetail();
  const offer=root.querySelector('#chiffrageOffer');
  if (offer) offer.innerHTML=offerSection();
  let gpLine; try {gpLine=calculateQuote(state.draft,state.catalog).lines.find(row=>row.explanation?.kind==='project_management');} catch {}
  root.querySelectorAll('[data-extra-total]').forEach(node=>{const [kind,index]=node.dataset.extraTotal.split('.');node.textContent=t('chiffrage.calculatedInvestment')+' '+money(extraInvestment(state.draft[kind][index]));});
  root.querySelectorAll('[data-gp-explanation]').forEach(node=>node.textContent=gpExplanation(gpLine));
  root.querySelectorAll('[data-service-total]').forEach(node=>{
    const row=state.draft.services.find(line=>line.item_code===node.dataset.serviceTotal);
    const days=row?.days ?? row?.suggested_days;
    node.textContent=money(row?.investment_override ?? (days == null ? null : days*(row.unit_day_rate??dayRate())));
  });
}

function setValue(path, raw, isCheckbox = false) {
  if (path === 'title') { state.title = raw; state.dirty=true; return; }
  if (path === 'showArchived') { state.showArchived = isCheckbox && raw; renderList(); return; }
  state.dirty = true;
  const parts = path.split('.');
  if (parts[0] === 'service' || parts[0] === 'moduleService') {
    const module = parts[0] === 'moduleService';
    const list = module ? state.draft.moduleServices : state.draft.services;
    const key = parts.slice(1, -1).join('.');
    let row = list.find(item => item.item_code === key);
    if (!row) { row = { family: module ? 'prestations_module' : 'prestations',
      item_code: key, label: module ? key : serviceTypes.find(x => x[0] === key)?.[1] ?? key,
      level: 'standard' }; list.push(row); }
    const prop = parts.at(-1) === 'override' ? 'investment_override' : parts.at(-1);
    row[prop] = prop === 'level' ? raw : raw === '' ? null : Number(raw);
    return;
  }
  if (parts[0] === 'primeLines' || parts[0] === 'partners') {
    const row = state.draft[parts[0]][Number(parts[1])];
    row[parts[2]] = ['label', 'item_code', 'supplier', 'note'].includes(parts[2]) ? raw :
      raw === '' ? null : Number(raw);
    return;
  }
  if (parts[0] === 'modules') {
    state.draft.modules[Number(parts[1])][parts[2]] = raw === '' ? null : Number(raw);
    return;
  }
  if (parts[0] === 'commercial') {
    state.draft.commercial ??= {};
    state.draft.commercial[parts[1]] = raw === '' ? null :
      Number(raw) / (parts[1] === 'dayRate' ? 1 : 100);
    return;
  }
  if (parts.length === 2) {
    state.draft[parts[0]] ??= {};
    if (path === 'dimensions.population') {
      updatePopulation(state.draft.dimensions, raw === '' ? 0 : Number(raw), licensedPopulation);
      for (const key of ['licensedPopulation', 'meters', 'taxes', 'employees']) {
        const input = root.querySelector(`[data-field="dimensions.${key}"]`);
        if (input) input.value = state.draft.dimensions[key] ?? '';
      }
      const suggestion = root.querySelector('[data-volume-suggestion]');
      if (suggestion) suggestion.firstChild.textContent = t('chiffrage.volumeSuggested', {
        count: number(suggestedVolume(state.draft.dimensions.population)) });
      if (state.draft.sql.users == null) for (const input of root.querySelectorAll('[data-field="sql.users"]'))
        input.value=suggestedSqlUsers(state.draft.dimensions.population,state.catalog.parameters.sql.suggestion);
      const lcm=calculateLcm(state.draft.dimensions.population,state.catalog.parameters.lcm,state.draft.lcm);
      for (const key of ['gold','platinium']) if(state.draft.lcm[key]==null)
        for(const input of root.querySelectorAll(`[data-field="lcm.${key}"]`))input.value=lcm[key]?.effective_value??'';
      return;
    }
    state.draft[parts[0]][parts[1]] = path === 'lcm.selection' ? raw :
      isCheckbox ? Boolean(raw) : raw === '' ? null : Number(raw);
  }
}

function changeProduct(key, checked, render = true) {
  if(render)state.dirty=true;
  const previousModules=structuredClone(state.draft.modules), previousServices=structuredClone(state.draft.moduleServices);
  if (key === 'innosolv' && !checked) state.draft.energy = false;
  state.draft.products = checked ? [...state.draft.products, key] :
    state.draft.products.filter(value => value !== key);
  state.draft.modules = state.draft.modules.filter(item => state.draft.products.includes(item.vendor));
  if (checked) for (const item of state.catalog.items.filter(item =>
    item.vendor === key && defaultModule(item,state.catalog,state.draft.reference?.id) &&
    item.product === (key === 'innosolv' ? 'Gemeinde' : 'ERP') &&
    (item.item_code !== '129' || state.draft.canton !== 'VD') &&
    (item.item_code !== '129VD' || state.draft.canton === 'VD'))) {
    state.draft.modules.push({ vendor: item.vendor, product: item.product,
      item_code: item.item_code });
    addModuleService(`${item.vendor}/${item.product}/${item.item_code}`);
  }
  if (checked && key === 'innosolv') for (const [product, code] of [['abacus','21'],['pce','22']]) {
    if (state.draft.products.includes(product) && state.catalog.items.some(item =>
      item.vendor === 'innosolv' && item.product === 'Gemeinde' && item.item_code === code)) {
      state.draft.modules.push({ vendor: 'innosolv', product: 'Gemeinde', item_code: code });
      addModuleService(`innosolv/Gemeinde/${code}`);
    }
  }
  state.draft.moduleServices = state.draft.moduleServices.filter(item =>
    state.draft.modules.some(module => item.item_code ===
      `${module.vendor}/${module.product}/${module.item_code}`));
  retainRemoved(state.draft, previousModules, previousServices);
  if (render) renderEditor();
}

function chooseErp(choice, render = true) {
  if(render)state.dirty=true;
  const previousModules=structuredClone(state.draft.modules), previousServices=structuredClone(state.draft.moduleServices);
  const wanted = choice === 'both' ? ['pce', 'abacus'] :
    ['pce', 'abacus'].includes(choice) ? [choice] : [];
  const hadAbacus = state.draft.products.includes('abacus');
  state.draft.products = state.draft.products.filter(p => !['pce', 'abacus'].includes(p)).concat(wanted);
  state.draft.modules = state.draft.modules.filter(item =>
    item.vendor !== 'abacus' || wanted.includes('abacus'));
  if (wanted.includes('abacus') && !hadAbacus) {
    for (const item of state.catalog.items.filter(item => item.vendor === 'abacus' &&
      item.product === 'ERP' && defaultModule(item,state.catalog,state.draft.reference?.id))) {
      if (!state.draft.modules.some(row => row.vendor === 'abacus' && row.item_code === item.item_code)) {
        state.draft.modules.push({ vendor: 'abacus', product: 'ERP', item_code: item.item_code });
        addModuleService(`abacus/ERP/${item.item_code}`);
      }
    }
  }
  if (state.draft.products.includes('innosolv')) {
    state.draft.modules = state.draft.modules.filter(item => item.vendor !== 'innosolv' ||
      item.product !== 'Gemeinde' || !['21', '22'].includes(item.item_code));
    for (const code of [wanted.includes('abacus') ? '21' : null,
      wanted.includes('pce') ? '22' : null].filter(Boolean)) {
      if (state.catalog.items.some(item => item.vendor === 'innosolv' &&
        item.product === 'Gemeinde' && item.item_code === code)) {
        state.draft.modules.push({ vendor: 'innosolv', product: 'Gemeinde', item_code: code });
        addModuleService(`innosolv/Gemeinde/${code}`);
      }
    }
  }
  state.draft.moduleServices = state.draft.moduleServices.filter(line =>
    state.draft.modules.some(item => line.item_code ===
      `${item.vendor}/${item.product}/${item.item_code}`));
  retainRemoved(state.draft, previousModules, previousServices);
  if (render) renderEditor();
}

async function load() {
  if (state.loaded) { if(state.pendingCommune){await openPendingCommune();return;} const id=new URLSearchParams(location.search).get('quote');if(id&&id!==state.quote)await open(id);return; }
  if (state.loading) return state.loading;
  state.loading = (async () => {
    root.innerHTML = `<p>${t('chiffrage.loading')}</p>`;
    try {
    await api('status');
    state.authenticated = true;
    const [catalog, quotes] = await Promise.all([api('catalog'), api('list', undefined,
      { archived: 'all' })]);
    state.versions = catalog.active;
    state.activeVersions = catalog.active;
    state.catalog = catalog.catalog;
    state.quotes = quotes;
    state.loaded = true;
    const linkedId=new URLSearchParams(location.search).get('quote');
    renderList();
    if(state.pendingCommune)await openPendingCommune();else if(linkedId)await open(linkedId);
    } catch (error) {
    state.message = error.status === 401 ? '' : t('chiffrage.unavailable');
    state.error = error.status !== 401;
    renderLogin();
    } finally { state.loading = null; }
  })();
  return state.loading;
}

async function open(id) {
  const row = await api('quote', undefined, { id });
  state.quote = row.id; state.revision = row.current_revision;
  state.title = row.title; state.archived = row.archived;
  state.draft = row.snapshot.input; state.versions = row.snapshot.catalog_versions;
  const stored = await api('catalog', undefined, { versions: JSON.stringify(state.versions) });
  state.catalog = stored.catalog;
  history.replaceState(history.state,'',quoteAddress(id));
  state.editorTab = 'composer'; state.internal = false; state.dirty = false;
  state.comparison=[];state.comparisonData=[];
  renderEditor();
}

root.addEventListener('submit', async event => {
  event.preventDefault();
  if (['chiffrageLogin', 'chiffrageReconnect'].includes(event.target.id)) {
    const reconnect = event.target.id === 'chiffrageReconnect';
    const button = event.target.querySelector('button'); button.disabled = true;
    try { const login = await api('login', { code: event.target.elements.code.value });
      state.session = login.session; sessionStorage.setItem(sessionKey, login.session);
      state.authenticated = true;
      if (reconnect) { event.target.remove(); notice(t('chiffrage.sessionRestored')); }
      else { state.loaded = false; state.message = ''; await load(); } }
    catch { notice(t('chiffrage.denied'), true); button.disabled = false; }
  } else if (event.target.id === 'chiffrageChoose') {
    const value = document.getElementById('chiffrageCommuneSearch').value;
    const row = communes().find(item => communeOption(item) === value);
    if (row) { try { await firstDraft(row); } catch (error) { notice(errorMessage(error),true); } }
    else notice(t('chiffrage.selectCommune'), true);
  }
});

root.addEventListener('input', event => {
  if (event.target.dataset.moduleSearch) {
    const query=event.target.value.toLocaleLowerCase(document.documentElement.lang);
    event.target.closest('details')?.querySelectorAll('.chiffrage-module-entry').forEach(node=>{
      node.hidden=!node.textContent.toLocaleLowerCase(document.documentElement.lang).includes(query);
    });
    return;
  }
  const path = event.target.dataset.field;
  if (!path || !state.draft) return;
  setValue(path, event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    event.target.type === 'checkbox');
  if (path === 'dimensions.population' || path === 'lcm.gold' || path === 'lcm.platinium') {
    const preview = root.querySelector('.chiffrage-lcm-prices');
    if (preview) preview.innerHTML = lcmPrices();
  }
  if (['dimensions.population','sql.users'].includes(path) && state.draft.sql.override==null) {
    try { const price=calculateSql({population:state.draft.dimensions.population,...state.draft.sql},state.catalog.parameters.sql).amount.effective_value;
      root.querySelectorAll('[data-field="sql.override"]').forEach(input=>input.value=price??'');
    } catch { /* Missing reference is shown in the financial summary. */ }
  }
  root.querySelectorAll('[data-field]').forEach(input => {
    if (input !== event.target && input.dataset.field === path) input.value = event.target.value;
  });
  refreshFinancials();
  notice('');
});

root.addEventListener('change', event => {
  if (event.target.dataset.compare) {
    const id=event.target.dataset.compare;
    state.comparison=event.target.checked ? [...state.comparison,id].slice(0,3) :
      state.comparison.filter(value=>value!==id);
    void loadComparison(); return;
  }
  if (event.target.hasAttribute('data-reference')) {
    const id = event.target.value;
    if (!id) return;
    const profile = referenceProfiles(state.catalog).find(row=>row.id===id);
    if (!profile) return;
    if (!window.confirm(localLabel(`Appliquer « ${profile.label} » ? Les jours par module, les prestations transversales et la GP seront remplacés. Les licences, volumes et prix personnalisés restent conservés.`, `« ${profile.label} » anwenden? Modultage, übergreifende Leistungen und Projektleitung werden ersetzt. Lizenzen, Mengen und individuelle Preise bleiben erhalten.`))) {event.target.value='';return;}
    applyReference(state.draft,state.catalog,id); state.dirty=true; renderEditor(); return;
  }
  if (event.target.dataset.hosting) {
    state.draft.hosting = { ...state.draft.hosting, included: event.target.dataset.hosting === 'true' };
    if (state.draft.hosting.included) applyHosting(state.draft,state.catalog);
    state.dirty=true;
    renderEditor(); return;
  }
  if (event.target.dataset.energy) {
    const previousModules=structuredClone(state.draft.modules), previousServices=structuredClone(state.draft.moduleServices);
    const enabled = event.target.dataset.energy === 'true';
    if (!setEnergy(state.draft, enabled, state.catalog)) {
      renderEditor(); notice(t('chiffrage.energyUnavailable'), true); return;
    }
    if (enabled) for (const code of energyCodes) addModuleService(`innosolv/Versorger/${code}`);
    retainRemoved(state.draft,previousModules,previousServices); state.dirty=true;
    renderEditor(); return;
  }
  if (event.target.dataset.field === 'showArchived') {
    state.showArchived = event.target.checked; renderList(); return;
  }
  if (event.target.dataset.product) { changeProduct(event.target.dataset.product, event.target.checked); return; }
  if (event.target.dataset.erp) { chooseErp(event.target.dataset.erp); return; }
  if (event.target.dataset.module) {
    const previousModules=structuredClone(state.draft.modules), previousServices=structuredClone(state.draft.moduleServices);
    const [vendor, product, item_code] = event.target.dataset.module.split('/');
    state.draft.modules = state.draft.modules.filter(item =>
      !(item.vendor === vendor && item.product === product && item.item_code === item_code));
    if (event.target.checked) {
      state.draft.modules.push({ vendor, product, item_code });
      addModuleService(`${vendor}/${product}/${item_code}`);
    } else state.draft.moduleServices = state.draft.moduleServices.filter(line =>
      line.item_code !== `${vendor}/${product}/${item_code}`);
    retainRemoved(state.draft,previousModules,previousServices); state.dirty=true;
    if (isEnergyModule({ vendor, product, item_code })) state.draft.energy =
      state.draft.modules.some(isEnergyModule);
    renderEditor();
  }
  if (event.target.dataset.field?.endsWith('.level')) {
    setValue(event.target.dataset.field, event.target.value);
    root.querySelector('#chiffrageSummary').innerHTML = summary();
  }
  if (event.target.dataset.field === 'lcm.selection') {
    root.querySelector('#chiffrageSummary').innerHTML = summary();
    const detail = root.querySelector('#chiffrageDetail');
    if (detail) detail.innerHTML = lineDetail();
  }
});

async function loadComparison() {
  try {
    const rows=await Promise.all(state.comparison.map(id=>api('quote',undefined,{id})));
    const data=await Promise.all(rows.map(async row=>{
      const versions=row.snapshot.catalog_versions;
      const catalog=await api('catalog',undefined,{versions:JSON.stringify(versions)});
      const input=row.snapshot.input;
      let result;try {result=calculateQuote(input,catalog.catalog);} catch {result=null;}
      return {title:row.title,input,versions:JSON.stringify(versions),tariff:tariffLabel(catalog.catalog),
        reference:input.reference?.label??'—',result,catalog:catalog.catalog};
    }));
    const base=data[0]?.input;
    for(const row of data){
      const selected=new Set(row.input.modules.map(moduleId));
      const original=new Set(base?.modules.map(moduleId)??[]);
      const names=ids=>ids.map(id=>{const item=row.catalog.items.find(item=>moduleId(item)===id);
        return document.documentElement.lang==='de'?item?.label_de??item?.label_fr??id:item?.label_fr??item?.label_de??id;});
      row.differences=[...names([...selected].filter(id=>!original.has(id))).map(name=>`+ ${name}`),
        ...names([...original].filter(id=>!selected.has(id))).map(name=>`− ${name}`)];
      for(const [key,label] of [['population',localLabel('Habitants','Einwohner')],['employees',localLabel('Collaborateurs','Mitarbeitende')],['meters',localLabel('Compteurs','Zähler')]])
        if(base && row.input.dimensions[key]!==base.dimensions[key])row.differences.push(`${label} : ${number(row.input.dimensions[key])}`);
      if(base && hostingIncluded(row.input)!==hostingIncluded(base))row.differences.push(`${t('chiffrage.hosting')} : ${t(hostingIncluded(row.input)?'chiffrage.yes':'chiffrage.no')}`);
      if(base && row.input.lcm.selection!==base.lcm.selection)row.differences.push(`LCM : ${row.input.lcm.selection??'—'}`);
      const days=input=>[...(input.moduleServices??[]),...(input.services??[])].reduce((sum,line)=>sum+(line.days??0),0);
      if(base && days(row.input)!==days(base))row.differences.push(`${t('chiffrage.days')} : ${number(days(row.input))}`);
    }
    state.comparisonData=data;
    if(state.mode==='editor' && state.editorTab==='compare')renderEditor();
  }catch(error){notice(errorMessage(error),true);}
}

root.addEventListener('click', async event => {
  const tab = event.target.closest('[data-editor-tab]');
  if (tab && state.mode === 'editor') {
    state.editorTab = tab.dataset.editorTab;
    renderEditor();
    root.querySelector('.chiffrage-work-tabs')?.scrollIntoView({block:'start',behavior:'smooth'});
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'upgrade') {
    if (!window.confirm(localLabel('Créer une nouvelle variante avec les tarifs et prestations actuels ? Le chiffrage original restera intact. Les choix, volumes et jours déjà saisis sont conservés ; seuls les jours absents et la GP sont préremplis à partir de la référence.','Neue Variante mit aktuellen Preisen und Leistungen erstellen? Die ursprüngliche Kalkulation bleibt erhalten. Auswahl, Mengen und eingegebene Tage bleiben bestehen; fehlende Tage und Projektleitung werden vorbelegt.'))) return;
    button.disabled=true;
    try {
      const active=await api('catalog');
      const draft=structuredClone(state.draft);
      const previousServices=new Map((draft.moduleServices??[]).map(line=>[line.item_code,line]));
      const previousGlobal=new Map((draft.services??[]).map(line=>[line.item_code,line]));
      const profile=referenceProfiles(active.catalog).find(row=>row.default)??referenceProfiles(active.catalog)[0];
      if (!profile) throw new Error('Missing current reference');
      applyReference(draft,active.catalog,profile.id);
      draft.moduleServices=draft.moduleServices.map(line=>({...line,...(previousServices.get(line.item_code)?.days!=null?{days:previousServices.get(line.item_code).days}:{} )}));
      draft.services=draft.services.map(line=>({...line,...(previousGlobal.get(line.item_code)?.days!=null?{days:previousGlobal.get(line.item_code).days}:{} ),...(previousGlobal.get(line.item_code)?.investment_override!=null?{investment_override:previousGlobal.get(line.item_code).investment_override}:{} )}));
      for(const [code,line] of previousGlobal)if(!draft.services.some(item=>item.item_code===code) && !['projet','deplacements'].includes(code))draft.services.push(line);
      for(const kind of ['primeLines','partners'])for(const line of structuredClone(profile[kind==='primeLines'?'prime_lines':'partners']??[]))
        if(!draft[kind].some(existing=>existing.item_code===line.item_code || existing.label===line.label))draft[kind].push(line);
      if(hostingIncluded(draft))applyHosting(draft,active.catalog);
      state.catalog=active.catalog;state.versions=active.active;state.activeVersions=active.active;
      state.draft=draft;state.quote=null;state.revision=null;state.title+=localLabel(' — standard actuel',' — aktueller Standard');
      state.dirty=true;state.editorTab='composer';renderEditor();
      notice(localLabel('Variante prête à enregistrer. Le chiffrage original et ses révisions restent intacts.','Variante bereit zum Speichern. Die ursprüngliche Kalkulation und ihre Versionen bleiben erhalten.'));
    }catch(error){notice(errorMessage(error),true);}finally{if(button.isConnected)button.disabled=false;}
    return;
  }
  if (action === 'confirmHosting') {
    for(const row of [...state.draft.primeLines,...state.draft.partners].filter(line=>line.category==='hosting')){row.reference_products=[];row.scope_override=true;}
    state.dirty=true;renderEditor();return;
  }
  if (action === 'copyLink') {
    try {await navigator.clipboard.writeText(quoteAddress(state.quote).href);notice(t('chiffrage.resumeCopied'));}
    catch {notice(t('chiffrage.resumeCopyUnavailable'),true);}
    return;
  }
  if (action === 'internalMode') {
    if (!window.confirm(t('chiffrage.workspace.9c2ae21d5d'))) return;
    state.internal=true; state.editorTab='rates'; renderEditor(); return;
  }
  if (action === 'clientMode') {state.internal=false;state.editorTab='composer';renderEditor();return;}
  if (action === 'new') { renderNew(); return; }
  if (action === 'list') { if (state.dirty && !window.confirm(t('chiffrage.workspace.091d0faaf1'))) return; state.internal=false; renderList(); return; }
  if (action === 'suggestVolumes') {
    state.dirty=true;
    state.draft.dimensions.meters = state.draft.dimensions.taxes = suggestedVolume(state.draft.dimensions.population);
    renderEditor(); return;
  }
  if (['addPrime','addPartner','addHosting','addLicense'].includes(action)) {
    state.dirty=true;
    const partner = action === 'addPartner';
    const preset = {
      addHosting: { label: t('chiffrage.hosting'), category: 'hosting' },
      addLicense: { label: t('chiffrage.primeLicense'), category: 'license' }
    }[action] ?? {};
    state.draft[partner ? 'partners' : 'primeLines'].push({
      family: partner ? 'partenaires' : 'prime', ...preset,
      quantity: 1, investment_pv: action === 'addHosting' ? null : 0,
      annual_pv: action === 'addHosting' ? null : 0 });
    renderEditor(); return;
  }
  if (action === 'removeLine') {
    state.dirty=true;
    state.draft[button.dataset.kind].splice(Number(button.dataset.index), 1);
    renderEditor(); return;
  }
  if (action === 'delete' && !window.confirm(localLabel(
    `Supprimer définitivement « ${state.title} » et toutes ses révisions ?`,
    `« ${state.title} » und alle Versionen endgültig löschen?`))) return;
  button.disabled = true;
  try {
    if (action === 'logout') {
      await api('logout', {}); state.session = null; sessionStorage.removeItem(sessionKey);
      state.loaded = false; state.authenticated = false;
      state.catalog = null; state.quotes = []; state.draft = null; state.pendingCommune = null;
      state.message = ''; renderLogin(); return;
    }
    if (action === 'open') { await open(button.dataset.id); return; }
    if (action === 'delete') {
      await api('delete', { id: state.quote, expected_revision: state.revision });
      state.quotes = await api('list', undefined, { archived: 'all' });
      renderList(); notice(t('chiffrage.workspace.b17073f7da'));
      return;
    }
    if (action === 'save' || action === 'duplicate' || action === 'archive') {
      // Keep an explicitly incomplete draft; never present missing prices as zero.
      let incomplete = false;
      try { incomplete=calculateQuote(state.draft, state.catalog).status==='incomplete'; }
      catch (error) { if (!calculationError(error)) throw error; incomplete = true; }
      const duplicate = action === 'duplicate';
      const saved = await api('save', { id: duplicate ? undefined : state.quote ?? undefined,
        expected_revision: duplicate ? null : state.revision,
        title: state.title + (duplicate ? ' — copie' : ''),
        archived: action === 'archive', catalog_versions: state.versions,
        input: state.draft, allow_incomplete: true });
      state.quote = saved.id; state.revision = saved.revision; state.dirty=false;
      state.archived = action === 'archive';
      history.replaceState(history.state,'',quoteAddress(state.quote));
      let listError = false;
      try { state.quotes = await api('list', undefined, { archived: 'all' }); }
      catch { listError = true; }
      if (action === 'archive') renderList();
      else { if (duplicate) state.title += ' — copie';
        renderEditor(); notice(t(listError ? 'chiffrage.savedListUnavailable' :
          incomplete ? 'chiffrage.savedIncomplete' : 'chiffrage.saved')); }
      return;
    }
    if (action === 'revisions') {
      const revisions = await api('revisions', undefined, { id: state.quote });
      root.querySelector('#chiffrageHistory').innerHTML = `<div class="chiffrage-panel"><h3>${t('chiffrage.revisions')}</h3>
        ${revisions.map(row => `<button class="chiffrage-button" data-action="restore"
          data-revision="${row.revision}" ${row.revision === state.revision ? 'disabled' : ''}>
          ${t('chiffrage.restore')} · ${row.revision}</button>`).join('')}</div>`;
      return;
    }
    if (action === 'restore') {
      const old = await api('quote', undefined, { id: state.quote,
        revision: button.dataset.revision });
      const saved = await api('save', { id: state.quote,
        expected_revision: state.revision, title: state.title,
        archived: false, catalog_versions: old.snapshot.catalog_versions,
        input: old.snapshot.input, allow_incomplete: true });
      state.draft = old.snapshot.input; state.versions = old.snapshot.catalog_versions;
      state.revision = saved.revision; state.archived = false;
      const catalog = await api('catalog', undefined,
        { versions: JSON.stringify(state.versions) });
      state.catalog = catalog.catalog; renderEditor(); notice(t('chiffrage.saved'));
      return;
    }
    if (action === 'export' || action === 'exportInternal' && state.internal) {
      if (state.dirty) {notice(t('chiffrage.workspace.07d035b19e'),true);return;}
      const response = await fetch(`${endpoint}?action=export&id=${encodeURIComponent(state.quote)}&scope=${action === 'exportInternal' ? 'internal' : 'client'}`,
        { headers: { Authorization: `Bearer ${state.session}` }, cache: 'no-store' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const error = new Error(t('chiffrage.error'));
        Object.assign(error, { status: response.status, code: result.code, item: result.item });
        throw error;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(await response.blob());
      link.download = `chiffrage-${state.draft.bfs_id}${action === 'exportInternal' ? '-interne' : '-client'}.xlsx`;
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      return;
    }
  } catch (error) {
    notice(errorMessage(error), true);
    if (error.status === 401 && state.draft && !root.querySelector('#chiffrageReconnect')) {
      root.querySelector('.chiffrage-status').insertAdjacentHTML('afterend',
        `<form id="chiffrageReconnect" class="chiffrage-panel"><label>${t('chiffrage.login')}<input name="code" type="password" autocomplete="current-password" required></label><button type="submit" class="chiffrage-button primary">${t('chiffrage.enter')}</button></form>`);
    }
  }
  finally { if (button.isConnected) button.disabled = false; }
});

window.addEventListener('beforeunload',event=>{if(state.draft && state.dirty){event.preventDefault();event.returnValue='';}});

const priorOpenDrawer = window.openDrawer;
window.openDrawer = function openDrawerWithChiffrage(commune) {
  priorOpenDrawer(commune);
  const panel = document.querySelector('#drawerRoot .drawer');
  if (!panel || !commune) return;
  const button = document.createElement('button');
  button.className = 'chiffrage-button';
  button.textContent = t('chiffrage.create');
  button.addEventListener('click', () => {
    window.closeDrawer();
    document.dispatchEvent(new CustomEvent('prime:chiffrage-commune', { detail: commune }));
  });
  panel.querySelector('.drawer-pop')?.insertAdjacentElement('afterend', button);
};

document.addEventListener('prime:chiffrage-commune', event => {
  const commune = event.detail;
  if (!commune?.id) return;
  state.pendingCommune = commune;
  document.querySelector('[data-view="chiffrage"]').click();
  void load();
});

document.querySelector('[data-view="chiffrage"]').addEventListener('click', load);
window.addEventListener('popstate', () => {
  if (new URLSearchParams(location.search).get('view') === 'chiffrage') load();
});
subscribePreferences(() => {
  if (state.authenticated) state.mode === 'editor' ? renderEditor() : renderList();
  else if (state.loaded) renderLogin();
});
if (new URLSearchParams(location.search).get('view') === 'chiffrage') load();
