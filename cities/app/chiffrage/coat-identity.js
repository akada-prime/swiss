// Pure OFS identity check, shared by the server cache and presentation tests.
export function verifiedCoat(entities, bfsId) {
  const current = list => (list ?? []).filter(statement => statement.rank !== 'deprecated' &&
    !statement.qualifiers?.P582);
  const matches = Object.values(entities ?? {}).filter(entity => current(entity.claims?.P771)
    .some(statement => Number(statement.mainsnak?.datavalue?.value) === Number(bfsId)));
  if (matches.length !== 1) return null;
  const entity = matches[0];
  const arms = current(entity.claims?.P94);
  const preferred = arms.filter(statement => statement.rank === 'preferred');
  const eligible = preferred.length ? preferred : arms;
  if (eligible.length !== 1) return null;
  const filename = eligible[0].mainsnak?.datavalue?.value;
  if (typeof filename !== 'string' || !/\.(svg|png|jpe?g|webp)$/i.test(filename)) return null;
  return { filename, source: `https://www.wikidata.org/wiki/${entity.id}` };
}
