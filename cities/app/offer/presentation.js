// Pure presentation: no session, transport, catalog, editor or calculation imports.
// Callers supply display values only. HTML slots are reserved for trusted renderers.
export const escapeOffer = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const e = escapeOffer;
export function offerHero({ asset, name, bfsId, population, heading, inhabitants,
  brand = '', map = '', identity = '', details = '' }) {
  return `<header class="chiffrage-offer-hero">
    <div class="chiffrage-offer-brand"><img src="${e(asset('prime-logo-negative.svg'))}" width="137" height="60" alt="Prime Technologies">${brand ? `<span>${e(brand)}</span>` : ''}</div>
    <div class="chiffrage-offer-map" data-territory>${map}</div>
    <div class="chiffrage-offer-identity" data-identity>${identity}</div>
    <p class="chiffrage-offer-place">${e(name)} <span>OFS ${e(bfsId)} · ${e(population)} ${e(inhabitants)}</span></p>
    <h2>${e(heading)}</h2>${details}</header>`;
}
export const offerBanner = (hero, figures = '') => `<div class="prime-offer-banner">${hero}${figures}</div>`;
export function offerFigures(amounts, { label, money, incomplete = false, caveat = '' }) {
  return `<section class="chiffrage-offer-summary"><div class="chiffrage-offer-figures">
    <div><span>${incomplete ? label('Investissement calculé à ce stade','Bisher berechnete Investition') : label('Investissement initial','Anfangsinvestition')}</span><strong>${e(money(amounts.investment))}</strong><small>${label('HT · une fois','exkl. MWST · einmalig')}</small></div>
    <div><span>${label('Coût annuel récurrent','Wiederkehrende Jahreskosten')}</span><strong>${e(money(amounts.annual))}</strong><small>${label('HT · dès la 2e année','exkl. MWST · ab dem zweiten Jahr')}</small></div>
    </div><div class="chiffrage-offer-horizon"><span>${label('Coût total sur 5 ans','Gesamtkosten über 5 Jahre')}</span><strong>${e(money(amounts.tco5y))}</strong></div>${caveat}</section>`;
}
export function offerIdentity({ coatHtml = '', canton, cantonLabel, asset }) {
  const code = /^[A-Z]{2}$/i.test(String(canton)) ? String(canton).toLowerCase() : '';
  return `<div class="chiffrage-identity"><div class="chiffrage-communal-coat" data-coat-container>${coatHtml}</div><span class="chiffrage-canton">${code ? `<img src="${e(asset(`cantons/${code}.svg`))}" alt="${e(cantonLabel || canton)}" width="22" height="27">` : ''}</span></div>`;
}
export function offerMap(map, bfsId, label, fallback = '') {
  const selected = map?.municipalities?.find(row => Number(row.id) === Number(bfsId));
  const box = map?.meta?.viewBox;
  if (!selected?.d || !Array.isArray(box) || box.length !== 4 || !box.every(Number.isFinite)) return fallback;
  const points = [...selected.d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])]);
  if (!points.length) return fallback;
  const center = [0,1].map(i=>(Math.min(...points.map(p=>p[i]))+Math.max(...points.map(p=>p[i])))/2);
  return `<svg viewBox="${box.join(' ')}" role="img" aria-label="${e(label)}"><g class="chiffrage-map-region">${(map.cantons??[]).map(row=>`<path d="${e(row.d)}"></path>`).join('')}</g><path class="chiffrage-map-selected" d="${e(selected.d)}"></path><circle class="chiffrage-map-point" cx="${center[0]}" cy="${center[1]}" r="7000"></circle></svg>`;
}
const logos = { innosolvcity:'innosolvcity.png', ProConcept:'proconcept-wordmark.png', Abacus:'abacus-wordmark.png' };
export function offerScope(groups, { asset }) {
  return `<div class="prime-offer-module-grid">${groups.map(({ product, items })=>`<section class="prime-offer-module-group"><h4 class="${product==='Abacus'?'brand-abacus':product==='innosolvcity'?'brand-innosolv':''}">${logos[product] ? `<img class="prime-offer-software-logo ${product==='ProConcept'?'logo-on-dark':''}" src="${e(asset(`assets/logos/${logos[product]}`))}" alt="${e(product)}">${product==='ProConcept'?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/proconcept-dark.png'))}" alt="ProConcept">`:''}` : e(product)}</h4><ul>${items.map(item=>`<li>${e(item)}</li>`).join('')}</ul></section>`).join('')}</div>`;
}
export function offerLcm(lcm, label) {
  if (!lcm) return '';
  return `<div class="prime-offer-lcm"><span>LCM</span><strong>${e(lcm)}</strong><span>${label('· formule retenue (mises à jour annualisées)','· gewählte Variante (annualisierte Aktualisierungen)')}</span></div>${lcm==='Gold' ? `<details class="prime-offer-lcm-alternative"><summary>${label('Découvrir Platinum · une autre formule LCM','Platinum entdecken · eine weitere LCM-Variante')}</summary><p>${label('Envie d’explorer Platinum ? Nous pouvons comparer les deux formules pour votre commune. Platinum remplacerait Gold dans une proposition adaptée.','Möchten Sie Platinum kennenlernen? Wir können beide Varianten für Ihre Gemeinde vergleichen. Platinum würde Gold in einem angepassten Angebot ersetzen.')}</p></details>` : ''}`;
}
export function offerHosting(az, { asset, label }) {
  return az ? `<div class="prime-offer-hosting-brand"><span>${label('Hébergement assuré par','Hosting durch')}</span><img class="logo-on-dark" src="${e(asset('assets/logos/az-footer.png'))}" alt="AZ Informatique"><img class="logo-on-light" src="${e(asset('assets/logos/az-normal.png'))}" alt="AZ Informatique"></div>` : '';
}
export function offerBreakdown(rows, { label, money, legacy = false }) {
  const section = (heading, keys, hint = '') => {
    const entries = rows.filter(row=>keys.includes(row.key));
    return entries.length ? `<section class="prime-offer-price-section"><h3>${heading}</h3>${hint?`<p>${hint}</p>`:''}<div class="prime-offer-price-list">${entries.map(row=>`<div class="prime-offer-price-row"><h4>${e(row.label)}</h4><div class="prime-offer-price-values"><div><small>${label('Investissement','Investition')}</small><strong>${e(money(row.investment))}</strong></div><div><small>${label('Annuel dès N+1','Jährlich ab N+1')}</small><strong>${e(money(row.annual))}</strong></div></div></div>`).join('')}</div></section>` : '';
  };
  return legacy ? section(label('Répartition du prix','Preisaufteilung'),['solutions','partners','hosting']) : [
    section(label('Logiciels et maintenance','Software und Wartung'),['licenses']),
    section(label('Votre accompagnement','Ihre Begleitung'),['implementation','migration','management','training','otherServices'],label('Installation, reprise, conduite de projet et prise en main : chaque étape est chiffrée séparément.','Einrichtung, Migration, Projektleitung und Einführung: Jede Etappe ist separat ausgewiesen.')),
    section(label('Technique et services associés','Technik und zusätzliche Leistungen'),['database','primePartners','lcm','hosting'])
  ].join('');
}
