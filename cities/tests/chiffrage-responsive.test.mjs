import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../app/chiffrage/view.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/styles/views/chiffrage.css', import.meta.url), 'utf8');

test('the mobile workspace puts a collapsible financial card above editable fields', () => {
  assert.match(view, /id="chiffrageMobileSummary">\$\{mobileSummary\(\)\}<\/div><div id="chiffrageContext"/);
  assert.match(view, /<details class="chiffrage-mobile-summary"/);
  assert.match(view, /mobilePanel\.open/);
  assert.match(view, /state\.mobileSummaryOpen = expanded\.open/);
  assert.match(view, /refreshFinancialSummary\(\);/);
  assert.match(css, /#chiffrageMobileSummary\{display:none\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?#chiffrageSummary\{display:none\}/);
});

test('detailed calculation rows become labeled two-column cards on narrow screens', () => {
  const detail = view.slice(view.indexOf('function lineDetail() {'), view.indexOf('function renderEditor() {'));
  assert.match(detail, /chiffrage-line-detail/);
  assert.match(detail, /data-label="\$\{t\('chiffrage\.modules'\)\}"/);
  assert.match(detail, /data-label="\$\{t\('chiffrage\.quantity'\)\}"/);
  assert.match(detail, /data-label="\$\{t\('chiffrage\.investment'\)\}"/);
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.chiffrage-line-detail tr\{display:grid/);
  assert.match(css, /content:attr\(data-label\)/);
});


test('shared Prime controls and quote typography do not require cascade overrides', () => {
  const skin = readFileSync(new URL('../app/styles/skins.css', import.meta.url), 'utf8');
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.chiffrage-work-tabs button\[aria-current=page\]\{box-shadow:var\(--quote-tab-shadow\)/);
  assert.match(css, /\.chiffrage-button\.quiet\{background:var\(--skin-control\);border-color:var\(--skin-border-soft\)/);
  assert.match(css, /chiffrage-mobile-summary-figures strong\{[^}]*font-size:clamp\(27px,7\.2vw,33px\)/);
  assert.match(skin, /html\[data-skin="helvetia"\][\s\S]*?--pc-field-bg:#eaf0f5;--pc-field-border:#8193a3/);
  assert.doesNotMatch(view, /class="chiffrage-saved-formula"/);
  assert.match(index, /main\.css\?v=20261027-brand-r2/);
});


test('Chiffrage shares the same large two-line hero as the other Prime Communes views', () => {
  const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const foundation = readFileSync(new URL('../app/styles/foundation.css', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../app/styles/main.css', import.meta.url), 'utf8');
  assert.match(index, /class="chiffrage-intro view-intro"/);
  assert.match(index, /Chiffrer\.<br><span>[\s\S]*?En confiance\./);
  assert.match(foundation, /h1\{margin:0;font-size:clamp\(46px,5vw,78px\)/);
  assert.doesNotMatch(css, /\.chiffrage-view \.chiffrage-intro h1/);
  assert.doesNotMatch(css, /\.chiffrage-view \.chiffrage-intro\{display:flex/);
  assert.doesNotMatch(css, /\.chiffrage-view \.view-intro-copy \.eyebrow\{display:none/);
  assert.match(main, /chiffrage\.css\?v=20261027-brand-r2/);
});
