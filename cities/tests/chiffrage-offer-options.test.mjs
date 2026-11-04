import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote} from '../app/chiffrage/calculate.js';
import {offerOptionCandidates,priceOfferOption,offerOptionReview,validateOfferOptions} from '../app/chiffrage/offer-options.js';
import {offerOptions} from '../app/offer/presentation.js';
import {offerOptionsEditor} from '../app/chiffrage/offer-options-editor.js';
import {publicOfferFromSaved} from '../supabase/functions/chiffrage/client-projection.mjs';
const l=fr=>fr,money=v=>v+' CHF HT';
const input={"products":[],"modules":[],"dimensions":{"population":1000},"primeLines":[],"partners":[],"services":[],"moduleServices":[],"lcm":{"selection":"none"},"hosting":{"included":false}};
const catalog={"items":[],"parameters":{"day_rate":100,"prime_options":[{"item_code":"demo","label_fr":"Option exemple","days":2,"annual_pv":12,"enabled":true,"source":"PRIVATE SOURCE","sample_size":99},{"item_code":"salary","label_fr":"Salaires","requires_product":"pce","requires_pce_option":"salaires","days":1,"annual_pv":5}],"lcm":[]}};
const selected={"key":"prime/Options/demo","label_fr":"Un service utile","benefit_fr":"Moins de doubles saisies.","description_fr":"Description détaillée.","days":null};
function quoteFor(draft){return {title:'Offre test',commune_name:'Commune test',bfs_id:1,canton:'JU',population:1000,snapshot:{revision:1,input:draft,result:calculateQuote(draft,catalog)}};}
test("showcase is opt-in and excludes included functions and incompatible options",function(){
  assert.deepEqual(offerOptionReview(input,catalog).options,[]);
  assert.equal(offerOptionCandidates(input,catalog).length,1);
  const c=structuredClone(catalog);c.parameters.module_contents=[{parent:'prime/Options/demo',label_fr:'Inclus'}];
  assert.equal(offerOptionCandidates(input,c).length,1);
  assert.equal(offerOptionCandidates({...input,primeLines:[{item_code:'demo'}]},catalog).length,0);
  assert.ok(!offerOptionCandidates({...input,products:['pce'],pce:{finances:true,salaires:false}},catalog).some(row=>row.key==='prime/Options/salary'));
});
test("optional prices use the engine on a copy without changing quote totals",function(){
  const draft={...structuredClone(input),client_options:[selected]},before=structuredClone(draft),candidate=offerOptionCandidates(draft,catalog)[0];
  assert.deepEqual(priceOfferOption(draft,catalog,candidate,selected),{investment:200,annual:12});
  assert.deepEqual(calculateQuote(draft,catalog),calculateQuote(input,catalog));assert.deepEqual(draft,before);
  assert.deepEqual(offerOptionReview(draft,catalog).options[0],{label_fr:selected.label_fr,label_de:selected.label_fr,benefit_fr:selected.benefit_fr,benefit_de:selected.benefit_fr,description_fr:selected.description_fr,description_de:selected.description_fr,investment:200,annual:12});
});
test("missing values cannot look free and unready options prevent publication",function(){
  const c=structuredClone(catalog);c.parameters.prime_options[0].days=null;
  assert.equal(priceOfferOption(input,c,offerOptionCandidates(input,c)[0]),null);
  assert.deepEqual(priceOfferOption(input,c,offerOptionCandidates(input,c)[0],{days:0}),{investment:0,annual:12});
  c.parameters.prime_options[0].annual_pv=null;
  assert.equal(priceOfferOption(input,c,offerOptionCandidates(input,c)[0],{days:0}),null);
  const draft={...structuredClone(input),client_options:[{...selected,benefit_fr:''}]};
  assert.equal(offerOptionReview(draft,catalog).issues.length,1);assert.equal(publicOfferFromSaved(quoteFor(draft),catalog),null);
});
test("public option projection exposes only editorial texts and selling prices",function(){
  const q=quoteFor({...structuredClone(input),client_options:[selected]}),data=publicOfferFromSaved(q,catalog);
  assert.equal(data.optional_options.length,1);assert.deepEqual(data.amounts,{investment:0,annual:0,tco5y:0});
  assert.doesNotMatch(JSON.stringify(data.optional_options),/PRIVATE|sample_size|item_code|key|days|pa_|margin|source/);
  q.snapshot.input.primeLines.push({family:'prime',category:'license',item_code:'demo',days:2,annual_pv:12});q.snapshot.result=calculateQuote(q.snapshot.input,catalog);
  assert.equal(publicOfferFromSaved(q,catalog).optional_options,undefined);
});
test("curated list validation bounds selection and strips unrelated data",function(){
  assert.equal(validateOfferOptions([{...selected,secret:'hidden'}])[0].secret,undefined);
  assert.throws(()=>validateOfferOptions(Array.from({length:7},(_,i)=>({...selected,key:'prime/Options/x'+i}))));
  assert.throws(()=>validateOfferOptions([selected,selected]));assert.throws(()=>validateOfferOptions([{...selected,days:-1}]));
});
test("showcase disclosures start closed and are independent of included modules",function(){
  const row=offerOptionReview({...input,client_options:[selected]},catalog).options[0];
  const html=offerOptions([row,{...row,label_fr:'Deux'},{...row,label_fr:'Trois'},{...row,label_fr:'Quatre'}],{label:l,money});
  assert.match(html,/Options non comprises dans cette offre/);assert.match(html,/Option non comprise/);assert.match(html,/hors des totaux/);assert.match(html,/Voir les autres possibilités/);
  assert.doesNotMatch(html,/<details[^>]* open|data-scope-toggle|prime-offer-scope-section|<input/);assert.equal(offerOptions([],{label:l,money}),'');
  assert.match(offerOptions([{...row,label_fr:'<script>alert(1)</script>'}],{label:l,money}),/&lt;script&gt;/);
  const editor=offerOptionsEditor({...input,client_options:[selected]},catalog,l,money);assert.match(editor,/data-showcase-field="benefit_fr"/);assert.match(editor,/data-showcase-search/);
});
test("module supplement includes source days and its project-management effect",function(){
  const c=structuredClone(catalog);c.items=[{vendor:'abacus',product:'ERP',item_code:'test',label_fr:'Test',pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:5000,value:100}]}}];
  c.parameters.publisher_rent={abacus:{standard:{pa_rate:.1,pv_rate:.2}}};c.parameters.service_presets={standard:{'abacus/ERP/test':2}};
  const draft={...structuredClone(input),products:['abacus'],projectManagement:{basis:'prime_service_days',percent:50,round_days:1}},candidate=offerOptionCandidates(draft,c).find(row=>row.kind==='module');
  assert.deepEqual(priceOfferOption(draft,c,candidate),{investment:300,annual:20});
});