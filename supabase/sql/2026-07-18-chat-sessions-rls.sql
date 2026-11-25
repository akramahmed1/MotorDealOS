-- SUPERSEDED 2026-11-25. Do not run this file.
-- It grants the public anon key SELECT and UPDATE on chat transcripts.
-- The replacement is supabase/migrations/20261125120000_revoke_anon_chat_and_rate_limits.sql.
-- Kept so the history of what was applied stays in the repo.
--
-- Task 5 (AI chat): fixes the actual root cause of every /api/chat request
-- failing in production. Confirmed via Vercel logs:
--   "new row violates row-level security policy for table chat_sessions"
-- The server-side Supabase client in /api/chat uses the anon key (correct,
-- per CLAUDE.md's "avoid service_role where RLS suffices" rule), but no RLS
-- policy exists letting anon write to chat_sessions/chat_messages at all.
--
-- KNOWN TRADEOFF (accepted for launch speed, revisit later): the anon key
-- has no per-user identity, so SELECT policies here are permissive
-- (using(true)) rather than scoped to "your own session." In practice this
-- means anyone holding the anon key (already public in client-side code)
-- could query the Supabase REST API directly and read any customer's chat
-- transcript, not just their own. Low risk pre-launch (no real customer
-- data yet, low traffic) — but should be hardened later, e.g. via a
-- Postgres function that checks session_token server-side, before this
-- carries real customer conversations at scale.
--
-- Run this in the Supabase SQL editor against the DEV/STAGING project
-- (yfxdyjlowcnjghntzffz).

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

create policy if not exists chat_sessions_anon_insert on chat_sessions
  for insert to anon with check (true);

create policy if not exists chat_sessions_anon_select on chat_sessions
  for select to anon using (true);

create policy if not exists chat_sessions_anon_update on chat_sessions
  for update to anon using (true);

create policy if not exists chat_messages_anon_insert on chat_messages
  for insert to anon with check (true);

create policy if not exists chat_messages_anon_select on chat_messages
  for select to anon using (true);
