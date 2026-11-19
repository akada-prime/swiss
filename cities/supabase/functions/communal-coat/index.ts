import {createCoatHandler} from './service.mjs';
const endpoint=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const headers={apikey:key,Authorization:`Bearer ${key}`};
async function db(path,options={}){
  const response=await fetch(`${endpoint}/rest/v1/${path}`,{...options,headers:{...headers,...options.headers}});
  const text=await response.text();
  if(!response.ok){const code=JSON.parse(text).code??'unknown';throw Error(`db-${response.status}-${code}`);}
  return text?JSON.parse(text):null;
}
Deno.serve(createCoatHandler({
  read:async id=>(await db(`communal_coat_cache?bfs_id=eq.${id}&select=*`))[0]??null,
  known:async id=>(await db(`Gemeinde?bfs_id=eq.${id}&select=bfs_id&limit=1`)).length===1,
  write:row=>db('communal_coat_cache?on_conflict=bfs_id',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)})
}));
