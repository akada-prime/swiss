import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { signSession } from '../supabase/functions/chiffrage/server.mjs';

test('incomplete drafts save their inputs without invented totals and cannot be exported', async () => {
  const previousDeno=globalThis.Deno, previousFetch=globalThis.fetch;
  const id='00000000-0000-4000-8000-000000000001';
  const input={bfs_id:9999,name:'Synthetic',canton:'JU',products:[],
    dimensions:{population:1500},hosting:{included:true},primeLines:[]};
  let stored;
  globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://synthetic.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-test-key'})[key]}};
  globalThis.fetch=async (resource, options) => {
    const path=new URL(resource).pathname;
    const value=path.endsWith('/chiffrage_catalog_items')?[]:
      path.endsWith('/chiffrage_parameters')?[{content:{}}]:
      path.endsWith('/chiffrage_catalog_versions')?[{id,vendor:'synthetic'}]:
      path.endsWith('/chiffrages')?[{id,current_revision:1}]:
      path.endsWith('/chiffrage_revisions')?[{result:stored.p_result}]:null;
    if(path.endsWith('/rpc/chiffrage_write')){
      stored=JSON.parse(options.body);
      return new Response(JSON.stringify({id,revision:1}));
    }
    assert.ok(value,`unexpected endpoint ${path}`);
    return new Response(JSON.stringify(value));
  };
  try {
    const headers={Origin:'https://akada-prime.github.io',
      Authorization:`Bearer ${signSession()}`,'Content-Type':'application/json'};
    const save=allow_incomplete=>handler(new Request('https://synthetic.supabase.co?action=save',{
      method:'POST',headers,body:JSON.stringify({input,title:'Draft',
        catalog_versions:{synthetic:id},allow_incomplete})}));
    const rejected=await save(false);
    assert.equal(rejected.status,422);
    assert.equal((await rejected.json()).code,'hostingPricesRequired');
    assert.equal(stored,undefined);
    assert.equal((await save(true)).status,200);
    assert.deepEqual(stored.p_input,input);
    assert.equal(stored.p_result.status,'incomplete');
    assert.deepEqual(stored.p_result.issues,[{code:'hostingPricesRequired'}]);
    assert.equal(stored.p_result.summary.missing_hosting,true);
    const exported=await handler(new Request(`https://synthetic.supabase.co?action=export&id=${id}`,{headers}));
    assert.equal(exported.status,422);
    assert.equal((await exported.json()).code,'quoteIncomplete');
    const invalid=await handler(new Request('https://synthetic.supabase.co?action=save',{
      method:'POST',headers,body:JSON.stringify({input:{...input,products:['invalid']},
        catalog_versions:{synthetic:id},allow_incomplete:true})}));
    assert.equal(invalid.status,400);
    assert.deepEqual(await invalid.json(),{error:'Operation failed'});
  } finally {globalThis.Deno=previousDeno;globalThis.fetch=previousFetch;}
});
