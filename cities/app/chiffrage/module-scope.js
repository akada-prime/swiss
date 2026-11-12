import {partnerBrand} from './commercial-breakdown.js?v=20261112-coherence-r1';
import { selectedModuleSection, presentationOrder } from './module-classification.js?v=20261112-coherence-r1';
// Customer-safe module names and included functions only; never raw catalog records.
import { includedForParent, optionApplies } from './module-catalog.js?v=20261112-workspace-review-r1';
const products = {innosolv:'innosolvcity',pce:'ProConcept',abacus:'Abacus'};
const short = (value, max = 160) => String(value ?? '').trim().slice(0, max);
export function customerModuleScope(input, catalog, { internal = false } = {}) {
  // References are serialized only for the authenticated internal preview.
  const catalogItems = catalog?.items ?? [];
  const byCode = new Map(catalogItems.map(x=>[
    `${x.vendor}/${x.product}/${x.item_code}`,x
  ]));
  const selected = input?.modules ?? [];
  const bundled = new Set();
  for(const parent of selected){
    const row=byCode.get(`${parent.vendor}/${parent.product}/${parent.item_code}`);
    for(const code of row?.included_components??[])if(code!==parent.item_code)
      bundled.add(`${parent.vendor}/${parent.product}/${code}`);
  }
  const groups = new Map();
  const add = (vendor,fr,de,parent = '', classification = null, reference = '') => {
    if (!products[vendor]) return;
    const name=short(fr,120), german=short(de || fr,120);
    if (!name) return;
    if(!groups.has(vendor))groups.set(vendor,new Map());
    const group=groups.get(vendor);
    // Keep product display order and deduplicate Abacus submodule names by family.
    const key=`${name}\0${german}`;
    if(!group.has(key))group.set(key,{fr:name,de:german,...(internal&&reference?{reference}:{}),...(classification?{section_fr:classification.fr,section_de:classification.de}:{}),...(parent && includedForParent(input,catalog,parent).length ? {included:includedForParent(input,catalog,parent)} : {})});
  };
  for (const module of [...selected].sort((a,b)=>presentationOrder(a)-presentationOrder(b))) {
    if (!products[module.vendor] || !input.products?.includes(module.vendor))continue;
    if(!internal&&bundled.has(`${module.vendor}/${module.product}/${module.item_code}`))continue;
    const original=byCode.get(`${module.vendor}/${module.product}/${module.item_code}`) ??
      (module.vendor==='innosolv' && module.item_code==='129' && input.canton==='VD' ?
        byCode.get(`${module.vendor}/${module.product}/129VD`) : null);
    if(!original)continue; // Don't invent names from internal item codes.
    let display=original;

    add(module.vendor,display.label_fr || display.label_de,display.label_de || display.label_fr,`${display.vendor}/${display.product}/${display.item_code}`, selectedModuleSection(module),module.item_code);
  }
  if(input?.products?.includes('pce')){
    if(input.pce?.finances)add('pce','Finances','Finanzen','pce/ERP/finances',null,'FIN');
    if(internal&&input.pce?.finances&&input.products.includes('innosolv'))add('pce','Interface ProConcept–innosolv','Schnittstelle ProConcept–innosolv','',null,'Interface');
    if(input.pce?.salaires)add('pce','Salaires','Löhne','pce/ERP/salaires',null,'SAL');
  }
  const output=Object.entries(products).filter(([vendor])=>groups.has(vendor))
    .map(([vendor,product])=>({product,items:[...groups.get(vendor).values()]}))
    .filter(x=>x.items.length);
  const extras=new Map();
  for(const [key,fallback] of [['primeLines','Prime'],['partners','Partenaires']])for(const row of input?.[key]??[]){
    if(row.category==='hosting'||!optionApplies(row,input))continue;
    const product=partnerBrand(row)||fallback;
    const item={fr:short(row.label,120),de:short(row.label,120),included:includedForParent(input,catalog,`prime/Options/${row.item_code}`)};
    if(!item.fr)continue;
    if(!extras.has(product))extras.set(product,new Map());
    extras.get(product).set(item.fr,item);
  }
  for(const [product,items] of extras)output.push({product,items:[...items.values()]});
  return output;
}

