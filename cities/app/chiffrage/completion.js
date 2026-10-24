// Follow the shared engine's completeness decision; do not invent prices or defaults.
export function completionItems(input, result) {
  const summary = result?.summary ?? {};
  const items = (summary.missing_technical ?? []).map(code => ({
    kind:'technical', code, tab:'prestations', field:code === 'sql' ? 'sql.override' : 'oracle.investmentOverride'
  }));
  for (const id of summary.missing_service_days ?? [])
    items.push({kind:'module', code:id, tab:'modules', field:`moduleService.${id}.days`});
  if (summary.missing_hosting) {
    let found = false;
    for (const kind of ['primeLines','partners']) (input[kind] ?? []).forEach((line,index) => {
      if (line.category !== 'hosting') return;
      for (const key of ['investment_pv','annual_pv']) if (line[key] == null) {
        found = true;
        items.push({kind:'hosting', code:key, tab:'composer', field:`${kind}.${index}.${key}`});
      }
    });
    if (!found) items.push({kind:'hosting',code:'hosting',tab:'composer',field:null});
  }
  return items;
}

export function displayedServiceDays(entry, catalog) {
  // An absent optional service contributes nothing; an unknown retained service stays unknown.
  if (!entry) return 0;
  return entry.days ?? entry.suggested_days ??
    catalog?.parameters?.service_presets?.[entry.level]?.[entry.item_code] ?? null;
}
