import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote} from '../app/chiffrage/calculate.js';
import {offerOptionCandidates,priceOfferOption,offerOptionReview,validateOfferOptions} from '../app/chiffrage/offer-options.js';
import {offerOptions} from '../app/offer/presentation.js';
import {offerOptionsEditor,optionPriceMessage,optionReadinessMessage} from '../app/chiffrage/offer-options-editor.js';
import {publicOfferFromSaved} from '../supabase/functions/chiffrage/client-projection.mjs';
import {validateModuleGroups} from '../app/chiffrage/module-groups.js';
import {setSoftwareDisposition} from '../app/chiffrage/software-selection.js';
const l=fr=>fr,money=v=>v+' CHF HT';
const input={"products":[],"modules":[],"dimensions":{"population":1000},"primeLines":[],"partners":[],"services":[],"moduleServices":[],"lcm":{"selection":"none"},"hosting":{"included":false}};
const catalog={"items":[],"parameters":{"day_rate":100,"prime_options":[{"item_code":"demo","label_fr":"Option exemple","days":2,"annual_pv":12,"enabled":true,"source":"PRIVATE SOURCE","sample_size":99},{"item_code":"salary","label_fr":"Salaires","requires_product":"pce","requires_pce_option":"salaires","days":1,"annual_pv":5}],"lcm":[]}};
const selected={"key":"prime/Options/demo","label_fr":"Un service utile","benefit_fr":"Moins de doubles saisies.","description_fr":"Description détaillée.","days":null};
test('publisher option annual rent excludes changes to existing PCE licenses at a rounding boundary',()=>{
 const c=structuredClone(catalog);
 c.items=[['base',6000],['option',700]].map(([item_code,value])=>({vendor:'innosolv',product:'Gemeinde',item_code,label_fr:item_code,pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:5000,value}]}}));
 c.parameters.publisher_rent={innosolv:{standard:{pa_rate:.2,pv_rate:.2}}};
 c.parameters.pce={finance_basis:'innosolv_plus_options',finance_base_item_codes:['base'],finance_ratio:.4,finance_adjustment:0,finance_round_to:1000,salary_round_to:500,pv_margin:.2,pv_round_to:1000,interface_pv:0};
 c.parameters.oracle={};
 c.parameters.sql={suggestion:{lowerPopulation:0,lowerUsers:1,upperPopulation:10000,upperUsers:10},core_from_population:10000,user_base:0,price_per_user:0,default_cores:2,price_per_core:0};
 const draft={...structuredClone(input),products:['innosolv','pce'],pce:{finances:true,salaires:true},sql:{users:1},oracle:{full:0,light:0},modules:[{vendor:'innosolv',product:'Gemeinde',item_code:'base'}]};
 const candidate=offerOptionCandidates(draft,c).find(row=>row.key==='innosolv/Gemeinde/option');
 const before=structuredClone(draft),priced=priceOfferOption(draft,c,candidate,{days:1});
 assert.deepEqual(priced,{investment:100,annual:140});
 const included=setSoftwareDisposition(draft,c,candidate.key,'include');included.moduleServices[0].days=1;
 assert.ok(calculateQuote(included,c).summary.annual-calculateQuote(draft,c).summary.annual>priced.annual);
 assert.deepEqual(draft,before);
});
test('per-quote Prime subtitles survive proposing, saving validation, reinclusion and public projection',()=>{
 const groups=validateModuleGroups({'prime/Options/demo':'Options interfaces'});
 const draft={...structuredClone(input),module_groups:groups,primeLines:[{family:'prime',category:'license',item_code:'demo',label:'Interface GED',days:2,annual_pv:12}]};
 const proposed=setSoftwareDisposition(draft,catalog,'prime/Options/demo','propose');
 proposed.client_options=validateOfferOptions(proposed.client_options);
 const publicOptions=offerOptionReview(proposed,catalog).options;
 assert.equal(publicOptions[0].group_fr,'Options interfaces');
 assert.match(offerOptions(publicOptions,{label:l,money}),/prime-offer-option-group[^>]*>Options interfaces/);
 const restored=setSoftwareDisposition(proposed,catalog,'prime/Options/demo','include');
 const projection=publicOfferFromSaved(quoteFor(restored),catalog);
 assert.equal(projection.scope.find(row=>row.product==='Prime').items[0].section_fr,'Options interfaces');
 assert.equal(projection.amounts.annual,12);
 assert.throws(()=>validateModuleGroups({'__proto__':'bad','invalid':'bad'}));
 assert.throws(()=>validateModuleGroups({'prime/Options/demo':'x'.repeat(101)}));
 assert.deepEqual(validateModuleGroups({'prime/Options/demo':'  '}),{});
});
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
  const draft={...structuredClone(input),client_options:[{...selected,label_fr:''}]};
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
  assert.throws(()=>validateOfferOptions(Array.from({length:1001},(_,i)=>({...selected,key:'prime/Options/x'+i}))));
  assert.throws(()=>validateOfferOptions([selected,selected]));assert.throws(()=>validateOfferOptions([{...selected,days:-1}]));
});
test("showcase disclosures start closed and are independent of included modules",function(){
  const row=offerOptionReview({...input,client_options:[selected]},catalog).options[0];
  const html=offerOptions([row,{...row,label_fr:'Deux'},{...row,label_fr:'Trois'},{...row,label_fr:'Quatre'}],{label:l,money});
  assert.match(html,/Options non comprises dans les totaux/);assert.match(html,/Quatre/);assert.match(html,/Investissement · CHF HT/);assert.match(html,/Annuel · CHF HT\/an/);assert.doesNotMatch(html,/N\+1|Voir les autres possibilités|OPTION NON COMPRISE/);
  assert.doesNotMatch(html,/<details[^>]* open|data-scope-toggle|prime-offer-scope-section|<input/);assert.equal(offerOptions([],{label:l,money}),'');
  assert.match(offerOptions([{...row,label_fr:'<script>alert(1)</script>'}],{label:l,money}),/&lt;script&gt;/);
  const editor=offerOptionsEditor({...input,client_options:[selected]},catalog,l,money);assert.match(editor,/data-showcase-field="benefit_fr"/);assert.match(editor,/data-showcase-search/);
});
test("module supplement includes source days and excludes project management",function(){
  const c=structuredClone(catalog);c.items=[{vendor:'abacus',product:'ERP',item_code:'test',label_fr:'Test',pricing_rule:{kind:'lookup',basis:'population',below_first:'hold',tiers:[{up_to:5000,value:100}]}}];
  c.parameters.publisher_rent={abacus:{standard:{pa_rate:.1,pv_rate:.2}}};c.parameters.service_presets={standard:{'abacus/ERP/test':2}};
  const draft={...structuredClone(input),products:['abacus'],projectManagement:{basis:'prime_service_days',percent:50,round_days:1}},candidate=offerOptionCandidates(draft,c).find(row=>row.kind==='module');
  assert.deepEqual(priceOfferOption(draft,c,candidate),{investment:200,annual:20});
});
test('Prime optional annual PV is editable per offer, including explicit zero with zero days',()=>{
 const c=structuredClone(catalog);c.parameters.prime_options[0].annual_pv=null;
 const record={...selected,days:0,annual_override:0};
 const draft={...structuredClone(input),client_options:[record]},unchanged=structuredClone(draft);
 const candidate=offerOptionCandidates(draft,c)[0];
 assert.equal(priceOfferOption(draft,c,candidate,{days:0}),null);
 assert.deepEqual(priceOfferOption(draft,c,candidate,record),{investment:0,annual:0});
 const review=offerOptionReview(draft,c);assert.deepEqual(review.issues,[]);assert.equal(review.options[0].annual,0);
 assert.deepEqual(draft,unchanged);assert.equal(c.parameters.prime_options[0].annual_pv,null);
 const q={...quoteFor(draft),snapshot:{...quoteFor(draft).snapshot,result:calculateQuote(draft,c)}};
 const published=publicOfferFromSaved(q,c);assert.equal(published.optional_options[0].annual,0);assert.equal(published.optional_options[0].investment,0);
 assert.doesNotMatch(JSON.stringify(published.optional_options),/annual_override|days|item_code/);
 assert.deepEqual(published.amounts,{investment:0,annual:0,tco5y:0});
 const editor=offerOptionsEditor(draft,c,l,money);
 assert.match(editor,/data-showcase-field="annual_override" value="0"/);assert.match(editor,/Jours \(0 autorisé\)/);
});
test('custom Prime price overrides catalog formulas without changing them; blank restores reference',()=>{
 const c=structuredClone(catalog);c.parameters.prime_options[0].annual_rule={per_capita:.2,round_to:10};
 const candidate=offerOptionCandidates(input,c)[0],original=structuredClone(c);
 assert.deepEqual(priceOfferOption(input,c,candidate,{days:0}),{investment:0,annual:200});
 assert.deepEqual(priceOfferOption(input,c,candidate,{days:0,annual_override:499}),{investment:0,annual:499});
 assert.deepEqual(priceOfferOption(input,c,candidate,{days:0,annual_override:0}),{investment:0,annual:0});
 const clean=validateOfferOptions([{...selected,days:0,annual_override:''}])[0];
 assert.equal(clean.annual_override,undefined);assert.deepEqual(priceOfferOption(input,c,candidate,clean),{investment:0,annual:200});assert.deepEqual(c,original);
});
test('Prime annual pricing formulas are recognized even without a fixed annual PV',()=>{
 const c=structuredClone(catalog);c.parameters.prime_options[0].annual_pv=null;c.parameters.prime_options[0].annual_pricing={chf_per_inhabitant:.2,minimum:500,round_to:10};
 const candidate=offerOptionCandidates(input,c)[0];
 assert.deepEqual(priceOfferOption(input,c,candidate,{days:0}),{investment:0,annual:500});
});
test('annual overrides cannot alter publisher options or accept negative or nonfinite prices',()=>{
 for(const annual_override of [-1,Infinity,NaN,100000001])assert.throws(()=>validateOfferOptions([{...selected,annual_override}]));
 for(const vendor of ['innosolv','abacus','pce']){
  const row={...selected,key:vendor+'/ERP/test',annual_override:0};assert.throws(()=>validateOfferOptions([row]));
 }
 assert.equal(validateOfferOptions([{...selected,annual_override:'0'}])[0].annual_override,0);
});

test('completion identifies the missing annual price rather than blaming valid zero days or filled texts',()=>{
 const c=structuredClone(catalog);c.parameters.prime_options[0].annual_pv=null;
 const candidate=offerOptionCandidates(input,c)[0],record={...selected,days:0};
 assert.equal(optionPriceMessage(candidate,record,l),'Prix annuel Prime à préciser (0 CHF autorisé).');
 const hint=optionReadinessMessage(candidate,record,null,l);assert.match(hint,/Prix annuel Prime/);assert.doesNotMatch(hint,/titre client|bénéfice client|Jours à préciser/);
 assert.equal(optionReadinessMessage(candidate,{...record,annual_override:0},{investment:0,annual:0},l),'Prête pour la vitrine client.');
});

test('option captions stay inline and only editorial details create a disclosure',()=>{
 const row={label_fr:'innoconnect',label_de:'Inno DE',benefit_fr:'eDéménagement',benefit_de:'Umzug',description_fr:'',description_de:'',investment:1760,annual:162};
 const html=offerOptions([row],{label:l,money});assert.match(html,/innoconnect \(eDéménagement\)/);
 assert.doesNotMatch(html,/<details class="prime-offer-option">|prime-offer-option-detail/);
 const detailed=offerOptions([{...row,description_fr:'À découvrir'}],{label:l,money});assert.match(detailed,/<details class="prime-offer-option">/);assert.match(detailed,/<p>À découvrir<\/p>/);
 assert.doesNotMatch(offerOptions([{...row,description_fr:'  '}],{label:l,money}),/<details class="prime-offer-option">/);
 const de=offerOptions([row],{label:(fr,de)=>de,money});assert.match(de,/Inno DE \(Umzug\)/);
 const editor=offerOptionsEditor({...input,client_options:[{...selected,label_fr:'innoconnect',benefit_fr:'eDéménagement'}]},catalog,l,money);
 assert.match(editor,/<input[^>]*data-showcase-field="label_fr"/);assert.match(editor,/<input[^>]*data-showcase-field="benefit_fr"/);assert.match(editor,/data-showcase-live-title="0">innoconnect \(eDéménagement\)/);
});
