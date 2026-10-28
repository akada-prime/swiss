import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { escapeOffer, offerHero, offerBanner, offerFigures, offerScope, offerLcm, offerMap } from '../app/offer/presentation.js';
const label=(fr,de)=>fr;
const money=n=>`${Number(n).toLocaleString('fr-CH')} CHF`;
const asset=p=>`public/${p}`;
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('shared rendering escapes data, preserves supplied totals and emits no inline style',()=>{
 const amounts=Object.freeze({investment:107780,annual:37028,tco5y:255892});
 const hero=offerHero({asset,name:'Ballaigues <script>',bfsId:5744,population:'1 200',inhabitants:'habitants',heading:'Projet'});
 const result=offerBanner(hero,offerFigures(amounts,{label,money}));
 assert.match(result,/Ballaigues &lt;script&gt;/);
 for(const value of Object.values(amounts)) assert.ok(result.includes(escapeOffer(money(value))));
 assert.doesNotMatch(result,/<script|style=|data-action|<input/);
 assert.ok(result.indexOf('</header>')<result.indexOf('chiffrage-offer-summary'));
 const exceptional=offerFigures({investment:0,annual:0,tco5y:123},{label,money});
 assert.match(exceptional,/123 CHF/); // No silent TCO recalculation, including historical snapshots.
});

test('scope renders supplied themes without exposing other properties; LCM remains an alternative',()=>{
 const result=offerScope([{product:'Abacus',items:['Finances','Salaires','RH','eBanking'],margin:999,private:'secret'}],{asset});
 assert.equal((result.match(/<li>/g)||[]).length,4);
 assert.match(result,/abacus-wordmark\.png/);
 assert.doesNotMatch(result,/secret|999/);
 assert.match(offerLcm('Gold',label),/<details[\s\S]*remplace Gold[\s\S]*<\/details>/);
 assert.doesNotMatch(offerLcm('Platinum',label),/<details/);
 assert.equal(offerLcm(null,label),'');
});

test('map tolerates missing geometry and escapes supplied paths',()=>{
 assert.equal(offerMap(null,5744,'Carte'),'');
 assert.equal(offerMap({municipalities:[]},5744,'Carte','Indisponible'),'Indisponible');
 const result=offerMap({meta:{viewBox:[0,0,100,100]},municipalities:[{id:5744,d:'M10,20 L30,40'}],cantons:[]},'5744','Carte');
 assert.match(result,/cx="20" cy="30"/);
});

test('public module dependency graph cannot load editor, calculations or private storage',()=>{
 const visited=new Set();
 function visit(url){
  url.search='';if(visited.has(url.href))return;visited.add(url.href);
  const src=readFileSync(url,'utf8');
  assert.doesNotMatch(src,/sessionStorage|localStorage|calculateQuote|signSession|SERVICE_ROLE_KEY/);
  for(const match of src.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
   assert.ok(match[1].startsWith('.'));visit(new URL(match[1],url));
  }
 }
 visit(new URL('../app/client-offer.js',import.meta.url));
 assert.equal(visited.size,5);
});

test('banner has one CSS owner, one mark rule, and no independently painted summary',()=>{
 const css=read('../app/styles/offer.css');
 assert.equal((css.match(/\.chiffrage-offer-hero::before\s*\{/g)||[]).length,1);
 assert.match(css,/background: var\(--offer-gradient\)/);
 assert.match(css,/url\('\.\.\/\.\.\/public\/prime-one-negative\.png'\)/);
 for(const m of css.matchAll(/\.chiffrage-offer-(?:hero|summary)\s*\{([^}]+)\}/g))assert.doesNotMatch(m[1],/background:/);
 assert.doesNotMatch(read('../app/styles/client-offer.css')+read('../app/styles/views/chiffrage.css'),/\.chiffrage-offer-(?:hero|summary)/);
 assert.doesNotMatch(css,/!important/);
});

// Execute the actual public entry point with a frozen server response, no editor session.
// This is a DOM sink test, not a browser or a live Ballaigues publication check.
test('public entry preserves v1/v2 offers, FR/DE, values and confidentiality',async()=>{
 for(const version of [1,2])for(const lang of ['fr-CH','de-CH']){
  const saved=Object.fromEntries(['document','location','navigator','fetch'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  let html,finish;const rendered=new Promise(resolve=>finish=resolve);
  const root={set innerHTML(value){html=value;finish();}};
  const response={version,commune:'Ballaigues',bfs_id:5744,canton:'VD',population:1200,quote_title:'Contrôle <test>',revision:4,
   amounts:{investment:107780,annual:37028,tco5y:255892},products:['Abacus'],
   buckets:{solutions:{investment:107780,annual:37028}},lcm:'Gold',
   breakdown:[{key:'licenses',investment:107780,annual:37028}],scope:[{product:'Abacus',items:[{fr:'Finances',de:'Finanzen'}]}],
   private:'NEVER_RENDER',annual_pa:999,margin:999};
  const token='A'.repeat(43),calls=[];
  try {
   for(const [k,value] of Object.entries({document:{documentElement:{lang:'fr'},getElementById:()=>root},location:{hash:'#'+token},navigator:{language:lang},fetch:async(url,options)=>{
    calls.push({url,options});return String(url).includes('action=clientOffer')?{ok:true,json:async()=>response}:{ok:false};
   }}))Object.defineProperty(globalThis,k,{value,configurable:true,writable:true});
   await import(`../app/client-offer.js?test=${version}-${lang}`);await rendered;
   assert.match(html,/Ballaigues/);assert.match(html,/Contrôle &lt;test&gt;/);
   for(const value of Object.values(response.amounts)) assert.ok(html.replace(/<[^>]*>/g,'').includes(escapeOffer(money(value))));
   assert.doesNotMatch(html,/NEVER_RENDER|annual_pa|margin|data-action|<input|<button|style=|A{43}/);
   assert.equal(calls.length,2);assert.equal(calls[0].options.headers.Authorization,'Bearer '+token);
   assert.equal(calls[0].options.cache,'no-store');
   assert.match(html,lang==='de-CH'?/Ihr Projekt in Zahlen/:/Votre projet, en chiffres/);
   assert.ok(html.indexOf('chiffrage-offer-reference')<html.indexOf('prime-offer-signature'));
   assert.ok(html.indexOf('prime-offer-signature')<html.indexOf('chiffrage-offer-summary'));
   assert.match(html,/<details class="prime-offer-signature-disclosure">\s*<summary><span class="prime-offer-signature-question">[\s\S]*?<\/summary>/);
   assert.equal((html.match(/class="prime-offer-signature-question"/g)||[]).length,1);
   assert.match(html,lang==='de-CH'?/Primes gesunder Bauernverstand\./:/Le bon sens paysan de Prime\./);
   assert.match(html,lang==='de-CH'?/<strong class="prime-offer-signature-vision">eine Vision, kein Lizenzkatalog\.<\/strong>/:/<strong class="prime-offer-signature-vision">une vision, pas un catalogue de licences\.<\/strong>/);
   if(lang==='fr-CH') {
    const signature=html.slice(html.indexOf('<div class="prime-offer-signature">'),html.indexOf('</header>'));
    const text=signature.replace(/<[^>]*>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
    assert.equal(text,"Le bon sens paysan de Prime. Et si le plus important dans votre prochain ERP n'était pas le logiciel ? Un projet maîtrisé, des spécialistes dédiés aux métiers communaux, des coûts transparents et une responsabilité assumée. Voilà ce que nous mettons derrière nos solutions : une vision, pas un catalogue de licences. Car le plus important dans un devis, c'est parfois ce qui ne sera pas facturé plus tard. Un forfait, ça se juge à la dernière facture.");
   }
   assert.doesNotMatch(html,/prime-offer-signature-note/);
   if(version===2)assert.match(html,lang==='de-CH'?/Finanzen/:/Finances/);
  } finally {for(const [k,d]of Object.entries(saved)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
 }
});

test('Platinum shows annual price and replacement delta, with no invented fallback',()=>{
 const html=offerLcm('Gold',label,{money,prices:{gold:100,platinum:150}});
 assert.match(html,/Platinum · 150 CHF/);
 assert.match(html,/Gold inclus dans votre offre · 100 CHF/);
 assert.match(html,/Support et hotline inclus/);
 assert.match(html,/\+50 CHF/);
 assert.match(html,/sans cumul/);
 assert.doesNotMatch(offerLcm('Gold',label,{money}),/CHF/);
 assert.match(offerLcm('Gold',label,{money,prices:{gold:0,platinum:0}}),/même prix annuel/);
});

test('public client signature remains compact, accessible and translated',()=>{
 const js=read('../app/client-offer.js');
 const css=read('../app/styles/offer.css');
 assert.match(js, /<details class="prime-offer-signature-disclosure">[\s\S]*?<summary>/);
 assert.doesNotMatch(js, /<details class="prime-offer-signature-disclosure" open/);
 assert.match(js, /Le bon sens paysan de Prime\./);
 assert.match(js, /Primes gesunder Bauernverstand\./);
 assert.match(js, /Un forfait, ça se juge à la dernière facture\./);
 assert.match(css, /\.prime-offer-signature-disclosure summary:focus-visible/);
 assert.match(css, /\.prime-offer-signature-disclosure\[open\] summary::after/);
 assert.match(css, /min-height: 44px/);
 assert.doesNotMatch(css, /!important/);
});
