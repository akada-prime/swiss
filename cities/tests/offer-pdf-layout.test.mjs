import test from 'node:test';
import assert from 'node:assert/strict';
import {pageSlices,pageHeight,pageMargin,pageBottomMargin,pageContentHeight} from '../app/offer/pdf.js';
test('A4 pages move a crossing row or heading together and cover the full offer without gaps',()=>{
 const slices=pageSlices(2750,[{top:950,bottom:1040},{top:1970,bottom:2070}],1000);
 assert.deepEqual(slices,[{start:0,end:950},{start:950,end:1950},{start:1950,end:2750}]);
 assert.deepEqual(pageSlices(1200,[{top:0,bottom:1200}],1000),[{start:0,end:1000},{start:1000,end:1200}]);
});

test('A4 content reserves twelve millimetres at the top and eighteen for its two-line footer',()=>{
 assert.equal(pageMargin,960*12/210);assert.equal(pageBottomMargin,960*18/210);assert.equal(pageContentHeight,pageHeight-pageMargin-pageBottomMargin);
 const pages=pageSlices(pageContentHeight*2+100,[]);assert.equal(pages.length,3);
 assert.ok(pages.every(page=>page.end-page.start<=pageContentHeight+.001));
 assert.equal(pages.at(-1).end,pageContentHeight*2+100);
});


test('overlapping software columns cannot create a page containing only the heading or card border',()=>{
 const intervals=[{top:100,bottom:900,soft:true},{top:850,bottom:1250,soft:true},{top:125,bottom:205},{top:970,bottom:992}];
 const pages=pageSlices(2100,intervals,1000);
 assert.equal(pages[0].end,1000);assert.ok(pages.every((p,i)=>i===pages.length-1||p.end-p.start>=250));
});
