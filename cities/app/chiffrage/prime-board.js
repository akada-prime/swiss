import {extraOptionCandidates} from './offer-options.js?v=20261119-dossier-date-r2';
import {validatePrimeLayout} from './module-groups.js?v=20261118-prime-shared-r3';
import {bindKanban} from './kanban.js';
import {workspaceEscape as e} from './workspace-ui.js';

export function movePrimeModule(layout,key,target,before=null){
 const next=structuredClone(layout);
 for(const group of next.groups)group.modules=group.modules.filter(id=>id!==key);
 const group=next.groups.find(row=>row.id===target);
 if(group){const index=group.modules.indexOf(before);group.modules.splice(index<0?group.modules.length:index,0,key);}
 return next;
}
export function primeBoard(root,data,{label:l,onSave,onBack,onAdd}){
 const modules=extraOptionCandidates({products:['innosolv','abacus','pce'],pce:{finances:true,salaires:true}},data.catalog,{includeSelected:true}).filter(row=>row.software==='prime');
 let layout=validatePrimeLayout(data.catalog.parameters.prime_layout??{groups:[]}),controller,dragGroup=null,dirty=false;
 let revision=data.catalog.parameters.prime_layout?.revision??'';
 const draw=()=>{
  controller?.destroy();
  const assigned=new Set(layout.groups.flatMap(g=>g.modules));
  const groups=[...layout.groups,{id:'unclassified',title:l('Non classés','Nicht zugeordnet'),modules:modules.filter(row=>!assigned.has(row.key)).map(row=>row.key)}];
  root.innerHTML=`<section class="chiffrage-section"><h2>${l('Catalogue Prime · classement commun','Prime-Katalog · gemeinsame Gliederung')}</h2><p>${l('Ce classement sert à tous les chiffrages. Déplace les groupes et les modules ; les prix ne changent pas.','Diese Gliederung gilt für alle Kalkulationen. Gruppen und Module verschieben; die Preise bleiben unverändert.')}</p><div class="chiffrage-actions"><button class="chiffrage-button" data-prime-op="new" ${layout.groups.length>=40?'disabled':''}>${l('Ajouter un groupe','Gruppe hinzufügen')}</button><button class="chiffrage-button" data-prime-op="module">${l('Ajouter un module au catalogue','Modul zum Katalog hinzufügen')}</button><button class="chiffrage-button primary" data-prime-op="save">${l('Enregistrer le classement commun','Gemeinsame Gliederung speichern')}</button><button class="chiffrage-button" data-prime-op="back">${l('Revenir','Zurück')}</button></div><p role="status" data-prime-status>${dirty?l('Modifications non enregistrées','Nicht gespeicherte Änderungen'):''}</p><div class="chiffrage-kanban prime-catalog-board" data-kanban>${groups.map((group,index)=>`<section class="chiffrage-kanban-column" data-stage="${index}"><header draggable="${group.id!=='unclassified'}" data-prime-group="${e(group.id)}">${group.id==='unclassified'?`<h3>${e(group.title)}</h3>`:`<label><span class="chiffrage-visually-hidden">${l('Nom du groupe','Gruppenname')}</span><input maxlength="100" data-prime-title="${e(group.id)}" value="${e(group.title)}"></label><button class="chiffrage-button quiet" data-prime-op="left" data-group="${e(group.id)}" aria-label="${l('Avancer le groupe','Gruppe vorziehen')}">←</button><button class="chiffrage-button quiet" data-prime-op="right" data-group="${e(group.id)}" aria-label="${l('Reculer le groupe','Gruppe nach hinten verschieben')}">→</button><button class="chiffrage-button quiet" data-prime-op="remove" data-group="${e(group.id)}" aria-label="${l('Supprimer le groupe','Gruppe entfernen')}">×</button>`}</header><div class="chiffrage-kanban-cards" data-card-list>${group.modules.map(key=>modules.find(row=>row.key===key)).filter(Boolean).map(row=>`<article class="prime-catalog-module" data-quote-card="${e(row.key)}"><strong>${e(l(row.label_fr,row.label_de))}</strong><div><button data-drag-handle aria-label="${l('Déplacer le module','Modul verschieben')}">⠿</button><select data-move-quote="${e(row.key)}" aria-label="${l('Groupe du module','Modulgruppe')}">${groups.map((g,i)=>`<option value="${i}" ${i===index?'selected':''}>${e(g.title)}</option>`).join('')}</select></div></article>`).join('')}</div></section>`).join('')}</div></section>`;
  controller=bindKanban(root,{label:l,onMove:async(key,index,before)=>{layout=movePrimeModule(layout,key,groups[index].id,before);dirty=true;draw();},onRename:async()=>{},onRefresh:async()=>{}});
  root.oninput=event=>{const group=layout.groups.find(g=>g.id===event.target.dataset.primeTitle);if(group){group.title=event.target.value;dirty=true;root.querySelector('[data-prime-status]').textContent=l('Modifications non enregistrées','Nicht gespeicherte Änderungen');const index=layout.groups.indexOf(group);root.querySelectorAll(`[data-move-quote] option[value="${index}"]`).forEach(option=>option.textContent=group.title);}};
  root.ondragstart=event=>{dragGroup=event.target.closest('[data-prime-group]')?.dataset.primeGroup??null;};
  root.ondragover=event=>{if(dragGroup)event.preventDefault();};
  root.ondrop=event=>{if(!dragGroup)return;event.preventDefault();const target=event.target.closest('[data-prime-group]')?.dataset.primeGroup;const from=layout.groups.findIndex(g=>g.id===dragGroup),to=layout.groups.findIndex(g=>g.id===target);if(from>=0&&to>=0){const [group]=layout.groups.splice(from,1);layout.groups.splice(to,0,group);dirty=true;draw();}dragGroup=null;};
  root.onclick=async event=>{
   const button=event.target.closest('[data-prime-op]');if(!button)return;
   const action=button.dataset.primeOp,index=layout.groups.findIndex(g=>g.id===button.dataset.group);
   if(action==='new'){dirty=true;layout.groups.push({id:'group-'+crypto.randomUUID(),title:l('Nouveau groupe','Neue Gruppe'),modules:[]});draw();}
   if(action==='remove'&&index>=0){layout.groups.splice(index,1);dirty=true;draw();}
   if(action==='left'||action==='right'){const target=index+(action==='left'?-1:1);if(index>=0&&target>=0&&target<layout.groups.length){const [g]=layout.groups.splice(index,1);layout.groups.splice(target,0,g);dirty=true;draw();}}
   if(action==='back'){controller?.destroy();root.onclick=root.oninput=root.ondrop=root.ondragover=root.ondragstart=null;onBack();}
   if(action==='module'){controller?.destroy();root.onclick=root.oninput=root.ondrop=root.ondragover=root.ondragstart=null;onAdd();}
   if(action==='save'){button.disabled=true;try{const updated=await onSave({layout:validatePrimeLayout(layout),expected_revision:revision,expected_version:data.version});data=updated;revision=updated.catalog.parameters.prime_layout.revision;dirty=false;root.querySelector('[data-prime-status]').textContent=l('Classement commun enregistré.','Gemeinsame Gliederung gespeichert.');}catch(error){root.querySelector('[data-prime-status]').textContent=error.status===409?l('Modifié dans une autre session. Reviens puis recharge le classement.','In einer anderen Sitzung geändert. Zurück und neu laden.'):error.message;}finally{button.disabled=false;}}
  };
 };
 draw();window.scrollTo({top:0,behavior:'instant'});return{refresh:draw,destroy(){controller?.destroy();root.onclick=root.oninput=root.ondrop=root.ondragover=root.ondragstart=null;}};
}
