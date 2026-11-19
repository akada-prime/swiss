import test from 'node:test';
import assert from 'node:assert/strict';
import {pageSlices} from '../app/offer/pdf.js';
test('A4 pages move a crossing row or heading together and cover the full offer without gaps',()=>{
 const slices=pageSlices(2750,[{top:950,bottom:1040},{top:1970,bottom:2070}],1000);
 assert.deepEqual(slices,[{start:0,end:950},{start:950,end:1950},{start:1950,end:2750}]);
 assert.deepEqual(pageSlices(1200,[{top:0,bottom:1200}],1000),[{start:0,end:1000},{start:1000,end:1200}]);
});
