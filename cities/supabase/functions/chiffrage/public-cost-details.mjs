import {publicCostDetails} from '../../../app/chiffrage/commercial-breakdown.js';
// Reclassify a frozen revision's saved PV lines. Never calculate with a new tariff.
export async function classifiedPublicCosts(offer,loadSaved){
  if(!offer||offer.version<2||offer.cost_details_version===2||!offer.cost_details?.some(row=>row.key==='primePartners'||row.key==='licenses'&&['Prime','Doc.Series','eAdmin'].includes(row.label_fr)))return offer;
  try{
    const saved=await loadSaved();
    if(!saved?.result?.lines||!saved.input)return offer;
    const rows=publicCostDetails(saved.result.lines,saved.input);
    const sums=rows.reduce((sum,row)=>({investment:sum.investment+row.investment,annual:sum.annual+row.annual}),{investment:0,annual:0});
    if(!['investment','annual'].every(key=>Number.isFinite(sums[key])&&Number.isFinite(offer.amounts?.[key])&&Math.abs(sums[key]-offer.amounts[key])<.005))return offer;
    return {...offer,cost_details_version:2,cost_details:rows};
  }catch{return offer;}
}
