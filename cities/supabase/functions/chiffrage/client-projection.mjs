// Explicit customer-facing allowlist. Never serialize quote.input, quote.result,
// catalog versions, PA, margin, service days, rates or internal references.
const products = { innosolv: 'innosolvcity', pce: 'ProConcept', abacus: 'Abacus' };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const short = (value, max = 160) => String(value ?? '').trim().slice(0, max);

export function publicOfferFromSaved(quote) {
  const snapshot = quote?.snapshot;
  if (!snapshot || snapshot.result?.status === 'incomplete') return null;
  const s = snapshot.result?.summary;
  if (!s || !finite(s.investment) || !finite(s.annual) ||
      !Array.isArray(snapshot.result.lines)) return null;
  const buckets = { solutions: { investment: 0, annual: 0 },
    partners: { investment: 0, annual: 0 }, hosting: { investment: 0, annual: 0 } };
  for (const line of snapshot.result.lines) {
    if (!finite(line.investment_pv) || !finite(line.annual_pv)) return null;
    const kind = line.category === 'hosting' ? 'hosting' :
      line.family === 'partenaires' ? 'partners' : 'solutions';
    buckets[kind].investment += line.investment_pv;
    buckets[kind].annual += line.annual_pv;
  }
  const investment = Object.values(buckets).reduce((sum, x) => sum + x.investment, 0);
  const annual = Object.values(buckets).reduce((sum, x) => sum + x.annual, 0);
  if (Math.abs(investment - s.investment) > .01 || Math.abs(annual - s.annual) > .01)
    return null;
  const sourceProducts = Array.isArray(snapshot.input?.products) ? snapshot.input.products : [];
  return {
    version: 1,
    quote_title: short(quote.title),
    commune: short(quote.commune_name),
    bfs_id: Number(quote.bfs_id),
    canton: short(quote.canton, 2).toUpperCase(),
    population: Number(quote.population),
    revision: Number(snapshot.revision),
    issued_at: new Date().toISOString(),
    products: [...new Set(sourceProducts.filter(x => Object.hasOwn(products, x)).map(x => products[x]))],
    amounts: { investment: s.investment, annual: s.annual, tco5y: s.investment + 4 * s.annual },
    buckets
  };
}

export function publicLinkMetadata(row) {
  return { id: row.id, revision: row.revision, created_at: row.created_at,
    expires_at: row.expires_at, revoked_at: row.revoked_at };
}
