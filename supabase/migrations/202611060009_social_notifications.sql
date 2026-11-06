-- Read-only, account-scoped invitation counters. No documents or scores are written.
begin;
create function public.social_notifications() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();f bigint;g bigint;r bigint;begin
 select count(*) into f from friend_pairs p where u in(p.a,p.b) and p.sender<>u and p.state='pending'
 and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=p.sender)or(b.owner_id=p.sender and b.target_id=u));
 select count(*) into g from goal_challenges c where c.target_id=u and c.state='pending' and c.created_at>now()-interval '7 days' and social_friends(c.owner_id,u);
 select count(*) into r from training_challenges c where c.target_id=u and c.response='pending' and c.invite_expires_at>now()
 and exists(select 1 from competition_performances p where p.id=c.reference_id and p.active and p.content_revision=c.reference_revision);
 return jsonb_build_object('friends',f,'goals',g,'records',r);
end$$;
revoke all on function public.social_notifications() from public,anon;
grant execute on function public.social_notifications() to authenticated;
create or replace function public.goal_list() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin
 return coalesce((select jsonb_agg(to_jsonb(x))from(select g.id,g.owner_id,g.target_id,g.metric,g.mode,g.quantity,g.days,g.title,g.baseline,g.started_at,g.deadline,g.created_at,a.username initiator,b.username target,
 case when g.state='pending' and (g.created_at<=now()-interval '7 days' or not social_friends(g.owner_id,g.target_id))then 'expired' when g.state='active' and g.deadline+interval '48 hours'<=now()then 'completed' when g.state='active' and g.deadline<=now()then 'confirming' else g.state end status,
 goal_value(g.id,g.owner_id)owner_value,goal_value(g.id,g.target_id)target_value,goal_won(g.id,u) won,
 exists(select 1 from goal_abandonments where goal_id=g.id and owner_id=u)abandoned,
 g.mode='personal' and not exists(select 1 from social_facts where owner_id=u and active and revision=g.baseline->>'revision' and session_id=g.baseline->>'sessionId' and set_id=g.baseline->>'setId')reference_invalid
 from goal_challenges g join profiles a on a.id=g.owner_id left join profiles b on b.id=g.target_id where u in(g.owner_id,coalesce(g.target_id,g.owner_id))order by case when g.target_id=u and g.state='pending' and g.created_at>now()-interval '7 days' and social_friends(g.owner_id,u)then 0 else 1 end,g.created_at desc limit 100)x),'[]');end$$;
create or replace function public.challenge_list() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare answer jsonb;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 with visible as(select c.*,a.username initiator,b.username target,v.label,exists(select 1 from public.competition_performances r where r.id=c.reference_id and r.active and r.content_revision=c.reference_revision) valid_reference,
  (select max(p.reps) from public.competition_performances p where p.owner_id=c.target_id and p.active and p.segment=0 and p.variant_id=c.variant_id and p.convention=c.convention and p.weight=c.weight and p.performed_at>=c.accepted_at and p.performed_at<=c.deadline and p.first_received_at>=c.accepted_at and p.first_received_at<=c.deadline and p.changed_at<=c.deadline) best
  from public.training_challenges c join public.profiles a on a.id=c.initiator_id join public.profiles b on b.id=c.target_id join public.exercise_variants v on v.id=c.variant_id where c.initiator_id=auth.uid() or c.target_id=auth.uid() order by case when c.target_id=auth.uid() and c.response='pending' and c.invite_expires_at>now() and exists(select 1 from public.competition_performances p where p.id=c.reference_id and p.active and p.content_revision=c.reference_revision)then 0 else 1 end,c.created_at desc limit 100),serialized as(
  select jsonb_build_object('id',id,'variantId',variant_id,'label',label,'convention',convention,'weight',weight,'referenceReps',reference_reps,'initiatorId',initiator_id,'targetId',target_id,'initiator',initiator,'target',target,'days',days,
   'status',case when response in ('revoked','declined') then response when not valid_reference then 'invalid' when response='pending' and invite_expires_at<=now() then 'expired' when response='pending' then 'pending' when deadline>now() then 'active' else 'completed' end,
   'acceptedAt',accepted_at,'deadline',deadline,'inviteExpiresAt',invite_expires_at,'bestReps',best,'result',case when response<>'accepted' or not valid_reference then null when best>reference_reps then 'win' when best=reference_reps then 'tie' else 'not_reached' end,
   'provisional',response='accepted' and deadline>now(),'canRespond',response='pending' and invite_expires_at>now() and target_id=auth.uid() and valid_reference,'canRevoke',response='pending' and initiator_id=auth.uid()) item from visible
 ) select coalesce(jsonb_agg(item),'[]'::jsonb) into answer from serialized;return answer;
end $$;
notify pgrst,'reload schema';
commit;
