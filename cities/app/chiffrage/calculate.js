// Pure calculation domain. Real catalogs and commercial parameters are loaded
// from the protected server store, never from this public source file.
import { hostingIncluded } from './configuration.js';
import { serviceApplies } from './standards.js';

const finite = (value, name) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${name}`);
  return number;
};

const optionalMoney = value => value == null ? null : finite(value, 'amount');
const roundTo = (value, multiple) => {
  const step = finite(multiple, 'rounding step');
  if (step <= 0) throw new Error('Rounding step must be positive');
  return Math.floor(value / step + 0.5) * step;
};

export const licensedPopulation = population =>
  Math.ceil(Math.max(0, finite(population, 'population')) / 500) * 500;

export function primeAnnual(line, population) {
  if (line.annual_override != null) return finite(line.annual_override, 'Prime annual override');
  if (!line.annual_rule) return line.annual_pv == null ? null : finite(line.annual_pv, 'annual PV');
  const { per_capita, round_to } = line.annual_rule;
  if (per_capita == null || round_to == null) throw new Error('Incomplete Prime annual rule');
  return roundTo(finite(population, 'population') * finite(per_capita, 'Prime rate'), round_to);
}

export function suggestedSqlUsers(population, rule) {
  const { lowerPopulation, lowerUsers, upperPopulation, upperUsers } = rule;
  const low = finite(lowerPopulation, 'lower population');
  const high = finite(upperPopulation, 'upper population');
  if (high <= low) throw new Error('Invalid SQL population anchors');
  const fraction = (finite(population, 'population') - low) / (high - low);
  return Math.max(0, Math.round(finite(lowerUsers, 'lower users') + fraction *
    (finite(upperUsers, 'upper users') - finite(lowerUsers, 'lower users'))));
}

export function effective(calculatedValue, overrideValue = null) {
  const calculated = finite(calculatedValue, 'calculated value');
  const override = overrideValue == null ? null : finite(overrideValue, 'override');
  return { calculated_value: calculated, override_value: override,
    effective_value: override ?? calculated, difference: override == null ? 0 : override - calculated };
}

// Catalog rules describe the source formula explicitly. A missing rule fails
// closed; the engine never interpolates an unknown editor price.
export function priceCatalogItem(item, dimensions) {
  const rule = item.pricing_rule;
  if (!rule || !Array.isArray(rule.tiers) || !rule.tiers.length) {
    throw new Error(`Missing pricing rule for ${item.item_code}`);
  }
  const rawQuantity = finite(dimensions[rule.basis], rule.basis);
  const roundedQuantity = rule.quantity_round_to ? Math.ceil(rawQuantity / rule.quantity_round_to) * rule.quantity_round_to : rawQuantity;
  const quantity = rawQuantity === 0 && rule.zero_is_free ? 0 : Math.max(roundedQuantity, rule.minimum_basis ?? 0);
  if (quantity === 0 && rule.zero_is_free) return { value: 0, explanation: {
    item_code: item.item_code, basis: rule.basis, quantity, source: item.source,
    catalog_version: item.catalog_version, kind: rule.kind } };
  const tiers = [...rule.tiers].sort((a, b) => a.up_to - b.up_to);
  const tier = tiers.find(entry => quantity <= finite(entry.up_to, 'tier boundary'));
  if (!tier && rule.above_last?.kind === 'linear_tail_estimate') {
    const last = tiers.at(-1);
    const lower = tiers.find(entry => entry.up_to === rule.above_last.from);
    if (!lower || last.up_to <= lower.up_to ||
      quantity > finite(rule.above_last.max_population, 'estimate ceiling'))
      throw new Error(`Missing tier for ${item.item_code}: ${quantity}`);
    const slope = (finite(last.value, 'last price') -
      finite(lower.value, 'lower price')) / (last.up_to - lower.up_to);
    const value = roundTo(last.value + (quantity - last.up_to) * slope,
      rule.above_last.round_to);
    return { value, explanation: { item_code: item.item_code,
      basis: rule.basis, quantity, tier_up_to: last.up_to,
      kind: 'linear_tail_estimate', anchor_lower: lower.up_to,
      anchor_upper: last.up_to, source: item.source,
      catalog_version: item.catalog_version } };
  }
  if (!tier) throw new Error(`Missing tier for ${item.item_code}: ${quantity}`);
  let value;
  if (rule.kind === 'lookup') {
    if (quantity < tiers[0].up_to && rule.below_first !== 'hold')
      throw new Error(`Missing lower tier for ${item.item_code}: ${quantity}`);
    value = finite(tier.value, 'tier value');
  }
  else if (rule.kind === 'linear_rounded') {
    const upperIndex = tiers.indexOf(tier);
    const lower = tiers[upperIndex - 1];
    if (!lower) {
      if (quantity !== tier.up_to && rule.below_first !== 'hold') {
        throw new Error(`Missing lower anchor for ${item.item_code}: ${quantity}`);
      }
      value = finite(tier.value, 'tier value');
    } else {
      const fraction = (quantity - finite(lower.up_to, 'lower anchor')) /
        (finite(tier.up_to, 'upper anchor') - finite(lower.up_to, 'lower anchor'));
      const interpolated = finite(lower.value, 'lower tier value') + fraction *
        (finite(tier.value, 'upper tier value') - finite(lower.value, 'lower tier value'));
      value = rule.value_multiplier == null ? roundTo(interpolated, rule.round_to) : interpolated;
    }
  }
  else if (rule.kind === 'rounded_ratio') {
    value = roundTo(finite(tier.ratio, 'tier ratio') * finite(rule.reference_value, 'reference value'),
      rule.round_to);
  } else throw new Error(`Unsupported pricing rule: ${rule.kind}`);
  // An explicit source multiplier is applied before the final price rounding.
  if (rule.value_multiplier != null) value = roundTo(value * finite(rule.value_multiplier, 'source multiplier'), rule.round_to);
  return { value, explanation: { item_code: item.item_code, basis: rule.basis,
    quantity, ...(quantity !== rawQuantity ? { entered_quantity: rawQuantity } : {}),
    tier_up_to: tier.up_to, kind: rule.kind, source: item.source,
    catalog_version: item.catalog_version,
    source_grid_note: item.source_grid_note ?? null } };
}

export function selectInnosolvItem(items, code, canton) {
  const wanted = code === '129' && canton === 'VD' ? '129VD' : code;
  const item = items.find(entry => entry.item_code === wanted);
  if (!item) throw new Error(`Missing innosolv item ${wanted}`);
  return item;
}

export function calculatePublisherRent(licenseValue, parameters) {
  const value = finite(licenseValue, 'license value');
  return { pa: value * finite(parameters.pa_rate, 'purchase rate'),
    pv: value * finite(parameters.pv_rate, 'sale rate') };
}

export function calculatePce(input, parameters) {
  const base = finite(input.innosolvPaBase, 'innosolv PA base');
  const ratio = finite(parameters.finance_ratio, 'finance ratio');
  const adjustment = finite(parameters.finance_adjustment, 'finance adjustment');
  const sourceOptions = parameters.finance_basis === 'innosolv_plus_options';
  const interfacePa = finite(sourceOptions ? input.interfacePv ?? parameters.interface_pv ?? 0 : input.interfacePa ?? 0, 'interface allocation');
  const optionsBase = sourceOptions ? finite(input.innosolvOptionsPa ?? 0, 'innosolv options PA') : adjustment;
  const beforeFinanceRounding = (base + optionsBase) * ratio;
  const financeRounded = roundTo(beforeFinanceRounding, parameters.finance_round_to);
  const financePa = financeRounded - interfacePa;
  const salaryBase = financeRounded / 2;
  const salaryPa = roundTo(salaryBase, parameters.salary_round_to);
  const pa = { finances: effective(financePa, input.financePaOverride),
    salaires: effective(salaryPa, input.salaryPaOverride) };
  const margin = finite(parameters.pv_margin, 'PCE PV margin');
  if (margin < 0 || margin >= 1) throw new Error('Invalid PCE PV margin');
  const financePv = roundTo(financeRounded / (1 - margin), parameters.pv_round_to) - interfacePa;
  const salaryPv = roundTo(parameters.salary_pv_method === 'markup' ? salaryPa * (1 + margin) :
    salaryPa / (1 - margin), parameters.pv_round_to);
  const pv = { finances: effective(financePv, input.financePvOverride),
    salaires: effective(salaryPv, input.salaryPvOverride) };
  return { pa, pv, explanation: { innosolvPaBase: base, adjustment, ratio,
    beforeFinanceRounding, financeRounded, interfacePa, financePa,
    salaryBase, salaryPa, margin, financePv, salaryPv } };
}

export function calculateSql(input, rule) {
  const usersSuggested = suggestedSqlUsers(input.population, rule.suggestion);
  const users = finite(input.users ?? usersSuggested, 'SQL users');
  const threshold = finite(rule.core_from_population, 'SQL core threshold');
  const base = finite(rule.user_base, 'SQL user base');
  const userPrice = finite(rule.price_per_user, 'SQL price per user');
  const cores = finite(input.cores ?? rule.default_cores, 'SQL cores');
  const pricePerCore = rule.price_per_core == null ? null :
    finite(rule.price_per_core, 'SQL price per core');
  const useCores = input.population >= threshold;
  const missingPrice = useCores && pricePerCore == null && input.override == null;
  const calculated = useCores && pricePerCore == null ? null :
    useCores ? cores * pricePerCore : base + users * userPrice;
  return { usersSuggested, users, cores, regime: useCores ? 'core' : 'user',
    amount: calculated == null ? { calculated_value: null,
      override_value: missingPrice ? null : finite(input.override, 'SQL investment PV'),
      effective_value: missingPrice ? null : finite(input.override, 'SQL investment PV'), difference: null } :
      effective(calculated, input.override),
    explanation: { threshold, base, userPrice, cores, pricePerCore } };
}

export function calculateOracle(input, rule) {
  const full = finite(input.full, 'Oracle Full users');
  const light = finite(input.light, 'Oracle Light users');
  return { investment: effective(full * finite(rule.full_price, 'Oracle Full price') +
    light * finite(rule.light_price, 'Oracle Light price'), input.investmentOverride),
    annual: effective(full * finite(rule.full_maintenance, 'Oracle Full maintenance') +
      light * finite(rule.light_maintenance, 'Oracle Light maintenance'), input.annualOverride),
    explanation: { full, light } };
}

export function calculateLcm(population, rule, overrides = {}) {
  // Commercial bands include their stated upper population bound.
  const inhabitants = finite(population, 'population');
  const entry = [...(rule ?? [])].sort((a, b) => a.up_to - b.up_to)
    .find(candidate => inhabitants <= finite(candidate.up_to, 'LCM boundary'));
  const block = entry?.up_to ?? null;
  const one = (key) => entry?.[key] == null ? (overrides[key] == null ? null :
    { calculated_value: null, override_value: finite(overrides[key], 'LCM override'),
      effective_value: finite(overrides[key], 'LCM override'), difference: null,
      five_year_option: finite(overrides[key], 'LCM override') * 4,
      source: null }) :
    { ...effective(entry[key], overrides[key]),
      five_year_option: effective(entry[key], overrides[key]).effective_value * 4,
      source: entry[`${key}_evidence`] ?? null,
      status: entry.status ?? 'versioned' };
  return { block, gold: one('gold'), platinium: one('platinium'),
    missing_reference: !entry || entry.gold == null || entry.platinium == null };
}

export function calculateQuote(input, catalog) {
  const mandate = (input.primeLines ?? []).find(line => line.item_code === 'prime-mandats-finance');
  const integrated = (input.primeLines ?? []).find(line => line.item_code === 'prime-mandats-integres');
  if (integrated && (!mandate || Number(integrated.quantity ?? 1) > Number(mandate.quantity ?? 1)))
    throw new Error('Integrated mandates require at least as many finance mandates');
  const hosting = [...(input.primeLines ?? []), ...(input.partners ?? [])]
    .filter(line => line.category === 'hosting');
  if (hostingIncluded(input) && hosting.some(line => line.reference_products?.some(product =>
    !input.products.includes(product)))) throw new Error('Hosting reference scope changed');
  const missingHosting = input.hosting?.included === true && (!hosting.length || hosting.some(line =>
    line.investment_pv == null || line.annual_pv == null));
  const lines = [];
  const choices = new Set(input.products ?? []);
  const commercial = input.commercial ?? {};
  const rate = (key, defaultValue) => {
    const value = finite(commercial[key] ?? defaultValue, key);
    if (value < 0 || value >= 1) throw new Error(`Invalid ${key}`);
    return value;
  };
  const dayRate = finite(commercial.dayRate ?? catalog.parameters.day_rate ?? 0, 'day rate');
  if (dayRate < 0) throw new Error('Invalid day rate');
  // Historic revisions without an explicit licensing base keep their original prices.
  const populationForLicenses = input.dimensions.licensedPopulation ??
    input.dimensions.population;
  if (!Number.isInteger(populationForLicenses) || populationForLicenses < input.dimensions.population)
    throw new Error('Licensed population must cover commune population');
  for (const selected of input.modules ?? []) {
    if (!choices.has(selected.vendor)) continue;
    const item = catalog.items.find(candidate => candidate.vendor === selected.vendor &&
      (!selected.product || candidate.product === selected.product) &&
      candidate.item_code === (selected.vendor === 'innosolv' && selected.item_code === '129' && input.canton === 'VD'
        ? '129VD' : selected.item_code));
    if (!item) throw new Error(`Missing catalog item ${selected.vendor}/${selected.item_code}`);
    // An unverified source must never acquire an invented automatic price.
    const manual = item.pricing_rule?.kind === 'unverified';
    if (manual && (selected.pa_override == null || selected.pv_override == null))
      throw new Error(`Manual publisher prices required: ${item.item_code}`);
    const priced = manual ? { value: null, explanation: { kind: 'manual',
      item_code: item.item_code, source: item.source, catalog_version: item.catalog_version,
      basis: item.pricing_rule.basis, quantity: input.dimensions[item.pricing_rule.basis] } } : priceCatalogItem(item, item.vendor === 'innosolv' &&
      item.pricing_rule?.basis === 'population' ?
      { ...input.dimensions, population: populationForLicenses } : input.dimensions);
    const rates = catalog.parameters.publisher_rent[selected.vendor]?.[item.rate_class ?? 'standard'];
    if (!rates) throw new Error(`Missing private rates for ${selected.vendor}/${item.rate_class ?? 'standard'}`);
    const standard = (item.rate_class ?? 'standard') === 'standard';
    const adjustedRates = standard ? { pa_rate: rate(`${selected.vendor}PaRate`, rates.pa_rate),
      pv_rate: rate(`${selected.vendor}PvRate`, rates.pv_rate) } : rates;
    const rent = manual ? { pa: selected.pa_override, pv: selected.pv_override } :
      calculatePublisherRent(priced.value, adjustedRates);
    lines.push({ family: selected.vendor, product: item.product,
      item_code: item.item_code, label: item.label_fr,
      license_value: priced.value, investment_pa: 0, investment_pv: 0,
      annual_pa: effective(rent.pa, selected.pa_override).effective_value,
      annual_pv: effective(rent.pv, selected.pv_override).effective_value,
      software: true, explanation: priced.explanation,
      overrides: { pa: selected.pa_override ?? null, pv: selected.pv_override ?? null } });
  }
  if (choices.has('pce')) {
    const independentSource = catalog.parameters.pce.finance_basis === 'innosolv_plus_options' && !choices.has('innosolv');
    if (independentSource && (input.pce.finances && input.pce.financePvOverride == null ||
      input.pce.salaires && input.pce.salaryPvOverride == null)) throw new Error('PCE standalone price required');
    const innosolvPaBase = lines.filter(line => line.family === 'innosolv')
      .reduce((sum, line) => sum + line.annual_pa, 0);
    const pce = calculatePce({ ...input.pce,
      innosolvPaBase: input.pce?.innosolvPaBaseOverride ?? innosolvPaBase,
      innosolvOptionsPa: lines.filter(line => line.family === 'innosolv' &&
        !(catalog.parameters.pce.finance_base_item_codes ?? []).includes(line.item_code === '129VD' ? '129' : line.item_code))
        .reduce((sum,line) => sum + line.annual_pa,0),
      ...(catalog.parameters.pce.finance_basis === 'innosolv_plus_options' && !choices.has('innosolv') ? {interfacePv:0} : {}) },
    { ...catalog.parameters.pce,
      pv_margin: rate('pcePvMargin', catalog.parameters.pce.pv_margin) });
    for (const key of ['finances', 'salaires']) if (input.pce[key]) {
      lines.push({ family: 'pce', item_code: key, label: key,
        investment_pa: 0, investment_pv: 0,
        annual_pa: independentSource && input.pce[key === 'finances' ? 'financePaOverride' : 'salaryPaOverride'] == null ? null : pce.pa[key].effective_value,
        annual_pv: pce.pv[key].effective_value, software: true, explanation: pce.explanation });
    }
    if (catalog.parameters.pce.finance_basis === 'innosolv_plus_options' && choices.has('innosolv'))
      lines.push({family:'pce',item_code:'interface',label:'Interface ProConcept–innosolv',
        investment_pa:0,investment_pv:0,
        annual_pa:0,
        annual_pv:finite(input.pce?.interfacePv ?? catalog.parameters.pce.interface_pv,'PCE interface PV'),software:true});
    const oracle = calculateOracle(input.oracle, catalog.parameters.oracle);
    lines.push({ family: 'technique', item_code: 'oracle', label: 'Oracle', software: false,
      investment_pa: optionalMoney(input.oracle.purchasePa), investment_pv: oracle.investment.effective_value,
      annual_pa: optionalMoney(input.oracle.maintenancePa), annual_pv: oracle.annual.effective_value,
      explanation: oracle.explanation });
  }
  if (choices.has('innosolv')) {
    const sql = calculateSql({ population: input.dimensions.population, ...input.sql }, catalog.parameters.sql);
    lines.push({ family: 'technique', item_code: 'sql', label: 'SQL Server', software: false,
      investment_pa: optionalMoney(input.sql.purchasePa), investment_pv: sql.amount.effective_value,
      annual_pa: optionalMoney(input.sql.annualPa), annual_pv: optionalMoney(input.sql.annualPv),
      explanation: sql });
  }
  for (const entry of [...(input.moduleServices ?? []), ...(input.services ?? []),
    ...(input.primeLines ?? []), ...(input.partners ?? [])]) {
    if (!serviceApplies(entry, input)) continue;
    if (input.travel && entry.family === 'prestations' && entry.item_code === 'deplacements') continue;
    if (input.projectManagement && entry.family === 'prestations' && entry.item_code === 'projet') continue;
    if (entry.category === 'hosting' && !hostingIncluded(input)) continue;
    const moduleLine = entry.family === 'prestations_module' ?
      lines.find(line => `${line.family}/${line.product}/${line.item_code}` === entry.item_code) : null;
    const quantity = entry.family === 'prime' || entry.family === 'partenaires' ?
      finite(entry.quantity ?? 1, 'line quantity') : 1;
    if (quantity < 0 || !Number.isInteger(quantity)) throw new Error('Invalid line quantity');
    const suggestedDays = entry.suggested_days ??
      catalog.parameters.service_presets?.[entry.level]?.[entry.item_code] ?? null;
    const days = entry.days ?? suggestedDays;
    const serviceValue = days == null ? null : Number(days) * finite(entry.unit_day_rate ?? dayRate, 'service day rate') +
      finite(entry.investment_fixed_pv ?? 0, 'fixed license investment');
    const investment = effective(serviceValue ?? finite(entry.investment_pv ?? 0,
      'investment PV'), entry.investment_override);
    const annualPerUnit=entry.item_code === 'prime-mandats-integres' ? primeAnnual(mandate,input.dimensions.population) :
      entry.family === 'prime' ? primeAnnual(entry, input.dimensions.population) :
      finite(entry.annual_pv ?? 0, 'annual PV');
    lines.push({ family: entry.family, category: entry.category ?? null,
      item_code: entry.item_code ?? null,
      label: moduleLine?.label ?? entry.label, supplier: entry.supplier ?? null,
      note: entry.note ?? null,
      quantity, investment_pa: optionalMoney(entry.investment_pa) == null ? null :
        optionalMoney(entry.investment_pa) * quantity,
      investment_pv: investment.effective_value * quantity,
      annual_pa: optionalMoney(entry.annual_pa) == null ? null :
        optionalMoney(entry.annual_pa) * quantity,
      annual_pv: annualPerUnit == null ? null : annualPerUnit * quantity,
      software: false, explanation: entry.explanation ?? null,
      ...(entry.gp_included ? {gp_included:true} : {}),
      suggested_days: suggestedDays, selected_days: days,
      calculated_investment: investment.calculated_value,
      overrides: { ...entry.overrides, investment: entry.investment_override ?? null } });
  }
  // New percentage-based GP is opt-in. Historic fixed project lines stay unchanged.
  if (input.projectManagement) {
    const gp = input.projectManagement;
    const percentage = finite(gp.percent, 'project management percentage');
    if (percentage < 0 || percentage > 100) throw new Error('Invalid project management percentage');
    if (gp.basis !== 'prime_service_days' || !(gp.round_days > 0))
      throw new Error('Invalid project management rule');
    const included = lines.filter(line => (['prestations_module', 'prestations'].includes(line.family) || line.gp_included) &&
      line.item_code !== 'projet' && line.selected_days != null &&
      !(gp.exclude_codes ?? []).includes(line.item_code));
    const basisDays = included.reduce((total, line) => total + finite(line.selected_days, 'service days') * (line.quantity ?? 1), 0);
    const days = roundTo(basisDays * percentage / 100, gp.round_days);
    lines.push({ family: 'prestations', item_code: 'projet', label: gp.label ?? 'Gestion de projet',
      quantity: 1, selected_days: days, investment_pa: null, investment_pv: days * dayRate,
      annual_pa: null, annual_pv: 0, software: false,
      explanation: { kind: 'project_management', percent: percentage, basis: gp.basis,
        basis_days: basisDays, basis_amount: basisDays * dayRate, round_days: gp.round_days,
        included_codes: included.map(line => line.item_code), source: gp.source ?? null } });
  }
  if (input.travel) {
    const travel = input.travel;
    if (travel.basis !== 'project_days_including_partners_gp' || !(travel.round_to > 0))
      throw new Error('Invalid travel rule');
    const basisDays = lines.reduce((sum,line) => sum + (line.selected_days ?? 0) * (line.quantity ?? 1),0);
    const unit = finite(travel.rate,'travel unit price'), percent = finite(travel.percent,'travel percentage');
    if (unit < 0 || percent < 0 || percent > 100) throw new Error('Invalid travel price');
    const amount = roundTo(basisDays * percent / 100 * unit, travel.round_to);
    lines.push({family:'prestations',item_code:'deplacements',label:'Déplacements',
      investment_pa:null,investment_pv:amount,annual_pa:0,annual_pv:0,software:false,
      explanation:{kind:'travel',basis_days:basisDays,percent,unit_price:unit,source:travel.source}});
    if (travel.waived) lines.push({family:'prestations',item_code:'deplacements-offerts',label:'Déplacements offerts',
      investment_pa:0,investment_pv:-amount,annual_pa:0,annual_pv:0,software:false,
      explanation:{kind:'travel_waiver',source:travel.source}});
  }
  // Previously saved quotes can still contain the former split-support line.
  const primeSupport = lines.filter(line => line.family === 'prime' &&
    line.category === 'support').reduce((amount, line) => amount + (line.annual_pv ?? 0), 0);
  if (primeSupport) {
    const innosolvLines = lines.filter(line => line.family === 'innosolv');
    const innosolvPv = innosolvLines.reduce((amount, line) => amount + line.annual_pv, 0);
    if (primeSupport < 0 || primeSupport > innosolvPv)
      throw new Error('Prime support exceeds innosolv annual price');
    let allocated = 0;
    innosolvLines.forEach((line, index) => {
      const amount = index === innosolvLines.length - 1 ? primeSupport - allocated :
        primeSupport * line.annual_pv / innosolvPv;
      line.annual_pv -= amount;
      line.support_allocated = amount;
      allocated += amount;
    });
  }
  const lcm = calculateLcm(input.dimensions.population, catalog.parameters.lcm,
    input.lcm ?? {});
  const selectedLcm = input.lcm?.selection;
  if (selectedLcm && selectedLcm !== 'none') {
    if (!['gold', 'platinium'].includes(selectedLcm)) throw new Error('Invalid LCM selection');
    const selectedPrice = lcm[selectedLcm];
    if (!selectedPrice) throw new Error('Selected LCM price missing');
    lines.push({ family: 'lcm', item_code: selectedLcm, label: `LCM ${selectedLcm}`,
      investment_pa: 0, investment_pv: 0, annual_pa: null,
      annual_pv: selectedPrice.effective_value, software: false,
      explanation: { source: selectedPrice.source?.method ?? null } });
  }
  const sum = (key, subset = lines) => subset.reduce((total, line) => total + (line[key] ?? 0), 0);
  const investment = sum('investment_pv');
  const annual = sum('annual_pv');
  const knownInvestmentCost = sum('investment_pa');
  const knownAnnualCost = sum('annual_pa');
  const publisherAnnualPa = sum('annual_pa', lines.filter(line =>
    line.family === 'innosolv' || line.family === 'abacus'));
  const software = lines.filter(line => line.software || line.family === 'prime' &&
    line.category === 'support');
  const softwarePa = sum('annual_pa', software);
  const softwarePv = sum('annual_pv', software);
  const publisherSoftwarePa = sum('annual_pa', software.filter(line =>
    line.family === 'innosolv' || line.family === 'abacus'));
  const missingTechnical = lines.filter(line => line.family === 'technique' && line.investment_pv == null)
    .map(line => line.item_code);
  const missingServiceDays = input.reference ? lines.filter(line =>
    line.family === 'prestations_module' && line.selected_days == null).map(line => line.item_code) : [];
  const missingPrimeValues=lines.filter(line=>line.family==='prime' && line.category==='license' &&
    (line.annual_pv==null || line.selected_days==null)).map(line=>line.item_code??line.label);
  return { ...(missingServiceDays.length || missingTechnical.length || missingHosting || missingPrimeValues.length ? { status: 'incomplete',
    issues: [...(missingServiceDays.length ? [{ code: 'serviceDaysRequired', items: missingServiceDays }] : []),
      ...(missingTechnical.length ? [{ code: 'technicalPriceRequired', items: missingTechnical }] : []),
      ...(missingHosting ? [{ code: 'hostingPricesRequired' }] : []),
      ...(missingPrimeValues.length ? [{ code: 'primeOptionValuesRequired', items: missingPrimeValues }] : [])] } : {}),
    lines, summary: { investment, annual,
      ...(input.reference ? { missing_service_days: missingServiceDays } : {}),
    missing_technical: missingTechnical,
    missing_hosting: missingHosting,
    missing_prime_values: missingPrimeValues,
    tco5y: investment + annual * 4,
    tco5y_excluding_lcm: investment + (annual - (selectedLcm && selectedLcm !== 'none' ?
      lcm[selectedLcm].effective_value : 0)) * 4,
    revenue5y: investment + annual * 4, known_costs5y: knownInvestmentCost +
      knownAnnualCost * 4 - publisherAnnualPa / 2,
    year2_margin_known: annual - knownAnnualCost + publisherAnnualPa / 2,
    year3plus_margin_known: annual - knownAnnualCost,
    software_margin_year2: softwarePv - softwarePa + publisherSoftwarePa / 2,
    software_margin_year3plus: softwarePv - softwarePa,
    software_margin_5y: 4 * (softwarePv - softwarePa) + publisherSoftwarePa / 2,
    lcm,
    incomplete_costs: lines.filter(line =>
      (line.investment_pv && line.investment_pa == null) ||
      (line.annual_pv && line.annual_pa == null)).map(line => line.item_code ?? line.label) } };
}
