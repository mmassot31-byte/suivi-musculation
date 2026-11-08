-- Restrict new series invitations to accepted friends. Existing challenges stay intact.
begin;
create or replace function public.challenge_create_target(p_exercise text,p_weight numeric,p_reps integer,p_target uuid,p_days integer default 7)returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=social_uid();d jsonb;conv text;identifier uuid;expires timestamptz;token text;begin
 if p_days is null or p_days not in(7,14,30)or p_target is null or p_target=u or not exists(select 1 from profiles where id=p_target)then raise exception 'INVALID_INVITATION';end if;
 if exists(select 1 from social_blocks where(owner_id=u and target_id=p_target)or(owner_id=p_target and target_id=u))then raise exception 'PROFILE_UNAVAILABLE';end if;
 if not social_friends(u,p_target)then raise exception 'FRIEND_REQUIRED';end if;
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
notify pgrst,'reload schema';
commit;
