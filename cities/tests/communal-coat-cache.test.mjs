import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoatHandler,verifiedImage,lookupCoat} from '../supabase/functions/communal-coat/service.mjs';
import {communeCoat} from '../app/chiffrage/coats.js';
const svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0H10V10Z" fill="red"/></svg>';
const image={filename:'Synthetic.svg',source:'https://www.wikidata.org/wiki/Q123',file_page:'https://commons.wikimedia.org/wiki/File:Synthetic.svg',mime_type:'image/svg+xml',image_base64:verifiedImage(new TextEncoder().encode(svg),'image/svg+xml')};
const request=id=>new Request(`https://example.test/communal-coat?bfs=${id}`);
test('a successful first lookup persists image bytes and a new resolver reuses them without an external request',async()=>{
 const rows=new Map();let lookups=0;
 const options={read:async id=>rows.get(id),write:async row=>rows.set(row.bfs_id,row),known:async()=>true,lookup:async()=>{lookups++;return image;}};
 const first=await createCoatHandler(options)(request(6711));assert.equal(first.status,200);assert.equal(first.headers.get('X-Coat-Cache'),'miss');assert.equal(await first.text(),svg);
 const second=await createCoatHandler(options)(request(6711));assert.equal(second.headers.get('X-Coat-Cache'),'hit');assert.equal(await second.text(),svg);assert.equal(lookups,1);
 assert.match(second.headers.get('Cache-Control'),/immutable/);
});
test('parallel requests share one lookup and temporary source failures are cached, then retried',async()=>{
 let time=0,lookups=0,row;
 const handler=createCoatHandler({now:()=>time,read:async()=>row,write:async value=>row=value,known:async()=>true,lookup:async()=>{lookups++;throw Error('offline');}});
 assert.deepEqual((await Promise.all([handler(request(6711)),handler(request(6711))])).map(r=>r.status),[503,503]);assert.equal(lookups,1);
 await handler(request(6711));assert.equal(lookups,1);time=600001;await handler(request(6711));assert.equal(lookups,2);
});
test('unknown or invalid OFS identifiers never start external lookups',async()=>{
 const handler=createCoatHandler({read:async()=>null,write:async()=>assert.fail(),known:async()=>false,lookup:async()=>assert.fail()});
 assert.equal((await handler(request('1<script>'))).status,400);assert.equal((await handler(request(99999))).status,404);
 assert.equal(communeCoat('../1'),null);assert.match(communeCoat(6702).url,/public\/communes\/6702.svg$/);assert.match(communeCoat(6711).url,/communal-coat\?bfs=6711$/);
});
test('unsafe SVG content is rejected while local fragment paint references remain valid',()=>{
 for(const fragment of ['<script>alert(1)</script>','<foreignObject/>','<a href="https://evil.test"/>','<path onload="alert(1)"/>','<path style="fill:url(https://evil.test/a)"/>'])assert.throws(()=>verifiedImage(new TextEncoder().encode(`<svg>${fragment}</svg>`),'image/svg+xml'));
 assert.ok(verifiedImage(new TextEncoder().encode('<svg><path fill="url(#paint)"/></svg>'),'image/svg+xml'));
});
test('an ambiguous or incorrect municipality claim cannot produce a cached image',async()=>{
 let calls=0;
 const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
 const result=await lookupCoat(6711,async()=>{calls++;return response(calls===1?{query:{search:[{title:'Q123'}]}}:{entities:{Q123:{id:'Q123',claims:{P771:[{mainsnak:{datavalue:{value:'6702'}}}],P94:[{mainsnak:{datavalue:{value:'Wrong.svg'}}}]}}}});});
 assert.equal(result,null);assert.equal(calls,2);
});
