import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const skins=readFileSync(new URL('../app/styles/skins.css',import.meta.url),'utf8');
const components=readFileSync(new URL('../app/styles/components.css',import.meta.url),'utf8');
const rgb=color=>{if(!color.startsWith('#'))return [...color.matchAll(/[\d.]+/g)].map(x=>Number(x[0]));let h=color.slice(1);if(h.length===3)h=[...h].map(x=>x+x).join('');return h.match(/../g).map(x=>parseInt(x,16));};
const luminance=channels=>channels.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b)=>{const [lo,hi]=[luminance(a),luminance(b)].sort((x,y)=>x-y);return (hi+.05)/(lo+.05);};
function palette(name){const block=skins.split(`html[data-skin="${name}"] {`)[1].split('}')[0];return key=>block.match(new RegExp(`--${key}:([^;]+);`))[1];}

test('action text has AA contrast on the workspace surfaces in each palette',()=>{
 for(const name of ['prime-darkweb','helvetia']){
  const p=palette(name);
  for(const surface of ['quote-surface','quote-nav']){
   const contrast=ratio(rgb(p('skin-accent-text')),rgb(p(surface)));
   assert.ok(contrast>=4.5,`${name}/${surface}: ${contrast}`);
  }
 }
});

test('selected text stays readable on the composited selected background',()=>{
 assert.match(components,/--pc-control-selected-text:var\(--skin-selected-text\)/);
 for(const name of ['prime-darkweb','helvetia']){
  const p=palette(name),base=rgb(p('quote-nav')),tint=rgb(p('skin-accent-soft'));
  const bg=tint.length===4?tint.slice(0,3).map((c,i)=>c*tint[3]+base[i]*(1-tint[3])):tint;
  assert.ok(ratio(rgb(p('skin-selected-text')),bg)>=4.5,name);
 }
});

test('disclosure indicators contrast with both working surfaces',()=>{
 for(const name of ['prime-darkweb','helvetia']){
  const p=palette(name);
  for(const surface of ['quote-surface','quote-nav'])assert.ok(ratio(rgb(p('skin-disclosure')),rgb(p(surface)))>=3,`${name}/${surface}`);
 }
});
