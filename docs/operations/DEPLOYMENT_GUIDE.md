# Kalaswar — Deployment Guide

## Publishing from Lovable (recommended)

1. Review the Implementation Audit; the current build is a labeled **demonstration**.
2. Configure Cloudinary (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`) so product
   image uploads work for real.
3. Publish from the Lovable editor. Cloud (database, auth, AI endpoints) is already wired; no
   separate backend deployment is needed.

## Before onboarding real SHGs (production hardening)

The demonstration deliberately trades security for an open walkthrough. Before real users:

1. **Authentication.** Wire sign-in (the `profiles` / `user_roles` / `has_role` scaffolding and
   the signup trigger already exist). Gate `/shg/*` behind the coordinator role and
   `/artisan-space` behind the artisan role.
2. **Replace demonstration RLS.** Every policy titled "Demo …" must become role-scoped: artisan
   rows visible to their SHG coordinator; requests visible to the involved customer + SHG;
   audit-log writes server-side only.
3. **Transactional confirmation.** Move `confirmCustomOrder` (product + order + request update)
   into an authenticated server function running in one transaction, verifying both approvals
   server-side.
4. **Capture customer identity.** Attach the authenticated customer to `custom_requests` at
   creation and scope list reads to the owner + involved coordinators.
5. **Payments.** Replace display-only UPI QR with a payment provider or at minimum a verified
   settlement record flow; keep "Kalaswar never processes money" only if that remains true.
6. **Cloudinary signed uploads.** Server-issued signatures, constrained preset (allowed formats,
   size cap), so upload credentials and preset are not abuseable from the browser.
7. **Localization QA with native speakers.** Machine-checked key parity is not fluency review,
   especially for voice prompts in Marathi/Hindi.
8. **Rate limiting and abuse controls.** Public endpoints (`/api/public/*`) verify callers but
   have no rate limiting; add provider-side or gateway-level controls before exposure.

## Smoke test after any deployment

1. Marketplace loads with images; language switch EN/HI/MR works everywhere.
2. Concierge: create a request → assessment cards render → route in SHG workroom → propose →
   both approvals → confirm order appears in Orders with a timeline.
3. Artisan space: voice ask "show pending orders" (and Hindi equivalent); text fallback returns
   data; product publish flow with photo upload.
4. CSV downloads on SHG reports/payments.
5. `npm test` green in CI.
