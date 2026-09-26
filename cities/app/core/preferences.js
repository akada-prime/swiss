// Local preferences are the only source today. A future profile adapter can
// resolve remote values before the local fallback without changing callers.
export const defaults = Object.freeze({ skin: 'prime-darkweb', language: 'fr' });
export const choices = Object.freeze({
  skin: Object.freeze(['auto', 'prime-darkweb', 'helvetia']),
  language: Object.freeze(['fr', 'de'])
});
const keys = Object.freeze({ skin: 'prime-communes-skin', language: 'prime-communes-language' });
const listeners = new Set();
const darkScheme = typeof globalThis.matchMedia === 'function'
  ? globalThis.matchMedia('(prefers-color-scheme: dark)')
  : null;

function normalizePreference(name, value) {
  // The former light skin maps to Helvetia so existing browsers stay light.
  if (name === 'skin' && value === 'light') return 'helvetia';
  return choices[name].includes(value) ? value : defaults[name];
}

export function getPreference(name) {
  if (!Object.hasOwn(defaults, name)) throw new TypeError(`Unknown preference: ${name}`);
  try {
    return normalizePreference(name, localStorage.getItem(keys[name]));
  } catch {
    return defaults[name];
  }
}

export function resolveSkin(value = getPreference('skin')) {
  if (value !== 'auto') return value;
  if (!darkScheme) return defaults.skin;
  return darkScheme.matches ? 'prime-darkweb' : 'helvetia';
}

export function setPreference(name, value) {
  if (!Object.hasOwn(defaults, name) || !choices[name].includes(value)) {
    throw new TypeError(`Invalid preference: ${name}`);
  }
  try { localStorage.setItem(keys[name], value); } catch { /* Private browsing. */ }
  applyPreferences();
  listeners.forEach(listener => listener(name, value));
}

export function applyPreferences() {
  document.documentElement.dataset.skin = resolveSkin();
  document.documentElement.lang = getPreference('language');
}

export function subscribePreferences(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const syncAutomaticSkin = () => {
  if (getPreference('skin') === 'auto') applyPreferences();
};
if (typeof darkScheme?.addEventListener === 'function') darkScheme.addEventListener('change', syncAutomaticSkin);
else if (typeof darkScheme?.addListener === 'function') darkScheme.addListener(syncAutomaticSkin);

applyPreferences();
