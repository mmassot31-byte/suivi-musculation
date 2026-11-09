begin;
-- V2 only; no changes to existing tables/functions/RLS/triggers.
create table if not exists public.v2_catalog(id text primary key, definition jsonb not null);
create table if not exists public.v2_accounts(
 owner_id uuid primary key references auth.users(id), source_version bigint not null default -1,
 result jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.v2_awards(
 owner_id uuid references auth.users(id), badge_id text references public.v2_catalog(id),
 earned_at timestamptz, session_id text, xp integer not null check(xp>=0),
 primary key(owner_id,badge_id));
create table if not exists public.v2_events(
 owner_id uuid references auth.users(id), event_key text, kind text not null check(kind in('activity','challenge','badge')),
 session_id text, at timestamptz, month text check(month is null or month~'^\d{4}-\d{2}$'),
 xp integer not null check(xp>=0), detail jsonb not null,
 primary key(owner_id,event_key));
create table if not exists public.v2_preferences(
 owner_id uuid primary key references auth.users(id), favorites text[] not null default '{}',
 public_profile boolean not null default false, timezone text not null default 'Europe/Paris',
 check(cardinality(favorites)<=3));
create table if not exists public.v2_requests(owner_id uuid primary key references auth.users(id), requested_at timestamptz not null default now());
create table if not exists public.v2_receipts(owner_id uuid references auth.users(id),session_id text,
 evidence jsonb not null,received_at timestamptz not null default now(), primary key(owner_id,session_id));
alter table public.v2_catalog enable row level security;
alter table public.v2_accounts enable row level security;
alter table public.v2_awards enable row level security;
alter table public.v2_events enable row level security;
alter table public.v2_preferences enable row level security;
alter table public.v2_requests enable row level security;
alter table public.v2_receipts enable row level security;
create policy v2_catalog_read on public.v2_catalog for select using(true);
create policy v2_accounts_owner on public.v2_accounts for select using(owner_id=auth.uid());
create policy v2_awards_owner on public.v2_awards for select using(owner_id=auth.uid());
create policy v2_events_owner on public.v2_events for select using(owner_id=auth.uid());
create policy v2_preferences_owner on public.v2_preferences for select using(owner_id=auth.uid());
create policy v2_requests_owner on public.v2_requests for select using(owner_id=auth.uid());
create policy v2_receipts_owner on public.v2_receipts for select using(owner_id=auth.uid());
revoke all on public.v2_catalog,public.v2_accounts,public.v2_awards,public.v2_events,public.v2_preferences,public.v2_requests,public.v2_receipts from public,anon,authenticated;
grant select on public.v2_catalog to anon,authenticated;
grant select on public.v2_accounts,public.v2_awards,public.v2_events,public.v2_preferences,public.v2_requests,public.v2_receipts to authenticated;
grant all on public.v2_catalog,public.v2_accounts,public.v2_awards,public.v2_events,public.v2_preferences,public.v2_requests,public.v2_receipts to service_role;
create or replace function public.v2_request_refresh() returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 insert into v2_requests(owner_id) values(auth.uid()) on conflict(owner_id) do update set requested_at=now();end $$;
create or replace function public.v2_set_preferences(p_favorites text[],p_public boolean,p_timezone text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid();begin
 if u is null then raise exception 'AUTH_REQUIRED';end if;
 if cardinality(p_favorites)>3 or (select count(distinct x) from unnest(p_favorites)x)<>cardinality(p_favorites)
 or exists(select 1 from unnest(p_favorites)x where not exists(select 1 from v2_awards where owner_id=u and badge_id=x)) then raise exception 'INVALID_FAVORITES';end if;
 if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'INVALID_TIMEZONE';end if;
 insert into v2_preferences(owner_id,favorites,public_profile,timezone)values(u,p_favorites,p_public,p_timezone)
 on conflict(owner_id)do update set favorites=excluded.favorites,public_profile=excluded.public_profile,timezone=excluded.timezone;
 end $$;
create or replace function public.v2_own() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select a.result || jsonb_build_object('favorites',coalesce(to_jsonb(p.favorites),'[]'::jsonb),'publicProfile',coalesce(p.public_profile,false),'sourceVersion',a.source_version)
 from v2_accounts a left join v2_preferences p using(owner_id) where a.owner_id=auth.uid()
$$;
-- Public projection deliberately excludes raw history, hidden badge criteria and private evidence.
create or replace function public.v2_profile(p_username text) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('version',2,'ownerId',p.id,'username',p.username,'xp',a.result->'xp','rank',a.result->'rank',
 'awards',(select coalesce(jsonb_agg(jsonb_build_object('id',w.badge_id,'earnedAt',w.earned_at,'xp',w.xp)),'[]') from v2_awards w where w.owner_id=p.id),
 'favorites',prefs.favorites) from profiles p join v2_accounts a on a.owner_id=p.id join v2_preferences prefs on prefs.owner_id=p.id
 where lower(p.username)=lower(p_username) and (prefs.public_profile or p.id=auth.uid())
 and not exists(select 1 from social_blocks b where (b.owner_id=auth.uid() and b.target_id=p.id)or(b.target_id=auth.uid() and b.owner_id=p.id))
$$;
create or replace function public.v2_seasons() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(month order by month desc),'[]') from (select distinct e.month from v2_events e join v2_preferences p using(owner_id)
 where e.month is not null and (p.public_profile or e.owner_id=auth.uid()) and not exists(select 1 from social_blocks b where (b.owner_id=auth.uid()and b.target_id=e.owner_id)or(b.target_id=auth.uid()and b.owner_id=e.owner_id)))s
$$;
create or replace function public.v2_season(p_month text,p_friends boolean default false,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare answer jsonb;begin
 if p_month!~'^\d{4}-(0[1-9]|1[0-2])$'or p_offset<0 then raise exception 'INVALID_SEASON';end if;
 with totals as(select e.owner_id,sum(e.xp)::bigint score from v2_events e join v2_preferences prefs using(owner_id)
 where e.month=p_month and e.kind<>'badge' and (prefs.public_profile or e.owner_id=auth.uid())
 and (not p_friends or e.owner_id=auth.uid()or social_friends(auth.uid(),e.owner_id))
 and not exists(select 1 from social_blocks b where(b.owner_id=auth.uid()and b.target_id=e.owner_id)or(b.target_id=auth.uid()and b.owner_id=e.owner_id))
 group by e.owner_id having sum(e.xp)>0), ranked as(select owner_id,score,dense_rank()over(order by score desc)place from totals), rows as(
 select r.*,p.username,a.result->'rank' rank from ranked r join profiles p on p.id=r.owner_id join v2_accounts a on a.owner_id=r.owner_id)
 select jsonb_build_object('version',2,'month',p_month,'total',(select count(*)from rows),'entries',
 (select coalesce(jsonb_agg(to_jsonb(s)order by s.score desc,s.owner_id),'[]')from(select *from rows order by score desc,owner_id limit 25 offset p_offset)s),
 'me',(select to_jsonb(m)from rows m where owner_id=auth.uid()))into answer;return answer;end $$;
revoke all on function public.v2_request_refresh(),public.v2_set_preferences(text[],boolean,text),public.v2_own(),public.v2_profile(text),public.v2_season(text,boolean,integer),public.v2_seasons() from public;
grant execute on function public.v2_request_refresh(),public.v2_set_preferences(text[],boolean,text),public.v2_own() to authenticated;
grant execute on function public.v2_profile(text),public.v2_season(text,boolean,integer),public.v2_seasons() to anon,authenticated;
commit;
