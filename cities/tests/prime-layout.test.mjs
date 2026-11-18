import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePrimeLayout,moduleGroup,primeModuleOrder} from '../app/chiffrage/module-groups.js';
import {movePrimeModule} from '../app/chiffrage/prime-board.js';
test('common groups take precedence over quote subtitles and moves preserve one membership',()=>{
 const source={groups:[{id:'a',title:'Interfaces',modules:['prime/Options/one','prime/Options/two']},{id:'b',title:'PCE par Prime',modules:[]}]};
 const moved=movePrimeModule(source,'prime/Options/one','b');
 assert.deepEqual(source.groups[0].modules,['prime/Options/one','prime/Options/two']);
 assert.deepEqual(moved.groups.map(g=>g.modules),[['prime/Options/two'],['prime/Options/one']]);
 const catalog={parameters:{prime_layout:validatePrimeLayout(moved)}};
 assert.equal(moduleGroup({module_groups:{'prime/Options/one':'ancien'}},'prime/Options/one',catalog),'PCE par Prime');
 assert.ok(primeModuleOrder(catalog,'prime/Options/two')<primeModuleOrder(catalog,'prime/Options/one'));
 assert.equal(moduleGroup({module_groups:{'prime/Options/other':'ancien'}},'prime/Options/other',catalog),'');
 assert.throws(()=>validatePrimeLayout({groups:[...source.groups,{id:'c',title:'Doublon',modules:['prime/Options/one']}]}));
 assert.deepEqual(movePrimeModule(moved,'prime/Options/one','unclassified').groups[1].modules,[]);
});
