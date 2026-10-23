import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonRows, mapLocation, verifiedCoat, stableValue } from '../app/chiffrage/presentation.js';

const variant = (modules = [], result = {lines:[]}) => ({
  input: { products:['abacus'], modules, dimensions:{population:4500}, lcm:{selection:'none'},hosting:{included:false} },
  catalog:{items:[{vendor:'abacus',product:'ERP',item_code:'1',label_fr:'Finances'}]},result
});
const module = {vendor:'abacus',product:'ERP',item_code:'1'};

test('comparison exposes added and removed modules symmetrically without mutating snapshots', () => {
  const variants=[variant([module]),variant([]),variant([module])];
  const before=JSON.stringify(variants), rows=comparisonRows(variants);
  assert.deepEqual(rows.find(row=>row.group==='modules').values.map(value=>value.selected),[true,false,true]);
  assert.equal(rows.find(row=>row.group==='modules').different,true);
  assert.equal(JSON.stringify(variants),before);
});

test('equal scopes with different retained prices still show the affected module', () => {
  const price=annual=>({lines:[{family:'abacus',product:'ERP',item_code:'1',investment_pv:0,annual_pv:annual}]});
  const rows=comparisonRows([variant([module],price(100)),variant([module],price(200))]);
  assert.equal(rows.find(row=>row.group==='modules').different,true);
});

test('unknown service days and prices remain unknown, distinct from zero and absence', () => {
  const result=(days,amount)=>({lines:[{family:'prestations',item_code:'formation',label:'Formation',selected_days:days,investment_pv:amount}]});
  const rows=comparisonRows([variant([],result(null,null)),variant([],result(0,0)),variant()]);
  const row=rows.find(row=>row.group==='services');
  assert.deepEqual(row.values,[{days:null,amount:null},{days:0,amount:0},null]);
  assert.equal(row.different,true);
});

test('map accepts numeric or string OFS identifiers and uses the source Switzerland viewport', () => {
  const map={meta:{viewBox:[0,0,100,80]},municipalities:[{id:42,d:'M10,20L20,30Z'}]};
  assert.deepEqual(mapLocation(map,'42'),{selected:map.municipalities[0],x:15,y:25,viewBox:'0 0 100 80'});
  assert.equal(mapLocation(map,43),null);
});

const claim=(value,extras={})=>({rank:'normal',mainsnak:{datavalue:{value}},...extras});
const entity=(id,code,file)=>({id,claims:{P771:[claim(code)],P94:[claim(file)]}});
test('communal arms require an unambiguous matching OFS identity and a current coat-of-arms statement', () => {
  assert.equal(verifiedCoat({Q1:entity('Q1','10','Canton.svg')},20),null);
  assert.deepEqual(verifiedCoat({Q1:entity('Q1','20','Commune.svg')},20),{filename:'Commune.svg',source:'https://www.wikidata.org/wiki/Q1'});
  const former=entity('Q1','20','Old.svg');former.claims.P94[0].qualifiers={P582:[{}]};
  assert.equal(verifiedCoat({Q1:former},20),null);
  assert.equal(verifiedCoat({Q1:entity('Q1','20','A.svg'),Q2:entity('Q2','20','B.svg')},20),null);
});

test('tariff version object ordering does not create a false difference', () => {
  assert.equal(stableValue({innosolv:'v1',abacus:'v2'}),stableValue({abacus:'v2',innosolv:'v1'}));
});
