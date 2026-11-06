-- Friend-only, opt-in activity. Private documents and sporting rules are unchanged.
begin;
create table public.friend_feed_settings(owner_id uuid primary key references public.profiles(id) on delete cascade,enabled_since timestamptz);
create table public.friend_activity(id text primary key,owner_id uuid not null references public.profiles(id) on delete cascade,session_id text not null,kind text not null check(kind in('session','record')),identity_key text,payload jsonb not null,occurred_at timestamptz not null,active boolean not null default true);
create index friend_activity_recent on public.friend_activity(occurred_at desc,id)where active;
create index friend_activity_owner on public.friend_activity(owner_id,session_id);
create table public.friend_activity_cheers(activity_id text references public.friend_activity(id) on delete cascade,owner_id uuid references public.profiles(id) on delete cascade,primary key(activity_id,owner_id));
alter table public.friend_feed_settings enable row level security;
alter table public.friend_activity enable row level security;
alter table public.friend_activity_cheers enable row level security;
revoke all on public.friend_feed_settings,public.friend_activity,public.friend_activity_cheers from public,anon,authenticated;

-- Reuse the existing personal-record definition from social_metrics: same identity,
-- reliable chronology, earlier day, weight/session-tonnage/exact-load repetition PR.
create function public.friend_record_sessions(p_owner uuid)returns table(session_id text,identity_key text)language sql stable security definer set search_path=public,pg_temp as $$
 with facts as(select * from social_facts where owner_id=p_owner and active),
 exercise_sessions as(select f.identity_key,f.session_id,min(started_at)started,max(weight)w,sum(tonnage)ton,count(*)=count(tonnage)complete from facts f where f.identity_key is not null and order_reliable group by f.identity_key,f.session_id)
 select x.session_id,x.identity_key from exercise_sessions x where exists(select 1 from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and(old.started at time zone social_timezone(p_owner))::date<>(x.started at time zone social_timezone(p_owner))::date)
 and not exists(select 1 from exercise_sessions other where other.identity_key=x.identity_key and other.session_id<>x.session_id and other.started=x.started)
 and(x.w>(select max(old.w)from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started)
 or x.complete and x.ton>(select max(old.ton)from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and old.complete)
 or exists(select 1 from facts f where f.identity_key=x.identity_key and f.session_id=x.session_id and f.reps>(select max(o.reps)from facts o where o.identity_key=f.identity_key and o.weight=f.weight and o.started_at<x.started)));
$$;
-- Same counters and bounds as activity.js; malformed imported entries are ignored.
create function public.friend_activity_entry_valid(a jsonb,started timestamptz,ended timestamptz)returns boolean language plpgsql stable set search_path=public,pg_temp as $$
declare recorded timestamptz;v numeric;cap numeric;begin
 if jsonb_typeof(a->'value')is distinct from 'number'or coalesce(a->>'id','')=''then return false;end if;
 cap:=case a->>'counter'when 'duration'then 1440 when 'distance'then 2000 when 'calories'then 50000 end;
 v:=(a->>'value')::numeric;recorded:=(a->>'recordedAt')::timestamptz;
 return coalesce(cap is not null and v>0 and v<=cap and isfinite(recorded)and recorded>=started and recorded<=ended,false);
 exception when others then return false;
end$$;
create function public.friend_feed_project(p_owner uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare since_time timestamptz;s record;r record;title text;detail jsonb;record_sessions jsonb;piece jsonb;started timestamptz;ended timestamptz;begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,110));
 select enabled_since into since_time from friend_feed_settings where owner_id=p_owner;
 update friend_activity set active=false where owner_id=p_owner and active;
 if since_time is null then return;end if;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb)into record_sessions from friend_record_sessions(p_owner)p;
 for s in select f.session_id,min(started_at)started,max(ended_at)ended,count(*)work_sets,bool_and(order_reliable)reliable from social_facts f where owner_id=p_owner and active and ended_at>=since_time and ended_at>now()-interval '90 days'group by f.session_id order by max(ended_at)desc limit 100 loop
  -- Custom session names can contain private information; expose only standard categories.
  select case when j->>'name' in('Push','Pull','Upper','Lower','Jambes','Full Body','Full body')then j->>'name' else 'Entraînement' end into title from private_documents d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload->'sessions')='array'then d.payload->'sessions'else '[]'::jsonb end)j where d.owner_id=p_owner and j->>'id'=s.session_id limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('label',x.label,'sets',x.n)order by x.label),'[]'::jsonb)into detail from(select exercise_id,min(label)label,count(*)n from social_facts where owner_id=p_owner and active and session_id=s.session_id group by exercise_id order by min(label)limit 50)x;
  insert into friend_activity(id,owner_id,session_id,kind,payload,occurred_at)values('session:'||md5(p_owner::text||':'||s.session_id),p_owner,s.session_id,'session',jsonb_build_object('title',coalesce(title,'Entraînement'),'minutes',case when s.reliable then greatest(0,round(extract(epoch from(s.ended-s.started))/60))end,'sets',s.work_sets,'exercises',detail),s.ended)
  on conflict(id)do update set kind='session',identity_key=null,payload=excluded.payload,occurred_at=excluded.occurred_at,active=true;
  for r in select distinct on(f.identity_key)f.* from social_facts f join jsonb_to_recordset(record_sessions)as p(session_id text,identity_key text)on p.session_id=f.session_id and p.identity_key=f.identity_key where f.owner_id=p_owner and f.active and f.session_id=s.session_id and f.identity->>'unit'in('kg','lb')order by f.identity_key,f.weight desc,f.reps desc,f.set_id limit 1 loop
   update friend_activity set kind='record',identity_key=r.identity_key,payload=payload||jsonb_build_object('title',r.label,'sessionTitle',coalesce(title,'Entraînement'),'unit',r.identity->>'unit','convention',r.identity->>'convention')where id='session:'||md5(p_owner::text||':'||s.session_id);
  end loop;
 end loop;
 -- Activity-only workouts have no muscular facts. Share their finished summary,
 -- without converting cardio entries into muscular sets, tonnage or records.
 for piece in select j from private_documents d cross join lateral jsonb_array_elements(case when jsonb_typeof(d.payload->'sessions')='array'then d.payload->'sessions'else '[]'::jsonb end)j
 where d.owner_id=p_owner and j->>'id'is not null and j->>'id'is distinct from d.payload->'active'->>'id' and not exists(select 1 from social_facts f where f.owner_id=p_owner and f.active and f.session_id=j->>'id')loop
  begin started:=(piece->>'date')::timestamptz;ended:=(piece->>'endedAt')::timestamptz;exception when others then continue;end;
  if started is null or ended is null or not isfinite(started)or not isfinite(ended)or ended<started or ended>clock_timestamp() or ended<since_time or ended<now()-interval '90 days'then continue;end if;
  select coalesce(jsonb_agg(jsonb_build_object('label',case e->>'id'when 'treadmill'then 'Tapis de course'when 'bike'then 'Vélo'when 'elliptical'then 'Vélo elliptique'when 'rowing'then 'Rameur'else 'Cardio'end,'cardio',true)),'[]'::jsonb)into detail
  from jsonb_array_elements(case when jsonb_typeof(piece->'exercises')='array'then piece->'exercises'else '[]'::jsonb end)e
  where e->>'tracking'='cardio' and exists(select 1 from jsonb_array_elements(case when jsonb_typeof(e->'activityEntries')='array'then e->'activityEntries'else '[]'::jsonb end)a where friend_activity_entry_valid(a,started,ended));
  if jsonb_array_length(detail)=0 then continue;end if;
  insert into friend_activity(id,owner_id,session_id,kind,payload,occurred_at)values('session:'||md5(p_owner::text||':'||(piece->>'id')),p_owner,piece->>'id','session',jsonb_build_object('title','Cardio','minutes',greatest(0,round(extract(epoch from(ended-started))/60)),'sets',0,'cardio',true,'exercises',detail),ended)
  on conflict(id)do update set kind='session',identity_key=null,payload=excluded.payload,occurred_at=excluded.occurred_at,active=true;
 end loop;
end$$;
create function public.friend_feed_after_sync()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin perform friend_feed_project(new.owner_id);return new;end$$;
-- PostgreSQL orders AFTER triggers alphabetically: the existing sporting projection runs first.
create trigger zz_friend_feed_updated after insert or update of payload on public.private_documents for each row execute function public.friend_feed_after_sync();
create function public.friend_feed_share(p_enabled boolean)returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();begin
 if p_enabled is null then raise exception 'INVALID_SHARING';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,110));
 insert into friend_feed_settings values(u,case when p_enabled then clock_timestamp()end)on conflict(owner_id)do update set enabled_since=case when p_enabled then coalesce(friend_feed_settings.enabled_since,clock_timestamp())else null end;
 perform friend_feed_project(u);return p_enabled;
end$$;
create function public.friend_activity_visible(p_id text)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from friend_activity a join friend_feed_settings s on s.owner_id=a.owner_id where a.id=p_id and a.active and s.enabled_since is not null and a.occurred_at>=s.enabled_since and social_friends(auth.uid(),a.owner_id));
$$;
create function public.friend_activity_data(p_id text,p_detail boolean default false)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'kind',a.kind,'username',p.username,'avatar_path',p.avatar_path,'at',a.occurred_at,'summary',case when p_detail then a.payload else a.payload-'exercises'end,
 'cheers',(select count(*)from friend_activity_cheers c where c.activity_id=a.id and social_friends(c.owner_id,a.owner_id)),
 'cheered',exists(select 1 from friend_activity_cheers c where c.activity_id=a.id and c.owner_id=auth.uid()))
 from friend_activity a join profiles p on p.id=a.owner_id where a.id=p_id and friend_activity_visible(a.id);
$$;
create function public.friend_feed(p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();off integer:=greatest(0,least(coalesce(p_offset,0),500));items jsonb;more boolean;begin
 select coalesce(jsonb_agg(friend_activity_data(x.id)order by x.occurred_at desc,x.id),'[]'::jsonb)into items from(select a.id,a.occurred_at from friend_activity a where a.active and a.occurred_at>now()-interval '30 days'and friend_activity_visible(a.id)order by a.occurred_at desc,a.id limit 20 offset off)x;
 select off<500 and exists(select 1 from friend_activity a where a.active and a.occurred_at>now()-interval '30 days'and friend_activity_visible(a.id)order by a.occurred_at desc,a.id offset off+20 limit 1)into more;
 return jsonb_build_object('items',items,'hasMore',more,'sharing',exists(select 1 from friend_feed_settings where owner_id=u and enabled_since is not null));
end$$;
create function public.friend_activity_detail(p_id text)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();r jsonb;begin r:=friend_activity_data(p_id,true);if r is null then raise exception 'ACTIVITY_UNAVAILABLE';end if;return r;end$$;
create function public.friend_activity_react(p_id text,p_cheer boolean)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin
 if p_cheer is null or not friend_activity_visible(p_id)then raise exception 'ACTIVITY_UNAVAILABLE';end if;
 if p_cheer then insert into friend_activity_cheers values(p_id,u)on conflict do nothing;else delete from friend_activity_cheers where activity_id=p_id and owner_id=u;end if;
 return friend_activity_data(p_id);
end$$;

-- Keep all existing score rules; add the user's exact row offset, including ties.
create or replace function public.community_rankings(p_variant text,p_kind text default 'charge',p_weight numeric default null,p_reps integer default null,p_offset integer default 0,p_limit integer default 25,p_friends boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare entries jsonb;records jsonb;total bigint;mine bigint;mine_offset bigint;cap integer:=greatest(1,least(coalesce(p_limit,25),50));off integer:=greatest(0,least(coalesce(p_offset,0),100000));
begin
 if p_kind not in ('charge','tonnage','repetitions') or p_kind='repetitions' and (p_weight is null or p_weight<0 or p_weight>1000000) or p_reps is not null and p_reps not between 1 and 10000 then raise exception 'INVALID_FILTER';end if;
 if not exists(select 1 from public.exercise_variants where id=p_variant and equipment in ('barbell','dumbbell','kettlebell')) then return jsonb_build_object('records','{}'::jsonb,'entries','[]'::jsonb,'total',0,'myRank',null,'notComparable',true);end if;
 -- Absolute load/tonnage cards remain independent of the exact-repetitions list filter.
 select coalesce(jsonb_object_agg(k.kind,k.card),'{}'::jsonb) into records from (
  select kinds.kind,(select jsonb_build_object('value',a.value,'reps',a.reps,'ownerId',a.owner_id,'username',p.username,'ties',(select count(*) from public.absolute_bests t where (not p_friends or t.owner_id=auth.uid() or public.social_friends(auth.uid(),t.owner_id)) and t.variant_id=p_variant and t.kind=kinds.kind and t.value=a.value)) from public.absolute_bests a join public.profiles p on p.id=a.owner_id where (not p_friends or a.owner_id=auth.uid() or public.social_friends(auth.uid(),a.owner_id)) and a.variant_id=p_variant and a.kind=kinds.kind order by a.value desc,p.username,a.owner_id limit 1) card from (values('charge'),('tonnage')) kinds(kind)
 ) k;
 with source as (
  select distinct on(owner_id) owner_id,case when p_kind='repetitions' then reps::numeric else weight end value,reps,id,performed_at
  from public.competition_performances where active and (not p_friends or owner_id=auth.uid() or public.social_friends(auth.uid(),owner_id)) and variant_id=p_variant and p_kind in ('charge','repetitions') and (p_kind<>'repetitions' or weight=p_weight) and (p_kind<>'charge' or p_reps is null or reps=p_reps)
  order by owner_id,(case when p_kind='repetitions' then reps::numeric else weight end) desc,reps desc,performed_at,id
 ),tonnages as(
  select owner_id,sum(tonnage) value,null::integer reps,null::uuid id,max(performed_at) performed_at,session_key from public.competition_performances where active and (not p_friends or owner_id=auth.uid() or public.social_friends(auth.uid(),owner_id)) and variant_id=p_variant and p_kind='tonnage' group by owner_id,session_key having count(*)=count(tonnage)
 ),tonnage_best as(select distinct on(owner_id) owner_id,value,reps,id,performed_at from tonnages order by owner_id,value desc,performed_at,session_key),all_source as(select * from source union all select * from tonnage_best),ranked as(select *,rank() over(order by value desc) rank from all_source),page as(
  select r.rank,r.value,r.reps,r.owner_id as "ownerId",r.id as "performanceId",r.performed_at,p.username,p.avatar_path from ranked r join public.profiles p on p.id=r.owner_id order by r.rank,p.username,r.owner_id limit cap offset off
 ) select coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),(select count(*) from ranked),(select rank from ranked where owner_id=auth.uid()),(select pos-1 from(select r.owner_id,row_number()over(order by r.rank,p.username,r.owner_id)pos from ranked r join public.profiles p on p.id=r.owner_id)ordered where owner_id=auth.uid()) into entries,total,mine,mine_offset;
 if p_weight is not null then
  with best as(select distinct on(owner_id) owner_id,reps,weight,id from public.competition_performances where active and (not p_friends or owner_id=auth.uid() or public.social_friends(auth.uid(),owner_id)) and variant_id=p_variant and weight=p_weight order by owner_id,reps desc,id),top as(select b.*,p.username from best b join public.profiles p on p.id=b.owner_id order by reps desc,p.username limit 1)
  select records||jsonb_build_object('repetitions',(select jsonb_build_object('value',reps,'reps',reps,'weight',weight,'username',username,'ownerId',owner_id,'ties',(select count(*) from best where reps=top.reps)) from top)) into records;
 end if;
 return jsonb_build_object('records',records,'entries',entries,'total',total,'myRank',mine,'myOffset',mine_offset,'offset',off,'limit',cap,'tonnageCoverage','Séries à convention et latéralité explicites uniquement','declared',true);
end $$;


create function public.community_rank_nearby(p_variant text,p_kind text default 'charge',p_weight numeric default null,p_reps integer default null,p_friends boolean default true)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();r jsonb;off integer;begin
 r:=community_rankings(p_variant,p_kind,p_weight,p_reps,0,4,p_friends);
 off:=greatest(0,least(coalesce((r->>'myOffset')::integer,0)-1,greatest(0,coalesce((r->>'total')::integer,0)-4)));
 if off>0 then r:=community_rankings(p_variant,p_kind,p_weight,p_reps,off,4,p_friends);end if;
 return r||jsonb_build_object('nearby',true);
end$$;
create or replace function public.community_capabilities()returns jsonb language sql stable as $$select '{"version":1,"friends":true,"badges":true,"goalChallenges":true,"friendFeed":true,"personalRankings":true}'::jsonb$$;
do $$declare f record;begin for f in select p.oid::regprocedure::text signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('friend_activity_entry_valid','friend_record_sessions','friend_feed_project','friend_feed_after_sync','friend_feed_share','friend_activity_visible','friend_activity_data','friend_feed','friend_activity_detail','friend_activity_react','community_rank_nearby')loop execute 'revoke all on function '||f.signature||' from public,anon,authenticated';end loop;end$$;
grant execute on function public.friend_feed(integer),public.friend_feed_share(boolean),public.friend_activity_detail(text),public.friend_activity_react(text,boolean),public.community_rank_nearby(text,text,numeric,integer,boolean)to authenticated;
notify pgrst,'reload schema';
commit;
