import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceIdentity,workspaceTabs,bindWorkspaceMenus,focusWorkspacePanel,restoreWorkspaceScroll} from '../app/chiffrage/workspace-ui.js';

test('seller identity escapes editable names, shows the internal save number and inline rename without a second logo',()=>{
  const html=workspaceIdentity({name:'Ballaigues <test>',canton:'VD',bfs:5744,population:"1'196",inhabitants:'habitants',title:'Variante "test"',revision:13,saveNumber:37,identity:'<span>coat</span>',map:'',reference:'Locale',tariffs:'2026',label:fr=>fr});
  assert.match(html,/Ballaigues &lt;test&gt;/);
  assert.match(html,/#37/);assert.doesNotMatch(html,/R13/);
  assert.match(html,/data-field="title" maxlength="180" value="Variante &quot;test&quot;"/);
  assert.match(html,/data-disclosure-key="rename"/);
  assert.doesNotMatch(html,/prime-logo|Votre projet|style=|<script/);
});

test('workspace navigation preserves panel relationships without implying numbered steps',()=>{
  const html=workspaceTabs([['composer','Projet'],['modules','Modules']], 'modules','Travail');
  assert.match(html,/data-editor-tab="modules" aria-current="page" aria-controls="chiffrage-panel-modules"/);
  assert.match(html,/data-editor-tab="composer" aria-current="false"/);
  assert.doesNotMatch(html,/<small>|01|02/);
});

test('Escape closes a workspace menu and returns keyboard focus to its trigger',()=>{
  const listeners={},trigger={focus(){this.focused=true;}},menu={open:true,querySelector:()=>trigger};
  bindWorkspaceMenus({addEventListener:(name,fn)=>listeners[name]=fn,querySelectorAll:()=>[menu]});
  let prevented=false;
  listeners.keydown({key:'Escape',target:{closest:()=>menu},preventDefault(){prevented=true;}});
  assert.equal(menu.open,false);assert.equal(trigger.focused,true);assert.equal(prevented,true);
});

test('selecting workspace content focuses its panel and scrolls directly there',()=>{
  const calls=[],panel={focus:options=>calls.push(['focus',options]),scrollIntoView:options=>calls.push(['scroll',options])};
  focusWorkspacePanel({querySelector:selector=>{assert.equal(selector,'[data-tab-panel="modules"]');return panel;}},'modules');
  assert.deepEqual(calls,[['focus',{preventScroll:true}],['scroll',{block:'start',behavior:'instant'}]]);
  assert.doesNotThrow(()=>focusWorkspacePanel({querySelector:()=>null},'unknown'));
});

test('opening a dossier resets a scrolled list, while editing preserves the working position',()=>{
  const calls=[],viewport={scrollTo:options=>calls.push(options)};
  restoreWorkspaceScroll(viewport,850,{opening:true});
  restoreWorkspaceScroll(viewport,420);
  restoreWorkspaceScroll(viewport,0);
  restoreWorkspaceScroll(viewport,0,{opening:true});
  assert.deepEqual(calls,[{top:0,behavior:'instant'},{top:420,behavior:'instant'},{top:0,behavior:'instant'}]);
});
