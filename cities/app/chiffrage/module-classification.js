// Presentation metadata only. Selection, dependencies, days and prices are owned elsewhere.
// Ordering follows Prime's Licences&Presta standard, then the Gemeinde worksheet.
export const innosolvStandard = '1,21,22,26,27,100,116,125,129,135,200,201,202'.split(',');
export const innosolvMeters = ['501','502','533'];
export const proposedInnosolvOptions = new Set('10,29,30,205,206,208,210,211,212,502,533,25,33,34,35,122,124,132,209,214,207,138,136'.split(','));
export const gemeindeOrder = '1,36,21,28,22,23,24,30,31,122,124,116,34,35,13,26,27,38,39,41,33,40,50,54,57,51,52,53,55,56,58,29,208,209,210,25,10,11,100,101,113,104,115,120,125,132,140,135,129,119,127,138,136,143,200,201,214,205,206,202,211,212,207,215,501,509,516,517,504,523,514,502,533,528,534,531,529,530,532'.split(',');
const section = (key,fr,de,order) => ({key,fr,de,order});
const base = section('standard','Modules de base innosolv','innosolv-Basismodule',0);
const meters = section('meters','Gestion des compteurs','Zählerverwaltung',1);
const chosen = section('chosen','Options choisies','Gewählte Optionen',2);
export const proposedOptions = section('proposed','Options à proposer','Empfohlene Optionen',0);
export const otherOptions = section('other','Autres options','Weitere Optionen',1);
const chapters = [
  section('base','Système de base et compléments','Basissystem und Ergänzungen',0),
  section('people','Habitants','Einwohner',1),
  section('taxes','Taxes uniques / récurrentes','Einmalige / wiederkehrende Gebühren',2),
  section('energy','Fournisseur intégré','Integrierte Versorgung',3)
];
const abacus = [
  ['10510','Comptabilité financière','Finanzbuchhaltung'],
  ['10520','Comptabilité des débiteurs','Debitorenbuchhaltung'],
  ['10530','Comptabilité des créanciers','Kreditorenbuchhaltung'],
  ['10540','Comptabilité des salaires','Lohnbuchhaltung'],
  ['10570','Comptabilité des immobilisations','Anlagenbuchhaltung'],
  ['10566','Facturation','Fakturierung'],
  ['10560','Gestion des commandes','Auftragsbearbeitung'],
  ['10575','Gestion des projets','Projektverwaltung'],
  ['10555','E-Business','E-Business'],
  ['10515','Electronic Banking','Electronic Banking']
];
export function moduleCode(item) { return String(item.item_code ?? '').replace(/^129VD$/,'129'); }
export function abacusFamily(item) {
  const family = String(item.item_code ?? '').split('.')[0];
  return family === '10531' ? '10530' : family;
}
export function moduleChapter(item) {
  if (item.vendor === 'abacus') {
    if (abacusFamily(item) === '92101') return section('portal','Portail Abacus','Abacus-Portal',12);
    const family = abacusFamily(item), index = abacus.findIndex(row=>row[0]===family);
    if (index>=0) return section(family,abacus[index][1],abacus[index][2],index);
    if (['10550','10503'].includes(family)) return section('required','Programmes obligatoires','Obligatorische Programme',11);
    return section('complementary','Fonctions complémentaires','Ergänzende Funktionen',10);
  }
  const code = Number(moduleCode(item));
  return chapters[code>=500?3:code>=200 && ![208,209,210].includes(code)?2:code>=100 && code<200 && ![116,122,124].includes(code)?1:0];
}
export function selectedModuleSection(item) {
  if(item.vendor!=='innosolv')return moduleChapter(item);
  const code=moduleCode(item);
  return innosolvStandard.includes(code)?base:innosolvMeters.includes(code)?meters:chosen;
}
export function availableModuleSection(item) {
  return proposedInnosolvOptions.has(moduleCode(item))?proposedOptions:otherOptions;
}
export function presentationOrder(item) {
  const code=moduleCode(item), group=selectedModuleSection(item);
  const order=group.key==='standard'?innosolvStandard:group.key==='meters'?innosolvMeters:gemeindeOrder;
  const index=order.indexOf(code);
  return group.order*1000+(!Number.isFinite(index)||index<0?999:index);
}
// Reusable grouping for both selected rows and the two unselected option lists.
export function classifiedModules(items, {selected=true}={}) {
  const groups=new Map();
  for(const item of items) {
    const group=selected?selectedModuleSection(item):moduleChapter(item);
    if(!groups.has(group.key))groups.set(group.key,{...group,items:[]});
    groups.get(group.key).items.push(item);
  }
  return [...groups.values()].sort((a,b)=>a.order-b.order).map(group=>({...group,
    items:group.items.sort((a,b)=>a.vendor==='innosolv'?(selected?presentationOrder(a)-presentationOrder(b):gemeindeOrder.indexOf(moduleCode(a))-gemeindeOrder.indexOf(moduleCode(b))):0)}));
}
