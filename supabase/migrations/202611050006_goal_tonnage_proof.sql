-- Bind personal session-tonnage goals to the entire historical exercise proof.
begin;
create or replace function public.goal_create(p_target uuid,p_metric text,p_quantity numeric,p_days integer,p_mode text,p_baseline jsonb default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();g uuid;baseline jsonb;z text:=social_timezone(u);begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,106));
 if p_days not in (7,14,30) or p_days is null or p_quantity is null or p_quantity<=0 or p_mode is null or p_metric is null then raise exception 'INVALID_GOAL';end if;
 if (select count(*) from goal_challenges where (owner_id=u or target_id=u) and(state='pending' and created_at>now()-interval '7 days' or state='active' and deadline>now()))>=10 then raise exception 'ACTIVE_GOAL_LIMIT';end if;
 if p_mode='personal' then
 if p_target is not null or p_metric not in ('repetitions_at_weight','weight_at_min_repetitions','exercise_tonnage_in_session') then raise exception 'INVALID_GOAL';end if;
 select jsonb_build_object('identityKey',identity_key,'label',label,'identity',identity,'weight',weight,'reps',reps,'sessionId',session_id,'setId',set_id,'revision',revision) into baseline from social_facts where owner_id=u and active and identity_key is not null and session_id=p_baseline->>'sessionId' and set_id=p_baseline->>'setId' and revision=p_baseline->>'revision';
 if baseline is null then raise exception 'REFERENCE_CHANGED';end if;
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
 insert into goal_challenges(owner_id,target_id,metric,mode,quantity,days,timezone,state,started_at,deadline,baseline)
 values(u,p_target,p_metric,p_mode,p_quantity,p_days,z,case when p_mode='personal' then 'active' else 'pending' end,case when p_mode='personal' then now() end,case when p_mode='personal' then ((now() at time zone z)+make_interval(days=>p_days))at time zone z end,baseline) returning id into g;return g;
end$$;
create or replace function public.goal_won(p_goal uuid,p_owner uuid) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$declare g goal_challenges%rowtype;begin select * into g from goal_challenges where id=p_goal;
 if g.state<>'active' or g.deadline+interval '48 hours'>now() or exists(select 1 from goal_abandonments where goal_id=g.id and owner_id=p_owner) then return false;end if;
 if g.mode='personal' and g.metric='exercise_tonnage_in_session' and (select md5(string_agg(revision,','order by exercise_id,set_id))from social_facts where owner_id=g.owner_id and active and identity_key=g.baseline->>'identityKey' and session_id=g.baseline->>'tonnageSession')is distinct from g.baseline->>'tonnageProof' then return false;end if;
 if g.mode='personal' and g.metric<>'exercise_tonnage_in_session' and not exists(select 1 from social_facts where owner_id=g.owner_id and active and revision=g.baseline->>'revision' and session_id=g.baseline->>'sessionId' and set_id=g.baseline->>'setId')then return false;end if;
 if g.mode='together' then return not exists(select 1 from goal_abandonments where goal_id=g.id) and goal_value(g.id,g.owner_id)>0 and goal_value(g.id,g.target_id)>0 and goal_value(g.id,g.owner_id)+goal_value(g.id,g.target_id)>=g.quantity;end if;
 return goal_value(g.id,p_owner)>=g.quantity;end$$;
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
end$$;
do $$declare d record;begin for d in select owner_id,payload from public.private_documents loop perform social_project(d.owner_id,d.payload);perform social_refresh_badges(d.owner_id);end loop;end$$;
notify pgrst,'reload schema';
commit;
