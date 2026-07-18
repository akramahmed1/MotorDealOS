-- Task 5 (AI chat): widens leads_public_insert to allow source='chat_agent',
-- not just 'website'. Confirmed via direct policy query:
--
--   leads_public_insert WITH CHECK:
--     (company_id = '00000000-0000-0000-0000-000000000001'::uuid)
--     AND (source = 'website'::text)
--     AND (((source_metadata ->> 'consent'::text))::boolean = true)
--
-- CLAUDE.md's own spec for Task 5 says chat-captured leads use
-- source='chat_agent' (for lead-source cost-per-lead attribution, same as
-- cargurus/facebook/etc.) — so the fix here is widening the policy to match
-- the intended design, not silently mislabeling chat leads as 'website' and
-- losing that attribution.
--
-- Run in the Supabase SQL editor against the DEV/STAGING project
-- (yfxdyjlowcnjghntzffz).

drop policy if exists leads_public_insert on leads;

create policy leads_public_insert on leads
  for insert to anon
  with check (
    company_id = '00000000-0000-0000-0000-000000000001'::uuid
    and source in ('website', 'chat_agent')
    and ((source_metadata ->> 'consent')::boolean = true)
  );
