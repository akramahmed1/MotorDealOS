# ARCHITECTURE.md — MotorDealOS System Design (v1)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Plain-English + technical reference. CLAUDE.md wins on conflict. Lives in /docs.

## 1. The system in one picture (text form)

```
                         ┌────────────────────────────────────────┐
  AUCTION → TRANSPORT →  │  AutoFunds (team's entry point, $125)  │
  INSPECTION → PHOTOS →  │  syndicates → CarGurus / CARFAX /      │
  (Ayesha uploads)       │  CarsForSale / old website             │
                         └───────────────┬────────────────────────┘
                                         │ weekly export (.xls/HTML)
                                         ▼
                     ┌────────────── MotorDealOS ──────────────────┐
                     │  Next.js app on Vercel (free tier)          │
                     │   ├─ Public site (SSR, SEO, AI chat)        │
                     │   ├─ Admin (imports, lead inbox, vehicles)  │
                     │   └─ API routes (chat, leads, webhooks)     │
                     │  Supabase (free tier)                       │
                     │   ├─ Postgres (18 tables, RLS on)           │
                     │   ├─ Auth (owner + 2 salespeople)           │
                     │   └─ Storage (photos, weekly backups)       │
                     │  YouTube (car videos, embedded, free)       │
                     │  Resend (owner alerts + inbound email)      │
                     └──────────────────────────────────────────────┘
                                         ▲
     CarGurus lead emails ───────────────┘ (inbound webhook)
     FB/IG/TikTok/walk-in leads ─────────┘ (quick-add form)
```

Frazer DMS: read-only territory, no integration. RingCentral: Phase 4 (voice/SMS).

## 2. Stack decisions and reasoning

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (latest stable), App Router | SSR for SEO, API routes replace a backend, Vercel-native |
| Language | TypeScript strict + Zod | Catches errors before the non-technical owner ever sees them |
| UI | Tailwind v4 + shadcn/ui | Professional look without a designer; consistent components |
| DB/Auth/Storage | Supabase | Already provisioned; RLS enforces security; free tier sufficient |
| Data client | @supabase/ssr + supabase-js | Current supported libraries (auth-helpers is deprecated) |
| Hosting | Vercel | Free, auto-deploy on merge, preview URL per PR = owner's review gate |
| Email | Gmail (motordealsusa@gmail.com) + Resend | Gmail = human mailbox. Resend = machine layer: app-sent alerts + inbound parsing (Gmail auto-forward → Resend webhook; body fetched via API, metadata-only webhooks) |
| Media | Supabase Storage + upload compression + next/image | One less service/account; sufficient at 35-car scale. Videos: YouTube embeds (free, unlimited, SEO bonus). Cloudinary only if scale demands later |
| AI (chat) | Provider behind env var | Cheapest adequate model; swappable without code changes |
| Rejected | FastAPI/Railway/Redis/Celery | Unneeded complexity/cost at this scale; Next.js + edge functions suffice |

## 3. Data flows

### 3.1 Inventory (weekly, Ayesha)
1. Ayesha updates AutoFunds as usual → downloads inventory export.
2. Admin → Import page → drag-and-drop file.
3. Server parses (HTML-in-.xls; Skill 1), normalizes, validates VINs.
4. Preview diff: X new, Y updated (old→new price), Z marked sold.
5. Ayesha confirms → upsert `vehicles` by VIN → site + sitemap update automatically.
Price-staleness rule: any AutoFunds price change ⇒ fresh export uploaded same day.

### 3.2 Leads
- CarGurus: lead email → motordealsusa@gmail.com → Gmail auto-forward rule → Resend inbound webhook (metadata) → body fetched via Resend API → raw stored in `webhook_events` → parsed (Skill 3) → `leads` (dedupe by phone/30d) → owner alert to motordealsusa@gmail.com (Skill 6).
- Website: form/chat capture → validated (Zod, consent) → `leads` → alert.
- Social/walk-in/call: quick-add form → `leads` → alert.
- All leads visible in one inbox; status transitions tracked; nothing auto-sends to customers.

### 3.3 AI chat
1. Widget opens session (`chat_sessions`, session_token, rate-limited by IP via `rate_limits`).
2. Message → /api/chat (server) → model call with: compact system prompt + dealership facts + structured snapshot of matching active vehicles.
3. Reply persisted (`chat_messages`); contact details captured → `leads` + link session.lead_id.
4. Model failure → graceful fallback: contact form.

### 3.4 Costs & operations (from team workbook)
Workbook (VIN6-keyed) → importer (Skill 2) → vehicle cost columns + leads. CAR TOTALS math moves to `vehicles.total_cost_basis`; `vehicles_enriched.days_on_market` replaces the manual Car Age sheet. P&L dashboard reads these in Phase 4.

## 4. Security model

- RLS on every table, always. Anonymous role: read active/non-deleted vehicles only; insert-only paths for leads/chat with validation + rate limits. Authenticated roles per `user_companies`.
- Secrets: .env.local (dev) / Vercel env (prod). Client sees only NEXT_PUBLIC_* anon values. service_role never leaves server context and is avoided where policies suffice.
- Claude Code proposes SQL; the human executes it in the Supabase SQL editor (no autonomous DDL).
- TCPA: consent text on all capture points, stored in source_metadata; `unsubscribes` honored by any future outbound.
- Auditability: webhook payloads (`webhook_events`), system events (`system_logs`), failed jobs retried via `job_queue`.

## 5. Environments

| Env | What | Data |
|---|---|---|
| Local (C:\Motordeals\MotorDealOS) | npm run dev | DEV/STAGING Supabase (yfxdyjlowcnjghntzffz) |
| PR Preview (Vercel) | auto per PR | DEV/STAGING Supabase — test freely; this is what staging is for |
| Production (motordealos.vercel.app → domain later) | main branch | DEV/STAGING until launch. At Stage C: new PRODUCTION Supabase project created, schema migrated step by step, production env vars repointed, real data imported fresh |

The current project is deliberately treated as dev/staging from day one (it holds no production data). Production gets a clean, separate project at launch — proven schema in, test junk left behind.

## 6. Media strategy & storage math

Photos: compressed/resized on upload (~1600px, ≤400KB). Active lot ≈ 35 cars × 25 photos ≈ 0.3–0.5GB in Supabase Storage — comfortably inside the free tier. Inventory rotates rather than accumulates: sold cars are trimmed to 3–5 archive photos, so active storage plateaus instead of growing forever. Videos are never self-hosted — one walkaround is 100–300MB; they go to the MotorDeals USA YouTube channel (free, unlimited) and are embedded, which is also standalone SEO. Database rows (vehicles/leads/chats) are text — years of history fits in hundreds of MB. Paid-tier triggers to watch (dashboard numbers, not surprises): inventory past ~100–150 cars, image bandwidth past the Storage free allowance, or DB past the free ceiling → roughly $25/mo Supabase Pro at a business size that trivially justifies it.

## 7. Monitoring (v1-light)

Errors and import failures → `system_logs` + owner email alert; Vercel's built-in logs for API routes; a free uptime monitor (e.g., UptimeRobot) pinging the homepage and /api/health. Sentry-class error tracking is a Phase 4 add if bug volume justifies it.

## 8. Cost envelope

Build: $0 new spend (Claude subscription already held; free tiers: Vercel, Supabase ×2 projects, Resend, YouTube). Launch: domain ~$12/year. Runtime AI chat: pennies at expected volume, capped by design. Existing platform spend unchanged until owner decides otherwise.
