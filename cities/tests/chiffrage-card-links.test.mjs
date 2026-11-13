import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
const load=source.slice(source.indexOf('async function loadSharedLinks('),source.indexOf('function offerShareUrl('));
function context(ready='true',api=async()=>[]){
 const card={dataset:{quoteCard:'q',currentRevision:'7',shareReady:ready}};
 const panel={isConnected:true,innerHTML:'',closest:()=>null,setAttribute(){},removeAttribute(){},querySelector:()=>null};
 const rendered=[];const ctx={root:{querySelectorAll:()=>[card]},state:{session:'session',draft:null,revision:null},listSnapshots:new Map(),api,savedQuoteFigures:snapshot=>snapshot.figures,renderSharedLinks:(...args)=>{rendered.push(args);return 'links';},escape:String,errorMessage:e=>e.message,localLabel:fr=>fr};
 vm.createContext(ctx);vm.runInContext(load,ctx);return {ctx,card,panel,rendered};
}
test('card links modal uses its saved revision and completion rather than the absent editor draft',async()=>{
 for(const ready of ['true','false']){const {ctx,panel,rendered}=context(ready);await ctx.loadSharedLinks('q',panel);assert.equal(rendered[0][2],'7');assert.equal(rendered[0][3],ready==='true');assert.equal(panel.innerHTML,'links');}
});
test('pending card readiness loads its own snapshot and evicts a failed request so retry works',async()=>{
 let failed=true;const calls=[];const {ctx,card,panel,rendered}=context('pending',async(action,body,query)=>{calls.push({action,query});if(action==='quote'){if(failed)throw Error('offline');return {snapshot:{figures:{incomplete:false},result:{offer_options_ready:true}}};}return [];});
 await ctx.loadSharedLinks('q',panel);assert.equal(ctx.listSnapshots.size,0);assert.match(panel.innerHTML,/Réessayer/);assert.equal(card.dataset.shareReady,'pending');
 failed=false;await ctx.loadSharedLinks('q',panel);assert.equal(card.dataset.shareReady,'true');assert.equal(rendered[0][3],true);assert.equal(calls.filter(x=>x.action==='quote').length,2);assert.equal(calls[0].query.revision,'7');
});
test('board polling leaves an open links dialog intact, including one opened during a request',async()=>{
 const code=source.slice(source.indexOf('async function refreshBoard('),source.indexOf('async function updateBoard('));
 let open=true,calls=0,renders=0;const ctx={state:{mode:'list',board:{version:1}},root:{querySelector:()=>open?{}:null},boardController:null,boardSignature:JSON.stringify,renderList:()=>renders++,api:async()=>{calls++;open=true;return {version:2,quotes:[]};}};
 vm.createContext(ctx);vm.runInContext(code,ctx);await ctx.refreshBoard();assert.equal(calls,0);open=false;await ctx.refreshBoard();assert.equal(calls,1);assert.equal(renders,0);
});
