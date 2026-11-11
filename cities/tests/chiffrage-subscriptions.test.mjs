import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, priceCatalogItem } from '../app/chiffrage/calculate.js';
import { publisherBillingRows } from '../app/chiffrage/commercial-breakdown.js';
import { offerPublisherBilling } from '../app/offer/presentation.js';
import { defaultModule } from '../app/chiffrage/standards.js';
const item={vendor:'abacus',product:'ERP',item_code:'SYNTHETIC',label_fr:'Portail <test>',rate_class:'direct',billing_mode:'publisher_direct',pricing_rule:{kind:'monthly_per_user',basis:'employees',users_per_unit:.5,monthly_price:3}};
const catalog={items:[item],parameters:{publisher_rent:{abacus:{direct:{pa_rate:1,pv_rate:1}}}}};
test('monthly subscription rounds users up, preserves zero and rejects negative inputs',()=>{
 assert.equal(priceCatalogItem(item,{employees:5}).value,108);
 assert.equal(priceCatalogItem(item,{employees:0}).value,0);
 assert.throws(()=>priceCatalogItem(item,{employees:-1}),/Invalid subscription/);
});
test('direct publisher subscription contributes no Prime margin or first-year discount',()=>{
 const result=calculateQuote({products:['abacus'],dimensions:{population:100,employees:5},modules:[{vendor:'abacus',product:'ERP',item_code:'SYNTHETIC'}]},catalog);
 assert.equal(result.lines[0].annual_pa,108);assert.equal(result.lines[0].annual_pv,108);
 assert.equal(result.summary.software_margin_year2,0);assert.equal(result.summary.software_margin_5y,0);
 const safe=publisherBillingRows(result.lines);assert.deepEqual(Object.keys(safe[0]).sort(),['annual','label','users']);
 assert.equal(safe[0].users,3);
 const html=offerPublisherBilling(safe,{label:fr=>fr,money:n=>`${n} CHF`});assert.match(html,/&lt;test&gt;/);assert.match(html,/compris dans le budget/);assert.doesNotMatch(html,/<test>/);
});
test('cantonal profile defaults accept both canonical and VD-specific codes',()=>{
 const item={vendor:'innosolv',item_code:'129VD'};
 for(const code of ['129','129VD'])assert.equal(defaultModule(item,{parameters:{configuration_profiles:[{id:'test',default_modules:{innosolv:[code]}}]}},'test'),true);
});
