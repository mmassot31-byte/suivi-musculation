-- Search the full private history instead of just the first candidate page.
begin;
create function public.personal_candidates_page(p_search text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$declare u uuid:=social_uid();begin
 return coalesce((select jsonb_agg(to_jsonb(x))from(select distinct on(identity_key,weight) identity_key as "identityKey",label,identity,weight,reps,(select max(total)from(select sum(x.tonnage)total from social_facts x where x.owner_id=u and x.active and x.identity_key=social_facts.identity_key group by x.session_id having count(*)=count(x.tonnage))v)tonnage,session_id as "sessionId",set_id as "setId",revision from social_facts where owner_id=u and active and identity_key is not null and position(lower(left(p_search,100))in lower(label))>0 order by identity_key,weight,reps desc,performed_at desc limit 500 offset greatest(0,least(coalesce(p_offset,0),100000)))x),'[]');end$$;
revoke all on function public.personal_candidates_page(text,integer)from public,anon;grant execute on function public.personal_candidates_page(text,integer)to authenticated;
notify pgrst,'reload schema';
commit;
