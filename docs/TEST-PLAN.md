# TEST-PLAN.md — Owner Verification Checklists (v1)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

You verify by clicking, not by reading code. Each task below lists exactly what to check on the Vercel preview (on your iPhone) before saying "approved, merge." If any line fails, paste the failure into Claude Code — do not merge. Lives in /docs.

## Task 1 — Stack modernization
- [ ] Claude Code reports `npm run build` passed
- [ ] http://localhost:3000 loads without errors (placeholder page is fine)
- [ ] Login page still renders at /login

## Task 2 — Public site core (+ seed of real inventory)
- [ ] Homepage loads on your phone: header, hero, featured cars, info block, footer
- [ ] Your real cars appear (≈35) on /inventory
- [ ] Filters work: pick "Lexus" → only Lexus; set price under $10,000 → only those cars
- [ ] Tap any car → detail page shows correct year/make/model/price/mileage
- [ ] Tap "Schedule Test Drive" → form opens → submit with your own name/phone
- [ ] That test lead appears in the database (Claude Code shows you where until inbox exists)
- [ ] Consent line appears under every form button
- [ ] Nothing looks broken at phone width: no sideways scrolling, no overlapping text
- [ ] Tap-to-call works on the phone number

## Task 2.5 — Lead Inbox
- [ ] /admin/leads shows your Task-2 test lead
- [ ] "＋ New Lead" quick-add: enter a fake Facebook lead in under 30 seconds on your phone
- [ ] Change its status new → contacted → appointment; pills update
- [ ] Filter by source and by salesperson works
- [ ] Send the CarGurus test email (Claude Code gives you the address) → lead appears within 2 minutes with source "cargurus"
- [ ] You received the owner alert email for it, and the phone number in the email is tap-to-call
- [ ] Send the same test email again → no duplicate (note appended instead)
- [ ] Ayesha can log in and see the same inbox (send her the preview link)

## Task 3 — SEO layer
- [ ] Share a vehicle page link into WhatsApp → preview shows car photo + title
- [ ] yoursite/sitemap.xml lists all active cars
- [ ] Paste a vehicle page URL into Google's Rich Results Test (search "rich results test") → Vehicle detected, no errors
- [ ] Page titles read like "Used 2013 Porsche Cayenne GTS for Sale in Glenview IL | MOTOR DEALS USA"
- [ ] Sold car's page returns a proper "no longer available" state, not an error

## Task 4 — Imports
- [ ] /admin/import: drag this week's real AutoFunds export in
- [ ] Preview shows sensible numbers (new/updated/sold) — sanity-check 2–3 cars against AutoFunds
- [ ] Confirm → /inventory reflects changes (a price you know changed shows the new price)
- [ ] Drag the export in a second time → preview shows zero changes (idempotent)
- [ ] Import the team workbook → check one car you know had costs → its cost fields are right
- [ ] Ambiguous VIN6 rows appear in a human-review list, not silently guessed
- [ ] Photos: at least one vehicle shows imported photos, or the manual upload works (add + reorder from your phone)
- [ ] Ayesha's FIRST import: guided live on a call (screen-share). Her SECOND import: solo from Pakistan without help — that's the pass

## Task 5 — AI chat
- [ ] Widget appears on homepage and vehicle pages, opens smoothly on phone
- [ ] Ask "any SUVs under $10k?" → real matching cars from current inventory
- [ ] Ask hours, address, "do you take trade-ins?" → correct answers
- [ ] Ask something unknowable ("do you sell boats?") → polite honest answer, steers to contact
- [ ] Give name + phone in chat → lead appears in inbox with source "chat" + owner alert
- [ ] Refuse to give contact info → chat stays helpful, no nagging loop
- [ ] Ask Claude Code to simulate model-down → widget falls back to contact form
- [ ] Rapid-fire 20+ messages → rate limit responds politely (no crash, no big bill)

## Task 6 — Notifications
- [ ] Every lead source (form, chat, quick-add, CarGurus email) triggers exactly one owner email
- [ ] Alert arrives < 2 minutes; subject shows source + name + vehicle

## Task 7 — Launch pack
- [ ] /privacy and /terms exist and are readable
- [ ] Price disclaimer visible in footer and on vehicle pages
- [ ] Analytics dashboard shows your own test visits
- [ ] Weekly backup: Claude Code shows you the CSVs in Supabase Storage after a manual trigger
- [ ] You completed the human checklist: Search Console verified, Google Business Profile updated

## Stage C — Production cutover verification (post-migration)
- [ ] Production Supabase project responds; RLS policies match staging (spot-check 3 tables)
- [ ] Fresh AutoFunds import into production shows correct diff (numbers match a same-day staging import)
- [ ] One test lead through website form → appears in production `leads` + owner alert delivered to motordealsusa@gmail.com
- [ ] AI chat responds on production URL with real production inventory
- [ ] Weekly backup cron ran once on production (or manually triggered) — CSVs in production Storage
- [ ] Staging remains reachable and unchanged for future testing

## Standing rules
- One task per session; verify before merge; after 2 failed fixes of the same error, stop and escalate the exact error text.
- All building/previews run against the DEV/STAGING Supabase project — test freely with fake data. Production database doesn't exist until launch (Stage C); after cutover, testing stays on staging.
- Browser matrix each task: Safari on iPhone (primary), Chrome on Android (ask Ayesha/Zakariya), Chrome desktop. 
- Slow-connection check on Tasks 2 and 4: throttle or ask the Pakistan team — skeletons appear, images load progressively, nothing hangs blank.
