import { selectedModuleSection, presentationOrder, abacusFamily } from './module-classification.js';
// Customer-safe module names and included functions only; never raw catalog records.
import { includedForParent, optionApplies } from './module-catalog.js';
const products = {innosolv:'innosolvcity',pce:'ProConcept',abacus:'Abacus'};
const short = (value, max = 160) => String(value ?? '').trim().slice(0, max);
export function customerModuleScope(input, catalog) {
  // A code is only used for lookup server-side and is NEVER serialized.
  const catalogItems = catalog?.items ?? [];
  const byCode = new Map(catalogItems.map(x=>[
    `${x.vendor}/${x.product}/${x.item_code}`,x
  ]));
  const selected = input?.modules ?? [];
  const groups = new Map();
  const add = (vendor,fr,de,parent = '', classification = null) => {
    if (!products[vendor]) return;
    const name=short(fr,120), german=short(de || fr,120);
    if (!name) return;
    if(!groups.has(vendor))groups.set(vendor,new Map());
    const group=groups.get(vendor);
    // Keep product display order and deduplicate Abacus submodule names by family.
    const key=`${name}\0${german}`;
    if(!group.has(key))group.set(key,{fr:name,de:german,...(classification?{section_fr:classification.fr,section_de:classification.de}:{}),...(parent && includedForParent(input,catalog,parent).length ? {included:includedForParent(input,catalog,parent)} : {})});
  };
  for (const module of [...selected].sort((a,b)=>presentationOrder(a)-presentationOrder(b))) {
    if (!products[module.vendor] || !input.products?.includes(module.vendor))continue;
    const original=byCode.get(`${module.vendor}/${module.product}/${module.item_code}`) ??
      (module.vendor==='innosolv' && module.item_code==='129' && input.canton==='VD' ?
        byCode.get(`${module.vendor}/${module.product}/129VD`) : null);
    if(!original)continue; // Don't invent names from internal item codes.
    let display=original;
    if(module.vendor==='abacus'){
      // Critical: only the parent .1 of the Abacus module group is visible.
      // Never send individual Abacus function / submodule labels.
      const family=abacusFamily(module);
      display=byCode.get(`abacus/${module.product}/${family}.1`) ??
        byCode.get(`abacus/${module.product}/${family}`) ??
        (!String(module.item_code).includes('.') || module.item_code.endsWith('.1') ? original :
          {label_fr:'Autres fonctions Abacus',label_de:'Weitere Abacus-Funktionen'});
    }
    add(module.vendor,display.label_fr || display.label_de,display.label_de || display.label_fr,`${display.vendor}/${display.product}/${display.item_code}`, selectedModuleSection(module));
  }
  if(input?.products?.includes('pce')){
    if(input.pce?.finances)add('pce','Finances','Finanzen','pce/ERP/finances');
    if(input.pce?.salaires)add('pce','Salaires','Löhne','pce/ERP/salaires');
  }
  const output=Object.entries(products).filter(([vendor])=>groups.has(vendor))
    .map(([vendor,product])=>({product,items:[...groups.get(vendor).values()]}))
    .filter(x=>x.items.length);
  for(const [key,product] of [['primeLines','Prime'],['partners','Partenaires']]) {
    const items=(input?.[key]??[]).filter(row=>row.category!=='hosting' && optionApplies(row,input)).map(row=>({fr:short(row.label,120),de:short(row.label,120),included:includedForParent(input,catalog,`prime/Options/${row.item_code}`)})).filter(Boolean);
    if(items.length)output.push({product,items:[...new Map(items.filter(row=>row.fr).map(row=>[row.fr,row])).values()]});
  }
  return output;
}

