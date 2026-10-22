// Reference values come exclusively from the protected, versioned catalog.
// Applying a reference creates an independent quote snapshot, never a shared object.
export const moduleId = item => `${item.vendor}/${item.product}/${item.item_code}`;
export function serviceApplies(entry, input) {
  return (!entry.requires_products || entry.requires_products.every(product => input.products.includes(product))) &&
    (!entry.requires_module_prefix || input.modules.some(item => moduleId(item).startsWith(entry.requires_module_prefix))) &&
    (!entry.requires_pce_option || Boolean(input.pce?.[entry.requires_pce_option]));
}
export function defaultModule(item, catalog, profileId) {
  const profile = referenceProfiles(catalog).find(row => row.id === profileId);
  const defaults = profile?.default_modules?.[item.vendor];
  return defaults ? defaults.includes(item.item_code === '129VD' ? '129' : item.item_code) : item.default_selected;
}
export function referenceProfiles(catalog) {
  return catalog.parameters.configuration_profiles ?? [];
}
export function serviceDays(catalog, id, profileId) {
  const profile = referenceProfiles(catalog).find(row => row.id === profileId);
  const presets = { ...catalog.parameters.service_presets?.standard, ...profile?.module_days };
  return presets[id] ?? (id.includes('/Versorger/') ?
    presets[id.replace('/Versorger/', '/Gemeinde/')] :
    id.endsWith('/129VD') ? presets[id.replace('/129VD', '/129')] : null);
}
export function applyReference(input, catalog, profileId) {
  const profile = referenceProfiles(catalog).find(row => row.id === profileId);
  if (!profile) return false;
  input.reference = { id: profile.id, label: profile.label, source: profile.source };
  input.services = structuredClone(profile.services ?? []);
  input.projectManagement = structuredClone(profile.project_management ?? null);
  input.moduleServices = input.modules.map(item => {
    const id = moduleId(item), days = serviceDays(catalog, id, profile.id);
    return { family: 'prestations_module', item_code: id, label: id,
      level: 'standard', days, suggested_days: days };
  });
  return true;
}
export function applyHosting(input, catalog) {
  // Retained custom hosting lines always take precedence, including zero prices.
  if ([...(input.primeLines ?? []), ...(input.partners ?? [])].some(row => row.category === 'hosting')) return;
  const preset = catalog.parameters.hosting_presets?.find(row =>
    !row.products?.length || row.products.every(product => input.products.includes(product)));
  if (preset) input.primeLines.push(...structuredClone(preset.lines));
}

// Keep removed modules and their adjustments in the quote, outside the engine inputs.
// Re-enabling a choice restores the human values instead of resetting the standard.
export function retainRemoved(input, previousModules, previousServices) {
  input.retainedModules ??= {};
  for (const item of previousModules) {
    const id = moduleId(item);
    if (!input.modules.some(row => moduleId(row) === id))
      input.retainedModules[id] = { module: structuredClone(item),
        service: structuredClone(previousServices.find(row => row.item_code === id) ?? null) };
  }
  input.modules = input.modules.map(item => input.retainedModules[moduleId(item)]?.module ?? item);
  input.moduleServices = input.moduleServices.map(item =>
    input.retainedModules[item.item_code]?.service ?? item);
  for (const item of input.modules) delete input.retainedModules[moduleId(item)];
}
