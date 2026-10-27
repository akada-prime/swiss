// Shared commercial (PV-only) taxonomy for all Prime Communes presentations.
// No price computation, catalog data, PA, margin or private references.
export const offerPriceGroups = Object.freeze([
  ['licenses','Licences et support','Lizenzen und Support'],
  ['implementation','Mise en œuvre','Implementierung'],
  ['migration','Reprise de données','Datenübernahme'],
  ['management','Gestion de projet','Projektleitung'],
  ['training','Formation et aide au démarrage','Schulung und Unterstützung beim Start'],
  ['otherServices','Autres prestations','Weitere Dienstleistungen'],
  ['database','Bases de données et technique','Datenbanken und Technik'],
  ['primePartners','Prime et partenaires','Prime und Partner'],
  ['lcm','LCM (mises à jour annualisées)','LCM (annualisierte Aktualisierungen)'],
  ['hosting','Hébergement','Hosting']
]);

export function commercialPriceGroup(line) {
  if (line.category === 'hosting') return 'hosting';
  if (line.family === 'lcm') return 'lcm';
  if (line.software || ['innosolv', 'pce', 'abacus'].includes(line.family)) return 'licenses';
  if (line.family === 'technique') return 'database';
  if (['prime','partenaires'].includes(line.family)) return 'primePartners';
  if (line.family === 'prestations_module') return 'implementation';
  if (line.family === 'prestations') {
    const code = String(line.item_code ?? '').toLowerCase();
    if (code === 'reprise') return 'migration';
    if (code === 'projet') return 'management';
    if (code === 'formation' || code === 'demarrage') return 'training';
    if (code === 'installation' || code === 'technique' || code === 'interfaces' ||
      code.startsWith('pce-')) return 'implementation';
    return 'otherServices';
  }
  return 'otherServices';
}

export function publicPriceBreakdown(lines) {
  const values = new Map(offerPriceGroups.map(([key]) => [key, { investment:0, annual:0 }]));
  for (const line of lines) {
    const amount=values.get(commercialPriceGroup(line));
    amount.investment += line.investment_pv ?? 0;
    amount.annual += line.annual_pv ?? 0;
  }
  return offerPriceGroups.map(([key]) => ({ key, ...values.get(key) }))
    .filter(x => Math.abs(x.investment) > .005 || Math.abs(x.annual) > .005);
}
