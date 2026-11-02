-- Catalog editing reuses the existing private, versioned commercial parameters.
-- Only the authenticated edge server (service_role) may call this transaction.
create or replace function public.chiffrage_update_modules(
  p_expected_version uuid, p_module_contents jsonb, p_prime_options jsonb
) returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  old_version public.chiffrage_catalog_versions%rowtype;
  new_id uuid;
  new_parameters jsonb;
begin
  if p_expected_version is null or jsonb_typeof(p_module_contents) is distinct from 'array'
    or jsonb_typeof(p_prime_options) is distinct from 'array'
    or jsonb_array_length(p_module_contents)>500 or jsonb_array_length(p_prime_options)>250 then
    raise exception 'Invalid catalog content';
  end if;
  select * into old_version from public.chiffrage_catalog_versions
    where vendor='commercial' and active for update;
  if old_version.id is null or old_version.id<>p_expected_version then
    raise exception 'Revision conflict' using errcode='40001';
  end if;
  select content into new_parameters from public.chiffrage_parameters where catalog_version_id=old_version.id;
  if new_parameters is null then raise exception 'Missing commercial parameters'; end if;
  new_parameters := jsonb_set(jsonb_set(new_parameters,'{module_contents}',p_module_contents),'{prime_options}',p_prime_options);
  update public.chiffrage_catalog_versions set active=false where id=old_version.id;
  insert into public.chiffrage_catalog_versions(vendor,version,effective_from,source_digest,active)
    values('commercial','modules-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSUS'),current_date,
      old_version.source_digest,true) returning id into new_id;
  insert into public.chiffrage_parameters(catalog_version_id,content) values(new_id,new_parameters);
  insert into public.chiffrage_catalog_items(catalog_version_id,product,item_code,content)
    select new_id,product,item_code,content from public.chiffrage_catalog_items where catalog_version_id=old_version.id;
  return jsonb_build_object('version',new_id);
end;
$$;
revoke all on function public.chiffrage_update_modules(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.chiffrage_update_modules(uuid,jsonb,jsonb) to service_role;
