import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { candidateReason, extractHtmlLinks, nextIntervalHours, parseRss, parseSitemap, sourceIsDue } from '../scripts/radar-scan.mjs';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Radar! replaces NEWS visibly and states the sobriety contract', async () => {
  const html = await read('index.html');
  assert.match(html, />Radar!<span class="news-nav-badge">SOBRE/);
  assert.match(html, /Veille sobre du marché communal/);
  assert.match(html, /Détecter mécaniquement\. Comprendre intelligemment\. Calculer le moins possible\./);
  assert.match(html, /0 appel IA lorsqu’aucune nouveauté/);
  assert.match(html, /id="radarCoverageCount"/);
  assert.match(html, /id="radarCandidateCount"/);
  assert.doesNotMatch(html, />NEWS!</);
});

test('source registry starts with one mutualized procurement source and explicit municipal sources', async () => {
  const registry = JSON.parse(await read('public/data/radar-sources-v1.json'));
  assert.equal(registry.meta.targetMunicipalities, 621);
  const simap = registry.sources.find(source => source.id === 'simap-romandie');
  assert.equal(simap.type, 'simap-search');
  assert.equal(simap.scope.targetMunicipalities, 621);
  assert.deepEqual(simap.scope.cantons, ['VD','GE','NE','JU','FR','VS','BE']);
  assert.ok(registry.sources.filter(source => source.municipality?.bfsId).length >= 3);
});

test('HTML, RSS and sitemap discovery are deterministic and deduplicable', () => {
  const links = extractHtmlLinks('<a href="/a.pdf">Crédit informatique</a><a href="/a.pdf">doublon</a>', 'https://example.ch/list');
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://example.ch/a.pdf');
  const rss = parseRss('<rss><channel><item><title>Logiciel communal</title><link>https://example.ch/x</link><guid>x</guid></item></channel></rss>');
  assert.equal(rss.length, 1);
  assert.equal(rss[0].title, 'Logiciel communal');
  const sitemap = parseSitemap('<urlset><url><loc>https://example.ch/new</loc><lastmod>2026-09-21</lastmod></url></urlset>');
  assert.equal(sitemap.length, 1);
  assert.equal(sitemap[0].date, '2026-09-21');
});

test('deterministic prefilter selects relevant candidates without AI', () => {
  assert.match(candidateReason({title:'Crédit pour un nouveau logiciel de gestion'}, ['logiciel']), /logiciel/);
  assert.equal(candidateReason({title:'Fête du village'}, ['logiciel','cyber']), '');
});

test('adaptive cadence slows stable sources and backs off on errors', () => {
  const source = {schedule:{baseHours:24,maxHours:168}};
  assert.equal(nextIntervalHours(source, {intervalHours:24}, 'changed'), 24);
  assert.equal(nextIntervalHours(source, {intervalHours:24}, 'unchanged'), 36);
  assert.equal(nextIntervalHours(source, {intervalHours:72}, 'error'), 144);
  assert.equal(sourceIsDue(source, {nextCheckAt:'2000-01-01T00:00:00.000Z'}, new Date('2026-09-21T00:00:00Z')), true);
});

test('scanner never invokes an AI service itself', async () => {
  const scanner = await read('scripts/radar-scan.mjs');
  assert.doesNotMatch(scanner, /api\.openai|anthropic|gemini|chat\/completions|responses\/v1/i);
  assert.match(scanner, /aiCalls:0/);
  assert.match(scanner, /if-none-match/);
  assert.match(scanner, /if-modified-since/);
  assert.match(scanner, /robots\.txt/);
  assert.match(scanner, /lastItem/);
});

test('initial status refuses to claim coverage before the first successful scan', async () => {
  const status = JSON.parse(await read('public/data/radar-state-v1.json'));
  assert.equal(status.coverage.targetMunicipalities, 621);
  assert.equal(status.coverage.procurementMunicipalities, 0);
  assert.equal(status.coverage.directMunicipalities, 0);
  assert.equal(status.economy.aiCalls, 0);
});
