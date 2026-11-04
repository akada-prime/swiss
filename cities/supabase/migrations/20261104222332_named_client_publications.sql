-- Named, manually reversible client publications. No commercial prices.
alter table public.chiffrage_client_links add column public_slug text unique;
alter table public.chiffrage_client_links add column public_version text;
alter table public.chiffrage_client_links alter column expires_at drop not null;
create unique index chiffrage_named_revision_unique on public.chiffrage_client_links(chiffrage_id,revision) where public_slug is not null;

-- Assign readable names to one existing publication per revision. Frozen payloads stay intact.
do $$
declare q record; l record; base text; ver text; minor integer;
begin
 for q in select distinct c.id,c.bfs_id,c.commune_name,c.canton,c.created_at from public.chiffrages c join public.chiffrage_client_links k on k.chiffrage_id=c.id order by c.created_at,c.id loop
  base:=trim(both '-' from regexp_replace(translate(replace(lower(q.commune_name),'œ','oe'),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc'),'[^a-z0-9]+','-','g'))||'-'||lower(q.canton);
  select coalesce(max(substring(public_version from '^v1\.([0-9]+)$')::integer),-1)+1 into minor from public.chiffrage_client_links k join public.chiffrages c on c.id=k.chiffrage_id where c.bfs_id=q.bfs_id;
  ver:='v1.'||minor;
  for l in select distinct on (revision) id,revision from public.chiffrage_client_links where chiffrage_id=q.id order by revision,(revoked_at is null) desc,open_count desc,created_at desc,id loop
   update public.chiffrage_client_links set public_version=ver,public_slug=base||'/'||ver||'r'||l.revision,expires_at=null where id=l.id;
  end loop;
 end loop;
end $$;

create function public.publish_chiffrage_named_link(p_id uuid,p_revision integer,p_base_slug text,p_payload jsonb,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare k public.chiffrage_client_links; ver text; minor integer; bfs integer;
begin
 select bfs_id into bfs from public.chiffrages where id=p_id;
 if bfs is null or p_base_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid publication'; end if;
 perform pg_catalog.pg_advisory_xact_lock(bfs::bigint);
 select * into k from public.chiffrage_client_links where chiffrage_id=p_id and revision=p_revision and public_slug is not null;
 if not found then
  select public_version into ver from public.chiffrage_client_links where chiffrage_id=p_id and public_version is not null order by created_at limit 1;
  if ver is null then
   select coalesce(max(substring(public_version from '^v1\.([0-9]+)$')::integer),-1)+1 into minor from public.chiffrage_client_links a join public.chiffrages c on c.id=a.chiffrage_id where c.bfs_id=bfs;
   ver:='v1.'||minor;
  end if;
  insert into public.chiffrage_client_links(chiffrage_id,revision,token_hash,payload,expires_at,public_version,public_slug)
   values(p_id,p_revision,p_token_hash,p_payload,null,ver,p_base_slug||'/'||ver||'r'||p_revision) returning * into k;
 end if;
 return jsonb_build_object('id',k.id,'revision',k.revision,'created_at',k.created_at,'expires_at',k.expires_at,'revoked_at',k.revoked_at,'public_slug',k.public_slug,'public_version',k.public_version,'open_count',k.open_count,'last_opened_at',k.last_opened_at);
end $$;
revoke all on function public.publish_chiffrage_named_link(uuid,integer,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.publish_chiffrage_named_link(uuid,integer,text,jsonb,text) to service_role;

create function public.record_chiffrage_named_open(p_slug text) returns jsonb language plpgsql security definer set search_path='' as $$
declare offer jsonb;
begin
 update public.chiffrage_client_links set open_count=open_count+1,last_opened_at=now()
 where public_slug=p_slug and revoked_at is null and (expires_at is null or expires_at>now())
 returning payload||jsonb_build_object('public_version',public_version) into offer;
 return offer;
end $$;
revoke all on function public.record_chiffrage_named_open(text) from public,anon,authenticated;
grant execute on function public.record_chiffrage_named_open(text) to service_role;

create or replace function public.record_chiffrage_client_open(p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare offer jsonb;
begin
 update public.chiffrage_client_links set open_count=open_count+1,last_opened_at=now()
 where token_hash=p_token_hash and revoked_at is null and (expires_at is null or expires_at>now()) returning payload into offer;
 return offer;
end $$;
revoke all on function public.record_chiffrage_client_open(text) from public,anon,authenticated;
grant execute on function public.record_chiffrage_client_open(text) to service_role;
