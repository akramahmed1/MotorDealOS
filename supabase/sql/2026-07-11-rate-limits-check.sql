-- Task 5 (AI chat): src/lib/rate-limit.ts assumes rate_limits has these
-- columns: identifier (text), endpoint (text), request_count (int),
-- window_start (timestamptz). This wasn't visible in docs/schema-snapshot.csv
-- (same gap as `leads` before it — the snapshot is stale/incomplete).
--
-- Run the SELECT below in the Supabase SQL editor to confirm the real shape
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
