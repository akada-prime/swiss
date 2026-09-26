// Local preferences are the only source today. A future profile adapter can
// resolve remote values before the local fallback without changing callers.
export const defaults = Object.freeze({ skin: 'prime-darkweb', language: 'fr' });
export const choices = Object.freeze({
  skin: Object.freeze(['prime-darkweb', 'helvetia', 'light']),
  language: Object.freeze(['fr', 'de'])
});
const keys = Object.freeze({ skin: 'prime-communes-skin', language: 'prime-communes-language' });
const listeners = new Set();

export function getPreference(name) {
  if (!Object.hasOwn(defaults, name)) throw new TypeError(`Unknown preference: ${name}`);
  try {
    const value = localStorage.getItem(keys[name]);
    return choices[name].includes(value) ? value : defaults[name];
  } catch {
    return defaults[name];
  }
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
  document.documentElement.dataset.skin = getPreference('skin');
  document.documentElement.lang = getPreference('language');
}

export function subscribePreferences(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

applyPreferences();
