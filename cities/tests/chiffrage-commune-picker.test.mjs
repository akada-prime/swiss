import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingCommunes, bindCommunePicker } from '../app/chiffrage/commune-picker.js';
const rows = [{id:5731,name:'Le Vaud',canton:'VD'},{id:6757,name:'Saignelégier',canton:'JU'}];
function fixture() {
  const handlers={},attrs={};
  const input={value:'',setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(k,v)=>handlers[k]=v};
  const children=rows.map((_,i)=>({id:`commune-option-${i}`,setAttribute(){},scrollIntoView(){}}));
  const list={hidden:true,children,querySelectorAll:()=>children,addEventListener(){}};
  const status={};
  const container={querySelector:s=>s==='input'?input:s==='[role="listbox"]'?list:status,addEventListener:(k,v)=>handlers[k]=v,contains:()=>false};
  bindCommunePicker(container,rows,{option:r=>`${r.name} · OFS ${r.id}`,label:fr=>fr});
  const key=k=>{let prevented=false;handlers.keydown({key:k,preventDefault:()=>prevented=true});return prevented;};
  return {input,list,status,attrs,handlers,key};
}
test('commune matching accepts accents, case and OFS identifiers',()=>{
  assert.deepEqual(matchingCommunes(rows,'SAIGNELEGIER'),[rows[1]]);
  assert.deepEqual(matchingCommunes(rows,'5731'),[rows[0]]);
  assert.deepEqual(matchingCommunes(rows,'inconnue'),[]);
});
test('ArrowUp starts on last result; Enter chooses without submitting',()=>{
  const f=fixture();f.handlers.focus();f.key('ArrowUp');
  assert.equal(f.attrs['aria-activedescendant'],'commune-option-1');
  assert.equal(f.key('Enter'),true);
  assert.equal(f.input.value,'Saignelégier · OFS 6757');
  assert.equal(f.list.hidden,true);
  assert.equal(f.key('Enter'),false);
});
test('Escape closes results and no-results search announces its state',()=>{
  const f=fixture();f.handlers.focus();f.key('ArrowDown');f.key('Escape');
  assert.equal(f.attrs['aria-expanded'],'false');
  assert.equal(f.attrs['aria-activedescendant'],undefined);
  f.input.value='inconnue';f.handlers.input();
  assert.equal(f.list.hidden,true);assert.equal(f.status.textContent,'Aucune commune trouvée');
});
test('a unique result uses a singular accessible message',()=>{
  const f=fixture();f.input.value='5731';f.handlers.input();
  assert.equal(f.status.textContent,'1 commune trouvée');
});
