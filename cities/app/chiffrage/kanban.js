import {workspaceEscape as escape} from './workspace-ui.js?v=20261112-coherence-r1';
export const defaultColumns=['Brouillon','Client','Finale'];
export const quoteStage=row=>Number.isInteger(row?.workflow_stage)&&row.workflow_stage>=0&&row.workflow_stage<=2?row.workflow_stage:0;
export const quoteLocked=row=>quoteStage(row)===2;
export const saveNumber=row=>Number.isInteger(row?.save_number)&&row.save_number>=0?row.save_number:0;
export function boardGroups(quotes){
 return [0,1,2].map(stage=>quotes.filter(row=>quoteStage(row)===stage).sort((a,b)=>(a.workflow_order??0)-(b.workflow_order??0)||String(a.created_at??'').localeCompare(String(b.created_at??''))||String(a.id).localeCompare(String(b.id))));
}
export const pencil='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
export function boardHtml(quotes,columns,card,label=fr=>fr){
 return `<div class="chiffrage-kanban" data-kanban aria-label="${label('Suivi des chiffrages','Kalkulationsübersicht')}">${boardGroups(quotes).map((rows,stage)=>`<section class="chiffrage-kanban-column" data-stage="${stage}" aria-labelledby="board-column-${stage}"><header><form data-column-form="${stage}"><button type="button" class="chiffrage-column-title" data-edit-column aria-label="${escape(label('Renommer la colonne','Spalte umbenennen'))}"><h3 id="board-column-${stage}">${escape(columns[stage])}</h3>${pencil}</button><input data-column-title value="${escape(columns[stage])}" maxlength="60" aria-label="${escape(label('Nom de la colonne','Spaltenname'))}" hidden required></form><span class="chiffrage-column-count">${rows.length}</span></header><div class="chiffrage-kanban-cards" data-card-list>${rows.map(row=>card(row,stage)).join('')}<p class="chiffrage-column-empty" ${rows.length?'hidden':''}>${label('Dépose un chiffrage ici','Kalkulation hier ablegen')}</p></div></section>`).join('')}</div>`;
}
export function boardRibbon(stage,title){return stage?`<span class="chiffrage-card-ribbon" data-ribbon-stage="${stage}">${escape(title)}</span>`:'';}
// Pointer-based dragging is limited to the handle, preserving taps and page scrolling.
// A lightweight ghost follows the pointer; the real card is placed before any network wait.
export function bindKanban(root,{onMove,onRename,onRefresh,label=fr=>fr}){
 const board=root.querySelector('[data-kanban]');if(!board)return {destroy(){}};
 const abort=new AbortController(),signal=abort.signal;
 let drag=null,busy=false,alive=true,timer=null;
 const listen=(type,fn)=>board.addEventListener(type,fn,{signal});
 function cleanup(){if(!drag)return;cancelAnimationFrame(drag.frame);drag.ghost.remove();drag.slot.remove();drag.card.classList.remove('is-dragging');board.classList.remove('is-dragging');drag=null;}
 function cancel(){if(!drag)return;const {card,parent,next}=drag;parent.insertBefore(card,next?.isConnected?next:null);cleanup();}
 listen('pointerdown',event=>{
  const handle=event.target.closest('[data-drag-handle]');if(!handle||busy||event.button!==0)return;
  const card=handle.closest('[data-quote-card]'),rect=card.getBoundingClientRect(),ghost=card.cloneNode(true),slot=document.createElement('div');
  ghost.classList.add('chiffrage-drag-ghost');ghost.setAttribute('aria-hidden','true');ghost.style.width=rect.width+'px';ghost.style.height=rect.height+'px';
  slot.className='chiffrage-card-placeholder';slot.style.height=rect.height+'px';card.before(slot);document.body.append(ghost);card.classList.add('is-dragging');board.classList.add('is-dragging');
  drag={card,ghost,slot,parent:card.parentElement,next:card.nextSibling,pointer:event.pointerId,x:event.clientX,y:event.clientY,dx:event.clientX-rect.left,dy:event.clientY-rect.top,frame:0};
  board.setPointerCapture(event.pointerId);event.preventDefault();
  const paint=()=>{
   if(!drag)return;
   const d=drag;d.ghost.style.transform=`translate3d(${d.x-d.dx}px,${d.y-d.dy}px,0) rotate(1deg)`;
   const edge=48,rect=board.getBoundingClientRect();
   if(d.x<rect.left+edge)board.scrollLeft-=10;else if(d.x>rect.right-edge)board.scrollLeft+=10;
   if(d.y<edge)window.scrollBy(0,-10);else if(d.y>window.innerHeight-edge)window.scrollBy(0,10);
   const col=document.elementFromPoint(d.x,d.y)?.closest('[data-stage]');
   if(col&&board.contains(col)){
    const list=col.querySelector('[data-card-list]'),before=[...list.querySelectorAll('[data-quote-card]')].find(row=>row!==d.card&&d.y<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
    list.insertBefore(d.slot,before??list.querySelector('.chiffrage-column-empty'));d.target=col;
   }
   d.frame=requestAnimationFrame(paint);
  };paint();
 });
 listen('pointermove',event=>{if(drag&&event.pointerId===drag.pointer){drag.x=event.clientX;drag.y=event.clientY;}});
 listen('pointercancel',cancel);
 listen('keydown',event=>{if(event.key==='Escape'&&drag){event.preventDefault();cancel();}});
 listen('pointerup',async event=>{
  if(!drag||event.pointerId!==drag.pointer)return;
  const d=drag,col=d.target;
  if(!col){cancel();return;}
  d.slot.replaceWith(d.card);const before=d.card.nextElementSibling?.dataset.quoteCard??null;
  const stage=Number(col.dataset.stage);cleanup();busy=true;
  try{await onMove(d.card.dataset.quoteCard,stage,before);}finally{busy=false;}
 });
 listen('change',async event=>{if(!event.target.matches('[data-move-quote]')||busy)return;busy=true;try{await onMove(event.target.dataset.moveQuote,Number(event.target.value),null);}finally{busy=false;}});
 listen('click',event=>{
  const edit=event.target.closest('[data-edit-column]');if(edit){const input=edit.form.querySelector('input');edit.hidden=true;input.hidden=false;input.focus();input.select();}
  const handle=event.target.closest('[data-drag-handle]');if(handle&&!drag)handle.closest('[data-quote-card]').querySelector('[data-move-quote]')?.focus();
 });
 listen('keydown',event=>{
  if(event.key!=='Escape'||!event.target.matches('[data-column-title]'))return;
  event.preventDefault();event.target.value=event.target.defaultValue;event.target.hidden=true;const button=event.target.form.querySelector('button');button.hidden=false;button.focus();
 });
 listen('submit',async event=>{
  const form=event.target.closest('[data-column-form]');if(!form)return;event.preventDefault();if(busy)return;
  const input=form.querySelector('input'),value=input.value.trim();if(!value||value.length>60){input.reportValidity();return;}
  busy=true;try{await onRename(Number(form.dataset.columnForm),value);}finally{busy=false;}
 });
 board.addEventListener('focusout',event=>{if(event.target.matches('[data-column-title]')&&!event.target.hidden&&event.target.value.trim())event.target.form.requestSubmit();},{signal});
 const poll=async()=>{if(!alive)return;try{if(document.visibilityState==='visible'&&!busy&&!drag&&!board.querySelector('[data-column-title]:focus'))await onRefresh();}catch{/* Offline: retain cards and retry on the next visible interval. */}finally{if(alive)timer=setTimeout(poll,20000);}};
 timer=setTimeout(poll,20000);
 return {get busy(){return busy||Boolean(drag)||Boolean(board.querySelector('[data-column-title]:focus'));},destroy(){alive=false;clearTimeout(timer);cancel();abort.abort();}};
}
