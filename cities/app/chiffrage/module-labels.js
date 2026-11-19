// Old Innosolv exports encode submodules with a leading list dash.
// Remove that marker only; internal hyphens (e-factures, PCE-EBICS) stay intact.
export const cleanModuleLabel=value=>String(value??'').trim().replace(/^(?:[-–—]\s+)+/u,'');
export function cleanInnosolvCatalog(catalog){
 if(!catalog)return catalog;
 const labels=row=>({...row,label_fr:cleanModuleLabel(row.label_fr),label_de:cleanModuleLabel(row.label_de)});
 return {...catalog,items:(catalog.items??[]).map(row=>row.vendor==='innosolv'?labels(row):row),parameters:{...catalog.parameters,
  module_contents:(catalog.parameters?.module_contents??[]).map(row=>String(row.parent).startsWith('innosolv/')?labels(row):row)}};
}
