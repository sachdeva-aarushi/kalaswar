# SCREEN_MAP.md — Kalaswar Screen & Route Mapping

This registry maps every screen from the Stitch project **"Kalaswar Workroom Coordinator Dashboard"** (`projects/11153964424737758981`) to application routes, access roles, required backend endpoints (`backend/openapi.json`), shared UI components, and implementation status.

> [!IMPORTANT]
> **VISUAL FREEZE PROTOCOL (AGENTS.md & docs/FROZEN.md)**:
> Landing (`/`) and Auth (`/auth`) are strictly frozen. All newly implemented routes below are scoped under `.kw-app` with semantic design tokens and shared Radix/shadcn components.

---

## 1. Layout Shells & Core Navigation (Global Architecture)

| Screen / Layout Shell | Interface | Route | Roles Allowed | Backend Endpoints Needed | Shared Components Reused | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Workroom App Shell** | `WORKROOM` | `/workroom/*` | `coordinator`, `admin`, `artisan` | `GET /api/v1/auth/me`, `GET /api/v1/notifications/summary` | `WorkroomShell`, `Sidebar`, `SiteHeader`, `Breadcrumbs`, `Avatar` | `ready` |
| **Storefront & Public Shell** | `STOREFRONT-GIFT` | `/shop`, `/gift`, `/product/*` | Public (`customer`, `buyer`, `artisan`, `coordinator`, `admin`) | `GET /api/v1/auth/me`, `GET /api/v1/cart` | `PublicShell`, `SiteHeader`, `CartDrawer`, `LanguageSelector` | `ready` |
| **B2B Studio Shell** | `STOREFRONT-GIFT` | `/b2b/*` | `buyer`, `admin`, `coordinator` | `GET /api/v1/auth/me`, `GET /api/v1/notifications/summary` | `PublicShell`, `B2bHeader`, `QuoteStatusBadge`, `Tabs` | `ready` |
| **Passport Public Shell** | `PASSPORT` | `/passport/$token` | Public | None (public layout) | `PublicShell`, `Wordmark`, `QrCode`, `VerifyBadge` | `ready` |

---

## 2. WORKROOM Interface (Coordinator & Artisan Operations)

| Screen Name (Exact Stitch Name) | Interface | Route | Roles Allowed | Backend Endpoints Needed (openapi.json) | Shared Components Reused | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kalaswar Workroom — Today (Editorial Workspace)** | `WORKROOM` | `/workroom` | `coordinator`, `admin`, `artisan` | `GET /api/v1/dashboard/coordinator`<br>`GET /api/v1/orders`<br>`GET /api/v1/notifications/summary` | `MetricCard`, `OrderQueueTable`, `AlertBanner`, `KwButton`, `Badge` | `ready` |
| **Kalaswar Workroom — Orders** | `WORKROOM` | `/workroom/orders` | `coordinator`, `admin`, `artisan` | `GET /api/v1/orders`<br>`GET /api/v1/assignments` | `DataTable`, `StatusPill`, `FilterTabs`, `SearchInput`, `DateRangePicker` | `ready` |
| **Kalaswar Workroom — Order**<br>*(Variants: milestone timeline, dispatch actions)* | `WORKROOM` | `/workroom/orders/$id` | `coordinator`, `admin`, `artisan` | `GET /api/v1/orders/{order_id}`<br>`PATCH /api/v1/orders/{order_id}/status`<br>`POST /api/v1/assignments`<br>`POST /api/v1/shipments/{shipment_id}/events` | `Timeline`, `ArtisanAssignmentDialog`, `DispatchModal`, `KwCard`, `Badge` | `todo` |
| **Kalaswar Workroom — Products** | `WORKROOM` | `/workroom/products` | `coordinator`, `admin`, `artisan` | `GET /api/v1/products`<br>`POST /api/v1/products` | `ProductGrid`, `CatalogCard`, `CategoryFilter`, `KwButton` | `ready` |
| **Kalaswar Workroom — New Product**<br>*(Merged variant: `Kalaswar Workroom — Review Product`)* | `WORKROOM` | `/workroom/products/new` | `coordinator`, `admin`, `artisan` | `POST /api/v1/products`<br>`POST /api/v1/pricing/fairprice/estimate`<br>`POST /api/v1/whatsapp/draft-listing` | `Form`, `ImageUploadDropzone`, `PricingBreakdownCard`, `ConfirmDialog` | `todo` |
| **Kalaswar Workroom — Custom Requests** | `WORKROOM` | `/workroom/requests` | `coordinator`, `admin` | `GET /api/v1/proposals`<br>`GET /api/v1/makepossible/evaluate` | `RfpTable`, `FeasibilityBadge`, `SearchInput`, `FilterDropdown` | `ready` |
| **Kalaswar Workroom — MakePossible Result** | `WORKROOM` | `/workroom/requests/$id/makepossible` | `coordinator`, `admin` | `POST /api/v1/makepossible/evaluate`<br>`GET /api/v1/inventory/summary` | `ScoreRadarCard`, `MaterialChecklist`, `SkillMatchCard`, `KwButton` | `todo` |
| **Kalaswar Workroom — Proposal** | `WORKROOM` | `/workroom/requests/$id/proposal` | `coordinator`, `admin` | `GET /api/v1/proposals/{proposal_id}`<br>`POST /api/v1/proposals/{proposal_id}/submit` | `ProposalEditor`, `CostPlusTable`, `SampleListCard`, `SubmitModal` | `todo` |
| **Kalaswar Workroom — Inventory** | `WORKROOM` | `/workroom/inventory` | `coordinator`, `admin` | `GET /api/v1/inventory/materials`<br>`GET /api/v1/inventory/summary` | `StockTable`, `RestockAlertBadge`, `AddMaterialDrawer`, `SearchInput` | `todo` |
| **Kalaswar Workroom — Production** | `WORKROOM` | `/workroom/production` | `coordinator`, `admin` | `GET /api/v1/production-events`<br>`POST /api/v1/production-events`<br>`GET /api/v1/assignments` | `KanbanBoard`, `BatchProgressCard`, `LogEventModal`, `DatePicker` | `todo` |
| **Kalaswar Workroom — Quality Check** | `WORKROOM` | `/workroom/quality` | `coordinator`, `admin` | `GET /api/v1/quality-checks`<br>`POST /api/v1/quality-checks` | `QcInspectionGrid`, `DefectFlagSelector`, `PhotoEvidenceUpload`, `Badge` | `todo` |
| **Kalaswar Workroom — Team** | `WORKROOM` | `/workroom/artisans` | `coordinator`, `admin` | `GET /api/v1/assignments`<br>⚠️ *No dedicated `/team` endpoint: queries Supabase `profiles` / `user_roles` direct* | `ArtisanRosterTable`, `GuildBadge`, `PayoutStatusPill`, `AddMemberModal` | `ready` |
| **Kalaswar Workroom — Earnings** | `WORKROOM` | `/workroom/earnings` | `coordinator`, `admin`, `artisan` | `GET /api/v1/payouts`<br>`POST /api/v1/payouts/simulate-dbt` | `LedgerTable`, `DbtTransferCard`, `PassbookSummary`, `SimulateDbtButton` | `todo` |

---

## 3. STOREFRONT & GIFT CONCIERGE Interface (B2C & Bespoke Gifting)

| Screen Name (Exact Stitch Name) | Interface | Route | Roles Allowed | Backend Endpoints Needed (openapi.json) | Shared Components Reused | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kalaswar — Product Discovery (G-02) Sticky Concierge** | `STOREFRONT-GIFT` | `/shop` | Public | `GET /api/v1/products`<br>`POST /api/v1/voice/transcribe`<br>`POST /api/v1/voice/synthesize` | `ProductCatalog`, `StickyConciergeDrawer`, `FilterPills`, `VoiceSearchButton` | `todo` |
| **Kalaswar — Product Details (G-03)** | `STOREFRONT-GIFT` | `/product/$id` | Public | `GET /api/v1/products/{product_id}`<br>`GET /api/v1/craft-stories/{story_id}`<br>`POST /api/v1/cart/items` | `ImageGallery`, `ArtisanStoryCard`, `DppPreviewBadge`, `AddToCartButton` | `todo` |
| **Kalaswar — Custom Request Wizard**<br>*(Merged variants: Step 1, Step 2, Step 3, Leave Dialog)* | `STOREFRONT-GIFT` | `/gift/request` | Public / `customer` | `POST /api/v1/proposals`<br>`POST /api/v1/makepossible/evaluate` | `WizardStepper`, `MaterialSelector`, `DateInput`, `QuantitySlider`, `LeaveConfirmDialog` | `todo` |
| **Kalaswar — Request Summary (G-05)**<br>*(Merged variant: `Request Summary (Submission Error)`)* | `STOREFRONT-GIFT` | `/gift/request/summary` | `customer` | `POST /api/v1/proposals`<br>`POST /api/v1/cart/checkout` | `SummaryReviewCard`, `PriceEstimateRow`, `ErrorAlertBanner`, `SubmitButton` | `todo` |
| **Kalaswar — Submission Confirmation (G-06)**<br>*(Merged variant: `Toast & Guest State`)* | `STOREFRONT-GIFT` | `/gift/request/confirmed` | `customer` | `GET /api/v1/proposals/{proposal_id}` | `SuccessHero`, `TrackRequestCard`, `ShareLinkButton`, `GuestAccountBanner` | `todo` |
| **Kalaswar — Request Tracking (G-07)**<br>*(Merged variants: Proposal Ready, Being Checked, Cannot Be Made)* | `STOREFRONT-GIFT` | `/gift/track/$id` | `customer` | `GET /api/v1/proposals/{proposal_id}`<br>`GET /api/v1/orders/{order_id}` | `TrackingStepper`, `FeasibilityStatusCard`, `ReviseOptionsCard`, `HelpSupport` | `todo` |
| **Kalaswar — Customer Proposal Review (G-08)**<br>*(Merged variants: Accept Dialog, Decline Dialog, Request Changes Side Sheet)* | `STOREFRONT-GIFT` | `/gift/proposals/$id` | `customer` | `GET /api/v1/proposals/{proposal_id}`<br>`POST /api/v1/proposals/{proposal_id}/approve`<br>`POST /api/v1/proposals/{proposal_id}/revise` | `ProposalSheet`, `PriceBreakdown`, `AcceptModal`, `DeclineModal`, `ChangeRequestDrawer` | `todo` |

---

## 4. B2B STUDIO Interface (Enterprise & Bulk Procurement)

| Screen Name (Exact Stitch Name) | Interface | Route | Roles Allowed | Backend Endpoints Needed (openapi.json) | Shared Components Reused | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kalaswar Studio — Buyer Dashboard (B-01)** | `STOREFRONT-GIFT` | `/b2b` | `buyer`, `admin` | `GET /api/v1/orders`<br>`GET /api/v1/proposals`<br>`GET /api/v1/factoring/po` | `B2bMetrics`, `ActiveRfqsTable`, `PoLedgerCard`, `NewRfqCta` | `todo` |
| **Kalaswar Studio — New Bulk Request (B-02)**<br>*(Merged variants: Step 1, Validation & Tight Date, Leave Dialog)* | `STOREFRONT-GIFT` | `/b2b/request` | `buyer`, `admin` | `POST /api/v1/proposals`<br>`POST /api/v1/makepossible/evaluate` | `BulkSpecForm`, `LeadTimeAlert`, `TieredQuantityInput`, `LeaveConfirmDialog` | `todo` |
| **Kalaswar Studio — Design Specifications and References (B-03)**<br>*(Merged variants: Upload & Validation States, Leave Dialog, Submission Error)* | `STOREFRONT-GIFT` | `/b2b/request/specs` | `buyer`, `admin` | `POST /api/v1/proposals`<br>⚠️ *Attachment binary upload uses Supabase Storage `storage.from('briefs')`* | `FileDropzone`, `AssetValidationBadge`, `ReferenceGallery`, `ErrorBanner` | `todo` |
| **Kalaswar Studio — Feasibility Result (B-04)**<br>*(Merged variants: Possible as Requested, Possible with Changes, Can't Be Made, Still Being Checked)* | `STOREFRONT-GIFT` | `/b2b/requests/$id/feasibility` | `buyer`, `admin` | `GET /api/v1/proposals/{proposal_id}`<br>`POST /api/v1/makepossible/evaluate` | `FeasibilityResultHero`, `ImpactScorecard`, `CounterOfferCard`, `ActionButtons` | `todo` |
| **Kalaswar Studio — Proposal Details (B-05)**<br>*(Merged variants: Changed Since V1 & Expiring Soon, Decline Dialog, Request Changes Side Sheet)* | `STOREFRONT-GIFT` | `/b2b/quotes/$id` | `buyer`, `admin` | `GET /api/v1/proposals/{proposal_id}`<br>`POST /api/v1/proposals/{proposal_id}/approve`<br>`POST /api/v1/proposals/{proposal_id}/revise` | `QuoteSummaryCard`, `ExpiryCountdownBadge`, `VersionDiffToggle`, `ActionDrawer` | `todo` |
| **Kalaswar Studio — Proposal Version Comparison (B-06)**<br>*(Merged variants: Changes Only, Adverse Changes & Warnings, Expanded Unchanged & Version Select)* | `STOREFRONT-GIFT` | `/b2b/quotes/$id/compare` | `buyer`, `admin` | `GET /api/v1/proposals/{proposal_id}` | `SideBySideDiffTable`, `CostDeltaBadge`, `LeadTimeDeltaPill`, `VersionDropdown` | `todo` |
| **Kalaswar Studio — Approval Confirmation (B-07)**<br>*(Merged variants: Ready to Confirm, Order Confirmed, Finance Lead Approval, Failed & Validation States)* | `STOREFRONT-GIFT` | `/b2b/quotes/$id/confirm` | `buyer`, `admin`, `financier` | `POST /api/v1/proposals/{proposal_id}/approve`<br>`POST /api/v1/factoring/po`<br>`POST /api/v1/factoring/po/{factoring_id}/tokenize` | `ApprovalStepper`, `EscrowAgreementCard`, `DppReceiptBadge`, `ErrorRetryCard` | `todo` |
| **Kalaswar Studio — Order Tracking (B-08)**<br>*(Merged variants: On Track, Just Confirmed, Delay & Revised Date, Download Updates Side Sheet)* | `STOREFRONT-GIFT` | `/b2b/orders/$id` | `buyer`, `admin` | `GET /api/v1/orders/{order_id}`<br>`GET /api/v1/shipments/{shipment_id}/events` | `TrackingTimeline`, `MilestoneProgress`, `DelayAlertCard`, `DownloadSheetDrawer` | `todo` |

---

## 5. PASSPORT Interface (Blockchain DPP & Craft Provenance)

| Screen Name (Exact Stitch Name) | Interface | Route | Roles Allowed | Backend Endpoints Needed (openapi.json) | Shared Components Reused | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kalaswar Digital Product Passport (DPP)**<br>*(Stitch origin: embedded in G-03, B-07, B-08)* | `PASSPORT` | `/passport/$token` | Public | `GET /api/v1/dpp/public/passports/{token}`<br>`GET /api/v1/dpp/public/passports/{token}/verify` | `ProvenanceCertificate`, `MerkleProofCard`, `ArtisanAudioPlayer`, `FairWageDonut` | `todo` |
