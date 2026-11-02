import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleParents,includedForParent,optionApplies,validateModuleCatalog } from '../app/chiffrage/module-catalog.js';
import { catalogEditor,readCatalogRecord } from '../app/chiffrage/catalog-editor.js';
import { customerModuleScope } from '../app/chiffrage/module-scope.js';
import { offerScope,offerBreakdown,offerFigures } from '../app/offer/presentation.js';
import { calculateQuote } from '../app/chiffrage/calculate.js';
import handler, {signSession} from '../supabase/functions/chiffrage/server.mjs';

const contents=[{"id":"pce-inclus-immobilisations","parent":"pce/ERP/finances","label_fr":"Immobilisation","label_de":"Anlagenbuchhaltung","theme_fr":"Finances","theme_de":"Finanzen","order":0,"enabled":true},{"id":"pce-inclus-debiteurs","parent":"pce/ERP/finances","label_fr":"Débiteurs","label_de":"Debitoren","theme_fr":"Finances","theme_de":"Finanzen","order":1,"enabled":true},{"id":"pce-inclus-creanciers","parent":"pce/ERP/finances","label_fr":"Créanciers","label_de":"Kreditoren","theme_fr":"Finances","theme_de":"Finanzen","order":2,"enabled":true},{"id":"pce-inclus-budgets","parent":"pce/ERP/finances","label_fr":"Budgets","label_de":"Budgets","theme_fr":"Finances","theme_de":"Finanzen","order":3,"enabled":true},{"id":"pce-inclus-planification","parent":"pce/ERP/finances","label_fr":"Planification financière","label_de":"Finanzplanung","theme_fr":"Finances","theme_de":"Finanzen","order":4,"enabled":true},{"id":"pce-inclus-brochures","parent":"pce/ERP/finances","label_fr":"Brochures cantonales","label_de":"Kantonale Broschüren","theme_fr":"Finances","theme_de":"Finanzen","order":5,"enabled":true},{"id":"pce-inclus-fsupload","parent":"pce/ERP/finances","label_fr":"Export fsupload","label_de":"Export fsupload","theme_fr":"Finances","theme_de":"Finanzen","order":6,"enabled":true},{"id":"pce-inclus-innosolv","parent":"pce/ERP/finances","label_fr":"Interfaces innosolv","label_de":"innosolv-Schnittstellen","theme_fr":"Finances","theme_de":"Finanzen","order":7,"enabled":true},{"id":"pce-inclus-employes","parent":"pce/ERP/salaires","label_fr":"Gestion des employés","label_de":"Mitarbeiterverwaltung","theme_fr":"Salaires","theme_de":"Löhne","order":8,"enabled":true},{"id":"pce-inclus-swissdec","parent":"pce/ERP/salaires","label_fr":"Interfaces SwissDec","label_de":"Swissdec-Schnittstellen","theme_fr":"Salaires","theme_de":"Löhne","order":9,"enabled":true}];
const options=[{"item_code":"prime-pce-ebics","label_fr":"Interface PCE-EBICS","label_de":"PCE-EBICS-Schnittstelle","days":1,"annual_pv":0,"requires_product":"pce","annual_rule":null,"investment_fixed_pv":0,"enabled":true,"source":"Validation direction Prime, 02.11.2026","method":"approved_fixed_annual","sample_size":0},{"item_code":"prime-pce-revue-salaires","label_fr":"Revue des salaires PCE","label_de":"PCE-Lohnüberprüfung","days":3,"annual_pv":500,"requires_product":"pce","requires_pce_option":"salaires","annual_rule":null,"investment_fixed_pv":0,"enabled":true,"source":"Validation direction Prime, 02.11.2026","method":"approved_fixed_annual","sample_size":0},{"item_code":"prime-pce-arrangements","label_fr":"Arrangements de paiements PCE","label_de":"PCE-Zahlungsvereinbarungen","days":0.5,"annual_pv":0,"requires_product":"pce","requires_pce_option":"finances","annual_rule":null,"investment_fixed_pv":0,"enabled":true,"source":"Validation direction Prime, 02.11.2026","method":"approved_fixed_annual","sample_size":0},{"item_code":"prime-pce-budgets-excel","label_fr":"Import des budgets PCE via Excel","label_de":"PCE-Budgetimport aus Excel","days":1,"annual_pv":0,"requires_product":"pce","requires_pce_option":"finances","annual_rule":null,"investment_fixed_pv":0,"enabled":true,"source":"Validation direction Prime, 02.11.2026","method":"approved_fixed_annual","sample_size":0}];
const catalog={items:[{vendor:'abacus',product:'ERP',item_code:'10510.1',label_fr:'Finances',label_de:'Finanzen'}],parameters:{module_contents:contents,prime_options:options,day_rate:1000}};
const input={products:['pce'],pce:{finances:true,salaires:false},modules:[]};
test('included content follows only the selected parent and publishes safe labels',()=>{
 const scope=customerModuleScope(input,catalog);
 assert.equal(scope[0].items.length,1);
 assert.equal(scope[0].items[0].included.length,8);
 assert.equal(customerModuleScope({...input,pce:{finances:false,salaires:true}},catalog)[0].items[0].included.length,2);
 assert.deepEqual(customerModuleScope({...input,products:[]},catalog),[]);
 assert.equal(scope[0].items[0].included.some(row=>'parent' in row || 'source' in row),false);
 const html=offerScope(scope.map(g=>({product:g.product,items:g.items.map(x=>({label:x.fr,included:x.included.map(c=>({label:c.fr}))}))})),{asset:x=>x});
 assert.match(html,/8 fonctions incluses/);assert.match(html,/Brochures cantonales/);assert.doesNotMatch(html,/<input/);
});
test('included functions are generic, sorted and frozen with saved inputs',()=>{
 const rows=[{id:'a',parent:'abacus/ERP/10510.1',label_fr:'Fonction A',order:2},{id:'b',parent:'abacus/ERP/10510.1',label_fr:'Fonction B',order:1}];
 const old={products:['abacus'],modules:[{vendor:'abacus',product:'ERP',item_code:'10510.1'}],module_contents:rows};
 const changed={...catalog,parameters:{module_contents:[]}};
 assert.deepEqual(includedForParent(old,changed,'abacus/ERP/10510.1').map(x=>x.fr),['Fonction B','Fonction A']);
 assert.equal(customerModuleScope(old,changed)[0].items[0].included.length,2);
 assert.ok(moduleParents(catalog).some(x=>x.key==='pce/ERP/salaires'));
});
test('catalog rejects orphaned parents, duplicate identifiers and invalid prices; fixed zero remains explicit',()=>{
 const valid=validateModuleCatalog({module_contents:contents,prime_options:options},catalog);
 assert.equal(valid.module_contents.length,10);assert.equal(valid.prime_options[0].annual_pv,0);
 assert.equal(valid.prime_options[1].annual_pv,500);assert.equal(valid.prime_options[2].days,.5);
 assert.throws(()=>validateModuleCatalog({module_contents:[{...contents[0],parent:'missing'}],prime_options:options},catalog));
 assert.throws(()=>validateModuleCatalog({module_contents:contents,prime_options:[{...options[0],days:-1}]},catalog));
 assert.throws(()=>validateModuleCatalog({module_contents:[contents[0],contents[0]],prime_options:options},catalog));
 assert.equal(optionApplies(options[0],{products:['abacus']}),false);
 assert.equal(optionApplies(options[1],input),false);
 assert.equal(optionApplies(options[1],{products:['pce'],pce:{salaires:true}}),true);
});
test('included content never changes money and independent Prime options charge days plus their fixed annual price',()=>{
 const draft={products:[],dimensions:{population:1000},modules:[],moduleServices:[],services:[],primeLines:[],partners:[],hosting:{included:false},lcm:{selection:'none'}};
 const before=calculateQuote(draft,catalog);
 assert.deepEqual(calculateQuote({...draft,module_contents:contents},catalog),before);
 for(const option of options){
  const line={...option,requires_product:null,requires_pce_option:null,family:'prime',category:'license',label:option.label_fr,unit_day_rate:1000,quantity:1};
  const result=calculateQuote({...draft,primeLines:[line]},catalog);
  assert.equal(result.summary.investment,option.days*1000);assert.equal(result.summary.annual,option.annual_pv);
  const excluded=calculateQuote({...draft,primeLines:[{...line,requires_product:'pce'}]},catalog);
  assert.equal(excluded.summary.investment,0);assert.equal(excluded.summary.annual,0);
 }
});
test('catalog editor exposes ordinary fields for both kinds and preserves zero on form submission',()=>{
 const html=catalogEditor({module_contents:contents,prime_options:options,parents:moduleParents(catalog)},f=>f,{kind:'option',index:0});
 assert.match(html,/chiffrageCatalogForm/);assert.match(html,/name="annual_pv"[^>]*value="0"/);
 assert.match(html,/name="requires_product"/);assert.doesNotMatch(html,/service_role|onclick=/);
 const fields={label_fr:'Test',label_de:'',enabled:{checked:true},requires_product:'pce',requires_pce_option:'',days:'0.5',investment_fixed_pv:'0',annual_mode:'fixed',annual_pv:'0'};
 const form={dataset:{kind:'option'},elements:{namedItem:name=>typeof fields[name]==='object'?fields[name]:{value:fields[name] ?? ''}}};
 assert.equal(readCatalogRecord(form,{item_code:'prime-test'}).annual_pv,0);assert.equal(readCatalogRecord(form,{item_code:'prime-test'}).days,.5);
});
test('compact implementation retains subtotals, offered travel, one header and nonzero annual costs',()=>{
 const rows=[['implementation','Mise en œuvre · innosolvcity',28160],['implementation','Mise en œuvre',1760],['implementation','Mise en œuvre · ProConcept',17600],['migration','Reprise de données',26400],['training','Formation et aide au démarrage',17600],['management','Gestion de projet',8800],['otherServices','Déplacements',1750],['otherServices','Déplacements offerts',-1750]].map(([key,label,investment])=>({key,label,investment,annual:0}));
 const config={label:f=>f,money:n=>n+' CHF HT'}, html=offerBreakdown(rows,config);
 assert.match(html,/47520/);assert.match(html,/52800/);assert.match(html,/100320/);
 assert.match(html,/>Prime<\/span>/);assert.match(html,/Déplacements \(estimés\)/);
 assert.doesNotMatch(html,/Annuel ·/);assert.equal((html.match(/Investissement ·/g)||[]).length,1);
 assert.match(offerBreakdown([...rows,{key:'otherServices',label:'Suivi',investment:0,annual:100}],config),/Annuel ·/);
 const figures=offerFigures({investment:1,annual:2,tco5y:9},{...config,municipal:true,annualBreakdown:{solutions:2,lcm:0,hosting:0}});
 assert.match(figures,/<\/div><details class="prime-offer-annual-disclosure">/);
 assert.doesNotMatch(figures,/<details class="prime-offer-annual-disclosure" open/);
});
test('catalog endpoints reject customer bearer tokens and untrusted origins',async()=>{
 const old=globalThis.Deno;
 globalThis.Deno={env:{get:name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-key'})[name]}};
 try {
  for(const action of ['moduleCatalog','saveModuleCatalog'])assert.equal((await handler(new Request('https://example.supabase.co/?action='+action,{headers:{Authorization:'Bearer '+'A'.repeat(43)}}))).status,401);
  assert.equal((await handler(new Request('https://example.supabase.co/?action=saveModuleCatalog',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.invalid'},body:'{}'}))).status,403);
 }finally{globalThis.Deno=old;}
});

test('authenticated catalog editing checks the active version and sends validated content through the atomic RPC',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;
 globalThis.Deno={env:{get:name=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-key'})[name]}};
 const oldVersion='00000000-0000-4000-8000-000000000001',newVersion='00000000-0000-4000-8000-000000000002';
 let active=oldVersion,writes=0;
 globalThis.fetch=async(url,init={})=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/rpc/chiffrage_update_modules')){
   const body=JSON.parse(init.body);assert.equal(body.p_expected_version,oldVersion);
   assert.equal(body.p_module_contents.length,10);assert.equal(body.p_prime_options[0].annual_pv,0);
   writes++;active=newVersion;return new Response(JSON.stringify({version:newVersion}));
  }
  const values=path.endsWith('/chiffrage_catalog_versions')?[{id:active,vendor:'commercial',version:'test',active:true}]:
    path.endsWith('/chiffrage_parameters')?[{catalog_version_id:active,content:catalog.parameters}]:[];
  return new Response(JSON.stringify(values));
 };
 const request=(action,payload)=>new Request('https://example.supabase.co/?action='+action,{
  method:payload?'POST':'GET',headers:{Authorization:'Bearer '+signSession(),origin:'https://akada-prime.github.io',...(payload?{'content-type':'application/json'}:{})},
  ...(payload?{body:JSON.stringify(payload)}:{})});
 try {
  assert.equal((await handler(request('moduleCatalog'))).status,200);
  const payload={expected_version:oldVersion,module_contents:contents,prime_options:options};
  const saved=await handler(request('saveModuleCatalog',payload));
  assert.equal(saved.status,200);assert.equal((await saved.json()).version,newVersion);assert.equal(writes,1);
  assert.equal((await handler(request('saveModuleCatalog',payload))).status,409);assert.equal(writes,1);
  assert.equal((await handler(request('saveModuleCatalog',{...payload,expected_version:newVersion,module_contents:[{...contents[0],parent:'unknown'}]}))).status,400);
  assert.equal(writes,1);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
