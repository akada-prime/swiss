import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote,calculateOracle} from '../app/chiffrage/calculate.js';
import {setSoftwareDisposition} from '../app/chiffrage/software-selection.js';
import {extraOptionId,offerOptionCandidates,offerOptionReview,priceOfferOption,validateOfferOptions} from '../app/chiffrage/offer-options.js';
import {publicOfferFromSaved} from '../supabase/functions/chiffrage/client-projection.mjs';
import {offerFigures,investmentEquation,offerScope,offerBreakdown} from '../app/offer/presentation.js';
const base=()=>({products:[],modules:[],dimensions:{population:1000},services:[{family:'prestations',item_code:'reprise',days:15}],primeLines:[],partners:[],moduleServices:[],lcm:{selection:'none'},hosting:{included:false}});
const catalog={items:[],parameters:{day_rate:100,lcm:[],prime_options:[{item_code:'demo',label_fr:'Service démo',days:2,annual_pv:12}]}};
const quote=input=>({commune_name:'Démo',title:'Démo',bfs_id:1,canton:'JU',population:1000,snapshot:{revision:1,input,result:calculateQuote(input,catalog)}});
test('a persisted target follows scope while a fixed rebate does not; invalid targets fail closed',()=>{
 const input={...base(),investmentTarget:1000};let s=calculateQuote(input,catalog).summary;assert.equal(s.investment,1000);assert.equal(s.investment_discount,500);
 input.services[0].days=18;s=calculateQuote(input,catalog).summary;assert.equal(s.investment,1000);assert.equal(s.investment_discount,800);assert.equal(s.tco5y,1000);
 delete input.investmentTarget;input.investmentDiscount=500;assert.equal(calculateQuote(input,catalog).summary.investment,1300);
 for(const target of [-1,1801,NaN,Infinity,'1000',.001])assert.throws(()=>calculateQuote({...input,investmentTarget:target},catalog));
 assert.equal(calculateQuote({...input,investmentTarget:0},catalog).summary.investment,0);
});
test('Synergy overrides the combined hosting annual only; deselection and snapshots preserve original prices',()=>{
 const input=base();input.hosting={included:true,synergy:true};input.primeLines=[{family:'prime',category:'hosting',investment_pv:100,annual_pv:300},{family:'prime',category:'hosting',investment_pv:200,annual_pv:400}];const saved=structuredClone(input);
 let result=calculateQuote(input,catalog);assert.equal(result.summary.annual,12000);assert.equal(result.summary.investment,1800);assert.deepEqual(input,saved);
 input.hosting.synergy=false;assert.equal(calculateQuote(input,catalog).summary.annual,700);input.hosting.included=false;assert.equal(calculateQuote(input,catalog).summary.annual,0);
 input.hosting={included:true,synergy:true};const offer=publicOfferFromSaved(quote(input),catalog);assert.equal(offer.hosting_synergy,true);assert.equal(offer.amounts.annual,12000);
});
test('Oracle distinguishes unknown tariffs, explicit free tariffs and forced prices',()=>{
 let o=calculateOracle({full:4,light:0},{full_price:25,full_maintenance:3});assert.equal(o.investment.effective_value,100);assert.equal(o.annual.effective_value,12);
 o=calculateOracle({full:4,light:0},{full_price:null,full_maintenance:null});assert.equal(o.investment.effective_value,null);assert.equal(o.annual.effective_value,null);
 o=calculateOracle({full:4,light:0,investmentOverride:99,annualOverride:9},{});assert.equal(o.investment.effective_value,99);assert.equal(o.annual.effective_value,9);
 assert.equal(calculateOracle({full:4,light:0},{full_price:0,full_maintenance:0}).investment.effective_value,0);assert.equal(calculateOracle({full:0,light:0},{}).investment.effective_value,0);
 assert.throws(()=>calculateOracle({full:-1,light:0},{}));
});
test('included Prime becomes a separate proposal in one click, preserving its override and returning without duplicates',()=>{
 const input=base();input.primeLines=[{family:'prime',category:'license',item_code:'demo',label:'Service démo',days:3,annual_pv:99}];const saved=structuredClone(input);
 let next=setSoftwareDisposition(input,catalog,'prime/Options/demo','propose');assert.equal(next.primeLines.length,0);assert.equal(next.client_options.length,1);assert.deepEqual(input,saved);
 next.client_options=validateOfferOptions(next.client_options);let reviewed=offerOptionReview(next,catalog);assert.deepEqual(reviewed.issues,[]);assert.equal(reviewed.options[0].investment,300);assert.equal(reviewed.options[0].annual,99);assert.equal(calculateQuote(next,catalog).summary.annual,0);
 const publicOffer=publicOfferFromSaved(quote(next),catalog);assert.equal(publicOffer.optional_options[0].annual,99);assert.doesNotMatch(JSON.stringify(publicOffer.optional_options),/source|item_code|days|annual_pa/);
 next=setSoftwareDisposition(next,catalog,'prime/Options/demo','include');assert.equal(next.primeLines.length,1);assert.equal(next.client_options.length,0);assert.equal(calculateQuote(next,catalog).summary.annual,99);
});
test('free partner proposals retain fixed investment and annual prices outside every included total',()=>{
 const input=base();input.partners=[{family:'partenaires',label:'GED partenaire',investment_pv:250,annual_pv:40}];
 const next=setSoftwareDisposition(input,catalog,'partners/Options/'+extraOptionId(input.partners[0]),'propose');assert.equal(next.partners.length,0);const candidate=offerOptionCandidates(next,catalog).find(row=>row.kind==='partner');assert.deepEqual(priceOfferOption(next,catalog,candidate,next.client_options[0]),{investment:250,annual:40});
 assert.equal(calculateQuote(next,catalog).summary.investment,1500);const restored=setSoftwareDisposition(next,catalog,candidate.key,'include');assert.equal(calculateQuote(restored,catalog).summary.investment,1750);
});
test('a target cannot absorb the price of a proposed option and all catalog modules can be proposed',()=>{
 const input={...base(),investmentTarget:1000};const candidate=offerOptionCandidates(input,catalog)[0];assert.deepEqual(priceOfferOption(input,catalog,candidate),{investment:200,annual:12});
 const c={...catalog,items:[{vendor:'innosolv',product:'Gemeinde',item_code:'142',label_fr:'Autre',pricing_rule:{kind:'unverified'}}]};assert(offerOptionCandidates({...input,products:['innosolv']},c).some(row=>row.key==='innosolv/Gemeinde/142'));
});
test('public summary shares the rebate equation, synergy note and inline disclosure heading; price units belong to headers',()=>{
 const cfg={label:fr=>fr,money:n=>n+' CHF HT'};const amounts={investment:1000,investment_gross:1500,investment_discount:500,annual:12000,tco5y:49000};
 assert.match(investmentEquation(amounts,cfg),/1500.*500.*1000/);const html=offerFigures(amounts,{...cfg,municipal:true,synergy:true,annualBudget:{hosting:12000,total:12000}});assert.match(html,/Hébergement \*/);assert.match(html,/Hébergement en synergie/);assert.match(html,/prime-investment-equation/);
 const scope=offerScope([{product:'Prime',items:[{label:'Module',items:['A']}]}],{...cfg,asset:x=>x});assert.match(scope,/prime-offer-scope-header/);
 const table=offerBreakdown([{key:'implementation',label:'Prime',investment:1500,annual:0}],cfg);assert.match(table,/Investissement · CHF HT/);assert.doesNotMatch(table,/prime-offer-amount[^>]*>1500 CHF/);
});

test('proposing and reincluding a publisher module preserves manual prices and implementation exceptions',()=>{
 const item={vendor:'abacus',product:'ERP',item_code:'manual',label_fr:'Module manuel',pricing_rule:{kind:'unverified'}};
 const c={...catalog,items:[item],parameters:{...catalog.parameters,publisher_rent:{abacus:{standard:{pa_rate:.1,pv_rate:.2}}}}};
 const input={...base(),products:['abacus'],modules:[{vendor:'abacus',product:'ERP',item_code:'manual',pa_override:30,pv_override:90}],moduleServices:[{family:'prestations_module',item_code:'abacus/ERP/manual',days:4,investment_override:350}]};
 const proposed=setSoftwareDisposition(input,c,'abacus/ERP/manual','propose'),candidate=offerOptionCandidates(proposed,c).find(x=>x.key==='abacus/ERP/manual');
 assert.deepEqual(priceOfferOption(proposed,c,candidate,proposed.client_options[0]),{investment:350,annual:90});
 const restored=setSoftwareDisposition(proposed,c,candidate.key,'include');assert.equal(restored.modules[0].pv_override,90);assert.equal(restored.moduleServices[0].investment_override,350);assert.equal(restored.moduleServices[0].days,4);
});
