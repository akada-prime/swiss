import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { signSession, verifySession } from '../supabase/functions/chiffrage/server.mjs';

const previous = globalThis.Deno;
globalThis.Deno = { env: { get: name => ({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key'
})[name] } };
test.after(() => { globalThis.Deno = previous; });

test('session expires and forged signature is rejected', () => {
  const token = signSession(1000);
  assert.equal(verifySession(token, 1001), true);
  assert.equal(verifySession(token, 1000 + 12 * 60 * 60 * 1000), false);
  assert.equal(verifySession(`${token}bad`, 1001), false);
});

test('catalog and saved quotes cannot be read without a session', async () => {
  for (const action of ['status', 'catalog', 'list', 'quote', 'export']) {
    const response = await handler(new Request(`https://example.supabase.co/functions/v1/chiffrage?action=${action}`));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('cross-site write is rejected even with a valid session', async () => {
  const response = await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=save', {
    method: 'POST', headers: { origin: 'https://evil.example',
      Authorization: `Bearer ${signSession()}`,
      'content-type': 'application/json' }, body: '{}' }));
  assert.equal(response.status, 403);
});

test('login verifies the existing editor key in the private RPC and issues a session', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /chiffrage_record_login_with_key/);
    assert.equal(JSON.parse(options.body).p_key, 'synthetic-code');
    return new Response(JSON.stringify(true), { status: 200,
    headers: { 'content-type': 'application/json' } });
  };
  try {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=login', {
      method: 'POST', headers: { origin: 'https://akada-prime.github.io',
        'content-type': 'application/json' }, body: '{"code":"synthetic-code"}' }));
    assert.equal(response.status, 200);
    const { session } = await response.json();
    assert.ok(session);
    const status = await handler(new Request('https://example.supabase.co/functions/v1/chiffrage?action=status', {
      headers: { Authorization: `Bearer ${session}` } }));
    assert.equal(status.status, 200);
    assert.equal(verifySession(`${session}bad`), false);
  } finally { globalThis.fetch = originalFetch; }
});
