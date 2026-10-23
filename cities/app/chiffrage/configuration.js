// Draft choices only. Prices and publisher rules remain in the private catalog.
export const energyCodes = ['501', '502', '533'];
export const isEnergyModule = item => item.vendor === 'innosolv' &&
  item.product === 'Versorger' && energyCodes.includes(item.item_code);
export const suggestedVolume = population =>
  Math.ceil(Math.max(0, Number(population) || 0) / 3 / 500) * 500;
export const suggestedEmployees = population => {
  const count = Math.max(0, Number(population) || 0);
  if (count < 1000) return 10;
  if (count < 2000) return 20;
  if (count < 3000) return 25;
  if (count < 4000) return 30;
  return Math.min(100, Math.floor(count / 1000) * 10);
};

export function updatePopulation(dimensions, population, roundPopulation) {
  const previous = dimensions.population;
  for (const key of ['meters', 'taxes']) {
    if (dimensions[key] === suggestedVolume(previous)) dimensions[key] = suggestedVolume(population);
  }
  if (dimensions.licensedPopulation === roundPopulation(previous))
    dimensions.licensedPopulation = roundPopulation(population);
  if (dimensions.employees === suggestedEmployees(previous))
    dimensions.employees = suggestedEmployees(population);
  dimensions.population = population;
}

export const hostingIncluded = input => input.hosting?.included ??
  [...(input.primeLines ?? []), ...(input.partners ?? [])].some(line => line.category === 'hosting');

export function setEnergy(input, enabled, catalog) {
  if (enabled && !input.products.includes('innosolv')) return false;
  const items = catalog.items.filter(isEnergyModule);
  if (enabled && !energyCodes.every(code => items.some(item => item.item_code === code))) return false;
  input.energy = enabled;
  if (enabled) {
    for (const item of items) if (!input.modules.some(selected => isEnergyModule(selected) &&
      selected.item_code === item.item_code)) input.modules.push({ vendor: item.vendor,
      product: item.product, item_code: item.item_code });
  } else {
    input.modules = input.modules.filter(item => !isEnergyModule(item));
    input.moduleServices = (input.moduleServices ?? []).filter(line =>
      !energyCodes.some(code => line.item_code === `innosolv/Versorger/${code}`));
  }
  return true;
}
