// Generic owner-alert email sender. Requires the OWNER_ALERT_SECRET header.
// The Supabase gateway still checks the anon JWT; that key alone is not enough
// to send mail. Never sends anything to a customer.

import { handleOwnerAlert } from '../_shared/owner-alert-handler.ts';

Deno.serve((req) =>
  handleOwnerAlert(req, {
    secret: Deno.env.get('OWNER_ALERT_SECRET'),
    resendKey: Deno.env.get('RESEND_API_KEY'),
  }),
);
