// Standalone, read-only presentation. No editor session, catalog, internal app or margins.
import { offerHero, offerBanner, offerFigures, offerIdentity, offerMap, offerScope, offerLcm, offerHosting, offerBreakdown } from './offer/presentation.js?v=20261027-platinum-price-r1';
import verifiedCoats from './chiffrage/coats.js';
import { offerPriceGroups } from './chiffrage/commercial-breakdown.js?v=20261027-ballaigues-r1';

const root = document.getElementById('offerClientRoot');
const endpoint = 'https://ozdvmllgxduzquiujcbg.supabase.co/functions/v1/chiffrage?action=clientOffer';
const enc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const fmt = value => Number(Math.round(value)).toLocaleString('fr-CH', {
  maximumFractionDigits: 0 }).replace(/[\u00a0\u202f]/g, "'");
const money = value => `${fmt(value)} CHF`;
const cantonNames = { JU:'Jura', VD:'Vaud', GE:'Genève', FR:'Fribourg',
  NE:'Neuchâtel', BE:'Berne', VS:'Valais', ZH:'Zurich', BL:'Bâle-Campagne' };
const fr = !/^de(?:-|$)/i.test(navigator.language);
if (!fr) document.documentElement.lang = 'de';
const label = (f,d) => fr ? f : d;
const asset = path => `public/${path}`;
const safeId = id => /^\d{1,5}$/.test(String(id)) ? String(id) : '';

const safeCanton = code => /^[A-Z]{2}$/.test(String(code)) ? String(code) : '';
const errorView = () => { root.innerHTML = `<div class="client-offer-message">
  <img src="public/prime-logo-negative.svg" alt="Prime Technologies" width="150" height="80">
  <h1>${label('Cette proposition n’est plus accessible.','Dieses Angebot ist nicht mehr verfügbar.')}</h1>
  <p>${label('Le lien est incorrect, expiré ou révoqué. Contactez Prime Technologies pour recevoir un nouveau lien.',
  'Der Link ist ungültig, abgelaufen oder widerrufen. Bitte wenden Sie sich für einen neuen Link an Prime Technologies.')}</p>
  </div>`; };
function renderOffer(o, map) {
  const id=safeId(o.bfs_id), canton=safeCanton(o.canton), coat=verifiedCoats[id];
  const coatSrc=coat?.asset ? (/^https:\/\//.test(coat.asset) ? coat.asset : `public/${coat.asset}`) : '';
  const names = new Map(offerPriceGroups.map(([key,fr,de])=>[key,label(fr,de)]));
  const current = o.version >= 2 && Array.isArray(o.breakdown);
  const rows = current ? o.breakdown : ['solutions','partners','hosting'].map(key=>({
    key,investment:o.buckets?.[key]?.investment ?? 0,annual:o.buckets?.[key]?.annual ?? 0
  }));
  const legacyNames={solutions:label('Solutions Prime','Prime-Lösungen'),
    partners:label('Partenaires','Partner'),hosting:label('Hébergement','Hosting')};
  const priceDetail = offerBreakdown(rows.map(row=>({...row,label:names.get(row.key)||legacyNames[row.key]||row.key})),{label,money,legacy:!current});
  const scope = current && Array.isArray(o.scope) ? offerScope(o.scope.map(group=>({
    product:group.product, items:group.items.map(entry=>label(entry.fr,entry.de))
  })), { asset }) : `<div class="client-offer-products">${(o.products||[]).map(name=>`<span>${enc(name)}</span>`).join('') || '—'}</div>`;
  const hero = offerHero({ asset, name:o.commune, bfsId:o.bfs_id, population:fmt(o.population),
    inhabitants:label('habitants','Einwohner'), heading:label('Votre projet, en chiffres.','Ihr Projekt in Zahlen.'),
    map:offerMap(map,o.bfs_id,label('Situation de la commune','Lage der Gemeinde')),
    identity:offerIdentity({asset,canton,cantonLabel:cantonNames[canton],coatHtml:coatSrc ? `<img src="${enc(coatSrc)}" width="44" height="52" alt="${enc(label('Armoiries communales','Gemeindewappen'))}">` : ''}),
    details:`<p class="chiffrage-offer-reference">${enc(o.quote_title)} · ${label('Révision','Version')} ${enc(o.revision)}</p>` });
  root.innerHTML = `<article class="chiffrage-offer client-offer">
    ${offerBanner(hero,offerFigures(o.amounts,{label,money}))}
    <div class="chiffrage-offer-body prime-offer-commercial">
      <section class="client-offer-scope"><h3>${label('Les solutions et modules retenus (périmètre)','Ausgewählte Lösungen und Module (Umfang)')}</h3>
        ${scope}${offerHosting(o.hosting_provider==='az',{asset,label})}${offerLcm(o.lcm,label,{prices:o.lcm_prices,money})}
      </section>
      <section class="client-offer-breakdown"><h3>${label('Ce que comprend votre offre','Was Ihr Angebot umfasst')}</h3>
        ${priceDetail}
      </section>
    </div>
    <footer class="client-offer-footer">© Prime Technologies SA · ${label('Proposition confidentielle','Vertrauliches Angebot')}</footer>
  </article>`;
}
async function load() {
  const token = location.hash.slice(1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return errorView();
  try {
    const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', referrerPolicy:'no-referrer' });
    if (!response.ok) throw Error('unavailable');
    const offer = await response.json();
    if (![1,2].includes(offer.version) || !offer.amounts || !offer.buckets) throw Error('invalid');
    let map=null;
    try {
      const m=await fetch('public/data/swiss-map-v1.json', { cache:'force-cache' });
      if(m.ok) map=await m.json();
    } catch { /* Map can be omitted without leaking or blocking an offer. */ }
    renderOffer(offer,map);
  } catch { errorView(); }
}
void load();
