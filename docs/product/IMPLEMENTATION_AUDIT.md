# Kalaswar — Implementation Audit

Honest status of every major requirement, verified against the source on the date of writing.

## Working and verified

| Requirement | State | Evidence |
|---|---|---|
| Marketplace browse, search, categories, price sort | done | `/`, `/explore`; browser-verified; zero broken images |
| Artisan profiles + tipping (demo) | done | `/artisans`, `/artisan/$id`; tip records labeled demonstration |
| Gift Concierge request form + request codes | done | `/concierge`; KCR-1003 created end-to-end in browser test |
| MakePossible feasibility engine | done | pure, unit-tested (`frontend/src/test/makepossible.test.ts`, 12 tests); explainable reasons/missing/notes/suggested changes |
| Per-collective assessment cards + routing suggestion | done | browser-verified on `/concierge` and `/shg/requests` |
| Coordinator request review, decline, routing | done | browser-verified; decline preserves existing structured fields |
| Versioned proposals | done | v1 auto-increment per request; immutable spec JSON |
| Two-sided approval on exact version | done | browser-verified full journey: route → propose → coordinator approve → customer approve → confirm |
| Order confirmation creates product + linked custom order | done | `orders.is_custom`, `orders.proposal_id`; verified in database |
| Order events, CSV exports, payments (QR demo), ranking | done | pre-existing surfaces; order timeline reads `order_events` |
| Voice pipeline STT → assistant → TTS (EN/HI/MR) | done | `/api/public/*` endpoints on Lovable AI; text fallback + offline command router |
| Conversational product listing (multi-turn, tools) | done | draft persistence, publish tool, edit-screen navigation |
| Localization EN/HI/MR | done | dictionary parity enforced by test |
| i18n of new concierge/SHG strings | done | all new keys present in HI and MR |
| B2B Studio — buyer workspace | done | `/b2b` overview/discover/brief/quotes/samples/orders/profile; structured brief with required-field validation and draft saving; submission labeled "not an accepted order" |
| B2B — feasibility on briefs | done | MakePossible reused for buyer briefs; per-collective cards show recorded evidence, missing info, suggested changes |
| B2B — coordinator review + routing | done | `/shg/b2b`; clarify/decline recorded on the request; quotation routing is a coordinator decision |
| B2B — versioned quotations | done | drafts auto-version; changes to price/quantity/spec/dates require a new version; buyer acceptance preserves the accepted version; unapproved estimates labeled non-binding |
| B2B — sample workflow | done | sample events, spec-version link, coordinator stage controls, buyer feedback/approval with reapproval note |
| B2B — order + production stages | done | order confirmation requires an accepted version; `orders.source='b2b'`, `orders.buyer_request_id`; ten-stage timeline recordable by coordinator, visible to buyer |
| B2B — reorder | done | prefilled from prior specification with confirmed/decision state stripped; feasibility and pricing revalidated by design |
| B2B honesty tests | 13 tests | `frontend/src/test/b2b.test.ts`: validation, deadline mapping, missing-info over assumptions, versioning rules, totals, reorder stripping |
| Tests | 85 passing | core + makepossible + stories + fairprice + b2b + i18n parity |

## Known gaps (documented, not hidden)

1. **No authentication UI.** `/shg/*` and `/artisan-space` are demonstration-access pages. Auth
   scaffolding (profiles, user_roles, has_role, signup trigger) is in the schema but unused.
2. **Demo RLS.** Public tables allow anon reads; orders/products/assignments/tips allow anon
   writes. Fine for demonstration; must be replaced with role-scoped policies before real users.
3. **Non-transactional order confirmation.** `confirmCustomOrder` writes product → order → request
   update as separate client calls. A mid-way failure could leave partial records. Production
   should move this into a transactional, authenticated server function.
4. **Cloudinary unsigned uploads.** Real upload requires `VITE_CLOUDINARY_CLOUD_NAME` and
   `VITE_CLOUDINARY_UPLOAD_PRESET`; without them the UI shows a configuration error and never
   fakes success. Signed uploads (server-side) are the production recommendation.
5. **No payment settlement.** UPI QR is displayed; payment rows are demonstration records.
6. **Customer identity not captured.** Requests created via the concierge have no authenticated
   customer identity; requests are globally visible demo data.
7. **Coordinator scope.** The coordinator workroom is not scoped to one SHG.
8. **Production-time estimate is a heuristic.** Capacity/30 + 4-day buffer; always labelled as an
   estimate in UI copy.
9. **No external STT/TTS provider abstraction yet.** The pipeline is provider-shaped (three
   endpoints, server-side key) but only the built-in Lovable AI provider is implemented; the
   user has not chosen an external provider.

## Test coverage

- `frontend/src/test/kalaswar-core.test.ts` — EN/HI/MR dictionary parity and core data rules.
- `frontend/src/test/makepossible.test.ts` — feasibility statuses, missing-information rule (missing info
  never yields "potentially feasible"), generic-word matching guard, budget/deadline/capacity
  rules, deterministic production estimate.
- `frontend/src/test/voice-router.test.ts` — deterministic command routing in en/hi/mr.
