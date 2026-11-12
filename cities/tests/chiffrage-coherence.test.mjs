import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {annualOfferBudget,publicCostDetails} from '../app/chiffrage/commercial-breakdown.js';
import {offerBreakdown,offerScope} from '../app/offer/presentation.js';
import {serviceDays} from '../app/chiffrage/standards.js';
import {calculateQuote} from '../app/chiffrage/calculate.js';
const label=f=>f,money=n=>Math.round(n)+' CHF';
test('portal billing appears once in software and reconciles old frozen Abacus totals',()=>{
 const lines=[{family:'innosolv',annual_pv:200},{family:'abacus',annual_pv:300},{family:'abacus',label:'ESS',billing_mode:'publisher_direct',annual_pv:120},{family:'prime',category:'license',investment_pv:100,annual_pv:50}];
 const details=publicCostDetails(lines),rows=details.map(row=>({...row,label:row.label_fr}));
 assert.deepEqual(rows.map(x=>x.label),['innosolvcity','Abacus','Portail Abacus','Prime']);
 assert.equal(rows.reduce((s,x)=>s+x.annual,0),670);
 const old=rows.filter(x=>x.label!=='Portail Abacus').map(x=>({...x,annual:x.annual+(x.label==='Abacus'?120:0)}));
 for(const data of [rows,old]){
  const before=JSON.stringify(data),html=offerBreakdown(data,{label,money,publisherRows:[{label:'ESS',annual:120}]});
  assert.equal((html.match(/<h4>Portail Abacus/g)||[]).length,1);assert.match(html,/Facturé directement/);assert.match(html,/300 CHF/);assert.match(html,/120 CHF/);assert.equal(JSON.stringify(data),before);
 }
 const b=annualOfferBudget({annual:1000},{hosting:200,lcm:100},[{annual:120}]);assert.equal(b.softwareAndSupport,700);assert.equal(b.softwareAndSupport+b.lcm+b.hosting,b.total);
});
test('Prime belongs directly below innosolv in an independent column',()=>{
 const html=offerScope([{product:'innosolvcity',items:['Base']},{product:'Abacus',items:['Finance']},{product:'Prime',items:['Formules']}],{label,asset:p=>p});
 const columns=html.split('<div class="prime-offer-module-column">').slice(1);
 assert.equal(columns.length,2);assert.match(columns[0],/Base/);assert.match(columns[0],/Formules/);assert.doesNotMatch(columns[0],/Finance/);assert.match(columns[1],/Finance/);
});
test('all optional imported zero-day presets require a deliberate choice, genuine defaults survive',()=>{
 const id='innosolv/Gemeinde/104',item={vendor:'innosolv',product:'Gemeinde',item_code:'104',default_selected:false};
 const catalog={items:[item],parameters:{service_presets:{standard:{[id]:0}}}};
 assert.equal(serviceDays(catalog,id),null);item.default_selected=true;assert.equal(serviceDays(catalog,id),0);
});
test('editable project management percentage affects only its calculated charge and annual costs are unchanged',()=>{
 const input={dimensions:{population:500},products:[],modules:[],services:[{family:'prestations',item_code:'reprise',days:20}],projectManagement:{basis:'prime_service_days',percent:10,round_days:1},hosting:{included:false},lcm:{selection:'none'}};
 const catalog={items:[],parameters:{day_rate:100}},before=calculateQuote(input,catalog);input.projectManagement.percent=15;const after=calculateQuote(input,catalog);
 assert.equal(before.lines.find(x=>x.item_code==='projet').investment_pv,200);assert.equal(after.lines.find(x=>x.item_code==='projet').investment_pv,300);assert.equal(after.summary.annual,before.summary.annual);
 const source=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');assert.equal((source.match(/field\('projectManagement.percent'/g)||[]).length,1);assert.equal((source.match(/field\('sql.override'/g)||[]).length,1);
});
test('Doc.Series and eAdmin use the supplied light/dark brands without exposing supplier fields',async()=>{
 const {customerModuleScope}=await import('../app/chiffrage/module-scope.js');
 const input={products:[],modules:[],partners:[{label:'GED',supplier:'Doc.Series',category:'license'},{label:'Guichet virtuel',supplier:'eAdmin Solutions SA',category:'license'}]};
 const scope=customerModuleScope(input,{items:[],parameters:{}});assert.deepEqual(scope.map(x=>x.product),['Doc.Series','eAdmin']);assert.doesNotMatch(JSON.stringify(scope),/supplier|Solutions SA/);
 const html=offerScope(scope.map(g=>({product:g.product,items:g.items.map(x=>({label:x.fr}))})),{label,asset:p=>p});
 for(const name of ['doc-series-negative.png','doc-series-positive.png','eadmin-negative.png','eadmin-positive.png'])assert.ok(html.includes(name));
 assert.match(offerScope([{product:'Partenaires',items:['Doc.Series GED']}],{label,asset:p=>p}),/doc-series-negative.png/);
});
