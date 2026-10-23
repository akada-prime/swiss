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
