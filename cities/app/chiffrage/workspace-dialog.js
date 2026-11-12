import { workspaceEscape as escape } from './workspace-ui.js?v=20261112-kanban-r1';
// Native dialog owns keyboard trapping and Escape. Content stays in the editor's event scope.
export function openWorkspaceDialog(root, title, content = '', opener = document.activeElement) {
  root.querySelector('.chiffrage-dialog')?.close();
  root.querySelector('.chiffrage-dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.className='chiffrage-dialog';dialog.setAttribute('aria-labelledby','chiffrageDialogTitle');
  dialog.innerHTML=`<header><h2 id="chiffrageDialogTitle">${escape(title)}</h2><button type="button" data-dialog-close aria-label="Fermer / Schließen">×</button></header><div class="chiffrage-dialog-body">${content}</div>`;
  root.append(dialog);
  dialog.querySelector('[data-dialog-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.remove();if(opener?.isConnected)opener.focus({preventScroll:true});},{once:true});
  dialog.showModal();
  return dialog.querySelector('.chiffrage-dialog-body');
}
