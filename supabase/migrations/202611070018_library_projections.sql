-- Versioned load conventions and canonical links. Historical numeric entries stay untouched.
begin;
create function public.exercise_library_set_factor(p_set jsonb)returns numeric language sql immutable set search_path=public,pg_temp as $$select case when coalesce(p_set->>'loadProtocol','')<>'elan-2'then 1 when coalesce(p_set->>'loadMode','')not in('bilateral','unilateral')or coalesce(p_set->>'measurement','')not in('external_load','added_load','assistance','bodyweight','duration')then null when p_set->>'measurement'in('assistance','bodyweight','duration')then 0 when p_set->>'loadMode'='unilateral'then 2 else 1 end$$;
create function public.exercise_library_projection_payload(p_payload jsonb)returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;entry jsonb;source jsonb;groups jsonb;ordering text[];k text;field text;exercises jsonb;sessions jsonb:='[]';idx integer;begin
 for s in select value from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array'then p_payload->'sessions'else '[]'::jsonb end)loop
  exercises:='[]';idx:=0;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)loop
   idx:=idx+1;groups:='{}';ordering:=array[]::text[];
   foreach field in array array['sets','activityEntries']loop
    for entry in select value from jsonb_array_elements(case when jsonb_typeof(e->field)='array'then e->field else '[]'::jsonb end)loop
     source:=(e||case when jsonb_typeof(entry->'exerciseReference')='object'then entry->'exerciseReference'else '{}'::jsonb end)-'sets'-'activityEntries';k:=md5(source::text);
     if not groups?k then groups:=groups||jsonb_build_object(k,source||jsonb_build_object('sets','[]'::jsonb,'activityEntries','[]'::jsonb,'_libraryExerciseIndex',idx));ordering:=array_append(ordering,k);end if;
     groups:=jsonb_set(groups,array[k,field],(groups->k->field)||jsonb_build_array(entry));
    end loop;
   end loop;
   if cardinality(ordering)=0 then exercises:=exercises||jsonb_build_array(e||jsonb_build_object('_libraryExerciseIndex',idx));else foreach k in array ordering loop exercises:=exercises||jsonb_build_array(groups->k);end loop;end if;
  end loop;
  sessions:=sessions||jsonb_build_array(s||jsonb_build_object('exercises',exercises));
 end loop;
 return jsonb_set(p_payload,'{sessions}',sessions);
end$$;
create function public.exercise_library_reference(p_owner uuid,p_exercise jsonb)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare d jsonb;key text;begin
 if p_exercise->>'libraryScope'='personal'then
  select definition into d from personal_exercises where owner_id=p_owner and id=p_exercise->>'libraryId';return coalesce(d,jsonb_build_object('id',p_exercise->>'libraryId','libraryScope','personal'));
 end if;
 if p_exercise->>'libraryScope'='common'and p_exercise->>'libraryId'is not null then
  select definition into d from common_exercises where id=p_exercise->>'libraryId';
  if d is null then select c.definition into d from exercise_creation_requests r join common_exercises c on c.id=r.common_id where r.owner_id=p_owner and r.request_id=p_exercise->>'libraryId';end if;
  if d is not null then return d;end if;
 end if;
 key:=exercise_library_legacy_key(p_exercise);
 select x.definition into d from exercise_legacy_references r join personal_exercises x on x.owner_id=p_owner and x.id=r.library_id where r.owner_id=p_owner and r.legacy_id=p_exercise->>'id'and r.definition_key=key and r.scope='personal';if d is not null then return d;end if;
 key:=exercise_library_shared_match(p_exercise);select definition into d from common_exercises where id=key;return coalesce(d,jsonb_build_object('id',p_exercise->>'id','libraryScope','personal'));
end$$;
create function public.exercise_library_identity(p_owner uuid,p_exercise jsonb,p_identity jsonb,p_set jsonb)returns text language plpgsql stable security definer set search_path=public,pg_temp as $$declare d jsonb;mode text;metric text;begin
 if coalesce(p_identity->>'convention','')=''or p_identity->>'convention'~*'préciser|inconnu|ambigu|valeur indiquée'then return null;end if;
 d:=exercise_library_reference(p_owner,p_exercise);
 metric:=case when p_set->>'loadProtocol'='elan-2'then p_set->>'measurement'else 'external_load'end;
 mode:=case when p_set->>'loadProtocol'='elan-2'then p_set->>'loadMode'
 when p_identity->>'lateralMode'='total'and p_identity->>'convention'!~*'haltère|par côté'then 'bilateral'
 when p_identity->>'lateralMode'in('simultaneous-pair','both-sides')and p_identity->>'convention'~*'haltère|par côté'then 'unilateral'end;
 if mode is not null and(d->>'libraryScope'='common'or p_set->>'loadProtocol'='elan-2')then return md5(jsonb_build_array(d->>'id',p_identity->>'unit',mode,metric)::text);end if;
 -- Ambiguous/one-side legacy data retains its original comparison boundary.
 return md5(jsonb_build_array(p_exercise->>'id',p_identity->>'unit',p_identity->>'convention',p_identity->>'lateralMode')::text);
end$$;
-- GENERATED-PROJECTIONS-BEGIN
create or replace function public.social_recorded_project(p_owner uuid,p_payload jsonb)returns void
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
    if exercise_library_set_factor(st)is null then continue;end if;piece_total:=piece_total*exercise_library_set_factor(st);
    total:=total+piece_total*case when unit='lb'then 0.45359237 else 1 end;counted:=counted+1;
   end loop;
  end loop;
  if counted+excluded>0 then insert into social_recorded_tonnage values(p_owner,s->>'id',dt,total,excluded,legacy);end if;
 end loop;
end$$;
create or replace function public.social_project(p_owner uuid,p_payload jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;st jsonb;piece jsonb;ident jsonb;dt timestamptz;en timestamptz;at_time timestamptz;factor numeric;v numeric;w numeric;r numeric;sk text;ek text;sid text;rev text;ton numeric;old_count integer;begin
 perform exercise_library_audit_snapshot(p_owner,p_payload);
 p_payload:=exercise_library_projection_payload(p_payload);
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
 if st->>'loadProtocol'='elan-2'then factor:=exercise_library_set_factor(st);if factor is null then continue;end if;ident:=ident||jsonb_build_object('measurement',st->>'measurement','loadMode',st->>'loadMode');end if;
 ton:=w*r;
 for piece in select value from jsonb_array_elements(case when jsonb_typeof(st->'drops')='array' then st->'drops' else '[]'::jsonb end) loop
 if jsonb_typeof(piece->'w')='number' and jsonb_typeof(piece->'r')='number' and (piece->>'w')::numeric>=0 and (piece->>'r')::numeric>0 and trunc((piece->>'r')::numeric)=(piece->>'r')::numeric and coalesce(piece->>'validated','true')<>'false' then ton:=ton+(piece->>'w')::numeric*(piece->>'r')::numeric;end if;end loop;
 ton:=ton*factor*case when ident->>'unit'='lb' then 0.45359237 else 1 end;
 sk:=st->>'id';rev:=md5(jsonb_build_array(s->>'date',en,e->>'id',ident,w,r,ton,at_time)::text);
 insert into social_facts(owner_id,session_id,exercise_id,set_id,identity_key,label,identity,started_at,ended_at,performed_at,weight,reps,tonnage,revision,order_reliable)
 values(p_owner,sid,ek,sk,exercise_library_identity(p_owner,e,ident,st),left(coalesce(e->>'name','Exercice'),200),ident,dt,en,at_time,w,r::integer,ton,rev,length(s->>'date')>10)
 on conflict(owner_id,session_id,exercise_id,set_id) do update set identity_key=excluded.identity_key,label=excluded.label,identity=excluded.identity,started_at=excluded.started_at,ended_at=excluded.ended_at,performed_at=excluded.performed_at,weight=excluded.weight,reps=excluded.reps,tonnage=excluded.tonnage,active=true,order_reliable=excluded.order_reliable,changed_at=case when social_facts.revision<>excluded.revision then clock_timestamp() else social_facts.changed_at end,revision=excluded.revision;
 end loop;end loop;end loop;
 perform social_recorded_project(p_owner,p_payload);
 -- A baseline remains tied to its exact original series/revision, even after a safe reference join.
 update goal_challenges g set baseline=jsonb_set(g.baseline,'{identityKey}',to_jsonb(f.identity_key))from social_facts f where g.owner_id=p_owner and g.mode='personal'and f.owner_id=p_owner and f.active and f.identity_key is not null and g.baseline->>'sessionId'=f.session_id and g.baseline->>'setId'=f.set_id and g.baseline->>'revision'=f.revision and g.baseline->>'identityKey'is distinct from f.identity_key;

end$$;
create or replace function public.social_comparable_metrics(p_owner uuid) returns table(day date,sessions numeric,work_sets numeric,tonnage_kg numeric,pr_events numeric,pr_exercise_identities numeric,active_weeks numeric,active_week_streak numeric,personal_challenges_completed numeric,shared_challenges_completed numeric) language sql stable security definer set search_path=public,pg_temp as $$
with facts as(select *, (started_at at time zone social_timezone(p_owner))::date d from social_facts where owner_id=p_owner and active),
 days as(select d,count(distinct session_id) real_sessions,count(*) sets,sum(coalesce(tonnage,0)) ton from facts group by d),
 exercise_sessions as(select identity_key,session_id,min(started_at) started,max(ended_at) ended,max(case when identity->>'measurement'='assistance'then -weight else weight end) w,sum(tonnage) ton,count(*)=count(tonnage) complete from facts where identity_key is not null and order_reliable group by identity_key,session_id),
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
create or replace function public.friend_record_sessions(p_owner uuid)returns table(session_id text,identity_key text)language sql stable security definer set search_path=public,pg_temp as $$
 with facts as(select * from social_facts where owner_id=p_owner and active),
 exercise_sessions as(select f.identity_key,f.session_id,min(started_at)started,max(case when identity->>'measurement'='assistance'then -weight else weight end)w,sum(tonnage)ton,count(*)=count(tonnage)complete from facts f where f.identity_key is not null and order_reliable group by f.identity_key,f.session_id)
 select x.session_id,x.identity_key from exercise_sessions x where exists(select 1 from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and(old.started at time zone social_timezone(p_owner))::date<>(x.started at time zone social_timezone(p_owner))::date)
 and not exists(select 1 from exercise_sessions other where other.identity_key=x.identity_key and other.session_id<>x.session_id and other.started=x.started)
 and(x.w>(select max(old.w)from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started)
 or x.complete and x.ton>(select max(old.ton)from exercise_sessions old where old.identity_key=x.identity_key and old.started<x.started and old.complete)
 or exists(select 1 from facts f where f.identity_key=x.identity_key and f.session_id=x.session_id and f.reps>(select max(o.reps)from facts o where o.identity_key=f.identity_key and o.weight=f.weight and o.started_at<x.started)));
$$;
create or replace function public.public_activity_project(p_owner uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare source_doc jsonb;definition jsonb;filtered jsonb;session_item jsonb;exercise_item jsonb;doc jsonb;s jsonb;e jsonb;a jsonb;f record;key text;grp text;title text;sid text;eid text;started timestamptz;ended timestamptz;details jsonb;pr text;count_sets integer;record_sessions jsonb;begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,111));
 select payload into source_doc from private_documents where owner_id=p_owner;
 doc:=exercise_library_projection_payload(source_doc);filtered:='[]';
 for session_item in select value from jsonb_array_elements(coalesce(doc->'sessions','[]'::jsonb))loop
  details:='[]';for exercise_item in select value from jsonb_array_elements(coalesce(session_item->'exercises','[]'::jsonb))loop
   definition:=exercise_library_reference(p_owner,exercise_item);
   if definition->>'libraryScope'='common'then details:=details||jsonb_build_array(exercise_item);end if;
  end loop;filtered:=filtered||jsonb_build_array(session_item||jsonb_build_object('exercises',details));
 end loop;doc:=doc||jsonb_build_object('sessions',filtered,'_libraryOwner',p_owner);
 update public_exercise_results set active=false where owner_id=p_owner and active;
 update friend_activity set active=false where owner_id=p_owner and active;
 select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb)into record_sessions from friend_record_sessions(p_owner)p;
 for s in select value from(select distinct on(value->>'id')value,ord from jsonb_array_elements(case when jsonb_typeof(doc->'sessions')='array'then doc->'sessions'else '[]'::jsonb end)with ordinality x(value,ord)order by value->>'id',ord desc)unique_sessions loop
  sid:=s->>'id';if sid is null or sid=doc->'active'->>'id'then continue;end if;
  begin started:=(s->>'date')::timestamptz;ended:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
  if started is null or ended is null or not isfinite(started)or not isfinite(ended)or ended<started or ended>clock_timestamp()then continue;end if;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)loop
   eid:=coalesce(e->>'instanceId',e->>'id');key:=null;
   for f in select * from social_facts where owner_id=p_owner and active and session_id=sid and exercise_id=eid and coalesce(e->>'tracking','strength')='strength'and exists(select 1 from jsonb_array_elements(coalesce(e->'sets','[]'::jsonb))st where st->>'id'=social_facts.set_id)loop
    if key is null then key:=public_exercise_resolve(e,doc);end if;grp:=public_exercise_group(p_owner,e,doc,key,f.identity);
    insert into public_exercise_results(id,owner_id,exercise_key,group_id,session_id,exercise_id,set_id,weight,reps,tonnage,performed_at)values('result:'||md5(jsonb_build_array(p_owner,sid,eid,f.set_id)::text),p_owner,key,grp,sid,eid,f.set_id,f.weight,f.reps,f.tonnage,f.performed_at)
    on conflict(id)do update set exercise_key=excluded.exercise_key,group_id=excluded.group_id,weight=excluded.weight,reps=excluded.reps,tonnage=excluded.tonnage,activity_value=null,performed_at=excluded.performed_at,active=true;
   end loop;
   if e->>'tracking'in('cardio','mobility')then
    for a in select value from jsonb_array_elements(case when jsonb_typeof(e->'activityEntries')='array'then e->'activityEntries'else '[]'::jsonb end)loop
     if not friend_activity_entry_valid(a,started,ended)or(e->>'tracking'='mobility'and a->>'counter'<>'duration')then continue;end if;
     if key is null then key:=public_exercise_resolve(e,doc);end if;grp:=public_exercise_group(p_owner,e,doc,key,coalesce(e->'loadIdentity',jsonb_build_object('convention',e->>'convention')),a->>'counter');
     insert into public_exercise_results(id,owner_id,exercise_key,group_id,session_id,exercise_id,set_id,activity_value,performed_at)values('activity:'||md5(jsonb_build_array(p_owner,sid,eid,a->>'id')::text),p_owner,key,grp,sid,eid,a->>'id',(a->>'value')::numeric,(a->>'recordedAt')::timestamptz)
     on conflict(id)do update set exercise_key=excluded.exercise_key,group_id=excluded.group_id,weight=null,reps=null,tonnage=null,activity_value=excluded.activity_value,performed_at=excluded.performed_at,active=true;
    end loop;
   end if;
  end loop;
  select coalesce(jsonb_agg(x.item order by x.label),'[]'::jsonb)into details from(select d.label,jsonb_build_object('label',d.label,'equipment',g.equipment,'unit',g.unit,'convention',g.convention,'lateralMode',g.lateral_mode,'brand',g.brand,'model',g.model,'sets',count(*)filter(where r.reps is not null),'cardio',d.tracking='cardio','tracking',d.tracking,'performances',jsonb_agg(jsonb_strip_nulls(jsonb_build_object('weight',r.weight,'reps',r.reps,'tonnage',r.tonnage,'value',r.activity_value,'counter',g.counter,'unit',g.unit))order by r.performed_at,r.set_id))item from public_exercise_results r join public_exercise_directory d on d.id=r.exercise_key join public_exercise_groups g on g.id=r.group_id where r.owner_id=p_owner and r.active and r.session_id=sid group by d.id,g.id)x;
  -- Count sets independently; the detail aggregate above has one row per exercise/identity.
  select count(*)filter(where reps is not null)into count_sets from public_exercise_results where owner_id=p_owner and active and session_id=sid;
  if jsonb_array_length(details)=0 then continue;end if;
  title:=case when s->>'name'in('Push','Pull','Upper','Lower','Jambes','Full Body','Full body')then s->>'name'else 'Entraînement'end;
  select min(sf.label)into pr from jsonb_to_recordset(record_sessions)as p(session_id text,identity_key text)join social_facts sf on sf.owner_id=p_owner and sf.active and sf.session_id=p.session_id and sf.identity_key=p.identity_key where p.session_id=sid and exists(select 1 from public_exercise_results visible where visible.owner_id=p_owner and visible.active and visible.session_id=sid and visible.set_id=sf.set_id);
  insert into friend_activity(id,owner_id,session_id,kind,payload,occurred_at)values('session:'||md5(p_owner::text||':'||sid),p_owner,sid,case when pr is null then 'session'else 'record'end,jsonb_build_object('title',coalesce(pr,title),'sessionTitle',title,'minutes',greatest(0,round(extract(epoch from(ended-started))/60)),'sets',count_sets,'cardio',count_sets=0,'exercises',details),ended)
  on conflict(id)do update set kind=excluded.kind,identity_key=null,payload=excluded.payload,occurred_at=excluded.occurred_at,active=true;
 end loop;
end$$;
create or replace function public.friend_activity_records(p_owner uuid,p_session text)returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 with current_exercises as(select identity_key,min(label)label,min(started_at)started,case when min(identity->>'measurement')='assistance'then min(weight)else max(weight)end weight,min(identity->>'measurement')measurement,sum(tonnage)tonnage,bool_and(tonnage is not null)complete,min(identity->>'unit')unit,min(identity->>'convention')convention from social_facts where owner_id=p_owner and active and session_id=p_session and identity_key is not null and order_reliable and exists(select 1 from public_exercise_results visible where visible.owner_id=p_owner and visible.active and visible.session_id=p_session and visible.set_id=social_facts.set_id)group by identity_key),
 eligible as(select c.* from current_exercises c where exists(select 1 from social_facts old where old.owner_id=p_owner and old.active and old.identity_key=c.identity_key and old.started_at<c.started and(old.started_at at time zone social_timezone(p_owner))::date<>(c.started at time zone social_timezone(p_owner))::date)and not exists(select 1 from social_facts other where other.owner_id=p_owner and other.active and other.identity_key=c.identity_key and other.session_id<>p_session and other.started_at=c.started)),
 weights as(select c.*,(select case when c.measurement='assistance'then min(o.weight)else max(o.weight)end from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.started_at<c.started)previous,(select max(f.reps)from social_facts f where f.owner_id=p_owner and f.active and f.session_id=p_session and f.identity_key=c.identity_key and f.weight=c.weight)reps from eligible c),
 reps as(select c.identity_key,c.label,c.unit,c.convention,f.weight,max(f.reps)::numeric current,(select max(o.reps)from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.weight=f.weight and o.started_at<c.started)::numeric previous from eligible c join social_facts f on f.owner_id=p_owner and f.active and f.session_id=p_session and f.identity_key=c.identity_key group by c.identity_key,c.label,c.unit,c.convention,c.started,f.weight),
 tons as(select c.*,(select max(v.total)from(select sum(o.tonnage)total from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.started_at<c.started group by o.session_id having bool_and(o.tonnage is not null))v)previous from eligible c where c.complete),
 records as(
 select jsonb_build_object('kind',case when measurement='assistance'then 'assistance'else 'weight'end,'label',label,'unit',unit,'convention',convention,'weight',weight,'reps',reps,'current',weight,'previous',previous,'gain',case when measurement='assistance'then previous-weight else weight-previous end)item from weights where case when measurement='assistance'then weight<previous else weight>previous end
 union all select jsonb_build_object('kind','reps','label',label,'unit',unit,'convention',convention,'weight',weight,'reps',current,'current',current,'previous',previous,'gain',current-previous)from reps where current>previous
 union all select jsonb_build_object('kind','tonnage','label',label,'unit','kg','convention',convention,'current',tonnage,'previous',previous,'gain',tonnage-previous)from tons where tonnage>previous)
 select coalesce(jsonb_agg(item order by item->>'label',item->>'kind'),'[]'::jsonb)from records
$$;
create or replace function public.rebuild_competition(p_owner uuid,p_payload jsonb) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb;e jsonb;st jsonb;part jsonb;binding jsonb;identity jsonb;v public.exercise_variants%rowtype;
 definition jsonb;alias record;marker uuid:=gen_random_uuid();sid text;eid text;sk text;conv text;unit text;mode text;dt timestamptz;
 ei integer;si integer;di integer;w numeric;r numeric;factor numeric;total numeric;revision text;ended timestamptz;set_time timestamptz;
begin
 p_payload:=exercise_library_projection_payload(p_payload);
 for s in select value from jsonb_array_elements(case when jsonb_typeof(p_payload->'sessions')='array' then p_payload->'sessions' else '[]'::jsonb end) loop
  if s->>'id' is null or jsonb_typeof(s->'exercises')<>'array' then continue;end if;
  begin dt:=(s->>'date')::timestamptz;ended:=(s->>'endedAt')::timestamptz;exception when others then continue;end;
  if ended is null or ended<dt or ended>clock_timestamp()+interval '5 minutes' or s->>'id'=p_payload->'active'->>'id' then continue;end if;
  if dt is null or dt>clock_timestamp()+interval '5 minutes' then continue;end if;
  sid:=md5(s->>'id');ei:=0;
  for e in select value from jsonb_array_elements(s->'exercises') loop
   ei:=ei+1;if jsonb_typeof(e->'sets')<>'array' then continue;end if;
   eid:=md5(coalesce(e->>'instanceId','exercise-'||coalesce(e->>'_libraryExerciseIndex',ei::text)));si:=0;
   for st in select value from jsonb_array_elements(e->'sets') loop
    si:=si+1;if coalesce(st->>'type','work')<>'work' then continue;end if;
    if st->>'status' is not null and st->>'status' not in ('validated','completed') then continue;end if;
    definition:=exercise_library_reference(p_owner,e);if definition->>'libraryScope'<>'common'then continue;end if;
    identity:=st->'loadIdentity';
    if st->>'loadProtocol'='elan-2'then
     if st->>'measurement'<>'external_load'then continue;end if;
     select a.exercise_id,a.convention,ev.equipment into alias from variant_aliases a join exercise_variants ev on ev.id=a.variant_id where a.exercise_id in(select jsonb_array_elements_text(coalesce(definition->'legacyIds','[]'::jsonb)))and((st->>'loadMode'='unilateral'and a.convention='Par haltère')or(st->>'loadMode'='bilateral'and a.convention in('Total','Charge totale')))order by a.exercise_id limit 1;
     if found then e:=e||jsonb_build_object('id',alias.exercise_id);identity:=identity||jsonb_build_object('convention',alias.convention,'lateralMode',case when alias.equipment='dumbbell'then 'simultaneous-pair'else 'total'end);end if;
    end if;
    conv:=coalesce(identity->>'convention',e->>'convention','Inconnue');unit:=coalesce(identity->>'unit','kg');
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
     if st->>'loadProtocol'='elan-2'and(part->>'validated'='false'or part->>'type'='warmup'or coalesce(part->>'status','validated')not in('validated','completed'))then continue;end if;
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
create or replace function public.public_exercise_group(p_owner uuid,p_exercise jsonb,p_payload jsonb,p_key text,p_identity jsonb,p_counter text default null)returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare d public_exercise_directory%rowtype;v public.exercise_variants%rowtype;equipment text;tracking text;unit text;conv text;mode text;known boolean;brand_text text;model_text text;scope_id uuid;result text;begin
 select * into d from public_exercise_directory where id=p_key;
 equipment:=coalesce(nullif(p_exercise->>'equipment',''),case when exists(select 1 from public_exercise_aliases where kind='id'and alias=p_exercise->>'id')then d.equipment else 'unknown'end);tracking:=d.tracking;
 unit:=coalesce(nullif(p_identity->>'unit',''),'À préciser');conv:=coalesce(nullif(p_identity->>'convention',''),'À préciser');mode:=coalesce(nullif(p_identity->>'lateralMode',''),'unknown');
 if p_identity->>'measurement'is not null then conv:=case when p_identity->>'measurement'='assistance'then 'Assistance'when p_identity->>'measurement'='added_load'then 'Charge additionnelle'when p_identity->>'loadMode'='unilateral'then 'Par côté'else 'Total'end;end if;
 select ev.* into v from jsonb_array_elements(case when jsonb_typeof(p_payload->'publicVariantBindings')='array'then p_payload->'publicVariantBindings'else '[]'::jsonb end)b join exercise_variants ev on ev.id=b->>'variantId'where b->>'exerciseId'=p_exercise->>'id'and b->>'confirmed'='true'and b->>'convention'=conv limit 1;
 if v.id is not null then equipment:=v.equipment;brand_text:=v.brand;model_text:=v.model;end if;
 known:=unit in('kg','lb')and conv!~*'préciser|inconnu|ambigu|valeur indiquée'and mode in('total','simultaneous-pair','one-side','alternating-total','both-sides')and p_identity->>'source'in('entry','preset','confirmed');
 if equipment in('machine','cable','smith','band')and(coalesce(brand_text,'')=''or coalesce(model_text,'')='')then known:=false;end if;
 if equipment='unknown'then known:=false;end if;
 if tracking in('cardio','mobility')then
  unit:=case p_counter when 'duration'then 'min'when 'distance'then 'km'when 'calories'then 'kcal'end;conv:=case p_counter when 'duration'then 'Durée enregistrée'when 'distance'then 'Distance enregistrée'when 'calories'then 'Calories enregistrées'end;mode:='activity';
  known:=p_counter='duration'or(coalesce(brand_text,'')<>''and coalesce(model_text,'')<>'');
 end if;
 if mode='simultaneous-pair'and conv='Par haltère'then mode:='both-sides';conv:='Par côté';end if;
 known:=coalesce(known,false);scope_id:=case when not known then p_owner end;
 result:='group:'||md5(jsonb_build_array(p_key,equipment,tracking,unit,conv,mode,lower(brand_text),lower(model_text),scope_id,case when not known then p_exercise->>'id'end,p_counter)::text);
 insert into public_exercise_groups values(result,p_key,equipment,tracking,unit,conv,mode,brand_text,model_text,known,scope_id,p_counter)on conflict do nothing;
 return result;
end$$;
create or replace function public.public_exercise_rankings(p_exercise text,p_group text default null,p_kind text default 'charge',p_weight numeric default null,p_reps integer default null,p_friends boolean default false,p_around boolean default true,p_offset integer default 0,p_limit integer default 25)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare body_only boolean:=false;assisted boolean:=false;chosen text:=p_group;g public_exercise_groups%rowtype;u uuid:=auth.uid();groups jsonb;entries jsonb;total integer;mine bigint;mine_offset integer;off integer:=greatest(0,least(coalesce(p_offset,0),2000000000));cap integer:=greatest(1,least(coalesce(p_limit,25),50));begin
 if p_kind not in('charge','repetitions','tonnage','duration','distance','calories')or p_weight is not null and(p_weight<0 or p_weight>1000000)or p_reps is not null and p_reps not between 1 and 10000 then raise exception 'INVALID_FILTER';end if;
 select coalesce(jsonb_agg(public_exercise_group_data(x.id)order by x.mine desc,x.known desc,x.last_at desc,x.id),'[]'::jsonb)into groups from(select gr.id,bool_or(r.owner_id=u)mine,gr.comparable known,max(r.performed_at)last_at from public_exercise_groups gr join public_exercise_results r on r.group_id=gr.id and r.active where gr.exercise_key=p_exercise group by gr.id)x;
 if chosen is null or not exists(select 1 from public_exercise_groups where id=chosen and exercise_key=p_exercise)then chosen:=groups->0->>'id';end if;
 select * into g from public_exercise_groups where id=chosen;
 if g.id is null then return jsonb_build_object('entries','[]'::jsonb,'groups',groups,'group',null,'total',0,'myRank',null,'myOffset',null,'offset',0,'limit',cap,'records','{}'::jsonb,'nearby',p_around);end if;
 select definition->>'measurement'='assistance'into assisted from common_exercises where id=p_exercise;assisted:=coalesce(assisted,false);select definition->>'measurement'='bodyweight'into body_only from common_exercises where id=p_exercise;if coalesce(body_only,false)then if p_kind in('charge','tonnage')then p_kind:='repetitions';end if;if p_kind='repetitions'and p_weight is null then p_weight:=0;end if;end if;if assisted and p_kind='tonnage'then p_kind:='charge';end if;
 if g.tracking<>'strength'and p_kind not in('duration','distance','calories')then p_kind:=g.counter;end if;
 if g.tracking='strength'and p_kind not in('charge','repetitions','tonnage')then p_kind:='charge';end if;
 if g.equipment='bodyweight'and not exists(select 1 from public_exercise_results r where r.group_id=g.id and r.active and r.weight>0)then if p_kind='charge'then p_kind:='repetitions';end if;if p_kind='repetitions'and p_weight is null then p_weight:=0;end if;end if;
 if p_kind='repetitions'and p_weight is null then return jsonb_build_object('entries','[]'::jsonb,'groups',groups,'group',public_exercise_group_data(chosen),'total',0,'myRank',null,'offset',0,'limit',cap,'kind',p_kind,'weightRequired',true,'records','{}'::jsonb);end if;
 with source as(select r.* from public_exercise_results r where r.active and r.group_id=chosen and(not p_friends or r.owner_id=u or social_friends(u,r.owner_id))and(u is null or not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=r.owner_id)or(b.owner_id=r.owner_id and b.target_id=u)))),
 simple as(select distinct on(owner_id)owner_id,case when p_kind='repetitions'then reps::numeric when p_kind='charge'then case when assisted then -weight else weight end else activity_value end value,reps,id,performed_at from source where p_kind in('charge','repetitions','duration','distance','calories')and(p_kind<>'repetitions'or weight=p_weight)and(p_kind<>'charge'or p_reps is null or reps=p_reps)and(p_kind in('charge','repetitions')or g.counter=p_kind)order by owner_id,(case when p_kind='repetitions'then reps::numeric when p_kind='charge'then case when assisted then -weight else weight end else activity_value end)desc,reps desc,performed_at,id),
 volumes as(select owner_id,session_id,sum(tonnage)value,max(performed_at)performed_at,min(id)id from source where p_kind='tonnage'group by owner_id,session_id having count(*)=count(tonnage)),best_volumes as(select distinct on(owner_id)owner_id,value,null::integer reps,id,performed_at from volumes order by owner_id,value desc,performed_at,session_id),
 best as(select * from simple where value is not null union all select * from best_volumes),ranked as(select b.*,p.username,rank()over(order by value desc)rank,row_number()over(order by value desc,p.username,b.owner_id)-1 pos from best b join profiles p on p.id=b.owner_id)
 select coalesce(jsonb_agg(jsonb_build_object('rank',case when g.comparable then rank end,'value',case when assisted and p_kind='charge'then -value else value end,'reps',reps,'ownerId',owner_id,'username',username,'performanceId',id,'performed_at',performed_at)order by pos),'[]'::jsonb),count(*),max(rank)filter(where owner_id=u),max(pos)filter(where owner_id=u)into entries,total,mine,mine_offset from ranked;
 if p_around and u is not null then cap:=4;off:=greatest(0,least(coalesce(mine_offset,0)-1,greatest(0,total-4)));end if;
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb)into entries from jsonb_array_elements(entries)with ordinality x(value,ord)where ord>off and ord<=off+cap;
 return jsonb_build_object('entries',entries,'groups',groups,'group',public_exercise_group_data(chosen),'total',total,'myRank',case when g.comparable then mine end,'myOffset',mine_offset,'offset',off,'limit',cap,'kind',p_kind,'weight',p_weight,'valueUnit',case when p_kind='tonnage'then 'kg'when p_kind='repetitions'then 'rép.'else g.unit end,'nearby',p_around,'records','{}'::jsonb,'individual',not g.comparable);
end$$;
create or replace function public.goal_create(p_target uuid,p_metric text,p_quantity numeric,p_days integer,p_mode text,p_baseline jsonb,p_title text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();g uuid;baseline jsonb;z text:=social_timezone(u);title text:=nullif(btrim(regexp_replace(p_title,'[[:space:]]+',' ','g')),'');begin
 if char_length(title)>60 or p_mode='personal' and title is not null then raise exception 'INVALID_GOAL_TITLE';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,106));
 if p_days not in (7,14,30) or p_days is null or p_quantity is null or p_quantity<=0 or p_mode is null or p_metric is null then raise exception 'INVALID_GOAL';end if;
 if (select count(*) from goal_challenges where (owner_id=u or target_id=u) and(state='pending' and created_at>now()-interval '7 days' or state='active' and deadline>now()))>=10 then raise exception 'ACTIVE_GOAL_LIMIT';end if;
 if p_mode='personal' then
 if p_target is not null or p_metric not in ('repetitions_at_weight','weight_at_min_repetitions','exercise_tonnage_in_session') then raise exception 'INVALID_GOAL';end if;
 select jsonb_build_object('identityKey',identity_key,'label',label,'identity',identity,'weight',weight,'reps',reps,'sessionId',session_id,'setId',set_id,'revision',revision) into baseline from social_facts where owner_id=u and active and identity_key is not null and session_id=p_baseline->>'sessionId' and set_id=p_baseline->>'setId' and revision=p_baseline->>'revision';
 if baseline is null then raise exception 'REFERENCE_CHANGED';end if;
 if baseline->'identity'->>'measurement'in('bodyweight','assistance')and p_metric<>'repetitions_at_weight'then raise exception 'INCOMPATIBLE_GOAL_METRIC';end if;
 if p_metric='repetitions_at_weight' and (p_quantity<= (select max(reps) from social_facts where owner_id=u and active and identity_key=baseline->>'identityKey' and weight=(baseline->>'weight')::numeric) or p_quantity>10000 or trunc(p_quantity)<>p_quantity) then raise exception 'INVALID_TARGET';end if;
 if p_metric='weight_at_min_repetitions' and (p_quantity<=(select max(weight)from social_facts where owner_id=u and active and identity_key=baseline->>'identityKey' and reps>=(baseline->>'reps')::integer) or p_quantity>1000000)then raise exception 'INVALID_TARGET';end if;
 if p_metric='exercise_tonnage_in_session' then
 baseline:=baseline||coalesce((select jsonb_build_object('tonnage',t,'tonnageSession',session_id,'tonnageProof',proof)from(select session_id,sum(tonnage)t,md5(string_agg(revision,','order by exercise_id,set_id))proof from social_facts where owner_id=u and active and identity_key=baseline->>'identityKey' group by session_id having count(*)=count(tonnage))v order by t desc,session_id limit 1),'{}'::jsonb);
 if baseline->>'tonnage' is null or p_quantity<=(baseline->>'tonnage')::numeric then raise exception 'TONNAGE_UNAVAILABLE';end if;end if;
 elsif p_mode in ('each','together') then
 if p_target is null or not social_friends(u,p_target)then raise exception 'FRIEND_REQUIRED';end if;
 if p_metric not in ('sessions','work_sets','tonnage_kg') or p_metric='sessions' and(p_quantity>30 or trunc(p_quantity)<>p_quantity) or p_metric='work_sets' and(p_quantity>1000 or trunc(p_quantity)<>p_quantity) or p_metric='tonnage_kg' and (p_quantity<1000 or p_quantity>1000000)then raise exception 'INVALID_GOAL';end if;
 select id into g from goal_challenges where owner_id=u and target_id=p_target and metric=p_metric and mode=p_mode and quantity=p_quantity and days=p_days and state='pending' and created_at>now()-interval '7 days';if g is not null then return g;end if;
 else raise exception 'INVALID_GOAL';end if;
 if(select count(*)from social_request_log where owner_id=u and kind='goal' and created_at>now()-interval '1 day')>=20 then raise exception 'INVITATION_LIMIT';end if;
 insert into social_request_log(owner_id,kind)values(u,'goal');
 insert into goal_challenges(owner_id,target_id,metric,mode,quantity,days,timezone,state,started_at,deadline,baseline,title)
 values(u,p_target,p_metric,p_mode,p_quantity,p_days,z,case when p_mode='personal' then 'active' else 'pending' end,case when p_mode='personal' then now() end,case when p_mode='personal' then ((now() at time zone z)+make_interval(days=>p_days))at time zone z end,baseline,title) returning id into g;return g;
end$$;
-- GENERATED-PROJECTIONS-END

-- Canonical public directory: fixed shared variants, never personal definitions or caches.
insert into public_exercise_directory(id,label,equipment,tracking)select id,definition->>'name',definition->>'equipment',coalesce(definition->>'tracking','strength')from common_exercises on conflict(id)do nothing;
create or replace function public.public_exercises(p_offset integer default 0)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(to_jsonb(x)order by label,id),'[]'::jsonb)from(select c.id,c.definition->>'name'label,c.definition->>'equipment'equipment,coalesce(c.definition->>'tracking','strength')tracking,c.definition->>'measurement'measurement,c.definition->>'loadMode'load_mode,c.definition->'aliases'aliases from common_exercises c order by label,c.id limit 250 offset greatest(0,coalesce(p_offset,0)))x
$$;
create or replace function public.public_exercise_resolve(p_exercise jsonb,p_payload jsonb)returns text language plpgsql security definer set search_path=public,pg_temp as $$declare d jsonb;u uuid;begin
 -- Only public_activity_project calls this private helper, after enforcing owner/private scope.
 u:=nullif(p_payload->>'_libraryOwner','')::uuid;d:=exercise_library_reference(u,p_exercise);
 if d->>'libraryScope'<>'common'then return null;end if;
 insert into public_exercise_directory(id,label,equipment,tracking)values(d->>'id',d->>'name',d->>'equipment',coalesce(d->>'tracking','strength'))on conflict(id)do nothing;return d->>'id';
end$$;
-- Public group creation preserves hardware boundaries. Raw record weights are never multiplied.
-- GENERATED-PUBLIC-BEGIN
-- GENERATED-PUBLIC-END

-- Rebuild derived links/projections only. Keep private snapshots and proof numerics intact.
do $$declare d record;begin for d in select owner_id,payload from private_documents loop
 perform social_project(d.owner_id,d.payload);perform rebuild_competition(d.owner_id,d.payload);perform public_activity_project(d.owner_id);
end loop;end$$;
revoke all on function public.exercise_library_set_factor(jsonb),public.exercise_library_projection_payload(jsonb),public.exercise_library_reference(uuid,jsonb),public.exercise_library_identity(uuid,jsonb,jsonb,jsonb)from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
