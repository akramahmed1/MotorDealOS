-- Teach the existing lead-notify trigger to send x-owner-alert-secret.
--
-- This does NOT rotate the anon key or the service role key. The edge
-- function gateway still wants the anon key it already has. Copy that same
-- key into Vault under the name supabase_anon_key (it is already public).
-- OWNER_ALERT_SECRET is a new random string, set in three places to the
-- same value:
--   1. Supabase Edge Function secret OWNER_ALERT_SECRET (owner-alert and lead-notify)
--   2. Vercel env OWNER_ALERT_SECRET (server-side, not NEXT_PUBLIC_)
--   3. Vault secret named owner_alert_secret (the command below)
--
-- Order, so real lead emails do not stop:
--   1. Generate the new secret (for example: openssl rand -hex 32).
--   2. Set it on the Edge Functions and in Vercel, and store both vault secrets.
--   3. Run this file in the SQL editor.
--   4. Deploy the updated owner-alert and lead-notify functions.
-- Deploying the functions before step 3 makes the trigger's calls return 401.
--
-- This session did not query the live database. Vault and pg_net are what the
-- previous trigger file already depended on. If vault.create_secret rejects a
-- duplicate name, the secret is already there — update it in the dashboard
-- instead of creating a second one.
--
--   select vault.create_secret('<existing anon key>', 'supabase_anon_key');
--   select vault.create_secret('<new OWNER_ALERT_SECRET>', 'owner_alert_secret');

create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create or replace function notify_new_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alert_secret text;
  anon_key text;
begin
  select decrypted_secret into alert_secret
  from vault.decrypted_secrets
  where name = 'owner_alert_secret'
  limit 1;

  select decrypted_secret into anon_key
  from vault.decrypted_secrets
  where name = 'supabase_anon_key'
  limit 1;

  if alert_secret is null or length(alert_secret) = 0 or anon_key is null or length(anon_key) = 0 then
    raise warning 'lead alert skipped: vault secrets owner_alert_secret and supabase_anon_key must both be set';
    return new;
  end if;

  perform net.http_post(
    url := 'https://yfxdyjlowcnjghntzffz.supabase.co/functions/v1/lead-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-owner-alert-secret', alert_secret
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'leads',
      'schema', 'public',
      'record', row_to_json(new)
    )
  );
  return new;
end;
$$;
