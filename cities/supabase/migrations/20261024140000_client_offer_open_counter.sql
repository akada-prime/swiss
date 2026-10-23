-- Anonymous views increment a single aggregate, without recording IP,
-- user agent, cookies, visitor identifiers or individual access events.
alter table public.chiffrage_client_links
  add column open_count bigint not null default 0 check (open_count >= 0),
  add column last_opened_at timestamptz;

-- Function only callable with the Edge backend's service_role credentials.
-- A failed/revoked/expired capability neither returns data nor increments.
create or replace function public.record_chiffrage_client_open(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare offer jsonb;
begin
  update public.chiffrage_client_links
     set open_count = open_count + 1,
         last_opened_at = now()
   where token_hash = p_token_hash
     and revoked_at is null
     and expires_at > now()
  returning payload into offer;
  return offer;
end;
$$;
revoke all on function public.record_chiffrage_client_open(text)
  from public, anon, authenticated;
grant execute on function public.record_chiffrage_client_open(text) to service_role;
comment on function public.record_chiffrage_client_open(text) is
  'Atomic aggregate opening counter. Returns frozen allowlisted offer to the service backend only.';
