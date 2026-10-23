// Customer-safe allowlist: only commercially approved software labels and PV totals.
// No raw input/result, catalog versions, item codes, PA, margins, rates, or services days.
import { publicPriceBreakdown } from '../../../app/chiffrage/commercial-breakdown.js';

const products = {innosolv:'innosolvcity',pce:'ProConcept',abacus:'Abacus'};
const finite = value => typeof value === 'number' && Number.isFinite(value);
const short = (value, max = 160) => String(value ?? '').trim().slice(0, max);
const amount = line => ({investment:line.investment_pv ?? 0,annual:line.annual_pv ?? 0});

export function customerModuleScope(input, catalog) {
  // A code is only used for lookup server-side and is NEVER serialized.
  const catalogItems = catalog?.items ?? [];
  const byCode = new Map(catalogItems.map(x=>[
    `${x.vendor}/${x.product}/${x.item_code}`,x
  ]));
  const selected = input?.modules ?? [];
  const groups = new Map();
  const add = (vendor,fr,de) => {
    if (!products[vendor]) return;
    const name=short(fr,120), german=short(de || fr,120);
    if (!name) return;
    if(!groups.has(vendor))groups.set(vendor,new Map());
    const group=groups.get(vendor);
    // Keep product display order and deduplicate Abacus submodule names by family.
    const key=`${name}\0${german}`;
    if(!group.has(key))group.set(key,{fr:name,de:german});
  };
  for (const module of selected) {
    if (!products[module.vendor] || !input.products?.includes(module.vendor))continue;
    const original=byCode.get(`${module.vendor}/${module.product}/${module.item_code}`) ??
      (module.vendor==='innosolv' && module.item_code==='129' && input.canton==='VD' ?
        byCode.get(`${module.vendor}/${module.product}/129VD`) : null);
    if(!original)continue; // Don't invent names from internal item codes.
    let display=original;
    if(module.vendor==='abacus'){
      // Critical: only the parent .1 of the Abacus module group is visible.
      // Never send individual Abacus function / submodule labels.
      const family=String(module.item_code).split('.')[0];
      display=byCode.get(`abacus/${module.product}/${family}.1`) ??
        byCode.get(`abacus/${module.product}/${family}`) ??
        (!String(module.item_code).includes('.') || module.item_code.endsWith('.1') ? original :
          {label_fr:'Autres fonctions Abacus',label_de:'Weitere Abacus-Funktionen'});
    }
    add(module.vendor,display.label_fr || display.label_de,display.label_de || display.label_fr);
  }
  if(input?.products?.includes('pce')){
    if(input.pce?.finances)add('pce','Finances','Finanzen');
    if(input.pce?.salaires)add('pce','Salaires','Löhne');
  }
  return Object.entries(products).filter(([vendor])=>groups.has(vendor))
    .map(([vendor,product])=>({product,items:[...groups.get(vendor).values()]}))
    .filter(x=>x.items.length);
}

export function publicOfferFromSaved(quote, catalog) {
  const snapshot = quote?.snapshot;
  if (!snapshot || snapshot.result?.status === 'incomplete') return null;
  const s = snapshot.result?.summary;
  if (!s || !finite(s.investment) || !finite(s.annual) ||
    !Array.isArray(snapshot.result.lines))return null;
  for(const line of snapshot.result.lines){
    // For finalized quotes the price engine accepts optional null as zero.
    if(line.investment_pv!=null&&!finite(line.investment_pv))return null;
    if(line.annual_pv!=null&&!finite(line.annual_pv))return null;
  }
  const breakdown=publicPriceBreakdown(snapshot.result.lines);
  const investment=breakdown.reduce((sum,x)=>sum+x.investment,0);
  const annual=breakdown.reduce((sum,x)=>sum+x.annual,0);
  if(Math.abs(investment-s.investment)>.01||Math.abs(annual-s.annual)>.01)return null;
  const sourceProducts=Array.isArray(snapshot.input?.products)?snapshot.input.products:[];
  const rollup=(filter,key)=>snapshot.result.lines.filter(filter).reduce((sum,line)=>sum+amount(line)[key],0);
  // Legacy v1 three-bucket totals retained solely for compatibility and reconciliation.
  const host=line=>line.category==='hosting';
  const partner=line=>line.family==='partenaires'&&!host(line);
  const solution=line=>!host(line)&&!partner(line);
  const buckets=Object.fromEntries([['solutions',solution],['partners',partner],['hosting',host]].map(
    ([key,filter])=>[key,{investment:rollup(filter,'investment'),annual:rollup(filter,'annual')}]));
  const chosen=snapshot.input?.lcm?.selection;
  const lcm=chosen==='gold'?'Gold':chosen==='platinium'?'Platinum':null;
  return {
    version:2,quote_title:short(quote.title),commune:short(quote.commune_name),
    bfs_id:Number(quote.bfs_id),canton:short(quote.canton,2).toUpperCase(),
    population:Number(quote.population),revision:Number(snapshot.revision),
    issued_at:new Date().toISOString(),
    products:[...new Set(sourceProducts.filter(x=>Object.hasOwn(products,x)).map(x=>products[x]))],
    // Modules are customer-safe labels, never raw catalog objects.
    scope:customerModuleScope(snapshot.input,catalog),
    lcm,hosting:breakdown.some(x=>x.key==='hosting'),
    amounts:{investment:s.investment,annual:s.annual,tco5y:s.investment+4*s.annual},
    breakdown,buckets
  };
}
export function publicLinkMetadata(row) {
  return {id:row.id,revision:row.revision,created_at:row.created_at,
    expires_at:row.expires_at,revoked_at:row.revoked_at};
}
