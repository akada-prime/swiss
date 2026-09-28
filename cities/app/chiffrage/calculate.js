// Pure calculation domain. Real catalogs and commercial parameters are loaded
// from the protected server store, never from this public source file.

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
  const quantity = finite(dimensions[rule.basis], rule.basis);
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
      value = roundTo(finite(lower.value, 'lower tier value') + fraction *
        (finite(tier.value, 'upper tier value') - finite(lower.value, 'lower tier value')),
        rule.round_to);
    }
  }
  else if (rule.kind === 'rounded_ratio') {
    value = roundTo(finite(tier.ratio, 'tier ratio') * finite(rule.reference_value, 'reference value'),
      rule.round_to);
  } else throw new Error(`Unsupported pricing rule: ${rule.kind}`);
  return { value, explanation: { item_code: item.item_code, basis: rule.basis,
    quantity, tier_up_to: tier.up_to, kind: rule.kind, source: item.source,
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
  const interfacePa = finite(input.interfacePa ?? 0, 'interface PA');
  const beforeFinanceRounding = (base + adjustment) * ratio;
  const financeRounded = roundTo(beforeFinanceRounding, parameters.finance_round_to);
  const financePa = financeRounded - interfacePa;
  const salaryBase = financeRounded / 2;
  const salaryPa = roundTo(salaryBase, parameters.salary_round_to);
  const pa = { finances: effective(financePa, input.financePaOverride),
    salaires: effective(salaryPa, input.salaryPaOverride) };
  const margin = finite(parameters.pv_margin, 'PCE PV margin');
  if (margin < 0 || margin >= 1) throw new Error('Invalid PCE PV margin');
  const financePv = roundTo(financeRounded / (1 - margin), parameters.pv_round_to) - interfacePa;
  const salaryPv = roundTo(salaryPa / (1 - margin), parameters.pv_round_to);
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
  if (useCores && pricePerCore == null && input.override == null)
    throw new Error('SQL core price unconfirmed: enter an investment PV');
  const calculated = useCores && pricePerCore == null ? null :
    useCores ? cores * pricePerCore : base + users * userPrice;
  return { usersSuggested, users, cores, regime: useCores ? 'core' : 'user',
    amount: calculated == null ? { calculated_value: null,
      override_value: finite(input.override, 'SQL investment PV'),
      effective_value: finite(input.override, 'SQL investment PV'), difference: null } :
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
  const block = Math.ceil(finite(population, 'population') / 5000) * 5000;
  const entry = rule?.find(candidate => candidate.up_to === block);
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
  const lines = [];
  const choices = new Set(input.products ?? []);
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
    const priced = priceCatalogItem(item, item.vendor === 'innosolv' &&
      item.pricing_rule?.basis === 'population' ?
      { ...input.dimensions, population: populationForLicenses } : input.dimensions);
    const rates = catalog.parameters.publisher_rent[selected.vendor]?.[item.rate_class ?? 'standard'];
    if (!rates) throw new Error(`Missing private rates for ${selected.vendor}/${item.rate_class ?? 'standard'}`);
    const rent = calculatePublisherRent(priced.value, rates);
    lines.push({ family: selected.vendor, product: item.product,
      item_code: item.item_code, label: item.label_fr,
      license_value: priced.value, investment_pa: 0, investment_pv: 0,
      annual_pa: effective(rent.pa, selected.pa_override).effective_value,
      annual_pv: effective(rent.pv, selected.pv_override).effective_value,
      software: true, explanation: priced.explanation,
      overrides: { pa: selected.pa_override ?? null, pv: selected.pv_override ?? null } });
  }
  if (choices.has('pce')) {
    const innosolvPaBase = lines.filter(line => line.family === 'innosolv')
      .reduce((sum, line) => sum + line.annual_pa, 0);
    const pce = calculatePce({ ...input.pce,
      innosolvPaBase: input.pce?.innosolvPaBaseOverride ?? innosolvPaBase },
    catalog.parameters.pce);
    for (const key of ['finances', 'salaires']) if (input.pce[key]) {
      lines.push({ family: 'pce', item_code: key, label: key,
        investment_pa: 0, investment_pv: 0, annual_pa: pce.pa[key].effective_value,
        annual_pv: pce.pv[key].effective_value, software: true, explanation: pce.explanation });
    }
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
    const moduleLine = entry.family === 'prestations_module' ?
      lines.find(line => `${line.family}/${line.product}/${line.item_code}` === entry.item_code) : null;
    const quantity = entry.family === 'prime' || entry.family === 'partenaires' ?
      finite(entry.quantity ?? 1, 'line quantity') : 1;
    if (quantity < 0 || !Number.isInteger(quantity)) throw new Error('Invalid line quantity');
    const suggestedDays = entry.suggested_days ??
      catalog.parameters.service_presets?.[entry.level]?.[entry.item_code] ?? null;
    const days = entry.days ?? suggestedDays;
    const serviceValue = days == null ? null : Number(days) *
      finite(catalog.parameters.day_rate, 'day rate');
    const investment = effective(serviceValue ?? finite(entry.investment_pv ?? 0,
      'investment PV'), entry.investment_override);
    lines.push({ family: entry.family, category: entry.category ?? null,
      item_code: entry.item_code ?? null,
      label: moduleLine?.label ?? entry.label, supplier: entry.supplier ?? null,
      note: entry.note ?? null,
      quantity, investment_pa: optionalMoney(entry.investment_pa) == null ? null :
        optionalMoney(entry.investment_pa) * quantity,
      investment_pv: investment.effective_value * quantity,
      annual_pa: optionalMoney(entry.annual_pa) == null ? null :
        optionalMoney(entry.annual_pa) * quantity,
      annual_pv: finite(entry.annual_pv ?? 0, 'annual PV') * quantity,
      software: false, explanation: entry.explanation ?? null,
      suggested_days: suggestedDays, selected_days: days,
      calculated_investment: investment.calculated_value,
      overrides: { ...entry.overrides, investment: entry.investment_override ?? null } });
  }
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
  return { lines, summary: { investment, annual,
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
