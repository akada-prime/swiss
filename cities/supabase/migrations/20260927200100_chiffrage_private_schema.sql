-- Prime Communes 3.0: schema only. No catalog prices or commercial data here.
-- Prepared locally; do not apply to production without explicit approval.

create table public.chiffrage_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  vendor text not null,
  version text not null,
  effective_from date not null,
  source_digest text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (vendor, version)
);

create table public.chiffrage_catalog_items (
  catalog_version_id uuid not null references public.chiffrage_catalog_versions(id),
  product text not null,
  item_code text not null,
  content jsonb not null,
  primary key (catalog_version_id, product, item_code)
);

create table public.chiffrage_parameters (
  catalog_version_id uuid primary key references public.chiffrage_catalog_versions(id),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create table public.chiffrages (
  id uuid primary key default gen_random_uuid(),
  bfs_id integer not null,
  commune_name text not null,
  canton text not null,
  population integer not null check (population >= 0),
  title text not null,
  catalog_versions jsonb not null,
  current_revision integer not null default 1 check (current_revision > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chiffrage_revisions (
  chiffrage_id uuid not null references public.chiffrages(id) on delete cascade,
  revision integer not null check (revision > 0),
  input jsonb not null,
  result jsonb not null,
  catalog_versions jsonb not null,
  created_at timestamptz not null default now(),
  primary key (chiffrage_id, revision)
);

create table public.chiffrage_login_attempts (
  ip_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz
);

create index chiffrages_open_recent on public.chiffrages(updated_at desc)
  where archived = false;
create unique index chiffrage_one_active_version_per_vendor
  on public.chiffrage_catalog_versions(vendor) where active;
create index chiffrages_by_commune on public.chiffrages(bfs_id, updated_at desc);

-- Even if Data API default privileges are permissive, anon/authenticated
-- cannot list tables, fetch rows, call save or read tariff material.
alter table public.chiffrage_catalog_versions enable row level security;
alter table public.chiffrage_catalog_items enable row level security;
alter table public.chiffrage_parameters enable row level security;
alter table public.chiffrages enable row level security;
alter table public.chiffrage_revisions enable row level security;
alter table public.chiffrage_login_attempts enable row level security;

revoke all on public.chiffrage_catalog_versions, public.chiffrage_catalog_items,
  public.chiffrage_parameters, public.chiffrages, public.chiffrage_revisions,
  public.chiffrage_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.chiffrage_catalog_versions,
  public.chiffrage_catalog_items, public.chiffrage_parameters, public.chiffrages,
  public.chiffrage_revisions, public.chiffrage_login_attempts to service_role;

-- One transaction checks and records each login attempt, including a valid
-- password submitted while the IP is locked. Only the server's service role
-- may call this function. The IP is SHA-256 hashed server-side before passing.
create function public.chiffrage_record_login(p_ip_hash text, p_valid boolean)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_row public.chiffrage_login_attempts%rowtype;
begin
  if length(p_ip_hash) <> 64 then raise exception 'Invalid login identifier'; end if;
  insert into public.chiffrage_login_attempts(ip_hash) values (p_ip_hash)
    on conflict (ip_hash) do nothing;
  select * into v_row from public.chiffrage_login_attempts
    where ip_hash = p_ip_hash for update;
  if v_row.locked_until > now() then return false; end if;
  if v_row.window_started_at < now() - interval '15 minutes' then
    v_row.attempts := 0;
    v_row.window_started_at := now();
  end if;
  if p_valid then
    update public.chiffrage_login_attempts set attempts = 0,
      window_started_at = now(), locked_until = null where ip_hash = p_ip_hash;
    return true;
  end if;
  v_row.attempts := v_row.attempts + 1;
  update public.chiffrage_login_attempts set attempts = v_row.attempts,
    window_started_at = v_row.window_started_at,
    locked_until = case when v_row.attempts >= 5 then now() + interval '15 minutes'
      else null end where ip_hash = p_ip_hash;
  return false;
end;
$$;
revoke all on function public.chiffrage_record_login(text, boolean)
  from public, anon, authenticated;
grant execute on function public.chiffrage_record_login(text, boolean) to service_role;

-- Atomic create/save keeps the previous revision unchanged. Expected revision
-- prevents two browser tabs from silently overwriting one another.
create function public.chiffrage_write(
  p_id uuid, p_expected_revision integer, p_bfs_id integer,
  p_commune_name text, p_canton text, p_population integer,
  p_title text, p_archived boolean, p_catalog_versions jsonb,
  p_input jsonb, p_result jsonb
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_revision integer;
begin
  if p_id is null or p_bfs_id is null or p_bfs_id <= 0 or
     p_population is null or p_population < 0 or
     p_title is null or p_commune_name is null or p_canton is null or
     length(btrim(p_title)) < 1 or
     length(p_title) > 180 or length(p_commune_name) > 180 or
     jsonb_typeof(p_input) <> 'object' or jsonb_typeof(p_result) <> 'object' or
     jsonb_typeof(p_catalog_versions) <> 'object' then
    raise exception 'Invalid quote';
  end if;
  if p_expected_revision is null then
    insert into public.chiffrages(id,bfs_id,commune_name,canton,population,
      title,archived,catalog_versions)
    values (p_id,p_bfs_id,p_commune_name,p_canton,p_population,p_title,
      coalesce(p_archived,false),p_catalog_versions);
    v_revision := 1;
  else
    select current_revision into v_revision from public.chiffrages
      where id=p_id for update;
    if v_revision is null or v_revision <> p_expected_revision then
      raise exception 'Revision conflict' using errcode = '40001';
    end if;
    v_revision := v_revision + 1;
    update public.chiffrages set bfs_id=p_bfs_id, commune_name=p_commune_name,
      canton=p_canton, population=p_population, title=p_title,
      archived=coalesce(p_archived,false), catalog_versions=p_catalog_versions,
      current_revision=v_revision, updated_at=now() where id=p_id;
  end if;
  insert into public.chiffrage_revisions(chiffrage_id,revision,input,result,catalog_versions)
    values(p_id,v_revision,p_input,p_result,p_catalog_versions);
  return jsonb_build_object('id',p_id,'revision',v_revision);
end;
$$;
revoke all on function public.chiffrage_write(uuid,integer,integer,text,text,
  integer,text,boolean,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.chiffrage_write(uuid,integer,integer,text,text,
  integer,text,boolean,jsonb,jsonb,jsonb) to service_role;
