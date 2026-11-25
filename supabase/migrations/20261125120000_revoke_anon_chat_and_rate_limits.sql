-- Remove the public anon key's access to chat transcripts and rate-limit counters.
--
-- What this session could confirm from the repo (not from a live query):
--   supabase/sql/2026-07-18-chat-sessions-rls.sql creates anon INSERT/SELECT/UPDATE
--   policies on chat_sessions and anon INSERT/SELECT on chat_messages, all USING (true).
--   supabase/sql/2026-07-11-rate-limits-check.sql creates anon INSERT/SELECT/UPDATE
--   policies on rate_limits, all USING (true).
--   docs/schema-snapshot.csv lists chat_sessions columns including user_name,
--   user_phone, and user_email, and chat_messages.content.
-- This file was NOT checked against the live Supabase project. Policy names in
-- the live database may differ. The loop below drops every policy on these
-- tables that is granted to anon or to PUBLIC, whatever it is called.
-- Policies granted only to authenticated (if any exist) are left in place.
-- No authenticated policy for these tables is in the repo.
--
-- After this runs, the Next.js server reads and writes these tables with the
-- service role (src/lib/chat-store.ts and src/lib/rate-limit.ts), which bypasses
-- RLS. Apply this only after that server code is deployed. Applying it first
-- makes chat and rate limiting fail closed until the new server is live.
--
-- Paste into the Supabase SQL editor for the dev/staging project. Do not run
-- against a different project without confirming the tables exist there.

do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name, c.relname as table_name, p.polname as policy_name
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('chat_sessions', 'chat_messages', 'rate_limits')
      and (
        p.polroles = array[0]::oid[] -- PUBLIC
        or exists (
          select 1
          from pg_roles role
          where role.oid = any (p.polroles)
            and role.rolname = 'anon'
        )
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policy_name, r.schema_name, r.table_name);
  end loop;
end $$;

do $$
begin
  if to_regclass('public.chat_sessions') is not null then
    execute 'alter table public.chat_sessions enable row level security';
    execute 'revoke all privileges on table public.chat_sessions from anon';
    execute 'revoke all privileges on table public.chat_sessions from public';
  end if;

  if to_regclass('public.chat_messages') is not null then
    execute 'alter table public.chat_messages enable row level security';
    execute 'revoke all privileges on table public.chat_messages from anon';
    execute 'revoke all privileges on table public.chat_messages from public';
  end if;

  if to_regclass('public.rate_limits') is not null then
    execute 'alter table public.rate_limits enable row level security';
    execute 'revoke all privileges on table public.rate_limits from anon';
    execute 'revoke all privileges on table public.rate_limits from public';
  end if;
end $$;
