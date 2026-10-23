import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const shared = read('app/styles/components.css');
const foundation = read('app/styles/foundation.css');
const skin = read('app/styles/skins.css');
const quote = read('app/styles/views/chiffrage.css');
const responsive = read('app/styles/responsive.css');
const html = read('index.html');

test('all seven views share one display title without a chiffrage-specific size limit', () => {
  assert.equal((html.match(/class="[^"]*view-intro"/g) || []).length, 7);
  assert.match(foundation, /h1\{margin:0;font-size:clamp\(46px,5vw,78px\)/);
  assert.doesNotMatch(quote, /\.chiffrage-view \.chiffrage-intro h1/);
  assert.match(html, /Chiffrer\.<br><span>[\s\S]*?En confiance\./);
});

test('shared selected state owns tab and choice colors, not page-specific patches', () => {
  assert.match(shared, /:is\(\.view-tab\.active,\.stats-segment button\.active,[\s\S]*?\.chiffrage-work-tabs button\[aria-current="page"\]\)\{/);
  assert.match(shared, /color:var\(--pc-control-selected-text\);[\s\S]*?background:var\(--pc-control-selected-bg\)/);
  assert.doesNotMatch(foundation, /\.stats-segment button\.active\{/);
  assert.doesNotMatch(foundation, /\.view-tab\.active\{/);
  assert.doesNotMatch(quote, /\.chiffrage-work-tabs button\[aria-current=page\]\{background/);
  assert.match(skin, /\.view-tab:not\(\.active\)/);
  assert.match(skin, /\.stats-segment button:not\(\.active\)/);
});

test('editor and market filters use the same skin-driven editable field surfaces', () => {
  for (const x of ['prime-darkweb','helvetia','light']) assert.match(skin, new RegExp('html\\[data-skin="' + x + '"\\][\\s\\S]*?--pc-field-bg:'));
  assert.match(shared, /:is\(\.stats-toolbar label,\.filters label\)\{background:var\(--pc-field-bg\)\}/);
  assert.match(quote, /\.chiffrage-view input,\.chiffrage-view select\{[^}]*background:var\(--pc-field-bg\)/);
  assert.match(quote, /\.chiffrage-choice-group \.chiffrage-choice,\.chiffrage-toggle\{[^}]*background:var\(--pc-field-bg\)/);
  assert.doesNotMatch(skin, /--pc-field-bg:var\(--skin-control\)/);
});

test('mobile navigation uses three comfortable columns and a full-width seventh view', () => {
  assert.equal((html.match(/class="view-tab(?: |")/g) || []).length, 7);
  assert.match(responsive, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(responsive, /\.view-tab\[data-view="chiffrage"\]\{grid-column:1\/-1\}/);
});

test('design contract does not introduce any new important declaration', () => {
  for (const src of [shared, foundation, quote, skin]) assert.doesNotMatch(src, /!important/);
  assert.equal((responsive.match(/!important/g) || []).length, 1);
});


test('primary actions share one skin gradient across editor and communal drawer', () => {
  for (const skinName of ['prime-darkweb','helvetia','light']) {
    assert.match(skin, new RegExp('html\\[data-skin="' + skinName + '"\\][\\s\\S]*?--pc-primary-action:'));
  }
  assert.match(foundation, /\.save-button\{[^}]*background:var\(--pc-primary-action\)/);
  assert.match(quote, /\.chiffrage-button\.primary\{[^}]*background:var\(--pc-primary-action\)/);
});
