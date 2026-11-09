begin;
create table public.v2_season_history(owner_id uuid references auth.users(id),month text not null,timezone text not null,first_projected_at timestamptz not null default now(),primary key(owner_id,month));
alter table public.v2_season_history enable row level security;
create policy v2_season_history_owner on public.v2_season_history for select using(owner_id=auth.uid());
revoke all on public.v2_season_history from public,anon,authenticated;
grant select on public.v2_season_history to authenticated;
grant all on public.v2_season_history to service_role;
create or replace function public.v2_seasons() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(month order by month desc),'[]') from (select distinct e.month from v2_season_history e join v2_preferences p using(owner_id)
 where (p.public_profile or e.owner_id=auth.uid()) and not exists(select 1 from social_blocks b where (b.owner_id=auth.uid()and b.target_id=e.owner_id)or(b.target_id=auth.uid()and b.owner_id=e.owner_id)))s
$$;
commit;
