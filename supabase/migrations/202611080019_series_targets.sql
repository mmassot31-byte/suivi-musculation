-- Additive target-based series challenges. Existing invitations and sporting facts stay intact.
begin;
alter table public.training_challenges alter column reference_id drop not null;
alter table public.training_challenges alter column variant_id drop not null;
alter table public.training_challenges add column exercise_key text references public.common_exercises(id);
alter table public.training_challenges add column target_reps integer check(target_reps between 1 and 10000);
alter table public.training_challenges add constraint series_target_shape check((target_reps is null and reference_id is not null and variant_id is not null)or(target_reps is not null and exercise_key is not null and weight between 0 and 1000000));

create function public.challenge_create_target(p_exercise text,p_weight numeric,p_reps integer,p_target uuid,p_days integer default 7)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();d jsonb;conv text;identifier uuid;expires timestamptz;token text;begin
 if p_days is null or p_days not in(7,14,30)or p_target is null or p_target=u or not exists(select 1 from profiles where id=p_target)then raise exception 'INVALID_INVITATION';end if;
 if exists(select 1 from social_blocks where(owner_id=u and target_id=p_target)or(owner_id=p_target and target_id=u))then raise exception 'PROFILE_UNAVAILABLE';end if;
 select definition into d from common_exercises where id=p_exercise;
 if d is null or coalesce(d->>'tracking','strength')<>'strength'or d->>'measurement'='duration'then raise exception 'INVALID_EXERCISE';end if;
 if p_weight is null or p_weight::text in('NaN','Infinity','-Infinity')or p_weight<0 or p_weight>1000000 or p_reps is null or p_reps<1 or p_reps>10000 then raise exception 'INVALID_TARGET';end if;
 conv:=case when d->>'measurement'='assistance'then 'Assistance'when d->>'measurement'='added_load'then 'Charge additionnelle'when d->>'loadMode'='unilateral'then 'Par côté'else 'Total'end;
 perform pg_advisory_xact_lock(hashtextextended(u::text,104));
 select id,invite_expires_at into identifier,expires from training_challenges where initiator_id=u and target_id=p_target and exercise_key=p_exercise and target_reps=p_reps and weight=p_weight and days=p_days and response='pending'and invite_expires_at>clock_timestamp()order by created_at desc limit 1;
 if identifier is not null then return jsonb_build_object('id',identifier,'token',null,'alreadyExists',true,'inviteExpiresAt',expires);end if;
 if(select count(*)from training_challenges where initiator_id=u and created_at>clock_timestamp()-interval '1 day')>=30 then raise exception 'INVITATION_LIMIT';end if;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into training_challenges(initiator_id,target_id,reference_revision,exercise_key,convention,weight,reference_reps,target_reps,days,token_hash)
 values(u,p_target,'target-v1',p_exercise,conv,p_weight,p_reps,p_reps,p_days,encode(sha256(convert_to(token,'UTF8')),'hex'))returning id,invite_expires_at into identifier,expires;
 return jsonb_build_object('id',identifier,'token',token,'inviteExpiresAt',expires);
end$$;
-- Retain the original 7/14-day challenges, add monthly custom targets.
alter table public.training_challenges drop constraint training_challenges_days_check;
alter table public.training_challenges add constraint training_challenges_days_check check(days in(7,14,30));
revoke all on function public.challenge_create_target(text,numeric,integer,uuid,integer)from public,anon;
grant execute on function public.challenge_create_target(text,numeric,integer,uuid,integer)to authenticated;

-- Same completed set, exact chosen kg, compatible load convention; both participants qualify independently.
-- Reuse the existing canonical exercise projection and timestamped sporting facts.
create function public.series_challenge_best(p_id uuid,p_owner uuid)returns integer language sql stable security definer set search_path=public,pg_temp as $$
 select max(r.reps)from training_challenges c join public_exercise_results r on r.exercise_key=c.exercise_key and r.owner_id=p_owner and r.active
 join public_exercise_groups g on g.id=r.group_id
 join social_facts f on f.owner_id=r.owner_id and f.session_id=r.session_id and f.exercise_id=r.exercise_id and f.set_id=r.set_id and f.active
 where c.id=p_id and p_owner in(c.initiator_id,c.target_id)and c.response='accepted'and r.weight=c.weight
 and g.unit='kg'and g.convention=c.convention and g.lateral_mode=case when c.convention='Par côté'then 'both-sides'else 'total'end
 and f.performed_at>=c.accepted_at and f.performed_at<=c.deadline and f.ended_at<=c.deadline
 and f.first_received_at>=c.accepted_at and f.first_received_at<=c.deadline and f.changed_at<=c.deadline
$$;
revoke all on function public.series_challenge_best(uuid,uuid)from public,anon,authenticated;
create or replace function public.challenge_respond(p_id uuid,p_accept boolean) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$declare c public.training_challenges%rowtype;accepted timestamptz:=clock_timestamp();begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into c from public.training_challenges where id=p_id and target_id=auth.uid() for update;if not found then raise exception 'CHALLENGE_NOT_FOUND';end if;
 if c.response='accepted' and p_accept then return jsonb_build_object('id',c.id,'status','active','deadline',c.deadline);end if;
 if p_accept is null or c.response<>'pending' or c.invite_expires_at<=accepted then raise exception 'INVITATION_EXPIRED_OR_USED';end if;
 if c.target_reps is null and not exists(select 1 from public.competition_performances where id=c.reference_id and active and content_revision=c.reference_revision) then raise exception 'REFERENCE_INVALIDATED';end if;
 update public.training_challenges set response=case when p_accept then 'accepted' else 'declined' end,accepted_at=case when p_accept then accepted else null end,deadline=case when p_accept then accepted+make_interval(days=>c.days) else null end,token_used_at=accepted where id=c.id;
 return jsonb_build_object('id',c.id,'status',case when p_accept then 'active' else 'declined' end,'deadline',case when p_accept then accepted+make_interval(days=>c.days) else null end);
end $$;
revoke all on function public.challenge_respond(uuid,boolean) from public;grant execute on function public.challenge_respond(uuid,boolean) to authenticated;

create or replace function public.challenge_list() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare answer jsonb;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 with visible as(select c.*,a.username initiator,b.username target,coalesce(d.definition->>'name',v.label)label,(c.target_reps is not null or exists(select 1 from public.competition_performances r where r.id=c.reference_id and r.active and r.content_revision=c.reference_revision)) valid_reference,
  case when c.target_reps is not null then public.series_challenge_best(c.id,auth.uid())else (select max(p.reps) from public.competition_performances p where p.owner_id=c.target_id and p.active and p.segment=0 and p.variant_id=c.variant_id and p.convention=c.convention and p.weight=c.weight and p.performed_at>=c.accepted_at and p.performed_at<=c.deadline and p.first_received_at>=c.accepted_at and p.first_received_at<=c.deadline and p.changed_at<=c.deadline)end best
  from public.training_challenges c join public.profiles a on a.id=c.initiator_id join public.profiles b on b.id=c.target_id left join public.exercise_variants v on v.id=c.variant_id left join public.common_exercises d on d.id=c.exercise_key where c.initiator_id=auth.uid() or c.target_id=auth.uid() order by case when c.target_id=auth.uid() and c.response='pending' and c.invite_expires_at>now() and(c.target_reps is not null or exists(select 1 from public.competition_performances p where p.id=c.reference_id and p.active and p.content_revision=c.reference_revision))then 0 else 1 end,c.created_at desc limit 100),serialized as(
  select jsonb_build_object('id',id,'variantId',variant_id,'label',label,'convention',convention,'weight',weight,'referenceReps',reference_reps,'targetReps',target_reps,'exerciseId',exercise_key,'initiatorBest',case when target_reps is not null then public.series_challenge_best(id,initiator_id)end,'targetBest',case when target_reps is not null then public.series_challenge_best(id,target_id)end,'initiatorId',initiator_id,'targetId',target_id,'initiator',initiator,'target',target,'days',days,
   'status',case when response in ('revoked','declined') then response when not valid_reference then 'invalid' when response='pending' and invite_expires_at<=now() then 'expired' when response='pending' then 'pending' when deadline>now() then 'active' else 'completed' end,
   'acceptedAt',accepted_at,'deadline',deadline,'inviteExpiresAt',invite_expires_at,'bestReps',best,'result',case when response<>'accepted' or not valid_reference then null when target_reps is not null then case when best>=target_reps then 'win'else 'not_reached'end when best>reference_reps then 'win' when best=reference_reps then 'tie' else 'not_reached' end,
   'provisional',response='accepted' and deadline>now(),'canRespond',response='pending' and invite_expires_at>now() and target_id=auth.uid() and valid_reference,'canRevoke',response='pending' and initiator_id=auth.uid()) item from visible
 ) select coalesce(jsonb_agg(item),'[]'::jsonb) into answer from serialized;return answer;
end $$;
create or replace function public.challenge_rematch(p_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare c public.training_challenges%rowtype;reference uuid;result jsonb;begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into c from public.training_challenges where id=p_id and (initiator_id=auth.uid() or target_id=auth.uid());if not found then raise exception 'CHALLENGE_NOT_FOUND';end if;
 if c.response='pending' and c.invite_expires_at>clock_timestamp() or c.response='accepted' and c.deadline>clock_timestamp() then raise exception 'CHALLENGE_NOT_FINISHED';end if;
 if c.target_reps is not null then result:=public.challenge_create_target(c.exercise_key,c.weight,c.target_reps,case when auth.uid()=c.initiator_id then c.target_id else c.initiator_id end,c.days);update training_challenges set parent_id=p_id where id=(result->>'id')::uuid;return result;end if;
 select id into reference from public.competition_performances where owner_id=auth.uid() and active and segment=0 and variant_id=c.variant_id and weight=c.weight order by reps desc,performed_at desc,id limit 1;
 if reference is null then raise exception 'NO_COMPARABLE_REFERENCE';end if;
 result:=public.challenge_create(reference,case when auth.uid()=c.initiator_id then c.target_id else c.initiator_id end,c.days);
 update public.training_challenges set parent_id=p_id where id=(result->>'id')::uuid;return result;
end $$;
revoke all on function public.challenge_rematch(uuid) from public;grant execute on function public.challenge_rematch(uuid) to authenticated;
create or replace function public.social_notifications()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();f bigint;g bigint;r bigint;c jsonb;begin
 select count(*)into f from friend_pairs p where u in(p.a,p.b)and p.sender<>u and p.state='pending'and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=p.sender)or(b.owner_id=p.sender and b.target_id=u));
 select count(*)into g from goal_challenges c where c.target_id=u and c.state='pending'and c.created_at>now()-interval '7 days'and social_friends(c.owner_id,u);
 select count(*)into r from training_challenges c where c.target_id=u and c.response='pending'and c.invite_expires_at>now()and(c.target_reps is not null or exists(select 1 from competition_performances p where p.id=c.reference_id and p.active and p.content_revision=c.reference_revision));
 c:=social_encouragements();return jsonb_build_object('friends',f,'goals',g,'records',r,'cheers',c->'unread','encouragements',c->'items','hasMoreCheers',c->'hasMore');
end$$;
notify pgrst,'reload schema';
commit;
