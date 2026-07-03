# PRD.md — MotorDealOS Product Requirements (v1)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Companion to CLAUDE.md (constitution — wins on conflict) and SKILLS.md (task recipes). This document defines WHAT we're building and WHY. Lives in /docs.

## 1. Problem

MOTOR DEALS USA pays ~$4,705/month across five platforms (CarGurus $2,350, CARFAX $2,000, AutoFunds $125, CarsForSale $115, Frazer $115) but:
- The website is a dated AutoFunds template the dealership doesn't own or control.
- Leads from CarGurus, Facebook, Instagram, TikTok, walk-ins, and calls are worked manually by two salespeople (USA + Pakistan) in two inconsistent Excel tabs; no single view, no status tracking, no response-time visibility.
- Per-car costs are tracked in Excel keyed by fuzzy vehicle names (not VIN), so per-car profit is unanswerable.
- Nobody can attribute leads to platforms, so the $4,705/month can't be judged.
- No AI chat, no 24/7 lead capture, no SEO ownership, no review generation.

## 2. Goals (in priority order)

1. **Capture and centralize every lead** with instant owner alerts and status tracking (revenue priority — Task 2.5).
2. **Own the storefront:** modern, mobile-first, SEO-optimized website on our own domain.
3. **Keep the team's workflow unchanged:** AutoFunds remains the entry point and syndication pipe; our system ingests its exports.
4. **Answer customers 24/7** via AI chat that knows live inventory and always captures contact info.
5. **Make per-car profit answerable** by importing VIN-keyed cost data (dashboard in Phase 4).

## 3. Non-goals (explicitly out of scope for v1)

- Replacing AutoFunds' syndication feeds to CarGurus/CARFAX.
- Native iOS/Android apps (responsive web only; PWA is Phase 4+).
- Writing to Frazer DMS (permanently forbidden).
- Auto-sending any message to customers (drafts-for-approval only, all phases).
- AI voice agent, social auto-posting, follow-up automation (Phase 4, owner-initiated).

## 4. Users

| User | Role | Primary needs |
|---|---|---|
| Owner (Akram) | Approver, pricing, titles | Instant lead alerts; one dashboard; verify everything by phone preview |
| Zakariya (USA salesperson) | Lot ops, inspection, photos, leads | Quick-add leads in ≤30s on phone; see own lead queue |
| Ayesha (Pakistan salesperson) | AutoFunds entry, remote leads, follow-ups | Drag-and-drop import usable remotely; quick-add leads; see own lead queue |
| Car shoppers | Buy cars | Fast mobile browsing, real photos, easy "book test drive," instant chat answers |

## 5. Features (v1 scope)

### F1. Public website
- Homepage: hero, featured vehicles, dealership info block (name/address/phone/hours), trust section (Google reviews excerpts + since-2006 Ideal Cars Dubai heritage).
- /inventory: grid of active vehicles; filters: make, price range, body style; sort: price, newest.
- /inventory/[slug]: gallery, specs table (year/make/model/trim/color/miles/VIN), price with disclaimer, CTAs: "Schedule Test Drive," "Ask About This Car" → lead form with TCPA consent.
- Sell-your-car and contact pages (already scaffolded) wired to leads.
- Acceptance: renders correctly at 390px; loads real inventory from Supabase; every CTA creates a `leads` row and fires owner alert.

### F2. Lead Inbox (Task 2.5 — revenue priority)
- CarGurus email ingestion via inbound-email webhook → parsed to `leads` (SKILLS.md Skill 3), dedupe by phone/30 days.
- Quick-add form: date, name, phone, source dropdown (CarGurus/Facebook/Instagram/TikTok/CarsForSale/Website/Walk-in/Call/Referral), vehicle (VIN-linked), notes. ≤30 seconds on a phone.
- List view: filter by status/source/salesperson; statuses: new / contacted / appointment / came in / test drive / negotiating / sold / lost(-no-reply/-not-interested/-financing).
- Instant email alert to owner on every new lead.
- Acceptance: a CarGurus test email appears as a lead within 2 minutes; quick-add works from a phone in Pakistan; owner gets the alert.

### F3. SEO engine
- Per-vehicle indexable pages, generateMetadata, JSON-LD (Vehicle+Offer per car, AutoDealer sitewide), dynamic sitemap.xml, robots.txt, canonicals, OG images.
- Target queries: "used {make} {model} Glenview IL", "used cars under $10,000 Glenview", "cash cars Des Plaines/Skokie/Niles".
- Acceptance: Google Rich Results test passes on a vehicle page; sitemap lists all active vehicles.

### F4. Imports (Ayesha-operable)
- AutoFunds export importer (SKILLS.md Skill 1): drag-and-drop, VIN upsert, preview diff (new/updated/sold), confirm gate. Source-of-truth rules: AutoFunds decides existence + price; imports never un-sell a manually-sold car; preview flags import-vs-manual-edit conflicts for the human.
- Team workbook importer (Skill 2): leads, costs (category-mapped to vehicle cost columns), purchase dates; VIN6 resolution with human-review list for ambiguous rows.
- Photo strategy: A) scrape existing site images by VIN and re-host to Supabase Storage (Skill 8, spike-first on 5 cars); B) admin upload/reorder UI (always built); C) escalate to AutoFunds for image feed. Videos: YouTube embeds.
- Acceptance: uploading the real sample export produces the correct diff for the current 35 cars; costs from the workbook appear on the right vehicles.

### F5. AI chat
- Floating widget on all public pages; answers from live inventory + fixed dealership facts; steers every conversation toward name+phone capture (source='chat', consent stored); persists to chat_sessions/messages; contact-form fallback.
- Cost-capped: compact inventory context, response caps, per-IP rate limiting, cheapest-adequate model behind env-var switch.
- Acceptance: "SUVs under $10k" returns real matching cars; refusing to give phone still allows browsing; a completed capture creates a lead + alert.

### F6. Launch pack
- Vercel Analytics/GA4; /privacy, /terms; price disclaimer footer+vehicle pages ("Price excludes tax, title, license, and documentation fee."); weekly cron backup of vehicles+leads CSV to Storage (keep 8); human checklist: Search Console, Google Business Profile.

## 6. Success metrics (decided before launch, per CLAUDE.md)

- Leads/month by source (target: ≥ current manual count, then growth).
- Owner alert latency: target < 2 min from lead arrival (free-tier email has no delivery SLA; we measure, not promise).
- Team response time to new leads (target habit: ≤15 min in business hours).
- Cost per lead per platform (PLATFORM COSTS sheet → dashboard later).
- New site vs motordealsusa.com over 60–90 days parallel run: leads generated, Google impressions (Search Console).

## 7. Rollout

Local build → Vercel previews per PR (owner approves on phone) → motordealos.vercel.app live → 60–90 day parallel run → buy domain (~$12) → cutover → AutoFunds retained as syndication utility pending owner decision.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Photos not importable from existing site | Strategy B manual upload always built; Strategy C AutoFunds ask |
| Price staleness between AutoFunds and our site | Same-day export upload rule + PRICING LOG checkboxes; Phase 4 daily feed pull |
| Scope creep from founder ideation | New ideas go to Phase 4 list; one task per session (CLAUDE.md) |
| CarGurus email format changes | Raw payloads stored in webhook_events; parser fixable without data loss |
| Non-technical owner blocked by errors | Loop rule: paste error to Claude Code; after 2 failures, stop and escalate |
