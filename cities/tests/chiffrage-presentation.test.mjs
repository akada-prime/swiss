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

import { offerThemes, savedQuoteFigures } from '../app/chiffrage/presentation.js';

test('offer themes cover every selected supplier without clipping, including zero-priced modules', () => {
  const items = [
    {vendor:'innosolv',product:'Gemeinde',item_code:'1',label_fr:'Système de base'},
    ...Array.from({length:119},(_,n)=>({vendor:'abacus',product:'ERP',item_code:`10540.${n+1}`,label_fr:n?'Option de paie':'Comptabilité des salaires'})),
    {vendor:'abacus',product:'ERP',item_code:'10510.1',label_fr:'Comptabilité financière'},
    {vendor:'abacus',product:'ERP',item_code:'10510.2',label_fr:'eBanking'},
    {vendor:'abacus',product:'ERP',item_code:'10540.120',label_fr:'Ressources humaines'}
  ];
  const input={products:['innosolv','abacus','pce'],modules:items.map(({vendor,product,item_code})=>({vendor,product,item_code})),pce:{finances:true,salaires:false}};
  const before=JSON.stringify(input);
  const groups=offerThemes(input,{items});
  assert.deepEqual(groups.map(group=>group.name),['innosolvcity','Abacus','ProConcept']);
  assert.deepEqual(groups[1].themes,['Salaires','Finances','eBanking','RH']);
  assert.deepEqual(groups[2].themes,['Finances']);
  assert.equal(JSON.stringify(input),before);
});

test('unselected capabilities are never advertised and localized parent domains summarize options', () => {
  const items=[{vendor:'abacus',product:'ERP',item_code:'10.1',label_fr:'Gestion des projets',label_de:'Projektverwaltung'},
    {vendor:'abacus',product:'ERP',item_code:'10.2',label_fr:'Option longue et détaillée'}];
  const groups=offerThemes({modules:[items[1]],products:['abacus']},{items},'de');
  assert.deepEqual(groups[0].themes,['Projektverwaltung']);
  assert.deepEqual(offerThemes({products:['pce'],pce:{finances:false,salaires:false}},{items}),[]);
});

test('saved financial cards use retained amounts and the four-annuity convention', () => {
  const snapshot={result:{status:'incomplete',summary:{investment:127840,annual:36944}}};
  assert.deepEqual(savedQuoteFigures(snapshot),{investment:127840,annual:36944,tco5y:275616,incomplete:true});
  assert.equal(savedQuoteFigures(null),null);
  assert.equal(savedQuoteFigures({result:{summary:{investment:0,annual:null}}}),null);
  assert.equal(savedQuoteFigures({result:{summary:{investment:0,annual:Infinity}}}),null);
  assert.equal(savedQuoteFigures({result:{summary:{investment:0,annual:0}}}).tco5y,0);
});

test('retained modules from a disabled product stay outside the offer scope', () => {
  const items=[{vendor:'abacus',product:'ERP',item_code:'1.1',label_fr:'Salaires'}];
  assert.deepEqual(offerThemes({modules:items,products:[]},{items}),[]);
});

import { referenceLabel, financialCategory } from '../app/chiffrage/presentation.js';

test('reference display localizes generated labels while preserving the saved source', () => {
  const reference={id:'tolo',label:'Référence Tolochenaz'};
  const before=JSON.stringify(reference);
  assert.equal(referenceLabel(reference,null,'de'),'Referenz Tolochenaz');
  assert.equal(referenceLabel(reference,null,'fr'),'Référence Tolochenaz');
  assert.equal(referenceLabel({label:'Offre personnalisée Alex'},null,'de'),'Offre personnalisée Alex');
  assert.equal(referenceLabel(reference,{parameters:{configuration_profiles:[{id:'tolo',label_de:'Vorlage Tolochenaz'}]}},'de'),'Vorlage Tolochenaz');
  assert.equal(JSON.stringify(reference),before);
});

test('hosting stays separate and Prime plus partners share one financial bucket without losing amounts', () => {
  const lines=[
    {family:'innosolv',software:true,investment_pv:0,annual_pv:100},
    {family:'prestations_module',investment_pv:200,annual_pv:0},
    {family:'technique',investment_pv:300,annual_pv:30},
    {family:'prime',category:'hosting',investment_pv:400,annual_pv:40},
    {family:'partenaires',category:'hosting',investment_pv:500,annual_pv:50},
    {family:'prime',investment_pv:600,annual_pv:60},
    {family:'partenaires',investment_pv:700,annual_pv:70},
    {family:'lcm',investment_pv:0,annual_pv:80}
  ];
  const grouped=Map.groupBy(lines,financialCategory);
  assert.equal(grouped.has(null),false);
  assert.deepEqual(grouped.get('hosting'),[lines[3],lines[4]]);
  assert.deepEqual(grouped.get('primePartners'),[lines[5],lines[6]]);
  for(const key of ['investment_pv','annual_pv'])assert.equal([...grouped.values()].flat().reduce((s,l)=>s+l[key],0),lines.reduce((s,l)=>s+l[key],0));
});
