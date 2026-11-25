-- SUPERSEDED 2026-11-25 for new deploys. The function below authorizes the
-- edge function with the anon key only. lead-notify now also requires
-- x-owner-alert-secret. Use supabase/sql/2026-11-25-lead-notify-secret.sql
-- and do not generate a new anon key — copy the one already in use.
--
-- Fires the lead-notify Edge Function on every INSERT into `leads`, regardless of
-- which code path created the row (webhook, quick-add, or public CTA/contact forms
-- inserting directly via the browser client). This is why a DB trigger is used
-- instead of an API-route-level call — it's the only place that catches all paths.
--
-- Uses pg_net directly (rather than the supabase_functions.http_request helper,
-- which only gets provisioned automatically when a webhook is created through the
-- Dashboard UI — not available via raw SQL on this project).
--
-- Run this once in the Supabase SQL editor after the lead-notify function is deployed.
-- Replace <ANON_KEY> with your project's ANON key (Settings > API) — NEVER the
-- service_role key. This header only satisfies the Edge Function gateway's JWT check;
-- lead-notify's own code never uses this token to touch the database, so it needs no
-- elevated privileges. The anon key is safe to commit (same as NEXT_PUBLIC_SUPABASE_ANON_KEY
-- shipped client-side); service_role must never appear in a committed file.

create extension if not exists pg_net;

create or replace function notify_new_lead()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://yfxdyjlowcnjghntzffz.supabase.co/functions/v1/lead-notify',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := jsonb_build_object('type', 'INSERT', 'table', 'leads', 'schema', 'public', 'record', row_to_json(new))
  );
  return new;
end;
$$;

create or replace trigger leads_notify_owner
  after insert on leads
  for each row
  execute function notify_new_lead();
