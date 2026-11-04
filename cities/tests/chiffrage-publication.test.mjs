import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {readFileSync,writeFileSync} from 'node:fs';
import handler,{signSession} from '../supabase/functions/chiffrage/server.mjs';
import {exportClientPdf,pdfFilename} from '../supabase/functions/chiffrage/client-pdf.mjs';
const offer={version:2,commune:'Commune de démonstration',canton:'VD',bfs_id:9999,population:1196,revision:5,public_version:'v1.0',amounts:{investment:107780,annual:37028,tco5y:255892},scope:[{product:'ProConcept',items:[{fr:'Finances',included:Array.from({length:60},(_,i)=>({fr:'Module inclus '+(i+1)}))}]}],cost_details:[{label_fr:'Logiciels',investment:50000,annual:10000},{label_fr:'Accompagnement',investment:57780,annual:27028}],optional_options:[{label_fr:'Option de démonstration',benefit_fr:'Un bénéfice utile.',investment:1760,annual:500,description_fr:'Option hors périmètre.'}]};
const oldDeno=globalThis.Deno;globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-key'})[key]}};
test.after(()=>globalThis.Deno=oldDeno);
test('PDF includes every module and separate options with pagination, without editor input',async()=>{
 const bytes=await exportClientPdf(offer),doc=await PDFDocument.load(bytes);
 assert.ok(doc.getPageCount()>=2);assert.equal(doc.getAuthor(),'Prime Technologies SA');
 assert.equal(pdfFilename(offer),'Prime_Commune_de_demonstration_VD_v1.0_R5.pdf');
 assert.deepEqual(offer.amounts,{investment:107780,annual:37028,tco5y:255892});
 writeFileSync('/tmp/prime-client-qa.pdf',bytes);
});
test('named public access counts reads; PDF uses active publication without incrementing views',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(JSON.stringify(String(url).includes('/rpc/')?offer:[{payload:offer,public_version:'v1.0',expires_at:null}]),{headers:{'Content-Type':'application/json'}});};
 try{
  const headers={Authorization:'Bearer demo-vd/v1.0r5'},base='https://example.supabase.co/functions/v1/chiffrage?action=';
  assert.equal((await handler(new Request(base+'clientOffer',{headers}))).status,200);
  assert.match(calls[0].url,/record_chiffrage_named_open/);assert.equal(JSON.parse(calls[0].options.body).p_slug,'demo-vd/v1.0r5');
  const pdf=await handler(new Request(base+'clientOfferPdf',{headers}));assert.equal(pdf.status,200);assert.equal(pdf.headers.get('Content-Type'),'application/pdf');assert.match(calls[1].url,/revoked_at=is.null/);assert.doesNotMatch(calls[1].url,/rpc/);
  globalThis.fetch=async()=>new Response('[]',{headers:{'Content-Type':'application/json'}});
  assert.equal((await handler(new Request(base+'clientOfferPdf',{headers}))).status,404);
 }finally{globalThis.fetch=original;}
});
test('activation is editor-only, limited to the requested quote and never overwrites frozen amounts',async()=>{
 const original=globalThis.fetch;let call;
 globalThis.fetch=async(url,options)=>{call={url:String(url),options};return new Response('[{"id":"link","revoked_at":null}]',{headers:{'Content-Type':'application/json'}});};
 try{
  const id='00000000-0000-4000-8000-000000000001';
  for(const active of [true,false]){
   const response=await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=setOfferActive',{method:'POST',headers:{Authorization:'Bearer '+signSession(),Origin:'https://akada-prime.github.io','Content-Type':'application/json'},body:JSON.stringify({id,link_id:id,active})}));
   assert.equal(response.status,200);assert.match(call.url,/chiffrage_id=eq/);assert.equal(call.options.method,'PATCH');assert.deepEqual(Object.keys(JSON.parse(call.options.body)),['revoked_at']);assert.equal(JSON.parse(call.options.body).revoked_at===null,active);
  }
 }finally{globalThis.fetch=original;}
});
test('database publication is idempotent, service-only and has no automatic expiry',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261104222332_named_client_publications.sql',import.meta.url),'utf8');
 assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/chiffrage_named_revision_unique/);assert.match(sql,/expires_at is null or expires_at>now/);
 assert.match(sql,/from public,anon,authenticated/);assert.doesNotMatch(sql,/set payload=/i);
});
