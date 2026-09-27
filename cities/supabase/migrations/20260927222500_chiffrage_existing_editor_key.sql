-- Chiffrage uses the existing commune editor key, verified inside Postgres.
-- Only the server role can call this; failed attempts use the same rate limit.
create function public.chiffrage_record_login_with_key(p_ip_hash text, p_key text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, pg_temp
as $$
declare v_expected_hash text;
begin
  select key_hash into v_expected_hash from public."PrimeCommunesEditConfig"
    where id = true;
  return public.chiffrage_record_login(p_ip_hash,
    v_expected_hash is not null and
    encode(extensions.digest(coalesce(p_key,''), 'sha256'), 'hex') = v_expected_hash);
end;
$$;
revoke all on function public.chiffrage_record_login_with_key(text,text)
  from public, anon, authenticated;
grant execute on function public.chiffrage_record_login_with_key(text,text)
  to service_role;
