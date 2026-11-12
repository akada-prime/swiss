import test from 'node:test';
import assert from 'node:assert/strict';
import {classifiedModules,availableModuleSection,selectedModuleSection} from '../app/chiffrage/module-classification.js';
import {customerModuleScope} from '../app/chiffrage/module-scope.js';
import {offerScope} from '../app/offer/presentation.js';
const inno=code=>({vendor:'innosolv',product:Number(code)>=500?'Versorger':'Gemeinde',item_code:String(code)});
test('the commercial shortlist includes the three additions and does not hide any selected option',()=>{
 for(const code of [207,138,136])assert.equal(availableModuleSection(inno(code)).key,'proposed');
 assert.equal(availableModuleSection(inno(36)).key,'other');
 assert.equal(selectedModuleSection(inno(36)).key,'chosen');
 assert.equal(selectedModuleSection(inno(502)).key,'meters');
 assert.equal(availableModuleSection(inno(502)).key,'proposed');
});
test('selected groups follow Prime standard then meters then options; each uses its worksheet order',()=>{
 const items=[210,129,502,26,1,138,501,22,100,533].map(inno),before=structuredClone(items);
 const groups=classifiedModules(items);
 assert.deepEqual(groups.map(g=>g.key),['standard','meters','chosen']);
 assert.deepEqual(groups.flatMap(g=>g.items.map(i=>i.item_code)),['1','22','26','100','129','501','502','533','210','138']);
 assert.deepEqual(items,before);
 const options=classifiedModules([10,30,122,124,34,35,33,29,209,25].map(inno),{selected:false});
 assert.deepEqual(options[0].items.map(i=>i.item_code),['30','122','124','34','35','33','29','209','25','10']);
});
test('Abacus visa belongs to creditors; transversal functions form one chapter',()=>{
 const items=['10530.1','10531.1','10540.1','10593.1','10582.1','10572.1','10503.1'].map(code=>({vendor:'abacus',product:'ERP',item_code:code}));
 const groups=classifiedModules(items);
 assert.deepEqual(groups.map(g=>g.fr),['Comptabilité des créanciers','Comptabilité des salaires','Fonctions complémentaires','Programmes obligatoires']);
 assert.equal(groups[0].items.length,2);assert.equal(groups[2].items.length,3);
 const catalog={items:items.map((item,i)=>({...item,label_fr:['Créanciers','Visa interne','Salaires','AbaReport','Archivage','SAV','Tool-Kit'][i]}))};
 const scope=customerModuleScope({products:['abacus'],modules:items},catalog);
 assert.ok(JSON.stringify(scope).includes('Visa interne'));
 assert.equal(scope[0].items.filter(i=>i.fr==='Créanciers').length,1);
 assert.ok(!JSON.stringify(scope).includes('10531'));
});
test('customer grouping preserves selected names, excludes available choices, and renders default-closed native sections',()=>{
 const modules=[inno(129),inno(502),inno(205),inno(1)];
 const catalog={items:modules.map(m=>({...m,label_fr:'Module '+m.item_code}))};
 const scope=customerModuleScope({products:['innosolv'],modules},catalog);
 assert.deepEqual(scope[0].items.map(i=>i.fr),['Module 1','Module 129','Module 502','Module 205']);
 assert.ok(scope[0].items.every(i=>i.section_fr && !('item_code' in i)));
 const html=offerScope(scope.map(g=>({product:g.product,items:g.items.map(i=>({label:i.fr,section:i.section_fr}))})),{asset:x=>x});
 for(const title of ['Modules de base innosolv','Gestion des compteurs','Options choisies'])assert.ok(html.includes(title));
 assert.equal((html.match(/<details class="prime-offer-scope-section">/g)||[]).length,3);
 assert.doesNotMatch(html,/<details[^>]*open|Options à proposer|Autres options/);
 assert.match(html,/data-scope-toggle/);
});
