# KALASWAR — Technical Project Brief & Teammate Integration Guide

> **Audience**: Fullstack Lead (Me), Teammate A (WhatsApp Bot Engineer), Teammate B (Blockchain / Web3 Engineer)  
> **Repository Ground Truth**: Based exclusively on validated codebase records, schemas, and endpoints.  
> **Confidentiality**: Environment variable names only; zero raw credentials or secrets committed.

---

## 1. What Kalaswar Is

### The Problem
Over 80% of women artisans in India's 92+ lakh Self-Help Groups (SHGs) under DAY-NRLM face structural barriers:
* **Digital Literacy Gap**: Inability to navigate complex, text-heavy desktop seller portals.
* **Middleman Extraction**: Intermediary traders extract 50%–70% of product retail margins, leaving makers with under ₹1,500/month.
* **Weak Cost Accounting**: Unrecorded labour hours and fluctuating material prices lead to chronic underpricing.
* **Fragmented Operational Records**: Capacity, raw material stock, and order timelines live in memory or paper notebooks.
* **Counterfeit Competition & Opaque Provenance**: Machine-made copies undercut authentic GI crafts without verifiable origin.

### The Solution
Kalaswar is a voice-first livelihood operating system and direct-to-market platform connecting women artisans, SHG coordinators, and buyers:
* Replaces intermediary extraction by routing **up to 68% of retail value** directly to artisan collective bank accounts.
* Converts voice notes and smartphone photos into validated e-commerce listings with transparent **FairPrice** costing.
* Connects buyer requests with verified cluster capacity via the **MakePossible** feasibility engine.
* Establishes cryptographic provenance through **Digital Product Passports (DPP)** batched onto Layer-2 blockchain.

### The 5 Interfaces & Team Ownership
| Interface | Target Audience | Primary Functionality | Owner |
| :--- | :--- | :--- | :--- |
| **1. Web Workroom** | SHG Coordinators, Artisans | Operational ERP: validation queue, assignments, inventory freshness, risk radar, QC dispatch gating, B2B quotes. | **Me** (Lead / Backend, Web, Mobile) |
| **2. Expo Mobile App** | Field Coordinators, CRPs, Artisans | Field intake, offline-first stock counting, on-device pre-dispatch quality assistance. | **Me** (Lead / Backend, Web, Mobile) |
| **3. Gift Concierge & Storefront** | B2C Consumers & B2B Corporate Buyers | Product catalog, Living Craft Stories, guided bespoke intake wizard, 2-sided proposal approval. | **Me** (Lead / Backend, Web, Mobile) |
| **4. WhatsApp Bot** | Grassroots Rural Artisans | Voice-first conversational cataloging, photo intake, Hindi audio prompts, draft approval, payout alerts. | **Teammate A** (WhatsApp / Conversational AI) |
| **5. Public Craft Passport** | Public Shoppers & Customs/Inspectors | Zero-login QR provenance viewer: maker story, coarse GPS, fair wage split, on-chain Merkle proof verification. | **Teammate B** (Blockchain / Web3) |

---

## 2. Architecture

Kalaswar utilizes a modular, decoupled architecture where business validation and access controls are strictly isolated from client presentation and conversational AI layers.

```
                              [ Grassroots Artisans ]         [ Retail & B2B Buyers ]
                                         │                                │
                                  (WhatsApp Voice/Photo)             (HTTPS Web)
                                         ▼                                ▼
┌──────────────────────────────────────────────────┐        ┌──────────────────────────────┐
│       Teammate A: WhatsApp Bot Integration       │        │ React Web (TanStack / Vite)  │
│  Meta Cloud API / Twilio ──> X-Service-Token     │        │ ├─ /workroom (Coordinator)   │
└────────────────────────┬─────────────────────────┘        │ ├─ /shop & /gift (Concierge) │
                         ▼                                  │ └─ /passport (Public DPP)    │
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             Kalaswar FastAPI Backend Core                                │
│  ├─ Auth & RBAC (Supabase JWT / Service Tokens)     ├─ FairPrice Cost-Plus Calculator    │
│  ├─ MakePossible Feasibility Evaluator              ├─ QC Dispatch Gating & Milestones   │
│  ├─ Merkle Batch Aggregator & Proof Engine          ├─ PO Micro-Factoring Escrow         │
└───────┬──────────────────────┬───────────────────────┬────────────────────────────┬──────┘
        │                      │                       │                            │
        ▼                      ▼                       ▼                            ▼
┌───────────────┐     ┌────────────────┐      ┌─────────────────┐       ┌───────────────────────┐
│ Supabase DB   │     │ Cloudinary CDN │      │ AI Adapters     │       │ Teammate B: Chain     │
│ ├─ Postgres15 │     │ ├─ f_auto      │      │ ├─ STT (Sarvam) │       │ ├─ MockChainAdapter   │
│ ├─ RLS Guards │     │ ├─ q_auto      │      │ ├─ AudioConvert │       │ └─ PolygonChainAdapter│
│ └─ Audit Logs │     │ └─ GI Watermark│      │ └─ LLM (Gemini) │       │    (Amoy L2 Registry) │
└───────────────┘     └────────────────┘      └─────────────────┘       └───────────────────────┘
```

* **Data & Auth**: Supabase Postgres 15 with strict Row Level Security (RLS) policies and session-based JWT verification.
* **Backend API**: Python 3.11+ FastAPI service with dependency injection, Pydantic v2 schemas, and audit logging.
* **Frontend Web**: React 18, Vite, TypeScript, TanStack Router, Tailwind CSS, and Radix UI components.
* **Mobile**: Expo / React Native scaffold with auto-generated OpenAPI type bindings (`schema.d.ts`).
* **Media Processing**: Cloudinary signed uploads applying automated background cleaning and dynamic GI badges.
* **AI & Speech**: Provider-abstracted adapters (`backend/app/adapters/`):
  * `stt.py`: `SarvamSTTAdapter` (Indic audio transcriptions), `WhisperSTTAdapter`, `MockSTTAdapter`.
  * `audio.py`: `AudioConverter` (normalizes WhatsApp `ogg`/`opus` to 16kHz mono `wav`).
  * `llm.py`: `GeminiLLMAdapter` and `MockLLMAdapter` for zero-hallucination structured entity extraction.
* **Blockchain Layer**: `backend/app/adapters/chain.py`:
  * `MockChainAdapter`: Local deterministic SHA-256 tree generator and receipt simulator.
  * `PolygonChainAdapter`: Production-ready client targeting Polygon PoS / Amoy testnet.

---

## 3. User Roles and Permissions

Kalaswar defines **exactly four user types** with isolated workspaces, row-level security policies, and server-validated signup flows. **There is NO admin role** — platform infrastructure and database governance are managed at the DevOps level; nobody can self-register or elevate to an administrative role in the application.

| Role | Target Persona | Key Capabilities & Authorization Boundaries |
| :--- | :--- | :--- |
| `coordinator` | SHG Cluster Coordinator / SRLM Leader | Registers and manages SHG collective; approves/rejects artisan join requests; reviews listing validation queue (`pending_validation` $\to$ `published`); assigns production tasks; manages raw material inventory; gates dispatch behind QC; issues B2B custom proposals and quotes. |
| `artisan` | Rural Craftsperson / Weaver | Onboards via phone number and joins an SHG; creates product drafts via photo and voice descriptions; approves AI-drafted craft stories; updates order production progress; inspects earnings and DBT payout ledger. |
| `customer` | Individual Retail Customer | Browses published craft catalog with search and filters; views verified craft stories and digital passports; adds items to cart; completes checkout via Razorpay; tracks order journey events; uses Gift Concierge with MakePossible feasibility checks. |
| `buyer` | Corporate B2B Wholesale Buyer | Registers with company name and GSTIN; submits custom corporate gifting briefs; reviews multi-versioned proposals and quotes; approves pre-production samples; confirms bulk wholesale purchase orders. |

---

## 4. Features per Interface

| Interface | Feature Description | Codebase Status | Notes |
| :--- | :--- | :--- | :--- |
| **Web Workroom** | Daily editorial workspace & coordinator metrics | `built` | `/workroom` with alert banners and active queues |
| **Web Workroom** | Product validation queue (approve/reject with reason) | `built` | Strict coordinator gate before publication |
| **Web Workroom** | Skills-aware artisan assignment suggestions | `built` | Suggests artisans based on matched craft techniques |
| **Web Workroom** | FairPrice cost-sheet builder & QR generator | `built` | Calculates materials, labour, overhead, margin |
| **Web Workroom** | Raw material inventory & freshness monitoring | `built` | Alerts coordinators on stale pricing / stock inputs |
| **Web Workroom** | Production Risk Radar | `built` | Explainable risk flags based on deadlines vs capacity |
| **Web Workroom** | Quality check logging & dispatch gating | `built` | Enforces passing QC before courier shipment dispatch |
| **Web Workroom** | Proposal revision inbox & version history | `built` | Same-version two-sided customer/coordinator signoff |
| **Web Workroom** | B2B coordinator section (quotes & sample reviews) | `built` | Sample state machine & PO micro-factoring view |
| **Web Workroom** | Admin RBAC management, audit log, demo switch | `built` | Full system audit trail and toggleable demo states |
| **Storefront & Gift**| Catalog discovery with filters & pagination | `built` | Scoped to published products only |
| **Storefront & Gift**| Product Detail with Living Craft Story | `built` | Maker story, audio narration, verification badges |
| **Storefront & Gift**| Cart, checkout, and simulated payment | `simulated` | Clearly labelled `"Simulated Payment (Demo Mode)"` |
| **Storefront & Gift**| Order tracking from recorded events | `built` | Displays immutable production and shipment events |
| **Storefront & Gift**| Gift Concierge guided intake wizard | `built` | Extracts occasion, craft, quantity, date, budget |
| **Storefront & Gift**| MakePossible customer feasibility review | `built` | Feasible / Uncertain / Infeasible with evidence |
| **Storefront & Gift**| "For Business" B2B RFQ brief submission | `built` | Multi-tiered bulk ordering and sample requests |
| **Expo Mobile App** | Mobile architecture & typed client bindings | `partial` | `mobile/src/api/schema.d.ts` exists; screens `todo` |
| **Expo Mobile App** | Village-level offline inventory intake | `todo` | Unverified in current code (scaffold only) |
| **Expo Mobile App** | On-Device Edge CV Quality Control (YOLOv8) | `todo` | Phase 2 future vision; unverified |
| **WhatsApp Bot** | Photo ingestion & Cloudinary upload pipeline | `built` | `POST /internal/whatsapp/media` with GI watermark |
| **WhatsApp Bot** | Indic voice transcription & entity extraction | `built` | `POST /internal/whatsapp/voice` with honesty rules |
| **WhatsApp Bot** | Interactive button approval & validation gate | `built` | `POST /internal/whatsapp/approve` |
| **WhatsApp Bot** | WAMID deduplication & session state tracking | `built` | Idempotent session recovery across reconnections |
| **WhatsApp Bot** | External Meta Cloud API webhook runner | `todo` | Teammate A deliverable (wired via service token) |
| **Craft Passport** | Zero-login public passport viewer (`/passport/:token`)| `built` | Maker story, wage split, coarse GPS region |
| **Craft Passport** | Cryptographic Merkle inclusion proof card | `built` | Displays leaf hash, Merkle root, copyable buttons |
| **Craft Passport** | Layer-2 transaction verification adapter | `simulated` | `MockChainAdapter` active; Polygon Amoy contract `partial` |

---

## 5. Web Routes & Mobile Screens

### Web Routes Table
| Route | Role Access | Purpose | Screen Status |
| :--- | :--- | :--- | :--- |
| `/` | Public | Brand landing page (**VISUAL FREEZE — DO NOT MODIFY**) | `built` (frozen) |
| `/auth` | Public | Authentication & role-based sign-in (**VISUAL FREEZE**) | `built` (frozen) |
| `/shop` | Public | B2C product discovery catalog, search, and category filters | `built` |
| `/product/:id` | Public | Product detail page with Living Craft Story and QR code | `built` |
| `/gift` | Public / Customer | Gift Concierge guided custom intake & MakePossible review | `built` |
| `/orders` | Customer / Buyer | Customer personal order history | `built` |
| `/orders/:id` | Customer / Buyer | Order progress tracking driven by recorded milestones | `built` |
| `/passport/:token` | Public | Public Digital Product Passport with Merkle verification | `built` |
| `/b2b` | Buyer / Admin | Corporate buyer portal: active RFQs, quotes, PO tracking | `built` |
| `/b2b/request` | Buyer / Admin | Enterprise bulk RFP intake form with lead-time calculator | `built` |
| `/b2b/quotes/:id` | Buyer / Admin | Detailed quotation review, version comparison, sample CTA | `built` |
| `/b2b/orders/:id` | Buyer / Admin | B2B Purchase Order fulfillment & milestone timeline | `built` |
| `/workroom` | Coordinator / Admin / Artisan | Coordinator operational dashboard & alert banners | `built` |
| `/workroom/orders` | Coordinator / Admin / Artisan | Production orders queue and filterable data table | `built` |
| `/workroom/orders/:id` | Coordinator / Admin / Artisan | Order details, skills-aware assignments, dispatch actions | `built` |
| `/workroom/products` | Coordinator / Admin / Artisan | Product catalog and coordinator listing validation queue | `built` |
| `/workroom/products/new` | Coordinator / Admin / Artisan | Manual product listing creation with FairPrice cost sheet | `built` |
| `/workroom/inventory` | Coordinator / Admin | Raw materials stock ledger with price freshness flags | `built` |
| `/workroom/requests` | Coordinator / Admin | Custom customer requests inbox & feasibility scoring | `built` |
| `/workroom/requests/:id/makepossible` | Coordinator / Admin | MakePossible radar breakdown, resource & skill gaps | `built` |
| `/workroom/requests/:id/proposal` | Coordinator / Admin | Versioned proposal editor, cost-plus build-up, submission | `built` |
| `/workroom/artisans` | Coordinator / Admin | Cluster artisan roster, skills matrix, guild memberships | `built` |
| `/workroom/b2b` | Coordinator / Admin | Coordinator B2B quotes manager, sample reviews, PO factoring | `built` |
| `/workroom/admin` | Admin | User roles assignment, action audit logs, demo toggle | `built` |
| `/dev/whatsapp` | Developer / Public | Browser simulation of WhatsApp voice/photo listing bot | `built` |

### Mobile Screens Table
> *Note: Screen implementations below are verified as pending (`todo` / `unverified` in code) based on `mobile/README.md`.*

| Screen Name | Target Role | Planned Purpose | Implementation Status |
| :--- | :--- | :--- | :--- |
| `Artisan Home / Task Feed` | Artisan | Voice-guided task cards, deadlines, and milestone updates | `todo` (unverified in code) |
| `Cluster Coordinator Dashboard` | Coordinator / CRP | Field artisan allocation and village intake tracking | `todo` (unverified in code) |
| `Offline Material Inventory` | Coordinator / CRP | Localized raw material stock counting with cloud sync | `todo` (unverified in code) |
| `Edge AI Quality Inspection` | Coordinator / CRP | On-device camera CV scan for weave and dimension grading | `todo` (unverified / Phase 2) |

---

## 6. API Reference (FastAPI Backend)

All endpoints below are verified against `backend/openapi.json`. Endpoints supporting the WhatsApp bot and public passports are specifically highlighted.

| Area / Tag | Method | Path | Auth / Role Guard | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | `GET` | `/health` / `/api/v1/health` | Public | Service health & liveness check |
| **Auth & RBAC** | `GET` | `/api/v1/auth/me` | Authenticated | Fetch active profile and assigned roles |
| **Auth & RBAC** | `GET` | `/api/v1/auth/coordinator-only` | `coordinator`, `admin` | Guarded coordinator route check |
| **Auth & RBAC** | `GET` | `/api/v1/auth/artisan-only` | `artisan`, `admin` | Guarded artisan space route check |
| **Auth & RBAC** | `GET` | `/api/v1/auth/financier-only` | `financier`, `admin` | Guarded financier console check |
| **Products** | `GET` | `/api/v1/products` | Public | List products (filterable by status/category) |
| **Products** | `POST` | `/api/v1/products` | `coordinator`, `admin` | Create new product listing draft |
| **Products** | `GET` | `/api/v1/products/{product_id}` | Public | Retrieve product details by ID |
| **Products** | `PATCH` | `/api/v1/products/{product_id}` | `coordinator`, `admin` | Update product attributes or approve status |
| **Products** | `DELETE`| `/api/v1/products/{product_id}` | `coordinator`, `admin` | Soft-delete product listing |
| **DPP (Highlighted)** | `POST`| `/api/v1/dpp/issue` | `coordinator`, `admin` | Issue new Digital Product Passport |
| **DPP (Highlighted)** | `POST`| `/api/v1/dpp/batch-commit` | Teammate / Internal | Batch-commit Merkle roots to blockchain |
| **DPP (Highlighted)** | `GET` | **`/public/passports/{token}`** | **Public (Zero-Login)**| **Fetch public passport, story, and wage split** |
| **DPP (Highlighted)** | `GET` | **`/public/passports/{token}/verify`**| **Public (Zero-Login)**| **Verify leaf inclusion in Merkle root & L2 tx** |
| **WhatsApp (Highlighted)**| `POST`| **`/api/v1/internal/whatsapp/media`** | **`X-Service-Token`** | **Step 1: Ingest artisan photo to Cloudinary** |
| **WhatsApp (Highlighted)**| `POST`| **`/api/v1/internal/whatsapp/voice`** | **`X-Service-Token`** | **Step 2: Transcribe audio & extract craft draft** |
| **WhatsApp (Highlighted)**| `POST`| **`/api/v1/internal/whatsapp/approve`**| **`X-Service-Token`** | **Step 3: Handle artisan button action (btn_approve)**|
| **WhatsApp (Highlighted)**| `GET` | **`/api/v1/internal/whatsapp/session/{phone}`**| **`X-Service-Token`**| **Retrieve artisan conversation state machine** |
| **WhatsApp Bot** | `POST` | `/api/v1/whatsapp/webhook` | Meta Webhook Secret | Standard WhatsApp Cloud API webhook receiver |
| **Speech / Voice** | `POST` | `/api/v1/voice/transcribe` | Authenticated | Transcribe multipart Indic speech recording |
| **Pricing Engine** | `POST` | `/api/v1/pricing/calculate` | Public / Authenticated | Calculate transparent FairPrice cost build-up |
| **MakePossible** | `POST` | `/api/v1/makepossible/evaluate` | Public / Authenticated | Evaluate custom request feasibility & gaps |
| **Proposals** | `POST` | `/api/v1/proposals` | `coordinator`, `admin` | Create draft proposal (Version 1) |
| **Proposals** | `GET` | `/api/v1/proposals/{proposal_id}`| Authenticated | Get proposal with version history & samples |
| **Proposals** | `POST` | `/api/v1/proposals/{proposal_id}/revise`| `coordinator`, `admin`| Increment version on material scope change |
| **Proposals** | `POST` | `/api/v1/proposals/{proposal_id}/approve`| Authenticated | Record two-sided approval of the same version |
| **Cart & Checkout**| `GET` | `/api/v1/cart` | Authenticated | Retrieve user shopping cart items |
| **Cart & Checkout**| `POST` | `/api/v1/cart/items` | Authenticated | Add product item to cart |
| **Cart & Checkout**| `POST` | `/api/v1/cart/checkout` | Authenticated | Execute checkout (simulated payment) |
| **Orders** | `GET` | `/api/v1/orders` | Authenticated | List orders (scoped by RLS role) |
| **Orders** | `GET` | `/api/v1/orders/{order_id}` | Authenticated | Retrieve order details and milestone events |
| **Orders** | `PATCH` | `/api/v1/orders/{order_id}/status`| `coordinator`, `admin` | Transition order status |
| **Assignments** | `GET` | `/api/v1/assignments` | Authenticated | List artisan task assignments |
| **Assignments** | `POST` | `/api/v1/assignments` | `coordinator`, `admin` | Assign artisan to order with skills matching |
| **Inventory** | `GET` | `/api/v1/inventory/materials` | `coordinator`, `admin` | List materials with freshness timestamps |
| **Inventory** | `POST` | `/api/v1/inventory/materials` | `coordinator`, `admin` | Register raw material stock item |
| **Production** | `GET` | `/api/v1/production-events` | Authenticated | List progress events |
| **Production** | `POST` | `/api/v1/production-events` | Authenticated | Log physical craft milestone event |
| **Quality Checks**| `GET` | `/api/v1/quality-checks` | `coordinator`, `admin` | List pre-dispatch quality inspections |
| **Quality Checks**| `POST` | `/api/v1/quality-checks` | `coordinator`, `admin` | Record QC pass/fail inspection |
| **Shipments** | `POST` | `/api/v1/shipments` | `coordinator`, `admin` | Create courier shipment (**Gated: requires passing QC**)|
| **Shipments** | `POST` | `/api/v1/shipments/{id}/events` | `coordinator`, `admin` | Append real transit milestone |
| **Payouts & DBT** | `GET` | `/api/v1/payouts` | Authenticated | List artisan earnings and wage ledger |
| **Payouts & DBT** | `POST` | `/api/v1/payouts/simulate-dbt` | `coordinator`, `admin` | Simulate direct benefit transfer bank payout |
| **Factoring** | `POST` | `/api/v1/factoring/po` | `buyer`, `financier` | Register corporate PO for micro-factoring |
| **Factoring** | `POST` | `/api/v1/factoring/po/{id}/tokenize`| `financier`, `admin` | Tokenize PO into Layer-2 escrow |
| **Factoring** | `POST` | `/api/v1/factoring/po/{id}/disburse-advance`| `financier`, `admin`| Disburse 70% raw material advance |
| **Audit Logs** | `GET` | `/api/v1/audit/logs` | `admin` only | Query immutable platform compliance logs |
| **Notifications** | `GET` | `/api/v1/notifications/summary`| Authenticated | Get unread alerts and system notifications |

---

## 7. Data Model & Key RLS Rules

### Core Entities & Relationships
* `shg_clusters` $\xrightarrow{1:N}$ `artisans` $\xrightarrow{1:N}$ `products` $\xrightarrow{1:1}$ `dpp_passports`
* `custom_requests` $\xrightarrow{1:N}$ `proposals` $\xrightarrow{1:N}$ `quotation_versions` $\xrightarrow{1:N}$ `proposal_approvals`
* `orders` $\xrightarrow{1:N}$ `order_assignments` $\xrightarrow{N:1}$ `artisans`
* `orders` $\xrightarrow{1:N}$ `production_events`, `quality_checks`, `shipments` $\xrightarrow{1:N}$ `shipment_events`
* `orders` $\xrightarrow{1:1}$ `po_factoring` (Corporate B2B orders)
* `voice_sessions` $\xrightarrow{1:N}$ `whatsapp_incoming_messages` (Idempotency ledger)

### Key Database RLS Rules (`supabase/migrations/0010_production_auth_rbac.sql`)
1. **Public Catalog & Passports**: Unauthenticated visitors have `SELECT` access exclusively on `products` where `status = 'published'` and on `dpp_passports` via public tokens.
2. **Artisan Boundary**: Artisans can only read their own assigned tasks (`order_assignments.artisan_id = auth.uid()`), personal wage records (`payout_ledger`), and own voice drafts.
3. **Coordinator Boundary**: Coordinators can only manage records within their registered SHG collective via helper `public.is_shg_coordinator(auth.uid(), shg_id)` across inventory, orders, assignments, and validation queues.
4. **Corporate Buyer Boundary**: Corporate buyers manage only their own organisation records (`buyers.user_id = auth.uid()`) and associated quotes/orders.
5. **Quality Gating**: Shipment rows cannot be dispatched unless linked order possesses a verified passing record (`result = 'pass'`) in `quality_checks`.

---

## 8. Integration Contract: WhatsApp Bot (Teammate A)

> **Detailed Spec File**: [`docs/integration/whatsapp.md`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/docs/integration/whatsapp.md)

### The 3-Step Conversational Pipeline
```
[Artisan Sends Photo] ──> Step 1: POST /internal/whatsapp/media
                              │ Returns: session_id, clean image_url, audio prompt script
                              ▼
[Artisan Sends Voice] ──> Step 2: POST /internal/whatsapp/voice
                              │ Returns: extracted craft title, materials, FairPrice breakdown
                              ▼
[Artisan Clicks Btn]  ──> Step 3: POST /internal/whatsapp/approve
                              │ Action: 'btn_approve' -> status becomes 'pending_validation'
                              ▼
                        [Coordinator Reviews in /workroom/products Queue]
```

### Protocol & Security Headers
* **Base URL**: `http://localhost:8000/api/v1` (or local port)
* **Auth Header**: Include on every request:
  `X-Service-Token: <INTERNAL_SERVICE_TOKEN>`
  *(or `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`)*

### Idempotency & Message Deduplication
WhatsApp network retries can duplicate events. Teammate A **must** supply `whatsapp_message_id` (WAMID) in every request body:
```json
{
  "phone": "+919876543210",
  "whatsapp_message_id": "wamid.HBgLMzkxOTg3NjU0MzIxMBUCABIYFDNBOUQ5Q0ExOEU5Q0ExOEU5Q0ExAA==",
  "media_url": "https://example.com/craft.jpg"
}
```
If a duplicate WAMID is detected, the backend returns HTTP 200 with `"is_duplicate": true` and the cached state, preventing duplicate database writes.

### Supported Audio Formats
WhatsApp voice notes in `audio/ogg`, `audio/opus`, `audio/wav`, or `audio/mp4` are accepted (base64 or remote URL). The backend `AudioConverter` normalizes them for transcription.

### Mandatory Business Guards
1. **AI Honesty Rule**: If an artisan's audio omits craft category or material, the API transitions to `needs_clarification` and returns a polite Hindi follow-up question. The backend never invents missing craft data.
2. **Coordinator Validation Rule**: When the artisan clicks **Approve**, the draft transitions to **`pending_validation`** (never directly to published). The cluster coordinator must perform final validation in the Workroom before public listing.

---

## 9. Integration Contract: Blockchain & Web3 (Teammate B)

> **Detailed Spec File**: [`docs/integration/blockchain.md`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/docs/integration/blockchain.md)

### Hybrid Web2/Web3 Merkle Architecture
To keep on-chain costs under $0.0001 per unit, Kalaswar does not mint individual NFTs per craft item. Instead:
1. Up to **500 production passports** are aggregated into an off-chain binary Merkle tree.
2. A single 32-byte Merkle root (`0x...`) is anchored onto Polygon Layer-2 (Amoy testnet).
3. The public passport page (`/passport/:token`) uses an individual 9-hash sibling proof to verify inclusion against the anchored root.

### Canonical Leaf Hashing Specification
To guarantee reproducible cryptographic hashing across Python, Solidity, and TypeScript:
```json
{
  "gps_region": "Bolpur, Birbhum, West Bengal",
  "maker_id": "cccccccc-0001-0000-0000-000000000001",
  "product_id": "11111111-0001-0000-0000-000000000001",
  "timestamps": "2026-10-25T10:00:00Z",
  "wage_split_pct": 68.0
}
```
* Keys sorted alphabetically: `gps_region`, `maker_id`, `product_id`, `timestamps`, `wage_split_pct`.
* Compact JSON (no indentation, `','` and `':'` separators).
* Leaf calculation: $\text{Leaf} = \text{0x} + \text{SHA256}(\text{Canonical JSON bytes})$.
* Node combination: $\text{Parent} = \text{0x} + \text{SHA256}(\text{Left bytes} + \text{Right bytes})$.

### ChainAdapter Interface (`backend/app/adapters/chain.py`)
Teammate B must implement the abstract methods:
```python
class ChainAdapter(ABC):
    @abstractmethod
    async def commit_root(self, root: str) -> str:
        """Commits 32-byte Merkle root to Polygon Amoy. Returns transaction hash."""
        pass

    @abstractmethod
    async def verify(self, root: str, tx_hash: str) -> bool:
        """Verifies root inclusion from on-chain transaction receipt."""
        pass
```

### What Teammate B Must Deliver
1. **Solidity Contract**: Deploy minimal registry contract (`KalaswarDPPRegistry.sol` in `docs/integration/blockchain.md`) to Polygon Amoy testnet.
2. **Environment Variables**: Provide `CHAIN_ADAPTER_TYPE=polygon`, `RPC_URL`, `DPP_CONTRACT_ADDRESS`, and relayer `DPP_PRIVATE_KEY`.
3. **Web3 Client Hook**: Complete `PolygonChainAdapter.commit_root` using `web3.py` to sign and broadcast the root anchoring transaction.

---

## 10. Real vs. Simulated Systems

In accordance with product principles, simulated modules are clearly badged in the UI and never masquerade as live production services.

| Subsystem | Real Implementation | Simulated Implementation | UI Label Used |
| :--- | :--- | :--- | :--- |
| **Catalog & Products** | Real Postgres storage, Cloudinary images, validation queue | None | *None (Live)* |
| **Workroom Operations**| Real assignments, inventory freshness, risk radar, QC gating | None | *None (Live)* |
| **Payment Gateway** | Real Razorpay Checkout (Test Mode & Webhook) | Production settlement with live banking keys | `"Test Payment / Razorpay Testnet"` |
| **Artisan Payouts** | Real wage calculation, ledger records & DBT approval flow | National Automated Clearing House (NACH) / DBT API | `"Simulated DBT Bank Transfer"` |
| **ONDC Integration** | Real Beckn / ONDC product and order schemas | External live ONDC staging network gateway broadcast | `"ONDC Mock Connector"` |
| **Blockchain L2** | Real Merkle tree generation, leaf hashing and inclusion proofs | Public Polygon mainnet contract execution (live when RPC & key supplied) | `"Demo Chain"` (badge on Passport) |
| **PO Factoring Escrow**| Real state machine transitions and audit records | Smart contract escrow vault lock/release | `"Demo Escrow"` / `"PO Factoring (Simulated)"` |

---

## 11. Run Locally

### Prerequisites
* Node.js v20+ & npm
* Python 3.11+
* Supabase project or local Supabase instance
* Cloudinary credentials
* Sarvam AI / OpenAI credentials (for Indic voice & LLM extraction)

### Exact Execution Commands
```bash
# 1. Backend (FastAPI)
cd backend
python -m venv .venv
# Windows: .venv\Scripts\Activate.ps1 | Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Database Bootstrap (Reference Data Only)
# Populates authentic craft taxonomies, categories, Indian states, and languages.
# Creates ZERO fake people, fake products, or mock orders.
make bootstrap
# (Alternative: python backend/scripts/bootstrap_reference_data.py)

# 3. Web Application (TanStack Start / Vite)
cd web
npm install --legacy-peer-deps
npm run dev
# Web runs at http://localhost:8082

# 4. Mobile Application (Expo Scaffold)
cd mobile
npm install
npx expo start
```

### Environment Variable Names (Never Commit Values)
* **Backend (`backend/.env`)**:
  * `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
  * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  * `SARVAM_API_KEY` (Primary Indic Speech-to-Text)
  * `OPENAI_API_KEY` (Whisper STT fallback & GPT-4o-mini LLM extraction)
  * `INTERNAL_SERVICE_TOKEN`, `WHATSAPP_SHARED_SERVICE_TOKEN`
  * `CHAIN_ADAPTER_TYPE` (`mock` or `polygon`), `RPC_URL`, `DPP_CONTRACT_ADDRESS`, `DPP_PRIVATE_KEY`, `MERKLE_BATCH_SIZE`
  * `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
* **Web (`web/.env`)**:
  * `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`
* **Mobile (`mobile/.env`)**:
  * `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 12. Open Issues and Next Steps

1. **Polygon Amoy Live Anchoring (Teammate B)**: Deploy the Solidity DPP anchor contract to Amoy testnet and switch `CHAIN_ADAPTER_TYPE=polygon`.
2. **Meta WhatsApp Cloud Webhook (Teammate A)**: Wire external webhook ingestion to `/api/v1/whatsapp/webhook` and verify bi-directional audio delivery.
3. **Mobile Screen Implementation (Me)**: Complete the React Native / Expo UI views in `mobile/src/` to bind with the existing generated API types (`schema.d.ts`).
4. **Visual Freeze Protocol**: Keep Landing (`/`) and Auth (`/auth`) routes untouched to ensure presentation stability.
5. **Phase 2 Vision (Future)**: On-device Edge AI Quality Control (YOLOv8/TFLite) for automated pre-dispatch weave inspection.

