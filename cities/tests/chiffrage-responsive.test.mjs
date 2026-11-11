import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../app/chiffrage/view.js', import.meta.url), 'utf8');
const viewCss = readFileSync(new URL('../app/styles/views/chiffrage.css', import.meta.url), 'utf8');
const workspaceCss = readFileSync(new URL('../app/styles/chiffrage-workspace.css', import.meta.url), 'utf8');
const css = viewCss + workspaceCss;

test('the mobile workspace puts a collapsible financial card above editable fields', () => {
  assert.match(view, /id="chiffrageContext">\$\{workspaceHero\(\)\}<\/div><div id="chiffrageMobileSummary"/);
  assert.match(view, /<details class="chiffrage-mobile-summary"/);
  assert.match(view, /mobilePanel\.open/);
  assert.match(view, /state\.mobileSummaryOpen = expanded\.open/);
  assert.match(view, /refreshFinancialSummary\(\);/);
  assert.match(css, /#chiffrageMobileSummary\s*\{\s*display:none/);
  assert.match(css, /@media\s*\(max-width:900px\)\s*\{[\s\S]*?#chiffrageSummary\s*\{\s*display:none/);
});

test('seller identity is compact and separate from the public commercial hero', () => {
  const hero=view.slice(view.indexOf('function workspaceHero() {'),view.indexOf('function offerSection() {'));
  const offer=view.slice(view.indexOf('function offerSection() {'),view.indexOf('function variantName('));
  const client=readFileSync(new URL('../app/client-offer.js',import.meta.url),'utf8');
  assert.match(hero,/workspaceIdentity\(/);
  assert.doesNotMatch(hero,/offerHero\(|offerFigures\(/);
  assert.doesNotMatch(offer,/chiffrage-offer-summary/);
  assert.match(client,/offerBanner\(hero,offerFigures/);
  assert.match(readFileSync(new URL('../app/styles/offer.css',import.meta.url),'utf8'),/\.chiffrage-offer-summary/);
  assert.doesNotMatch(offer,/Lecture du prix|Votre périmètre/);
  assert.doesNotMatch(client,/Lecture du prix|Votre périmètre/);
});

test('detailed calculation rows become labeled two-column cards on narrow screens', () => {
  const detail = view.slice(view.indexOf('function lineDetail() {'), view.indexOf('function renderEditor('));
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
  assert.match(css, /\.chiffrage-work-tabs button\[aria-current=page\]\s*\{[^}]*box-shadow:none/);
  assert.match(css, /\.chiffrage-button\.quiet\{background:var\(--skin-control\);border-color:var\(--skin-border-soft\)/);
  assert.match(css, /chiffrage-mobile-summary-figures strong\s*\{[^}]*font-size:30px/);
  assert.match(skin, /html\[data-skin="helvetia"\][\s\S]*?--pc-field-bg:#eaf0f5;--pc-field-border:#8193a3/);
  assert.doesNotMatch(view, /class="chiffrage-saved-formula"/);
  assert.match(index, /main\.css\?v=20261111-editor-review-r1/);
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
  assert.match(main, /chiffrage\.css\?v=20261111-editor-review-r1/);
});
