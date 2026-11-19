import test from 'node:test';
import assert from 'node:assert/strict';
import {validOfferDate,swissDate,documentDate,formattedOfferDate,offerFooter} from '../app/offer/document-data.js';
test('document dates validate real calendar days and initialize in Swiss local time',()=>{
 assert.equal(validOfferDate('2028-02-29'),true);assert.equal(validOfferDate('2026-02-29'),false);assert.equal(validOfferDate('19.11.2026'),false);assert.equal(validOfferDate('2026-13-01'),false);
 assert.equal(swissDate('2026-12-31T23:30:00Z'),'2027-01-01');assert.equal(formattedOfferDate('2026-11-19'),'19.11.2026');
});
test('a chosen offer date remains fixed and old publications use their issue date',()=>{
 assert.equal(documentDate({offer_date:'2026-11-15',issued_at:'2026-11-19T10:00:00Z'}),'2026-11-15');
 assert.equal(documentDate({issued_at:'2026-11-18T23:30:00Z'}),'2026-11-19');assert.equal(documentDate({}), '');
});
test('every PDF footer identifies the commune, date, public version and revision separately from legal text',()=>{
 const offer={commune:'Boécourt',canton:'JU',offer_date:'2026-11-19',public_version:'v1.2',revision:9};
 assert.deepEqual(offerFooter(offer),{identity:'Boécourt JU · 19.11.2026 · v1.2 · Révision 9',legal:'© Prime Technologies SA · Proposition confidentielle'});
 assert.match(offerFooter(offer,(_fr,de)=>de).identity,/Version 9/);assert.match(offerFooter({...offer,offer_date:undefined}).identity,/Date à préciser/);
});
