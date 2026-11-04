import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ruleArticles, matchingRules, catalogRules } from '../app/chiffrage/rules-reference.js';
import { referenceRows, referenceShell, referenceResults, parameterTable } from '../app/chiffrage/rules-reference-view.js';
import { licensedPopulation, effective } from '../app/chiffrage/calculate.js';
import { suggestedVolume, suggestedEmployees, updatePopulation } from '../app/chiffrage/configuration.js';
const l=(fr)=>fr;
const catalog={items:[{vendor:'innosolv',product:'Gemeinde',item_code:'synthetic',label_fr:'<img src=x onerror=alert(1)>',source:'fichier test',pricing_rule:{kind:'unverified',basis:'population',tiers:[{up_to:500,value:123}]}}],parameters:{day_rate:0,oracle:{full_price:null,light_price:12},configuration_profiles:[{id:'synthetic',label:'Test',module_days:{'innosolv/Gemeinde/synthetic':0}}]},versions:[{vendor:'commercial',version:'synthetic'}]};

test('global dictionary has stable unique articles and explicit business provenance',()=>{
  assert.ok(ruleArticles.length>=50);
  assert.equal(new Set(ruleArticles.map(row=>row.id)).size,ruleArticles.length);
  for(const row of ruleArticles){assert.ok(row.code && row.formula && row.summary);assert.ok(['confirmed','review','planned','arbitrate'].includes(row.status));if(row.status==='confirmed')assert.equal(row.origin,'alex');}
  assert.ok(ruleArticles.some(row=>row.id==='F03' && row.status==='review'));
  assert.ok(ruleArticles.some(row=>row.id==='V04' && row.status==='planned'));
});
test('reference search combines accent-insensitive terms, chapter and business status',()=>{
  assert.deepEqual(matchingRules(ruleArticles,{query:'deplacements estimes',chapter:'Prestations et profils'}).map(row=>row.id),['J06']);
  assert.ok(matchingRules(ruleArticles,{status:'confirmed'}).every(row=>row.status==='confirmed'));
  assert.equal(matchingRules(ruleArticles,{query:'aucunresultatimpossible'}).length,0);
});
test('live catalog values are projected read-only, and unverified grids remain flagged',()=>{
  const before=structuredClone(catalog);
  assert.equal(catalogRules(catalog)[0].status,'arbitrate');
  const html=referenceResults(catalog,l,{kind:'parameters'});
  assert.match(html,/À préciser/);assert.match(html,/>0<\/td>/);
  assert.match(html,/Test/);assert.deepEqual(catalog,before);
  assert.equal(referenceRows(catalog,'parameters').length,3);
  assert.match(referenceResults(catalog,l,{kind:'catalog'}),/&lt;img/);
  assert.doesNotMatch(referenceResults(catalog,l,{kind:'catalog'}),/<img/);
});
test('reference controls, empty results, disclosure and provenance are accessible',()=>{
  const shell=referenceShell(catalog,l,{kind:'rules'});
  assert.match(shell,/type="search"/);assert.match(shell,/aria-pressed="true"/);
  assert.doesNotMatch(shell,/data-field=|data-editor-tab=|data-action="save"/);
  assert.match(referenceResults(catalog,l,{query:'impossibleunique'}),/Aucune règle/);
  const html=referenceResults(catalog,l,{query:'G01'},new Set(['G01']));
  assert.match(html,/data-rule-id="G01" open/);assert.match(html,/Source \/ implémentation/);
  assert.match(parameterTable({'<script>':'<value>'},l),/&lt;script&gt;/);
});
test('documented dimension and manual-zero examples agree with current engine',()=>{
  assert.equal(licensedPopulation(1196),1500);assert.equal(suggestedVolume(1196),500);
  assert.equal(suggestedEmployees(1000),20);assert.equal(suggestedEmployees(2000),25);
  assert.equal(suggestedEmployees(3000),30);assert.equal(suggestedEmployees(10000),100);
  assert.equal(effective(123,0).effective_value,0);
  const dimensions={population:1000,licensedPopulation:1000,meters:777,taxes:500,employees:20};
  updatePopulation(dimensions,2000,licensedPopulation);
  assert.equal(dimensions.meters,777);assert.equal(dimensions.taxes,1000);assert.equal(dimensions.employees,25);
});
test('reference loads active catalog separately without changing a quote catalog',()=>{
  const source=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
  const action=source.slice(source.indexOf("if(action==='openReference')"),source.indexOf("if(action==='referenceBack')"));
  assert.match(action,/await api\('catalog'\)/);assert.match(action,/state.ruleCatalog=active.catalog/);
  assert.doesNotMatch(action,/state\.catalog\s*=|state\.draft\s*=|api\('save'/);
  assert.match(source,/state\.ruleCatalog=null/);
});


test('LCM remains a compact cross-table with one row per population class',()=>{
  const html=parameterTable({lcm:[{up_to:2000,gold:123,platinium:456,status:'synthetic',source_reference:'source démonstration'},{up_to:3000,gold:234,platinium:null}]},l);
  assert.match(html,/Habitants/);assert.match(html,/>Gold<\/th>/);assert.match(html,/>Platinum<\/th>/);assert.match(html,/<caption>CHF HT \/ an<\/caption>/);
  assert.match(html,/2&#39;001–3&#39;000/);assert.match(html,/<td>123<\/td><td>456<\/td>/);
  assert.doesNotMatch(html,/ › |source démonstration|État source/);
  assert.equal((html.match(/<tbody><tr>|<\/tr><tr>/g)||[]).length,2);
});
test('SQL groups parameters once and keeps its population anchors in columns',()=>{
  const html=parameterTable({sql:{user_base:111,price_per_user:22,core_from_population:8000,default_cores:2,price_per_core:null,suggestion:{lowerPopulation:1000,lowerUsers:4,upperPopulation:8000,upperUsers:30}}},l);
  assert.match(html,/<th scope="row">Forfait \(CHF\)<\/th><td>111<\/td>/);
  assert.match(html,/<th scope="row">1&#39;000<\/th><td>4<\/td>/);
  assert.doesNotMatch(html,/ › |SQL Server · utilisateurs et cores ›/);
});
test('options, included functions and commercial rates also use comparison columns',()=>{
  const options=parameterTable([{label_fr:'Option A',days:1,investment_fixed_pv:0,annual_pv:10},{label_fr:'Option B',days:2,investment_fixed_pv:0,annual_pv:20}],l);
  assert.match(options,/Jours/);assert.equal((options.match(/<table/g)||[]).length,1);
  assert.match(parameterTable({standard:{pa_rate:.11,pv_rate:.22}},l),/11 %<\/td><td>22 %/);
  const html=referenceResults({...catalog,parameters:{sql:{user_base:1,core_from_population:2}}},l,{query:'T02'},new Set(['T02']));
  assert.match(html,/class="rule-explanation"/);assert.match(html,/class="rule-provenance"/);
  assert.doesNotMatch(html,/<details class="rule-provenance" open/);
});
