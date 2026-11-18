import test from 'node:test';
import assert from 'node:assert/strict';
import { evolutionCount, refreshEvolution } from '../app/core/evolution.js';

const link = count => `<https://api.github.com/repos/akada-prime/swiss/commits?sha=main&path=cities&per_page=1&page=${count}>; rel="last"`;
test('evolution uses the last page of the original cities history, not the repository total', () => {
  assert.equal(evolutionCount(link(704), [{}]), 704);
  assert.equal(evolutionCount(link(704).replace('/repos/akada-prime/swiss/', '/repositories/1345177269/'), [{}]),704);
  assert.equal(evolutionCount(link(704).replace('path=cities', 'path=elsewhere'), [{}]), null);
  assert.equal(evolutionCount(link(704).replace('api.github.com', 'example.com'), [{}]), null);
  assert.equal(evolutionCount(link(-4), [{}]), null);
});
test('a successful refresh advances the fallback and caches only the count', async () => {
  const node={dataset:{evolutionCount:'705'},textContent:'#705'},store=new Map();
  const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
  let calls=0;
  const fetcher=async()=>{calls++;return {ok:true,headers:{get:()=>link(707)},json:async()=>[{}]};};
  assert.equal(await refreshEvolution(node,{fetcher,storage,now:1000}),707);
  assert.equal(node.textContent,'#707');
  assert.equal(await refreshEvolution(node,{fetcher,storage,now:2000}),707);
  assert.equal(calls,1);
});
test('rate limits, unavailable storage and older responses preserve the visible release counter', async () => {
  const node={dataset:{evolutionCount:'705'},textContent:'#705'};
  const storage={getItem:()=>{throw Error('disabled');}};
  assert.equal(await refreshEvolution(node,{storage,fetcher:async()=>({ok:false,status:403})}),null);
  assert.equal(await refreshEvolution(node,{fetcher:async()=>{throw Error('offline');}}),null);
  assert.equal(await refreshEvolution(node,{fetcher:async()=>({ok:true,headers:{get:()=>link(704)},json:async()=>[{}]})}),null);
  assert.equal(node.textContent,'#705');
});
