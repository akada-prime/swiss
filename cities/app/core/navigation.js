// View routing remains owned by the application; this controls only the mobile disclosure.
const toggle=document.querySelector('.mobile-navigation-toggle');
const nav=document.getElementById('primaryNavigation');
if(toggle&&nav){
 const close=()=>{toggle.setAttribute('aria-expanded','false');nav.dataset.open='false';nav.closest('.topbar')?.classList.remove('navigation-open');};
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));nav.dataset.open=String(open);nav.closest('.topbar')?.classList.toggle('navigation-open',open);});
 nav.addEventListener('click',event=>{if(event.target.closest('[data-view]'))close();});
 document.addEventListener('click',event=>{if(!event.target.closest('.topbar'))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){close();toggle.focus();}});
}
