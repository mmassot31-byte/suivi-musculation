begin;
create table public.v2_challenge_receipts(owner_id uuid references auth.users(id),challenge_key text,kind text not null check(kind in('competitive','cooperative')),awarded_at timestamptz not null,primary key(owner_id,challenge_key));
alter table public.v2_challenge_receipts enable row level security;
create policy v2_challenge_receipts_owner on public.v2_challenge_receipts for select using(owner_id=auth.uid());
revoke all on public.v2_challenge_receipts from public,anon,authenticated;
grant select on public.v2_challenge_receipts to authenticated;
grant all on public.v2_challenge_receipts to service_role;
commit;
