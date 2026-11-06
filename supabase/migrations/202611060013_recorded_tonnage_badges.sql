-- Personal badge tonnage follows recorded loads, including archived legacy history.
-- Competitive normalized loads, proofs, scores and private documents stay unchanged.
begin;
create table public.social_recorded_tonnage(
 owner_id uuid not null references public.profiles(id)on delete cascade,
 session_id text not null,started_at timestamptz not null,
 tonnage_kg numeric not null check(tonnage_kg>=0),excluded_sets integer not null check(excluded_sets>=0),
 legacy_history boolean not null,primary key(owner_id,session_id));
create index social_recorded_tonnage_owner_date on public.social_recorded_tonnage(owner_id,started_at);
alter table public.social_recorded_tonnage enable row level security;
revoke all on public.social_recorded_tonnage from public,anon,authenticated;
create function public.social_recorded_project(p_owner uuid,p_payload jsonb)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;st jsonb;piece jsonb;ident jsonb;dt timestamptz;en timestamptz;at_time timestamptz;
 as_of timestamptz:=clock_timestamp();seen jsonb;key text;ek text;unit text;w numeric;r numeric;dw numeric;dr numeric;
 total numeric;piece_total numeric;counted integer;excluded integer;legacy boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,107));
 delete from social_recorded_tonnage where owner_id=p_owner;
 for s in select value from(select distinct on(value->>'id')value,ord from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array'then p_payload->'sessions'else '[]'::jsonb end)with ordinality a(value,ord)order by value->>'id',ord desc)x loop
  if coalesce(s->>'id','')=''or coalesce(s->>'id'=p_payload->'active'->>'id',false)or s->>'status'in('abandoned','cancelled','canceled')or s->>'abandoned'='true'then continue;end if;
  begin dt:=(s->>'date')::timestamptz;en:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
  if dt is null or not isfinite(dt)or dt>as_of or en is not null and(not isfinite(en)or en<dt or en>as_of)then continue;end if;
  legacy:=en is null;total:=0;counted:=0;excluded:=0;seen:='{}'::jsonb;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)with ordinality a(value,ord)order by ord desc loop
   if coalesce(e->>'tracking','strength')in('cardio','mobility')then continue;end if;
   ek:=coalesce(nullif(e->>'instanceId',''),nullif(e->>'id',''));if ek is null then continue;end if;
   for st in select value from jsonb_array_elements(case when jsonb_typeof(e->'sets')='array'then e->'sets'else '[]'::jsonb end)with ordinality a(value,ord)order by ord desc loop
    if coalesce(st->>'id','')=''then continue;end if;
    key:=jsonb_build_array(ek,st->>'id')::text;if seen?key then continue;end if;seen:=seen||jsonb_build_object(key,true);
    if st->>'type'='warmup'or st->>'validated'='false'or coalesce(st->>'status','validated')not in('validated','completed')or jsonb_typeof(st->'w')is distinct from 'number'or jsonb_typeof(st->'r')is distinct from 'number'then continue;end if;
    w:=(st->>'w')::numeric;r:=(st->>'r')::numeric;if w<0 or w>1000000 or r<1 or r>10000 or r<>trunc(r)then continue;end if;
    at_time:=dt;begin if st->>'recordedAt'is not null then at_time:=(st->>'recordedAt')::timestamptz;end if;exception when others then continue;end;
    if at_time is null or not isfinite(at_time)or at_time<dt or at_time>as_of or en is not null and at_time>en then continue;end if;
    ident:=case when jsonb_typeof(st->'loadIdentity')='object'then st->'loadIdentity'when jsonb_typeof(e->'loadIdentity')='object'then e->'loadIdentity'else '{}'::jsonb end;
    unit:=lower(trim(coalesce(nullif(ident->>'unit',''),'kg')));
    if unit not in('kg','lb')then excluded:=excluded+1;continue;end if;
    piece_total:=w*r;
    for piece in select value from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array'then st->'drops'else '[]'::jsonb end)loop
     if piece->>'type'='warmup'or piece->>'validated'='false'or coalesce(piece->>'status','validated')not in('validated','completed')or jsonb_typeof(piece->'w')is distinct from 'number'or jsonb_typeof(piece->'r')is distinct from 'number'then continue;end if;
     dw:=(piece->>'w')::numeric;dr:=(piece->>'r')::numeric;
     if dw>=0 and dw<=1000000 and dr>=1 and dr<=10000 and dr=trunc(dr)then piece_total:=piece_total+dw*dr;end if;
    end loop;
    total:=total+piece_total*case when unit='lb'then 0.45359237 else 1 end;counted:=counted+1;
   end loop;
  end loop;
  if counted+excluded>0 then insert into social_recorded_tonnage values(p_owner,s->>'id',dt,total,excluded,legacy);end if;
 end loop;
end$$;
revoke all on function public.social_recorded_project(uuid,jsonb)from public,anon,authenticated;

create or replace function public.social_project(p_owner uuid,p_payload jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;st jsonb;piece jsonb;ident jsonb;dt timestamptz;en timestamptz;at_time timestamptz;factor numeric;v numeric;w numeric;r numeric;sk text;ek text;sid text;rev text;ton numeric;old_count integer;begin
 update social_facts set active=false where owner_id=p_owner;
 for s in select value from(select distinct on(value->>'id')value,ord from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array' then p_payload->'sessions' else '[]'::jsonb end)with ordinality a(value,ord)order by value->>'id',ord desc)x loop
 begin dt:=(s->>'date')::timestamptz;en:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
 if dt is null or en is null or en<dt or en>clock_timestamp() or s->>'id' is null or s->>'id'=p_payload->'active'->>'id' then continue;end if;
 sid:=s->>'id';
 for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array' then s->'exercises' else '[]'::jsonb end) loop
 ek:=coalesce(e->>'instanceId',e->>'id');if ek is null then continue;end if;
 for st in select value from jsonb_array_elements(case when jsonb_typeof(e->'sets')='array' then e->'sets' else '[]'::jsonb end) loop
 if st->>'type'='warmup' or st->>'validated'='false' or coalesce(st->>'status','validated') not in ('validated','completed') or jsonb_typeof(st->'w') is distinct from 'number' or jsonb_typeof(st->'r') is distinct from 'number' or st->>'id' is null then continue;end if;
 w:=(st->>'w')::numeric;r:=(st->>'r')::numeric;if w<0 or w>1000000 or r<1 or r>10000 or r<>trunc(r) then continue;end if;
 at_time:=dt;begin if st->>'recordedAt' is not null then at_time:=(st->>'recordedAt')::timestamptz;end if;exception when others then continue;end;
 if at_time<dt or at_time>en or at_time>clock_timestamp() then continue;end if;
 ident:=coalesce(st->'loadIdentity',e->'loadIdentity',jsonb_build_object('convention',coalesce(e->>'convention',''),'unit','kg','lateralMode','unknown'));
 factor:=null;
 if coalesce(e->>'equipment','')<>'bodyweight' and coalesce(ident->>'convention','') !~* 'assist|poids du corps|bodyweight' and ident->>'version'='1' and ident->>'source' in ('entry','preset','confirmed') and ident->>'unit' in ('kg','lb') and coalesce(ident->>'convention','')<>'' and ident->>'convention' !~* 'préciser|inconnu|ambigu|valeur indiquée' then
 if ident->>'lateralMode' in ('one-side','alternating-total') or ident->>'lateralMode'='total' and ident->>'convention' !~* 'haltère|par côté' then factor:=1;
 elsif ident->>'lateralMode' in ('simultaneous-pair','both-sides') and ident->>'convention' ~* 'haltère|par côté' then factor:=2;end if;end if;
 ton:=w*r;
 for piece in select value from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array' then st->'drops' else '[]'::jsonb end) loop
 if jsonb_typeof(piece->'w')='number' and jsonb_typeof(piece->'r')='number' and (piece->>'w')::numeric>=0 and (piece->>'r')::numeric>0 and trunc((piece->>'r')::numeric)=(piece->>'r')::numeric and coalesce(piece->>'validated','true')<>'false' then ton:=ton+(piece->>'w')::numeric*(piece->>'r')::numeric;end if;end loop;
 ton:=ton*factor*case when ident->>'unit'='lb' then 0.45359237 else 1 end;
 sk:=st->>'id';rev:=md5(jsonb_build_array(s->>'date',en,e->>'id',ident,w,r,ton,at_time)::text);
 insert into social_facts(owner_id,session_id,exercise_id,set_id,identity_key,label,identity,started_at,ended_at,performed_at,weight,reps,tonnage,revision,order_reliable)
 values(p_owner,sid,ek,sk,case when ident->>'convention' !~* 'préciser|inconnu|ambigu|valeur indiquée' and coalesce(ident->>'convention','')<>'' then md5(jsonb_build_array(e->>'id',ident->>'unit',ident->>'convention',ident->>'lateralMode')::text) else null end,left(coalesce(e->>'name','Exercice'),200),ident,dt,en,at_time,w,r::integer,ton,rev,length(s->>'date')>10)
 on conflict(owner_id,session_id,exercise_id,set_id) do update set identity_key=excluded.identity_key,label=excluded.label,identity=excluded.identity,started_at=excluded.started_at,ended_at=excluded.ended_at,performed_at=excluded.performed_at,weight=excluded.weight,reps=excluded.reps,tonnage=excluded.tonnage,active=true,order_reliable=excluded.order_reliable,changed_at=case when social_facts.revision<>excluded.revision then clock_timestamp() else social_facts.changed_at end,revision=excluded.revision;
 end loop;end loop;end loop;
 perform social_recorded_project(p_owner,p_payload);
end$$;

create function public.social_comparable_metrics(p_owner uuid) returns table(day date,sessions numeric,work_sets numeric,tonnage_kg numeric,pr_events numeric,pr_exercise_identities numeric,active_weeks numeric,active_week_streak numeric,personal_challenges_completed numeric,shared_challenges_completed numeric) language sql stable security definer set search_path=public,pg_temp as $$
with facts as(select *, (started_at at time zone social_timezone(p_owner))::date d from social_facts where owner_id=p_owner and active),
 days as(select d,count(distinct session_id) real_sessions,count(*) sets,sum(coalesce(tonnage,0)) ton from facts group by d),
 exercise_sessions as(select identity_key,session_id,min(started_at) started,max(ended_at) ended,max(weight) w,sum(tonnage) ton,count(*)=count(tonnage) complete from facts where identity_key is not null and order_reliable group by identity_key,session_id),
 prs as(select x.* from exercise_sessions x where exists(select 1 from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and (old.started at time zone social_timezone(p_owner))::date<>(x.started at time zone social_timezone(p_owner))::date) and not exists(select 1 from exercise_sessions other where other.identity_key=x.identity_key and other.session_id<>x.session_id and other.started=x.started) and
 (x.w>(select max(old.w) from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started) or x.complete and x.ton>(select max(old.ton) from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and old.complete) or exists(select 1 from facts f where f.identity_key=x.identity_key and f.session_id=x.session_id and f.reps>(select max(o.reps) from facts o where o.identity_key=f.identity_key and o.weight=f.weight and o.started_at<x.started)))),
 weeks as(select distinct date_trunc('week',d::timestamp)::date w from days),islands as(select w,w-7*row_number()over(order by w)::integer grp from weeks),runs as(select w,row_number()over(partition by grp order by w)run from islands),
 credits as(select g.*,case when mode='personal' then owner_id::text else least(owner_id,target_id)::text||greatest(owner_id,target_id)::text end pair,(deadline at time zone timezone)::date finish from goal_challenges g where p_owner in (owner_id,coalesce(target_id,owner_id)) and goal_won(g.id,p_owner)),
 dates as(select d from days union select finish from credits)
 select d,case when exists(select 1 from days where days.d=dates.d)then 1 else 0 end::numeric,coalesce((select sets from days where days.d=dates.d),0)::numeric,coalesce((select ton from days where days.d=dates.d),0),
 (select count(*) from prs where (started at time zone social_timezone(p_owner))::date=dates.d)::numeric,
 (select count(distinct identity_key) from prs where (started at time zone social_timezone(p_owner))::date<=dates.d)::numeric,
 (select count(*) from weeks where w<=dates.d)::numeric,
 coalesce((select max(run) from runs where w<=dates.d),0)::numeric,
 (select count(distinct finish) from credits where mode='personal' and finish=dates.d)::numeric,
 (select count(distinct pair) from credits where mode<>'personal' and finish=dates.d)::numeric from dates order by d
$$;

revoke all on function public.social_comparable_metrics(uuid)from public,anon,authenticated;
create or replace function public.social_metrics(p_owner uuid) returns table(day date,sessions numeric,work_sets numeric,tonnage_kg numeric,pr_events numeric,pr_exercise_identities numeric,active_weeks numeric,active_week_streak numeric,personal_challenges_completed numeric,shared_challenges_completed numeric)
language sql stable security definer set search_path=public,pg_temp as $$
 with recorded as(select(started_at at time zone social_timezone(p_owner))::date d,sum(t.tonnage_kg)ton from social_recorded_tonnage t where owner_id=p_owner group by 1)
 select coalesce(m.day,t.d),coalesce(m.sessions,0),coalesce(m.work_sets,0),coalesce(t.ton,0),coalesce(m.pr_events,0),coalesce(m.pr_exercise_identities,0),coalesce(m.active_weeks,0),coalesce(m.active_week_streak,0),coalesce(m.personal_challenges_completed,0),coalesce(m.shared_challenges_completed,0)
 from social_comparable_metrics(p_owner)m full outer join recorded t on t.d=m.day order by 1
$$;
create or replace function public.social_profile(p_username text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid;p jsonb;begin
 select id into u from profiles where username=p_username::citext;if u is null then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,107));perform social_refresh_badges(u);
 select jsonb_build_object('id',u,'badges',coalesce((select jsonb_agg(to_jsonb(x))from(select badge_id,min(earned_at)earned_at,count(*)occurrences from badge_occurrences where owner_id=u group by badge_id)x),'[]'::jsonb),'featured',coalesce((select jsonb_agg(badge_id order by slot)from featured_badges where owner_id=u),'[]'::jsonb),
 'currentStreak',social_current_streak(u),'totals',(select jsonb_build_object('sessions',coalesce(sum(sessions),0),'work_sets',coalesce(sum(work_sets),0),'tonnage_kg',coalesce(sum(tonnage_kg),0),'pr_events',coalesce(sum(pr_events),0),'personal_challenges_completed',coalesce(sum(personal_challenges_completed),0),'shared_challenges_completed',coalesce(sum(shared_challenges_completed),0),'pr_exercise_identities',coalesce(max(pr_exercise_identities),0),'active_weeks',coalesce(max(active_weeks),0),'active_week_streak',coalesce(max(active_week_streak),0))from social_metrics(u)),
 'week',(select jsonb_build_object('sessions',coalesce(sum(sessions),0),'work_sets',coalesce(sum(work_sets),0),'tonnage_kg',coalesce(sum(tonnage_kg),0))from social_metrics(u)where day>=date_trunc('week',now()at time zone social_timezone(u))::date),
 'tonnageBasis','recorded-loads','excludedSets',(select coalesce(sum(excluded_sets),0)from social_recorded_tonnage where owner_id=u)) into p;return p;end$$;

-- Rebuild only the personal recorded-load summaries and badge ledger.
do $$declare d record;begin for d in select owner_id,payload from public.private_documents loop perform social_recorded_project(d.owner_id,d.payload);perform social_refresh_badges(d.owner_id);end loop;end$$;
notify pgrst,'reload schema';
commit;
