-- SUPERSEDED 2026-11-25 for the policies at the bottom of this file. Do not re-run those.
-- They grant the public anon key SELECT and UPDATE on rate_limits, which lets
-- anyone reset the counters. Replacement:
-- supabase/migrations/20261125120000_revoke_anon_chat_and_rate_limits.sql.
-- The column notes in this file are still the shape the app uses.
--
-- CONFIRMED 2026-07-21 against the live dev/staging table (yfxdyjlowcnjghntzffz):
-- rate_limits actually has ip_address (not identifier), endpoint, request_count,
-- window_start, created_at, id — plus an unused `count` column. There is no
-- `identifier` or `company_id` column. src/lib/rate-limit.ts has been updated
-- to select/insert against `ip_address`.
--
-- Run the SELECT below in the Supabase SQL editor to re-confirm the real shape
-- BEFORE relying on this in production. If columns differ, either adjust
-- src/lib/rate-limit.ts to match, or run the CREATE TABLE below (only if
-- rate_limits doesn't already exist under a different shape — check first).

-- 1. Confirm the existing table's real columns:
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'rate_limits'
order by ordinal_position;

-- 2. Only if rate_limits does not already exist (the SELECT above returns
--    nothing), create it matching what the code expects:
create table if not exists rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  endpoint text not null,
  request_count int not null default 1,
  window_start timestamptz not null default now()
);

create index if not exists rate_limits_identifier_endpoint_idx
  on rate_limits (identifier, endpoint, window_start);

alter table rate_limits enable row level security;

-- Anonymous chat requests need to read/write their own rate-limit counters,
-- scoped to insert+update only (no arbitrary read of other IPs' rows).
create policy if not exists rate_limits_anon_insert on rate_limits
  for insert to anon with check (true);

create policy if not exists rate_limits_anon_select on rate_limits
  for select to anon using (true);

create policy if not exists rate_limits_anon_update on rate_limits
  for update to anon using (true);
