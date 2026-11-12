-- Shared internal workflow. No prices or customer snapshots in this migration.
alter table public.chiffrages
  add column workflow_stage smallint not null default 0 check(workflow_stage between 0 and 2),
  add column workflow_order bigint not null default 0,
  add column save_number integer not null default 0 check(save_number >= 0);
create table public.chiffrage_board (
  singleton boolean primary key default true check(singleton),
  column_titles text[] not null default array['Brouillon','Client','Finale'] check(cardinality(column_titles)=3),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.chiffrage_board enable row level security;
revoke all on public.chiffrage_board from public,anon,authenticated;
grant all on public.chiffrage_board to service_role;
insert into public.chiffrage_board(singleton) values(true);

-- Finality is enforced for old and new callers, not just disabled controls.
create function public.chiffrage_final_guard() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
 if old.workflow_stage=2 and (
   new.current_revision is distinct from old.current_revision or
   new.title is distinct from old.title or new.catalog_versions is distinct from old.catalog_versions or
   new.bfs_id is distinct from old.bfs_id or new.commune_name is distinct from old.commune_name or
   new.canton is distinct from old.canton or new.population is distinct from old.population or
   new.save_number is distinct from old.save_number) then
  raise exception 'Quote finalized' using errcode='55000';
 end if;
 return new;
end $$;
revoke all on function public.chiffrage_final_guard() from public,anon,authenticated;
create trigger chiffrage_final_guard before update on public.chiffrages
for each row execute function public.chiffrage_final_guard();

-- Preserve the revision machinery; only explicit manual saves increment #.
create function public.chiffrage_write_v2(
 p_id uuid,p_expected_revision integer,p_bfs_id integer,p_commune_name text,
 p_canton text,p_population integer,p_title text,p_catalog_versions jsonb,
 p_input jsonb,p_result jsonb,p_manual_save boolean default false
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_result jsonb;v_number integer;v_stage smallint;
begin
 if p_expected_revision is not null then
  select workflow_stage into v_stage from public.chiffrages where id=p_id for update;
  if v_stage=2 then raise exception 'Quote finalized' using errcode='55000';end if;
 end if;
 v_result:=public.chiffrage_write(p_id,p_expected_revision,p_bfs_id,p_commune_name,p_canton,
   p_population,p_title,false,p_catalog_versions,p_input,p_result);
 update public.chiffrages set save_number=save_number+case when p_manual_save then 1 else 0 end
  where id=p_id returning save_number,workflow_stage into v_number,v_stage;
 return v_result||jsonb_build_object('save_number',v_number,'workflow_stage',v_stage);
end $$;
revoke all on function public.chiffrage_write_v2(uuid,integer,integer,text,text,integer,text,jsonb,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.chiffrage_write_v2(uuid,integer,integer,text,text,integer,text,jsonb,jsonb,jsonb,boolean) to service_role;

-- One short row lock serializes shared moves/renames and prevents lost updates.
create function public.chiffrage_board_update(
 p_expected_version bigint,p_quote_id uuid default null,p_stage integer default null,
 p_before_id uuid default null,p_column integer default null,p_title text default null
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_board public.chiffrage_board;v_ids uuid[];v_index integer;
begin
 select * into v_board from public.chiffrage_board where singleton for update;
 if v_board.version is distinct from p_expected_version then
  raise exception 'Revision conflict' using errcode='40001';
 end if;
 if p_quote_id is not null then
  if p_stage is null or p_stage not between 0 and 2 or not exists(select 1 from public.chiffrages where id=p_quote_id) then
   raise exception 'Invalid board move';
  end if;
  select coalesce(array_agg(id order by workflow_order,created_at,id),'{}'::uuid[]) into v_ids
   from public.chiffrages where workflow_stage=p_stage and id<>p_quote_id;
  if p_before_id is null then v_ids:=array_append(v_ids,p_quote_id);
  else
   v_index:=array_position(v_ids,p_before_id);
   if v_index is null then raise exception 'Revision conflict' using errcode='40001';end if;
   v_ids:=coalesce(v_ids[1:v_index-1],'{}'::uuid[])||array[p_quote_id]||coalesce(v_ids[v_index:cardinality(v_ids)],'{}'::uuid[]);
  end if;
  update public.chiffrages q set workflow_stage=p_stage,workflow_order=x.position
   from unnest(v_ids) with ordinality as x(id,position) where q.id=x.id;
 elsif p_column is not null then
  if p_column not between 0 and 2 or p_title is null or length(btrim(p_title)) not between 1 and 60 then
   raise exception 'Invalid column title';
  end if;
  v_board.column_titles[p_column+1]:=btrim(p_title);
 else raise exception 'Invalid board operation';end if;
 update public.chiffrage_board set column_titles=v_board.column_titles,version=version+1,updated_at=now()
  where singleton returning * into v_board;
 return jsonb_build_object('version',v_board.version,'column_titles',v_board.column_titles);
end $$;
revoke all on function public.chiffrage_board_update(bigint,uuid,integer,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.chiffrage_board_update(bigint,uuid,integer,uuid,integer,text) to service_role;
