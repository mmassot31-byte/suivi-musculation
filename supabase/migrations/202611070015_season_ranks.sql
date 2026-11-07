-- Read-only monthly activity league. No new performance source or user-data rewrite.
begin;
create function public.season_score(p_owner uuid,p_month date)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
with daily as materialized(select * from social_metrics(p_owner)),
activity_days as(select day from daily where sessions>0 union select(occurred_at at time zone social_timezone(p_owner))::date from friend_activity a where owner_id=p_owner and active and not exists(select 1 from social_facts f where f.owner_id=p_owner and f.session_id=a.session_id and f.active)),
m as(select(select count(*)from activity_days where day>=p_month and day<(p_month+interval '1 month')::date)::numeric days,coalesce(sum(work_sets),0)sets,coalesce(sum(tonnage_kg),0)tonnage,coalesce(sum(personal_challenges_completed+shared_challenges_completed),0)challenges from daily where day>=p_month and day<(p_month+interval '1 month')::date),
b as(select case when definition->>'family'like 'sessions_%'then 'sessions'when definition->>'family'like 'sets_%'then 'sets'when definition->>'family'like 'tonnage_%'then 'tonnage'when definition->>'family'in('active_weeks','streak_weeks')then 'regularity'when definition->>'family'like 'records_%'then 'records'else 'challenges'end category,max((definition->>'tier')::integer)tier from badge_occurrences o join badge_definitions d on d.id=o.badge_id where owner_id=p_owner and earned_at>=p_month and earned_at<(p_month+interval '1 month')::date group by 1),
p as(select least(days,12)*100 attendance,least(sets,300)*2 work,floor(least(tonnage,100000)/1000)*5 tonnage,coalesce((select sum(least(tier,6))*10 from b),0)badges,least(challenges,4)*75 challenges from m)
select jsonb_build_object('score',attendance+work+p.tonnage+badges+p.challenges,'points',jsonb_build_object('attendance',attendance,'sets',work,'tonnage',p.tonnage,'badges',badges,'challenges',p.challenges),'days',m.days,'sets',m.sets,'tonnageKg',m.tonnage,'challenges',m.challenges,'badgeCount',(select count(distinct badge_id)from badge_occurrences where owner_id=p_owner),'seasonBadgeCount',(select count(distinct badge_id)from badge_occurrences where owner_id=p_owner and earned_at>=p_month and earned_at<(p_month+interval '1 month')::date),'badges',coalesce((select jsonb_agg(id)from(select id from(select d.id,d.definition->>'family'family,(d.definition->>'tier')::integer tier,min(o.earned_at)earned,row_number()over(partition by d.definition->>'family'order by(d.definition->>'tier')::integer desc,min(o.earned_at)desc,d.id)family_order from badge_occurrences o join badge_definitions d on d.id=o.badge_id where o.owner_id=p_owner group by d.id,d.definition)x where family_order=1 order by tier desc,earned desc,id limit 3)y),'[]'::jsonb))from m cross join p
$$;
revoke all on function public.season_score(uuid,date)from public,anon,authenticated;
create function public.season_rankings(p_friends boolean default false,p_around boolean default true,p_offset integer default 0)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();month date:=date_trunc('month',now()at time zone 'Europe/Paris')::date;result jsonb;begin
 if p_friends and u is null then raise exception 'AUTH_REQUIRED';end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'INVALID_OFFSET';end if;
 with candidates as(select p.id,p.username,p.avatar_path from profiles p where (not p_friends or p.id=u or social_friends(u,p.id))and not exists(select 1 from social_blocks b where(b.owner_id=u and b.target_id=p.id)or(b.target_id=u and b.owner_id=p.id))),
 scored as materialized(select c.*,season_score(c.id,month)data from candidates c),
 ranked as(select *,rank()over(order by(data->>'score')::numeric desc)place,row_number()over(order by(data->>'score')::numeric desc,username::text,id)position from scored where(data->>'score')::numeric>0),
 mine as(select s.*,r.place,r.position from scored s left join ranked r on r.id=s.id where s.id=u),
 bounds as(select case when p_around and exists(select 1 from mine where position is not null)then greatest(0,(select position::integer from mine)-3)else p_offset end start),
 shown as(select * from ranked where position>(select start from bounds)order by position limit(case when p_around and u is not null then 5 else 25 end))
 select jsonb_build_object('version',1,'season',month,'endsAt',(month+interval '1 month')at time zone 'Europe/Paris','total',(select count(*)from ranked),'scope',case when p_friends then 'friends'else 'all'end,'offset',(select start from bounds),'limit',case when p_around and u is not null then 5 else 25 end,'me',(select data||jsonb_build_object('id',id,'username',username,'place',place,'position',position)from mine),'entries',coalesce((select jsonb_agg(data||jsonb_build_object('id',id,'username',username,'avatarPath',avatar_path,'place',place)order by position)from shown),'[]'::jsonb))into result;return result;
end$$;
revoke all on function public.season_rankings(boolean,boolean,integer)from public,anon,authenticated;
grant execute on function public.season_rankings(boolean,boolean,integer)to anon,authenticated;
create or replace function public.community_capabilities()returns jsonb language sql stable as $$select '{"version":1,"friends":true,"badges":true,"goalChallenges":true,"friendFeed":true,"personalRankings":true,"publicActivity":true,"allExercises":true,"profileActivity":true,"rankSeasons":true}'::jsonb$$;
notify pgrst,'reload schema';
commit;
