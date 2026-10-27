// Standalone, read-only presentation. No editor session, catalog, internal app or margins.
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
const title = key => ({
  solutions:'Solutions Prime', partners:'Partenaires', hosting:'Hébergement' })[key];
const fr = !/^de(?:-|$)/i.test(navigator.language);
if (!fr) document.documentElement.lang = 'de';
const label = (f,d) => fr ? f : d;
const safeId = id => /^\d{1,5}$/.test(String(id)) ? String(id) : '';
const softwareLogo = {innosolvcity:'innosolvcity.png',ProConcept:'proconcept-wordmark.png'};
const safeCanton = code => /^[A-Z]{2}$/.test(String(code)) ? String(code) : '';
const errorView = () => { root.innerHTML = `<div class="client-offer-message">
  <img src="public/prime-logo-negative.svg" alt="Prime Technologies" width="150" height="80">
  <h1>${label('Cette proposition n’est plus accessible.','Dieses Angebot ist nicht mehr verfügbar.')}</h1>
  <p>${label('Le lien est incorrect, expiré ou révoqué. Contactez Prime Technologies pour recevoir un nouveau lien.',
  'Der Link ist ungültig, abgelaufen oder widerrufen. Bitte wenden Sie sich für einen neuen Link an Prime Technologies.')}</p>
  </div>`; };
const mapRegion = (map, offer) => {
  const selected = map?.municipalities?.find(row => Number(row.id) === Number(offer.bfs_id));
  const box = map?.meta?.viewBox;
  if (!selected?.d || !Array.isArray(box) || box.length !== 4) return '';
  const points = [...selected.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)]
    .map(m => [Number(m[1]), Number(m[2])]);
  if (!points.length) return '';
  const center = [
    (Math.min(...points.map(p=>p[0]))+Math.max(...points.map(p=>p[0])))/2,
    (Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2 ];
  return `<svg viewBox="${box.map(Number).join(' ')}" role="img" aria-label="${enc(label('Situation de la commune','Lage der Gemeinde'))}">
    <g class="chiffrage-map-region">${(map.cantons??[]).map(x=>`<path d="${enc(x.d)}"></path>`).join('')}</g>
    <path class="chiffrage-map-selected" d="${enc(selected.d)}"></path>
    <circle class="chiffrage-map-point" cx="${center[0]}" cy="${center[1]}" r="7000"></circle>
  </svg>`;
};
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
  const row = entry => `<div class="client-offer-price-row">
    <h4>${enc(names.get(entry.key) || legacyNames[entry.key] || entry.key)}</h4>
    <div class="client-offer-price-values">
      <div><small>${label('Investissement','Investition')}</small><strong>${money(entry.investment)}</strong></div>
      <div><small>${label('Annuel dès N+1','Jährlich ab N+1')}</small><strong>${money(entry.annual)}</strong></div>
    </div>
  </div>`;
  const content = (title, keys, hint) => {
    const entries=rows.filter(x=>keys.includes(x.key));
    return entries.length ? `<section class="client-offer-price-section">
      <h3>${title}</h3>${hint ? `<p>${hint}</p>` : ''}
      <div class="client-offer-price-list">${entries.map(row).join('')}</div>
    </section>` : '';
  };
  const priceDetail = current ? [
    content(label('Logiciels et maintenance','Software und Wartung'),['licenses'],''),
    content(label('Votre accompagnement','Ihre Begleitung'),
      ['implementation','migration','management','training','otherServices'],
      label('Installation, reprise, conduite de projet et prise en main : chaque étape est chiffrée séparément.',
        'Einrichtung, Migration, Projektleitung und Einführung: Jede Etappe ist separat ausgewiesen.')),
    content(label('Technique et services associés','Technik und zusätzliche Leistungen'),
      ['database','primePartners','lcm','hosting'],'')
  ].join('') : content(label('Répartition du prix','Preisaufteilung'),
    ['solutions','partners','hosting'],'');
  const scope = current && Array.isArray(o.scope) ? o.scope.map(group=>`<div class="client-offer-module-group">
    <h4>${softwareLogo[group.product] ? `<img class="client-offer-software-logo" src="public/assets/logos/${softwareLogo[group.product]}" alt="${enc(group.product)}">` : enc(group.product)}</h4>
    <ul>${group.items.map(entry=>`<li>${enc(label(entry.fr,entry.de))}</li>`).join('')}</ul>
  </div>`).join('') :
    `<div class="client-offer-products">${(o.products||[]).map(name=>`<span>${enc(name)}</span>`).join('') || '—'}</div>`;
  root.innerHTML = `<article class="chiffrage-offer client-offer">
    <header class="chiffrage-offer-hero" style="--prime-offer-mark:url('public/prime-one-negative.png')">
      <div class="chiffrage-offer-brand"><img src="public/prime-logo-negative.svg" alt="Prime Technologies" width="137" height="60"><span>${label('Communes / Proposition','Gemeinden / Angebot')}</span></div>
      <div class="chiffrage-offer-map">${mapRegion(map,o)}</div>
      <div class="chiffrage-offer-identity"><div class="chiffrage-identity">
        <div class="chiffrage-communal-coat">${coatSrc ? `<img src="${enc(coatSrc)}" width="44" height="52" alt="${enc(label('Armoiries communales','Gemeindewappen'))}">` : ''}</div>
        <span class="chiffrage-canton">${canton ? `<img src="public/cantons/${canton.toLowerCase()}.svg" alt="" width="22" height="27">` : ''}
        ${enc(cantonNames[canton] || canton)}</span></div></div>
      <p class="chiffrage-offer-place">${enc(o.commune)} <span>OFS ${enc(o.bfs_id)} · ${fmt(o.population)} ${label('habitants','Einwohner')}</span></p>
      <h2>${label('Votre projet, en chiffres.','Ihr Projekt in Zahlen.')}</h2>
      <p class="client-offer-revision">${enc(o.quote_title)} · ${label('Révision','Version')} ${enc(o.revision)}</p>
      <div class="chiffrage-offer-figures">
        <div><span>${label('Investissement initial','Anfangsinvestition')}</span><strong>${money(o.amounts.investment)}</strong><small>HT · ${label('une fois','einmalig')}</small></div>
        <div><span>${label('Coût annuel récurrent','Wiederkehrende Jahreskosten')}</span><strong>${money(o.amounts.annual)}</strong><small>HT · ${label('dès la 2e année','ab dem zweiten Jahr')}</small></div>
      </div>
      <div class="chiffrage-offer-horizon"><span>${label('Coût total sur 5 ans','Gesamtkosten über 5 Jahre')}</span><strong>${money(o.amounts.tco5y)}</strong></div>
    </header>
    <div class="chiffrage-offer-body client-offer-body">
      <section class="client-offer-scope"><p class="chiffrage-kicker">${label('Votre périmètre','Ihr Umfang')}</p>
        <h3>${label('Les solutions et modules retenus','Ausgewählte Lösungen und Module')}</h3>
        <div class="client-offer-module-grid">${scope}</div>
        ${o.hosting_provider==='az' ? `<div class="client-offer-hosting-brand"><img src="public/assets/logos/az-footer.png" alt="AZ Informatique"></div>` : ''}
        ${o.lcm ? `<div class="client-offer-lcm"><span>LCM</span><strong>${enc(o.lcm)}</strong></div>` : ''}
      </section>
      <section class="client-offer-breakdown"><p class="chiffrage-kicker">${label('Lecture du prix','Preisaufteilung')}</p>
        <h3>${label('Ce que comprend votre offre','Was Ihr Angebot umfasst')}</h3>
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
