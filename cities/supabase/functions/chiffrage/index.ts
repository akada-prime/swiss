import handler from './server.mjs';

const allowedOrigin = Deno.env.get('CHIFFRAGE_ALLOWED_ORIGIN') ??
  'https://akada-prime.github.io';

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  if (origin !== allowedOrigin) return new Response(null, { status: 403 });
  const headers = { 'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin' };
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const response = await handler(request);
  const outgoing = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) outgoing.headers.set(name, value);
  return outgoing;
});
