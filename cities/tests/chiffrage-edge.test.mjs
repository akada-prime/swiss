import test from 'node:test';
import assert from 'node:assert/strict';

test('GitHub Pages origin and protected Edge session gate the private API', async () => {
  const savedDeno = globalThis.Deno;
  const savedFetch = globalThis.fetch;
  let serve;
  let loginAttempts = 0;
  globalThis.Deno = { env: { get: key => ({
    SUPABASE_URL: 'https://synthetic.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-server-key'
  })[key] }, serve: callback => { serve = callback; } };
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /rpc\/chiffrage_record_login_with_key/);
    loginAttempts++;
    return new Response(JSON.stringify(JSON.parse(options.body).p_key === 'synthetic-code'),
      { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    await import('../supabase/functions/chiffrage/index.ts');
    const origin = 'https://akada-prime.github.io';
    const url = 'https://synthetic.supabase.co/functions/v1/chiffrage';
    assert.equal((await serve(new Request(`${url}?action=status`, {
      headers: { Origin: 'https://other.example' } }))).status, 403);
    const preflight = await serve(new Request(url, {
      method: 'OPTIONS', headers: { Origin: origin } }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal((await serve(new Request(`${url}?action=status`, {
      headers: { Origin: origin } }))).status, 401);
    const login = await serve(new Request(`${url}?action=login`, { method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'synthetic-code' }) }));
    assert.equal(login.status, 200);
    const { session } = await login.json();
    assert.ok(session);
    assert.equal(login.headers.get('set-cookie'), null);
    const status = await serve(new Request(`${url}?action=status`, {
      headers: { Origin: origin, Authorization: `Bearer ${session}` } }));
    assert.equal(status.status, 200);
    assert.equal(loginAttempts, 1);
  } finally { globalThis.Deno = savedDeno; globalThis.fetch = savedFetch; }
});
