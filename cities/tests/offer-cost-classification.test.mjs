import test from 'node:test';
import assert from 'node:assert/strict';
import {publicCostDetails} from '../app/chiffrage/commercial-breakdown.js';
import {classifiedPublicCosts} from '../supabase/functions/chiffrage/public-cost-details.mjs';
const input={primeLines:[{item_code:'ged',days:1,investment_fixed_pv:0}],partners:[{item_code:'partner',days:3,investment_fixed_pv:0}]};
const lines=[{family:'prestations',item_code:'installation',label:'Installation technique',investment_pv:100,annual_pv:0},{family:'prime',category:'license',item_code:'ged',label:'Interface GED',selected_days:1,quantity:1,investment_pv:100,annual_pv:50},{family:'partenaires',category:'partner',item_code:'partner',supplier:'Doc.Series',label:'Validation',selected_days:3,quantity:1,investment_pv:240,annual_pv:70},{family:'technique',item_code:'oracle',investment_pv:300,annual_pv:30}];
const totals=rows=>rows.reduce((sum,row)=>({investment:sum.investment+row.investment,annual:sum.annual+row.annual}),{investment:0,annual:0});
test('Prime and partner days are implementation, subscriptions are software, and DB purchases stay technical',()=>{
 const before=structuredClone({input,lines}),rows=publicCostDetails(lines,input);
 assert.deepEqual(totals(rows),{investment:740,annual:150});
 assert.deepEqual(rows.filter(x=>x.key==='implementation').map(x=>[x.label_fr,x.investment,x.annual]),[['Prime',200,0],['Doc.Series',240,0]]);
 assert.deepEqual(rows.filter(x=>x.key==='licenses').map(x=>[x.label_fr,x.investment,x.annual]),[['Prime',0,50],['Doc.Series',0,70]]);
 assert.equal(rows.find(x=>x.key==='database').investment,300);
 assert.deepEqual({input,lines},before);
});
test('explicit fixed software purchases remain investment and quantity/override allocation conserves the charged amount',()=>{
 const source={primeLines:[{item_code:'mixed',days:2,investment_fixed_pv:200}]};
 const line={family:'prime',category:'license',item_code:'mixed',selected_days:2,quantity:3,investment_pv:900,annual_pv:60};
 let rows=publicCostDetails([line],source);assert.deepEqual(totals(rows),{investment:900,annual:60});
 assert.equal(rows.find(x=>x.key==='licenses').investment,600);assert.equal(rows.find(x=>x.key==='implementation').investment,300);
 rows=publicCostDetails([{...line,investment_pv:450}],source);assert.deepEqual(totals(rows),{investment:450,annual:60});assert.equal(rows.find(x=>x.key==='licenses').investment,450);
 const legacy=publicCostDetails([{family:'prime',category:'license',investment_pv:500,annual_pv:0}]);assert.equal(legacy[0].key,'licenses');assert.equal(legacy[0].investment,500);
 const hosting=publicCostDetails([{family:'prime',category:'hosting',selected_days:1,investment_pv:20,annual_pv:100}]);assert.equal(hosting[0].key,'hosting');
});
test('old public links can reclassify only their saved revision, preserving totals and public field allowlist',async()=>{
 const offer={version:2,revision:5,amounts:{investment:740,annual:150},cost_details:[{key:'licenses',label_fr:'Prime',investment:100,annual:50}]};
 const result=await classifiedPublicCosts(offer,async()=>({input:{...input,internal_notes:'PRIVATE_SENTINEL'},result:{lines:lines.map(x=>({...x,annual_pa:123,secret:'SECRET_SENTINEL'}))}}));
 assert.equal(result.cost_details_version,2);assert.equal(result.amounts,offer.amounts);assert.deepEqual(totals(result.cost_details),offer.amounts);
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SENTINEL|SECRET_SENTINEL|annual_pa|selected_days|quantity/);
 assert.equal(offer.cost_details_version,undefined);
 const mismatch=await classifiedPublicCosts({...offer,amounts:{investment:1,annual:2}},async()=>({input,result:{lines}}));assert.equal(mismatch.cost_details_version,undefined);
 const unavailable=await classifiedPublicCosts(offer,async()=>{throw Error('offline');});assert.equal(unavailable,offer);
 assert.equal(await classifiedPublicCosts(result,async()=>{throw Error('must not load');}),result);
});
