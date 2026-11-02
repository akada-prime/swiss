// Catalog content is independent of price calculation. Versioned with commercial parameters.
const clean = (value, limit = 160) => String(value ?? '').trim().slice(0, limit);
const vendors = new Set(['innosolv','abacus','pce']);
export function moduleParents(catalog) {
  const parents = (catalog?.items ?? []).filter(row=>vendors.has(row.vendor) && (row.vendor!=='abacus' || !String(row.item_code).includes('.') || String(row.item_code).endsWith('.1'))).map(row=>({
    key:`${row.vendor}/${row.product}/${row.item_code}`, vendor:row.vendor,
    label_fr:row.label_fr || row.label_de || row.item_code,
    label_de:row.label_de || row.label_fr || row.item_code
  }));
  parents.push({key:'pce/ERP/finances',vendor:'pce',label_fr:'Finances',label_de:'Finanzen'},
    {key:'pce/ERP/salaires',vendor:'pce',label_fr:'Salaires',label_de:'Löhne'});
  for(const row of catalog?.parameters?.prime_options ?? []) parents.push({
    key:'prime/Options/'+row.item_code,vendor:'prime',label_fr:row.label_fr,label_de:row.label_de || row.label_fr
  });
  return [...new Map(parents.map(row=>[row.key,row])).values()];
}
export function includedForParent(input, catalog, parent) {
  const source = input?.module_contents ?? catalog?.parameters?.module_contents ?? [];
  return source.filter(row=>row.enabled !== false && row.parent === parent)
    .sort((a,b)=>(a.order ?? 0)-(b.order ?? 0))
    .map(row=>({fr:clean(row.label_fr,120),de:clean(row.label_de || row.label_fr,120),
      theme_fr:clean(row.theme_fr,80),theme_de:clean(row.theme_de || row.theme_fr,80)}))
    .filter(row=>row.fr);
}
export function optionApplies(option, input) {
  return option.enabled !== false && (!option.requires_product || input?.products?.includes(option.requires_product)) &&
    (!option.requires_pce_option || Boolean(input?.pce?.[option.requires_pce_option]));
}
export function validateModuleCatalog(payload, catalog) {
  if(!payload || !Array.isArray(payload.module_contents) || !Array.isArray(payload.prime_options) ||
    payload.module_contents.length > 500 || payload.prime_options.length > 250) throw new Error('Invalid module catalog');
  const parents = new Set(moduleParents({...catalog,parameters:{...catalog.parameters,prime_options:payload.prime_options}}).map(row=>row.key));
  const seen = new Set();
  const definitions = payload.module_contents.map(row=>{
    const id=clean(row.id,100),parent=clean(row.parent,180),fr=clean(row.label_fr,120);
    if(!/^[a-zA-Z0-9_-]+$/.test(id) || seen.has(id) || !parents.has(parent) || !fr) throw new Error('Invalid included module');
    seen.add(id);
    const order=Number(row.order ?? 0);
    if(!Number.isFinite(order) || Math.abs(order)>100000) throw new Error('Invalid module order');
    return {id,parent,label_fr:fr,label_de:clean(row.label_de || fr,120),
      theme_fr:clean(row.theme_fr,80),theme_de:clean(row.theme_de || row.theme_fr,80),order,enabled:row.enabled !== false};
  });
  seen.clear();
  const options=payload.prime_options.map(row=>{
    const code=clean(row.item_code,100),fr=clean(row.label_fr,120);
    if(!/^[a-zA-Z0-9_-]+$/.test(code) || seen.has(code) || !fr) throw new Error('Invalid Prime option');
    seen.add(code);
    const number=(value,name,nullable=true)=>{
      if(value == null && nullable)return null;
      if(typeof value!=='number' || !Number.isFinite(value) || value<0 || value>100000000)throw new Error('Invalid '+name);
      return value;
    };
    if(row.requires_product && !vendors.has(row.requires_product))throw new Error('Invalid required product');
    if(row.requires_pce_option && (!['finances','salaires'].includes(row.requires_pce_option) || row.requires_product!=='pce'))throw new Error('Invalid PCE requirement');
    const rule=row.annual_rule == null ? null : {
      per_capita:number(row.annual_rule.per_capita,'annual rate',false),
      round_to:number(row.annual_rule.round_to,'annual rounding',false)};
    if(rule && rule.round_to<=0)throw new Error('Invalid annual rounding');
    return {item_code:code,label_fr:fr,label_de:clean(row.label_de || fr,120),
      days:number(row.days,'days'),annual_pv:number(row.annual_pv,'annual price'),
      annual_rule:rule,enabled:row.enabled !== false,
      requires_product:row.requires_product || null,requires_pce_option:row.requires_pce_option || null,
      investment_fixed_pv:number(row.investment_fixed_pv ?? 0,'fixed investment',false),
      source:clean(row.source,300),method:clean(row.method,100),sample_size:number(row.sample_size ?? 0,'sample size',false)};
  });
  return {module_contents:definitions,prime_options:options};
}
