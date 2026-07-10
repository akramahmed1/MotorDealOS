-- Lead Inbox (2.5): align leads.status with the CLAUDE.md status set:
--   new / contacted / appointment / came in / test drive / negotiating / sold / lost
-- (matches the naming already in use by the dashboard UI on main, which uses
-- spaced values like 'came in' rather than underscores)
--
-- Likely a no-op: the Task 4b workbook importer already writes these exact
-- spaced status values against leads_status_check, so the live constraint
-- probably already permits them. Run the SELECT below first — if the
-- definition already lists 'came in' / 'test drive', skip steps 2-3.
-- Run this in the Supabase SQL editor against the DEV/STAGING project
-- (yfxdyjlowcnjghntzffz). Do not run against a production project without
-- re-checking this file's assumptions first.
--
-- This file assumes `status` is currently constrained by a CHECK constraint
-- named leads_status_check (Postgres' default naming for an unnamed CHECK on
-- that column). Run the SELECT below first to confirm the constraint name
-- before applying the ALTER statements.

-- 1. Confirm the existing constraint name and definition:
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'leads'::regclass and contype = 'c';

-- 2. Update any existing rows using the old 'negotiation' value, since the
--    app now writes 'negotiating':
update leads set status = 'negotiating' where status = 'negotiation';

-- 3. Drop the old constraint (replace the name below if step 1 showed a
--    different one) and add the expanded set:
alter table leads drop constraint if exists leads_status_check;
alter table leads add constraint leads_status_check
  check (status in ('new', 'contacted', 'appointment', 'came in', 'test drive', 'negotiating', 'sold', 'lost'));
