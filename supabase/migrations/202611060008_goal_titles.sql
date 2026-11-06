-- Optional names for friend challenges. Existing goals and private documents stay intact.
begin;
alter table public.goal_challenges add column title text;
alter table public.goal_challenges add constraint goal_title_length check (title is null or char_length(title) between 1 and 60);
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
-- Preserve the original RPC signature and its grants, including older installed clients.
create or replace function public.goal_create(p_target uuid,p_metric text,p_quantity numeric,p_days integer,p_mode text,p_baseline jsonb default null)
returns uuid language sql security invoker set search_path=public,pg_temp as $$
 select public.goal_create(p_target,p_metric,p_quantity,p_days,p_mode,p_baseline,null::text);
$$;
revoke all on function public.goal_create(uuid,text,numeric,integer,text,jsonb,text) from public,anon;
grant execute on function public.goal_create(uuid,text,numeric,integer,text,jsonb,text) to authenticated;
create or replace function public.goal_list() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin
 return coalesce((select jsonb_agg(to_jsonb(x))from(select g.id,g.owner_id,g.target_id,g.metric,g.mode,g.quantity,g.days,g.title,g.baseline,g.started_at,g.deadline,g.created_at,a.username initiator,b.username target,
 case when g.state='pending' and (g.created_at<=now()-interval '7 days' or not social_friends(g.owner_id,g.target_id))then 'expired' when g.state='active' and g.deadline+interval '48 hours'<=now()then 'completed' when g.state='active' and g.deadline<=now()then 'confirming' else g.state end status,
 goal_value(g.id,g.owner_id)owner_value,goal_value(g.id,g.target_id)target_value,goal_won(g.id,u) won,
 exists(select 1 from goal_abandonments where goal_id=g.id and owner_id=u)abandoned,
 g.mode='personal' and not exists(select 1 from social_facts where owner_id=u and active and revision=g.baseline->>'revision' and session_id=g.baseline->>'sessionId' and set_id=g.baseline->>'setId')reference_invalid
 from goal_challenges g join profiles a on a.id=g.owner_id left join profiles b on b.id=g.target_id where u in(g.owner_id,coalesce(g.target_id,g.owner_id))order by g.created_at desc limit 100)x),'[]');end$$;
notify pgrst,'reload schema';
commit;
