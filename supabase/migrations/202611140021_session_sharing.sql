begin;
-- Strict projection: legacy refs contain personal performances and are never copied.
create function public.session_program_exercise(e jsonb) returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$
declare out jsonb;begin
 select coalesce(jsonb_object_agg(key,value),'{}') into out from jsonb_each(e) where key=any(array['id','instanceId','name','note','convention','step','rest','auto','plannedSets','prescription','muscles','loadIdentity','simpleLoad','libraryId','definitionId','originExerciseId','equipment','movement','demand','catalogueFamilyId','customName','measurement','loadMode','chargeProtocol','libraryScope','familyId','isometric','loadUnit','tracking','counter','activityRounds','targetSeconds','durationSeconds','laterality','refsAreTargets','superset','supersetStart']);
 -- Identity snapshots are definitions, not a link to the sender's library.
 out:=out||jsonb_build_object('refs','[]'::jsonb,'sets','[]'::jsonb,'plannedSets',coalesce(e->'plannedSets',to_jsonb(jsonb_array_length(coalesce(e->'refs','[]')))));
 if e->>'refsAreTargets'='true' then out:=out||jsonb_build_object('refs',coalesce((select jsonb_agg(jsonb_build_object('w',r->'w','r',r->'r','placeholder',r->'placeholder')) from jsonb_array_elements(coalesce(e->'refs','[]'))r),'[]'::jsonb));end if;
 if e ? 'exerciseReference' then out:=out||jsonb_build_object('exerciseReference',session_program_exercise(e->'exerciseReference')-'refs'-'sets'-'plannedSets');end if;
 if e ? 'alternative' then out:=out||jsonb_build_object('alternative',session_program_exercise(e->'alternative'));end if;
 return out;
end$$;
create function public.session_program_snapshot(t jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select jsonb_build_object('version',1,'program',jsonb_build_object('id',t->'id','name',t->'name','icon',t->'icon','timing',coalesce(t->'timing','{}'),'exercises',coalesce((select jsonb_agg(session_program_exercise(e) order by ord) from jsonb_array_elements(t->'exercises')with ordinality a(e,ord)),'[]'),'groups',coalesce((select jsonb_agg((select jsonb_object_agg(key,value)from jsonb_each(g)where key=any(array['id','name','mode','members','common','restBetween','restAfter','offsets','order']))||jsonb_build_object('retainedSteps','[]'::jsonb,'cursorStepId',null,'steps',coalesce((select jsonb_agg(s||'{"status":"pending"}'::jsonb order by ord)from jsonb_array_elements(g->'steps')with ordinality a(s,ord)),'[]')))from jsonb_array_elements(coalesce(t->'groups','[]'))g),'[]')))
$$;
create table public.session_shares(
 id uuid primary key default gen_random_uuid(),sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,request_id uuid not null,source_template_id text not null,
 created_at timestamptz not null default now(),snapshot jsonb not null check(snapshot->>'version'='1'),read_at timestamptz,
 saved_template_id text,saved_at timestamptz,unique(sender_id,recipient_id,request_id),check(sender_id<>recipient_id)
);
create index session_shares_inbox on public.session_shares(recipient_id,created_at desc);
alter table public.session_shares enable row level security;
create function public.session_share_visible(p_sender uuid,p_recipient uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$select p_recipient=auth.uid() and not exists(select 1 from social_blocks b where(b.owner_id=p_sender and b.target_id=auth.uid())or(b.target_id=p_sender and b.owner_id=auth.uid()))$$;
revoke all on function public.session_share_visible(uuid,uuid)from public,anon;
grant execute on function public.session_share_visible(uuid,uuid)to authenticated;
create policy session_shares_recipient on public.session_shares for select to authenticated using(session_share_visible(sender_id,recipient_id));
revoke all on public.session_shares from anon,authenticated;
grant select on public.session_shares to authenticated;
create function public.session_share_friends()returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'avatar_path',p.avatar_path)order by p.username),'[]')from profiles p where social_friends(social_uid(),p.id)$$;
create function public.session_share_send(p_template text,p_recipients uuid[],p_request uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();t jsonb;r uuid;snap jsonb;begin
 if p_request is null or coalesce(cardinality(p_recipients),0)not between 1 and 100 then raise exception 'INVALID_RECIPIENTS';end if;
 -- Lock the sender document so a concurrent edit cannot split a batch.
 select x||jsonb_build_object('timing',(select coalesce(jsonb_object_agg(key,value),'{}')from jsonb_each(coalesce(d.payload->'programmingPreferences','{}')||coalesce(x->'timing','{}'))where key=any(array['compoundRest','isolationRest','warmupMinutes','setupSeconds','prepRest','transitionSeconds','secondsPerRep','marginMinutes','useModelRest']))) into t from private_documents d cross join lateral jsonb_array_elements(d.payload->'templates')x where d.owner_id=u and x->>'id'=p_template for update of d;
 if t is null then raise exception 'PROGRAM_NOT_FOUND';end if;
 snap:=session_program_snapshot(t);
 if jsonb_array_length(snap->'program'->'exercises')=0 or octet_length(snap::text)>1000000 then raise exception 'INVALID_PROGRAM';end if;
 foreach r in array p_recipients loop
 if not social_friends(u,r)then raise exception 'FRIEND_REQUIRED';end if;
 insert into session_shares(sender_id,recipient_id,request_id,source_template_id,snapshot)values(u,r,p_request,p_template,snap)on conflict(sender_id,recipient_id,request_id)do nothing;
 end loop;return jsonb_build_object('sent',true);
end$$;
create function public.session_share_open(p_id uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();s session_shares;begin
 select * into s from session_shares where id=p_id and recipient_id=u and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=sender_id)or(b.target_id=u and b.owner_id=sender_id))for update;
 if not found then raise exception 'SHARE_NOT_FOUND';end if;
 update session_shares set read_at=coalesce(read_at,now())where id=s.id;
 return to_jsonb(s)||jsonb_build_object('username',(select username from profiles where id=s.sender_id));end$$;
create function public.session_share_inbox(p_offset integer default 0)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('unread',(select count(*)from session_shares s where recipient_id=social_uid()and read_at is null and not exists(select 1 from social_blocks b where(b.owner_id=recipient_id and b.target_id=sender_id)or(b.target_id=recipient_id and b.owner_id=sender_id))),'items',coalesce((select jsonb_agg(to_jsonb(x))from(select s.id,s.created_at,s.read_at,p.username,s.snapshot->'program'->>'name' name,jsonb_array_length(s.snapshot->'program'->'exercises')exercises,(select sum((e->>'plannedSets')::integer)from jsonb_array_elements(s.snapshot->'program'->'exercises')e)sets from session_shares s join profiles p on p.id=s.sender_id where recipient_id=social_uid()and not exists(select 1 from social_blocks b where(b.owner_id=recipient_id and b.target_id=sender_id)or(b.target_id=recipient_id and b.owner_id=sender_id))order by created_at desc,id limit 25 offset greatest(0,p_offset))x),'[]'))
$$;
-- Personal catalogue IDs are globally unique: give the recipient its own identity.
create function public.session_program_personal_copy(e jsonb,p_seed text)returns jsonb language plpgsql immutable set search_path=public,pg_temp as $$declare out jsonb:=e;new_id text;begin
 if e->>'libraryScope'='personal' then
 new_id:='personal:shared:'||p_seed||':'||md5(coalesce(e->>'libraryId',e->>'id'));
 out:=(out-'originExerciseId')||jsonb_build_object('id',new_id,'libraryId',new_id,'libraryScope','personal');
 end if;
 if e?'alternative' then out:=out||jsonb_build_object('alternative',session_program_personal_copy(e->'alternative',p_seed));end if;
 if e?'exerciseReference' then out:=out||jsonb_build_object('exerciseReference',session_program_personal_copy(e->'exerciseReference',p_seed));end if;
 return out;end$$;
revoke all on function public.session_program_personal_copy(jsonb,text)from public,anon,authenticated;
create function public.session_share_save(p_id uuid,p_version bigint)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();s session_shares;d private_documents;t jsonb;tid text;begin
 perform session_share_open(p_id);
 select * into s from session_shares where id=p_id and recipient_id=u for update;
 select * into d from private_documents where owner_id=u for update;
 if d.version<>p_version or d.owner_id is null then raise exception 'SYNC_CONFLICT' using errcode='40001';end if;
 if s.saved_template_id is null then
 tid:=gen_random_uuid()::text;t:=s.snapshot->'program'||jsonb_build_object('id',tid,'exercises',(select jsonb_agg(session_program_personal_copy(e,tid)order by ord)from jsonb_array_elements(s.snapshot->'program'->'exercises')with ordinality a(e,ord)));
 update private_documents set payload=jsonb_set(payload,'{templates}',coalesce(payload->'templates','[]')||jsonb_build_array(t)),version=version+1,updated_at=now()where owner_id=u returning * into d;
 update session_shares set saved_template_id=tid,saved_at=now()where id=s.id;
 end if;
 return jsonb_build_object('payload',d.payload,'version',d.version);end$$;
revoke all on function public.session_program_exercise(jsonb),public.session_program_snapshot(jsonb)from public,anon,authenticated;
revoke all on function public.session_share_friends(),public.session_share_send(text,uuid[],uuid),public.session_share_open(uuid),public.session_share_inbox(integer),public.session_share_save(uuid,bigint)from public,anon;
grant execute on function public.session_share_friends(),public.session_share_send(text,uuid[],uuid),public.session_share_open(uuid),public.session_share_inbox(integer),public.session_share_save(uuid,bigint)to authenticated;
commit;
