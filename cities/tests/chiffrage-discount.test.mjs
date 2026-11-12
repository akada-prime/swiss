import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote} from '../app/chiffrage/calculate.js';
import {publicOfferFromSaved} from '../supabase/functions/chiffrage/client-projection.mjs';
import {exportQuoteXlsx} from '../supabase/functions/chiffrage/chiffrage-xlsx.mjs';
import {offerBreakdown} from '../app/offer/presentation.js';
import handler,{signSession} from '../supabase/functions/chiffrage/server.mjs';
const catalog={items:[],parameters:{day_rate:80}};
const input=()=>({bfs_id:9999,name:'Synthetic discount',canton:'JU',products:[],dimensions:{population:500},modules:[],hosting:{included:false},lcm:{selection:'none'},services:[{family:'prestations',item_code:'reprise',label:'Reprise',days:15}],primeLines:[{family:'prime',category:'license',item_code:'synthetic',label:'Synthetic annual service',days:0,annual_pv:50}]});
const quote=(draft,result)=>({title:'Synthetic',commune_name:'Synthetic',bfs_id:9999,population:500,canton:'JU',snapshot:{revision:1,input:draft,result,catalog_versions:{}}});
test('investment concession preserves the real 15 service days and all annual amounts',()=>{
 const draft=input(),before=calculateQuote(draft,catalog);draft.investmentDiscount=201;const original=JSON.stringify(draft),after=calculateQuote(draft,catalog);
 assert.equal(before.summary.investment,1200);assert.equal(after.summary.investment_gross,1200);assert.equal(after.summary.investment_discount,201);assert.equal(after.summary.investment,999);
 assert.equal(after.summary.annual,before.summary.annual);assert.equal(after.summary.tco5y,before.summary.tco5y-201);assert.equal(after.summary.revenue5y,before.summary.revenue5y-201);
 assert.equal(after.lines.find(line=>line.item_code==='reprise').selected_days,15);assert.equal(JSON.stringify(draft),original);
 assert.equal(after.lines.filter(line=>line.family==='investment_discount').length,1);assert.equal(after.summary.known_costs5y,before.summary.known_costs5y);
 assert.equal(calculateQuote({...draft,investmentDiscount:201.01},catalog).summary.investment,998.99);
});
test('discount bounds accept zero/full investment and reject invalid or excessive concessions',()=>{
 const draft=input();assert.equal(calculateQuote({...draft,investmentDiscount:0},catalog).summary.investment,1200);assert.equal(calculateQuote({...draft,investmentDiscount:1200},catalog).summary.investment,0);
 for(const value of [-1,1200.01,Infinity,NaN,'200',.001])assert.throws(()=>calculateQuote({...draft,investmentDiscount:value},catalog),/Invalid investment discount/);
 assert.throws(()=>calculateQuote({...draft,hosting:{included:true},primeLines:[],investmentDiscount:-1},catalog),/Invalid investment discount/);
});
test('new public offers and Excel reconcile gross, discount and net without leaking the draft',()=>{
 const draft={...input(),investmentDiscount:201},result=calculateQuote(draft,catalog),saved=quote(draft,result),publicOffer=publicOfferFromSaved(saved,catalog);
 assert.equal(publicOffer.amounts.investment,999);assert.equal(publicOffer.amounts.annual,50);assert.equal(publicOffer.amounts.tco5y,1199);
 assert.equal(publicOffer.breakdown.reduce((sum,row)=>sum+row.investment,0),999);assert.equal(publicOffer.cost_details.find(row=>row.key==='discount').investment,-201);
 assert.equal(Object.hasOwn(publicOffer,'investmentDiscount'),false);
 const rows=publicOffer.cost_details.map(row=>({...row,label:row.label_fr}));
 for(const lang of ['fr','de']){const html=offerBreakdown(rows,{label:(fr,de)=>lang==='fr'?fr:de,money:n=>String(n)+' CHF HT'});assert.match(html,/1200/);assert.match(html,/201/);assert.match(html,/999/);assert.match(html,lang==='fr'?/Investissement net HT/:/Nettoinvestition/);}
 const data=exportQuoteXlsx(saved).toString('utf8');assert.match(data,/Investissement avant remise/);assert.match(data,/Investissement net HT/);assert.match(data,/<v>-201<\/v>/);assert.match(data,/<v>999<\/v>/);
});
test('the server never saves an invalid discount, even with incomplete drafts permitted',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch,id='00000000-0000-4000-8000-000000000001';let stored;
 globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-key'})[key]}};
 globalThis.fetch=async(url,init={})=>{const path=new URL(url).pathname;let value;
 if(path.endsWith('/chiffrage_catalog_items'))value=[];
 else if(path.endsWith('/chiffrage_parameters'))value=[{content:catalog.parameters}];
 else if(path.endsWith('/chiffrage_catalog_versions'))value=[{id,vendor:'commercial'}];
 else if(path.endsWith('/rpc/chiffrage_write_v2')){stored=JSON.parse(init.body);value={id,revision:1,save_number:1};}
 else throw Error('Unexpected fixture endpoint');return new Response(JSON.stringify(value));};
 try{
  const headers={Origin:'https://akada-prime.github.io',Authorization:`Bearer ${signSession()}`,'Content-Type':'application/json'};
  const save=investmentDiscount=>handler(new Request('https://synthetic.supabase.co?action=save',{method:'POST',headers,body:JSON.stringify({input:{...input(),investmentDiscount},title:'Synthetic',catalog_versions:{commercial:id},allow_incomplete:true,manual_save:true})}));
  const invalid=await save(1201);assert.equal(invalid.status,422);assert.equal((await invalid.json()).code,'investmentDiscountInvalid');assert.equal(stored,undefined);
  assert.equal((await save(201)).status,200);assert.equal(stored.p_input.investmentDiscount,201);assert.equal(stored.p_result.summary.investment,999);assert.equal(stored.p_manual_save,true);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
