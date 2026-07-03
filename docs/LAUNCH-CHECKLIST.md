# LAUNCH-CHECKLIST.md — From Preview to Your Own Domain (v1)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Run this only after all Task 1–7 checklists in TEST-PLAN.md pass. Lives in /docs.

## Stage A — Soft launch (motordealos.vercel.app)
- [ ] Owner assets delivered: logo file, 3–4 chosen Google reviews, approved heritage text (since-2006 Ideal Cars Dubai)
- [ ] Three auth users provisioned with roles (owner, Zakariya, Ayesha) — each has logged in successfully
- [ ] Uptime monitor (free, e.g. UptimeRobot) pinging homepage; alert goes to motordealsusa@gmail.com
- [ ] Backup restore drill done once: Claude Code restores a weekly CSV into staging and shows the data is intact
- [ ] All seven task checklists green; test rows cleaned from database
- [ ] Real inventory current (fresh AutoFunds export imported this week)
- [ ] Photos present on all active vehicles (or consciously accepted gaps)
- [ ] Reviews/heritage section has real content approved by owner
- [ ] Analytics receiving data; owner alert email confirmed on owner's phone
- [ ] Zakariya and Ayesha have logins, have each added a lead and done an import
- [ ] Team instructed: leads worked from the inbox from today; 15-minute response habit starts now

## Stage B — Parallel run (60–90 days, both sites live)
- [ ] Scoreboard defined in PLATFORM COSTS sheet: leads/month per source, cost per lead, response time
- [ ] Weekly: import fresh AutoFunds export (price-staleness rule enforced via PRICING LOG checkboxes)
- [ ] Weekly: owner reviews inbox stats (new/contacted/sold counts per salesperson)
- [ ] Monthly: compare new site vs motordealsusa.com — leads generated, Search Console impressions
- [ ] Fix list collected; only bugs and Task 1–7 scope get built (no Phase 4 yet)

## Stage C — Domain cutover
- [ ] Production Supabase project created (fresh); schema migrated step by step from staging via reviewed SQL; RLS policies verified table by table
- [ ] Vercel production env vars repointed to the production project; preview envs stay on staging
- [ ] Fresh AutoFunds export imported into production (clean real data — staging test junk left behind); photos re-linked/verified
- [ ] Full TEST-PLAN Task 2.5 + Task 4 + Task 5 checks re-run once against production
- [ ] Confirm who owns motordealsusa.com registration (owner vs AutoFunds) — email AutoFunds support asking who the registrant of record is; decide: transfer, or buy a new domain (~$12)
- [ ] (Optional but recommended) Attorney reviews /privacy, /terms, and pricing disclaimer against Illinois dealer-advertising rules before cutover — ~1 hour of billed time
- [ ] Add domain in Vercel → Domains; follow DNS steps; HTTPS auto-issues
- [ ] If reusing the old domain: map old URLs → new with 301 redirects (Claude Code task: redirect map for top pages from Search Console data)
- [ ] Update domain on: Google Business Profile, CarGurus dealer profile, CARFAX, CarsForSale, Facebook/Instagram/TikTok bios, email signatures, printed material
- [ ] Search Console: add new domain property, submit sitemap
- [ ] Chat, forms, alerts re-tested on the final domain

## Stage D — Post-launch (first 30 days)
- [ ] Watch Search Console: vehicle pages getting indexed; fix crawl errors via Claude Code
- [ ] Review-request habit starts manually (SMS the Google link after each sale) until Phase 4 automates it
- [ ] First platform judgment: cost per lead per platform from real attribution — CARFAX $2,000 and CarsForSale $115 lines reviewed with data
- [ ] AutoFunds decision explicitly deferred or made (keep as $125 syndication utility is the default recommendation)
- [ ] Retro: what broke, what the team bypassed, what customers asked chat that it couldn't answer → feeds Phase 4 priorities

## Phase 4 gate
Phase 4 items (voice, P&L dashboard, arbitration alarm, review automation, follow-up drafts, social pipeline, direct photo upload, daily feed pull, PWA) remain locked until the owner explicitly opens one — one at a time, same loop.
