// Fires on every INSERT into `leads` (via the leads_notify_owner DB trigger).
// Requires the same OWNER_ALERT_SECRET header as owner-alert. The anon key
// alone must not be enough to send this email. Never emails the customer.

import { handleLeadNotify } from '../_shared/lead-notify-handler.ts';

Deno.serve((req) =>
  handleLeadNotify(req, {
    secret: Deno.env.get('OWNER_ALERT_SECRET'),
    resendKey: Deno.env.get('RESEND_API_KEY'),
  }),
);
