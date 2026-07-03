# SKILLS.md — MotorDealOS reusable task recipes

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Companion to CLAUDE.md (which always wins on conflict). These are step-by-step recipes Claude Code follows for recurring task types, so every session does them the same way. When a task matches a skill below, follow it; when it doesn't, follow the Karpathy loop in CLAUDE.md.

---

## Skill 1: Parse an AutoFunds inventory export

**Trigger:** any task involving `docs/autofunds-sample.xls` or an uploaded AutoFunds export.

1. The file is an **HTML table with a .xls extension**, UTF-8 with BOM — parse as HTML, never with an xls binary reader.
2. First row of the table is the header row. Columns include: Year, Make, Model, Trim, Color, Mileage, Vin, Internet Price, Pics #, Purchase Date, Age.
3. **Drop summary rows:** any row with empty Make is an AutoFunds average/total row, not a vehicle.
4. Normalize: trim whitespace; title-case Make consistently ("Mercedes-benz" → "Mercedes-Benz"); numeric-cast Mileage/Price/Age; validate VIN length 17.
5. Upsert into `vehicles` keyed by VIN: new VIN → insert (status='active'); existing VIN → update price/miles/color if changed; VIN in DB but absent from export → set status='sold' (never hard delete).
6. Always produce a preview diff (X new, Y updated with old→new price, Z marked sold) and require explicit confirm before writing.

## Skill 2: Parse the team operations workbook

**Trigger:** importing `docs/team-workbook-sample.xlsx` (MotorDeals_Team_Operations_v2 format).

1. Sheets: LEADS, COSTING, CAR TOTALS (formulas — skip on import), ARBITRATION-TRANSPORT, INSPECTION, SERVICE LOG, PRICING LOG, PLATFORM COSTS, VIOLATIONS.
2. Grey-italic rows are examples; import them only if they match real data (check VIN6 against inventory).
3. Vehicle matching uses **VIN6** (last 6 of VIN) → resolve to full VIN against `vehicles`. If VIN6 matches zero or multiple vehicles, list the row for human resolution — never guess.
4. LEADS → `leads`: map Source dropdown to `leads.source` (lowercase), Status dropdown to `leads.status`, Salesperson + Next Action into `source_metadata`.
5. COSTING → vehicle cost columns by Category: Parts/Labor-Service → service_cost; Wash-Detail → wash_cost/detail_cost; Transport → transport_cost; Auction Fee → acquisition adjustments; Marketing → marketing_cost; Gas/Other → service_cost with metadata note. Sum per VIN; show per-vehicle totals in the preview.
6. Dates may appear as text in legacy sheets — parse defensively (both MM/DD/YYYY and DD/M/YYYY seen historically); reject ambiguous dates to the human list rather than guessing.

## Skill 3: Parse a CarGurus lead email

**Trigger:** Lead Inbox ingestion work.

1. Flow: CarGurus lead email lands in motordealsusa@gmail.com → a Gmail auto-forward rule sends a copy to our Resend inbound address → Resend fires an `email.received` webhook to our API route. IMPORTANT (verified against Resend docs): the webhook contains METADATA ONLY — fetch the full body/attachments via Resend's received-emails API using the email_id. Verify the webhook signature. Store the raw payload in `webhook_events` before parsing.
2. Extract: customer name, phone, email, vehicle of interest (year/make/model, listing link), message text, received timestamp.
3. Match vehicle to `vehicles` by VIN when present in the listing link/reference; otherwise year+make+model with lowest-ambiguity match; ambiguous → leave vehicle_id null and note in source_metadata.
4. Insert into `leads` with source='cargurus', status='new', full raw parse into source_metadata. Dedupe on phone within 30 days — if a lead with the same phone exists, append to its notes instead of creating a duplicate.
5. Fire the owner alert (Skill 6). Never auto-reply to the customer.

## Skill 4: Propose a database change

**Trigger:** any schema/RLS change.

1. Never execute DDL. Write the SQL in a fenced block with a one-line plain-English explanation per statement.
2. Include the rollback statement(s) below it.
3. RLS: additive policies only; state which role (anon/authenticated) gains what access and why that's safe.
4. Ask the human to paste into Supabase SQL editor and confirm before writing any code that depends on the change.

## Skill 5: Build a public page

**Trigger:** any customer-facing page.

1. Server component by default; data fetched server-side from Supabase with anon-safe queries (active, non-deleted records only).
2. generateMetadata with title/description following the "used {make} {model} Glenview IL" pattern; canonical URL; OG image.
3. JSON-LD where applicable (Vehicle+Offer on detail pages; AutoDealer in layout).
4. 390px-first layout; next/image everywhere; price disclaimer on any page showing a price.
5. Verify: build passes, page renders with JS disabled, Lighthouse mobile sanity check.

## Skill 6: Owner alert

**Trigger:** any "notify the owner" requirement.

1. Email via Resend (env: RESEND_API_KEY, ALERT_EMAIL). Subject pattern: "[MotorDeals] New {source} lead: {name} — {vehicle}".
2. Body: plain text, phone number as tel: link, two-line summary, link to the lead in the admin.
3. Log the send in `system_logs`. Failures must not block the lead insert (queue retry via `job_queue`).

## Skill 7: Session hygiene

**Trigger:** every session.

1. Open: read CLAUDE.md; state project status in 2–3 sentences + today's single task; propose the plan + success criteria; wait for approval.
2. Work on a branch named `task/{short-name}`.
3. Close: PR with plain-English description + "Preview: check X on mobile"; session summary the human can paste into the next chat.
4. If the session uncovered anything CLAUDE.md should record (new rule, changed reality), propose the CLAUDE.md edit as part of the PR — keep the constitution current.

## Skill 8: Photo migration from the existing website

**Trigger:** Task 4 photo Strategy A.

1. **Spike first:** prove the whole pipeline on 5 real cars before building any UI. If <80% of those succeed cleanly, report to the human and pivot weight to Strategy B (manual upload).
2. Fetch motordealsusa.com inventory pages (and/or its RSS feed); build a map of VIN → vehicle page URL.
3. From each vehicle page, extract full-resolution image URLs (not thumbnails — inspect the gallery markup for the original-size variants).
4. Download each image; skip corrupt/tiny files (<20KB likely a placeholder).
5. Compress/resize to the media policy target (~1600px max dimension, ≤400KB) and upload to Supabase Storage under `vehicles/{vin}/{n}.jpg`; write the URL array to `vehicles.photos` preserving order (first image = primary/OG).
6. Produce a per-VIN report: images found / uploaded / failed. Failed or missing VINs go to the manual-upload list — never leave a car silently photo-less.
7. Be polite to the source site: sequential fetches with small delays; this is the dealership's own content on its own listings.

## Skill 9: Document/report outputs for the human

**Trigger:** any generated PDF, Word, CSV, or Excel deliverable.

1. Clean formatting is mandatory: no colliding text, no overflow outside boxes, no overlapping cells, controlled padding, wrapped text in all table cells, fixed column widths that fit the page, nothing cut off.
2. Excel: professional font, frozen header row, dropdowns for status-type columns, formulas instead of hardcoded computed values, zero formula errors before delivery.
3. Anything a customer might read goes to the owner for review before use.
