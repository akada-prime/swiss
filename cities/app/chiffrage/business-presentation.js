// Read-only editor projections. Previewing an option never mutates the draft.
import { calculateQuote, priceCatalogItem, calculatePublisherRent } from './calculate.js';

export function previewModule(input, catalog, item) {
  try {
    if(item.pricing_rule?.kind==='unverified')return null;
    const chosen=item.vendor==='innosolv'&&item.item_code==='129'&&input.canton==='VD' ? catalog.items.find(row=>row.vendor==='innosolv'&&row.item_code==='129VD')??item:item;
    const dimensions=chosen.vendor==='innosolv'&&chosen.pricing_rule?.basis==='population'?{...input.dimensions,population:input.dimensions.licensedPopulation??input.dimensions.population}:input.dimensions;
    const rates=catalog.parameters.publisher_rent[item.vendor]?.[item.rate_class??'standard'];
    const adjusted=(item.rate_class??'standard')==='standard'?{pa_rate:input.commercial?.[`${item.vendor}PaRate`]??rates.pa_rate,pv_rate:input.commercial?.[`${item.vendor}PvRate`]??rates.pv_rate}:rates;
    return {investment_pv:0,annual_pv:calculatePublisherRent(priceCatalogItem(chosen,dimensions).value,adjusted).pv};
  } catch {return null;}
}

export function moduleRollup(result, vendor) {
  const rows = (result?.lines ?? []).filter(row => row.family === vendor ||
    row.family === 'prestations_module' && row.item_code?.startsWith(vendor+'/') ||
    row.family === 'prestations' && row.item_code?.startsWith(vendor+'-'));
  return {investment:rows.reduce((s,r)=>s+(r.investment_pv??0),0),
    annual:rows.reduce((s,r)=>s+(r.annual_pv??0),0),
    days:rows.reduce((s,r)=>s+(r.selected_days??0)*(r.quantity??1),0),
    incomplete:!result || rows.some(r=>['prestations_module','prestations'].includes(r.family) && r.selected_days==null || r.annual_pv==null)};
}

export function optionPreview(input,catalog,line,kind='primeLines') {
  const copy=structuredClone(input);
  copy.products=[];copy.modules=[];copy.services=[];copy.moduleServices=[];copy.lcm={selection:'none'};copy.hosting={included:false};
  const mandate=copy.primeLines?.find(row=>row.item_code==='prime-mandats-finance');
  copy.primeLines=line.item_code==='prime-mandats-integres'&&mandate?[mandate]:[];copy.partners=[];
  line={...line,family:line.family??(kind==='partners'?'partenaires':'prime')};
  const id=line.item_code || line.label;
  if (!copy[kind].some(row=>(row.item_code||row.label)===id)) copy[kind].push(structuredClone(line));
  try {
    return calculateQuote(copy,catalog).lines.find(row=>row.family===line.family &&
      (row.item_code||row.label)===id) ?? null;
  } catch { return null; }
}

