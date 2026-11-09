begin;
-- Preserve the existing account-deletion workflow; only V2-owned foreign keys change.
do $$declare fk record;begin
 for fk in select c.conname,t.relname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 where n.nspname='public'and t.relname in('v2_accounts','v2_awards','v2_events','v2_preferences','v2_requests','v2_receipts','v2_season_history','v2_challenge_receipts')and c.contype='f'and c.confrelid='auth.users'::regclass loop
 execute format('alter table public.%I drop constraint %I',fk.relname,fk.conname);
 execute format('alter table public.%I add constraint %I foreign key(owner_id) references auth.users(id) on delete cascade',fk.relname,fk.conname);
 end loop;
end $$;
commit;
