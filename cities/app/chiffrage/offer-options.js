// Optional editor-curated ideas, priced separately on a copy. No real tariffs in this module.
import { calculateQuote } from './calculate.js';
import { moduleId,serviceDays } from './standards.js';
import { optionApplies } from './module-catalog.js';
import { proposedInnosolvOptions } from './module-classification.js';
export const maxOfferOptions=6;
function shortOfferText(value,max){return String(value??'').trim().slice(0,max);}
function offerNumber(value){return value==null||value===''?null:Number(value);}
export function validateOfferOptions(value) {
  if(!Array.isArray(value)||value.length>maxOfferOptions)throw new Error('Invalid offer options');
  const seen=new Set();
  return value.map(row=>{
    const key=shortOfferText(row?.key,180),days=offerNumber(row?.days);
    if(!/^(innosolv|abacus|prime|pce)\/[\w.-]+\/[\w.-]+$/.test(key)||seen.has(key)||days!==null&&(!Number.isFinite(days)||days<0||days>1000))throw new Error('Invalid offer option');
    seen.add(key);
    return {key,label_fr:shortOfferText(row.label_fr,100),label_de:shortOfferText(row.label_de,100),benefit_fr:shortOfferText(row.benefit_fr,180),benefit_de:shortOfferText(row.benefit_de,180),description_fr:shortOfferText(row.description_fr,700),description_de:shortOfferText(row.description_de,700),days};
  });
}
export function offerOptionCandidates(input,catalog) {
  if(!input||!catalog)return [];
  const chosen=new Set((input.modules??[]).map(moduleId));
  const options=(catalog.items??[]).filter(item=>(input.products??[]).includes(item.vendor)&&!chosen.has(moduleId(item))&&item.pricing_rule&&item.pricing_rule.kind!=='unverified'&&(item.vendor==='abacus'||item.vendor==='innosolv'&&proposedInnosolvOptions.has(item.item_code))&&(item.product!=='Versorger'||input.energy===true)).map(item=>({key:moduleId(item),kind:'module',source:item,software:item.vendor,label_fr:item.label_fr||item.label_de||item.item_code,label_de:item.label_de||item.label_fr||item.item_code,days:serviceDays(catalog,moduleId(item),input.reference?.id)}));
  for(const item of catalog.parameters?.prime_options??[]){
    if(!optionApplies(item,input)||(input.primeLines??[]).some(row=>row.item_code===item.item_code))continue;
    if(item.item_code==='prime-mandats-integres'&&!(input.primeLines??[]).some(row=>row.item_code==='prime-mandats-finance'))continue;
    options.push({key:`prime/Options/${item.item_code}`,kind:'prime',source:item,software:'prime',label_fr:item.label_fr,label_de:item.label_de||item.label_fr,days:item.days??null});
  }
  if((input.products??[]).includes('pce')&&input.pce?.finances&&!input.pce?.salaires)options.push({key:'pce/ERP/salaires',kind:'pce',software:'pce',label_fr:'Salaires',label_de:'Löhne',days:(input.services??[]).find(row=>row.item_code==='pce-salaires')?.days??null});
  return options;
}
export function priceOfferOption(input,catalog,candidate,record={}) {
  try{
    const before=calculateQuote(input,catalog);
    if(before.status==='incomplete')return null;
    const next=structuredClone(input),days=record.days??candidate.days;
    if(candidate.kind==='module'){
      const item=candidate.source;
      next.modules=[...(next.modules??[]),{vendor:item.vendor,product:item.product,item_code:item.item_code}];
      next.moduleServices=[...(next.moduleServices??[]),{family:'prestations_module',item_code:candidate.key,level:'standard',days,suggested_days:days}];
    }else if(candidate.kind==='prime'){
      const item=candidate.source;
      if(!item.annual_rule&&item.annual_pv==null)return null;
      next.primeLines=[...(next.primeLines??[]),{...structuredClone(item),family:'prime',category:'license',label:item.label_fr,quantity:1,days,unit_day_rate:input.commercial?.dayRate??catalog.parameters.day_rate}];
    }else if(candidate.kind==='pce'){
      next.pce={...next.pce,salaires:true};
      const line=(next.services??[]).find(row=>row.item_code==='pce-salaires');
      if(!line||days==null)return null;
      line.days=days;
    }else return null;
    const after=calculateQuote(next,catalog);
    if(days==null||after.status==='incomplete')return null;
    const investment=after.summary.investment-before.summary.investment,annual=after.summary.annual-before.summary.annual;
    return Number.isFinite(investment)&&Number.isFinite(annual)&&investment>=0&&annual>=0?{investment,annual}:null;
  }catch{return null;}
}
export function offerOptionReview(input,catalog) {
  let records;
  try{records=validateOfferOptions(input?.client_options??[]);}catch{return {options:[],issues:['invalid']};}
  if(!records.length)return {options:[],issues:[]};
  const candidates=new Map(offerOptionCandidates(input,catalog).map(row=>[row.key,row])),options=[],issues=[];
  for(const record of records){
    const candidate=candidates.get(record.key);
    if(!candidate)continue;
    const price=priceOfferOption(input,catalog,candidate,record);
    if(!record.label_fr||!record.benefit_fr||!price){issues.push(record.key);continue;}
    options.push({label_fr:record.label_fr,label_de:record.label_de||record.label_fr,benefit_fr:record.benefit_fr,benefit_de:record.benefit_de||record.benefit_fr,description_fr:record.description_fr,description_de:record.description_de||record.description_fr,investment:price.investment,annual:price.annual});
  }
  return {options,issues};
}
