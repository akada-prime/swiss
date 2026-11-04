import { ruleArticles, catalogRules, matchingRules, referenceVersion } from './rules-reference.js?v=20261104-rules-r1';

const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = {
  publisher_rent:'Rent annuel éditeurs · PA et PV', pce:'ProConcept · méthode et coefficients',
  sql:'SQL Server · utilisateurs et cores', oracle:'Oracle · Full et Light', day_rate:'Tarif journalier',
  lcm:'LCM · classes et preuves', service_presets:'Jours standards par module',
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

// A readable parameter tree, never HTML supplied by the catalog. Unknown fields stay visible.
export function parameterTable(value, label) {
  const rows=[];
  const walk=(node,path=[])=>{
    if(node && typeof node==='object') {
      const entries=Object.entries(node);
      if(!entries.length) rows.push([path.join(' › '),'—']);
      else for(const [key,child] of entries) {
        const segment=Array.isArray(node) ? (child?.label_fr || child?.label || child?.item_code || (child?.up_to != null ? '≤ '+child.up_to : '#'+(Number(key)+1))) : fields[key] || key;
        if(child!==undefined)walk(child,[...path,segment]);
      }
    } else rows.push([path.join(' › ') || label('Valeur','Wert'),node==null?label('Non renseigné','Nicht angegeben'):typeof node==='boolean'?(node?label('Oui','Ja'):label('Non','Nein')):node]);
  };
  walk(value);
  return `<div class="rule-parameter-scroll" tabindex="0" role="region" aria-label="${label('Paramètres · défilement horizontal','Parameter · horizontal scrollen')}"><table class="rule-parameters"><thead><tr><th>${label('Paramètre / provenance','Parameter / Herkunft')}</th><th>${label('Valeur active','Aktueller Wert')}</th></tr></thead><tbody>${rows.map(([key,val])=>`<tr><th scope="row">${e(key)}</th><td>${e(val)}</td></tr>`).join('')}</tbody></table></div>`;
}
function parameterRules(catalog) {
  return Object.entries(catalog?.parameters ?? {}).map(([key,value])=>({
    id:'parameter:'+key,chapter:'Paramètres actifs',title:names[key] || key,
    summary:'Valeurs du catalogue actif · lecture seule',formula:"Ces paramètres sont lus au moment de l'ouverture du référentiel. Ils ne remplacent pas les versions enregistrées avec les anciennes offres.",
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
    T01:['sql'],T02:['sql'],T03:['oracle'],J03:['day_rate'],H01:['lcm'],H02:['lcm']};
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
    return heading+`<details class="rule-entry" data-rule-id="${e(row.id)}" ${openIds.has(row.id)?'open':''}><summary><span class="rule-name"><small>${e(row.id.startsWith('article:')?'SW / ID':row.id.startsWith('parameter:')?'PARAM':row.id)}</small><strong>${e(row.title)}</strong></span><span class="rule-principle">${e(row.summary)}</span><span class="rule-state"><span>${originLabel(row.origin,l)}</span><span class="rule-status" data-status="${row.status}">${statusLabel(row.status,l)}</span></span></summary><div class="rule-body"><p>${e(row.formula)}</p>${row.note?`<p class="rule-note">${e(row.note)}</p>`:''}<dl><dt>${l('Source / implémentation','Quelle / Implementierung')}</dt><dd>${e(row.code)}</dd></dl>${data===undefined?'':parameterTable(data,l)}</div></details>`;
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
