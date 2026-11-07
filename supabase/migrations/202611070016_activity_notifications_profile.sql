-- Additive social features. Private snapshots, competitive proofs, badges and scores are unchanged.
begin;

-- Count actual saved sessions, including imported legacy history and cardio-only sessions.
-- Public ranks keep their existing completed/comparable-only rules.
create function public.personal_profile_sessions(p_owner uuid)
returns table(session_id text,day date,work_sets numeric) language plpgsql stable security definer set search_path=public,pg_temp as $$
declare doc jsonb;s jsonb;e jsonb;st jsonb;dt timestamptz;valid boolean;n numeric;begin
 select payload into doc from private_documents where owner_id=p_owner;
 for s in select value from(select distinct on(value->>'id')value,ord from jsonb_array_elements(case when jsonb_typeof(doc->'sessions')='array'then doc->'sessions'else '[]'::jsonb end)with ordinality a(value,ord)order by value->>'id',ord desc)x loop
  if coalesce(s->>'id','')=''or coalesce(s->>'id'=doc->'active'->>'id',false)or s->>'status'in('abandoned','cancelled','canceled')or s->>'abandoned'='true'then continue;end if;
  begin dt:=(s->>'date')::timestamptz;exception when others then continue;end;
  if dt is null or not isfinite(dt)or(dt at time zone social_timezone(p_owner))::date>(now()at time zone social_timezone(p_owner))::date then continue;end if;
  n:=0;valid:=false;
  for e in select value from jsonb_array_elements(case when jsonb_typeof(s->'exercises')='array'then s->'exercises'else '[]'::jsonb end)loop
   for st in select value from jsonb_array_elements(case when jsonb_typeof(e->'sets')='array'then e->'sets'else '[]'::jsonb end)loop
    if st->>'type'='warmup'or st->>'validated'='false'or coalesce(st->>'status','validated')not in('validated','completed')then continue;end if;
    if jsonb_typeof(st->'w')='number'and jsonb_typeof(st->'r')='number'then
     if(st->>'w')::numeric>=0 and(st->>'r')::numeric>0 then n:=n+1;valid:=true;end if;
    end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(case when jsonb_typeof(e->'activityEntries')='array'then e->'activityEntries'else '[]'::jsonb end)a where jsonb_typeof(a->'value')='number'and(a->>'value')::numeric>0)then valid:=true;end if;
  end loop;
  if valid then session_id:=s->>'id';day:=(dt at time zone social_timezone(p_owner))::date;work_sets:=n;return next;end if;
 end loop;
end$$;
create function public.personal_profile_metrics(p_owner uuid)
returns table(day date,sessions numeric,work_sets numeric,tonnage_kg numeric,pr_events numeric,pr_exercise_identities numeric,active_weeks numeric,active_week_streak numeric,personal_challenges_completed numeric,shared_challenges_completed numeric)
language sql stable security definer set search_path=public,pg_temp as $$
 with saved as(select s.day,count(*)::numeric sessions,sum(s.work_sets)work_sets,coalesce(sum(t.tonnage_kg),0)tonnage_kg from personal_profile_sessions(p_owner)s left join social_recorded_tonnage t on t.owner_id=p_owner and t.session_id=s.session_id group by s.day)
 select coalesce(s.day,m.day),coalesce(s.sessions,0),coalesce(s.work_sets,0),coalesce(s.tonnage_kg,0),coalesce(m.pr_events,0),coalesce(m.pr_exercise_identities,0),coalesce(m.active_weeks,0),coalesce(m.active_week_streak,0),coalesce(m.personal_challenges_completed,0),coalesce(m.shared_challenges_completed,0)
 from saved s full outer join social_metrics(p_owner)m on m.day=s.day
$$;
-- Keep all existing profile/badge fields and attribution; change only the personal summary source.
do $$declare definition text;begin
 select pg_get_functiondef('public.social_profile(text)'::regprocedure)into definition;
 if position('from social_metrics(u)'in definition)=0 then raise exception 'Unexpected social_profile source';end if;
 execute replace(definition,'from social_metrics(u)','from personal_profile_metrics(u)');
end$$;

-- Detailed personal records derived from the same active, comparable facts used by the feed.
create function public.friend_activity_records(p_owner uuid,p_session text)returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
 with current_exercises as(select identity_key,min(label)label,min(started_at)started,max(weight)weight,sum(tonnage)tonnage,bool_and(tonnage is not null)complete,min(identity->>'unit')unit,min(identity->>'convention')convention from social_facts where owner_id=p_owner and active and session_id=p_session and identity_key is not null and order_reliable group by identity_key),
 eligible as(select c.* from current_exercises c where exists(select 1 from social_facts old where old.owner_id=p_owner and old.active and old.identity_key=c.identity_key and old.started_at<c.started and(old.started_at at time zone social_timezone(p_owner))::date<>(c.started at time zone social_timezone(p_owner))::date)and not exists(select 1 from social_facts other where other.owner_id=p_owner and other.active and other.identity_key=c.identity_key and other.session_id<>p_session and other.started_at=c.started)),
 weights as(select c.*,(select max(o.weight)from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.started_at<c.started)previous,(select max(f.reps)from social_facts f where f.owner_id=p_owner and f.active and f.session_id=p_session and f.identity_key=c.identity_key and f.weight=c.weight)reps from eligible c),
 reps as(select c.identity_key,c.label,c.unit,c.convention,f.weight,max(f.reps)::numeric current,(select max(o.reps)from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.weight=f.weight and o.started_at<c.started)::numeric previous from eligible c join social_facts f on f.owner_id=p_owner and f.active and f.session_id=p_session and f.identity_key=c.identity_key group by c.identity_key,c.label,c.unit,c.convention,c.started,f.weight),
 tons as(select c.*,(select max(v.total)from(select sum(o.tonnage)total from social_facts o where o.owner_id=p_owner and o.active and o.identity_key=c.identity_key and o.started_at<c.started group by o.session_id having bool_and(o.tonnage is not null))v)previous from eligible c where c.complete),
 records as(
 select jsonb_build_object('kind','weight','label',label,'unit',unit,'convention',convention,'weight',weight,'reps',reps,'current',weight,'previous',previous,'gain',weight-previous)item from weights where weight>previous
 union all select jsonb_build_object('kind','reps','label',label,'unit',unit,'convention',convention,'weight',weight,'reps',current,'current',current,'previous',previous,'gain',current-previous)from reps where current>previous
 union all select jsonb_build_object('kind','tonnage','label',label,'unit','kg','convention',convention,'current',tonnage,'previous',previous,'gain',tonnage-previous)from tons where tonnage>previous)
 select coalesce(jsonb_agg(item order by item->>'label',item->>'kind'),'[]'::jsonb)from records
$$;
create or replace function public.friend_activity_data(p_id text,p_detail boolean default false)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',a.id,'kind',a.kind,'username',p.username,'avatar_path',p.avatar_path,'at',a.occurred_at,
 'summary',case when p_detail then a.payload||case when a.kind='record'then jsonb_build_object('records',friend_activity_records(a.owner_id,a.session_id))else '{}'::jsonb end else a.payload-'exercises'end,'mine',a.owner_id=auth.uid(),
 'cheers',(select count(*)from friend_activity_cheers c where c.activity_id=a.id and not exists(select 1 from social_blocks b where(b.owner_id=c.owner_id and b.target_id=a.owner_id)or(b.owner_id=a.owner_id and b.target_id=c.owner_id))),
 'cheered',exists(select 1 from friend_activity_cheers c where c.activity_id=a.id and c.owner_id=auth.uid()))from friend_activity a join profiles p on p.id=a.owner_id where a.id=p_id and friend_activity_visible(a.id)
$$;

create table public.social_encouragement_notifications(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references profiles(id)on delete cascade,
 actor_id uuid not null references profiles(id)on delete cascade,activity_id text not null references friend_activity(id)on delete cascade,
 created_at timestamptz not null default now(),read_at timestamptz,unique(owner_id,actor_id,activity_id),check(owner_id<>actor_id));
create index social_encouragement_owner_created on public.social_encouragement_notifications(owner_id,created_at desc,id);
alter table public.social_encouragement_notifications enable row level security;
revoke all on public.social_encouragement_notifications from public,anon,authenticated;
create function public.social_encouragement_after_cheer()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 insert into social_encouragement_notifications(owner_id,actor_id,activity_id)
 select a.owner_id,new.owner_id,a.id from friend_activity a where a.id=new.activity_id and a.owner_id<>new.owner_id
 on conflict(owner_id,actor_id,activity_id)do nothing;return new;
end$$;
create trigger social_encouragement_cheer after insert on public.friend_activity_cheers for each row execute function public.social_encouragement_after_cheer();
create function public.social_encouragements(p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();result jsonb;begin
 with visible as(select n.id,n.activity_id,n.created_at,n.read_at,p.username,a.kind,a.payload->>'title'title,a.payload->>'sessionTitle'session_title from social_encouragement_notifications n join profiles p on p.id=n.actor_id join friend_activity a on a.id=n.activity_id where n.owner_id=u and friend_activity_visible(a.id)and exists(select 1 from friend_activity_cheers c where c.activity_id=n.activity_id and c.owner_id=n.actor_id)and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=n.actor_id)or(b.owner_id=n.actor_id and b.target_id=u))),
 page as(select * from visible order by created_at desc,id limit 20 offset greatest(0,least(coalesce(p_offset,0),2000000000)))
 select jsonb_build_object('unread',(select count(*)from visible where read_at is null),'items',coalesce((select jsonb_agg(to_jsonb(page)order by created_at desc,id)from page),'[]'::jsonb),'hasMore',(select count(*)from visible)>greatest(0,coalesce(p_offset,0))+20)into result;return result;
end$$;
create function public.social_encouragement_read(p_id uuid default null)returns boolean language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin
 update social_encouragement_notifications set read_at=coalesce(read_at,now())where owner_id=u and(p_id is null or id=p_id);return found;
end$$;
create or replace function public.social_notifications()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();f bigint;g bigint;r bigint;c jsonb;begin
 select count(*)into f from friend_pairs p where u in(p.a,p.b)and p.sender<>u and p.state='pending'and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=p.sender)or(b.owner_id=p.sender and b.target_id=u));
 select count(*)into g from goal_challenges c where c.target_id=u and c.state='pending'and c.created_at>now()-interval '7 days'and social_friends(c.owner_id,u);
 select count(*)into r from training_challenges c where c.target_id=u and c.response='pending'and c.invite_expires_at>now()and exists(select 1 from competition_performances p where p.id=c.reference_id and p.active and p.content_revision=c.reference_revision);
 c:=social_encouragements();return jsonb_build_object('friends',f,'goals',g,'records',r,'cheers',c->'unread','encouragements',c->'items','hasMoreCheers',c->'hasMore');
end$$;
-- No retroactive notifications for existing cheers: avoid a burst of old alerts.
revoke all on function public.personal_profile_sessions(uuid),public.personal_profile_metrics(uuid),public.friend_activity_records(uuid,text),public.social_encouragement_after_cheer(),public.social_encouragements(integer),public.social_encouragement_read(uuid),public.social_notifications()from public,anon,authenticated;
grant execute on function public.social_encouragements(integer),public.social_encouragement_read(uuid),public.social_notifications()to authenticated;
notify pgrst,'reload schema';
commit;
