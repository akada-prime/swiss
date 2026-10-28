import test from 'node:test';
import assert from 'node:assert/strict';
import { frenchTypography } from '../app/core/french-typography.js';

test('French double punctuation stays with the preceding word and spacing is idempotent',()=>{
 const cases=['Votre choix : Gold','Envie de découvrir Platinum?','Oui !','Inclus ; annuel'];
 for(const text of cases){const formatted=frenchTypography(text);assert.match(formatted,/\u00a0[:;!?]/);assert.equal(frenchTypography(formatted),formatted);}
 assert.equal(frenchTypography('prise en main : chaque étape'),'prise en main\u00a0: chaque étape');
 assert.equal(frenchTypography('20%'),'20\u00a0%');
 assert.equal(frenchTypography('Année 1 : offre'),'Année 1\u00a0: offre');
 assert.equal(frenchTypography('Bonjour, Alex. Merci.'),'Bonjour, Alex. Merci.');
});
test('French typography preserves machine values, hyperlinks and interpolated placeholders',()=>{
 const text='https://example.ch?a=1 11:48 OFS 5744 107’780 CHF';
 assert.equal(frenchTypography(text),text);
 assert.equal(frenchTypography('{name} : offre'),'{name}\u00a0: offre');
});
