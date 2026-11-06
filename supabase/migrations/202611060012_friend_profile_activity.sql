-- Reuse the public activity summaries; no private document, profile or score rewrite.
begin;
create function public.profile_activity(p_username text,p_offset integer default 0)returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare target uuid;off integer:=greatest(0,least(coalesce(p_offset,0),2000000000));items jsonb;more boolean;
begin
 select id into target from profiles where lower(username)=lower(trim(p_username));
 if target is null then raise exception 'PROFILE_NOT_FOUND';end if;
 select coalesce(jsonb_agg(friend_activity_data(x.id,true)order by x.occurred_at desc,x.id),'[]'::jsonb)into items
 from(select a.id,a.occurred_at from friend_activity a where a.owner_id=target and a.active and friend_activity_visible(a.id)order by a.occurred_at desc,a.id limit 5 offset off)x;
 select exists(select 1 from friend_activity a where a.owner_id=target and a.active and friend_activity_visible(a.id)order by a.occurred_at desc,a.id offset off+5 limit 1)into more;
 return jsonb_build_object('items',items,'hasMore',more,'automatic',true,'public',true);
end$$;
revoke all on function public.profile_activity(text,integer)from public,anon,authenticated;
grant execute on function public.profile_activity(text,integer)to anon,authenticated;
create or replace function public.community_capabilities()returns jsonb language sql stable as $$select '{"version":1,"friends":true,"badges":true,"goalChallenges":true,"friendFeed":true,"personalRankings":true,"publicActivity":true,"allExercises":true,"profileActivity":true}'::jsonb$$;
commit;
