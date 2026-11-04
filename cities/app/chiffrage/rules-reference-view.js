import { ruleArticles, catalogRules, matchingRules, referenceVersion } from './rules-reference.js?v=20261104-rules-r1';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = {
  publisher_rent:'Rent annuel éditeurs · PA et PV', pce:'ProConcept · méthode et coefficients',
  sql:'SQL Server · utilisateurs et cores', oracle:'Oracle · Full et Light', day_rate:'Tarif journalier',
  lcm:'LCM', service_presets:'Jours standards par module',
  configuration_profiles:'Profils · jours, GP et déplacements', prime_options:'Options Prime · définitions et prix',
  hosting_presets:'Hébergement · propositions de référence', module_contents:'Fonctions incluses · parents et ordre',
  reference_rates:'Taux de référence', review:'Traçabilité et contrôles du catalogue'
};
const fields = {
  pa_rate:'Taux PA',pv_rate:'Taux PV',finance_ratio:'Rapport Finances',finance_adjustment:'Ajustement Finances',
  finance_round_to:'Arrondi Finances',salary_round_to:'Arrondi Salaires',pv_round_to:'Arrondi PV',pv_margin:'Taux PV PCE',
  finance_basis:'Méthode Finances',salary_pv_method:'Méthode PV Salaires',interface_pv:'PV interface',interface_pa:'PA interface',
  finance_base_item_codes:'Articles de base PCE',core_from_population:'Seuil population : cores',default_cores:'Cores par défaut',
  price_per_core:'Prix par core',user_base:'Forfait utilisateurs',price_per_user:'Prix utilisateur',suggestion:'Suggestion utilisateurs',
  lowerPopulation:'Population basse',upperPopulation:'Population haute',lowerUsers:'Utilisateurs bas',upperUsers:'Utilisateurs hauts',
  full_price:'Acquisition Full',light_price:'Acquisition Light',full_maintenance:'Maintenance Full',light_maintenance:'Maintenance Light',
  source_reference:'Référence source',conflict_sources:'Sources en désaccord',alternative_tiers:'Grille alternative',source:'Source',source_sha256:'Empreinte du fichier source',method:'Méthode',sample_size:'Nombre de références',
  up_to:'Borne haute incluse',gold:'Gold',platinium:'Platinum',status:'État source',default:'Profil par défaut',
  label:'Désignation',label_fr:'Désignation FR',label_de:'Désignation DE',description:'Description',
  module_days:'Jours par module',services:'Prestations transversales',project_management:'Gestion de projet',travel_rule:'Déplacements (estimés)',
  default_modules:'Modules précochés',pce_defaults:'Choix PCE',technical_defaults:'Valeurs techniques',prime_lines:'Lignes Prime',partners:'Partenaires',
  days:'Jours retenus',suggested_days:'Jours proposés',percent:'Pourcentage',basis:'Assiette',round_days:'Arrondi jours',exclude_codes:'Codes exclus',
  rate:'Tarif',round_to:"Pas d'arrondi",waived:'Offerts',quantity:'Quantité',annual_pv:'PV annuel',annual_pa:'PA annuel',
  investment_pv:'PV initial',investment_pa:'PA initial',investment_fixed_pv:'Licence initiale fixe',investment_override:'PV initial retenu',
  unit_day_rate:'Tarif jour spécifique',annual_rule:'Formule annuelle',per_capita:'Coefficient par habitant',
  requires_product:'Produit requis',requires_products:'Produits requis',requires_pce_option:'Option PCE requise',requires_module_prefix:'Préfixe module requis',
  item_code:'Code article',parent:'Module parent',enabled:'Actif',order:'Ordre',gp_included:'Inclus dans la GP',source_grid_note:'Note de grille',
  pricing_rule:'Règle tarifaire',kind:'Méthode',tiers:'Paliers',value:'Valeur logiciel',ratio:'Ratio',reference_value:'Valeur de référence',
  quantity_round_to:'Arrondi quantité supérieur',minimum_basis:'Quantité minimale',zero_is_free:'Gratuit si quantité nulle',
  below_first:'Sous la première ancre',above_last:'Au-delà de la grille',from:'Ancre basse',max_population:'Plafond population',
  value_multiplier:'Multiplicateur source',rate_class:'Classe commerciale',catalog_version:'Version catalogue',
  gold_evidence:'Preuves Gold',platinium_evidence:'Preuves Platinum',explanation:'Explication',lines:'Lignes',products:'Produits',
  module_group_labels:'Forfaits modules',family:'Famille',category:'Catégorie',supplier:'Fournisseur',note:'Note'
};
const statusLabel = (key,l) => ({confirmed:l('Confirmée','Bestätigt'),review:l('À confirmer','Zu bestätigen'),arbitrate:l('À arbitrer','Zu klären'),planned:l('Prévue','Geplant')})[key];
const originLabel = (key,l) => ({alex:'Alex',code:l('Code constaté','Im Code festgestellt'),catalog:l('Catalogue source','Quellkatalog')})[key];

// Business tables first; provenance is kept in its own disclosure.
const technicalKey = key => /source|evidence|sha256|^review$|^status$|conflict|alternative_tiers|explanation/.test(key);
const scalar = value => value==null || typeof value!=='object';
const meanings={population:'Habitants',meters:'Compteurs',taxes:'Taxes',employees:'Employés',
  innosolv_plus_options:'PA innosolv + complément options',markup:'Majoration sur PA',margin:'Marge sur PV',
  lookup:'Prix par palier',linear_rounded:'Interpolation puis arrondi',rounded_ratio:'Ratio puis arrondi',
  unverified:'Prix manuel requis',prime_service_days:'Jours Prime admissibles',
  project_days_including_partners_gp:'Jours du projet, GP et partenaires compris',hold:'Premier palier conservé'};

const format = (value,l) => value==null ? l('À préciser','Noch offen') : typeof value==='boolean' ?
  (value?l('Oui','Ja'):l('Non','Nein')) : typeof value==='number' ? new Intl.NumberFormat('de-CH',{maximumFractionDigits:4}).format(value).replace(/'/g,"'") : (meanings[value] || String(value));
function compactTable(headers,rows,l,{wide=false,caption=''}={}) {
  return `<div class="rule-parameter-scroll" tabindex="0" role="region" aria-label="${l('Tableau de référence','Referenztabelle')}"><table class="rule-parameters${wide?' rule-matrix':''}">${caption?`<caption>${e(caption)}</caption>`:''}<thead><tr>${headers.map(h=>`<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row">${e(format(cell,l))}</th>`:`<td>${e(format(cell,l))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function lcmTable(rows,l) {
  let previous=0;
  return compactTable([l('Habitants','Einwohner'),'Gold','Platinum'],[...rows].sort((a,b)=>a.up_to-b.up_to).map(row=>{
    const range=`${format(previous===0?0:previous+1,l)}–${format(row.up_to,l)}`;previous=row.up_to;
    return [range,row.gold,row.platinium];
  }),l,{caption:'CHF HT / an'});
}
function sqlTables(sql,l) {
  const rows=[['Forfait (CHF)',sql.user_base],['Utilisateur (CHF)',sql.price_per_user],['Seuil cores (hab.)',sql.core_from_population],['Cores',sql.default_cores],['Core (CHF)',sql.price_per_core]];
  const a=sql.suggestion;
  return compactTable([l('SQL · paramètre','SQL · Parameter'),l('Valeur','Wert')],rows,l)+
    (a?`<h4>${l('Utilisateurs proposés','Vorgeschlagene Benutzer')}</h4>`+compactTable([l('Habitants','Einwohner'),l('Utilisateurs','Benutzer')],[[a.lowerPopulation,a.lowerUsers],[a.upperPopulation,a.upperUsers]],l):'');
}
export function parameterTable(value,l,catalog={}) {
  const moduleName=key=>{
    const item=(catalog.items ?? []).find(row=>`${row.vendor}/${row.product}/${row.item_code}`===key);
    return item?.label_fr || item?.label_de || ({'pce/ERP/finances':'Finances PCE','pce/ERP/salaires':'Salaires PCE'})[key] || key;
  };
  const annualValue=row=>row.annual_rule ? `Habitants × ${format(row.annual_rule.per_capita,l)} · arrondi ${format(row.annual_rule.round_to,l)}` : row.annual_pv;

  const render=(node)=>{
    if(scalar(node))return compactTable([l('Paramètre','Parameter'),l('Valeur','Wert')],[[l('Valeur','Wert'),node]],l);
    if(Array.isArray(node)) {
      if(!node.length)return '';
      if(node.every(scalar))return `<p class="rule-value-list">${e(node.map(v=>format(v,l)).join(' · '))}</p>`;
      if(node.every(row=>row && typeof row==='object' && 'up_to' in row && ('gold' in row || 'platinium' in row)))return lcmTable(node,l);
      if(node.every(row=>row && typeof row==='object' && 'up_to' in row && ('value' in row || 'ratio' in row))) {
        const key=node.some(row=>'value' in row)?'value':'ratio';
        return compactTable([l("Jusqu'à",'Bis'),fields[key]],node.map(row=>[row.up_to,row[key]]),l);
      }
      if(node.every(row=>row && typeof row==='object' && 'parent' in row && ('label_fr' in row || 'label' in row)))return compactTable([l('Module parent','Übergeordnetes Modul'),l('Fonction incluse','Enthaltene Funktion')],node.map(row=>[moduleName(row.parent),(row.label_fr || row.label)+(row.enabled===false?' (désactivée)':'')]),l);
      if(node.every(row=>row && typeof row==='object' && ('label_fr' in row || 'label' in row) && !('module_days' in row)) && node.some(row=>'days' in row || 'annual_pv' in row || 'investment_pv' in row || 'investment_fixed_pv' in row)) {
        const has=key=>node.some(row=>key in row);
        const keys=['days','investment_pv','investment_fixed_pv','annual_pv'].filter(key=>has(key) && (key!=='investment_fixed_pv' || !has('investment_pv')));
        const headings={days:l('Jours','Tage'),investment_pv:l('Initial · CHF HT','Einmalig · CHF'),investment_fixed_pv:l('Licence initiale · CHF HT','Erstlizenz · CHF'),annual_pv:l('Annuel · CHF HT','Jährlich · CHF')};
        const matrix=compactTable([l('Prestation / module','Leistung / Modul'),...keys.map(key=>headings[key])],node.map(row=>[(row.label_fr || row.label)+(row.quantity!=null && row.quantity!==1?' × '+format(row.quantity,l):'')+(row.enabled===false?' (désactivé)':''),...keys.map(key=>key==='annual_pv'?annualValue(row):row[key])]),l,{wide:keys.length>2});
        const extras=node.map(row=>({title:row.label_fr || row.label,values:Object.fromEntries(Object.entries(row).filter(([key,v])=>!keys.includes(key) && !['label_fr','label_de','label','id','item_code','quantity','enabled'].includes(key) && !technicalKey(key) && v!=null))})).filter(row=>Object.keys(row.values).length);
        return matrix+(extras.length?`<details class="rule-parameter-extra"><summary>${l('Conditions et autres paramètres','Bedingungen und weitere Parameter')}</summary>${extras.map(row=>`<h4>${e(row.title)}</h4>${render(row.values)}`).join('')}</details>`:'');
      }
      return node.map((row,i)=>`<section class="rule-parameter-group"><h4>${e(row?.label_fr || row?.label || row?.item_code || '#'+(i+1))}</h4>${render(Object.fromEntries(Object.entries(row ?? {}).filter(([key])=>!['label','label_fr','label_de','id'].includes(key))))}</section>`).join('');
    }
    if('core_from_population' in node && 'user_base' in node)return sqlTables(node,l);
    if('lowerPopulation' in node && 'upperPopulation' in node)return compactTable([l('Habitants','Einwohner'),l('Utilisateurs','Benutzer')],[[node.lowerPopulation,node.lowerUsers],[node.upperPopulation,node.upperUsers]],l);
    if('full_price' in node && 'light_price' in node)return compactTable([l('Oracle','Oracle'),l('Acquisition','Anschaffung'),l('Annuel','Jährlich')],[['Full',node.full_price,node.full_maintenance],['Light',node.light_price,node.light_maintenance]],l);
    if(Object.keys(node).length && Object.values(node).every(v=>v && typeof v==='object' && !Array.isArray(v) && 'pa_rate' in v && 'pv_rate' in v))return compactTable([l('Classe','Klasse'),'PA','PV'],Object.entries(node).map(([key,v])=>[key,format(v.pa_rate*100,l)+' %',format(v.pv_rate*100,l)+' %']),l);
    const entries=Object.entries(node).filter(([key,v])=>v!==undefined && !technicalKey(key));
    const simple=entries.filter(([,v])=>scalar(v));
    const nested=entries.filter(([,v])=>!scalar(v));
    const singleWrapper=entries.length===1 && nested.length===1;
    return (simple.length?compactTable([l('Paramètre','Parameter'),l('Valeur','Wert')],simple.map(([k,v])=>[fields[k] || moduleName(k),v]),l):'')+
      nested.map(([key,child])=>`${singleWrapper?'':`<h4>${e(names[key] || fields[key] || key)}</h4>`}${render(child)}`).join('');
  };
  return render(value);
}
function provenance(value,l) {
  const found=[];
  const walk=(node,path=[])=>{
    if(!node || typeof node!=='object')return;
    for(const [key,child] of Object.entries(node)) {
      if(technicalKey(key) && child!==undefined)found.push([path.join(' · '),fields[key] || key,child]);
      else if(child && typeof child==='object')walk(child,[...path,Array.isArray(node)?child.label_fr || child.label || child.item_code || (child.up_to!=null?'≤ '+child.up_to:'#'+(Number(key)+1)):names[key] || fields[key] || key]);
    }
  };
  walk(value);
  return found.length?`<pre>${e(found.map(([context,key,v])=>[context,key,typeof v==='object'?JSON.stringify(v,null,2):v].filter(Boolean).join(' · ')).join('\n\n'))}</pre>`:'';
}
function parameterRules(catalog) {
  return Object.entries(catalog?.parameters ?? {}).map(([key,value])=>({
    id:'parameter:'+key,chapter:'Paramètres actifs',title:names[key] || key,
    summary:'Lecture seule',formula:'',
    code:'Catalogue commercial protégé · '+key,origin:'catalog',status:'review',value,
    search:JSON.stringify(value)
  }));
}
export function referenceRows(catalog,kind='rules') {
  return kind==='catalog' ? catalogRules(catalog) : kind==='parameters' ? parameterRules(catalog) : ruleArticles;
}
export function referenceShell(catalog,l,filters={}) {
  const counts={rules:ruleArticles.length,catalog:catalog?.items?.length ?? 0,parameters:Object.keys(catalog?.parameters ?? {}).length};
  const kind=filters.kind || 'rules';
  return `<section class="chiffrage-section rules-reference" aria-labelledby="rules-title">
    <div class="rules-heading"><div><p class="chiffrage-kicker">${l('Règles communes · référentiel Prime','Gemeinsame Regeln · Prime-Referenz')}</p><h2 id="rules-title">${l('Le dictionnaire du chiffrage','Das Kalkulationslexikon')}</h2></div><span class="rules-edition">${l('Édition','Ausgabe')} ${referenceVersion}</span></div>
    <p>${l('Les règles du jeu, pour toutes les offres. Formules, présélections, exceptions et provenance dans un seul référentiel.','Die Regeln für alle Angebote. Formeln, Vorauswahl, Ausnahmen und Herkunft in einem Nachschlagewerk.')}</p>
    <p class="chiffrage-helper">${l('« Code constaté » décrit le comportement actuel ; « À confirmer » ne signifie pas que le calcul est faux. Une contradiction est soumise à Alex avant correction.','« Im Code festgestellt » beschreibt das heutige Verhalten. « Zu bestätigen » bedeutet nicht, dass die Berechnung falsch ist. Widersprüche werden vor einer Korrektur mit Alex geklärt.')}${l('',' Fachredaktion auf Französisch.')}</p>
    <div class="rules-tabs" role="group" aria-label="${l('Contenu du référentiel','Referenzinhalt')}">${[['rules',l('Règles','Regeln')],['parameters',l('Paramètres actifs','Aktuelle Parameter')],['catalog',l('Grilles par article','Artikelpreisregeln')]].map(([key,title])=>`<button type="button" class="chiffrage-button" data-rule-kind="${key}" aria-pressed="${key===kind}">${title} <small>${counts[key]}</small></button>`).join('')}</div>
    <div class="rules-filters"><label>${l('Rechercher','Suchen')}<input type="search" data-rule-filter="query" value="${e(filters.query)}" placeholder="${l('Une règle, un module, une source…','Regel, Modul, Quelle…')}"></label>
    <label>${l('Chapitre','Kapitel')}<select data-rule-filter="chapter"><option value="">${l('Tous les chapitres','Alle Kapitel')}</option>${[...new Set(referenceRows(catalog,kind).map(row=>row.chapter))].map(chapter=>`<option ${filters.chapter===chapter?'selected':''}>${e(chapter)}</option>`).join('')}</select></label>
    <label>${l('Validation métier','Fachliche Freigabe')}<select data-rule-filter="status"><option value="">${l('Tous les états','Alle Status')}</option>${['confirmed','review','arbitrate','planned'].map(key=>`<option value="${key}" ${filters.status===key?'selected':''}>${statusLabel(key,l)}</option>`).join('')}</select></label>
    <button type="button" class="chiffrage-button" data-rule-reset>${l('Réinitialiser','Zurücksetzen')}</button></div>
    <p class="rules-version-note">${l("Catalogue actif à l'ouverture · les anciennes offres conservent leurs propres versions. Tarifs en lecture seule.",'Aktiver Katalog beim Öffnen · bestehende Angebote behalten ihre eigenen Versionen. Preise schreibgeschützt.')} ${e((catalog?.versions ?? []).map(v=>`${v.vendor} · ${v.version}`).join(' / '))}</p>
    <div data-rule-results></div>
  </section>`;
}
function relatedParameters(row,catalog) {
  const p=catalog?.parameters ?? {};
  const keys={L04:['publisher_rent'],P01:['pce'],P02:['pce'],P03:['pce'],P04:['pce'],
    T03:['oracle'],J03:['day_rate'],H01:['lcm']};
  const pick=(object,keys)=>Object.fromEntries(keys.filter(key=>object?.[key]!==undefined).map(key=>[key,object[key]]));
  if(row.id==='T01')return p.sql?.suggestion;
  if(row.id==='T02')return p.sql ? Object.fromEntries(Object.entries(p.sql).filter(([key])=>key!=='suggestion')) : undefined;
  const pceKeys={P01:['finance_basis','finance_ratio','finance_adjustment','finance_round_to','finance_base_item_codes'],P02:['pv_margin','pv_round_to','interface_pa','interface_pv'],P03:['salary_round_to','salary_pv_method','pv_margin','pv_round_to'],P04:['finance_basis','interface_pv','interface_pa']};
  if(pceKeys[row.id] && p.pce)return pick(p.pce,pceKeys[row.id]);
  if(keys[row.id]) {
    const values=Object.fromEntries(keys[row.id].filter(key=>p[key]!==undefined).map(key=>[names[key] || key,p[key]]));
    return Object.keys(values).length?values:undefined;
  }
  if(['J05','J06'].includes(row.id)) {
    const key=row.id==='J05'?'project_management':'travel_rule';
    return (p.configuration_profiles ?? []).filter(profile=>profile[key]).map(profile=>({label:profile.label,source:profile.source,[key]:profile[key]}));
  }
  return undefined;
}
export function referenceResults(catalog,l,filters={},openIds=new Set()) {
  const all=referenceRows(catalog,filters.kind), rows=matchingRules(all,filters);
  let previous='';
  return `<div class="rules-result-tools"><p role="status">${rows.length} / ${all.length} ${l('entrées','Einträge')}</p><div class="chiffrage-actions"><button type="button" class="chiffrage-button quiet" data-rule-expand="true">${l('Tout déplier','Alle öffnen')}</button><button type="button" class="chiffrage-button quiet" data-rule-expand="false">${l('Tout replier','Alle schliessen')}</button></div></div>
  <div class="rules-columns" aria-hidden="true"><span>${l('Article / règle','Artikel / Regel')}</span><span>${l('Principe','Grundsatz')}</span><span>${l('Origine / validation','Herkunft / Freigabe')}</span></div>
  ${rows.map(row=>{
    const heading=previous!==row.chapter?`<h3 class="rules-chapter">${e(row.chapter)}</h3>`:'';previous=row.chapter;
    const data=row.item ? {pricing_rule:row.item.pricing_rule,rate_class:row.item.rate_class ?? 'standard',source:row.item.source,source_grid_note:row.item.source_grid_note,conflict_sources:row.item.conflict_sources,alternative_tiers:row.item.alternative_tiers,source_sha256:row.item.source_sha256,catalog_version:row.item.catalog_version} : row.value===undefined ? relatedParameters(row,catalog) : row.value;
    return heading+`<details class="rule-entry" data-rule-id="${e(row.id)}" ${openIds.has(row.id)?'open':''}><summary><span class="rule-name"><small>${e(row.id.startsWith('article:')?'SW / ID':row.id.startsWith('parameter:')?'PARAM':row.id)}</small><strong>${e(row.title)}</strong></span><span class="rule-principle">${e(row.item?`${format(row.item.pricing_rule?.basis,l)} · ${format(row.item.pricing_rule?.kind,l)}`:row.summary)}</span><span class="rule-state"><span>${originLabel(row.origin,l)}</span><span class="rule-status" data-status="${row.status}">${statusLabel(row.status,l)}</span></span></summary><div class="rule-body">${data===undefined?`<p>${e(row.formula)}</p>${row.note?`<p class="rule-note">${e(row.note)}</p>`:''}`:parameterTable(data,l,catalog)+(row.formula?`<details class="rule-explanation"><summary>${l('Comprendre la règle','Regel verstehen')}</summary><p>${e(row.formula)}</p>${row.note?`<p>${e(row.note)}</p>`:''}</details>`:'')}<details class="rule-provenance"><summary>${l('Sources et détails techniques','Quellen und technische Details')}</summary><dl><dt>${l('Source / implémentation','Quelle / Implementierung')}</dt><dd>${e(row.code)}</dd></dl>${data===undefined?'':provenance(data,l)}</details></div></details>`;
  }).join('') || `<p class="rules-empty">${l('Aucune règle ne correspond à ces filtres.','Keine Regel entspricht diesen Filtern.')}</p>`}`;
}
export function bindReference(root,getCatalog,l,filters,openIds) {
  const results=()=>{const node=root.querySelector('[data-rule-results]');if(node)node.innerHTML=referenceResults(getCatalog(),l,filters,openIds);};
  const shell=()=>{const node=root.querySelector('.rules-reference');if(node){node.outerHTML=referenceShell(getCatalog(),l,filters);results();}};
  root.addEventListener('input',event=>{if(event.target.dataset.ruleFilter==='query'){filters.query=event.target.value;results();}});
  root.addEventListener('change',event=>{const key=event.target.dataset.ruleFilter;if(key && key!=='query'){filters[key]=event.target.value;results();}});
  root.addEventListener('toggle',event=>{const id=event.target.dataset.ruleId;if(id){if(event.target.open)openIds.add(id);else openIds.delete(id);}},true);
  root.addEventListener('click',event=>{
    const kind=event.target.closest('[data-rule-kind]');
    if(kind){Object.assign(filters,{kind:kind.dataset.ruleKind,chapter:'',status:'',query:''});shell();return;}
    if(event.target.closest('[data-rule-reset]')){Object.assign(filters,{query:'',chapter:'',status:''});shell();return;}
    const expand=event.target.closest('[data-rule-expand]');
    if(expand)for(const detail of root.querySelectorAll('details[data-rule-id]')) {detail.open=expand.dataset.ruleExpand==='true';if(detail.open)openIds.add(detail.dataset.ruleId);else openIds.delete(detail.dataset.ruleId);}
  });
  return results;
}
