// Pure presentation: no session, transport, catalog, editor or calculation imports.
// Callers supply display values only. HTML slots are reserved for trusted renderers.
export const escapeOffer = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]);
const e = escapeOffer;
export function offerHero({ asset, name, bfsId, population, heading, inhabitants,
  brand = '', map = '', identity = '', details = '', reference = null }) {
  const facts = `OFS ${e(bfsId)} · ${e(population)} ${e(inhabitants)}`;
  return `<header class="chiffrage-offer-hero">
    <div class="chiffrage-offer-brand"><img src="${e(asset('prime-logo-negative.svg'))}" width="137" height="60" alt="Prime Technologies">${brand ? `<span>${e(brand)}</span>` : ''}</div>
    <div class="chiffrage-offer-map" data-territory>${map}</div>
    <div class="chiffrage-offer-identity" data-identity>${identity}</div>
    <p class="chiffrage-offer-place">${reference === null ? `${e(name)} <span>${facts}</span>` : `<strong class="chiffrage-offer-name">${e(name)}</strong><span class="chiffrage-offer-metadata"><strong>${facts}</strong> <span class="chiffrage-offer-reference">— ${e(reference)}</span></span>`}</p>
    <h2>${e(heading)}</h2>${details}</header>`;
}
export const offerBanner = (hero, figures = '') => `<div class="prime-offer-banner">${hero}${figures}</div>`;
export function offerFigures(amounts, { label, money, incomplete = false, caveat = '', municipal = false, annualBreakdown = null }) {
  const annualDetails = municipal && annualBreakdown ? `<table class="prime-offer-annual-breakdown" aria-label="${e(label('Répartition des coûts annuels','Aufteilung der jährlichen Kosten'))}">
    <thead><tr><th scope="col" aria-label="${e(label('Poste','Position'))}"></th><th scope="col">${label('CHF HT / an','CHF exkl. MWST / Jahr')}</th><th scope="col">${label('Part','Anteil')}</th></tr></thead>
    <tbody>${[['solutions','Logiciels','Software'],['lcm','LCM','LCM'],['hosting','Hébergement','Hosting']].map(([key,fr,de]) => {
      const amount = annualBreakdown[key];
      const share = Number.isFinite(amounts.annual) && amounts.annual > 0 && Number.isFinite(amount)
        ? `${Math.round(amount / amounts.annual * 100)} %` : '—';
      return `<tr><th scope="row">${label(fr,de)}</th><td>${e(money(amount).replace(/ CHF(?: HT)?$/, ''))}</td><td class="prime-offer-annual-share">${share}</td></tr>`;
    }).join('')}</tbody></table>` : '';
  if (municipal) return `<section class="chiffrage-offer-summary"><div class="prime-offer-communal-figures">
    <div><span>${label("Coût d’investissement",'Investitionskosten')}</span><strong>${e(money(amounts.investment)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Une fois','Einmalig')}</small></div>
    <div><span>${label('Coûts de fonctionnement (annuels)','Betriebskosten (jährlich)')}</span><strong>${e(money(amounts.annual)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Dès la 2e année','Ab dem zweiten Jahr')}</small></div>
    <div><span>${label('Coût total sur 5 ans','Gesamtkosten über 5 Jahre')}</span><strong>${e(money(amounts.tco5y)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Investissement + 4 annuités','Investition + 4 Jahresbeträge')}</small></div>
    </div>${annualDetails ? `<details class="prime-offer-annual-disclosure"><summary>${label('Répartition des coûts annuels','Aufteilung der jährlichen Kosten')}</summary>${annualDetails}</details>` : ''}${caveat}</section>`;
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
const logos = { innosolvcity:'innosolvcity.png', ProConcept:'proconcept-wordmark.png', Abacus:'abacus-negative.svg' };
export function offerScope(groups, { asset, label = fr => fr }) {
  groups=groups.map(group=>{
    const sections=new Map(), items=[];
    for(const item of group.items) {
      if(typeof item==='string' || !item.section){items.push(item);continue;}
      if(!sections.has(item.section)){const section={label:item.section,items:[]};sections.set(item.section,section);items.push(section);}
      sections.get(item.section).items.push(item);
    }
    return {...group,items};
  });
  const itemHtml = item => {
    if (typeof item === 'string') return `<li>${e(item)}</li>`;
    if(Array.isArray(item.items))return `<li class="prime-offer-scope-parent"><details class="prime-offer-scope-section"><summary class="prime-offer-scope-heading">${e(item.label)} <span>· ${item.items.length} ${label('modules','Module')}</span></summary><ul class="prime-offer-scope-modules">${item.items.map(itemHtml).join('')}</ul></details></li>`;
    const children = item.included ?? [];
    if (!children.length) return `<li>${e(item.label)}</li>`;
    // A priced parent stays a module when it also becomes a section heading.
    // All software uses the same visible list, independently of its pricing model.
    const modules = [{label:item.label}, ...children];
    const themes = new Map();
    for (const module of modules) {
      const theme = module.theme && module.theme !== item.label ? module.theme : '';
      if (!themes.has(theme)) themes.set(theme, []);
      themes.get(theme).push(module);
    }
    return `<li class="prime-offer-scope-parent"><details class="prime-offer-scope-section"><summary class="prime-offer-scope-heading">${e(item.label)} <span>· ${modules.length} ${label('modules inclus','enthaltene Module')}</span></summary>${[...themes].map(([theme,rows])=>`${theme ? `<h6 class="prime-offer-scope-subheading">${e(theme)}</h6>` : ''}<ul class="prime-offer-scope-modules">${rows.map(module=>`<li>${e(module.label)}</li>`).join('')}</ul>`).join('')}</details></li>`;
  };
  const grouped = groups.some(group=>group.items.some(item=>typeof item==='object' && (item.items?.length || item.included?.length)));
  const controls = grouped ? `<div class="prime-offer-scope-tools"><button type="button" class="prime-offer-scope-toggle" data-scope-toggle data-expand-label="${e(label('Tout déplier','Alle aufklappen'))}" data-collapse-label="${e(label('Tout replier','Alle zuklappen'))}" aria-expanded="false">${label('Tout déplier','Alle aufklappen')}</button></div>` : '';
  return `<div class="prime-offer-scope">${controls}<div class="prime-offer-module-grid">${groups.map(({ product, items })=>`<section class="prime-offer-module-group"><h4 class="${product==='Abacus'?'brand-abacus':product==='innosolvcity'?'brand-innosolv':''}">${logos[product] ? `<img class="prime-offer-software-logo ${['ProConcept','Abacus'].includes(product)?'logo-on-dark':''}" src="${e(asset(`assets/logos/${logos[product]}`))}" alt="${e(product)}">${product==='Abacus'?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/abacus-wordmark.png'))}" alt="Abacus">`:''}${product==='ProConcept'?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/proconcept-dark.png'))}" alt="ProConcept">`:''}` : e(product)}</h4><ul>${items.map(itemHtml).join('')}</ul></section>`).join('')}</div></div>`;
}
export function offerLcm(lcm, label, {prices, money} = {}) {
  if (!lcm) return '';
  const priced=typeof money==='function' && Number.isFinite(prices?.gold) && Number.isFinite(prices?.platinum) && prices.gold>=0 && prices.platinum>=0;
  const delta=priced ? prices.platinum-prices.gold : null;
  const price=priced ? `<span>${label('Gold inclus dans votre offre','Gold im Angebot enthalten')} · ${e(money(prices.gold))} / ${label('an','Jahr')}</span><strong class="prime-offer-lcm-price">Platinum · ${e(money(prices.platinum))} / ${label('an','Jahr')}</strong><span>${delta===0 ? label('Au même prix annuel.','Zum gleichen Jahrespreis.') : `${delta>0?'+':'−'}${e(money(Math.abs(delta)))} / ${label('an pour cette alternative.','Jahr für diese Alternative.')}`}</span>` : '';
  return `<div class="prime-offer-lcm"><span>LCM</span> <strong>${e(lcm)}</strong> <span>${label('· formule retenue (mises à jour annualisées)','· gewählte Variante (annualisierte Aktualisierungen)')}</span></div>${lcm==='Gold' ? `<details class="prime-offer-lcm-alternative"><summary>${label('Envie de découvrir Platinum ?','Möchten Sie Platinum entdecken?')}</summary><p>${label('Support et hotline inclus dans votre forfait annuel, sans facturation supplémentaire pour ces prestations.','Support und Hotline sind in Ihrer Jahrespauschale enthalten, ohne zusätzliche Rechnungen für diese Leistungen.')}</p><p>${price}${label('Cette formule remplace Gold, sans cumul des deux tarifs.','Diese Variante ersetzt Gold; die beiden Tarife werden nicht addiert.')}</p></details>` : ''}`;
}

export function offerHosting(az, { asset, label }) {
  return az ? `<div class="prime-offer-hosting-brand"><span>${label('Hébergement assuré par','Hosting durch')}</span><img class="prime-offer-hosting-logo logo-on-dark" src="${e(asset('assets/logos/az-semi-negative.png'))}" alt="AZ Informatique"><img class="prime-offer-hosting-logo logo-on-light" src="${e(asset('assets/logos/az-positive.png'))}" alt="AZ Informatique"></div>` : '';
}
export function offerServices(az, lcm, {asset, label, prices, money}) {
  if (!az && !lcm) return '';
  return `<div class="prime-offer-service-grid">${az ? `<section class="prime-offer-service">${offerHosting(true,{asset,label})}</section>` : ''}${lcm ? `<section class="prime-offer-service"><h4>${label('Accompagnement LCM','LCM-Begleitung')}</h4>${offerLcm(lcm,label,{prices,money})}</section>` : ''}</div>`;
}

export function offerBreakdown(rows, { label, money, legacy = false }) {
  const section = (heading, keys) => {
    const entries = rows.filter(row=>keys.includes(row.key));
    return entries.length ? `<section class="prime-offer-price-section"><h3>${heading}</h3><div class="prime-offer-price-list">${entries.map(row=>`<div class="prime-offer-price-row"><h4>${e(row.label)}</h4><div class="prime-offer-price-values"><div><small>${label('Investissement','Investition')}</small><strong>${e(money(row.investment))}</strong></div><div><small>${label('Annuel dès N+1','Jährlich ab N+1')}</small><strong>${e(money(row.annual))}</strong></div></div></div>`).join('')}</div></section>` : '';
  };
  if(legacy)return section(label('Répartition du prix','Preisaufteilung'),['solutions','partners','hosting']);
  const services = rows.filter(row=>['implementation','migration','management','training','otherServices'].includes(row.key) &&
    (Math.abs(row.investment ?? 0)>.005 || Math.abs(row.annual ?? 0)>.005));
  const travel = row=>/^(?:Déplacements|Reisen|Reisekosten)\b/i.test(row.label || '');
  const hasAnnual = services.some(row=>Math.abs(row.annual ?? 0)>.005);
  const values = row=>`<span>${e(money(row.investment ?? 0).replace(/ CHF(?: HT)?$/, ''))}</span>${hasAnnual ? `<span>${e(money(row.annual ?? 0).replace(/ CHF(?: HT)?$/, ''))}</span>` : ''}`;
  const title = row=>{
    if(row.key==='implementation')return String(row.label || '').replace(/^(?:Mise en (?:œ|oe)uvre|Implementierung)\s*·\s*/i,'').replace(/^(?:Mise en (?:œ|oe)uvre|Implementierung)$/i,'Prime');
    if(/^(?:Déplacements|Reisen|Reisekosten)$/i.test(row.label || ''))return label('Déplacements (estimés)','Reisekosten (geschätzt)');
    return row.label;
  };
  const total = entries=>({investment:entries.reduce((sum,row)=>sum+(row.investment ?? 0),0),annual:entries.reduce((sum,row)=>sum+(row.annual ?? 0),0)});
  const group = (heading, entries, subtotal=true)=>entries.length ? `<div class="prime-offer-service-subgroup">${heading ? `<div class="prime-offer-service-heading"><h4>${heading}</h4>${subtotal?values(total(entries)):''}</div>` : ''}${entries.map(row=>`<div class="prime-offer-service-line"><span>${e(title(row))}</span>${values(row)}</div>`).join('')}</div>` : '';
  const accompaniment = ['migration','training','management','otherServices'].flatMap(key=>services.filter(row=>row.key===key&&!travel(row)));
  const implementation = services.length ? `<section class="prime-offer-price-section"><h3>${label('Mise en oeuvre de votre projet','Umsetzung Ihres Projekts')}</h3><div class="prime-offer-implementation${hasAnnual?' has-annual':''}"><div class="prime-offer-service-columns"><span></span><span>${label('Investissement · CHF HT','Investition · CHF exkl. MWST')}</span>${hasAnnual?`<span>${label('Annuel · CHF HT','Jährlich · CHF exkl. MWST')}</span>`:''}</div>${group(label('Paramétrage et intégration','Konfiguration und Integration'),services.filter(row=>row.key==='implementation'))}${group(label('Accompagnement au déploiement','Begleitung der Einführung'),accompaniment)}${group('',services.filter(travel),false)}<div class="prime-offer-service-total"><strong>${label('Total mise en oeuvre','Total Umsetzung')}</strong>${values(total(services))}</div></div></section>` : '';
  return implementation + section(label('Logiciels et maintenance','Software und Wartung'),['licenses']) +
    section(label('Technique, service et support','Technik, Dienstleistungen und Support'),['database','primePartners','lcm','hosting']);
}
