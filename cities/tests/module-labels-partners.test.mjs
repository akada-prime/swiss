import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanModuleLabel,cleanInnosolvCatalog} from '../app/chiffrage/module-labels.js';
import {customerModuleScope} from '../app/chiffrage/module-scope.js';
import {offerScope,offerOptions} from '../app/offer/presentation.js';
const render=groups=>offerScope(groups,{asset:x=>x});

test('Innosolv list markers disappear at catalog read without changing codes, tariffs or inner hyphens',()=>{
 const catalog={items:[{vendor:'innosolv',item_code:'207',label_fr:'- E-factures pour PostFinance',label_de:'– E-Rechnungen',pricing_rule:{fixed:81}},{vendor:'pce',label_fr:'- Un autre libellé'}],parameters:{module_contents:[{parent:'innosolv/ERP/101',label_fr:'- Campagnes',label_de:'- Kampagnen'}]}};
 const clean=cleanInnosolvCatalog(catalog);
 assert.equal(clean.items[0].label_fr,'E-factures pour PostFinance');assert.equal(clean.parameters.module_contents[0].label_fr,'Campagnes');
 assert.equal(clean.items[0].item_code,'207');assert.deepEqual(clean.items[0].pricing_rule,{fixed:81});assert.equal(clean.items[1].label_fr,'- Un autre libellé');assert.equal(catalog.items[0].label_fr,'- E-factures pour PostFinance');
 assert.equal(cleanModuleLabel('PCE-EBICS'),'PCE-EBICS');assert.equal(cleanModuleLabel('Gestion des e-factures'),'Gestion des e-factures');
 const scope=customerModuleScope({products:['innosolv'],modules:[{vendor:'innosolv',product:'ERP',item_code:'101'}]}, {items:[{vendor:'innosolv',product:'ERP',item_code:'101',label_fr:'- Activités',label_de:'- Aktivitäten'}],parameters:catalog.parameters});
 assert.equal(scope[0].items[0].fr,'Activités');assert.equal(scope[0].items[0].included[0].fr,'Campagnes');
});

test('partner supplier groups use one disclosure per name and retain all safe module names',()=>{
 const scope=customerModuleScope({products:[],partners:[{label:'Validation des factures',supplier:'GED Doc.Series',item_code:'a'},{label:'Archivage',supplier:'GED Doc.Series',item_code:'b'},{label:'Portail',supplier:'Autre partenaire',item_code:'c'}]}, {items:[],parameters:{}});
 assert.equal(scope.length,2);assert.equal(scope[0].items.length,2);assert.equal(scope[0].items[0].supplier,'GED Doc.Series');
 const html=render(scope.map(g=>({product:g.product,items:g.items.map(x=>({label:x.fr,supplier:x.supplier,included:[]}))})));
 assert.equal((html.match(/<details class="prime-offer-scope-section">/g)||[]).length,2);
 assert.equal((html.match(/>GED Doc.Series <span/g)||[]).length,1);assert.match(html,/Validation des factures/);assert.match(html,/Archivage/);assert.match(html,/Autre partenaire/);
 assert.doesNotMatch(html,/supplier=|item_code|days/);
 const sameBrand=render([{product:'Doc.Series',items:[{label:'A',supplier:'Société A'},{label:'B',supplier:'Société B'}]}]);
 assert.equal((sameBrand.match(/<details class="prime-offer-scope-section">/g)||[]).length,2);
 const sameSupplier=render([{product:'Société A',items:[{label:'A',supplier:' Société A '}]},{product:'société a',items:[{label:'B',supplier:'société a'}]}]);
 assert.equal((sameSupplier.match(/<details class="prime-offer-scope-section">/g)||[]).length,1);
});

test('frozen public offers receive compact clean titles and supplier fallback without republishing',()=>{
 const html=render([{product:'innosolvcity',items:[{label:'- Campagnes',section:'Base'}]},{product:'Doc.Series',items:[{label:'Validation'}]}]);
 assert.doesNotMatch(html,/>- Campagnes/);assert.match(html,/>Campagnes/);assert.match(html,/>Doc.Series <span/);
 const options=offerOptions([{label_fr:'- E-factures pour PostFinance',benefit_fr:'eBill',investment:880,annual:81}],{label:fr=>fr,money:x=>`${x} CHF HT`});
 assert.match(options,/>E-factures pour PostFinance \(eBill\)</);assert.doesNotMatch(options,/>- E-factures/);
});
