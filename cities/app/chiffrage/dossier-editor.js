import {escapeOffer as e} from '../offer/presentation.js';
const initials=name=>name.trim().split(/\s+/).slice(0,2).map(x=>x[0]??'').join('');
const fields=[['name','Nom et prénom','Name'],['position','Fonction','Funktion'],['email','E-mail','E-Mail'],['phone','Téléphone','Telefon']];
export function dossierEditor(draft,team,{label,locked=false}){
  const chosen=team.find(person=>person.id===draft.prime_contact_id),client=draft.client_contact??{};
  const inputs=(value,kind)=>fields.map(([key,fr,de])=>`<label>${label(fr,de)}<input data-dossier-${kind}="${key}" type="${key==='email'?'email':key==='phone'?'tel':'text'}" maxlength="${key==='email'?254:key==='phone'?60:160}" ${key==='name'&&kind==='profile'?'required':''} value="${e(value[key]??'')}" ${locked&&kind==='client'?'disabled':''}></label>`).join('');
  return `<section class="chiffrage-section chiffrage-dossier" data-dossier>
    <div><h2>${label('Notes internes','Interne Notizen')}</h2><p class="chiffrage-helper">${label('Privées · jamais affichées au client ni dans les PDF.','Privat · nie im Kundenangebot oder in den PDFs angezeigt.')}</p></div>
    <label class="chiffrage-dossier-notes"><span>${label('Notes de vos échanges','Gesprächsnotizen')}</span><textarea data-dossier-notes rows="6" maxlength="20000" placeholder="${e(label('Besoins, exclusions, décisions, points à reprendre…','Bedürfnisse, Ausschlüsse, Entscheide, offene Punkte…'))}" ${locked?'disabled':''}>${e(draft.internal_notes??'')}</textarea></label>
    <h2>${label('Interlocuteurs','Ansprechpersonen')}</h2>
    <div class="chiffrage-dossier-contacts"><section class="chiffrage-contact-editor"><h3>${label('Pour Prime','Für Prime')}</h3>
      <div class="chiffrage-team-pool" aria-label="${e(label('Équipe Prime','Prime-Team'))}">${team.map(person=>`<button type="button" class="chiffrage-person" draggable="${!locked}" data-prime-person="${e(person.id)}" aria-pressed="${person.id===draft.prime_contact_id}" ${locked?'disabled':''}><span class="chiffrage-person-avatar" aria-hidden="true">${e(initials(person.name))}</span><span>${e(person.name.split(' ')[0])}</span></button>`).join('')}</div><button type="button" class="chiffrage-button quiet" data-prime-add>${label('Ajouter un contact Prime','Prime-Kontakt hinzufügen')}</button>
      <div class="chiffrage-contact-drop" data-prime-drop role="region" aria-label="${e(label('Interlocuteur Prime du dossier','Prime-Ansprechperson dieses Dossiers'))}">${chosen?`<strong>${e(chosen.name)}</strong>${[chosen.position,chosen.email,chosen.phone].filter(Boolean).map(text=>`<span>${e(text)}</span>`).join('')}<div class="chiffrage-contact-actions"><button type="button" class="chiffrage-button quiet" data-prime-edit="${e(chosen.id)}">${label('Modifier ses coordonnées','Kontaktdaten bearbeiten')}</button><button type="button" class="chiffrage-button quiet" data-prime-clear ${locked?'disabled':''}>${label('Retirer du dossier','Aus Dossier entfernen')}</button></div>`:`<p>${label('Glissez une personne ici, ou cliquez sur son prénom.','Person hierher ziehen oder auf ihren Vornamen klicken.')}</p>`}</div>
      <p class="chiffrage-helper">${label('Coordonnées Prime partagées : une modification est répercutée dans tous ses chiffrages, y compris les liens client.','Gemeinsame Prime-Kontaktdaten: Änderungen gelten für alle zugehörigen Kalkulationen, auch für Kundenlinks.')}</p>
      <div class="chiffrage-team-profile" data-prime-profile hidden>${inputs(chosen??{},'profile')}<button type="button" class="chiffrage-button" data-prime-save>${label('Enregistrer les coordonnées partagées','Gemeinsame Kontaktdaten speichern')}</button><p data-prime-status role="status"></p></div>
    </section><section class="chiffrage-contact-editor"><h3>${label('Côté client','Beim Kunden')}</h3><div class="chiffrage-client-fields">${inputs(client,'client')}</div></section></div>
  </section>`;
}
export function bindDossier(root,{getDraft,getTeam,setTeam,label,dirty,saveProfile,createProfile,isLocked=()=>false}){
  const repaint=()=>{const node=root.querySelector('[data-dossier]');if(node)node.outerHTML=dossierEditor(getDraft(),getTeam(),{label,locked:isLocked()});};
  const assign=id=>{if(isLocked()||!getTeam().some(person=>person.id===id))return;getDraft().prime_contact_id=id;dirty();repaint();};
  root.addEventListener('input',event=>{
    if(!getDraft()||isLocked())return;
    if(event.target.hasAttribute('data-dossier-notes')){getDraft().internal_notes=event.target.value;dirty();}
    if(event.target.dataset.dossierClient){getDraft().client_contact??={};getDraft().client_contact[event.target.dataset.dossierClient]=event.target.value;dirty();}
  });
  root.addEventListener('dragstart',event=>{const person=event.target.closest('[data-prime-person]');if(!person||isLocked())return;event.dataTransfer.setData('application/x-prime-contact',person.dataset.primePerson);event.dataTransfer.effectAllowed='copy';});
  root.addEventListener('dragover',event=>{const zone=event.target.closest('[data-prime-drop]');if(zone&&!isLocked()&&[...event.dataTransfer.types].includes('application/x-prime-contact')){event.preventDefault();event.dataTransfer.dropEffect='copy';zone.classList.add('is-drag-over');}});
  root.addEventListener('dragleave',event=>event.target.closest('[data-prime-drop]')?.classList.remove('is-drag-over'));
  root.addEventListener('drop',event=>{const zone=event.target.closest('[data-prime-drop]');if(!zone||isLocked())return;event.preventDefault();zone.classList.remove('is-drag-over');assign(event.dataTransfer.getData('application/x-prime-contact'));});
  root.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||!getDraft())return;
    if(button.dataset.primePerson){assign(button.dataset.primePerson);return;}
    if(button.hasAttribute('data-prime-clear')&&!isLocked()){getDraft().prime_contact_id=null;dirty();repaint();return;}
    if(button.hasAttribute('data-prime-add')){const panel=root.querySelector('[data-prime-profile]');panel.hidden=false;panel.dataset.mode='new';panel.querySelectorAll('input').forEach(input=>input.value='');panel.querySelector('[data-prime-save]').textContent=label('Créer le contact partagé','Gemeinsamen Kontakt erstellen');panel.querySelector('[data-dossier-profile=name]').focus();return;}
    if(button.dataset.primeEdit){const panel=root.querySelector('[data-prime-profile]'),person=getTeam().find(row=>row.id===button.dataset.primeEdit);if(!person)return;panel.hidden=false;panel.dataset.mode='edit';panel.querySelectorAll('[data-dossier-profile]').forEach(input=>input.value=person[input.dataset.dossierProfile]??'');panel.querySelector('[data-prime-save]').textContent=label('Enregistrer les coordonnées partagées','Gemeinsame Kontaktdaten speichern');panel.querySelector('[data-prime-status]').textContent='';root.querySelector('[data-dossier-profile=name]')?.focus();return;}
    if(!button.hasAttribute('data-prime-save'))return;
    const scope=button.closest('[data-prime-profile]'),status=scope.querySelector('[role=status]'),creating=scope.dataset.mode==='new';
    const selected=getTeam().find(person=>person.id===getDraft().prime_contact_id);if(!creating&&!selected)return;
    if([...scope.querySelectorAll('input')].some(input=>!input.reportValidity()))return;
    const value=Object.fromEntries([...scope.querySelectorAll('[data-dossier-profile]')].map(input=>[input.dataset.dossierProfile,input.value]));
    button.disabled=true;
    try{const updated=creating?await createProfile(value):await saveProfile({...value,id:selected.id,expected_updated_at:selected.updated_at});setTeam(creating?[...getTeam(),updated]:getTeam().map(person=>person.id===updated.id?updated:person));if(creating&&!isLocked()){getDraft().prime_contact_id=updated.id;dirty();}repaint();}
    catch(error){status.textContent=error.status===409?label('Cette fiche a changé. Rechargez avant de réessayer.','Dieser Kontakt wurde geändert. Bitte neu laden.'):label('Enregistrement impossible. Réessayez.','Speichern fehlgeschlagen. Bitte erneut versuchen.');button.disabled=false;}
  });
}
