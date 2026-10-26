# Kalaswar — Product Requirements

Kalaswar connects underprivileged women artisans (many speaking Hindi, Marathi or other Indian
languages) with customers, with the minimum necessary dependence on Self-Help Groups (SHGs).

## Personas and surfaces

| Surface | Route | Who | Purpose |
|---|---|---|---|
| Marketplace | `/`, `/explore`, `/artisans`, `/artisan/$id`, `/product/$id` | Customers | Browse crafts, read artisan stories, tip artisans, reach the Gift Concierge |
| Gift Concierge | `/concierge` | Customers | Describe a custom gift, see transparent feasibility, receive and approve a coordinator proposal |
| Artisan Space | `/artisan-space` | Artisans | Voice-first workspace: pending orders, earnings, product listing with guided conversation, UPI QR payments |
| SHG Workroom | `/shg`, `/shg/orders`, `/shg/artisans`, `/shg/products`, `/shg/payments`, `/shg/reports`, `/shg/requests` | Coordinators | Overview, order assignment, skills-aware custom-request review, product management, CSV exports |

## Core requirements

1. **Voice-first assistance (EN / HI / MR).** A 100% autonomous conversational assistant on the
   artisan space: speech-to-text → assistant (with tools) → streaming text-to-speech, screen
   navigation, form filling, and order/payment question answering. Text input and a deterministic
   command router are always available as fallbacks — voice is never the only path.
2. **Gift Concierge + MakePossible.** Customers describe occasion, recipient, craft, materials,
   personalisation, quantity, budget, deadline and destination. A deterministic, evidence-based
   engine (`src/lib/makepossible.ts`) checks the request against each collective's *recorded*
   skills, materials, monthly capacity, active workload and comparable prices, and returns one of
   four statuses with reasons: `potentially_feasible`, `feasible_with_changes`,
   `not_currently_feasible`, `insufficient_information`. Unknowns are reported as missing — never
   invented.
3. **Coordinator-reviewed, versioned proposals.** Coordinators route requests, prepare versioned
   proposals (v1, v2, …), and every approval is recorded against an exact proposal version.
4. **Two-sided approval before production.** A custom order may be confirmed only when both the
   customer and the coordinator have approved the same proposal version. Confirmation creates the
   catalog product and the linked order (`orders.proposal_id`, `orders.is_custom`) and moves the
   request to `confirmed`.
5. **Order lifecycle records.** Every order step appends to `order_events`; timelines and CSV
   exports read from it. Shipment milestones, quality checks and expenses are recorded entities.
6. **Payments (demonstration).** UPI QR codes are generated client-side from the collective's own
   UPI ID. Kalaswar displays the QR and records demonstration payment rows; it never processes or
   verifies money.
7. **Ranking.** SHG clusters are ranked by on-time delivery plus earnings fairness.
8. **Localization.** Single dictionary i18n in `src/lib/i18n.tsx` covering English, Hindi and
   Marathi; every English key must exist in HI and MR (enforced by test).
9. **Demonstration honesty.** All demo data is visibly labelled; nothing simulates success that is
   not actually happening (e.g. unconfigured Cloudinary shows a configuration error, never a fake
   upload).
10. **Downloads.** Records (orders, payments, reports, order timelines) are downloadable as CSV.

## Out of scope for the current demonstration build

- Real authentication for artisans/coordinators (private pages use labeled demonstration access).
- Payment settlement, logistics booking, and provider-configurable STT/TTS (built-in Lovable AI
  pipeline is live; provider abstraction is documented in ARCHITECTURE.md).
- Signed Cloudinary uploads (unsigned preset documented in API_INTEGRATION_STATUS.md).
