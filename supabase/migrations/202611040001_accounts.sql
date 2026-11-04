begin;
create extension if not exists citext;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username citext not null unique check (username::text ~ '^[A-Za-z0-9_]{3,24}$'),
 avatar_path text check (avatar_path is null or avatar_path like id::text||'/%'),
 created_at timestamptz not null default now()
);
create table public.private_documents (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{}'::jsonb,
 version bigint not null default 0,
 updated_at timestamptz not null default now()
);
create table public.legacy_imports (
 source_id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 original jsonb not null,
 imported_at timestamptz not null default now()
);
create table public.exercise_variants (
 id text primary key,
 label text not null,
 equipment text not null,
 convention text not null,
 description text not null default ''
);
insert into public.exercise_variants(id,label,equipment,convention,description) values
 ('bench-barbell-total','Développé couché · barre','barbell','Total','Banc plat, barre libre ; barre incluse dans la charge totale.'),
 ('squat-barbell-total','Squat · barre','barbell','Total','Barre libre, barre incluse ; ne pas comparer à une machine guidée.'),
 ('rdl-barbell-total','Soulevé de terre roumain · barre','barbell','Total','Barre libre, charge totale.'),
 ('lateral-dumbbell-each','Élévations latérales · haltères','dumbbell','Par haltère','Charge d’un haltère ; aucun doublement automatique.'),
 ('shoulder-dumbbell-each','Développé épaules · haltères','dumbbell','Par haltère','Charge d’un haltère, assis ; aucun doublement automatique.'),
 ('row-dumbbell-side','Rowing unilatéral · haltère','dumbbell','Par côté','Une ligne correspond au côté enregistré ; aucun doublement automatique.');
create table public.variant_aliases (exercise_id text not null, convention text not null, variant_id text not null references public.exercise_variants(id),primary key(exercise_id,convention));
insert into public.variant_aliases values
 ('Développé couché','Total','bench-barbell-total'),
 ('Élévations latérales aux haltères','Par haltère','lateral-dumbbell-each'),
 ('laterales-push','Par haltère','lateral-dumbbell-each');
create table public.performances (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 session_id text not null,
 exercise_key text not null,
 equipment_key text not null,
 set_key text not null,
 segment integer not null,
 exercise_label text not null,
 convention text not null,
 variant_id text references public.exercise_variants(id),
 performed_at timestamptz not null,
 completed boolean not null,
 weight numeric not null check(weight>=0 and weight<=1000000),
 reps integer not null check(reps between 1 and 10000),
 primary key(owner_id,session_id,exercise_key,set_key,segment)
);
create index performances_owner_date on public.performances(owner_id,performed_at desc,session_id);
create index performances_owner_variant on public.performances(owner_id,variant_id,session_id);
create table public.absolute_bests (
 variant_id text not null references public.exercise_variants(id),
 kind text not null check(kind in ('charge','tonnage')),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 value numeric not null,
 reps integer,
 session_id text not null,
 performed_at timestamptz not null,
 primary key(variant_id,kind,owner_id)
);
create index absolute_bests_ranking on public.absolute_bests(variant_id,kind,value desc,owner_id);
create table public.rep_bests (
 variant_id text not null references public.exercise_variants(id),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 reps integer not null,
 value numeric not null,
 session_id text not null,
 performed_at timestamptz not null,
 primary key(variant_id,owner_id,reps)
);
create index rep_bests_ranking on public.rep_bests(variant_id,reps,value desc,owner_id);

alter table public.profiles enable row level security;
alter table public.private_documents enable row level security;
alter table public.legacy_imports enable row level security;
alter table public.exercise_variants enable row level security;
alter table public.variant_aliases enable row level security;
alter table public.performances enable row level security;
alter table public.absolute_bests enable row level security;
alter table public.rep_bests enable row level security;
create policy profiles_read on public.profiles for select using (true);
create policy profiles_update on public.profiles for update to authenticated using(auth.uid()=id) with check(auth.uid()=id);
create policy document_read on public.private_documents for select to authenticated using(auth.uid()=owner_id);
create policy import_read on public.legacy_imports for select to authenticated using(auth.uid()=owner_id);
create policy variants_read on public.exercise_variants for select using(true);
create policy aliases_read on public.variant_aliases for select using(true);
create policy performances_read on public.performances for select using(true);
create policy absolute_read on public.absolute_bests for select using(true);
create policy reps_read on public.rep_bests for select using(true);
revoke all on public.profiles,public.private_documents,public.legacy_imports,public.exercise_variants,public.variant_aliases,public.performances,public.absolute_bests,public.rep_bests from anon,authenticated;
grant select on public.profiles,public.exercise_variants,public.performances,public.absolute_bests,public.rep_bests to anon,authenticated;
grant select on public.private_documents,public.legacy_imports to authenticated;
grant update(username,avatar_path) on public.profiles to authenticated;

create function public.create_sport_profile() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into public.profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');return new;end $$;
revoke all on function public.create_sport_profile() from public;
create trigger sport_profile_created after insert on auth.users for each row execute function public.create_sport_profile();

-- Only this function transforms private snapshots into a public sporting projection.
create function public.sync_snapshot(p_payload jsonb,p_version bigint,p_source uuid default null,p_original jsonb default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); current_version bigint; holder uuid; s jsonb; e jsonb; st jsonb; part jsonb; b jsonb; v public.exercise_variants%rowtype; sid text; eid text; sk text; conv text; label text; dt timestamptz; done boolean; ei integer; si integer; di integer; w numeric; r numeric;
begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_payload->>'accountOwnerId' is not null and p_payload->>'accountOwnerId'<>u::text then raise exception 'ACCOUNT_MISMATCH';end if;
 if jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'sessions')<>'array' or jsonb_typeof(p_payload->'templates')<>'array' or octet_length(p_payload::text)>20971520 then raise exception 'INVALID_DOCUMENT';end if;
 if p_source is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_source::text,0));
  select owner_id into holder from public.legacy_imports where source_id=p_source;
  if holder is not null and holder<>u then raise exception 'LEGACY_ALREADY_CLAIMED';end if;
  if holder is null and (p_original is null or jsonb_typeof(p_original)<>'object' or octet_length(p_original::text)>20971520) then raise exception 'INVALID_ORIGINAL';end if;
 end if;
 insert into public.private_documents(owner_id) values(u) on conflict do nothing;
 select version into current_version from public.private_documents where owner_id=u for update;
 if current_version<>p_version then raise exception 'SYNC_CONFLICT' using errcode='PT409';end if;
 delete from public.performances where owner_id=u;
 for s in select distinct on (item->>'id') item from (
  select value as item,0 as position from jsonb_array_elements(p_payload->'sessions')
  union all select p_payload->'active',1 where jsonb_typeof(p_payload->'active')='object'
  union all select value,2 from jsonb_array_elements(case when jsonb_typeof(p_payload->'importedDrafts')='array' then p_payload->'importedDrafts' else '[]'::jsonb end)
 ) all_sessions order by item->>'id',position loop
  sid:=s->>'id';if sid is null or length(sid)>10000 or jsonb_typeof(s->'exercises')<>'array' then continue;end if;
  begin dt:=(s->>'date')::timestamptz;exception when others then continue;end;
  if dt is null then continue;end if;
  done:=exists(select 1 from jsonb_array_elements(p_payload->'sessions') x where x->>'id'=sid);
  ei:=0;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   ei:=ei+1;if jsonb_typeof(e->'sets')<>'array' then continue;end if;
   eid:=coalesce(e->>'instanceId','exercise-'||ei);conv:=left(coalesce(e->>'convention','À préciser'),200);label:=left(coalesce(e->>'name','Exercice'),200);v:=null;
   if jsonb_typeof(p_payload->'publicVariantBindings')='array' then
    select x into b from jsonb_array_elements(p_payload->'publicVariantBindings') x where x->>'exerciseId'=e->>'id' and x->>'convention'=conv and x->>'confirmed'='true' limit 1;
    if b is not null then select * into v from public.exercise_variants where id=b->>'variantId' and (convention=conv or conv='Valeur indiquée (à préciser)');end if;
   end if;
   if v.id is null then select ev.* into v from public.variant_aliases a join public.exercise_variants ev on ev.id=a.variant_id where a.exercise_id=e->>'id' and a.convention=conv;end if;
   if v.id is not null then conv:=v.convention;end if;
   si:=0;
   for st in select value from jsonb_array_elements(e->'sets') loop
    si:=si+1;if coalesce(st->>'type','work')<>'work' then continue;end if;
    sk:=coalesce(st->>'id','set-'||si);di:=0;
    for part in select st union all select value from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array' then st->'drops' else '[]'::jsonb end) loop
     if jsonb_typeof(part->'w')='number' and jsonb_typeof(part->'r')='number' then
      w:=(part->>'w')::numeric;r:=(part->>'r')::numeric;
      if w>=0 and w<=1000000 and r between 1 and 10000 and r=trunc(r) then
       insert into public.performances values(u,md5(sid),md5(eid),md5(coalesce(e->>'id',eid)||chr(31)||coalesce(e->>'convention','')),md5(sk),di,label,conv,v.id,dt,done,w,r::int) on conflict do nothing;
      end if;
     end if;di:=di+1;
    end loop;
   end loop;
  end loop;
 end loop;
 delete from public.absolute_bests where owner_id=u;delete from public.rep_bests where owner_id=u;
 insert into public.rep_bests select distinct on(variant_id,reps) variant_id,u,reps,weight,session_id,performed_at from public.performances where owner_id=u and variant_id is not null order by variant_id,reps,weight desc,performed_at,session_id;
 insert into public.absolute_bests select distinct on(variant_id) variant_id,'charge',u,weight,reps,session_id,performed_at from public.performances where owner_id=u and variant_id is not null order by variant_id,weight desc,reps desc,performed_at,session_id;
 insert into public.absolute_bests select distinct on(variant_id) variant_id,'tonnage',u,total,null,session_id,performed_at from (select variant_id,session_id,max(performed_at) performed_at,sum(weight*reps) total from public.performances where owner_id=u and variant_id is not null and completed group by variant_id,session_id) totals order by variant_id,total desc,performed_at,session_id;
 update public.private_documents set payload=p_payload,version=current_version+1,updated_at=now() where owner_id=u;
 if p_source is not null then insert into public.legacy_imports(source_id,owner_id,original) values(p_source,u,p_original) on conflict do nothing;end if;
 return jsonb_build_object('version',current_version+1,'performances',(select count(*) from public.performances where owner_id=u),'unranked',(select count(*) from public.performances where owner_id=u and variant_id is null));
end $$;
revoke all on function public.sync_snapshot(jsonb,bigint,uuid,jsonb) from public;
grant execute on function public.sync_snapshot(jsonb,bigint,uuid,jsonb) to authenticated;

create function public.rankings(p_variant text,p_kind text default 'charge',p_reps integer default null,p_offset integer default 0,p_limit integer default 25,p_ties boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare records jsonb; entries jsonb; total bigint; mine bigint; cap integer:=greatest(1,least(p_limit,50));off integer:=greatest(0,least(p_offset,100000));
begin
 if p_kind not in ('charge','tonnage') or p_reps is not null and p_reps not between 1 and 10000 then raise exception 'INVALID_FILTER';end if;
 select coalesce(jsonb_object_agg(k.kind,k.card),'{}'::jsonb) into records from (
 select kind,(select jsonb_build_object('value',a.value,'reps',a.reps,'ownerId',a.owner_id,'username',p.username,'ties',(select count(*) from public.absolute_bests t where t.variant_id=p_variant and t.kind=kind and t.value=a.value)) from public.absolute_bests a join public.profiles p on p.id=a.owner_id where a.variant_id=p_variant and a.kind=kinds.kind order by a.value desc,p.username,a.owner_id limit 1) card from (values('charge'),('tonnage')) kinds(kind)
 ) k;
 with source as (
  select a.owner_id,a.value,a.reps,a.session_id,a.performed_at from public.absolute_bests a where a.variant_id=p_variant and a.kind=p_kind and (p_kind<>'charge' or p_reps is null or p_ties)
  union all select a.owner_id,a.value,a.reps,a.session_id,a.performed_at from public.rep_bests a where a.variant_id=p_variant and p_kind='charge' and p_reps is not null and not p_ties and a.reps=p_reps
 ),ranked as(select s.*,rank() over(order by value desc) as rank from source s),filtered as(select * from ranked where not p_ties or rank=1),page as(select f.*,p.username,p.avatar_path from filtered f join public.profiles p on p.id=f.owner_id order by f.rank,p.username,f.owner_id limit cap offset off)
 select coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),(select count(*) from filtered),(select rank from ranked where owner_id=auth.uid()) into entries,total,mine;
 return jsonb_build_object('records',records,'entries',entries,'total',total,'myRank',mine,'offset',off,'limit',cap);
end $$;
revoke all on function public.rankings(text,text,integer,integer,integer,boolean) from public;
grant execute on function public.rankings(text,text,integer,integer,integer,boolean) to anon,authenticated;

create function public.sport_profile(p_username text,p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare profile public.profiles%rowtype; recent jsonb; records jsonb;
begin
 select * into profile from public.profiles where username=p_username::citext;if not found then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) into recent from (select exercise_label,convention,variant_id,performed_at,weight,reps,completed,segment from public.performances where owner_id=profile.id order by performed_at desc,session_id,exercise_key,set_key,segment limit greatest(1,least(p_limit,50)) offset greatest(0,least(p_offset,100000))) p;
 with best_charge as(select distinct on(equipment_key,convention,variant_id) equipment_key,exercise_label,convention,variant_id,weight,reps from public.performances where owner_id=profile.id order by equipment_key,convention,variant_id,weight desc,reps desc),totals as(select equipment_key,exercise_label,convention,variant_id,session_id,sum(weight*reps) total from public.performances where owner_id=profile.id and completed group by equipment_key,exercise_label,convention,variant_id,session_id)
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into records from (select b.*,(select max(t.total) from totals t where t.equipment_key=b.equipment_key and t.convention=b.convention and t.variant_id is not distinct from b.variant_id) tonnage from best_charge b order by b.exercise_label,b.convention limit 50) r;
 return jsonb_build_object('id',profile.id,'username',profile.username,'avatar_path',profile.avatar_path,'records',records,'recent',recent,'offset',p_offset);
end $$;
revoke all on function public.sport_profile(text,integer,integer) from public;
grant execute on function public.sport_profile(text,integer,integer) to anon,authenticated;
notify pgrst, 'reload schema';
commit;
