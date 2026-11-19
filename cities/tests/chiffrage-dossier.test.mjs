import test from 'node:test';
import assert from 'node:assert/strict';
import {safeContact,validateDossier} from '../app/chiffrage/dossier-data.js';
import {dossierEditor} from '../app/chiffrage/dossier-editor.js';
import {offerContacts,investmentEquation} from '../app/offer/presentation.js';
import {publicOfferFromSaved} from '../supabase/functions/chiffrage/client-projection.mjs';
import handler,{signSession} from '../supabase/functions/chiffrage/server.mjs';
const client={name:'Client <test>',position:'Secrétariat',email:'contact@example.test',phone:'032 000 00 00'};
test('notes remain private while only the declared contact fields enter a publication',()=>{
 const input={products:[],modules:[],primeLines:[],partners:[],internal_notes:'PRIVATE_NOTES_NEVER_PUBLISH',client_contact:{...client,private:'PRIVATE_NESTED'},prime_contact_id:'alex'};
 const projection=publicOfferFromSaved({bfs_id:9999,commune_name:'Synthetic',canton:'JU',population:100,snapshot:{revision:1,input,result:{lines:[],summary:{investment:0,annual:0}}}},{items:[],parameters:{}});
 assert.deepEqual(projection.client_contact,client);assert.equal(projection.prime_contact_id,'alex');assert.doesNotMatch(JSON.stringify(projection),/PRIVATE|internal_notes/);
 assert.throws(()=>validateDossier({internal_notes:'x'.repeat(20001)}));assert.throws(()=>validateDossier({client_contact:{email:'invalid'}}));
 assert.deepEqual(safeContact({...client,private:'hidden'}),client);
});
test('the first-tab editor exposes private notes and click-accessible draggable contact choices',()=>{
 const html=dossierEditor({internal_notes:'A\nB',client_contact:client,prime_contact_id:'alex'},[{id:'alex',name:'Alex Test',position:'Marchés',email:'prime@example.test',phone:'079 000 00 00'}],{label:fr=>fr});
 assert.match(html,/Notes internes/);assert.match(html,/<details class="chiffrage-dossier-notes-fold" data-disclosure-key="dossier-notes">/);assert.match(html,/>A\nB<\/textarea>/);assert.match(html,/jamais affichées au client/);assert.match(html,/draggable="true"/);assert.match(html,/data-prime-person="alex"/);assert.match(html,/aria-pressed="true"/);assert.match(html,/dossier-client="position"/);assert.match(html,/tous ses chiffrages/);
});
test('public contact rendering escapes names, links only declared addresses and omits absent cards',()=>{
 const html=offerContacts({client,prime:{name:'Prime',phone:'079 000 00 00'}},fr=>fr);assert.match(html,/Client &lt;test&gt;/);assert.match(html,/mailto:contact@example.test/);assert.match(html,/tel:0790000000/);assert.equal(offerContacts({}), '');assert.doesNotMatch(html,/<input|textarea|data-prime-edit/);
 const equation=investmentEquation({investment:1000,investment_gross:1500,investment_discount:500},{label:fr=>fr,money:n=>`${n} CHF HT`,currency:true});assert.match(equation,/gross-label">brut/);assert.match(equation,/rebate-label">remise/);assert.match(equation,/prime-offer-currency">CHF HT/);
});
test('shared profiles require an editor session and public reads resolve current details for the selected profile only',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;let calls=[];
 globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'})[key]}};
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(JSON.stringify(String(url).includes('/rpc/')?{version:2,prime_contact_id:'alex',amounts:{investment:10,annual:2,tco5y:18}}:[{name:'Updated person',position:'Marchés',email:'new@example.test',phone:'079 123 45 67'}]));};
 try{
  assert.equal((await handler(new Request('https://synthetic.test?action=teamContacts'))).status,401);assert.equal(calls.length,0);
  const response=await handler(new Request('https://synthetic.test?action=clientOffer',{headers:{Authorization:'Bearer demo-ju/v1.0r1'}}));const body=await response.json();assert.equal(body.prime_contact.phone,'079 123 45 67');assert.equal(body.prime_contact_id,undefined);assert.match(calls[1].url,/id=eq.alex/);assert.deepEqual(body.amounts,{investment:10,annual:2,tco5y:18});
  calls=[];assert.equal((await handler(new Request('https://synthetic.test?action=teamContacts',{headers:{Authorization:`Bearer ${signSession()}`}}))).status,200);
 }finally{globalThis.fetch=oldFetch;globalThis.Deno=oldDeno;}
});
test('editors can create reusable profiles and concurrent edits cannot overwrite a newer profile',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;const calls=[];
 globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic'})[key]}};
 globalThis.fetch=async(url,options)=>{calls.push({url:new URL(url),options});return new Response(JSON.stringify(options.method==='POST'?[JSON.parse(options.body)]:[]));};
 try{
  const headers={Authorization:`Bearer ${signSession()}`,'Content-Type':'application/json',Origin:'https://akada-prime.github.io'};
  const request=(action,body)=>new Request('https://synthetic.test?action='+action,{method:'POST',headers,body:JSON.stringify(body)});
  const response=await handler(request('createTeamContact',{name:'Camille Test',position:'Intégration',email:'camille@example.test',phone:'079 000 00 00',private:'never-store'}));
  assert.equal(response.status,201);const created=await response.json();assert.match(created.id,/^p-[0-9a-f-]{36}$/);assert.equal(created.name,'Camille Test');assert.equal(created.private,undefined);
  const timestamp='2026-11-19T10:00:00.000Z';
  assert.equal((await handler(request('saveTeamContact',{id:'alex',name:'New name',expected_updated_at:timestamp}))).status,409);
  assert.equal(calls[1].url.searchParams.get('updated_at'),'eq.'+timestamp);assert.equal(calls[1].options.method,'PATCH');
  const before=calls.length;assert.equal((await handler(request('createTeamContact',{name:''}))).status,400);assert.equal(calls.length,before);
 }finally{globalThis.fetch=oldFetch;globalThis.Deno=oldDeno;}
});
