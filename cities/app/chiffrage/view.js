import { t, number } from '../core/i18n.js?v=20260928-chiffrage-mobile';
import { subscribePreferences } from '../core/preferences.js';
import { calculateQuote, calculateLcm, licensedPopulation, suggestedSqlUsers } from './calculate.js?v=20260929-chiffrage-workspace';

const root = document.getElementById('chiffrageRoot');
const runtime = window.PrimeCommunesRuntime;
const escape = runtime.escapeHtml;
const endpoint = `${window.SUPABASE_URL}/functions/v1/chiffrage`;
const sessionKey = 'prime-chiffrage-session';
const state = { authenticated: false, loaded: false, catalog: null, versions: {},
  quotes: [], quote: null, draft: null, revision: null, title: '', archived: false,
  showArchived: false, mode: 'list', message: '', error: false, loading: null,
  pendingCommune: null,
  editorTab: 'composer', session: sessionStorage.getItem(sessionKey) };
const money = value => value == null ? '—' : `${number(value, {
  minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF`;
const field = (key, value, label, { min = 0, step = 1 } = {}) =>
  `<label>${label}<input data-field="${key}" type="number" min="${min}" step="${step}" value="${escape(value ?? '')}"></label>`;
const textField = (key, value, label) =>
  `<label>${label}<input data-field="${key}" value="${escape(value ?? '')}"></label>`;
const localLabel = (fr, de) => document.documentElement.lang === 'de' ? de : fr;

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
  return `<div class="chiffrage-header">${state.draft ? `<p>${escape(state.draft.name)} · OFS ${state.draft.bfs_id}
      · ${t('chiffrage.revision', { revision: state.revision ?? '—' })}</p>` : '<span></span>'}
    <div class="chiffrage-actions">${state.draft ? `<button class="chiffrage-button" data-action="list">${t('chiffrage.back')}</button>` : ''}
      <button class="chiffrage-button" data-action="logout">${t('chiffrage.logout')}</button></div></div>
    <p class="chiffrage-status${state.error ? ' error' : ''}" role="status">${escape(state.message)}</p>`;
}

function renderLogin() {
  root.innerHTML = `<div class="chiffrage-panel"><h2>${t('chiffrage.title')}</h2>
    <form id="chiffrageLogin"><label>${t('chiffrage.login')}
    <input name="code" type="password" autocomplete="current-password" required></label>
    <p class="chiffrage-status${state.error ? ' error' : ''}" role="status">${escape(state.message)}</p>
    <button class="chiffrage-button primary" type="submit">${t('chiffrage.enter')}</button></form></div>`;
}

function renderList() {
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

function firstDraft(row) {
  state.draft = { bfs_id: Number(row.id), name: row.name, canton: row.canton,
    context: { integrator: row.integrator, software: row.software, erp: row.erp,
      hosting: row.hosting, notes: row.notes },
    dimensions: { population: Number(row.expectedPopulation ?? 0),
      licensedPopulation: licensedPopulation(Number(row.expectedPopulation ?? 0)),
      meters: 0, taxes: 0, employees: 0 },
    products: [], modules: [], moduleServices: [], services: [], primeLines: [],
    partners: [], pce: { finances: true, salaires: false, interfacePa: 0 },
    oracle: { full: 0, light: 0 }, sql: {}, lcm: {} };
  state.title = `${row.name} — Variante 1`;
  state.revision = null;
  state.quote = null;
  state.archived = false;
  state.editorTab = 'composer';
  state.mode = 'editor';
  notice('');
  renderEditor();
}

function openPendingCommune() {
  if (!state.pendingCommune || !state.authenticated || !state.catalog) return;
  const commune = state.pendingCommune;
  state.pendingCommune = null;
  firstDraft(commune);
}

function availableModules() {
  return (state.catalog?.items ?? []).filter(item =>
    item.product === (item.vendor === 'innosolv' ? 'Gemeinde' : 'ERP') &&
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
  const presets = state.catalog?.parameters.service_presets?.standard ?? {};
  return presets[id] ?? (id.endsWith('/129VD') ? presets['innosolv/Gemeinde/129'] : null);
}
function dayRate() { return state.draft?.commercial?.dayRate ?? state.catalog?.parameters.day_rate; }
function addModuleService(id) {
  const days = presetDays(id);
  if (!state.draft.moduleServices.some(line => line.item_code === id))
    state.draft.moduleServices.push({ family: 'prestations_module', item_code: id,
      label: id, level: 'standard', days: days ?? 0 });
}

function rateInventory() {
  const p = state.catalog?.parameters;
  const standard = p?.publisher_rent?.innosolv?.standard;
  const abacus = p?.publisher_rent?.abacus?.standard;
  const percentField = (key, value, label) => field(`commercial.${key}`,
    (state.draft.commercial?.[key] ?? value) * 100, label, { step: .01 });
  return `<section class="chiffrage-section chiffrage-rates"><h2>${localLabel('PV et taux', 'Verkaufspreise und Sätze')}</h2>
    <p class="chiffrage-helper">${localLabel('Valeurs de la version tarifaire, ajustables pour ce chiffrage. Les marges réelles sont calculées depuis les PA et PV saisis.', 'Werte der Tarifversion, für diese Kalkulation anpassbar. Tatsächliche Margen werden aus Einkaufs- und Verkaufspreisen berechnet.')}</p>
    <div class="chiffrage-grid">${field('commercial.dayRate', dayRate(), localLabel('PV par jour (CHF)', 'Tagessatz (CHF)'))}
      ${percentField('innosolvPaRate', standard?.pa_rate, 'innosolv · PA (%)')}
      ${percentField('innosolvPvRate', standard?.pv_rate, 'innosolv · PV (%)')}
      ${percentField('abacusPaRate', abacus?.pa_rate, 'Abacus · PA (%)')}
      ${percentField('abacusPvRate', abacus?.pv_rate, 'Abacus · PV (%)')}
      ${percentField('pcePvMargin', p?.pce?.pv_margin, 'ProConcept · ' + localLabel('marge cible (%)', 'Zielmarge (%)'))}
    </div><p class="chiffrage-helper">${localLabel('Pour hébergement, Prime et partenaires, ajuster directement les PA et PV de chaque ligne. Les autres taux historiques du fichier Excel ne s’appliquent pas automatiquement.', 'Für Hosting, Prime und Partner die Einkaufs- und Verkaufspreise direkt pro Position anpassen. Weitere historische Excel-Sätze werden nicht automatisch angewendet.')}</p>
    ${publisherOverridesSection()}</section>`;
}

function productSection() {
  const selected = new Set(state.draft.modules.map(item => `${item.vendor}/${item.product}/${item.item_code}`));
  const modules = availableModules().sort((a, b) => moduleOrder(a) - moduleOrder(b));
  const groups = new Map();
  for (const item of modules) {
    const key = item.vendor === 'abacus' ? `Abacus · ${item.item_code.split('.')[0]}` :
      `${item.vendor} · ${item.product}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const entry = item => {
    const id = `${item.vendor}/${item.product}/${item.item_code}`;
    const current = state.draft.moduleServices.find(line => line.item_code === id);
    const days = current?.days ?? presetDays(id);
    return `<div class="chiffrage-module-entry"><label><input type="checkbox" data-module="${escape(id)}" ${selected.has(id) ? 'checked' : ''} ${id === 'innosolv/Gemeinde/1' && selected.has(id) ? 'disabled' : ''}>
      <span><small>${escape(item.item_code)} · ${item.default_selected ? localLabel('habituel', 'üblich') : escape(item.vendor)}</small><br>${escape(item.label_fr || item.label_de || item.item_code)}</span></label>
      ${selected.has(id) ? `<div class="chiffrage-module-service">
        ${field(`moduleService.${id}.days`, days, t('chiffrage.days'), { step: .5 })}
        <small>${localLabel('Prix par jour', 'Tagessatz')} : ${money(dayRate())} · ${
          t('chiffrage.investment')} : ${money(days == null ? null : days * dayRate())}${
          presetDays(id) == null ? ` · ${localLabel('Pas de standard chiffré : 0 j modifiable', 'Kein Richtwert: 0 Tage anpassbar')}` : ''}</small>
      </div>` : ''}</div>`;
  };
  return `<section class="chiffrage-section"><h2>${localLabel('Licences et options', 'Lizenzen und Optionen')}</h2>
    <p class="chiffrage-helper">${localLabel('Modules dans l’ordre du catalogue. Le signe « – » reste avec son module parent ; les prestations se règlent juste sous la licence.', 'Module in der Reihenfolge des Katalogs. Zusatzmodule bleiben bei ihrem Hauptmodul; Dienstleistungen stehen direkt darunter.')}</p>
      <div class="chiffrage-module-groups">${[...groups].map(([group, entries]) => {
        const included = entries.filter(item => selected.has(`${item.vendor}/${item.product}/${item.item_code}`));
        const other = entries.filter(item => !selected.has(`${item.vendor}/${item.product}/${item.item_code}`));
        return `<div class="chiffrage-module-set"><h3>${escape(group)} · ${included.length} ${localLabel('retenus', 'gewählt')}</h3>
          <div class="chiffrage-module-list">${included.map(entry).join('') || `<p class="chiffrage-helper">${localLabel('Aucun module sélectionné.', 'Keine Module gewählt.')}</p>`}</div>
          ${other.length ? `<details class="chiffrage-subdetail"><summary>${localLabel('Ajouter d’autres options', 'Weitere Optionen hinzufügen')} · ${other.length}</summary><div class="chiffrage-module-list">${other.map(entry).join('')}</div></details>` : ''}</div>`;
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
function serviceSection() {
  const de = document.documentElement.lang === 'de';
  return `<details class="chiffrage-section"><summary>${t('chiffrage.services')}</summary>
    ${serviceTypes.map(([id, fr, german]) => {
      const current = state.draft.services.find(entry => entry.item_code === id);
      return `<div class="chiffrage-line"><strong>${escape(de ? german : fr)}</strong>
        ${field(`service.${id}.days`, current?.days, t('chiffrage.days'), { step: .5 })}
        ${field(`service.${id}.override`, current?.investment_override,
          t('chiffrage.override'))}</div>`;
    }).join('')}</details>`;
}

function publisherOverridesSection() {
  return `<details class="chiffrage-subdetail"><summary>${localLabel('Dérogations PA / PV par module', 'Abweichungen EP / VP pro Modul')}</summary>
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
  try { if (hasSql) suggestion = suggestedSqlUsers(state.draft.dimensions.population,
    state.catalog.parameters.sql.suggestion); } catch { /* Missing private rule. */ }
  return `<details class="chiffrage-section"><summary>${t('chiffrage.technical')}</summary>
    ${hasSql ? `<p>${t('chiffrage.sqlSuggested', { count: suggestion ?? '—' })}</p>
      ${state.draft.dimensions.population >= state.catalog.parameters.sql.core_from_population &&
        state.catalog.parameters.sql.price_per_core == null ?
        `<p class="chiffrage-warning">${t('chiffrage.sqlCoreUnconfirmed')}</p>` : ''}
      <div class="chiffrage-grid">${field('sql.users', state.draft.sql.users ?? suggestion,
        t('chiffrage.sqlUsers'))}
      ${field('sql.cores', state.draft.sql.cores, t('chiffrage.sqlCores'))}
      ${field('sql.override', state.draft.sql.override, t('chiffrage.sqlInvestmentPv'))}
      ${field('sql.purchasePa', state.draft.sql.purchasePa, t('chiffrage.sqlInvestmentPa'))}
      ${field('sql.annualPv', state.draft.sql.annualPv, t('chiffrage.sqlAnnualPv'))}
      ${field('sql.annualPa', state.draft.sql.annualPa, t('chiffrage.sqlAnnualPa'))}</div>` : ''}
    ${hasOracle ? `<div class="chiffrage-grid">
      ${field('oracle.full', state.draft.oracle.full, t('chiffrage.oracleFull'))}
      ${field('oracle.light', state.draft.oracle.light, t('chiffrage.oracleLight'))}
      ${field('oracle.investmentOverride', state.draft.oracle.investmentOverride, t('chiffrage.oracleInvestmentPv'))}
      ${field('oracle.annualOverride', state.draft.oracle.annualOverride, t('chiffrage.oracleAnnualPv'))}
      ${field('oracle.purchasePa', state.draft.oracle.purchasePa, t('chiffrage.oracleInvestmentPa'))}
      ${field('oracle.maintenancePa', state.draft.oracle.maintenancePa, t('chiffrage.oracleAnnualPa'))}
      ${field('pce.interfacePa', state.draft.pce.interfacePa, 'Interface PCE–ISAG (PA)')}</div>` : ''}</details>`;
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
        ${field(`${line.kind}.${line.index}.investment_pv`, line.investment_pv,
          t('chiffrage.investment'))}
        ${field(`${line.kind}.${line.index}.investment_pa`, line.investment_pa, t('chiffrage.investmentPa'))}
        ${field(`${line.kind}.${line.index}.annual_pv`, line.annual_pv,
          t('chiffrage.annual'))}
        ${field(`${line.kind}.${line.index}.annual_pa`, line.annual_pa, t('chiffrage.annualPa'))}
        ${textField(`${line.kind}.${line.index}.note`, line.note, t('chiffrage.note'))}
        <button type="button" class="chiffrage-button" data-action="removeLine" data-kind="${line.kind}" data-index="${line.index}">${t('chiffrage.removeLine')}</button></div>`).join('')}
    <div class="chiffrage-actions"><button type="button" class="chiffrage-button" data-action="addLicense">${t('chiffrage.addPrimeLicense')}</button>
      <button type="button" class="chiffrage-button" data-action="addPrime">${t('chiffrage.addLine')} Prime</button>
      <button type="button" class="chiffrage-button" data-action="addPartner">${t('chiffrage.addLine')} ${t('chiffrage.partner')}</button></div></details>`;
}

function hostingSection() {
  const rows = state.draft.primeLines.map((line, index) => ({ ...line, index }))
    .filter(line => line.category === 'hosting');
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.hosting')}</summary>
    <div class="chiffrage-actions"><button type="button" class="chiffrage-button" data-action="addHosting">${
      t('chiffrage.addHosting')}</button></div>
    ${rows.map(line => `<div class="chiffrage-line chiffrage-hosting-line">
      ${textField(`primeLines.${line.index}.label`, line.label, t('chiffrage.lineLabel'))}
      ${field(`primeLines.${line.index}.investment_pv`, line.investment_pv, t('chiffrage.investment') + ' PV')}
      ${field(`primeLines.${line.index}.investment_pa`, line.investment_pa, t('chiffrage.investmentPa'))}
      ${field(`primeLines.${line.index}.annual_pv`, line.annual_pv, t('chiffrage.annual') + ' PV')}
      ${field(`primeLines.${line.index}.annual_pa`, line.annual_pa, t('chiffrage.annualPa'))}
      <button type="button" class="chiffrage-button" data-action="removeLine" data-kind="primeLines" data-index="${line.index}">${t('chiffrage.removeLine')}</button>
    </div>`).join('')}</details>`;
}

function lcmPrices() {
  const prices = calculateLcm(state.draft.dimensions.population,
    state.catalog.parameters.lcm, state.draft.lcm);
  return `Gold : <strong>${money(prices.gold?.effective_value)}</strong> · Platinum : <strong>${money(prices.platinium?.effective_value)}</strong>${
    prices.block == null ? ` · ${t('chiffrage.lcmMissing')}` : ` · ≤ ${number(prices.block)} ${localLabel('habitants', 'Einwohner')}`}`;
}
function lcmSection() {
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.lcm')}</summary>
    <p class="chiffrage-lcm-prices">${lcmPrices()}</p>
    <div class="chiffrage-grid"><label>${t('chiffrage.lcmSelection')}<select data-field="lcm.selection">
      ${[['none', t('chiffrage.lcmNone')], ['gold','Gold'], ['platinium','Platinum']].map(([key,label]) =>
        `<option value="${key}" ${(state.draft.lcm.selection ?? 'none') === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>${field('lcm.gold', state.draft.lcm.gold,
      'LCM Gold · ' + t('chiffrage.override'))}
      ${field('lcm.platinium', state.draft.lcm.platinium,
        'LCM Platinium · ' + t('chiffrage.override'))}</div></details>`;
}

function composerSection() {
  const products = state.draft.products;
  const erp = products.includes('pce') && products.includes('abacus') ? 'both' :
    products.includes('pce') ? 'pce' : products.includes('abacus') ? 'abacus' : 'none';
  const base = state.draft.modules.some(item => item.vendor === 'innosolv' &&
    item.product === 'Gemeinde' && item.item_code === '1');
  return `<section class="chiffrage-section"><h2>${localLabel('Bases du client', 'Grundlagen der Gemeinde')}</h2>
    <div class="chiffrage-grid">
      <label>${t('chiffrage.name')}<input data-field="title" value="${escape(state.title)}"></label>
      ${field('dimensions.population', state.draft.dimensions.population, t('chiffrage.population'))}
      ${field('dimensions.licensedPopulation', state.draft.dimensions.licensedPopulation ?? state.draft.dimensions.population, t('chiffrage.licensedPopulation'))}
      ${field('dimensions.meters', state.draft.dimensions.meters, t('chiffrage.meters'))}
      ${field('dimensions.taxes', state.draft.dimensions.taxes, t('chiffrage.taxes'))}
      ${field('dimensions.employees', state.draft.dimensions.employees, t('chiffrage.employees'))}
    </div><p class="chiffrage-helper">${t('chiffrage.catalog', { version: Object.keys(state.versions).join(' / ') })}</p></section>
    <section class="chiffrage-section"><h2>${localLabel('Choix structurants', 'Grundentscheidungen')}</h2>
      <div class="chiffrage-choice-row"><label class="chiffrage-choice"><input type="checkbox" data-product="innosolv" ${products.includes('innosolv') ? 'checked' : ''}>innosolvcity</label>
      <span>${base ? localLabel('Système de base inclus', 'Basissystem enthalten') : localLabel('Activer pour ajouter le système de base', 'Aktivieren, um das Basissystem hinzuzufügen')}</span></div>
      <h3>ERP</h3><div class="chiffrage-choice-group">${[
        ['pce','ProConcept'],['abacus','Abacus'],['both',localLabel('Les deux', 'Beide')],['none',localLabel('Aucun', 'Keines')]
      ].map(([value,label]) => `<label class="chiffrage-choice"><input type="radio" name="chiffrage-erp" data-erp="${value}" ${erp === value ? 'checked' : ''}>${label}</label>`).join('')}</div>
      <p class="chiffrage-helper">${localLabel('Le choix ERP adapte le module d’intégration innosolv : 22 ProConcept, 21 Abacus. Les options de chaque logiciel restent modifiables.', 'Die ERP-Wahl passt das innosolv-Integrationsmodul an: 22 ProConcept, 21 Abacus. Weitere Optionen bleiben anpassbar.')}</p>
      <h3>${localLabel('Compteurs', 'Zähler')}</h3><p class="chiffrage-warning">${localLabel('Les licences 501, 502 et 533 sont bien présentes, mais leurs règles de prix « Versorger » ne sont pas validées. Le groupe automatique attend la validation des tarifs.', 'Die Lizenzen 501, 502 und 533 sind vorhanden, aber ihre Versorger-Preisregeln sind noch nicht bestätigt.')}</p>
      <button type="button" class="chiffrage-button" data-editor-tab="modules">${localLabel('Voir les licences et options', 'Lizenzen und Optionen anzeigen')}</button></section>
    ${lcmSection()}${hostingSection()}`;
}

function summary() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch (error) { return `<aside class="chiffrage-summary"><p class="chiffrage-warning">${escape(error.message)}</p></aside>`; }
  const s = result.summary;
  return `<aside class="chiffrage-summary"><h2>${localLabel('Offre en un regard', 'Angebot auf einen Blick')}</h2>
    <dl class="chiffrage-totals">
      <div><dt>${t('chiffrage.investment')} HT</dt><dd>${money(s.investment)}</dd></div>
      <div><dt>${t('chiffrage.annual')} HT</dt><dd>${money(s.annual)}</dd></div>
      <div><dt>${localLabel('Sur 5 ans HT', 'Über 5 Jahre')} </dt><dd>${money(s.tco5y)}</dd></div></dl>
    <div class="chiffrage-summary-bases">
      <span>${t('chiffrage.population')}: <strong>${number(state.draft.dimensions.population)}</strong></span>
      <span>${t('chiffrage.licensedPopulation')}: <strong>${number(state.draft.dimensions.licensedPopulation ?? state.draft.dimensions.population)}</strong></span>
      <span>${t('chiffrage.meters')}: <strong>${number(state.draft.dimensions.meters ?? 0)}</strong></span>
      <span>ERP: <strong>${state.draft.products.includes('pce') ? 'ProConcept' : ''}${state.draft.products.includes('pce') && state.draft.products.includes('abacus') ? ' + ' : ''}${state.draft.products.includes('abacus') ? 'Abacus' : ''}${!state.draft.products.some(p => ['pce','abacus'].includes(p)) ? '—' : ''}</strong></span>
      <span>LCM: <strong>${state.draft.lcm?.selection && state.draft.lcm.selection !== 'none' ? escape(state.draft.lcm.selection) : '—'}</strong></span>
    </div></aside>`;
}

function analysis() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch (error) { return `<p class="chiffrage-warning">${escape(error.message)}</p>`; }
  const s = result.summary;
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
  return `<section class="chiffrage-section"><h2>${localLabel('Présentation de l’offre', 'Angebotsübersicht')}</h2>
    <div class="chiffrage-summary-breakdown">
      <div class="chiffrage-table-scroll"><table class="chiffrage-detail"><thead><tr>
        <th>${t('chiffrage.detail')}</th><th>${t('chiffrage.investment')}</th>
        <th>${t('chiffrage.annual')}</th></tr></thead><tbody>
        ${buckets.map(([label, filter]) => `<tr><th>${escape(label)}</th>
          <td>${money(total(filter,'investment_pv'))}</td><td>${money(total(filter,'annual_pv'))}</td></tr>`).join('')}
        <tr><th>${t('chiffrage.total')}</th><td>${money(s.investment)}</td><td>${money(s.annual)}</td></tr>
        </tbody></table></div>
    </div></section><section class="chiffrage-section"><h2>${localLabel('Analyse interne', 'Interne Analyse')}</h2>
    <p>${t('chiffrage.tco')} : <strong>${money(s.tco5y)}</strong></p>
    <p>${t('chiffrage.margin')} · ${localLabel('logiciels sur 5 ans', 'Software über 5 Jahre')} : <strong>${money(s.software_margin_5y)}</strong></p>
    <p class="chiffrage-margin-note">${t('chiffrage.year2')} : ${money(s.software_margin_year2)} · ${t('chiffrage.year3')} : ${money(s.software_margin_year3plus)}</p>
    <p class="chiffrage-margin-note">LCM Gold : ${money(s.lcm.gold?.effective_value)} · Platinum : ${money(s.lcm.platinium?.effective_value)}</p>
    ${['gold','platinium'].map(key => s.lcm[key]?.source ? `<small>${key}: ${
      t('chiffrage.lcmEstimate')} · ${escape(s.lcm[key].source.method)} · ${
      s.lcm[key].source.sample_size ?? 0} ${t('chiffrage.contracts')}</small>` : '').join('')}
    ${s.lcm.missing_reference ? `<p class="chiffrage-warning">${t('chiffrage.lcmMissing')}</p>` : ''}
    ${s.incomplete_costs.length ? `<p class="chiffrage-warning">${t('chiffrage.incomplete')}: ${escape(s.incomplete_costs.join(', '))}</p>` : ''}</section>`;
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
      <th>${t('chiffrage.modules')}</th><th>SW-ID / ID</th><th>${t('chiffrage.quantity')}</th><th>${t('chiffrage.investment')}</th>
      <th>${t('chiffrage.annual')} PV</th><th>${t('chiffrage.annual')} PA</th>
      <th>${t('chiffrage.annualMargin')}</th><th>${t('chiffrage.catalog', { version: '' })}</th>
    </tr></thead><tbody>${ordered.map(line => `<tr>
      <td>${line.family === 'prestations_module' ? '↳ ' + t('chiffrage.moduleServices') + ' · ' : ''}${escape(line.label)}${line.supplier ? `<small> · ${escape(line.supplier)}</small>` : ''}</td><td>${escape(line.item_code ?? '—')}</td><td>${line.selected_days == null ? line.quantity ?? '—' : `${number(line.selected_days)} j`}</td>
      <td>${money(line.investment_pv)}</td><td>${money(line.annual_pv)}</td>
      <td>${money(line.annual_pa)}</td><td>${money(line.annual_pa == null ? null :
        (line.annual_pv ?? 0) - line.annual_pa)}</td>
      <td>${escape(line.explanation?.source ?? '—')}${line.explanation?.kind ? ` · ${escape(line.explanation.kind)}` : ''}
        ${line.license_value == null ? '' : ` · ${t('chiffrage.theoreticalBase')} ${money(line.license_value)}`}
        ${line.overrides?.pa == null ? '' : ` · ${t('chiffrage.manualPa')}`}
        ${line.overrides?.pv == null ? '' : ` · ${t('chiffrage.manualPv')}`}
        ${line.overrides?.investment == null ? '' : ` · ${t('chiffrage.theoreticalPv')} ${money(line.calculated_investment)}`}</td></tr>`).join('')}</tbody></table></div></details>`;
}

function renderEditor() {
  state.mode = 'editor';
  const tabs = [
    ['composer', localLabel('Composer', 'Zusammenstellen')],
    ['modules', localLabel('Licences et options', 'Lizenzen und Optionen')],
    ['prestations', localLabel('Prestations', 'Leistungen')],
    ['rates', localLabel('PV et taux', 'VP und Sätze')],
    ['analysis', localLabel('Analyse', 'Analyse')]
  ];
  root.innerHTML = header() + `<div class="chiffrage-layout"><div id="chiffrageSummary">${summary()}</div>
    <nav class="chiffrage-work-tabs" aria-label="${localLabel('Parties du chiffrage', 'Bereiche der Kalkulation')}">${tabs.map(([key,label]) =>
    `<button type="button" data-editor-tab="${key}" aria-current="${state.editorTab === key ? 'page' : 'false'}">${label}</button>`).join('')}</nav>
    <div class="chiffrage-fields">
    <div class="chiffrage-tab-panel" data-tab-panel="composer" ${state.editorTab === 'composer' ? '' : 'hidden'}>${composerSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="modules" ${state.editorTab === 'modules' ? '' : 'hidden'}>${productSection()}
      ${state.draft.products.includes('pce') ? `<section class="chiffrage-section"><h2>ProConcept ERP</h2>
        <div class="chiffrage-choice-group"><label class="chiffrage-choice"><input type="checkbox" data-field="pce.finances" ${state.draft.pce.finances ? 'checked' : ''}>${t('chiffrage.finances')} · ${localLabel('base', 'Basis')}</label>
        <label class="chiffrage-choice"><input type="checkbox" data-field="pce.salaires" ${state.draft.pce.salaires ? 'checked' : ''}>${t('chiffrage.payroll')} · ${localLabel('option', 'Option')}</label></div></section>` : ''}
      ${extraSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="prestations" ${state.editorTab === 'prestations' ? '' : 'hidden'}>${serviceSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="rates" ${state.editorTab === 'rates' ? '' : 'hidden'}>${rateInventory()}${technicalSection()}</div>
    <div class="chiffrage-tab-panel" data-tab-panel="analysis" ${state.editorTab === 'analysis' ? '' : 'hidden'}><div id="chiffrageAnalysis">${analysis()}</div><div id="chiffrageDetail">${lineDetail()}</div></div>
    <div class="chiffrage-actions"><button class="chiffrage-button primary" data-action="save">${t('chiffrage.save')}</button>
      ${state.quote ? `<button class="chiffrage-button" data-action="duplicate">${t('chiffrage.duplicate')}</button>
      <button class="chiffrage-button" data-action="archive">${t('chiffrage.archive')}</button>
      <button class="chiffrage-button chiffrage-danger" data-action="delete">${
        localLabel('Supprimer définitivement', 'Endgültig löschen')}</button>
      <button class="chiffrage-button" data-action="revisions">${t('chiffrage.revisions')}</button>
      <button class="chiffrage-button" data-action="export">${t('chiffrage.export')}</button>` : ''}</div>
    <div id="chiffrageHistory"></div></div></div>`;
}

function setValue(path, raw, isCheckbox = false) {
  if (path === 'title') { state.title = raw; return; }
  if (path === 'showArchived') { state.showArchived = isCheckbox && raw; renderList(); return; }
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
    if (path === 'dimensions.population') {
      const oldDefault = licensedPopulation(state.draft.dimensions.population);
      const follow = state.draft.dimensions.licensedPopulation === oldDefault;
      state.draft.dimensions.population = raw === '' ? 0 : Number(raw);
      if (follow) {
        state.draft.dimensions.licensedPopulation = licensedPopulation(state.draft.dimensions.population);
        const input = root.querySelector('[data-field="dimensions.licensedPopulation"]');
        if (input) input.value = state.draft.dimensions.licensedPopulation;
      }
      return;
    }
    state.draft[parts[0]][parts[1]] = path === 'lcm.selection' ? raw :
      isCheckbox ? Boolean(raw) : raw === '' ? null : Number(raw);
  }
}

function changeProduct(key, checked) {
  state.draft.products = checked ? [...state.draft.products, key] :
    state.draft.products.filter(value => value !== key);
  state.draft.modules = state.draft.modules.filter(item => state.draft.products.includes(item.vendor));
  if (checked) for (const item of state.catalog.items.filter(item =>
    item.vendor === key && item.default_selected &&
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
  renderEditor();
}

function chooseErp(choice) {
  const wanted = choice === 'both' ? ['pce', 'abacus'] :
    ['pce', 'abacus'].includes(choice) ? [choice] : [];
  const hadAbacus = state.draft.products.includes('abacus');
  state.draft.products = state.draft.products.filter(p => !['pce', 'abacus'].includes(p)).concat(wanted);
  state.draft.modules = state.draft.modules.filter(item =>
    item.vendor !== 'abacus' || wanted.includes('abacus'));
  if (wanted.includes('abacus') && !hadAbacus) {
    for (const item of state.catalog.items.filter(item => item.vendor === 'abacus' &&
      item.product === 'ERP' && item.default_selected)) {
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
  renderEditor();
}

async function load() {
  if (state.loaded) { openPendingCommune(); return; }
  if (state.loading) return state.loading;
  state.loading = (async () => {
    root.innerHTML = `<p>${t('chiffrage.loading')}</p>`;
    try {
    await api('status');
    state.authenticated = true;
    const [catalog, quotes] = await Promise.all([api('catalog'), api('list', undefined,
      { archived: 'all' })]);
    state.versions = catalog.active;
    state.catalog = catalog.catalog;
    state.quotes = quotes;
    state.loaded = true;
    renderList();
    openPendingCommune();
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
  state.editorTab = 'composer';
  renderEditor();
}

root.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.target.id === 'chiffrageLogin') {
    const button = event.target.querySelector('button'); button.disabled = true;
    try { const login = await api('login', { code: event.target.elements.code.value });
      state.session = login.session; sessionStorage.setItem(sessionKey, login.session);
      state.loaded = false; state.message = ''; await load(); }
    catch { notice(t('chiffrage.denied'), true); button.disabled = false; }
  } else if (event.target.id === 'chiffrageChoose') {
    const value = document.getElementById('chiffrageCommuneSearch').value;
    const row = communes().find(item => communeOption(item) === value);
    if (row) firstDraft(row); else notice(t('chiffrage.selectCommune'), true);
  }
});

root.addEventListener('input', event => {
  const path = event.target.dataset.field;
  if (!path || !state.draft) return;
  setValue(path, event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    event.target.type === 'checkbox');
  if (path.startsWith('moduleService.') && path.endsWith('.days')) {
    const caption = event.target.closest('.chiffrage-module-service')?.querySelector('small');
    if (caption) caption.textContent = `${localLabel('Prix par jour', 'Tagessatz')} : ${
      money(dayRate())} · ${t('chiffrage.investment')} : ${
      money(event.target.value === '' ? null : Number(event.target.value) * dayRate())}`;
  }
  if (path === 'dimensions.population' || path === 'lcm.gold' || path === 'lcm.platinium') {
    const preview = root.querySelector('.chiffrage-lcm-prices');
    if (preview) preview.innerHTML = lcmPrices();
  }
  const result = root.querySelector('#chiffrageSummary');
  if (result) result.innerHTML = summary();
  const analysisNode = root.querySelector('#chiffrageAnalysis');
  if (analysisNode) analysisNode.innerHTML = analysis();
  const detail = root.querySelector('#chiffrageDetail');
  if (detail) detail.innerHTML = lineDetail();
  notice('');
});

root.addEventListener('change', event => {
  if (event.target.dataset.field === 'showArchived') {
    state.showArchived = event.target.checked; renderList(); return;
  }
  if (event.target.dataset.product) { changeProduct(event.target.dataset.product, event.target.checked); return; }
  if (event.target.dataset.erp) { chooseErp(event.target.dataset.erp); return; }
  if (event.target.dataset.module) {
    const [vendor, product, item_code] = event.target.dataset.module.split('/');
    state.draft.modules = state.draft.modules.filter(item =>
      !(item.vendor === vendor && item.product === product && item.item_code === item_code));
    if (event.target.checked) {
      state.draft.modules.push({ vendor, product, item_code });
      addModuleService(`${vendor}/${product}/${item_code}`);
    } else state.draft.moduleServices = state.draft.moduleServices.filter(line =>
      line.item_code !== `${vendor}/${product}/${item_code}`);
    renderEditor();
  }
  if (event.target.dataset.field?.endsWith('.level')) {
    setValue(event.target.dataset.field, event.target.value);
    root.querySelector('#chiffrageSummary').innerHTML = summary();
  }
  if (event.target.dataset.field === 'lcm.selection') {
    root.querySelector('#chiffrageSummary').innerHTML = summary();
    root.querySelector('#chiffrageDetail').innerHTML = lineDetail();
  }
});

root.addEventListener('click', async event => {
  const tab = event.target.closest('[data-editor-tab]');
  if (tab && state.mode === 'editor') {
    state.editorTab = tab.dataset.editorTab;
    root.querySelectorAll('[data-tab-panel]').forEach(panel => { panel.hidden = panel.dataset.tabPanel !== state.editorTab; });
    root.querySelectorAll('.chiffrage-work-tabs button').forEach(button =>
      button.setAttribute('aria-current', button.dataset.editorTab === state.editorTab ? 'page' : 'false'));
    return;
  }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'new') { renderNew(); return; }
  if (action === 'list') { renderList(); return; }
  if (['addPrime','addPartner','addHosting','addLicense'].includes(action)) {
    const partner = action === 'addPartner';
    const preset = {
      addHosting: { label: t('chiffrage.hosting'), category: 'hosting' },
      addLicense: { label: t('chiffrage.primeLicense'), category: 'license' }
    }[action] ?? {};
    state.draft[partner ? 'partners' : 'primeLines'].push({
      family: partner ? 'partenaires' : 'prime', ...preset,
      quantity: 1, investment_pv: 0, annual_pv: 0 });
    renderEditor(); return;
  }
  if (action === 'removeLine') {
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
      renderList(); notice(localLabel('Chiffrage supprimé.', 'Kalkulation gelöscht.'));
      return;
    }
    if (action === 'save' || action === 'duplicate' || action === 'archive') {
      const duplicate = action === 'duplicate';
      const saved = await api('save', { id: duplicate ? undefined : state.quote ?? undefined,
        expected_revision: duplicate ? null : state.revision,
        title: state.title + (duplicate ? ' — copie' : ''),
        archived: action === 'archive', catalog_versions: state.versions,
        input: state.draft });
      state.quote = saved.id; state.revision = saved.revision;
      state.archived = action === 'archive';
      state.quotes = await api('list', undefined, { archived: 'all' });
      if (action === 'archive') renderList();
      else { if (duplicate) state.title += ' — copie';
        renderEditor(); notice(t('chiffrage.saved')); }
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
        input: old.snapshot.input });
      state.draft = old.snapshot.input; state.versions = old.snapshot.catalog_versions;
      state.revision = saved.revision; state.archived = false;
      const catalog = await api('catalog', undefined,
        { versions: JSON.stringify(state.versions) });
      state.catalog = catalog.catalog; renderEditor(); notice(t('chiffrage.saved'));
      return;
    }
    if (action === 'export') {
      const response = await fetch(`${endpoint}?action=export&id=${encodeURIComponent(state.quote)}`,
        { headers: { Authorization: `Bearer ${state.session}` }, cache: 'no-store' });
      if (!response.ok) throw new Error(t('chiffrage.error'));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(await response.blob());
      link.download = `chiffrage-${state.draft.bfs_id}.xlsx`;
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 60000);
      return;
    }
  } catch (error) { notice(error.status === 409 ? 'Révision modifiée ailleurs. Recharge le chiffrage.' :
    t('chiffrage.error'), true); }
  finally { if (button.isConnected) button.disabled = false; }
});

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
