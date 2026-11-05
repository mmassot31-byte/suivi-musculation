-- Additive upgrade after 202611040001 / 002 / 003. No private document is rewritten.
-- Apply in SQL Editor only after a database backup; application probes capabilities.
begin;
alter table public.exercise_variants add column if not exists comparison_version integer not null default 1 check(comparison_version>=1);
-- Tokens use PostgreSQL UUID randomness and built-in SHA-256; no extension-schema assumption.
create table if not exists public.competition_performances (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 session_key text not null, exercise_key text not null, set_key text not null, segment integer not null,
 variant_id text not null references public.exercise_variants(id),
 exercise_label text not null, convention text not null,
 performed_at timestamptz not null, weight numeric not null check(weight between 0 and 1000000),
 reps integer not null check(reps between 1 and 10000),
 tonnage numeric, content_revision text not null,
 first_received_at timestamptz not null default clock_timestamp(),
 changed_at timestamptz not null default clock_timestamp(),
 active boolean not null default true, sync_marker uuid not null,
 unique(owner_id,session_key,exercise_key,set_key,segment)
);
create index if not exists competition_variant_weight on public.competition_performances(variant_id,weight,reps desc,owner_id) where active;
create index if not exists competition_owner_date on public.competition_performances(owner_id,performed_at desc) where active;
create index if not exists competition_variant_session on public.competition_performances(variant_id,owner_id,session_key) where active;
alter table public.competition_performances enable row level security;
-- Access only through bounded functions. Raw keys, revision and provenance stay private.
revoke all on public.competition_performances from public,anon,authenticated;

create table if not exists public.training_challenges (
 id uuid primary key default gen_random_uuid(),
 initiator_id uuid not null references public.profiles(id),
 target_id uuid not null references public.profiles(id),
 reference_id uuid not null references public.competition_performances(id),
 reference_revision text not null,
 variant_id text not null references public.exercise_variants(id),
 convention text not null, weight numeric not null, reference_reps integer not null,
 days integer not null check(days in (7,14)),
 created_at timestamptz not null default clock_timestamp(),
 invite_expires_at timestamptz not null default (clock_timestamp()+interval '7 days'),
 accepted_at timestamptz, deadline timestamptz,
 response text not null default 'pending' check(response in ('pending','accepted','declined','revoked')),
 token_hash text not null unique, token_used_at timestamptz,
 parent_id uuid references public.training_challenges(id),
 check(initiator_id<>target_id)
);
create index if not exists challenge_inbox on public.training_challenges(target_id,created_at desc);
create index if not exists challenge_outbox on public.training_challenges(initiator_id,created_at desc);
alter table public.training_challenges enable row level security;
revoke all on public.training_challenges from public,anon,authenticated;

-- Deterministic replacement of the sporting projection after each CAS-confirmed sync.
-- Tombstones preserve first server receipt across correction, deletion and reimport.
create or replace function public.rebuild_competition(p_owner uuid,p_payload jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;st jsonb;part jsonb;binding jsonb;identity jsonb;v public.exercise_variants%rowtype;
 marker uuid:=gen_random_uuid();sid text;eid text;sk text;conv text;unit text;mode text;dt timestamptz;
 ei integer;si integer;di integer;w numeric;r numeric;factor numeric;total numeric;revision text;ended timestamptz;set_time timestamptz;
begin
 for s in select value from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array' then p_payload->'sessions' else '[]'::jsonb end) loop
  if s->>'id' is null or jsonb_typeof(s->'exercises')<>'array' then continue;end if;
  begin dt:=(s->>'date')::timestamptz;ended:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
  if ended is null or ended<dt or ended>clock_timestamp()+interval '5 minutes' or s->>'id'=p_payload->'active'->>'id' then continue;end if;
  if dt is null or dt>clock_timestamp()+interval '5 minutes' then continue;end if;
  sid:=md5(s->>'id');ei:=0;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   ei:=ei+1;if jsonb_typeof(e->'sets')<>'array' then continue;end if;
   eid:=md5(coalesce(e->>'instanceId','exercise-'||ei));si:=0;
   for st in select value from jsonb_array_elements(e->'sets') loop
    si:=si+1;if coalesce(st->>'type','work')<>'work' then continue;end if;
    if st->>'status' is not null and st->>'status' not in ('validated','completed') then continue;end if;
    identity:=st->'loadIdentity';conv:=coalesce(identity->>'convention',e->>'convention','Inconnue');unit:=coalesce(identity->>'unit','kg');
    -- No inference from the display name, and never convert pounds into a kg competition.
    if unit<>'kg' then continue;end if;
    v:=null;binding:=null;
    if jsonb_typeof(p_payload->'publicVariantBindings')='array' then
     select x into binding from jsonb_array_elements(p_payload->'publicVariantBindings') x where x->>'exerciseId'=e->>'id' and x->>'convention'=conv and x->>'confirmed'='true' limit 1;
     if binding is not null then select * into v from public.exercise_variants where id=binding->>'variantId' and convention=conv;end if;
    end if;
    if v.id is null then select ev.* into v from public.variant_aliases a join public.exercise_variants ev on ev.id=a.variant_id where a.exercise_id=e->>'id' and a.convention=conv;end if;
    if v.id is null or v.equipment not in ('barbell','dumbbell','kettlebell') then continue;end if;
    -- Existing dumbbell variants describe bilateral simultaneous work. Other sides need their own canonical variant.
    if v.equipment='dumbbell' and coalesce(identity->>'lateralMode','unknown')<>'simultaneous-pair' then continue;end if;
    set_time:=dt;
    if st->>'recordedAt' is not null then begin set_time:=(st->>'recordedAt')::timestamptz;exception when others then continue;end;end if;
    if set_time<dt or set_time>ended or set_time>clock_timestamp()+interval '5 minutes' then continue;end if;
    sk:=md5(coalesce(st->>'id','set-'||si));di:=0;mode:=identity->>'lateralMode';factor:=null;
    if identity->>'version'='1' then
     if conv in ('Total','Charge totale') and mode='total' then factor:=1;
     elsif conv in ('Par haltère','Par côté') and mode in ('one-side','alternating-total') then factor:=1;
     elsif conv in ('Par haltère','Par côté') and mode in ('simultaneous-pair','both-sides') then factor:=2;end if;
    end if;
    if exists(select 1 from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array' then st->'drops' else '[]'::jsonb end) d where jsonb_typeof(d->'w') is distinct from 'number' or jsonb_typeof(d->'r') is distinct from 'number') then factor:=null;end if;
    for part in select st union all select value from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array' then st->'drops' else '[]'::jsonb end) loop
     if jsonb_typeof(part->'w')='number' and jsonb_typeof(part->'r')='number' then
      w:=(part->>'w')::numeric;r:=(part->>'r')::numeric;
      if w>=0 and w<=1000000 and r between 1 and 10000 and r=trunc(r) then
       total:=case when factor is not null then factor*w*r else null end;
       revision:=md5(jsonb_build_array(v.id,v.comparison_version,conv,unit,mode,w,r,set_time)::text);
       insert into public.competition_performances(owner_id,session_key,exercise_key,set_key,segment,variant_id,exercise_label,convention,performed_at,weight,reps,tonnage,content_revision,sync_marker)
       values(p_owner,sid,eid,sk,di,v.id,left(coalesce(e->>'name','Exercice'),200),conv,set_time,w,r::integer,total,revision,marker)
       on conflict(owner_id,session_key,exercise_key,set_key,segment) do update set
        variant_id=excluded.variant_id,exercise_label=excluded.exercise_label,convention=excluded.convention,performed_at=excluded.performed_at,
        weight=excluded.weight,reps=excluded.reps,tonnage=excluded.tonnage,
        changed_at=case when competition_performances.content_revision is distinct from excluded.content_revision or not competition_performances.active then clock_timestamp() else competition_performances.changed_at end,
        content_revision=excluded.content_revision,active=true,sync_marker=marker;
      end if;
     end if;di:=di+1;
    end loop;
   end loop;
  end loop;
 end loop;
 update public.competition_performances set active=false,changed_at=clock_timestamp() where owner_id=p_owner and sync_marker<>marker and active;
 -- The old projector is called inside the same transaction. Remove active rows before commit.
 delete from public.performances where owner_id=p_owner and not completed;
 delete from public.absolute_bests where owner_id=p_owner;delete from public.rep_bests where owner_id=p_owner;
 insert into public.rep_bests select distinct on(variant_id,reps) variant_id,p_owner,reps,weight,session_key,performed_at from public.competition_performances where owner_id=p_owner and active order by variant_id,reps,weight desc,performed_at,id;
 insert into public.absolute_bests select distinct on(variant_id) variant_id,'charge',p_owner,weight,reps,session_key,performed_at from public.competition_performances where owner_id=p_owner and active order by variant_id,weight desc,reps desc,performed_at,id;
 insert into public.absolute_bests select distinct on(variant_id) t.variant_id,'tonnage',p_owner,t.total,null,t.session_key,t.performed_at from (
  select variant_id,session_key,max(performed_at) performed_at,sum(tonnage) total from public.competition_performances where owner_id=p_owner and active group by variant_id,session_key having count(*)=count(tonnage)
 ) t order by t.variant_id,t.total desc,t.performed_at,t.session_key;
end $$;
revoke all on function public.rebuild_competition(uuid,jsonb) from public,anon,authenticated;
create or replace function public.competition_after_sync() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin perform public.rebuild_competition(new.owner_id,new.payload);return new;end $$;
revoke all on function public.competition_after_sync() from public,anon,authenticated;
drop trigger if exists competition_projection_updated on public.private_documents;
create trigger competition_projection_updated after update of payload on public.private_documents for each row execute function public.competition_after_sync();
-- One-time/backfill is repeatable and preserves immutable provenance.
do $$declare d record;begin for d in select owner_id,payload from public.private_documents loop perform public.rebuild_competition(d.owner_id,d.payload);end loop;end$$;
revoke select on public.performances from anon,authenticated;

create or replace function public.competition_capabilities() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select jsonb_build_object('version',1,'challenges',true,'completedOnly',true,'provenance','first-server-receipt','tonnage','explicit-load-identity')$$;
revoke all on function public.competition_capabilities() from public;grant execute on function public.competition_capabilities() to anon,authenticated;

create or replace function public.competition_rankings(p_variant text,p_kind text default 'charge',p_weight numeric default null,p_reps integer default null,p_offset integer default 0,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare entries jsonb;records jsonb;total bigint;mine bigint;cap integer:=greatest(1,least(coalesce(p_limit,25),50));off integer:=greatest(0,least(coalesce(p_offset,0),100000));
begin
 if p_kind not in ('charge','tonnage','repetitions') or p_kind='repetitions' and (p_weight is null or p_weight<0 or p_weight>1000000) or p_reps is not null and p_reps not between 1 and 10000 then raise exception 'INVALID_FILTER';end if;
 if not exists(select 1 from public.exercise_variants where id=p_variant and equipment in ('barbell','dumbbell','kettlebell')) then return jsonb_build_object('records','{}'::jsonb,'entries','[]'::jsonb,'total',0,'myRank',null,'notComparable',true);end if;
 -- Absolute load/tonnage cards remain independent of the exact-repetitions list filter.
 select coalesce(jsonb_object_agg(k.kind,k.card),'{}'::jsonb) into records from (
  select kinds.kind,(select jsonb_build_object('value',a.value,'reps',a.reps,'ownerId',a.owner_id,'username',p.username,'ties',(select count(*) from public.absolute_bests t where t.variant_id=p_variant and t.kind=kinds.kind and t.value=a.value)) from public.absolute_bests a join public.profiles p on p.id=a.owner_id where a.variant_id=p_variant and a.kind=kinds.kind order by a.value desc,p.username,a.owner_id limit 1) card from (values('charge'),('tonnage')) kinds(kind)
 ) k;
 with source as (
  select distinct on(owner_id) owner_id,case when p_kind='repetitions' then reps::numeric else weight end value,reps,id,performed_at
  from public.competition_performances where active and variant_id=p_variant and p_kind in ('charge','repetitions') and (p_kind<>'repetitions' or weight=p_weight) and (p_kind<>'charge' or p_reps is null or reps=p_reps)
  order by owner_id,(case when p_kind='repetitions' then reps::numeric else weight end) desc,reps desc,performed_at,id
 ),tonnages as(
  select owner_id,sum(tonnage) value,null::integer reps,null::uuid id,max(performed_at) performed_at,session_key from public.competition_performances where active and variant_id=p_variant and p_kind='tonnage' group by owner_id,session_key having count(*)=count(tonnage)
 ),tonnage_best as(select distinct on(owner_id) owner_id,value,reps,id,performed_at from tonnages order by owner_id,value desc,performed_at,session_key),all_source as(select * from source union all select * from tonnage_best),ranked as(select *,rank() over(order by value desc) rank from all_source),page as(
  select r.rank,r.value,r.reps,r.owner_id as "ownerId",r.id as "performanceId",r.performed_at,p.username,p.avatar_path from ranked r join public.profiles p on p.id=r.owner_id order by r.rank,p.username,r.owner_id limit cap offset off
 ) select coalesce((select jsonb_agg(to_jsonb(page)) from page),'[]'::jsonb),(select count(*) from ranked),(select rank from ranked where owner_id=auth.uid()) into entries,total,mine;
 if p_weight is not null then
  with best as(select distinct on(owner_id) owner_id,reps,weight,id from public.competition_performances where active and variant_id=p_variant and weight=p_weight order by owner_id,reps desc,id),top as(select b.*,p.username from best b join public.profiles p on p.id=b.owner_id order by reps desc,p.username limit 1)
  select records||jsonb_build_object('repetitions',(select jsonb_build_object('value',reps,'reps',reps,'weight',weight,'username',username,'ownerId',owner_id,'ties',(select count(*) from best where reps=top.reps)) from top)) into records;
 end if;
 return jsonb_build_object('records',records,'entries',entries,'total',total,'myRank',mine,'offset',off,'limit',cap,'tonnageCoverage','Séries à convention et latéralité explicites uniquement','declared',true);
end $$;
revoke all on function public.competition_rankings(text,text,numeric,integer,integer,integer) from public;grant execute on function public.competition_rankings(text,text,numeric,integer,integer,integer) to anon,authenticated;

-- Legacy public RPCs now read only completed, confirmed, compatible sporting data.
create or replace function public.rankings(p_variant text,p_kind text default 'charge',p_reps integer default null,p_offset integer default 0,p_limit integer default 25,p_ties boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare result jsonb;begin
 result:=public.competition_rankings(p_variant,p_kind,null,case when p_ties then null else p_reps end,p_offset,p_limit);
 if p_ties then result:=jsonb_set(result,'{entries}',coalesce((select jsonb_agg(x) from jsonb_array_elements(result->'entries') x where (x->>'rank')::bigint=1),'[]'::jsonb));end if;return result;
end $$;
create or replace function public.sport_profile(p_username text,p_offset integer default 0,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare person public.profiles%rowtype;recent jsonb;records jsonb;
begin select * into person from public.profiles where username=p_username::citext;if not found then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into recent from (select exercise_label,convention,variant_id,performed_at,weight,reps,true completed,segment from public.competition_performances where owner_id=person.id and active order by performed_at desc,id limit greatest(1,least(coalesce(p_limit,20),50)) offset greatest(0,least(coalesce(p_offset,0),100000))) r;
 select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into records from (select a.variant_id,v.label exercise_label,v.convention,a.value weight,a.reps,(select b.value from public.absolute_bests b where b.owner_id=a.owner_id and b.variant_id=a.variant_id and b.kind='tonnage') tonnage from public.absolute_bests a join public.exercise_variants v on v.id=a.variant_id where a.owner_id=person.id and a.kind='charge' order by v.label limit 50) r;
 return jsonb_build_object('id',person.id,'username',person.username,'avatar_path',person.avatar_path,'records',records,'recent',recent,'offset',p_offset,'completedOnly',true);
end $$;

create or replace function public.competition_user(p_username text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select jsonb_build_object('id',id,'username',username) from public.profiles where username=p_username::citext$$;
revoke all on function public.competition_user(text) from public;grant execute on function public.competition_user(text) to anon,authenticated;
create or replace function public.competition_candidates() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select c.id,c.variant_id,c.exercise_label,c.convention,c.weight,c.reps,c.performed_at from public.competition_performances c where owner_id=auth.uid() and active and segment=0 order by performed_at desc,id limit 100) r),'[]'::jsonb);
end $$;
revoke all on function public.competition_candidates() from public;grant execute on function public.competition_candidates() to authenticated;

create or replace function public.challenge_create(p_performance uuid,p_target uuid,p_days integer default 7) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$declare r public.competition_performances%rowtype;token text;identifier uuid;expires timestamptz;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_days is null or p_days not in (7,14) or p_target is null or p_target=auth.uid() or not exists(select 1 from public.profiles where id=p_target) then raise exception 'INVALID_INVITATION';end if;
 select * into r from public.competition_performances where id=p_performance and owner_id=auth.uid() and active and segment=0 for share;
 if not found then raise exception 'INADMISSIBLE_REFERENCE';end if;
 -- Bounded per-account invitation rate, checked under an account-scoped lock.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,104));
 select id,invite_expires_at into identifier,expires from public.training_challenges where initiator_id=auth.uid() and target_id=p_target and reference_id=p_performance and reference_revision=r.content_revision and days=p_days and response='pending' and invite_expires_at>clock_timestamp() order by created_at desc limit 1;
 if identifier is not null then return jsonb_build_object('id',identifier,'token',null,'inviteExpiresAt',expires,'alreadyExists',true);end if;
 if (select count(*) from public.training_challenges where initiator_id=auth.uid() and created_at>clock_timestamp()-interval '1 day')>=30 then raise exception 'INVITATION_LIMIT';end if;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.training_challenges(initiator_id,target_id,reference_id,reference_revision,variant_id,convention,weight,reference_reps,days,token_hash)
 values(auth.uid(),p_target,r.id,r.content_revision,r.variant_id,r.convention,r.weight,r.reps,p_days,encode(sha256(convert_to(token,'UTF8')),'hex')) returning id,invite_expires_at into identifier,expires;
 return jsonb_build_object('id',identifier,'token',token,'inviteExpiresAt',expires);
end $$;
revoke all on function public.challenge_create(uuid,uuid,integer) from public;grant execute on function public.challenge_create(uuid,uuid,integer) to authenticated;

create or replace function public.challenge_respond(p_id uuid,p_accept boolean) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$declare c public.training_challenges%rowtype;accepted timestamptz:=clock_timestamp();begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into c from public.training_challenges where id=p_id and target_id=auth.uid() for update;if not found then raise exception 'CHALLENGE_NOT_FOUND';end if;
 if c.response='accepted' and p_accept then return jsonb_build_object('id',c.id,'status','active','deadline',c.deadline);end if;
 if p_accept is null or c.response<>'pending' or c.invite_expires_at<=accepted then raise exception 'INVITATION_EXPIRED_OR_USED';end if;
 if not exists(select 1 from public.competition_performances where id=c.reference_id and active and content_revision=c.reference_revision) then raise exception 'REFERENCE_INVALIDATED';end if;
 update public.training_challenges set response=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then accepted else null end,deadline=case when p_accept then accepted+make_interval(days=>c.days) else null end,token_used_at=accepted where id=c.id;
 return jsonb_build_object('id',c.id,'status',case when p_accept then 'active' else 'declined' end,'deadline',case when p_accept then accepted+make_interval(days=>c.days) else null end);
end $$;
revoke all on function public.challenge_respond(uuid,boolean) from public;grant execute on function public.challenge_respond(uuid,boolean) to authenticated;

create or replace function public.challenge_redeem(p_token text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare identifier uuid;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_TOKEN';end if;
 select id into identifier from public.training_challenges where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and target_id=auth.uid() and response='pending' and token_used_at is null and invite_expires_at>clock_timestamp() for update;
 if not found then raise exception 'INVALID_TOKEN';end if;
 return public.challenge_respond(identifier,true);
end $$;
revoke all on function public.challenge_redeem(text) from public;grant execute on function public.challenge_redeem(text) to authenticated;

create or replace function public.challenge_revoke(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 update public.training_challenges set response='revoked',token_used_at=clock_timestamp() where id=p_id and initiator_id=auth.uid() and response='pending';
 if not found then raise exception 'CHALLENGE_NOT_REVOCABLE';end if;return jsonb_build_object('id',p_id,'status','revoked');
end $$;
revoke all on function public.challenge_revoke(uuid) from public;grant execute on function public.challenge_revoke(uuid) to authenticated;

create or replace function public.challenge_list() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare answer jsonb;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 with visible as(select c.*,a.username initiator,b.username target,v.label,exists(select 1 from public.competition_performances r where r.id=c.reference_id and r.active and r.content_revision=c.reference_revision) valid_reference,
  (select max(p.reps) from public.competition_performances p where p.owner_id=c.target_id and p.active and p.segment=0 and p.variant_id=c.variant_id and p.convention=c.convention and p.weight=c.weight and p.performed_at>=c.accepted_at and p.performed_at<=c.deadline and p.first_received_at>=c.accepted_at and p.first_received_at<=c.deadline and p.changed_at<=c.deadline) best
  from public.training_challenges c join public.profiles a on a.id=c.initiator_id join public.profiles b on b.id=c.target_id join public.exercise_variants v on v.id=c.variant_id where c.initiator_id=auth.uid() or c.target_id=auth.uid() order by c.created_at desc limit 100),serialized as(
  select jsonb_build_object('id',id,'variantId',variant_id,'label',label,'convention',convention,'weight',weight,'referenceReps',reference_reps,'initiatorId',initiator_id,'targetId',target_id,'initiator',initiator,'target',target,'days',days,
   'status',case when response in ('revoked','declined') then response when not valid_reference then 'invalid' when response='pending' and invite_expires_at<=now() then 'expired' when response='pending' then 'pending' when deadline>now() then 'active' else 'completed' end,
   'acceptedAt',accepted_at,'deadline',deadline,'inviteExpiresAt',invite_expires_at,'bestReps',best,'result',case when response<>'accepted' or not valid_reference then null when best>reference_reps then 'win' when best=reference_reps then 'tie' else 'not_reached' end,
   'provisional',response='accepted' and deadline>now(),'canRespond',response='pending' and invite_expires_at>now() and target_id=auth.uid() and valid_reference,'canRevoke',response='pending' and initiator_id=auth.uid()) item from visible
 ) select coalesce(jsonb_agg(item),'[]'::jsonb) into answer from serialized;return answer;
end $$;
revoke all on function public.challenge_list() from public;grant execute on function public.challenge_list() to authenticated;

create or replace function public.challenge_rematch(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare c public.training_challenges%rowtype;reference uuid;result jsonb;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into c from public.training_challenges where id=p_id and (initiator_id=auth.uid() or target_id=auth.uid());if not found then raise exception 'CHALLENGE_NOT_FOUND';end if;
 if c.response='pending' and c.invite_expires_at>clock_timestamp() or c.response='accepted' and c.deadline>clock_timestamp() then raise exception 'CHALLENGE_NOT_FINISHED';end if;
 select id into reference from public.competition_performances where owner_id=auth.uid() and active and segment=0 and variant_id=c.variant_id and weight=c.weight order by reps desc,performed_at desc,id limit 1;
 if reference is null then raise exception 'NO_COMPARABLE_REFERENCE';end if;
 result:=public.challenge_create(reference,case when auth.uid()=c.initiator_id then c.target_id else c.initiator_id end,c.days);
 update public.training_challenges set parent_id=p_id where id=(result->>'id')::uuid;return result;
end $$;
revoke all on function public.challenge_rematch(uuid) from public;grant execute on function public.challenge_rematch(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
