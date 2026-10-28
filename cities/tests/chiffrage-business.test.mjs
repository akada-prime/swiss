import test from 'node:test';
import assert from 'node:assert/strict';
import {previewModule,optionPreview,moduleRollup} from '../app/chiffrage/business-presentation.js';
import {publicCostDetails,annualComponents,publicPriceBreakdown} from '../app/chiffrage/commercial-breakdown.js';
import {offerBreakdown,offerScope} from '../app/offer/presentation.js';
const catalog={items:[],parameters:{day_rate:1000,publisher_rent:{abacus:{standard:{pa_rate:.1,pv_rate:.2}}}}};
const input={products:[],dimensions:{population:1000},modules:[],moduleServices:[],services:[],primeLines:[],partners:[],hosting:{included:false},lcm:{selection:'none'}};
test('option previews use preset days and quantities without selecting or charging the draft',()=>{
 const before=JSON.stringify(input),line={family:'partenaires',item_code:'ged',label:'GED',days:2,unit_day_rate:1000,annual_pv:350,quantity:2};
 const result=optionPreview(input,catalog,line,'partners');
 assert.equal(result.investment_pv,4000);assert.equal(result.annual_pv,700);assert.equal(JSON.stringify(input),before);
 const free=optionPreview(input,catalog,{...line,days:0,annual_pv:0},'partners');
 assert.equal(free.investment_pv,0);assert.equal(free.annual_pv,0);
});
test('publisher preview honors quote rates and keeps unverified amounts unknown',()=>{
 const item={vendor:'abacus',product:'ERP',item_code:'A',pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:1000,value:2000}]}};
 assert.equal(previewModule(input,catalog,item).annual_pv,400);
 assert.equal(previewModule({...input,commercial:{abacusPvRate:.3}},catalog,item).annual_pv,600);
 assert.equal(previewModule(input,catalog,{...item,pricing_rule:{kind:'unverified'}}),null);
});
test('closed modules include grouped services exactly once',()=>{
 const lines=[{family:'abacus',investment_pv:0,annual_pv:120},{family:'prestations_module',item_code:'abacus/ERP/A',selected_days:2,investment_pv:2000,annual_pv:0},{family:'prestations',item_code:'abacus-finance',selected_days:3,investment_pv:3000,annual_pv:0},{family:'prestations',item_code:'formation',selected_days:4,investment_pv:4000,annual_pv:0}];
 assert.deepEqual(moduleRollup({lines},'abacus'),{days:5,investment:5000,annual:120,incomplete:false});
});
test('public selling detail conserves totals, names extras and splits annual components',()=>{
 const lines=[{family:'abacus',annual_pv:100,investment_pv:0},{family:'pce',annual_pv:200,investment_pv:0},{family:'prime',category:'license',label:'ISAG',annual_pv:50,investment_pv:1000},{family:'prestations',item_code:'reserve',label:'Contrôle de données',investment_pv:300,annual_pv:0},{family:'lcm',annual_pv:60,investment_pv:0},{family:'prime',category:'hosting',annual_pv:80,investment_pv:100}];
 const detail=publicCostDetails(lines);
 assert.equal(detail.reduce((sum,row)=>sum+row.investment,0),1400);assert.equal(detail.reduce((sum,row)=>sum+row.annual,0),490);
 assert.deepEqual(detail.filter(row=>row.key==='licenses').map(row=>row.label_fr),['Abacus','ProConcept','Prime']);
 assert.ok(detail.some(row=>row.label_fr==='Contrôle de données'));
 assert.deepEqual(annualComponents(publicPriceBreakdown(lines)),{solutions:350,lcm:60,hosting:80});
 const html=offerBreakdown(detail.map(row=>({...row,label:row.label_fr})),{label:fr=>fr,money:n=>n+' CHF HT'});
 assert.ok(html.indexOf('Votre accompagnement')<html.indexOf('Logiciels et maintenance'));assert.match(html,/Technique, service et support/);
 const scope=offerScope([{product:'Abacus',items:['Finances']}],{asset:x=>x});assert.match(scope,/abacus-negative.svg/);assert.match(scope,/abacus-wordmark.png/);
});
