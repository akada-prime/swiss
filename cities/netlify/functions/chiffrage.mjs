import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { calculateQuote } from '../../app/chiffrage/calculate.js';
import { exportQuoteXlsx } from './chiffrage-xlsx.mjs';

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }
});
const fail = (message, status) => json({ error: message }, status);
const env = name => process.env[name];
const configured = () => ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'CHIFFRAGE_ACCESS_CODE', 'CHIFFRAGE_SESSION_SECRET'].every(env);
const cookieName = 'prime_chiffrage_session';
const sessionDurationMs = 12 * 60 * 60 * 1000;

export function signSession(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + sessionDurationMs,
    nonce: randomUUID() })).toString('base64url');
  const signature = createHmac('sha256', env('CHIFFRAGE_SESSION_SECRET'))
    .update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifySession(value, now = Date.now()) {
  if (!value || !env('CHIFFRAGE_SESSION_SECRET')) return false;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return false;
  const expected = createHmac('sha256', env('CHIFFRAGE_SESSION_SECRET'))
    .update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); }
  catch { return false; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > now; }
  catch { return false; }
}

function sessionCookie(request) {
  const value = request.headers.get('cookie')?.split(';')
    .map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  return value ? value.slice(cookieName.length + 1) : '';
}

function cookie(value, maxAge) {
  return `${cookieName}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/cities/api/chiffrage; Max-Age=${maxAge}`;
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const expected = env('URL') ? new URL(env('URL')).origin : new URL(request.url).origin;
  return origin === expected;
}

async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new Error('JSON required');
  if (Number(request.headers.get('content-length') ?? 0) > 500_000)
    throw new Error('Payload too large');
  const text = await request.text();
  if (text.length > 500_000) throw new Error('Payload too large');
  return JSON.parse(text);
}

async function db(path, { method = 'GET', payload, query = {}, single = false } = {}) {
  const url = new URL(`/rest/v1/${path}`, env('SUPABASE_URL'));
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, { method, headers: {
    apikey: env('SUPABASE_SERVICE_ROLE_KEY'),
    Authorization: `Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,
    'Content-Type': 'application/json',
    ...(single ? { Accept: 'application/vnd.pgrst.object+json' } : {})
  }, body: payload == null ? undefined : JSON.stringify(payload) });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 409 || detail.includes('Revision conflict')) {
      const error = new Error('Revision conflict'); error.status = 409; throw error;
    }
    throw new Error(`Storage operation failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function ipHash(request) {
  // Netlify supplies this header; hash it before persistence. No plaintext IP
  // or access code is stored in the catalog or quote tables.
  const ip = request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  return createHash('sha256').update(`${env('CHIFFRAGE_SESSION_SECRET')}:${ip}`).digest('hex');
}

function validCode(value) {
  const expected = createHash('sha256').update(String(env('CHIFFRAGE_ACCESS_CODE'))).digest();
  const supplied = createHash('sha256').update(String(value ?? '')).digest();
  return timingSafeEqual(supplied, expected);
}

async function loadCatalog(versions) {
  if (!versions || typeof versions !== 'object' || Array.isArray(versions))
    throw new Error('Catalog versions required');
  const ids = Object.values(versions);
  if (!ids.length || ids.length !== new Set(ids).size ||
    ids.some(id => !/^[0-9a-f-]{36}$/i.test(id)))
    throw new Error('Invalid catalog versions');
  const filter = `in.(${ids.join(',')})`;
  const [items, parameterRows, versionsRows] = await Promise.all([
    db('chiffrage_catalog_items', { query: {
      select: 'catalog_version_id,product,item_code,content', catalog_version_id: filter } }),
    db('chiffrage_parameters', { query: { select: 'catalog_version_id,content',
      catalog_version_id: filter } }),
    db('chiffrage_catalog_versions', { query: { select: 'id,vendor,version,effective_from,active',
      id: filter } })
  ]);
  if (versionsRows.length !== ids.length || parameterRows.length !== 1)
    throw new Error('Incomplete private catalog');
  for (const version of versionsRows) {
    if (versions[version.vendor] !== version.id) throw new Error('Catalog vendor mismatch');
  }
  if (parameterRows[0].content.lcm?.some(entry => entry.status === 'draft_unapproved'))
    throw new Error('Unapproved LCM reference');
  return { items: items.map(row => row.content), parameters: parameterRows[0].content,
    versions: versionsRows };
}

async function savedQuote(id, revision) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid quote id');
  const [quote] = await db('chiffrages', { query: { select: '*', id: `eq.${id}` } });
  if (!quote) return null;
  const rows = await db('chiffrage_revisions', { query: { select: '*',
    chiffrage_id: `eq.${id}`, revision: `eq.${revision ?? quote.current_revision}` } });
  return { ...quote, snapshot: rows[0] ?? null };
}

async function writeQuote(payload) {
  const input = payload.input;
  if (!input || !Number.isInteger(input.bfs_id) || !input.name || !input.canton ||
    !Number.isInteger(input.dimensions?.population)) throw new Error('Invalid commune input');
  const products = input.products ?? [];
  if (!Array.isArray(products) || products.some(product =>
    !['innosolv', 'abacus', 'pce'].includes(product)) ||
    new Set(products).size !== products.length)
    throw new Error('Invalid product selection');
  const catalog = await loadCatalog(payload.catalog_versions);
  const result = calculateQuote(input, catalog);
  const id = payload.id ?? randomUUID();
  const saved = await db('rpc/chiffrage_write', { method: 'POST', payload: {
    p_id: id, p_expected_revision: payload.expected_revision ?? null,
    p_bfs_id: input.bfs_id, p_commune_name: input.name, p_canton: input.canton,
    p_population: input.dimensions.population, p_title: payload.title,
    p_archived: Boolean(payload.archived), p_catalog_versions: payload.catalog_versions,
    p_input: input, p_result: result
  } });
  return { ...saved, result };
}

export default async function handler(request) {
  if (!configured()) return fail('Chiffrage server is not configured', 503);
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'status';
  if (request.method === 'POST' && !sameOrigin(request)) return fail('Forbidden origin', 403);
  try {
    if (action === 'login' && request.method === 'POST') {
      const { code } = await body(request);
      const allowed = await db('rpc/chiffrage_record_login', { method: 'POST',
        payload: { p_ip_hash: ipHash(request), p_valid: validCode(code) } });
      if (!allowed) return fail('Access denied', 401);
      return json({ authenticated: true }, 200,
        { 'Set-Cookie': cookie(signSession(), sessionDurationMs / 1000) });
    }
    if (!verifySession(sessionCookie(request))) return fail('Authentication required', 401);
    if (action === 'logout' && request.method === 'POST')
      return json({ authenticated: false }, 200, { 'Set-Cookie': cookie('', 0) });
    if (action === 'status' && request.method === 'GET')
      return json({ authenticated: true });
    if (action === 'catalog' && request.method === 'GET') {
      const versions = await db('chiffrage_catalog_versions', { query: {
        select: 'id,vendor,version,effective_from,active', order: 'effective_from.desc' } });
      const chosen = Object.fromEntries(versions.filter(row => row.active)
        .map(row => [row.vendor, row.id]));
      const requested = url.searchParams.get('versions');
      const selected = requested ? JSON.parse(requested) : chosen;
      return json({ versions, active: chosen,
        catalog: Object.keys(selected).length ? await loadCatalog(selected) : null });
    }
    if (action === 'list' && request.method === 'GET')
      return json(await db('chiffrages', { query: { select: '*',
        ...(url.searchParams.get('archived') === 'all' ? {} : { archived: 'eq.false' }),
        order: 'updated_at.desc', limit: '100' } }));
    if (action === 'quote' && request.method === 'GET') {
      const quote = await savedQuote(url.searchParams.get('id') ?? '',
        url.searchParams.get('revision'));
      return quote ? json(quote) : fail('Quote not found', 404);
    }
    if (action === 'revisions' && request.method === 'GET') {
      const id = url.searchParams.get('id') ?? '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return fail('Invalid quote id', 400);
      return json(await db('chiffrage_revisions', { query: {
        select: 'revision,created_at,catalog_versions', chiffrage_id: `eq.${id}`,
        order: 'revision.desc' } }));
    }
    if (action === 'save' && request.method === 'POST')
      return json(await writeQuote(await body(request)));
    if (action === 'export' && request.method === 'GET') {
      const quote = await savedQuote(url.searchParams.get('id') ?? '');
      if (!quote?.snapshot) return fail('Quote not found', 404);
      const bytes = exportQuoteXlsx(quote);
      return new Response(bytes, { headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="chiffrage-${quote.bfs_id}.xlsx"`,
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
      } });
    }
    return fail('Unknown operation', 404);
  } catch (error) {
    return fail(error.status === 409 ? 'Revision conflict' : 'Operation failed',
      error.status ?? (error.message.startsWith('Storage operation') ? 503 : 400));
  }
}

export const config = { path: '/cities/api/chiffrage' };
