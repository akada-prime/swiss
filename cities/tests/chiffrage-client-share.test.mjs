import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { signSession } from '../supabase/functions/chiffrage/server.mjs';
import { publicOfferFromSaved, publicLinkMetadata, customerModuleScope } from '../supabase/functions/chiffrage/client-projection.mjs';
import { offerPriceGroups, publicPriceBreakdown } from '../app/chiffrage/commercial-breakdown.js';
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

test('public projection exposes only customer-safe PV totals and ten commercial price types',()=>{
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
  assert.equal(clean.version,2);
  assert.deepEqual(clean.scope,[]);
  assert.equal(clean.lcm,null);
  assert.equal(clean.hosting,true);
  assert.equal(clean.hosting_provider,null);
  assert.deepEqual(Object.keys(clean).sort(),['amounts','bfs_id','buckets','canton','commune',
    'issued_at','population','products','quote_title','revision','version',
    'scope','lcm','hosting','hosting_provider','breakdown'].sort());
});

test('AZ logo is identified only for a hosting selection that names AZ',()=>{
  const selected=structuredClone(quote);
  selected.snapshot.input.primeLines=[{category:'hosting',label:'Hébergement AZ Informatique'}];
  assert.equal(publicOfferFromSaved(selected).hosting_provider,'az');
  selected.snapshot.input.primeLines[0].label='Hébergement autre partenaire';
  assert.equal(publicOfferFromSaved(selected).hosting_provider,null);
  selected.snapshot.input.primeLines[0]={category:'hosting',item_code:'hosting-reference',label:'Hébergement · référence Tolochenaz'};
  assert.equal(publicOfferFromSaved(selected).hosting_provider,'az');
});

test('incomplete or mismatched quote snapshots are not shareable',()=>{
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,status:'incomplete'}}}),null);
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,summary:{investment:999,annual:25}}}}),null);
  assert.equal(publicOfferFromSaved({...quote,snapshot:{...quote.snapshot,result:{...quote.snapshot.result,
    lines:[{investment_pv:'not-a-number',annual_pv:25}]}}}),null);
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
  assert.match(html,/connect-src 'self' https:\/\/ozdvmllgxduzquiujcbg\.supabase\.co/);
  assert.match(client,/action=clientOffer/);
});

test('finalized SQL investment with null optional annual PV remains shareable',()=>{
  const snapshot=structuredClone(quote.snapshot);
  snapshot.result.lines.push({family:'technique',item_code:'sql',
    investment_pv:0,annual_pv:null,investment_pa:null,annual_pa:null});
  const published=publicOfferFromSaved({...quote,snapshot});
  assert.ok(published);
  assert.equal(published.amounts.annual,25);
  assert.deepEqual(published.buckets.solutions,{investment:70,annual:25});
  assert.ok(!JSON.stringify(published).includes('investment_pa'));
});

test('Safari creates the preview tab before async publishing, with inline feedback and direct copy',()=>{
  const view=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
  const share=view.slice(view.indexOf("if (action === 'shareOffer')"),view.indexOf("if (action === 'copySharedOffer')"));
  assert.match(share,/const preview = openSharePreview\(\);/);
  assert.match(share,/const clipboard = startShareClipboard\(\);/);
  assert.ok(share.indexOf('openSharePreview()') < share.indexOf("await api('publishOffer'"));
  assert.match(share,/sharePanel\(/);
  assert.match(view,/new ClipboardItem/);
  assert.match(view,/\[data-share-result\]/);
  assert.match(view,/Brouillon à finaliser avant partage/);
  assert.match(view,/shareButton\.disabled = !ready/);
});

test('the four distinct accompaniment prices and LCM reconcile exactly without exposing PA',()=>{
  const lines=[
    {family:'innosolv',software:true,investment_pv:20,annual_pv:25},
    {family:'prestations_module',investment_pv:50,annual_pv:0},
    {family:'prestations',item_code:'reprise',investment_pv:20,annual_pv:0},
    {family:'prestations',item_code:'projet',investment_pv:10,annual_pv:0},
    {family:'prestations',item_code:'formation',investment_pv:10,annual_pv:0},
    {family:'prestations',item_code:'demarrage',investment_pv:10,annual_pv:0},
    {family:'technique',investment_pv:5,annual_pv:2},
    {family:'lcm',item_code:'gold',investment_pv:0,annual_pv:8},
    {family:'partenaires',investment_pv:30,annual_pv:0},
    {family:'prime',category:'hosting',investment_pv:10,annual_pv:0}
  ];
  const snapshot=structuredClone(quote.snapshot);
  snapshot.input.lcm={selection:'gold'};
  snapshot.result.lines=lines;
  snapshot.result.summary={investment:165,annual:35};
  const published=publicOfferFromSaved({...quote,snapshot},{items:[]});
  assert.ok(published);
  assert.equal(published.lcm,'Gold');
  assert.deepEqual(Object.fromEntries(published.breakdown.map(x=>[x.key,[x.investment,x.annual]])),{
    licenses:[20,25],implementation:[50,0],migration:[20,0],management:[10,0],
    training:[20,0],database:[5,2],primePartners:[30,0],lcm:[0,8],hosting:[10,0]
  });
  assert.equal(published.breakdown.reduce((sum,x)=>sum+x.investment,0),165);
  assert.equal(published.breakdown.reduce((sum,x)=>sum+x.annual,0),35);
  assert.equal(published.amounts.tco5y,305);
});

test('Abacus exposes only parent module groups, never individual functions',()=>{
  const input={products:['abacus','innosolv','pce'],
    modules:[{vendor:'abacus',product:'ERP',item_code:'10510.205'},
      {vendor:'abacus',product:'ERP',item_code:'10510.208'},
      {vendor:'abacus',product:'ERP',item_code:'10520.222'},
      {vendor:'innosolv',product:'Gemeinde',item_code:'100'}],
    pce:{finances:true,salaires:true}};
  const catalog={items:[
    {vendor:'abacus',product:'ERP',item_code:'10510.1',label_fr:'Comptabilité financière',label_de:'Finanzbuchhaltung'},
    {vendor:'abacus',product:'ERP',item_code:'10510.205',label_fr:'Fonction interne A',label_de:'Intern A'},
    {vendor:'abacus',product:'ERP',item_code:'10510.208',label_fr:'Fonction interne B',label_de:'Intern B'},
    {vendor:'abacus',product:'ERP',item_code:'10520.1',label_fr:'Débiteurs',label_de:'Debitoren'},
    {vendor:'abacus',product:'ERP',item_code:'10520.222',label_fr:'Fonction interne C',label_de:'Intern C'},
    {vendor:'innosolv',product:'Gemeinde',item_code:'100',label_fr:'Habitants',label_de:'Einwohner'}]};
  const result=customerModuleScope(input,catalog);
  const abacus=result.find(x=>x.product==='Abacus');
  assert.deepEqual(abacus.items.map(x=>x.fr),['Comptabilité financière','Débiteurs']);
  assert.deepEqual(result.find(x=>x.product==='innosolvcity').items.map(x=>x.fr),['Habitants']);
  assert.deepEqual(result.find(x=>x.product==='ProConcept').items.map(x=>x.fr),['Finances','Salaires']);
  assert.ok(!JSON.stringify(result).includes('Fonction interne'));
  assert.ok(!JSON.stringify(result).includes('10510'));
  const fallback=customerModuleScope(input,{items:catalog.items.filter(x=>x.item_code!=='10510.1')});
  assert.equal(fallback.find(x=>x.product==='Abacus').items[0].fr,'Autres fonctions Abacus');
});

test('internal quote and customer projection share the same price taxonomy',()=>{
  const view=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
  const client=readFileSync(new URL('../app/client-offer.js',import.meta.url),'utf8');
  assert.match(view,/commercialPriceGroup\(line\)===key/);
  assert.match(client,/offerPriceGroups/);
  assert.match(client,/client-offer-module-group/);
  assert.match(client,/client-offer-price-section/);
  assert.match(client,/\[1,2\]\.includes\(offer.version\)/);
  assert.equal(offerPriceGroups.length,10);
  assert.ok(publicPriceBreakdown([{family:'lcm',annual_pv:8000,investment_pv:0}])
    .some(row=>row.key==='lcm'&&row.annual===8000));
});


test('an opening is counted atomically only after a valid token is accepted', async()=>{
  const originalFetch=globalThis.fetch;
  const token='A'.repeat(43);
  let openings=0;
  globalThis.fetch=async(url,options)=>{
    const dest=String(url);
    assert.match(dest,/\/rest\/v1\/rpc\/record_chiffrage_client_open/);
    assert.equal(options.method,'POST');
    const body=JSON.parse(options.body);
    assert.match(body.p_token_hash,/^[a-f0-9]{64}$/);
    assert.ok(!options.body.includes(token),'do not submit plaintext capability in RPC JSON');
    openings++;
    return new Response(JSON.stringify({version:2,amounts:{investment:110,annual:25},
      breakdown:[],scope:[]}),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const endpoint='https://example.supabase.co/functions/v1/chiffrage?action=clientOffer';
    const invalid=await handler(new Request(endpoint,{
      headers:{Authorization:'Bearer unknown'}}));
    assert.equal(invalid.status,404);
    assert.equal(openings,0);
    for(let i=0;i<2;i++){
      const response=await handler(new Request(endpoint,{
        headers:{Authorization:'Bearer '+token}}));
      assert.equal(response.status,200);
      assert.equal((await response.json()).version,2);
    }
    assert.equal(openings,2);
  }finally{globalThis.fetch=originalFetch;}
});

test('revoked or expired link cannot be counted or read by the public endpoint',async()=>{
  const originalFetch=globalThis.fetch;
  let attempts=0;
  globalThis.fetch=async()=>{attempts++;return new Response('null',{status:200,
    headers:{'Content-Type':'application/json'}});};
  try{
    const response=await handler(new Request(
      'https://example.supabase.co/functions/v1/chiffrage?action=clientOffer',{
      headers:{Authorization:'Bearer '+'Z'.repeat(43)}}));
    assert.equal(response.status,404);
    assert.equal(attempts,1);
  }finally{globalThis.fetch=originalFetch;}
});

test('owner statistics contain only aggregate count/time; customer page never sees them',()=>{
  
  const result=publicLinkMetadata({id:'id',revision:4,created_at:'c',expires_at:'e',
    revoked_at:null,open_count:9,last_opened_at:'2026-10-23T21:00:00Z'});
  assert.equal(result.open_count,9);
  assert.equal(result.last_opened_at,'2026-10-23T21:00:00Z');
  const projection=publicOfferFromSaved(quote,{items:[]});
  assert.ok(!Object.hasOwn(projection,'open_count'));
  assert.ok(!Object.hasOwn(projection,'last_opened_at'));
  assert.doesNotMatch(JSON.stringify(projection),/visitor|fingerprint|tracking_id/i);
});

test('SQL counter has service-only execution and no per-visitor event table',()=>{
  const sql=readFileSync(new URL('../supabase/migrations/20261024140000_client_offer_open_counter.sql',
    import.meta.url),'utf8');
  assert.match(sql,/open_count = open_count \+ 1/);
  assert.match(sql,/revoked_at is null/);
  assert.match(sql,/expires_at > now\(\)/);
  assert.match(sql,/revoke all on function public\.record_chiffrage_client_open\(text\)/);
  assert.match(sql,/grant execute on function public\.record_chiffrage_client_open\(text\) to service_role/);
  assert.doesNotMatch(sql,/create table .*visitor|insert into .*events/i);
});

test('share panels are dismissible and link revocation is a single server action',()=>{
  const view=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
  assert.match(view,/data-action="closeSharePanel"/);
  assert.match(view,/data-action="manageShares" data-id=/);
  assert.match(view,/data-action="revokeSharedOffer"/);
  assert.match(view,/data-action="manageShares" data-refresh="true"/);
  assert.match(view,/linkCount\(row\.open_count\)/);
  const revoke=view.slice(view.indexOf("if (action === 'revokeSharedOffer')"),
    view.indexOf("if (action === 'copyLink')"));
  assert.match(revoke,/await api\('revokeOffer'/);
  assert.doesNotMatch(revoke,/window\.confirm/);
});


test('nighttime customer offer headings retain readable contrast in every skin',()=>{
  const css=readFileSync(new URL('../app/styles/client-offer.css',import.meta.url),'utf8');
  const page=readFileSync(new URL('../offre.html',import.meta.url),'utf8');
  assert.match(css,/html\[data-skin\] \.client-offer \.client-offer-body :is\(h3,h4\)\{color:#f8fbff\}/);
  assert.match(css,/background:linear-gradient\(155deg,#253955/);
  assert.doesNotMatch(css,/!important/);
  assert.match(page,/client-offer\.css\?v=20261027-platinum-r8/);
});
