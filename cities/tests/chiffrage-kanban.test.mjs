import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Linter} from 'eslint';
import {boardGroups,boardHtml,boardRibbon,cardTools,quoteLocked,saveNumber,defaultColumns} from '../app/chiffrage/kanban.js';
import {workspaceIdentity} from '../app/chiffrage/workspace-ui.js';
import handler,{signSession} from '../supabase/functions/chiffrage/server.mjs';
test('one global board retains all dossiers and locks the third position regardless of its name',()=>{
 const rows=[{id:'c',workflow_stage:2,workflow_order:1,archived:true},{id:'b',workflow_stage:1,workflow_order:2},{id:'a',workflow_stage:1,workflow_order:1},{id:'d'}];
 assert.deepEqual(boardGroups(rows).map(group=>group.map(row=>row.id)),[['d'],['a','b'],['c']]);
 assert.equal(quoteLocked(rows[0]),true);assert.equal(quoteLocked(rows[1]),false);
 const html=boardHtml(rows,['Début','Proposé','Validé'],row=>row.id);assert.equal((html.match(/data-stage=/g)||[]).length,3);assert.match(html,/Validé/);assert.doesNotMatch(html,/Lecture seule/);
 assert.equal(boardRibbon(0,'Brouillon'),'');assert.match(boardRibbon(1,'Client'),/data-ribbon-stage="1"/);assert.match(boardRibbon(2,'<script>'),/&lt;script&gt;/);
});
test('the internal manual-save marker is separate from the publication revision',()=>{
 assert.equal(saveNumber({save_number:37,current_revision:89}),37);assert.equal(saveNumber({current_revision:89}),0);
 const html=workspaceIdentity({name:'Test',title:'Dossier',revision:89,saveNumber:37,locked:true,label:fr=>fr});assert.match(html,/#37/);assert.doesNotMatch(html,/R89/);assert.match(html,/aria-disabled="true"/);
});
test('shared board controllers have no unresolved browser identifiers',()=>{
 const globals=Object.fromEntries(['window','document','AbortController','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout'].map(name=>[name,'readonly']));
 const source=readFileSync(new URL('../app/chiffrage/kanban.js',import.meta.url),'utf8');
 assert.deepEqual(new Linter().verify(source,[{languageOptions:{ecmaVersion:'latest',sourceType:'module',globals},rules:{'no-undef':'error'}}]).map(({line,message})=>({line,message})),[]);
});
test('shared board API validates mutations and uses existing internal sessions',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;
 globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-key'})[key]}};
 const writes=[],id='00000000-0000-4000-8000-000000000001';
 globalThis.fetch=async(url,init={})=>{const path=new URL(url).pathname;if(path.endsWith('/rpc/chiffrage_board_update')){writes.push(JSON.parse(init.body));return new Response(JSON.stringify({version:2,column_titles:defaultColumns}));}if(path.endsWith('/chiffrage_board'))return new Response(JSON.stringify([{version:1,column_titles:defaultColumns}]));if(path.endsWith('/chiffrages'))return new Response(JSON.stringify([{id,workflow_stage:0,save_number:3}]));throw Error('Unexpected fixture URL');};
 try{
  const headers={Origin:'https://akada-prime.github.io',Authorization:`Bearer ${signSession()}`,'Content-Type':'application/json'};
  const post=(action,payload,h=headers)=>handler(new Request(`https://synthetic.supabase.co?action=${action}`,{method:'POST',headers:h,body:JSON.stringify(payload)}));
  assert.equal((await post('moveQuote',{id,stage:2,expected_version:1},{Origin:headers.Origin,'Content-Type':'application/json'})).status,401);
  assert.equal((await post('moveQuote',{id,stage:3,expected_version:1})).status,400);
  assert.equal((await post('renameColumn',{column:2,title:' ',expected_version:1})).status,400);assert.equal(writes.length,0);
  assert.equal((await post('moveQuote',{id,stage:2,expected_version:1})).status,200);assert.deepEqual(writes[0],{p_expected_version:1,p_quote_id:id,p_stage:2,p_before_id:null});
  assert.equal((await post('renameColumn',{column:2,title:' Validé ',expected_version:2})).status,200);assert.equal(writes[1].p_title,'Validé');
  const board=await(await handler(new Request('https://synthetic.supabase.co?action=board',{headers}))).json();assert.equal(board.quotes[0].save_number,3);
 }finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});
test('a finalized write produces a stable read-only conflict response',async()=>{
 const oldDeno=globalThis.Deno,oldFetch=globalThis.fetch;
 const id='00000000-0000-4000-8000-000000000001';globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-key'})[key]}};
 globalThis.fetch=async()=>new Response(JSON.stringify({message:'Quote finalized'}),{status:400});
 try{const response=await handler(new Request('https://synthetic.supabase.co?action=moveQuote',{method:'POST',headers:{Origin:'https://akada-prime.github.io',Authorization:`Bearer ${signSession()}`,'Content-Type':'application/json'},body:JSON.stringify({id,stage:0,expected_version:1})}));assert.equal(response.status,423);assert.equal((await response.json()).code,'quoteFinalized');}finally{globalThis.Deno=oldDeno;globalThis.fetch=oldFetch;}
});

test('compact card tools retain drag, qualification and links with safe dossier identity',()=>{
 const html=cardTools({id:'quote"<x>',stage:1,columns:['Brouillon','Client & conseil','Finale']});
 assert.equal((html.match(/class="chiffrage-card-workflow"/g)||[]).length,1);
 assert.match(html,/data-drag-handle/);assert.match(html,/value="1" selected/);
 assert.match(html,/data-action="manageShares" data-id="quote&quot;&lt;x&gt;"/);
 assert.match(html,/Client &amp; conseil/);assert.doesNotMatch(html,/<details|Lecture seule/);
});
