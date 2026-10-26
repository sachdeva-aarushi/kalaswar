# Kalaswar build roadmap

## Phase 1 — Foundation + marketplace (done)
- [x] Design tokens, typography (Playfair/Inter/Noto Devanagari), shared header/footer
- [x] Homepage with hero, craft discovery, makers, how-it-works, mission, closing
- [x] Explore with search/category/sort; product detail; artisan directory + profiles
- [x] Support (tip) interaction, demonstration-labeled

## Phase 2 — Artisan experience (done)
- [x] Voice-first mobile interface, Web Speech recognition + spoken responses
- [x] Bounded EN/HI command router reading live data; text fallback
- [x] Order sections, updates, earnings from the database

## Phase 3 — Coordinator workspace (done)
- [x] Overview KPIs + recent activity; order table with filter/search
- [x] Order assignment + status transitions persisted to the database (verified end to end)
- [x] Artisan workload view; product create/edit; CSV exports

## Phase 4 — Media + polish (done, one item open)
- [x] Cloudinary upload workflow (progress/validation/preview/persist) with clear unconfigured state
- [x] 10 product photographs incl. artisan uploads wired to marketplace
- [x] Tests (voice router, CSV, i18n coverage) passing; typecheck clean

## Phase 5 — AI voice agent + dialects (done)
- [x] Server-side speech-to-text route (Lovable AI) recording → transcription; verified round-trip
- [x] Server-side text-to-speech route (Lovable AI) streaming spoken replies; verified
- [x] LLM assistant with tools: order/payment/earnings answers from live data, autonomous screen navigation (verified: opens the product form by itself), step-by-step guidance in artisan's language
- [x] Marathi (mr) interface dictionary with full key coverage + tests
- [x] Marathi voice-command routing fallback

## Phase 6 — Payments + records + ranking (done)
- [x] UPI QR payments: SHG UPI ID entry, scannable QR for customers (verified), payment event records (demo-labelled)
- [x] Order event log ("contract"): auto-recorded assignment/production/delivery/payment steps, timeline UI in orders
- [x] Downloadable records: order-records CSV + payments CSV added to Reports
- [x] SHG ranking: on-time delivery + earnings fairness score, shown on the workspace overview

## Phase 7 — Gift Concierge + MakePossible (done)
- [x] Customer custom-request form (`/concierge`) with occasion/recipient/craft/materials/personalisation/quantity/budget/deadline/destination
- [x] Deterministic MakePossible feasibility engine over recorded skills/materials/capacity/workload/comparable prices; unit-tested; unknowns reported as missing, never invented
- [x] Per-collective assessment cards + routing suggestion; coordinator request review, decline (field-preserving), versioned proposals, request revisions
- [x] Two-sided approval on the exact proposal version; order confirmation creates catalog product + linked custom order (`orders.proposal_id`, `is_custom`)
- [x] Concierge added to customer navigation; demo-insert policy on orders for the confirmation journey
- [x] Required docs written: PRODUCT_REQUIREMENTS, ARCHITECTURE, IMPLEMENTATION_AUDIT, ENVIRONMENT_SETUP, DEPLOYMENT_GUIDE, API_INTEGRATION_STATUS, .env.example

## Open items
- [ ] Cloudinary credentials: workspace owner adds `VITE_CLOUDINARY_CLOUD_NAME` + `VITE_CLOUDINARY_UPLOAD_PRESET` (restricted unsigned preset) to enable real uploads — blocked on user input
- [ ] Production hardening before real users: auth for coordinator/artisan routes + scoped RLS to replace demo anon-writes
- [ ] Deployment: Lovable publishing replaces the spec's Vercel requirement (Vercel-specific config intentionally not added)

## Phase 8 — Document-coverage gaps (audit 2026-10-26)
Pages/data-layer tools that exist in code but are wired into no page:
- [x] Artisan side: dedicated "My assignments" view (quantity + due date + status) — orders exist but no assignment view per the Women-side doc
- [x] Artisan side: craft-guidance screen (craft_guides data + craftGuidesQuery exist; no page consumes them)
- [x] Artisan side: transparent price estimation UI (materials/labour/overhead/margin with visible assumptions) before listing
- [x] Coordinator: inventory management page (materials view/edit, low-stock flags) — data queried only inside MakePossible
- [x] Coordinator: production risk radar (deadline-miss flags from progress/remaining qty/capacity)
- [x] Coordinator: demand-informed planning view (views/saves/enquiries/purchases as distinct signals)
- [x] Coordinator: quality-check recording UI (recordQualityCheck exists, unused)
- [x] Coordinator: shipment/dispatch recording UI (recordShipment exists, unused)
- [x] Coordinator: expenses recording + view (recordExpense + expenses query exist, unused)
- [x] Customer: order-milestone tracking page (post-confirmation journey: design approved → production → QC → packed → shipped)
- [x] Customer: Craft Passport / maker-context section on product page (origin, maker info, verified-claims distinction)

## Phase 9 — Product Expansion: four pillars (in progress)
Source: uploaded Product Expansion Master Prompt. Audit: docs/PRODUCT_EXPANSION_AUDIT.md.
- [x] Foundation: audit doc; expansion migration (material price history, product cost inputs + labour stages + versioned snapshots, craft stories + consents, buyers, buyer requests, quotations + versions, sample requests + events, production plans + events, notifications) with labelled demo RLS
- [x] Pillar 3 — FairPrice Engine: deterministic calculator (material lines with wastage, labour stages, packaging, overhead, fees %, margin vs markup, paise-integer arithmetic, missing-input honesty) + coordinator pricing page with versioned snapshots + material price history
- [ ] Pillar 2 — Living Craft Stories: story editor (voice/text, AI-organised, maker approves), consent controls, Craft Passport upgrade, published stories on product pages
- [ ] Pillar 4 — B2B Studio: buyer onboarding + structured brief, MakePossible for briefs, coordinator review, versioned quotations, sample workflow, buyer dashboard + reorder revalidation
- [ ] Pillar 1 additions — artisan "what to do next" home aggregation; edit actor/timestamp tracking
- [ ] Shared — in-app notifications; operational reports from defined records; production planning UI
- [ ] Verification — tests for every honesty rule, e2e workflow, responsive + access-control checks, docs updated
