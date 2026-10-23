import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { signSession } from '../supabase/functions/chiffrage/server.mjs';
import { publicOfferFromSaved } from '../supabase/functions/chiffrage/client-projection.mjs';
import { readFileSync } from 'node:fs';

const oldDeno=globalThis.Deno;
globalThis.Deno={env:{get:name=>({
  SUPABASE_URL:'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-server-key'
})[name]}};
test.after(()=>{globalThis.Deno=oldDeno;});
const id='00000000-0000-4000-8000-000000000001';
const quote={
  id,title:'Saignelégier — Variante 1',commune_name:'Saignelégier',
  canton:'JU',bfs_id:6757,population:2568,current_revision:4,
  snapshot:{revision:4,input:{products:['innosolv','pce'],reference:{label:'Internal reference'},
    commercial:{dayRate:1760},secret:'private'},
    result:{summary:{investment:110,annual:25,software_margin_year2:999,known_costs5y:999},
      lines:[{family:'innosolv',investment_pv:20,annual_pv:25,annual_pa:2,annual_margin:999},
        {family:'prestations',investment_pv:50,annual_pv:0,investment_pa:10},
        {family:'partenaires',investment_pv:30,annual_pv:0,investment_pa:5},
        {family:'prime',category:'hosting',investment_pv:10,annual_pv:0,investment_pa:7}]}}
};

test('public projection exposes only three PV buckets and frozen commercial totals',()=>{
  const clean=publicOfferFromSaved(quote);
  assert.deepEqual(clean.amounts,{investment:110,annual:25,tco5y:210});
  assert.deepEqual(clean.buckets,{
    solutions:{investment:70,annual:25},
    partners:{investment:30,annual:0},
    hosting:{investment:10,annual:0}});
  assert.deepEqual(clean.products,['innosolvcity','ProConcept']);
  const json=JSON.stringify(clean).toLowerCase();
  for(const forbidden of ['annual_pa','investment_pa','margin','catalog','referenc','dayrate','private','lines','input','secret']){
    assert.ok(!json.includes(forbidden),forbidden);
  }
  assert.deepEqual(Object.keys(clean).sort(),['amounts','bfs_id','buckets','canton','commune',
    'issued_at','population','products','quote_title','revision','version'].sort());
});

test('incomplete, mismatched or null cost drafts are not shareable',()=>{
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,status:'incomplete'}}}),null);
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,summary:{investment:999,annual:25}}}}),null);
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,
    lines:[{investment_pv:null,annual_pv:25}]}}}),null);
});

test('sharing management still requires editor authorization and same origin',async()=>{
  for(const action of ['publishOffer','sharedOffers','revokeOffer']){
    const response=await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action='+action));
    assert.equal(response.status,401,action);
  }
  const response=await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=publishOffer',{
    method:'POST',headers:{Origin:'https://hostile.example',Authorization:'Bearer '+signSession(),
      'Content-Type':'application/json'},body:JSON.stringify({id})}));
  assert.equal(response.status,403);
});

test('public offer never accepts a quote id or editor session as a capability',async()=>{
  for(const token of [id,signSession(),'forged']) {
    const response=await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=clientOffer',{
      headers:{Authorization:'Bearer '+token}}));
    assert.equal(response.status,404);
  }
});

test('customer standalone page does not load editor scripts, navigation or private data',()=>{
  const html=readFileSync(new URL('../offre.html',import.meta.url),'utf8');
  const client=readFileSync(new URL('../app/client-offer.js',import.meta.url),'utf8');
  assert.doesNotMatch(html,/app\/main\.js|prime-chiffrage-session|view-tabs|chiffrageRoot/);
  assert.doesNotMatch(client,/calculateQuote|sessionStorage|localStorage|innerHTML\s*=\s*JSON\.stringify/);
  assert.match(html,/name="robots" content="noindex/);
  assert.match(html,/referrer" content="no-referrer"/);
  assert.match(client,/action=clientOffer/);
});
