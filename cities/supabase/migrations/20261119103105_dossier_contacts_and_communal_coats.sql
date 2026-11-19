-- Technical image cache only. All writes belong to the verified server resolver.
create table public.communal_coat_cache (
  bfs_id integer primary key check (bfs_id between 1 and 99999),
  status text not null check (status in ('ready','missing','unavailable')),
  filename text, source text, file_page text,
  mime_type text check (mime_type in ('image/svg+xml','image/png','image/jpeg','image/webp')),
  image_base64 text check (length(image_base64) <= 699052),
  checked_at timestamptz not null default now(), retry_after timestamptz,
  check (status <> 'ready' or (filename is not null and source ~ '^https://www[.]wikidata[.]org/wiki/Q[0-9]+$' and image_base64 is not null and mime_type is not null))
);
alter table public.communal_coat_cache enable row level security;
revoke all on public.communal_coat_cache from anon, authenticated;
grant select, insert, update on public.communal_coat_cache to service_role;

-- Shared business contact records, editable only through the editor session API.
create table public.chiffrage_team_contacts (
  id text primary key check (id ~ '^[a-z][a-z0-9-]{0,39}$'),
  name text not null check (length(name) between 1 and 160),
  position text not null default '' check (length(position) <= 160),
  email text not null default '' check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 60),
  updated_at timestamptz not null default now()
);
alter table public.chiffrage_team_contacts enable row level security;
revoke all on public.chiffrage_team_contacts from anon, authenticated;
grant select, update on public.chiffrage_team_contacts to service_role;
insert into public.chiffrage_team_contacts(id,name,position,email,phone) values
 ('alex','Alex','','',''),
 ('nicolas','Nicolas','','',''),
 ('oceane','Océane','','','');
