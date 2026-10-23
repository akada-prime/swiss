-- Customer-view publications: immutable, explicitly declassified quote projections.
-- Store only SHA-256 of the bearer token; never persist the plaintext link token.
create table public.chiffrage_client_links (
  id uuid primary key default gen_random_uuid(),
  chiffrage_id uuid not null references public.chiffrages(id) on delete cascade,
  revision integer not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint chiffrage_client_links_revision_fk foreign key (chiffrage_id, revision)
    references public.chiffrage_revisions(chiffrage_id, revision) on delete cascade,
  constraint chiffrage_client_links_expiry check (expires_at > created_at)
);
create index chiffrage_client_links_quote_idx
  on public.chiffrage_client_links(chiffrage_id, created_at desc);
alter table public.chiffrage_client_links enable row level security;
revoke all on public.chiffrage_client_links from public, anon, authenticated;
grant select, insert, update, delete on public.chiffrage_client_links to service_role;
comment on table public.chiffrage_client_links is
  'Immutable customer-safe offer projection. service_role only; share token is hashed.';
