// Only stable, non-sensitive error categories cross the API boundary.
export function calculationError(error) {
  const message = error?.message ?? '';
  if (message === 'PCE standalone price required') return { code: 'pceStandalonePrice' };
  if (message === 'Hosting reference scope changed') return { code: 'hostingScopeChanged' };
  if (message === 'Hosting prices required') return { code: 'hostingPricesRequired' };
  if (message.startsWith('SQL core price unconfirmed')) return { code: 'sqlPriceRequired' };
  if (message.startsWith('Licensed population')) return { code: 'populationInvalid' };
  const manual = message.match(/^Manual publisher prices required: ([\w.]+)/);
  if (manual) return { code: 'manualPricesRequired', item: manual[1] };
  const tier = message.match(/^Missing (?:lower tier|lower anchor|tier) for ([\w.]+)/);
  if (tier) return { code: 'catalogTierMissing', item: tier[1] };
  if (message === 'Selected LCM price missing') return { code: 'lcmPriceRequired' };
  if (message === 'Unapproved LCM reference' || message === 'Incomplete private catalog')
    return { code: 'catalogIncomplete' };
  return null;
}
