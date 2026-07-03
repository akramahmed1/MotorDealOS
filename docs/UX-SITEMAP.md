# UX-SITEMAP.md — Pages, Layout, and Design Brief (v1)

> **FROZEN v1.0 — July 2, 2026.** Reviewed and locked. Changes only via a PR that also updates this version line.

Design direction for every page. CLAUDE.md design standards apply (mobile-first at 390px, shadcn/ui, next/image, server-rendered). Lives in /docs.

## Design direction

Trustworthy independent dealership, not a startup landing page. Generous whitespace, real vehicle photography as the hero content, dark-navy/white base with one accent color, Arial-class clean typography via Tailwind defaults. No stock photos of handshakes, no carousels that auto-move, no popups on load. Price always visible with the Illinois disclaimer nearby. Every page answers within one scroll: what is this car / who are you / how do I act.

## Sitemap

```
/                        Homepage
/inventory               All vehicles (filter/sort)
/inventory/[slug]        Vehicle detail (per car)
/sell-your-car           We buy cars (form)
/contact                 Contact + map + hours
/privacy  /terms         Legal
/sitemap.xml /robots.txt SEO
--- authenticated ---
/login
/admin                   Dashboard home (lead + inventory snapshot)
/admin/leads             Lead inbox (list, filters, statuses)
/admin/leads/new         Quick-add (≤30s on phone)
/admin/vehicles          Vehicle list (days on lot, price, photo count)
/admin/vehicles/[id]     Edit + photo upload/reorder
/admin/import            Drag-and-drop: AutoFunds export / team workbook
```

## Page briefs

### Homepage `/`
1. Header: logo/name, phone tap-to-call, nav (Inventory · Sell Your Car · Contact).
2. Hero: one strong photo or featured car, headline ("Quality used cars in Glenview — cash & bank pre-approval welcome"), search/browse CTA.
3. Featured vehicles: 4–6 cards (photo, year make model, price, mileage) → detail pages.
4. Why-us strip: since-2006 Ideal Cars (Dubai) heritage, on-lot inspection, buy-any-car.
5. Reviews: 3–4 curated Google reviews + rating.
6. Info block: address (map link), hours, both phone numbers.
7. Footer: legal links + price disclaimer.
Chat widget floats bottom-right on all public pages.

### Inventory `/inventory`
- Sticky filter bar (mobile: collapsible sheet): Make · Price range · Body style · Sort (price ↑↓, newest).
- Card grid (1-col at 390px, 2 at tablet, 3–4 desktop): photo, year make model trim, price, mileage, days-listed badge if fresh ("Just arrived").
- Empty state: "No matches — tap to clear filters or ask us in chat."

### Vehicle detail `/inventory/[slug]`
- Gallery first (swipeable on mobile), then: title, price + disclaimer, key specs row (miles · year · body · color), spec table (incl. VIN), description.
- Sticky mobile action bar: [Schedule Test Drive] [Ask About This Car] [Call].
- Both CTAs open a short form: name, phone, preferred day (test drive), message — consent line under the button.
- Below: 3 similar vehicles (rule: same body style AND price within ±30%; fallback: same make; fewer than 3 matches → show newest arrivals).

### Sell Your Car / Contact
- Sell: year/make/model/mileage/condition/photos-optional + phone → leads (source='sell-your-car').
- Contact: form + embedded map + hours + tap-to-call.

### Admin — Lead Inbox `/admin/leads`
- Table (mobile: stacked cards): time, name, phone (tap-to-call), source badge, vehicle, status pill, assigned salesperson.
- Filters: status, source, salesperson, date. Search by name/phone.
- Row tap → detail drawer: full history/notes, status change dropdown, add note. No send-message buttons in v1 (drafts-only rule).
- "＋ New Lead" always visible → quick-add form.

### Admin — Import `/admin/import`
- Two labeled drop zones: "AutoFunds inventory export (.xls)" and "Team workbook (.xlsx)".
- After parse: preview screen — counts + expandable lists (new / price changes old→new / marked sold / ambiguous rows needing human decision).
- Confirm button states exactly what will happen. Nothing writes before confirm.

### Admin — Vehicles
- List with photo count and days-on-lot columns (surfaces the "7 pics at 77 days" problem automatically).
- Detail: edit fields, photo upload + drag-reorder, cost fields (read-mostly; filled by import).

## Component notes
- Lead status pills: fixed palette (new=blue, contacted=amber, appointment=purple, came in=teal, sold=green, lost=gray).
- All phone numbers everywhere are tap-to-call links.
- Forms: single column, large touch targets, inline validation, one screen where possible.
- Photos: next/image (Supabase Storage remote pattern configured), aspect-ratio locked cards, blur placeholder; first photo = OG image.
- Loading states: skeleton screens on inventory grid and vehicle detail — the site must feel alive on slow connections (customers on cellular, team in Pakistan).
