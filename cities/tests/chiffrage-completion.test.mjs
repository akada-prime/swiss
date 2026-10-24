import test from 'node:test';
import assert from 'node:assert/strict';
import { completionItems, displayedServiceDays } from '../app/chiffrage/completion.js';

test('completion targets technical price, missing module days and exact hosting fields',()=>{
 const input={primeLines:[{category:'hosting',investment_pv:0,annual_pv:null}],partners:[]};
 const result={summary:{missing_technical:['sql'],missing_service_days:['abacus/ERP/10510.1'],missing_hosting:true}};
 const items=completionItems(input,result);
 assert.deepEqual(items.map(i=>[i.tab,i.field]),[['prestations','sql.override'],['modules','moduleService.abacus/ERP/10510.1.days'],['composer','primeLines.0.annual_pv']]);
 assert.equal(items.some(i=>i.field==='primeLines.0.investment_pv'),false);
});
test('resolved values and absence of optional services create no spurious blockers',()=>{
 assert.deepEqual(completionItems({},{summary:{missing_technical:[],missing_service_days:[],missing_hosting:false}}),[]);
 assert.equal(displayedServiceDays(undefined,{}),0);
 assert.equal(displayedServiceDays({days:0,suggested_days:3},{}),0);
 assert.equal(displayedServiceDays({days:null,suggested_days:0},{}),0);
 assert.equal(displayedServiceDays({item_code:'reserve',level:'standard'},{parameters:{service_presets:{standard:{reserve:0}}}}),0);
 assert.equal(displayedServiceDays({days:null,suggested_days:null},{}),null);
});
test('hosting without retained lines routes to its configuration and does not manufacture a zero',()=>{
 const input={primeLines:[],partners:[]};const before=JSON.stringify(input);
 assert.deepEqual(completionItems(input,{summary:{missing_hosting:true}}),[{kind:'hosting',code:'hosting',tab:'composer',field:null}]);
 assert.equal(JSON.stringify(input),before);
});
