import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReference,serviceDays,retainRemoved,applyHosting} from '../app/chiffrage/standards.js';
import {calculateQuote,priceCatalogItem} from '../app/chiffrage/calculate.js';
const catalog={parameters:{day_rate:100,configuration_profiles:[{id:'synthetic',label:'Fixture',module_days:{'innosolv/Gemeinde/1':2},services:[{family:'prestations',item_code:'formation',days:3}],project_management:{percent:20,basis:'prime_service_days',round_days:1}}]}};
const input=()=>({modules:[{vendor:'innosolv',product:'Gemeinde',item_code:'1'}],dimensions:{population:1000},products:[],primeLines:[],partners:[]});
test('applying a private reference snapshots module and global days without mutating the reference',()=>{
 const draft=input();assert.equal(applyReference(draft,catalog,'synthetic'),true);
 assert.equal(draft.moduleServices[0].days,2);draft.services[0].days=7;draft.projectManagement.percent=50;
 assert.equal(catalog.parameters.configuration_profiles[0].services[0].days,3);
 assert.equal(catalog.parameters.configuration_profiles[0].project_management.percent,20);
 assert.equal(serviceDays(catalog,'not/specified','synthetic'),null);
});
test('GP uses source-defined Prime service days, rounds once, excludes partners and does not duplicate a historic GP line',()=>{
 const draft=input();applyReference(draft,catalog,'synthetic');
 draft.services.push({family:'prestations',item_code:'projet',days:100});
 draft.partners.push({family:'partenaires',days:100});
 const result=calculateQuote(draft,catalog),gp=result.lines.filter(line=>line.item_code==='projet');
 assert.equal(gp.length,1);assert.equal(gp[0].selected_days,1);assert.equal(gp[0].investment_pv,100);
 assert.equal(gp[0].explanation.basis_days,5);
 draft.services[0].days=11;
 assert.equal(calculateQuote(draft,catalog).lines.find(line=>line.item_code==='projet').selected_days,3);
 delete draft.projectManagement;
 assert.equal(calculateQuote(draft,catalog).lines.find(line=>line.item_code==='projet').selected_days,100);
});
test('temporarily removing and restoring a module retains human service days and price overrides',()=>{
 const draft=input(),original=structuredClone(draft.modules);original[0].pv_override=42;
 const services=[{item_code:'innosolv/Gemeinde/1',days:9}];draft.modules=[];draft.moduleServices=[];
 retainRemoved(draft,original,services);
 draft.modules=structuredClone(original);delete draft.modules[0].pv_override;draft.moduleServices=[{item_code:'innosolv/Gemeinde/1',days:2}];
 retainRemoved(draft,[],[]);assert.equal(draft.moduleServices[0].days,9);assert.equal(draft.modules[0].pv_override,42);
});
test('hosting prefill clones only available private references and never overwrites manual values',()=>{
 const draft=input(),c={parameters:{hosting_presets:[{lines:[{category:'hosting',investment_pv:20,annual_pv:30}]}]}};
 applyHosting(draft,c);draft.primeLines[0].annual_pv=0;applyHosting(draft,c);
 assert.equal(draft.primeLines.length,1);assert.equal(draft.primeLines[0].annual_pv,0);
 assert.equal(c.parameters.hosting_presets[0].lines[0].annual_pv,30);
});
test('source multipliers apply before the final rounding, with a source minimum and an explicit free zero',()=>{
 const item={item_code:'fixture',pricing_rule:{kind:'linear_rounded',basis:'meters',round_to:100,minimum_basis:1100,value_multiplier:.5,quantity_round_to:100,zero_is_free:true,tiers:[{up_to:1000,value:1000},{up_to:2500,value:3255}]}};
 assert.equal(priceCatalogItem(item,{meters:500}).value,600);
 assert.equal(priceCatalogItem(item,{meters:1201}).value,700);
 assert.equal(priceCatalogItem(item,{meters:0}).value,0);
});
test('an absent module-day reference is explicitly incomplete, while a human zero is valid',()=>{
 const draft=input();applyReference(draft,catalog,'synthetic');draft.moduleServices[0].days=null;draft.moduleServices[0].suggested_days=null;
 const result=calculateQuote(draft,catalog);assert.equal(result.status,'incomplete');assert.deepEqual(result.summary.missing_service_days,['innosolv/Gemeinde/1']);
 draft.moduleServices[0].days=0;assert.equal(calculateQuote(draft,catalog).status,undefined);
});
test('ERP-specific services remain in the snapshot but do not charge the other ERP',()=>{
 const draft=input();applyReference(draft,catalog,'synthetic');draft.services.push({family:'prestations',item_code:'pce-setup',days:8,requires_products:['pce'],requires_pce_option:'finances'});draft.pce={finances:true};
 assert.equal(calculateQuote(draft,catalog).lines.some(line=>line.item_code==='pce-setup'),false);
 assert.equal(draft.services.find(line=>line.item_code==='pce-setup').days,8);
});
test('a source-specific hosting amount cannot silently follow a change of ERP scope',()=>{
 const draft=input();draft.hosting={included:true};draft.primeLines=[{family:'prime',category:'hosting',investment_pv:20,annual_pv:30,reference_products:['pce']}];
 assert.throws(()=>calculateQuote(draft,catalog),/Hosting reference scope changed/);
 draft.primeLines[0].reference_products=[];
 assert.equal(calculateQuote(draft,catalog).summary.annual,30);
});
