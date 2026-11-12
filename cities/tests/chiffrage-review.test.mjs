import test from 'node:test';import assert from 'node:assert/strict';
import { calculateQuote,priceCatalogItem } from '../app/chiffrage/calculate.js';
import { portalUsers } from '../app/chiffrage/subscriptions.js';
import { serviceDays } from '../app/chiffrage/standards.js';
import { customerModuleScope } from '../app/chiffrage/module-scope.js';
import { publicCostDetails,annualOfferBudget } from '../app/chiffrage/commercial-breakdown.js';
const base={vendor:'abacus',product:'ERP',item_code:'10510.1',label_fr:'Comptabilité financière',included_components:['10510.1','10510.208','10510.206','10510.218','10510.219'],pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:10000,value:1000}]}};
const params={publisher_rent:{abacus:{standard:{pa_rate:.2,pv_rate:.3}}},day_rate:100};
test('clearing a proposed service day stays incomplete; zero and halves are accepted',()=>{
 const input={products:['abacus'],dimensions:{population:1000},reference:{id:'test'},modules:[{vendor:'abacus',product:'ERP',item_code:'10510.1'}],moduleServices:[{family:'prestations_module',item_code:'abacus/ERP/10510.1',days:null,suggested_days:2}]};
 assert.deepEqual(calculateQuote(input,{items:[base],parameters:params}).summary.missing_service_days,['abacus/ERP/10510.1']);
 for(const days of [0,.5,1000]){input.moduleServices[0].days=days;const result=calculateQuote(input,{items:[base],parameters:params});assert.deepEqual(result.summary.missing_service_days,[]);assert.equal(result.summary.investment,days*100);}
});
test('manual portal volume is independent, preserves zero and replaces the suggestion',()=>{
 assert.equal(portalUsers({employees:21}),11);assert.equal(portalUsers({employees:200,portalUsers:7}),7);assert.equal(portalUsers({employees:20,portalUsers:0}),0);
 const item={...base,pricing_rule:{kind:'monthly_per_user',basis:'employees',users_per_unit:.5,monthly_price:3}};
 assert.equal(priceCatalogItem(item,{employees:200,portalUsers:7}).value,252);
 assert.throws(()=>priceCatalogItem(item,{employees:20,portalUsers:null}),/Portal users required/);
});
test('an optional group-covered article does not inherit an invented zero day',()=>{
 const item={...base,item_code:'optional'},id='abacus/ERP/optional';
 const catalog={items:[item],parameters:{configuration_profiles:[{id:'test',default_modules:{abacus:['base']},module_days:{[id]:0},module_group_labels:{[id]:'Finance'}}]}};
 assert.equal(serviceDays(catalog,id,'test'),null);catalog.parameters.configuration_profiles[0].default_modules.abacus.push('optional');assert.equal(serviceDays(catalog,id,'test'),0);
});
test('Abacus pack expands its included functions; article codes are internal only',()=>{
 const input={products:['abacus'],modules:[{vendor:'abacus',product:'ERP',item_code:'10510.1'}]};
 const catalog={items:[base],parameters:{}};const scope=customerModuleScope(input,catalog);
 assert.equal(scope[0].items[0].included.length,4);assert.equal(JSON.stringify(scope).includes('10510.1'),false);
 assert.equal(customerModuleScope(input,catalog,{internal:true})[0].items[0].reference,'10510.1');
});
test('Abacus services stay in implementation and budget amounts reconcile',()=>{
 const lines=[{family:'prestations',item_code:'abacus-prime',investment_pv:200,annual_pv:0},{family:'prestations_module',item_code:'abacus/ERP/demo',investment_pv:300,annual_pv:0}];
 const rows=publicCostDetails(lines);assert.equal(rows.length,1);assert.equal(rows[0].label_fr,'Abacus');assert.equal(rows[0].investment,500);
 const b=annualOfferBudget({annual:1000},{hosting:300},[{annual:100}]);assert.equal(b.softwareAndSupport+b.hosting+b.publisher,b.total);
});

test('public scope does not count a bundled component twice when separately selected',()=>{
 const input={products:['abacus'],modules:[{vendor:'abacus',product:'ERP',item_code:'10510.1'},{vendor:'abacus',product:'ERP',item_code:'10510.208'}]};
 const catalog={items:[base,{...base,item_code:'10510.208',included_components:[],label_fr:'Gestion des monnaies étrangères'}],parameters:{}};
 assert.equal(customerModuleScope(input,catalog)[0].items.length,1);
 assert.equal(customerModuleScope(input,catalog,{internal:true})[0].items.length,2);
});
