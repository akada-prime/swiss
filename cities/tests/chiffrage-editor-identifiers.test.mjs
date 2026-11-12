import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Linter} from 'eslint';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../app/chiffrage/view.js',import.meta.url),'utf8');
test('quote editor render and handlers have no unresolved identifiers',()=>{
 const globals=Object.fromEntries(['window','document','fetch','location','history','URL','URLSearchParams','IntersectionObserver','Event','CustomEvent','AbortSignal','FormData','sessionStorage','localStorage','navigator','setTimeout','clearTimeout','structuredClone','console','requestAnimationFrame','ResizeObserver','crypto','confirm','Blob'].map(name=>[name,'readonly']));
 const errors=new Linter().verify(source,[{languageOptions:{ecmaVersion:'latest',sourceType:'module',globals},rules:{'no-undef':'error'}}]);
 assert.deepEqual(errors.map(({line,message})=>({line,message})),[]);
});
test('the eagerly rendered quote detail resolves French and German catalogue labels',()=>{
 const render=source.slice(source.indexOf('function lineLabel(line)'),source.indexOf('function renderEditor('));
 const state={internal:false,draft:{},catalog:{items:[{vendor:'innosolv',product:'Gemeinde',item_code:'100',label_fr:'Habitants',label_de:'Einwohner'}]}};
 const context={state,document:{documentElement:{lang:'fr'}},moduleId:item=>`${item.vendor}/${item.product}/${item.item_code}`,moduleOrder:()=>0,localLabel:fr=>fr,t:key=>key,number:String,money:String,escape:String,serviceTypes:[],calculateQuote:()=>({lines:[{family:'innosolv',product:'Gemeinde',item_code:'100',label:'Raw source label',investment_pv:100,annual_pv:20}]})};
 const html=()=>runInNewContext(render+'\nlineDetail()',context);
 assert.match(html(),/Habitants/);
 context.document.documentElement.lang='de';assert.match(html(),/Einwohner/);
});
