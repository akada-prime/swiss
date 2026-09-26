import { getPreference, setPreference } from './preferences.js';

const trigger = document.getElementById('settingsTrigger');
const panel = document.getElementById('settingsPanel');
const backdrop = document.getElementById('settingsBackdrop');
const closeButton = document.getElementById('settingsClose');
let previousFocus = null;

function close() {
  panel.hidden = backdrop.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('settings-open');
  previousFocus?.focus();
}
function open() {
  previousFocus = document.activeElement;
  panel.hidden = backdrop.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  document.body.classList.add('settings-open');
  closeButton.focus();
}

panel.querySelectorAll('input[type=radio]').forEach(input => {
  input.checked = getPreference(input.name) === input.value;
  input.addEventListener('change', () => {
    if (input.checked) setPreference(input.name, input.value);
  });
});
trigger.addEventListener('click', () => panel.hidden ? open() : close());
closeButton.addEventListener('click', close);
backdrop.addEventListener('click', close);
document.addEventListener('keydown', event => {
  if (panel.hidden) return;
  if (event.key === 'Escape') { event.stopPropagation(); close(); }
  if (event.key !== 'Tab') return;
  const focusable = [...panel.querySelectorAll('button, input')];
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
