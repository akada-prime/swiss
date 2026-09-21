import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dataPath = name => resolve(root, 'public', 'data', name);
const nowIso = () => new Date().toISOString();
const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms));
const sha256 = value => createHash('sha256').update(String(value)).digest('hex');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}
async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}
function decodeEntities(value) {
  return String(value || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
function stripTags(value) {
  return decodeEntities(String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}
export function extractHtmlLinks(html, baseUrl) {
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      const url = new URL(decodeEntities(match[1]), baseUrl).href;
      if (!/^https?:/i.test(url) || seen.has(url)) continue;
      seen.add(url);
      const date = dateNearAnchor(html, match.index, re.lastIndex);
      out.push({ id: sha256(url), url, title: stripTags(match[2]) || url, date: date ? date.toISOString().slice(0, 10) : '' });
    } catch {}
  }
  return out;
}
export function parseRss(xml, baseUrl = '') {
  const blocks = [...String(xml).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(match => match[0]);
  return blocks.map(block => {
    const field = name => {
      const match = block.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'));
      return match ? stripTags(match[1]) : '';
    };
    const attrLink = block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || '';
    const rawLink = attrLink || field('link');
    let url = rawLink;
    try { url = new URL(rawLink, baseUrl).href; } catch {}
    const title = field('title');
    const guid = field('guid') || field('id') || url || title;
    return { id: sha256(guid), url, title, date: field('pubDate') || field('updated') || field('published') };
  }).filter(item => item.url || item.title);
}
export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<url\b[\s\S]*?<\/url>/gi)].map(match => {
    const block = match[0];
    const loc = decodeEntities(block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)?.[1] || '').trim();
    const lastmod = stripTags(block.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i)?.[1] || '');
    return loc ? { id: sha256(loc), url: loc, title: loc, date: lastmod } : null;
  }).filter(Boolean);
}
export function candidateReason(item, keywords = []) {
  const haystack = normalize([item.title, item.url, item.text].filter(Boolean).join(' '));
  const hit = keywords.find(keyword => haystack.includes(normalize(keyword)));
  return hit ? 'mot-clé déterministe : ' + hit : '';
}
const frenchMonths = {
  janvier:0, fevrier:1, mars:2, avril:3, mai:4, juin:5,
  juillet:6, aout:7, septembre:8, octobre:9, novembre:10, decembre:11
};
export function parseDocumentDate(value) {
  const text = normalize(value);
  let match = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  match = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/);
  if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  match = text.match(/\b(\d{1,2})(?:er)?\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(20\d{2})\b/);
  if (match) return new Date(Date.UTC(Number(match[3]), frenchMonths[match[2]], Number(match[1])));
  return null;
}
export function isWithinRecentWindow(value, days, at = new Date()) {
  const date = value instanceof Date ? value : parseDocumentDate(value);
  if (!date || Number.isNaN(date.getTime())) return false;
  const end = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), 23, 59, 59, 999);
  const start = end - Math.max(1, Number(days) || 1) * 86400_000;
  return date.getTime() >= start && date.getTime() <= end;
}
function dateNearAnchor(html, start, end) {
  const after = stripTags(html.slice(end, Math.min(html.length, end + 260)));
  const before = stripTags(html.slice(Math.max(0, start - 260), start));
  return parseDocumentDate(after) || parseDocumentDate(before);
}
export function nextIntervalHours(source, previous = {}, outcome = 'unchanged') {
  const base = Number(source.schedule?.baseHours || 48);
  const max = Number(source.schedule?.maxHours || 168);
  const current = Number(previous.intervalHours || base);
  if (outcome === 'changed') return base;
  if (outcome === 'error') return Math.min(max, Math.max(base * 2, current * 2));
  return Math.min(max, Math.max(base, Math.round(current * 1.5)));
}
export function sourceIsDue(source, previous, at = new Date()) {
  if (!previous?.nextCheckAt) return true;
  return new Date(previous.nextCheckAt).getTime() <= at.getTime();
}
function flattenStrings(value, depth = 0, out = []) {
  if (depth > 4 || value == null) return out;
  if (typeof value === 'string' || typeof value === 'number') out.push(String(value));
  else if (Array.isArray(value)) value.forEach(item => flattenStrings(item, depth + 1, out));
  else if (typeof value === 'object') Object.values(value).forEach(item => flattenStrings(item, depth + 1, out));
  return out;
}
function bestValue(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') {
      const strings = flattenStrings(value);
      if (strings.length) return strings[0];
    }
  }
  return '';
}

const stats = { requests: 0, notModified: 0, unchanged: 0, downloaded: 0 };
const lastDomainRequest = new Map();
const robotsCache = new Map();

async function fetchWithRetry(url, options = {}, config = {}) {
  const retries = Number(config.retries ?? 2);
  const timeoutMs = Number(config.timeoutMs ?? 12000);
  const minDelayMs = Number(config.minDelayMs ?? 400);
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const origin = new URL(url).origin;
    const wait = Math.max(0, minDelayMs - (Date.now() - (lastDomainRequest.get(origin) || 0)));
    if (wait) await sleep(wait);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      stats.requests += 1;
      lastDomainRequest.set(origin, Date.now());
      const response = await fetch(url, {...options, signal: controller.signal, headers:{'user-agent':'PrimeCommunesRadar/1.0 (+https://github.com/akada-prime/swiss)', ...(options.headers || {})}});
      clearTimeout(timer);
      if (response.status === 304) stats.notModified += 1;
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) { await sleep(750 * Math.pow(2, attempt)); continue; }
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) { await sleep(750 * Math.pow(2, attempt)); continue; }
    }
  }
  throw lastError || new Error('fetch failed: ' + url);
}
function robotsAllows(text, pathname) {
  const lines = String(text).split(/\r?\n/).map(line => line.replace(/#.*/, '').trim()).filter(Boolean);
  let applies = false;
  const disallow = [];
  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(':');
    const key = normalize(rawKey);
    const value = rawValue.join(':').trim();
    if (key === 'user-agent') applies = value === '*' || normalize(value) === 'primecommunesradar';
    else if (applies && key === 'disallow' && value) disallow.push(value);
  }
  return !disallow.some(rule => pathname.startsWith(rule));
}
async function allowedByRobots(url, config) {
  const parsed = new URL(url);
  if (robotsCache.has(parsed.origin)) return robotsAllows(robotsCache.get(parsed.origin), parsed.pathname);
  try {
    const response = await fetchWithRetry(parsed.origin + '/robots.txt', {}, {...config, retries:0, timeoutMs:5000});
    if (!response.ok) { robotsCache.set(parsed.origin, ''); return true; }
    const text = await response.text();
    robotsCache.set(parsed.origin, text);
    return robotsAllows(text, parsed.pathname);
  } catch {
    robotsCache.set(parsed.origin, '');
    return true;
  }
}
function conditionalHeaders(previous = {}) {
  const headers = {};
  if (previous.etag) headers['if-none-match'] = previous.etag;
  if (previous.lastModified) headers['if-modified-since'] = previous.lastModified;
  return headers;
}
function scheduleState(source, previous, outcome, patch = {}) {
  const intervalHours = nextIntervalHours(source, previous, outcome);
  const nextCheckAt = new Date(Date.now() + intervalHours * 3600_000).toISOString();
  return {...previous, ...patch, intervalHours, nextCheckAt};
}
function candidateFrom(source, item, reason, options = {}) {
  return {
    id: sha256(source.id + '|' + item.id),
    sourceId: source.id,
    sourceLabel: source.label,
    municipality: source.municipality?.name || '',
    bfsId: source.municipality?.bfsId || null,
    scopeLabel: source.scope?.kind === 'procurement' ? 'Marchés publics romands' : '',
    title: item.title || item.url,
    url: item.url || source.url,
    detectedAt: nowIso(),
    publicationDate: item.date || null,
    bootstrapDays: options.bootstrapDays || null,
    reason: options.bootstrapDays ? 'bootstrap D-' + options.bootstrapDays + ' · ' + reason : reason,
    status: 'pending'
  };
}
async function scanListSource(source, previous, defaults, options = {}) {
  if (source.respectRobots !== false && !(await allowedByRobots(source.url, defaults))) throw new Error('robots_disallowed');
  const bootstrapDays = Number(options.bootstrapDays || 0);
  const response = await fetchWithRetry(source.url, {headers:bootstrapDays ? {} : conditionalHeaders(previous)}, defaults);
  if (response.status === 304 && !bootstrapDays) {
    stats.unchanged += 1;
    return { outcome:'unchanged', state:scheduleState(source, previous, 'unchanged', {status:'healthy', lastCheckAt:nowIso(), error:null}), candidates:[], changes:0, newDocuments:0 };
  }
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const body = await response.text();
  stats.downloaded += 1;
  const fingerprint = sha256(body.replace(/\s+/g, ' '));
  if (previous.fingerprint && previous.fingerprint === fingerprint && !bootstrapDays) {
    stats.unchanged += 1;
    return { outcome:'unchanged', state:scheduleState(source, previous, 'unchanged', {status:'healthy', lastCheckAt:nowIso(), lastSuccessAt:nowIso(), etag:response.headers.get('etag') || previous.etag || null, lastModified:response.headers.get('last-modified') || previous.lastModified || null, fingerprint, error:null}), candidates:[], changes:0, newDocuments:0 };
  }
  let items = [];
  if (source.type === 'rss') items = parseRss(body, source.url);
  else if (source.type === 'sitemap') items = parseSitemap(body);
  else items = extractHtmlLinks(body, source.url);
  const seen = new Set(previous.seenIds || []);
  const baseline = !previous.fingerprint && !previous.lastSuccessAt;
  const bootstrapItems = bootstrapDays ? items.filter(item => isWithinRecentWindow(item.date, bootstrapDays)) : [];
  const newItems = bootstrapDays ? bootstrapItems : (baseline ? [] : items.filter(item => !seen.has(item.id)));
  const candidates = newItems
    .map(item => ({item, reason:candidateReason(item, source.keywords || defaults.keywords || [])}))
    .filter(entry => entry.reason)
    .map(entry => candidateFrom(source, entry.item, entry.reason, {bootstrapDays}));
  const nextSeen = [...new Set([...(previous.seenIds || []), ...items.map(item => item.id)])].slice(-1500);
  return {
    outcome: baseline ? 'baseline' : 'changed',
    state: scheduleState(source, previous, 'changed', {
      status:'healthy', lastCheckAt:nowIso(), lastSuccessAt:nowIso(), etag:response.headers.get('etag') || null,
      lastModified:response.headers.get('last-modified') || null, fingerprint, seenIds:nextSeen, itemCount:items.length, error:null, baselined:true
    }),
    candidates,
    changes: baseline ? 0 : 1,
    newDocuments: newItems.length
  };
}
function extractSimapProjects(body) {
  if (Array.isArray(body)) return body;
  for (const key of ['projects','items','content','results','entries']) if (Array.isArray(body?.[key])) return body[key];
  return [];
}
async function scanSimap(source, previous, defaults, options = {}) {
  const bootstrapDays = Number(options.bootstrapDays || 0);
  const since = bootstrapDays
    ? new Date(Date.now() - bootstrapDays * 86400_000)
    : (previous.lastSuccessAt ? new Date(new Date(previous.lastSuccessAt).getTime() - 48 * 3600_000) : new Date(Date.now() - 7 * 86400_000));
  const base = new URL(source.url);
  base.searchParams.set('lang', 'fr');
  base.searchParams.set('newestPublicationFrom', since.toISOString().slice(0,10));
  for (const canton of source.scope?.cantons || []) base.searchParams.append('orderAddressCantons', canton);
  let cookie = '';
  let lastItem = '';
  let pages = 0;
  const projects = [];
  do {
    const pageUrl = new URL(base.href);
    if (lastItem) pageUrl.searchParams.set('lastItem', lastItem);
    const response = await fetchWithRetry(pageUrl.href, {headers:cookie ? {cookie} : {}}, defaults);
    if (!response.ok) throw new Error('SIMAP HTTP ' + response.status);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie && !cookie) cookie = setCookie.split(';')[0];
    const body = await response.json();
    stats.downloaded += 1;
    projects.push(...extractSimapProjects(body));
    lastItem = body?.lastItem || body?.pagination?.lastItem || body?.next?.lastItem || '';
    pages += 1;
  } while (lastItem && pages < 10);

  const items = projects.map(project => {
    const id = bestValue(project, ['projectId','id','uuid','publicationId']) || sha256(JSON.stringify(project));
    const title = bestValue(project, ['projectTitle','title','name','description']) || 'Projet simap ' + id;
    const text = flattenStrings(project).join(' ');
    const date = bestValue(project, ['newestPublicationDate','publicationDate','publishedAt','publicationFrom','publicationDateTime','date']);
    return {id:sha256('simap|' + id), title, text, date, url:'https://www.simap.ch/fr/?search=' + encodeURIComponent(id)};
  });
  const seen = new Set(previous.seenIds || []);
  const baseline = !previous.lastSuccessAt;
  // SIMAP already applies newestPublicationFrom server-side during a bootstrap,
  // so all returned entries are inside the requested historical window.
  const newItems = bootstrapDays ? items : (baseline ? [] : items.filter(item => !seen.has(item.id)));
  const candidates = newItems
    .map(item => ({item, reason:candidateReason(item, source.keywords || defaults.keywords || [])}))
    .filter(entry => entry.reason)
    .map(entry => candidateFrom(source, entry.item, entry.reason, {bootstrapDays}));
  const nextSeen = [...new Set([...(previous.seenIds || []), ...items.map(item => item.id)])].slice(-5000);
  if (!newItems.length) stats.unchanged += 1;
  return {
    outcome: baseline ? 'baseline' : (newItems.length ? 'changed' : 'unchanged'),
    state:scheduleState(source, previous, newItems.length ? 'changed' : 'unchanged', {status:'healthy', lastCheckAt:nowIso(), lastSuccessAt:nowIso(), seenIds:nextSeen, itemCount:items.length, error:null, baselined:true}),
    candidates,
    changes: baseline ? 0 : (newItems.length ? 1 : 0),
    newDocuments:newItems.length
  };
}
async function scanSource(source, previous, defaults, options = {}) {
  if (!options.bootstrapDays && !sourceIsDue(source, previous)) return {skipped:true, state:previous, candidates:[], changes:0, newDocuments:0};
  try {
    return source.type === 'simap-search'
      ? await scanSimap(source, previous, defaults, options)
      : await scanListSource(source, previous, defaults, options);
  } catch (error) {
    return {
      outcome:'error',
      state:scheduleState(source, previous, 'error', {status:'error', lastCheckAt:nowIso(), error:String(error?.message || error)}),
      candidates:[], changes:0, newDocuments:0
    };
  }
}
function unique(values) { return [...new Set(values.filter(value => value != null))]; }
function healthy(state) { return state?.status === 'healthy' && Boolean(state.lastSuccessAt); }

export async function runRadarScan(options = {}) {
  const bootstrapDays = Math.max(0, Number(options.bootstrapDays || 0));
  const registry = await readJson(dataPath('radar-sources-v1.json'), {meta:{targetMunicipalities:621}, defaults:{}, sources:[]});
  const previousState = await readJson(dataPath('radar-state-v1.json'), {sourceState:{}});
  const queue = await readJson(dataPath('radar-candidates-v1.json'), {items:[]});
  const radar = await readJson(dataPath('news-radar-v1.json'), {signals:[]});
  const analysis = await readJson(dataPath('news-analysis-v1.json'), {items:[]});
  const sourceState = {...(previousState.sourceState || {})};
  const newCandidates = [];
  let changes = 0;
  let newDocuments = 0;
  let checkedSources = 0;

  for (const source of registry.sources || []) {
    const result = await scanSource(source, sourceState[source.id] || {}, registry.defaults || {}, {bootstrapDays});
    sourceState[source.id] = result.state;
    if (!result.skipped) checkedSources += 1;
    newCandidates.push(...result.candidates);
    changes += result.changes || 0;
    newDocuments += result.newDocuments || 0;
  }

  // If every source is still inside its adaptive interval, this is a true no-op:
  // preserve the last measured pass instead of replacing useful metrics with zeros.
  if (checkedSources === 0) return previousState;

  const queueMap = new Map((queue.items || []).map(item => [item.id, item]));
  for (const item of newCandidates) if (!queueMap.has(item.id)) queueMap.set(item.id, item);
  const items = [...queueMap.values()].slice(-200);
  const pendingCandidates = items.filter(item => (item.status || 'pending') === 'pending').length;

  const directSources = (registry.sources || []).filter(source => source.municipality?.bfsId);
  const directConfigured = unique(directSources.map(source => source.municipality.bfsId)).length;
  const directHealthy = unique(directSources.filter(source => healthy(sourceState[source.id])).map(source => source.municipality.bfsId)).length;
  const procurementSource = (registry.sources || []).find(source => source.scope?.kind === 'procurement');
  const target = Number(registry.meta?.targetMunicipalities || 621);
  const procurementMunicipalities = procurementSource && healthy(sourceState[procurementSource.id]) ? Number(procurementSource.scope?.targetMunicipalities || target) : 0;
  const states = (registry.sources || []).map(source => sourceState[source.id] || {});
  const active = states.filter(healthy).length;
  const errors = states.filter(state => state.status === 'error').length;
  const pending = states.filter(state => !state.lastCheckAt).length;

  const nextState = {
    meta:{
      version:'radar-state-v1',
      generatedAt:nowIso(),
      mode:bootstrapDays ? 'bootstrap-' + bootstrapDays + 'd' : 'deterministic-watch',
      bootstrapDays:bootstrapDays || null,
      notice:bootstrapDays
        ? 'Bootstrap historique ponctuel D-' + bootstrapDays + '. Les candidats restent soumis à la même qualification avant publication.'
        : 'Mesures issues du dernier passage mécanique. Une erreur de source n’est jamais comptée comme un silence.'
    },
    coverage:{targetMunicipalities:target, directConfigured, directMunicipalities:directHealthy, procurementMunicipalities},
    sources:{configured:(registry.sources || []).length, active, error:errors, pending, unchanged:stats.unchanged},
    detection:{changes, newDocuments, pendingCandidates, bootstrapDays:bootstrapDays || null, bootstrapCandidates:newCandidates.length},
    analysis:{analyzed:(analysis.items || []).length, published:(radar.signals || []).length},
    economy:{requests:stats.requests, notModified:stats.notModified, unchanged:stats.unchanged, downloaded:stats.downloaded, aiCalls:0},
    sourceState
  };
  await writeJson(dataPath('radar-state-v1.json'), nextState);
  await writeJson(dataPath('radar-candidates-v1.json'), {meta:{version:'radar-candidates-v1', generatedAt:nowIso(), notice:"La file ne contient que des nouveautés détectées mécaniquement. L'IA n'est jamais lancée automatiquement."}, items});
  return nextState;
}

function cliBootstrapDays(argv = process.argv.slice(2)) {
  const inline = argv.find(arg => arg.startsWith('--bootstrap-days='));
  if (inline) return Math.max(0, Number(inline.split('=')[1]) || 0);
  const index = argv.indexOf('--bootstrap-days');
  return index >= 0 ? Math.max(0, Number(argv[index + 1]) || 0) : 0;
}
const directRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (directRun) {
  runRadarScan({bootstrapDays:cliBootstrapDays()}).then(state => {
    console.log(JSON.stringify({coverage:state.coverage, sources:state.sources, detection:state.detection, economy:state.economy}, null, 2));
  }).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
