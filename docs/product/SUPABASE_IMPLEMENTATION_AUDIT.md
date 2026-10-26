# Supabase Implementation Audit — Kalaswar

Prepared against `KALASWAR: COMPLETE SUPABASE BACKEND AND AUTHENTICATION IMPLEMENTATION`.
Date: 2026-10-26.

## 1. What was already present (verified, not recreated)

| Area | State |
|---|---|
| Database schema | All required entities exist in `public`: profiles, user_roles, group_memberships, artisans, shgs, buyers, buyer_requests, products, product media (products.image_url/image_public_id + media_assets), craft_stories, story_consents, artisan_skills, materials_inventory, material_price_history, product_cost_inputs, product_labour_inputs, product_cost_snapshots, custom_requests, proposals, proposal_approvals, quotations, quotation_versions, sample_requests, sample_events, orders, order_events, order_assignments, production_plans, production_events, quality_checks, shipments, shipment_events, payments, expenses, tips, product_drafts, product_signals, craft_guides, notifications, action_audit_logs. |
| Frontend–database connection | All reads/writes go through `frontend/src/lib/data.ts` (TanStack Query options over the generated browser Supabase client). No hardcoded arrays or mock fallbacks in the data layer. |
| Business logic | MakePossible (deterministic, unit-tested), FairPrice engine (deterministic cost snapshots), versioned quotations with preserved accepted terms, order-event timeline, story consent model, ten-stage production recording. |
| Seed data | Migration `0000` seeds interconnected demonstration data with fixed UUIDs; `0005` adds demo orders. Applied once through the migration journal (naturally idempotent). |
| Cloudinary | Unsigned upload flow (`VITE_CLOUDINARY_CLOUD_NAME=navinfpx`, `VITE_CLOUDINARY_UPLOAD_PRESET=kalaswar_product_images`), real upload verified, secure_url + public_id persisted to `products`. API secret never used client-side. |
| Migrations 0000–0010 | Plain-SQL Drizzle migrations, all applied to the live database. |

## 2. What was implemented in this round

### Phase 2 — Authentication (implemented and browser-verified)

- Email/password auth enabled on the project (email confirmation ON — signUp returns no session until the confirmation link is clicked; the UI shows a clear "Check your email" state).
- `/auth` — sign in and sign up. Registration fields: full name, email, password (min 8), preferred language (EN/HI/MR), account type (Customer / B2B buyer, with organisation name for buyers). Fully localized (EN/HI/MR).
- `/forgot-password` — sends reset link to `origin/reset-password`.
- `/reset-password` — recovery-hash check, new password form, `updateUser({ password })`.
- Header session affordance: shows "Sign in" when signed out; shows the user's name + Sign out when signed in (driven by `getUser()`).
- Root-level filtered `onAuthStateChange` listener (SIGNED_IN / SIGNED_OUT / USER_UPDATED) invalidates router + query cache.
- Ordered sign-out: cancelQueries → clear cache → signOut → navigate (replace) to /auth.
- Profile on signup via `handle_new_user()` trigger (deduplicated, `on conflict do nothing`): display name, preferred language (whitelisted), onboarding status. **Status: implemented and tested** (signup exercised in the browser; profile row verified in the database).

### Phase 3 — RBAC (implemented)

- `app_role` enum extended with `buyer` (artisan, coordinator, customer, admin already present).
- Signup metadata can grant ONLY `customer` or `buyer`. `coordinator`, `artisan`, and `admin` are never granted from signup — they require a trusted (service-role) assignment or an administrator.
- Organisation membership is explicit: `group_memberships` (user_id → shg_id / artisan_id, member_role). Coordinators are validated by `public.is_shg_coordinator(user_id, shg_id)` — role + membership must both hold. Buyers are validated by `public.owns_buyer(user_id, buyer_id)` via `buyers.user_id`. Artisans are validated by `public.is_org_artisan(user_id, artisan_id)`.
- The signed-in buyer's organisation record (`buyers.user_id`) is linked automatically when they save their buyer profile; their requests/quotations/orders/samples scope to it.

### Phase 5 — Production RLS (implemented, additive)

Migration `0010_production_auth_rbac.sql` adds authenticated, role/membership-scoped policies:
- buyers, buyer_requests — own organisation only.
- quotations, quotation_versions, sample_requests, sample_events — coordinator scoped to their SHG; buyer read for records shared with their organisation.
- orders, order_events, order_assignments, quality_checks, shipments, shipment_events, production_plans, production_events — coordinator scope via product → artisan → SHG; buyer read of own B2B orders.
- payments, expenses, materials_inventory, material_price_history, custom_requests, proposals, proposal_approvals — SHG coordinator scope.
- product_cost_inputs, product_cost_snapshots — product → SHG scope.
- product_drafts, craft_stories — owning artisan; coordinator scope for the SHG.
- tips — coordinator read for their SHG's artisans.
- notifications — audience-scoped (coordinator/buyer/artisan) with update-own-read-status policy.
- `authenticated` GRANTs added for every touched table.

**Demonstration-mode honesty note (by design, per product constraints):** the original demonstration policies (anon read of the public catalog; anon writes for the labeled demonstration journeys — assign, upload, tip, QR payments) remain in force so the demonstration environment keeps working without accounts. They are clearly labeled in the UI as demonstration records. Before serving real users, the anon-write policies must be removed (single migration) — this is documented as the remaining production-hardening step.

## 3. Phases not requiring new work

- **Phase 4 (schema)** — equivalent well-designed tables already existed; nothing duplicated.
- **Phase 6/7 (seed)** — see `docs/SEED_DATA_GUIDE.md`.
- **Phase 8 (data access)** — all modules listed in the phase already read/write persisted records; loading/empty/error states exist on the surfaces; no silent mock fallback.
- **Phase 9 (business logic)** — all specified transitions already implemented and unit-tested (see `frontend/src/test/`).
- **Phase 10 (Cloudinary/env)** — configured and verified; `.env.example` contains placeholders only; real credentials are not committed.

## 4. Statuses

| Item | Status |
|---|---|
| Sign-up, sign-in, sign-out, protected session state | Implemented and tested (signup + trigger verified; sign-in requires clicking the emailed confirmation link — cannot be completed from the sandbox) |
| Forgot / reset password | Implemented (UI + endpoints); end-to-end link click requires email access |
| Profiles + trigger | Implemented and tested |
| RBAC + helpers | Implemented and tested (role assignment verified on signup) |
| Production RLS policies | Implemented; exercised implicitly via the authenticated client paths. Full policy matrix (denied-path) testing with real accounts is pending — blocked on confirmed test accounts |
| Removal of demonstration anon-write policies | Not done by design — required before serving real users |
| Demo account provisioning | Partially implemented — accounts are created through the real signup flow (self-service); coordinator/artisan roles require a trusted assignment step (documented in SEED_DATA_GUIDE.md) |
| Seed idempotency | Implemented (migration-journal-based; seed runs once; upsert-style fixed UUIDs) |

## 5. Test results (actually executed)

- `bunx vitest run frontend/src/test` → **11 files / 85 tests, all passed** (core, MakePossible, stories/consents, FairPrice, B2B, earnings, demand, risk, routing).
- `bunx tsgo --noEmit` → clean.
- Build → OK.
- Browser-verified: signup → profile + role rows created; sign-in page, forgot-password page, reset-password page render; header session affordance reflects state.

## 6. Remaining actions requiring the owner

1. Confirm the test/demo accounts by clicking their emailed confirmation links (sandbox cannot read email).
2. Assign coordinator/artisan roles to real users after verifying identity (service-role operation or administrator UI step).
3. When ready for production users: remove the demonstration anon-write policies (one migration) and gate `/shg/*` + `/artisan-space` behind the `_authenticated` layout.
4. Optional: raise auth-email rate limits if many sign-ups are expected at once (`configure_auth` → rate_limit_email_sent).
