import { t, number } from '../core/i18n.js?v=20260928-chiffrage-mobile';
import { subscribePreferences } from '../core/preferences.js';
import { calculateQuote, licensedPopulation, suggestedSqlUsers } from './calculate.js?v=20260928-offre-client-3';

const root = document.getElementById('chiffrageRoot');
const runtime = window.PrimeCommunesRuntime;
const escape = runtime.escapeHtml;
const endpoint = `${window.SUPABASE_URL}/functions/v1/chiffrage`;
const sessionKey = 'prime-chiffrage-session';
const state = { authenticated: false, loaded: false, catalog: null, versions: {},
  quotes: [], quote: null, draft: null, revision: null, title: '', archived: false,
  showArchived: false, mode: 'list', message: '', error: false, loading: null,
  pendingCommune: null,
  session: sessionStorage.getItem(sessionKey) };
const money = value => value == null ? '—' : `${number(value, {
  minimumFractionDigits: 0, maximumFractionDigits: 0 })} CHF`;
const field = (key, value, label, { min = 0, step = 1 } = {}) =>
  `<label>${label}<input data-field="${key}" type="number" min="${min}" step="${step}" value="${escape(value ?? '')}"></label>`;
const textField = (key, value, label) =>
  `<label>${label}<input data-field="${key}" value="${escape(value ?? '')}"></label>`;

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
    partners: [], pce: { finances: true, salaires: true, interfacePa: 0 },
    oracle: { full: 0, light: 0 }, sql: {}, lcm: {} };
  state.title = `${row.name} — Variante 1`;
  state.revision = null;
  state.quote = null;
  state.archived = false;
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

function productSection() {
  const products = [['innosolv', 'innosolvcity'], ['abacus', 'Abacus'],
    ['pce', 'ProConcept ERP']];
  const choices = products.map(([key, label]) => `<label class="chiffrage-choice"><input
    type="checkbox" data-product="${key}" ${state.draft.products.includes(key) ? 'checked' : ''}>${label}</label>`).join('');
  const selected = new Set(state.draft.modules.map(item => `${item.vendor}/${item.product}/${item.item_code}`));
  const modules = availableModules().sort((a, b) => Number(b.default_selected) - Number(a.default_selected));
  const groups = new Map();
  for (const item of modules) {
    const key = item.vendor === 'abacus' ? `Abacus · ${item.item_code.split('.')[0]}` :
      `${item.vendor} · ${item.product}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.products')}</summary>
    <div class="chiffrage-grid">${choices}</div></details>
    <details class="chiffrage-section" open><summary>${t('chiffrage.modules')}</summary>
      <div class="chiffrage-module-groups">${[...groups].map(([group, entries]) =>
    `<details ${entries.some(item => selected.has(`${item.vendor}/${item.product}/${item.item_code}`)) ? 'open' : ''}>
      <summary>${escape(group)} · ${entries.length}</summary><div class="chiffrage-module-list">${entries.map(item => {
        const id = `${item.vendor}/${item.product}/${item.item_code}`;
        const current = state.draft.moduleServices.find(line => line.item_code === id);
        return `<div class="chiffrage-module-entry"><label><input type="checkbox" data-module="${escape(id)}" ${selected.has(id) ? 'checked' : ''}>
          <span><small>${escape(item.item_code)} · ${escape(item.vendor)}</small><br>${escape(item.label_fr || item.label_de || item.item_code)}</span></label>
          ${selected.has(id) ? `<div class="chiffrage-module-service">
            <label>${t('chiffrage.level')}<select data-field="moduleService.${escape(id)}.level">
              ${['standard','enhanced','custom'].map(level => `<option value="${level}" ${
                (current?.level ?? 'standard') === level ? 'selected' : ''}>${t('chiffrage.' + level)}</option>`).join('')}</select></label>
            ${field(`moduleService.${id}.days`, current?.days, t('chiffrage.days'), { step: .5 })}
          </div>` : ''}</div>`;
      }).join('')}</div></details>`).join('') || '—'}</div></details>`;
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
  return `<details class="chiffrage-section"><summary>${t('chiffrage.override')} · PA / PV</summary>
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
      ${field('pce.interfacePa', state.draft.pce.interfacePa, 'Interface PCE–ISAG (PA)')}
      <label class="chiffrage-choice"><input type="checkbox" data-field="pce.finances" ${state.draft.pce.finances ? 'checked' : ''}>${t('chiffrage.finances')}</label>
      <label class="chiffrage-choice"><input type="checkbox" data-field="pce.salaires" ${state.draft.pce.salaires ? 'checked' : ''}>${t('chiffrage.payroll')}</label></div>` : ''}</details>`;
}

function extraSection() {
  return `<details class="chiffrage-section" open><summary>${t('chiffrage.partners')}</summary>
    <p>${t('chiffrage.supportSplitHint')}</p>
    ${[...state.draft.primeLines.map((line, index) => ({ ...line, kind: 'primeLines', index })),
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
    <div class="chiffrage-actions"><button type="button" class="chiffrage-button" data-action="addHosting">${t('chiffrage.addHosting')}</button>
      <button type="button" class="chiffrage-button" data-action="addLicense">${t('chiffrage.addPrimeLicense')}</button>
      <button type="button" class="chiffrage-button" data-action="addSupport">${t('chiffrage.addPrimeSupport')}</button>
      <button type="button" class="chiffrage-button" data-action="addPrime">${t('chiffrage.addLine')} Prime</button>
      <button type="button" class="chiffrage-button" data-action="addPartner">${t('chiffrage.addLine')} ${t('chiffrage.partner')}</button></div></details>`;
}

function lcmSection() {
  return `<details class="chiffrage-section"><summary>${t('chiffrage.lcm')}</summary>
    <div class="chiffrage-grid"><label>${t('chiffrage.lcmSelection')}<select data-field="lcm.selection">
      ${[['none', t('chiffrage.lcmNone')], ['gold','Gold'], ['platinium','Platinum']].map(([key,label]) =>
        `<option value="${key}" ${(state.draft.lcm.selection ?? 'none') === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>${field('lcm.gold', state.draft.lcm.gold,
      'LCM Gold · ' + t('chiffrage.override'))}
      ${field('lcm.platinium', state.draft.lcm.platinium,
        'LCM Platinium · ' + t('chiffrage.override'))}</div></details>`;
}

function summary() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch (error) { return `<aside class="chiffrage-summary"><p class="chiffrage-warning">${escape(error.message)}</p></aside>`; }
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
  return `<aside class="chiffrage-summary"><div class="chiffrage-summary-bases">
    <span>${t('chiffrage.population')}: <strong>${number(state.draft.dimensions.population)}</strong></span>
    <span>${t('chiffrage.licensedPopulation')}: <strong>${number(
      state.draft.dimensions.licensedPopulation ?? state.draft.dimensions.population)}</strong></span>
    <span>${t('chiffrage.meters')}: <strong>${number(state.draft.dimensions.meters ?? 0)}</strong></span></div><dl>
    <div><dt>${t('chiffrage.investment')}</dt><dd>${money(s.investment)}</dd></div>
    <div><dt>${t('chiffrage.annual')}</dt><dd>${money(s.annual)}</dd></div>
    <div><dt>${t('chiffrage.tco')}</dt><dd>${money(s.tco5y)}</dd></div>
    <div><dt>${t('chiffrage.margin')}</dt><dd>${money(s.software_margin_5y)}</dd></div>
    <div><dt>${t('chiffrage.year2')}</dt><dd>${money(s.software_margin_year2)}</dd></div>
    <div><dt>${t('chiffrage.year3')}</dt><dd>${money(s.software_margin_year3plus)}</dd></div>
    <div><dt>Gold</dt><dd>${money(s.lcm.gold?.effective_value)}</dd></div>
    <div><dt>${t('chiffrage.lcmFiveYears')} Gold</dt><dd>${money(s.lcm.gold?.five_year_option)}</dd></div>
    <div><dt>Platinium</dt><dd>${money(s.lcm.platinium?.effective_value)}</dd></div>
    <div><dt>${t('chiffrage.lcmFiveYears')} Platinium</dt><dd>${money(s.lcm.platinium?.five_year_option)}</dd></div></dl>
    <details class="chiffrage-summary-breakdown" open><summary>${t('chiffrage.costBreakdown')}</summary>
      <div class="chiffrage-table-scroll"><table class="chiffrage-detail"><thead><tr>
        <th>${t('chiffrage.detail')}</th><th>${t('chiffrage.investment')}</th>
        <th>${t('chiffrage.annual')}</th></tr></thead><tbody>
        ${buckets.map(([label, filter]) => `<tr><th>${escape(label)}</th>
          <td>${money(total(filter,'investment_pv'))}</td><td>${money(total(filter,'annual_pv'))}</td></tr>`).join('')}
        <tr><th>${t('chiffrage.total')}</th><td>${money(s.investment)}</td><td>${money(s.annual)}</td></tr>
        </tbody></table></div></details>
    ${['gold','platinium'].map(key => s.lcm[key]?.source ? `<small>${key}: ${
      t('chiffrage.lcmEstimate')} · ${escape(s.lcm[key].source.method)} · ${
      s.lcm[key].source.sample_size ?? 0} ${t('chiffrage.contracts')}</small>` : '').join('')}
    ${s.lcm.missing_reference ? `<p class="chiffrage-warning">${t('chiffrage.lcmMissing')}</p>` : ''}
    ${s.incomplete_costs.length ? `<p class="chiffrage-warning">${t('chiffrage.incomplete')}: ${escape(s.incomplete_costs.join(', '))}</p>` : ''}</aside>`;
}

function lineDetail() {
  let result;
  try { result = calculateQuote(state.draft, state.catalog); }
  catch { return ''; }
  const ordered = [...result.lines].sort((a, b) => {
    const rank = line => {
      const position = result.lines.indexOf(line);
      if (line.family !== 'prestations_module') return position;
      const parent = result.lines.findIndex(item =>
        `${item.family}/${item.product}/${item.item_code}` === line.item_code);
      return parent < 0 ? position : parent + .5;
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
  root.innerHTML = header() + `<div class="chiffrage-layout"><div id="chiffrageSummary">${summary()}</div><div class="chiffrage-fields">
    <div class="chiffrage-section"><div class="chiffrage-grid">
      <label>${t('chiffrage.name')}<input data-field="title" value="${escape(state.title)}"></label>
      <label>${t('chiffrage.catalog', { version: Object.keys(state.versions).join(' / ') })}</label>
      ${field('dimensions.population', state.draft.dimensions.population, t('chiffrage.population'))}
      ${field('dimensions.licensedPopulation', state.draft.dimensions.licensedPopulation ??
        state.draft.dimensions.population, t('chiffrage.licensedPopulation'))}
      ${field('dimensions.meters', state.draft.dimensions.meters, t('chiffrage.meters'))}
      ${field('dimensions.taxes', state.draft.dimensions.taxes, t('chiffrage.taxes'))}
      ${field('dimensions.employees', state.draft.dimensions.employees, t('chiffrage.employees'))}
    </div></div>${productSection()}${publisherOverridesSection()}${technicalSection()}
    ${serviceSection()}${extraSection()}${lcmSection()}<div id="chiffrageDetail">${lineDetail()}</div>
    <div class="chiffrage-actions"><button class="chiffrage-button primary" data-action="save">${t('chiffrage.save')}</button>
      ${state.quote ? `<button class="chiffrage-button" data-action="duplicate">${t('chiffrage.duplicate')}</button>
      <button class="chiffrage-button" data-action="archive">${t('chiffrage.archive')}</button>
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
  }
  state.draft.moduleServices = state.draft.moduleServices.filter(item =>
    state.draft.modules.some(module => item.item_code ===
      `${module.vendor}/${module.product}/${module.item_code}`));
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
  const result = root.querySelector('#chiffrageSummary');
  if (result) result.innerHTML = summary();
  const detail = root.querySelector('#chiffrageDetail');
  if (detail) detail.innerHTML = lineDetail();
  notice('');
});

root.addEventListener('change', event => {
  if (event.target.dataset.field === 'showArchived') {
    state.showArchived = event.target.checked; renderList(); return;
  }
  if (event.target.dataset.product) { changeProduct(event.target.dataset.product, event.target.checked); return; }
  if (event.target.dataset.module) {
    const [vendor, product, item_code] = event.target.dataset.module.split('/');
    state.draft.modules = state.draft.modules.filter(item =>
      !(item.vendor === vendor && item.product === product && item.item_code === item_code));
    if (event.target.checked) state.draft.modules.push({ vendor, product, item_code });
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
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'new') { renderNew(); return; }
  if (action === 'list') { renderList(); return; }
  if (['addPrime','addPartner','addHosting','addLicense','addSupport'].includes(action)) {
    const partner = action === 'addPartner';
    const preset = {
      addHosting: { label: t('chiffrage.hosting'), category: 'hosting' },
      addLicense: { label: t('chiffrage.primeLicense'), category: 'license' },
      addSupport: { label: t('chiffrage.primeSupport'), category: 'support' }
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
  button.disabled = true;
  try {
    if (action === 'logout') {
      await api('logout', {}); state.session = null; sessionStorage.removeItem(sessionKey);
      state.loaded = false; state.authenticated = false;
      state.catalog = null; state.quotes = []; state.draft = null; state.pendingCommune = null;
      state.message = ''; renderLogin(); return;
    }
    if (action === 'open') { await open(button.dataset.id); return; }
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
