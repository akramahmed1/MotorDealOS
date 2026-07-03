# CLAUDE.md — MotorDealOS (v2)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Project constitution. Every Claude Code session must follow this document.

**THIS DOCUMENT WINS.** If any other document, chat context, README, or instruction conflicts with this file, follow this file and tell the human about the conflict. The companion SKILLS.md defines reusable task recipes.

## What this project is

MotorDealOS is the public website + operations system for MOTOR DEALS USA, a licensed independent used-car dealer in Glenview, IL. Goal (Phases 1–3): a fast, mobile-first, SEO-optimized public website with AI chat, a centralized lead inbox, and inventory synced from AutoFunds exports — replacing the template site at motordealsusa.com.

Dealership facts (never invent others):
- Name: MOTOR DEALS USA (legal: Cash Any Car LLC)
- Address: 1822 Johns Drive, Glenview, IL 60025
- Phone: (773) 350-0002 · Secondary: (224) 766-5842
- Hours: Mon–Sat 10:00 AM – 7:00 PM, Sunday closed
- ~35 used vehicles, mostly $4k–$28k, occasional premium units
- Serves Glenview, Morton Grove, Northbrook, Niles, Des Plaines, Skokie, Evanston and nearby Cook County towns

## The humans and how the business runs

Users of this system:
- **Owner (Akram)** — non-technical founder; directs, reviews, approves everything. Does title work and all pricing decisions.
- **USA salesperson (Zakariya)** — on the lot: inspection, recon, photos/videos, walk-in customers, leads.
- **Pakistan salesperson (Ayesha)** — remote: uploads inventory to AutoFunds, works leads (CarGurus, Facebook, Instagram, TikTok), follow-ups.

Every admin page must therefore be: browser-based, phone-friendly, simple enough for non-technical users, and usable from Pakistan (no US-only assumptions, no desktop-only layouts).

Operational flow: car bought at auction → transport booked via RingCentral → **7-day arbitration window starts at purchase** → arrival, inspection and recon at Glenview → photos/videos via WhatsApp to Pakistan → Ayesha uploads to AutoFunds → AutoFunds syndicates to website, CarGurus, CARFAX, CarsForSale → both salespeople work leads manually → customer visits, test drives, buys (cash or bank pre-approval check) → owner does title/paperwork.

Platform spend (integrate, never replace without explicit owner decision): CarGurus $2,350/mo (ads + leads) · CARFAX $2,000/mo · AutoFunds $125/mo (website + syndication backbone) · CarsForSale $115/mo · Frazer $115/mo. Total ≈ $4,705/mo. The lead inbox must attribute leads by source so each line item can eventually be judged on cost-per-lead.

**HARD RULE: Frazer DMS is read-only territory. Never build anything that writes to or modifies Frazer data.**

## Tech stack (do not deviate without flagging)

- Next.js latest stable major, App Router only. TypeScript strict. Zod validates all external input (forms, API routes, file imports, parsed emails).
- Tailwind CSS v4 + shadcn/ui. Mobile-first: design at 390px width, then scale up.
- Supabase (Postgres + Auth + Storage) via `@supabase/supabase-js` + `@supabase/ssr`. The deprecated `@supabase/auth-helpers-nextjs` must never be reintroduced.
- React Query client-side; prefer React Server Components.
- Hosting: Vercel only. No separate backend (no FastAPI/Railway/Redis/Celery) — Next.js API routes + Supabase edge functions. This supersedes older README/docs mentions of a Python backend.
- Media: Supabase Storage for vehicle photos (compressed/resized on upload) + next/image for delivery. Cloudinary is NOT in v1 — add only if traffic/transformation needs outgrow Storage. Videos are never self-hosted: upload to the MotorDeals USA YouTube channel and embed.
- Email: Gmail (motordealsusa@gmail.com) is the human mailbox. Resend is the machine layer: outbound owner alerts, and inbound CarGurus parsing via a Gmail auto-forward rule → Resend inbound address → webhook. Resend never replaces Gmail.
- AI calls: server-side only, provider configured by env var, never hardcoded.
- RingCentral: Phase 4+ (voice/SMS). Do not wire early.

## Security rules (non-negotiable)

1. Environments: the current Supabase project (yfxdyjlowcnjghntzffz) is DEV/STAGING — all building, previews, and testing happen there. A separate PRODUCTION Supabase project is created at launch (Stage C of LAUNCH-CHECKLIST): schema migrated step by step, Vercel production env vars repointed. Until then, nothing is "production data."
2. Secrets: `.env.local` locally, Vercel env vars in production. Never committed, logged, or placed in client code. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be client-side. `SUPABASE_SERVICE_ROLE_KEY` is server-only and avoided where an RLS policy works instead.
3. RLS stays enabled on all tables. Public reads only via policies (e.g., anonymous read of `vehicles` where `status='live'` and `deleted_at is null` — the real status enum is `acquired / recon / photo_ready / live / pending / sold / exported`; `'live'` is what gates public visibility). Never disable RLS to fix access — write a policy and give the human the SQL to run.
4. Claude Code never runs destructive database operations. Schema changes are proposed as reviewable SQL for the human to paste into the Supabase SQL editor.
5. All write endpoints validate with Zod and respect `rate_limits` and `unsubscribes`.
6. TCPA consent: every lead-capture point carries "By submitting, you agree that MOTOR DEALS USA may contact you by phone, text, or email about your inquiry." Store in `leads.source_metadata` (`{"consent": true, "consent_text_version": "v1"}`).
7. Customer-facing text (anything a car buyer reads) is shown to the owner before it ships.

## Database (source of truth: live Supabase; snapshot: docs/schema-snapshot.csv)

Key tables (multi-tenant via `company_id`): `vehicles` (VIN-keyed; year/make/model/trim/color/body_style/miles/price/status/photos jsonb/features; cost columns acquisition→total_cost_basis, profit_projection; soft delete), `vehicles_enriched` (read-only view with days_on_market — never write), `leads` (phone required; source, source_metadata, lead_score, status; soft delete), `chat_sessions`/`chat_messages`, `call_logs` (Twilio-shaped, Phase 4), `locations`, `companies`, `profiles`, `user_companies`, `content_queue`/`compliance_audits`/`hashtag_groups`/`follow_up_sequences` (Phase 4+), `job_queue`, `webhook_events`, `system_logs`, `rate_limits`, `unsubscribes`.

Conventions: uuid PKs, created_at/updated_at, soft deletes where `deleted_at` exists. **All vehicle matching is by VIN** (the team's workbook uses VIN last-6; full VIN in the database). Never match vehicles by name — names contain typos ("Toyato", "Volkswagon") and duplicates (two Jettas in stock).

## Build order (strict; one task = one branch = one PR)

1. **Stack modernization** — latest Next.js, @supabase/ssr migration, Tailwind 4, shadcn/ui init. Build passes.
2. **Public site core** — homepage (hero, featured vehicles, dealership info, hours), `/inventory` grid with filters (make, price range, body style, sort), `/inventory/[slug]` detail page (gallery, specs, price, "Schedule Test Drive" + "Ask About This Car" CTAs writing to `leads`). Reads only active, non-deleted vehicles.
   - 2.5. **Lead Inbox (revenue priority)** — (a) CarGurus lead-email ingestion: Gmail auto-forward (motordealsusa@gmail.com) → Resend inbound → webhook parsed into `leads` with source='cargurus' (mechanics: SKILLS.md Skill 3); (b) quick-add form (≤30 seconds on a phone) for Facebook/Instagram/TikTok/walk-in/phone leads; (c) one list view for all three users with fixed status set: new / contacted / appointment / came in / test drive / negotiating / sold / lost; (d) instant new-lead email alert to the owner. **Drafts only: the system never auto-sends anything to a customer.**
3. **SEO layer** — generateMetadata everywhere; JSON-LD `Vehicle`+`Offer` on detail pages, `AutoDealer` sitewide; dynamic sitemap.xml; robots.txt; slug URLs `/inventory/2013-porsche-cayenne-gts-{shortid}`; canonicals; OG images from first photo. Target pattern: "used {make} {model} {city} IL".
4. **Imports** — two importers, both VIN-keyed, both with preview-then-confirm:
   - **AutoFunds export** (HTML table with .xls extension; sample at `docs/autofunds-sample.xls`): upsert by VIN — insert new, update price/miles, mark absent VINs sold. Skip summary rows (empty Make). Admin drag-and-drop usable from Pakistan.
   - **Team operations workbook** (`docs/team-workbook-sample.xlsx`): leads sheets → `leads`; COSTING → vehicle cost columns (Category maps: Parts/Labor/Wash→ recon fields, Transport/Auction→transport_cost/acquisition adders, Marketing→marketing_cost); ARBITRATION purchase dates → vehicles.metadata.
   - **Source-of-truth & conflict rules:** AutoFunds decides a vehicle's existence and price; manual admin edits are for speed and corrections. An import must never un-sell a vehicle a human marked sold, and the preview must flag any row where the import would overwrite a manual edit so the human decides. Import failures alert the owner by email and are logged to system_logs.
   - **Photos gap:** export has pic counts, not URLs. Strategy A (try first): match VIN against current motordealsusa.com pages/RSS and pull image URLs, re-host to Supabase Storage (recipe: SKILLS.md Skill 8 — spike on 5 real cars before building any UI). Strategy B (always build): admin photo upload/reorder. If A is unreliable, tell the human (Strategy C: request image feed from AutoFunds support).
5. **AI chat** — ChatWidget + /api/chat: answers from live `vehicles` ("SUVs under $10k"), handles hours/location/financing/trade-in, always steers to capturing name+phone into `leads` (source='chat', consent per Security rule 5), persists to chat_sessions/chat_messages, server-side model calls, graceful fallback to contact form.
6. **Lead notifications** — new lead → instant email to owner (Resend free tier); Twilio SMS as later toggle.
7. **Launch-readiness pack** (required before domain cutover): Vercel Analytics/GA4 from first deploy; /privacy, /terms, footer + vehicle-page disclaimer "Price excludes tax, title, license, and documentation fee."; homepage reviews/trust section incl. since-2006 Ideal Cars (Dubai) heritage; weekly cron export of vehicles+leads CSVs to Supabase Storage (keep 8); remind the human: Google Search Console registration + Google Business Profile update at launch.

**Price-staleness rule:** website prices come from the latest AutoFunds export. After any price change in AutoFunds, a fresh export is uploaded the same day (the team's PRICING LOG sheet tracks this). Automating a daily feed pull is a Phase 4 refinement.

Phase 4+ — out of scope until the owner explicitly starts each: voice agent (call_logs is pre-shaped), social auto-posting (content_queue + compliance_audits + hashtag_groups), automated follow-up sequences (drafts-for-approval only), P&L dashboard on the vehicles cost columns, arbitration day-5 auto-reminder, post-sale review-request SMS, direct phone photo upload (bypassing WhatsApp compression), daily AutoFunds feed pull, PWA. Do not scaffold early. Out of scope for v1 entirely (may be revisited Phase 5+): MotorExport USA / international export line, dual-brand (Cash Any Car LLC vs MotorExport) handling, OFAC/export screening, financing calculator — see docs/archive/ for the original design covering these.

## Model usage & cost rules (two tiers only)

- **Tier 1 — Claude (paid): everything that ships.** All production code, anything customer-facing, anything touching leads, inventory, or money. Never downgrade shipped work to save tokens — quality here protects revenue.
- **Tier 2 — free/cheap models (NVIDIA NIM free tier: DeepSeek, Devstral, Mistral): throwaway work only.** Bulk data exploration, summarizing big logs/CSVs, first-draft research. Their output never ships directly; Claude redoes anything that matters.
- **Runtime AI (the website's chat) is cost-capped by design:** short system prompt, inventory injected as compact structured data (not prose dumps), responses capped, per-IP rate limiting via `rate_limits`. Choose the cheapest model that answers dealership questions well; the env-var provider switch makes upgrading trivial.
- **Token hygiene:** never paste huge raw files into a chat — read files with code, summarize with a free model first, or query the database directly.
- **Effort settings:** standard/high for normal work; skip max modes — they burn tokens with little gain at this task size.
- **Escalation rule:** judge output, not price. If a cheap model's work is weak, don't retry it three times — move it up a tier. Redoing mediocre work costs more than doing it right once.

## Karpathy rules & loop engineering (how every session runs)

The human is non-technical and verifies by clicking, not by reading code. The loop is the safety system:

**PLAN → BUILD → VERIFY → SHIP, one small loop at a time.**

1. **Think before coding.** Every task starts with a short plain-English plan + success criteria ("done means: you open the preview link on your phone, tap X, and see Y"). No code until the human approves the plan.
2. **Small verifiable chunks.** If the human can't verify it by clicking through a preview in under 10 minutes, the task is too big — split it.
3. **Surgical changes.** Touch the minimum files. Never refactor or "improve" things not asked about. No new dependencies without a one-line justification in the PR.
4. **Verify before claiming.** `npm run build` passes; feature checked at 390px and desktop; no console errors. Never say something works without having run it.
5. **Ship through the gate.** Branch → PR → Vercel preview URL. Every PR description includes "Preview: check X on mobile." **Never merge to main without the human's explicit go-ahead.** Nothing touches production data until the preview is confirmed.
6. **When output misses the bar, fix the spec, not the code.** Rewrite the task definition and redo cleanly rather than patching bad output incrementally.
7. **Flag risk before acting.** Anything touching live leads, live inventory, customer data, or money: stop, explain in plain English, confirm first.
8. **Plain English always.** Explain decisions like you're talking to a business owner; define any technical term in one line on first use. Give click-by-click instructions for anything the human must do, one step at a time.
9. **Honest ratings over validation.** Say when an idea is weak, a feature is premature, or the human is overcomplicating.
10. **Session loop:** START — 2–3 sentences on where the project stands and today's single task. END — plain-English summary of what was built, what the human verified, and the next session's task (pasteable into the next chat).

## Design standards

Media policy: photos are compressed and resized to defined web sizes on upload (target ≤400KB per image); videos live on the MotorDeals USA YouTube channel and are embedded, never uploaded to our storage; when a vehicle is marked sold, its photo set is trimmed to 3–5 archive images. Loading skeletons on inventory grid and vehicle detail (team and customers include slow connections).

Clean, modern, trustworthy dealership: generous whitespace, real vehicle photography front and center, consistent shadcn/ui components, no stock-photo clichés. Images via next/image, lazy-loaded below the fold; good mobile Core Web Vitals. Semantic HTML, labeled form fields, sufficient contrast. Public pages server-rendered (SEO is a primary goal).

## Growth compatibility (why this scales)

Every table already carries `company_id`; `user_companies` has a role enum; `locations` per company exists. This means: adding a second dealership lot is a new `locations` row, not a rebuild; adding a second tenant (DealershipOS customer) is a new `companies` row + onboarding flow, not a rewrite. Do not remove or rename `company_id` on any table. Do not build features that assume a single dealer, single lot, or single user role. Keep the codebase multi-tenant-clean even while there is only one customer (Motor Deals USA).

## Definition of done (every task)

1. `npm run build` succeeds, zero type errors.
2. Verified at 390px and desktop; no console errors.
3. No secrets or hardcoded credentials introduced; RLS still enabled; new SQL delivered as reviewable statements.
4. Consent + disclaimer requirements respected on any new customer-facing surface.
5. Branch pushed, PR opened with plain-English description + "Preview: check X on mobile" + what changed and how to test.
6. The human clicked the preview and said go — only then merge.
