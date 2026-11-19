import {cleanModuleLabel} from './module-labels.js?v=20261119-dossier-date-r2';
import { moduleGroup, primeModuleOrder } from './module-groups.js?v=20261118-prime-shared-r3';
// Optional editor-curated ideas, priced separately on a copy. No real tariffs in this module.
import { calculateQuote } from './calculate.js?v=20261116-software-target-r3';
import { moduleId,serviceDays,referenceProfiles } from './standards.js?v=20261112-coherence-r1';
import { optionApplies } from './module-catalog.js?v=20261119-dossier-date-r2';
export const maxOfferOptions=1000;
function shortOfferText(value,max){return String(value??'').trim().slice(0,max);}
function offerNumber(value){return value==null||value===''?null:Number(value);}
export function validateOfferOptions(value) {
  if(!Array.isArray(value)||value.length>maxOfferOptions)throw new Error('Invalid offer options');
  const seen=new Set();
  return value.map(row=>{
    const key=shortOfferText(row?.key,180),days=offerNumber(row?.days),annual=offerNumber(row?.annual_override);
    if(!/^(innosolv|abacus|prime|pce|partners)\/[\w.-]+\/[\w.-]+$/.test(key)||seen.has(key)||days!==null&&(!Number.isFinite(days)||days<0||days>1000))throw new Error('Invalid offer option');
    if(annual!==null&&(!/^prime\/|^partners\//.test(key)||!Number.isFinite(annual)||annual<0||annual>100000000))throw new Error('Invalid Prime option annual price');
    seen.add(key);
    return {key,label_fr:shortOfferText(key.startsWith('innosolv/')?cleanModuleLabel(row.label_fr):row.label_fr,100),label_de:shortOfferText(key.startsWith('innosolv/')?cleanModuleLabel(row.label_de):row.label_de,100),benefit_fr:shortOfferText(row.benefit_fr,180),benefit_de:shortOfferText(row.benefit_de,180),description_fr:shortOfferText(row.description_fr,700),description_de:shortOfferText(row.description_de,700),days,...(annual!==null?{annual_override:annual}:{}),...(row.source_line?{source_line:cleanOptionLine(row.source_line)}:{})};
  });
}
const extraFields=['item_code','label','label_fr','label_de','supplier','quantity','days','suggested_days','unit_day_rate','investment_pv','investment_override','investment_fixed_pv','annual_pv','annual_override','annual_rule','annual_pricing','annual_pa','investment_pa','gp_included','note'];
export function cleanOptionLine(line){
  if(!line||typeof line!=='object'||line.category==='hosting')throw new Error('Invalid option source');
  return Object.fromEntries(extraFields.filter(key=>line[key]!==undefined).map(key=>[key,structuredClone(line[key])]));
}
export function extraOptionId(line){
 if(line.item_code)return String(line.item_code);
 const text=JSON.stringify([line.label,line.supplier,line.investment_pv,line.annual_pv,line.days]);
 let hash=2166136261;for(const char of text)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return 'free-'+(hash>>>0).toString(36);
}
export function extraOptionCandidates(input,catalog,{includeSelected=false}={}){
  const all=new Map();
  const add=(line,kind,id)=>{
    if(line.category==='hosting'||!optionApplies(line,input))return;
    const key=`${kind}/Options/${id}`;
    if(!all.has(key))all.set(key,{key,kind:kind==='partners'?'partner':'prime',source:line,software:kind,label_fr:line.label_fr||line.label||id,label_de:line.label_de||line.label_fr||line.label||id,days:line.days??(line.investment_pv!=null?0:null)});
  };
  for(const item of catalog.parameters?.prime_options??[])add(item,'prime',item.item_code);
  for(const [index,profile] of referenceProfiles(catalog).entries())for(const [kind,field] of [['prime','prime_lines'],['partners','partners']])for(const [i,line] of (profile[field]??[]).entries())add(line,kind,line.item_code||`reference-${index}-${i}`);
  for(const record of input.client_options??[])if(record.source_line&&/^(prime|partners)\//.test(record.key)){const [kind,,id]=record.key.split('/');all.delete(record.key);add(record.source_line,kind,id);}
  for(const [kind,field] of [['prime','primeLines'],['partners','partners']])for(const [i,line] of (input[field]??[]).entries())add(line,kind,extraOptionId(line));
  return [...all.values()].sort((a,b)=>primeModuleOrder(catalog,a.key)-primeModuleOrder(catalog,b.key)).filter(row=>includeSelected||!(input[row.kind==='partner'?'partners':'primeLines']??[]).some(line=>(line.item_code||line.label)===(row.source.item_code||row.source.label)));
}
export function offerOptionCandidates(input,catalog) {
  if(!input||!catalog)return [];
  const chosen=new Set((input.modules??[]).map(moduleId));
  const options=(catalog.items??[]).filter(item=>(input.products??[]).includes(item.vendor)&&!chosen.has(moduleId(item))&&item.pricing_rule&&(item.item_code!=='129'||input.canton!=='VD')&&(item.item_code!=='129VD'||input.canton==='VD')).map(item=>({key:moduleId(item),kind:'module',source:item,software:item.vendor,label_fr:item.label_fr||item.label_de||item.item_code,label_de:item.label_de||item.label_fr||item.item_code,days:serviceDays(catalog,moduleId(item),input.reference?.id)}));
  options.push(...extraOptionCandidates(input,catalog));
  if((input.products??[]).includes('pce'))for(const key of ['finances','salaires'])if(!input.pce?.[key])options.push({key:`pce/ERP/${key}`,kind:'pce',software:'pce',label_fr:key==='finances'?'Finances':'Salaires',label_de:key==='finances'?'Finanzen':'Löhne',days:(input.services??[]).find(row=>row.item_code===`pce-${key}`)?.days??null});
  return options;
}
export function priceOfferOption(input,catalog,candidate,record={}) {
  try{
    const base={...input,investmentDiscount:0,investmentTarget:null};
    const before=calculateQuote(base,catalog);
    if(before.status==='incomplete')return null;
    const next=structuredClone(base),retained=input.retainedModules?.[candidate.key],days=record.days??retained?.service?.days??candidate.days;
    if(candidate.kind==='module'){
      const item=candidate.source;
      next.modules=[...(next.modules??[]),{...retained?.module,vendor:item.vendor,product:item.product,item_code:item.item_code}];
      next.moduleServices=[...(next.moduleServices??[]),{...retained?.service,family:'prestations_module',item_code:candidate.key,level:'standard',days,suggested_days:days}];
    }else if(['prime','partner'].includes(candidate.kind)){
      const item=candidate.source;
      const override=record.annual_override;
      if(override!=null&&(!Number.isFinite(override)||override<0||override>100000000))return null;
      if(override==null&&!item.annual_rule&&!item.annual_pricing&&item.annual_pv==null)return null;
      const annualFields=override==null?{}:{annual_pv:override,annual_rule:null,annual_pricing:null,annual_override:override};
      const field=candidate.kind==='partner'?'partners':'primeLines';
      next[field]=[...(next[field]??[]),{...structuredClone(item),...annualFields,family:candidate.kind==='partner'?'partenaires':'prime',category:'license',label:item.label_fr||item.label,quantity:item.quantity??1,days,...(item.days==null&&item.investment_pv!=null&&item.investment_fixed_pv==null?{investment_fixed_pv:item.investment_pv}:{}),unit_day_rate:item.unit_day_rate??input.commercial?.dayRate??catalog.parameters.day_rate}];
    }else if(candidate.kind==='pce'){
      const key=candidate.key.split('/').at(-1);
      next.pce={...next.pce,[key]:true};
      const line=(next.services??[]).find(row=>row.item_code===`pce-${key}`);
      if(!line||days==null)return null;
      line.days=days;
    }else return null;
    const after=calculateQuote(next,catalog);
    if(days==null||after.status==='incomplete')return null;
    const withoutGp=result=>result.lines.filter(line=>line.explanation?.kind!=='project_management').reduce((sum,line)=>sum+(line.investment_pv??0),0);
    const investment=withoutGp(after)-withoutGp(before);
    // A module's annual supplement is its own rent, not a repricing of existing PCE licenses.
    const annual = candidate.kind==='module' ? after.lines.find(line=>line.family===candidate.source.vendor && line.product===candidate.source.product && line.item_code===candidate.source.item_code)?.annual_pv :
      candidate.kind==='pce' ? after.lines.find(line=>line.family==='pce' && line.item_code===candidate.key.split('/').at(-1))?.annual_pv :
      record.annual_override ?? after.summary.annual-before.summary.annual;
    return Number.isFinite(investment)&&Number.isFinite(annual)&&investment>=0&&annual>=0?{investment,annual}:null;
  }catch{return null;}
}
export function offerOptionReview(input,catalog) {
  let records;
  try{records=validateOfferOptions(input?.client_options??[]);}catch{return {options:[],issues:['invalid']};}
  if(!records.length)return {options:[],issues:[]};
  const candidates=new Map(offerOptionCandidates(input,catalog).map(row=>[row.key,row])),options=[],issues=[];
  for(const record of records.sort((a,b)=>primeModuleOrder(catalog,a.key)-primeModuleOrder(catalog,b.key))){
    const candidate=candidates.get(record.key);
    if(!candidate)continue;
    const price=priceOfferOption(input,catalog,candidate,record);
    if(!record.label_fr||!price){issues.push(record.key);continue;}
    options.push({...(moduleGroup(input,record.key,catalog)?{group_fr:moduleGroup(input,record.key,catalog),group_de:moduleGroup(input,record.key,catalog)}:{}),label_fr:record.label_fr,label_de:record.label_de||record.label_fr,benefit_fr:record.benefit_fr,benefit_de:record.benefit_de||record.benefit_fr,description_fr:record.description_fr,description_de:record.description_de||record.description_fr,investment:price.investment,annual:price.annual});
  }
  return {options,issues};
}
