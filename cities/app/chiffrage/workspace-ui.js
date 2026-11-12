// Presentation and focus ownership for the seller workspace. No pricing or transport.
export const workspaceEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function workspaceIdentity({name,canton,bfs,population,inhabitants,title,revision,saveNumber=0,locked=false,identity,map,reference,tariffs,label}) {
  const e=workspaceEscape;
  return `<header class="chiffrage-editor-identity"><div class="chiffrage-editor-map" data-territory>${map}</div>
    <div class="chiffrage-editor-place"><div data-identity>${identity}</div><div><h2>${e(name)} <span>${e(canton)}</span></h2><p>OFS ${e(bfs)} · ${e(population)} ${e(inhabitants)}</p></div><span class="chiffrage-editor-revision">${title?`#${e(saveNumber)}`:label('Nouveau','Neu')}</span></div>
    <div class="chiffrage-editor-reference"><details class="chiffrage-rename" data-disclosure-key="rename"><summary aria-label="${label('Renommer','Umbenennen')} ${e(title)}" ${locked?'aria-disabled="true"':''}><span>${e(title)}</span>${locked?'':'<small aria-hidden="true">✎</small>'}</summary><label>${label('Nom de la variante','Name der Variante')}<input data-field="title" maxlength="180" value="${e(title)}"></label></details>
    <details class="chiffrage-reference-detail" data-disclosure-key="workspace-reference"><summary>${label('Base','Grundlage')} · ${e(reference)}</summary><p>${label('Références tarifaires','Tarifreferenzen')} · ${e(tariffs)}</p></details></div></header>`;
}

export function workspaceTabs(tabs,active,label) {
  return `<nav class="chiffrage-work-tabs" aria-label="${workspaceEscape(label)}">${tabs.map(([key,name])=>`<button type="button" data-editor-tab="${workspaceEscape(key)}" aria-current="${active===key?'page':'false'}" aria-controls="chiffrage-panel-${key}">${workspaceEscape(name)}</button>`).join('')}</nav>`;
}

// Native details provides keyboard activation; Escape and action selection close it.
export function bindWorkspaceMenus(root) {
  root.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const menu=event.target.closest('[data-workspace-menu][open]');
    if(menu){menu.open=false;menu.querySelector('summary').focus();event.preventDefault();}
  });
  root.addEventListener('click',event=>{
    if(event.target.closest('summary'))return;
    if(!event.target.closest('[data-workspace-menu]')||event.target.closest('button,a'))for(const menu of root.querySelectorAll('[data-workspace-menu][open]'))menu.open=false;
  });
}

export function focusWorkspacePanel(root,key) {
  const panel=root.querySelector(`[data-tab-panel="${key}"]`);
  if(!panel)return;
  panel.focus({preventScroll:true});
  panel.scrollIntoView({block:'start',behavior:'instant'});
}

// Opening a dossier starts at its identity; rerenders preserve the ongoing work.
export function restoreWorkspaceScroll(viewport,position,{opening=false}={}) {
  if(opening || position)viewport.scrollTo({top:opening?0:position,behavior:'instant'});
}
