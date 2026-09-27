import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { signSession, verifySession } from '../netlify/functions/chiffrage.mjs';

const previous = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'CHIFFRAGE_ACCESS_CODE', 'CHIFFRAGE_SESSION_SECRET', 'URL']
  .map(key => [key, process.env[key]]));
Object.assign(process.env, { SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key',
  CHIFFRAGE_ACCESS_CODE: 'synthetic-code',
  CHIFFRAGE_SESSION_SECRET: 'synthetic-session-key-with-enough-bytes',
  URL: 'https://prime.example' });

test.after(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value == null) delete process.env[key]; else process.env[key] = value;
  }
});

test('session expires and forged signature is rejected', () => {
  const token = signSession(1000);
  assert.equal(verifySession(token, 1001), true);
  assert.equal(verifySession(token, 1000 + 12 * 60 * 60 * 1000), false);
  assert.equal(verifySession(`${token}bad`, 1001), false);
});

test('catalog and saved quotes cannot be read without a session', async () => {
  for (const action of ['status', 'catalog', 'list', 'quote', 'export']) {
    const response = await handler(new Request(`https://prime.example/cities/api/chiffrage?action=${action}`));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('cross-site write is rejected even with a valid session', async () => {
  const response = await handler(new Request('https://prime.example/cities/api/chiffrage?action=save', {
    method: 'POST', headers: { origin: 'https://evil.example',
      cookie: `prime_chiffrage_session=${signSession()}`,
      'content-type': 'application/json' }, body: '{}' }));
  assert.equal(response.status, 403);
});

test('login cookie is HttpOnly, Secure and SameSite; logout clears it', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => new Response(JSON.stringify(
    options.body.includes('"p_valid":true')), { status: 200,
    headers: { 'content-type': 'application/json' } });
  try {
    const response = await handler(new Request('https://prime.example/cities/api/chiffrage?action=login', {
      method: 'POST', headers: { origin: 'https://prime.example',
        'content-type': 'application/json' }, body: '{"code":"synthetic-code"}' }));
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/);
    const status = await handler(new Request('https://prime.example/cities/api/chiffrage?action=status', {
      headers: { cookie: cookie.split(';')[0] } }));
    assert.equal(status.status, 200);
    const logout = await handler(new Request('https://prime.example/cities/api/chiffrage?action=logout', {
      method: 'POST', headers: { origin: 'https://prime.example', cookie: cookie.split(';')[0] } }));
    assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  } finally { globalThis.fetch = originalFetch; }
});
