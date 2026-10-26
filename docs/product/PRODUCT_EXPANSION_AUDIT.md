# Kalaswar — Product Expansion Audit

Date: 2026-10-26 · Source: KALASWAR Product Expansion Master Prompt (four pillars).
Baseline: Phases 1–8 of the existing build (marketplace, artisan space, coordinator workroom,
Gift Concierge + MakePossible, document-coverage gap build).

The expansion is additive. Nothing in the existing app is discarded; every pillar extends
records and routes that already exist.

## Pillar 1 — Voice-first artisan autonomy

| Requirement | Status | Notes |
|---|---|---|
| Voice/text assistant with screen navigation and form filling | Implemented and tested | `/artisan-space`; STT → assistant → streaming TTS with text + deterministic router fallbacks |
| Guided product creation (transcript → structured fields → review) | Implemented and tested | Conversational listing flow with persistent drafts (`product_drafts`); every extracted value reviewable; edit dialog pre-filled |
| Voice-based order understanding from real records | Implemented and tested | Assistant + bounded router answer from live orders/payments/earnings; unknowns reported as missing |
| Guided home screen (attention items, deadlines, materials) | Partially implemented | Orders, assignments, guides, honest money breakdown exist; no single "what to do next" home aggregation |
| Artisan autonomy safeguards (no auto-publish, no price overwrite, actor+timestamp on edits) | Partially implemented | Publication and price remain human actions; edit actor/timestamp tracking not yet recorded |
| Reusable voice input component with typed fallback | Implemented | `record-wav` + recorder hook; permission/unsupported states handled |
| `/workroom/*` route set | Adapted | Existing conventions kept: `/artisan-space` is the workroom; no duplicate route set created |

## Pillar 2 — Living Craft Stories

| Requirement | Status | Notes |
|---|---|---|
| Editorial product story experience (gallery, technique, maker, process) | Partially implemented | Product page shows craft context, making time where recorded, Craft Passport section |
| Craft Passport component with evidence-status distinctions | Partially implemented | Maker-provided vs collectively-recorded distinction exists; consent types and "last updated" not yet modelled |
| Story creation workflow (voice/text, AI-organised, artisan approves final) | Not implemented | `craft_guides` are reference guides, not maker stories; no story tables or editor yet |
| Consent and media-rights controls | Not implemented | No consent records; Cloudinary stores URL + public id already |
| Never invent biography/tradition/certification | Enforced by design | MakePossible honesty rules; stories will follow the same rule and be unit-tested |

## Pillar 3 — FairPrice Engine

| Requirement | Status | Notes |
|---|---|---|
| Basic cost-based estimator (materials, labour, overhead, margin) | Implemented and tested | `frontend/src/lib/price-estimate.ts` + UI in product form; refuses to suggest on missing labour |
| Full calculator: material lines with wastage, labour stages, packaging, fees %, margin vs markup | Not implemented | Needs material-line and labour-stage records |
| Material price history / ledger with staleness flags | Not implemented | Inventory quantities exist; prices are not recorded over time |
| Versioned cost snapshots (approved terms preserved) | Not implemented | Proposal versions exist for custom orders; product costing has no snapshots |
| Decimal-safe money arithmetic | Partially implemented | Estimator rounds at the end; engine will compute in integer paise |
| Never treats unpaid labour as free / never claims market fairness | Enforced by design | Existing honesty rules carry over and will be unit-tested |

## Pillar 4 — B2B Studio + MakePossible

| Requirement | Status | Notes |
|---|---|---|
| MakePossible deterministic feasibility engine | Implemented and tested | Skills/materials/capacity/workload/comparable prices; missing = missing; will be extended to buyer briefs |
| Buyer profiles + structured buyer brief | Not implemented | Concierge covers consumers; no institutional buyer entity or brief form |
| Coordinator review with recorded changed assumptions | Partially implemented | Custom-request review exists; no buyer-brief review surface |
| Versioned quotations (draft → accepted, expiry, terms preserved) | Not implemented | Proposal versioning exists for concierge; B2B quotations are separate entities |
| Sample workflow (spec-linked approval, events) | Not implemented | |
| Production planning (stages, assignments, quality, milestones) | Partially implemented | Order events, quality checks, shipments exist; no configurable stage plan |
| Repeat-order revalidation | Not implemented | |
| Buyer dashboard (requests, quotes, samples, orders, reorder) | Not implemented | |

## Shared system requirements

| Requirement | Status | Notes |
|---|---|---|
| Audit log of consequential actions | Implemented | `action_audit_logs` table; extended as pillars land |
| In-app notifications | Not implemented | |
| Operational reports from defined records only | Partially implemented | CSV exports + rankings exist; expansion metrics pending |
| RLS with least privilege | Demonstration-mode labelled | All tables: anon demo access by design; production scoping documented and required before real users |
| Cloudinary media boundary (no fake uploads) | Implemented | Unsigned workflow with explicit unconfigured state; signed flow documented |

## Decisions for the expansion build

1. Extend existing tables and conventions; new tables only for genuinely new entities
   (stories, consents, material prices, cost inputs/snapshots, buyers, buyer requests,
   quotations + versions, samples + events, production plans + events, notifications).
2. The same costing engine (`frontend/src/lib/fairprice.ts`, deterministic, paise-integer arithmetic)
   powers product price estimates and B2B quotations.
3. MakePossible stays pure deterministic code; AI never becomes the source of truth for
   feasibility, pricing, or approvals.
4. Route names follow existing conventions (coordinator surface stays under `/shg/*`;
   artisan surface stays `/artisan-space`; buyer surface is new `/b2b/*`).
5. Quotation and cost snapshots are versioned and immutable once approved; later edits
   create new versions — they never silently rewrite accepted terms.
