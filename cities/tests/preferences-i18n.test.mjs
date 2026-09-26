import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import fr from '../app/i18n/fr.js';
import de from '../app/i18n/de.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('local preferences validate defaults, restore values and update the document immediately', async () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  globalThis.document = { documentElement: { dataset: {}, lang: 'fr' } };
  const { defaults, getPreference, setPreference, subscribePreferences, applyPreferences } = await import('../app/core/preferences.js');
  assert.deepEqual(defaults, { skin: 'prime-darkweb', language: 'fr' });
  assert.equal(getPreference('skin'), 'prime-darkweb');
  assert.equal(getPreference('language'), 'fr');
  const changes = [];
  const unsubscribe = subscribePreferences((name, value) => changes.push([name, value]));
  setPreference('skin', 'helvetia');
  setPreference('language', 'de');
  assert.equal(values.get('prime-communes-skin'), 'helvetia');
  assert.equal(values.get('prime-communes-language'), 'de');
  assert.equal(document.documentElement.dataset.skin, 'helvetia');
  assert.equal(document.documentElement.lang, 'de');
  assert.deepEqual(changes, [['skin', 'helvetia'], ['language', 'de']]);
  unsubscribe();
  setPreference('skin', 'light');
  setPreference('language', 'fr');
  assert.deepEqual(changes, [['skin', 'helvetia'], ['language', 'de']]);
  values.set('prime-communes-skin', 'helvetia');
  values.set('prime-communes-language', 'de');
  applyPreferences();
  assert.equal(getPreference('skin'), 'helvetia');
  assert.equal(document.documentElement.lang, 'de');
  values.set('prime-communes-skin', 'invalid');
  values.set('prime-communes-language', 'it');
  applyPreferences();
  assert.equal(document.documentElement.dataset.skin, 'prime-darkweb');
  assert.equal(document.documentElement.lang, 'fr');
  assert.throws(() => setPreference('skin', 'invalid'), TypeError);
});

test('the early bootstrap applies skin and html lang before styles and the main module', async () => {
  const html = await read('index.html');
  assert.ok(html.indexOf('document.documentElement.dataset.skin = preference(') < html.indexOf('app/styles/main.css'));
  assert.ok(html.indexOf('document.documentElement.lang = preference(') < html.indexOf('app/styles/main.css'));
  assert.ok(html.indexOf('app/styles/main.css') < html.indexOf('app/main.js'));
  assert.match(html, /app\/styles\/main\.css\?v=20260926-preferences-1/);
  assert.match(html, /app\/main\.js\?v=20260926-preferences-3/);
  const css = await read('app/styles/main.css');
  const modules = await read('app/main.js');
  assert.match(css, /skins\.css/);
  assert.match(css, /settings\.css/);
  assert.match(modules, /core\/runtime\.js\?v=20260926-preferences-2/);
  assert.match(modules, /prime-communes-data-1\.5\.js\?v=20260926-preferences-3/);
  assert.match(html, /id="settingsTrigger"[^>]*aria-haspopup="dialog"/);
  assert.match(html, /id="settingsPanel"[^>]*role="dialog"[^>]*hidden/);
  assert.equal((html.match(/name="skin"/g) || []).length, 3);
  assert.equal((html.match(/name="language"/g) || []).length, 2);
  const settings = await read('app/core/settings.js');
  assert.match(settings, /setPreference\(input.name, input.value\)/);
  assert.match(settings, /if \(event.key === 'Escape'\) close\(\)/);
  assert.match(settings, /event.shiftKey.*focus/);
});

test('settings opens as a dialog, changes both preferences and closes with Escape', async () => {
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const listeners = new Map();
  const node = id => ({ id, hidden:id !== 'settingsTrigger', dataset:{}, setAttribute(name,value){ this[name] = value; },
    addEventListener(name,handler){ listeners.set(`${id}:${name}`,handler); }, focus(){ document.activeElement = this; } });
  const trigger = node('settingsTrigger'), panel = node('settingsPanel'), backdrop = node('settingsBackdrop'), close = node('settingsClose');
  const radios = ['prime-darkweb','helvetia','light'].map(value => ({ name:'skin', value, checked:false, addEventListener(name,handler){ listeners.set(`${value}:${name}`,handler); } }));
  radios.push(...['fr','de'].map(value => ({ name:'language', value, checked:false, addEventListener(name,handler){ listeners.set(`${value}:${name}`,handler); } })));
  panel.querySelectorAll = selector => selector === 'input[type=radio]' ? radios : [close, ...radios];
  globalThis.document = { documentElement:{ dataset:{}, lang:'fr' }, activeElement:trigger,
    body:{ classList:{ add(){}, remove(){} } },
    getElementById: id => ({settingsTrigger:trigger,settingsPanel:panel,settingsBackdrop:backdrop,settingsClose:close})[id],
    addEventListener: (name,handler) => listeners.set(`document:${name}`,handler) };
  await import('../app/core/settings.js');
  assert.equal(radios.find(input => input.value === 'prime-darkweb').checked, true);
  assert.equal(radios.find(input => input.value === 'fr').checked, true);
  listeners.get('settingsTrigger:click')();
  assert.equal(panel.hidden, false);
  assert.equal(trigger['aria-expanded'], 'true');
  const helvetia = radios.find(input => input.value === 'helvetia');
  helvetia.checked = true;
  listeners.get('helvetia:change')();
  const german = radios.find(input => input.value === 'de');
  german.checked = true;
  listeners.get('de:change')();
  assert.equal(document.documentElement.dataset.skin, 'helvetia');
  assert.equal(document.documentElement.lang, 'de');
  listeners.get('document:keydown')({key:'Escape'});
  assert.equal(panel.hidden, true);
  assert.equal(trigger['aria-expanded'], 'false');
  assert.equal(document.activeElement, trigger);
});

test('French and Swiss German catalogues cover every static and runtime UI key', async () => {
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(de).sort());
  const html = await read('index.html');
  const files = [html, ...(await Promise.all([
    'app/core/i18n.js', 'app/core/runtime.js', 'app/prime-communes-1.1-base.js',
    'app/prime-communes-communes-1.2.js', 'app/prime-communes-data-1.5.js',
    'app/prime-communes-maplibre-1.2.js', 'app/prime-communes-news-2.0.js',
    'app/prime-communes-stats-1.5.js', 'app/prime-communes-stories-2.0.js'
  ].map(read)))];
  const keys = new Set([...html.matchAll(/<!--i18n:([\w.]+)-->/g)].map(match => match[1]));
  for (const source of files) for (const match of source.matchAll(/\bt\('([\w.]+)'/g)) keys.add(match[1]);
  for (const key of keys) {
    assert.equal(typeof fr[key], 'string', `French missing ${key}`);
    assert.equal(typeof de[key], 'string', `German missing ${key}`);
    assert.deepEqual([...fr[key].matchAll(/\{(\w+)\}/g)].map(x => x[1]), [...de[key].matchAll(/\{(\w+)\}/g)].map(x => x[1]), `Parameters mismatch in ${key}`);
  }
  assert.ok(keys.size > 400);
  assert.doesNotMatch(Object.values(de).join(' '), /ß/);
});

test('translating the canton label preserves the filter value and refreshes loaded UI', async () => {
  const html = await read('index.html');
  const runtime = await read('app/core/runtime.js');
  const data = await read('app/prime-communes-data-1.5.js');
  assert.match(html, /<select id="canton"><option value="Tous">/);
  assert.match(runtime, /\$\('canton'\)\.innerHTML='<option value="Tous">'/);
  assert.match(runtime, /\$\('canton'\)\.options\[0\]\.textContent=t\('common\.all'\)/);
  assert.match(data, /cantonSelect\.innerHTML = '<option value="Tous">'/);
  assert.match(data, /document\.addEventListener\('prime-language-change'/);
  assert.match(data, /source:t\(source === 'base live' \? 'common\.sourceLive' : 'common\.sourceLocal'\)/);
  assert.match(runtime, /lastReferenceDate.*common\.dataAt/s);
  assert.match(runtime, /\$\('ofsLabel'\)\.textContent=ofsMode\?t\('common\.deliveryActive'\)/);
});
