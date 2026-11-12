import {partnerBrand} from '../chiffrage/commercial-breakdown.js?v=20261112-coherence-r1';
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
export function offerFigures(amounts, { label, money, incomplete = false, caveat = '', municipal = false, annualBreakdown = null, annualBudget = null }) {
  const budget = annualBudget ?? (annualBreakdown ? {softwareAndSupport:amounts.annual-(annualBreakdown.hosting??0)-(annualBreakdown.lcm??0),lcm:annualBreakdown.lcm??0,hosting:annualBreakdown.hosting??0,publisher:0,total:amounts.annual} : null);
  const annualDetails = municipal && budget ? `<div class="prime-offer-recurring-budget"><dl>${[
    ['softwareAndSupport','Logiciels','Software'],
    ['lcm','LCM','LCM'],['hosting','Hébergement','Hosting']
  ].map(([key,fr,de])=>`<div><dt>${label(fr,de)}</dt><dd>${e(money(budget[key]??0))} <small>/ ${label('an','Jahr')}</small></dd></div>`).join('')}</dl><p><span>${label('Budget annuel total','Jährliches Gesamtbudget')}</span><strong>${e(money(budget.total))}</strong></p></div>` : '';
  if (municipal) return `<section class="chiffrage-offer-summary"><div class="prime-offer-communal-figures">
    <div><span>${label("Coût d’investissement",'Investitionskosten')}</span><strong>${e(money(amounts.investment)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Une fois','Einmalig')}</small></div>
    <div><span>${label(budget?'Logiciels / an':'Budget annuel total',budget?'Software / Jahr':'Jährliches Gesamtbudget')}</span><strong>${e(money(budget?.softwareAndSupport ?? amounts.annual)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Dès la 2e année','Ab dem zweiten Jahr')}</small></div>
    <div><span>${label('Coût total sur 5 ans','Gesamtkosten über 5 Jahre')}</span><strong>${e(money(amounts.tco5y)).replace(/ CHF HT$/, ' <span class="prime-offer-currency">CHF HT</span>')}</strong><small>${label('Investissement + 4 annuités','Investition + 4 Jahresbeträge')}</small></div>
    </div>${annualDetails}${caveat}</section>`;
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
const logos = { innosolvcity:'innosolvcity.png', ProConcept:'proconcept-wordmark.png', Abacus:'abacus-red-negative.svg', Prime:'prime-logo-negative.svg', 'Doc.Series':'doc-series-negative.png',eAdmin:'eadmin-negative.png' };
export function offerScope(groups, { asset, label = fr => fr }) {
  const branded=new Map();
  for(const group of groups)for(const item of group.items){
    const product=['Prime','Partenaires'].includes(group.product)?partnerBrand(typeof item==='string'?item:item.label)||group.product:group.product;
    if(!branded.has(product))branded.set(product,[]);branded.get(product).push(item);
  }
  groups=[...branded].map(([product,items])=>({product,items}));
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
    if(Array.isArray(item.items))return `<li class="prime-offer-scope-parent"><details class="prime-offer-scope-section"><summary class="prime-offer-scope-heading">${e(item.label)} <span>· ${item.items.reduce((sum,row)=>sum+1+(row.included?.length??0),0)} ${label(item.items.reduce((sum,row)=>sum+1+(row.included?.length??0),0)===1?'module':'modules','Module')}</span></summary><ul class="prime-offer-scope-modules">${item.items.map(itemHtml).join('')}</ul></details></li>`;
    const children = item.included ?? [];
    if (!children.length) return `<li>${item.reference?`<span class="prime-offer-reference-code">${e(item.reference)}</span> `:''}${e(item.label)}</li>`;
    // A priced parent stays a module when it also becomes a section heading.
    // All software uses the same visible list, independently of its pricing model.
    const modules = [{label:item.label}, ...children];
    const themes = new Map();
    for (const module of modules) {
      const theme = module.theme && module.theme !== item.label ? module.theme : '';
      if (!themes.has(theme)) themes.set(theme, []);
      themes.get(theme).push(module);
    }
    return `<li class="prime-offer-scope-parent"><details class="prime-offer-scope-section"><summary class="prime-offer-scope-heading">${item.reference?`<span class="prime-offer-reference-code">${e(item.reference)}</span> `:''}${e(item.label)} <span>· ${modules.length} ${label('modules inclus','enthaltene Module')}</span></summary>${[...themes].map(([theme,rows])=>`${theme ? `<h6 class="prime-offer-scope-subheading">${e(theme)}</h6>` : ''}<ul class="prime-offer-scope-modules">${rows.map(module=>`<li>${e(module.label)}</li>`).join('')}</ul>`).join('')}</details></li>`;
  };
  const grouped = groups.some(group=>group.items.some(item=>typeof item==='object' && (item.items?.length || item.included?.length)));
  const controls = grouped ? `<div class="prime-offer-scope-tools"><button type="button" class="prime-offer-scope-toggle" data-scope-toggle data-expand-label="${e(label('Tout déplier','Alle aufklappen'))}" data-collapse-label="${e(label('Tout replier','Alle zuklappen'))}" aria-expanded="false">${label('Tout déplier','Alle aufklappen')}</button></div>` : '';
  const columns=groups.filter(group=>group.product!=='Prime').map(group=>[group]);
  const prime=groups.filter(group=>group.product==='Prime');
  if(prime.length){if(!columns.length)columns.push([]);const index=Math.max(0,columns.findIndex(column=>column[0]?.product==='innosolvcity'));columns[index].push(...prime);}
  return `<div class="prime-offer-scope">${controls}<div class="prime-offer-module-grid">${columns.map(column=>`<div class="prime-offer-module-column">${column.map(({ product, items })=>`<section class="prime-offer-module-group"><h4 class="${product==='Abacus'?'brand-abacus':product==='innosolvcity'?'brand-innosolv':''}">${logos[product] ? `<img class="prime-offer-software-logo ${['ProConcept','Abacus','Prime','Doc.Series','eAdmin'].includes(product)?'logo-on-dark':''}" src="${e(asset(product==='Prime'?logos[product]:`assets/logos/${logos[product]}`))}" alt="${e(product)}">${product==='Abacus'?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/abacus-wordmark.png'))}" alt="Abacus">`:''}${product==='ProConcept'?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/proconcept-dark.png'))}" alt="ProConcept">`:''}${['Doc.Series','eAdmin'].includes(product)?`<img class="prime-offer-software-logo logo-on-light" src="${e(asset('assets/logos/'+(product==='Doc.Series'?'doc-series-positive.png':'eadmin-positive.png')))}" alt="${e(product)}">`:''}` : e(product)}</h4><ul>${items.map(itemHtml).join('')}</ul></section>`).join('')}</div>`).join('')}</div></div>`;
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

export function offerInvestmentAdjustment(rows,{label,money}) {
  const discount=-(rows??[]).filter(row=>row.key==='discount').reduce((sum,row)=>sum+(row.investment??0),0);
  if(discount<=0)return '';
  const gross=rows.filter(row=>row.key!=='discount').reduce((sum,row)=>sum+(row.investment??0),0);
  return `<section class="prime-offer-investment-adjustment"><h3>${label('Votre investissement','Ihre Investition')}</h3><dl><div><dt>${label('Investissement avant remise','Investition vor Rabatt')}</dt><dd>${e(money(gross))}</dd></div><div><dt>${label('Remise commerciale sur l’investissement','Investitionsrabatt')}</dt><dd>− ${e(money(discount))}</dd></div><div><dt>${label('Investissement net HT','Nettoinvestition exkl. MWST')}</dt><dd>${e(money(Math.round((gross-discount)*100)/100))}</dd></div></dl></section>`;
}

export function offerBreakdown(rows, { label, money, legacy = false, publisherRows = [] }) {
  // Reconcile older frozen projections without editing their stored prices.
  const entries=rows.map(row=>({...row,label:row.key==='implementation'?String(row.label||'').replace(/^(?:Mise en (?:œ|oe)uvre|Implementierung)\s*·\s*/i,'').replace(/^(?:Mise en (?:œ|oe)uvre|Implementierung)$/i,'Prime'):/^(?:Déplacements|Reisen|Reisekosten)$/.test(row.label||'')?label('Déplacements (estimés)','Reisekosten (geschätzt)'):row.label}));
  const direct=publisherRows.reduce((sum,row)=>sum+(row.annual??0),0);
  if(direct && !entries.some(row=>row.key==='licenses'&&/portail|portal/i.test(row.label||''))){
    const abacus=entries.find(row=>row.key==='licenses'&&/^Abacus$/i.test(row.label||''));
    if(abacus && abacus.annual>=direct){abacus.annual-=direct;entries.push({key:'licenses',label:'Portail Abacus',investment:0,annual:direct});}
  }
  const investLabel=label('Investissement','Investition'),annualLabel=label('Annuel dès N+1','Jährlich ab N+1');
  const values=(row,annual)=>`<span class="prime-offer-amount" data-caption="${e(investLabel)}">${e(money(row.investment??0))}</span>${annual?`<span class="prime-offer-amount" data-caption="${e(annualLabel)}">${e(money(row.annual??0))}</span>`:''}`;
  const table=(body,{annual=false}={})=>`<div class="prime-offer-price-table${annual?' has-annual':''}"><div class="prime-offer-table-columns"><span></span><span>${investLabel}</span>${annual?`<span>${annualLabel}</span>`:''}</div>${body}</div>`;
  const row=(entry,annual)=>{
    const portal=entry.key==='licenses'&&/portail|portal/i.test(entry.label||'');
    return `<div class="prime-offer-table-row"><h4>${e(entry.label)}${portal?`<small>${label('Facturé directement par l’éditeur','Direkt vom Hersteller verrechnet')}</small>`:''}</h4>${values(entry,annual)}</div>`;
  };
  const section=(heading,keys)=>{const chosen=entries.filter(row=>keys.includes(row.key));if(!chosen.length)return '';const annual=chosen.some(row=>Math.abs(row.annual??0)>.005);return `<section class="prime-offer-price-section"><h3>${heading}</h3>${table(chosen.map(entry=>row(entry,annual)).join(''),{annual})}</section>`;};
  if(legacy)return section(label('Répartition du prix','Preisaufteilung'),['solutions','partners','hosting'])+offerInvestmentAdjustment(entries,{label,money});
  const services=entries.filter(row=>['implementation','migration','management','training','otherServices'].includes(row.key)&&(Math.abs(row.investment??0)>.005||Math.abs(row.annual??0)>.005));
  const total=selected=>({investment:selected.reduce((sum,row)=>sum+(row.investment??0),0),annual:selected.reduce((sum,row)=>sum+(row.annual??0),0)});
  const annual=services.some(row=>Math.abs(row.annual??0)>.005);
  const group=(heading,selected)=>selected.length?`<div class="prime-offer-table-group">${heading?`<div class="prime-offer-table-row is-subtotal"><h4>${heading}</h4>${values(total(selected),annual)}</div>`:''}${selected.map(entry=>row(entry,annual)).join('')}</div>`:'';
  const implementation=services.length?`<section class="prime-offer-price-section"><h3>${label('Mise en oeuvre de votre projet','Umsetzung Ihres Projekts')}</h3>${table(group(label('Paramétrage et intégration','Konfiguration und Integration'),services.filter(row=>row.key==='implementation'))+group(label('Accompagnement au déploiement','Begleitung der Einführung'),services.filter(row=>row.key!=='implementation'))+`<div class="prime-offer-table-row is-total"><h4>${label('Total mise en oeuvre','Total Umsetzung')}</h4>${values(total(services),annual)}</div>`,{annual})}</section>`:'';
  const order=['innosolvcity','Abacus','Portail Abacus','Prime'];
  entries.sort((a,b)=>{const rank=row=>{const n=order.indexOf(row.label);return n<0?99:n;};return rank(a)-rank(b);});
  return implementation+section(label('Logiciels et maintenance','Software und Wartung'),['licenses'])+section(label('Technique','Technik'),['database','primePartners'])+section(label('Accompagnement LCM','LCM-Begleitung'),['lcm'])+section(label('Hébergement','Hosting'),['hosting'])+offerInvestmentAdjustment(entries,{label,money});
}

// Optional ideas are independent from included-module disclosures.
export function offerOptions(options,{label,money}) {
  const safe=(options??[]).filter(row=>row&&typeof row.label_fr==='string'&&typeof row.benefit_fr==='string'&&Number.isFinite(row.investment)&&Number.isFinite(row.annual)&&row.investment>=0&&row.annual>=0).slice(0,6);
  if(!safe.length)return '';
  const card=row=>`<article class="prime-offer-option"><span class="prime-offer-option-badge">${label('Option non comprise','Nicht enthaltene Option')}</span><h4>${e(label(row.label_fr,row.label_de||row.label_fr))}</h4><p>${e(label(row.benefit_fr,row.benefit_de||row.benefit_fr))}</p><dl class="prime-offer-option-prices"><div><dt>${label('Supplément initial','Einmaliger Aufpreis')}</dt><dd>+ ${e(money(row.investment))}</dd></div><div><dt>${label('Supplément annuel dès N+1','Jährlicher Aufpreis ab N+1')}</dt><dd>+ ${e(money(row.annual))}</dd></div></dl>${row.description_fr?`<details class="prime-offer-option-detail"><summary>${label('Découvrir','Entdecken')}</summary><p>${e(label(row.description_fr,row.description_de||row.description_fr))}</p></details>`:''}</article>`;
  return `<section class="prime-offer-options"><details class="prime-offer-options-disclosure"><summary><span><strong>${label('Pour aller plus loin','Weitere Möglichkeiten')}</strong><small>${label('Options non comprises dans cette offre','Nicht im Angebot enthaltene Optionen')}</small></span><span class="prime-offer-options-count">${safe.length} ${label(safe.length===1?'possibilité':'possibilités',safe.length===1?'Möglichkeit':'Möglichkeiten')}</span></summary><div class="prime-offer-options-body"><p>${label('Quelques idées pour votre commune. Les suppléments ci-dessous sont hors des totaux de votre offre ; chaque option est chiffrée séparément.','Einige Ideen für Ihre Gemeinde. Die folgenden Aufpreise sind nicht in den Angebotssummen enthalten; jede Option wird einzeln kalkuliert.')}</p><div class="prime-offer-option-grid">${safe.slice(0,3).map(card).join('')}</div>${safe.length>3?`<details class="prime-offer-options-more"><summary>${label('Voir les autres possibilités','Weitere Möglichkeiten ansehen')} (${safe.length-3})</summary><div class="prime-offer-option-grid">${safe.slice(3).map(card).join('')}</div></details>`:''}</div></details></section>`;
}

export function offerPublisherBilling(rows, { label, money }) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return `<section class="prime-offer-price-section"><h3>${label('Facturation directe par l’éditeur','Direkte Rechnungsstellung durch den Hersteller')}</h3><p>${label('Ces abonnements sont compris dans le budget annuel présenté. Ils sont facturés directement par l’éditeur, séparément de Prime.','Diese Abonnemente sind im ausgewiesenen Jahresbudget enthalten. Sie werden direkt vom Hersteller und getrennt von Prime verrechnet.')}</p><div class="prime-offer-price-list">${rows.map(row => `<div class="prime-offer-price-row"><h4>${e(row.label)}${Number.isInteger(row.users) ? ` · ${row.users} ${label('utilisateurs','Benutzer')}` : ''}</h4><strong>${e(money(row.annual))} / ${label('an','Jahr')}</strong></div>`).join('')}</div></section>`;
}
