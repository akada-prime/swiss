import {moduleId,serviceDays,retainRemoved} from './standards.js?v=20261112-coherence-r1';
import {extraOptionId,extraOptionCandidates,cleanOptionLine} from './offer-options.js?v=20261118-options-r4';
// A software has one disposition: included, proposed separately, or absent.
export function setSoftwareDisposition(input,catalog,key,disposition){
 const next=structuredClone(input),[vendor,product,code]=key.split('/');
 const item=catalog.items?.find(row=>moduleId(row)===key);
 const extra=extraOptionCandidates(next,catalog,{includeSelected:true}).find(row=>row.key===key);
 const prior=(next.client_options??[]).find(row=>row.key===key);
 const pce=vendor==='pce'&&product==='ERP'&&['finances','salaires'].includes(code);
 if(!item&&!extra&&!pce)throw new Error('Software unavailable');
 const field=vendor==='partners'?'partners':'primeLines';
 const chosenExtra=extra?(next[field]??[]).find(row=>extraOptionId(row)===extraOptionId(extra.source)):null;
 const service=(next.moduleServices??[]).find(row=>row.item_code===key);
 const days=prior?.days??chosenExtra?.days??service?.days??(item?serviceDays(catalog,key,next.reference?.id):extra?.days??null);
 next.client_options=(next.client_options??[]).filter(row=>row.key!==key);
 if(item){next.modules=(next.modules??[]).filter(row=>moduleId(row)!==key);next.moduleServices=(next.moduleServices??[]).filter(row=>row.item_code!==key);}
 else if(extra)next[field]=(next[field]??[]).filter(row=>row!==chosenExtra);
 else next.pce={...next.pce,[code]:false};
 if(disposition==='propose'){
  const source=chosenExtra||extra?.source;
  next.client_options.push({...prior,key,label_fr:prior?.label_fr||item?.label_fr||extra?.label_fr||(code==='finances'?'Finances':'Salaires'),label_de:prior?.label_de||item?.label_de||extra?.label_de||'',benefit_fr:prior?.benefit_fr||'',benefit_de:prior?.benefit_de||'',description_fr:prior?.description_fr||'',description_de:prior?.description_de||'',days,...(source?{source_line:cleanOptionLine(source)}:{})});
 }else if(disposition==='include'){
  if(item){if(!next.products.includes(vendor))next.products.push(vendor);next.modules.push({vendor,product,item_code:code});next.moduleServices.push({family:'prestations_module',item_code:key,level:'standard',days,suggested_days:days});}
  else if(extra){next[field]??=[];const source=chosenExtra||prior?.source_line||extra.source;next[field].push({...structuredClone(source),family:vendor==='partners'?'partenaires':'prime',category:source.category||'license',label:source.label||extra.label_fr,quantity:source.quantity??1,...(source.days!=null||source.investment_pv==null?{days}:{}),...(prior?.annual_override!=null?{annual_override:prior.annual_override,annual_pv:prior.annual_override,annual_rule:null,annual_pricing:null}:{})});}
  else next.pce={...next.pce,[code]:true};
 }
 retainRemoved(next,input.modules??[],input.moduleServices??[]);
 if(disposition==='include'&&item&&prior?.days!=null){const row=next.moduleServices.find(row=>row.item_code===key);if(row)row.days=prior.days;}
 return next;
}
