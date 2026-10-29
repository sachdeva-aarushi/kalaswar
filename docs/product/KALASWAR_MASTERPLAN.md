# KALASWAR (कला स्वर)
## Complete Product Architecture, Technical Design & Impact Masterplan
**Platform:** Enterprise OS & Direct-to-Market Ecosystem  
**Primary Interface:** WhatsApp Automation Bot  
**Version:** 3.0 (October 2026)

---

### 1. Executive Summary & Core Strategic Vision
Kalaswar is a direct-to-market enterprise operating system designed to bridge the structural gap between rural women-led Self-Help Groups (SHGs) and high-value B2B/B2C markets. Operating under India's National Rural Livelihoods Mission (DAY-NRLM) ecosystem of 92+ lakh SHGs, Kalaswar replaces fragmented middleman chains with a unified digital infrastructure. By prioritizing a WhatsApp Automation Bot as the primary artisan interface, integrating Layer-2 Blockchain Provenance, automating multi-channel e-commerce publishing, and provisioning for future Edge AI Quality Control, Kalaswar transforms artisan collectives into standardized, high-yield manufacturing networks.

---

### 2. Strategic Problem vs. Kalaswar Solution Matrix

| Market Bottleneck | Traditional Middleman Impact | Kalaswar Engine Solution |
| :--- | :--- | :--- |
| **Middleman Margin Extraction** | Traders take 50%–70% margins, leaving artisans with < ₹1,500/month. | **Direct Market Listing:** Auto-publishes to e-commerce; routes 70% retail share directly to SHG bank accounts. |
| **Digital Literacy Barrier** | 80%+ rural women cannot navigate complex desktop seller central tools. | **WhatsApp Voice Bot:** Zero-learning-curve listing via voice notes and photos in local dialects. |
| **Counterfeit Competition** | Machine-made knockoffs undercut authentic GI-tagged handicrafts. | **Blockchain Passport (DPP):** Cryptographic QR codes verifying maker identity, location, and fair wages. |
| **Quality Inconsistency** | Central warehouse rejections (15%–25%) force SHGs to absorb return shipping. | **[Future Vision] Edge CV AI:** Camera inspection flags defects at the village level prior to dispatch. |

---

### 3. The Three Core Pillars + Future Vision Framework

- **Pillar 1: Middleman Elimination Engine (CORE)**  
  Bypasses traders through direct multi-channel e-commerce auto-publishing (ONDC, Kalaswar Storefront), dynamic cost-plus fair pricing calculators, and automated Direct Benefit Transfer (DBT) escrow payouts.
- **Pillar 2: WhatsApp Automation Bot (PRIMARY UI)**  
  Voice-first conversational assistant replacing desktop portals. Artisans send voice notes and product photos to draft listings, check pending payouts, and receive task assignments in regional dialects.
- **Pillar 3: Blockchain Traceability (DPP) (CORE)**  
  Traceability-as-a-Service (TaaS) issuing unalterable Digital Product Passports via Layer-2 Merkle batching. Public QR tags reveal artisan story, craft origin, GPS location, and wage distribution.
- **Future Vision: On-Device Edge AI QC (PHASE 2)**  
  Post-launch mobile computer vision inspection module (YOLOv8/TFLite). Scans fabric weaves, stitching, and dimensions at the village cluster level to grade items (A/B/C) before dispatch.

---

### 4. WhatsApp Automation Bot: Primary Artisan Interface

**Conversational Architecture: Conversational E-Commerce Listing Flow**  
Instead of forcing semi-literate rural artisans to navigate text-heavy dashboards, the WhatsApp Bot acts as an autonomous digital assistant. The end-to-end listing interaction follows a strict 3-step voice workflow:
1. **Step 1 (Media Capture):** Artisan sends product photo via WhatsApp.
2. **Step 2 (Voice Prompt):** Bot replies in audio: *"इस सामान का नाम और इस्तेमाल किया गया धागा बताएं।"* Artisan speaks: *"हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा।"*
3. **Step 3 (Auto-Draft & Publish):** FastAPI backend parses audio via Whisper, enhances image on Cloudinary, calculates fair retail price, and returns a single-click interactive button: `[मंजूर करें / Approve & Publish]`.

---

### 5. Ecosystem User Roles & Interfaces

1. **Rural Women Artisans**  
   - *Interface:* WhatsApp Business Bot (Voice/Audio Notes).  
   - *Capabilities:* Instant product listing drafting, voice-based task guidance, production assistance Q&A, and real-time DBT payout alerts.
2. **SHG Coordinators & CRPs**  
   - *Interface:* Kalaswar Workroom (Web/Android Dashboard).  
   - *Capabilities:* Multi-SHG workload allocation, raw material inventory tracking, listing validation, and first-mile shipment dispatch gating.
3. **Enterprise B2B Buyers & CSR Leads**  
   - *Interface:* Enterprise B2B & ESG Sourcing Portal.  
   - *Capabilities:* Custom RFP bulk orders, AI co-design stencil submission, and automated audit-ready ESG impact metric reporting.
4. **B2C Retail Shoppers**  
   - *Interface:* Web Storefront & Interactive QR Passport.  
   - *Capabilities:* Direct-from-artisan catalog browsing, instant checkout, and scanning product QR tags to view immutable L2 provenance stories.

---

### 6. End-to-End Operational Workflows

#### A. B2B Custom Co-Design & MakePossible Feasibility Engine
When a corporate buyer submits a custom request (e.g., 500 pastel laptop sleeves for an event), Kalaswar's MakePossible Engine evaluates recorded SHG skill sets, raw material stock, current cluster workload, and lead times. The fine-tuned GenAI engine synthesizes traditional craft motifs (e.g., Kantha/Warli) into modern dimensions, generating printable loom graphs and stencils for artisans while outputting a binding feasibility proposal for the buyer.

#### B. Purchase Order Tokenization & Micro-Factoring Workflow
To eliminate working capital deficits, approved corporate Purchase Orders (POs) are tokenized into digital invoice assets. Partner financial institutions disburse a 70% raw material advance directly to the SHG bank account upon first-mile raw material verification. Upon final customer delivery confirmation, an automated escrow contract repays the lender and releases the remaining 30% margin directly to the artisan collective.

---

### 7. System Architecture & Technology Stack

```
+-----------------------------------------------------------------------------------+
| ARTISAN INTERFACE: WHATSAPP BOT                                                   |
| Meta WhatsApp Business API / BSP (Twilio / Gupshup Engine)                       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| KALASWAR FASTAPI CORE SERVICES                                                    |
| +-----------------------+ +------------------------+ +----------------------+     |
| | Whisper / Sarvam AI   | | Cloudinary API Engine  | | Listing Auto-Engine  |     |
| | Voice Speech-to-Text  | | Dynamic Asset Pipeline | | ONDC / Web Publishing|     |
| +-----------------------+ +------------------------+ +----------------------+     |
+-----------------------------------------+-----------------------------------------+
                                          |
           +------------------------------+-------------------------------+
           v                              v                               v
+------------------+             +------------------+            +------------------+
| Supabase DB      |             | Cloudinary CDN   |            | Polygon L2 Chain |
| Postgres / RLS   |             | GI Watermarked   |            | Merkle Passports |
+------------------+             +------------------+            +------------------+
```

---

### 8. Cloudinary Media Pipeline
Cloudinary serves as Kalaswar's asset optimization engine via FastAPI signed upload presets:
- **Auto-Format & Quality:** Converts raw camera uploads to `f_auto,q_auto` WebP/AVIF for low-bandwidth rural networks.
- **GI Watermark Overlays:** Dynamically overlays Geographical Indication (GI) verification badges onto approved product photos.
- **Automated Background Clean:** Removes cluttered village backgrounds, standardizing catalog cards for B2B/B2C buyers.

---

### 9. Layer-2 Blockchain Provenance
To keep transaction costs under $0.001 per product unit:
- **Merkle Tree State Batching:** Off-chain engine aggregates 500 artisan production logs into a single cryptographic Merkle root.
- **Polygon/Solana Commit:** Only the Merkle root is committed on-chain daily via lightweight smart contracts.
- **Public QR Passport:** Consumers scan the physical tag to verify root inclusion, viewing maker face, GPS origin, and wage distribution.

---

### 10. Relational Database Schema (Supabase Postgres)

| Table Name | Key Columns & Data Types | Foreign Keys & Security (RLS) |
| :--- | :--- | :--- |
| `shg_clusters` | `id` (UUID), `cluster_name` (Text), `state_srlm_id` (Text), `bank_dbt_account` (Text) | Primary Key. RLS: Admin & Cluster Manager read/write. |
| `artisans` | `id` (UUID), `shg_id` (FK), `phone_number` (Text), `voice_lang_pref` (Text) | FK -> `shg_clusters.id`. RLS: Artisan self-access via WhatsApp OTP. |
| `products` | `id` (UUID), `artisan_id` (FK), `title` (Text), `cloudinary_public_id` (Text), `price` (Numeric) | FK -> `artisans.id`. RLS: Public read (if published); Artisan write. |
| `dpp_passports` | `id` (UUID), `product_id` (FK), `merkle_root` (Text), `polygon_tx_hash` (Text), `qr_code_url` (Text) | FK -> `products.id`. Immutable public read access via QR token. |
| `po_factoring` | `id` (UUID), `buyer_id` (Text), `po_amount` (Numeric), `advance_disbursed` (Boolean) | RLS: Restricted to Financial Institution & Coordinator role. |

---

### 11. Market Opportunity & TAM / SAM / SOM

- **$750+ Billion:** Global Handicrafts TAM (8.8% CAGR driven by conscious consumer demand).
- **$29.3 Billion:** Indian Craft Sector SAM (64.66+ lakh registered craftspeople, 60%+ women).
- **$1.2 Billion:** DAY-NRLM SHG SOM (Targeting 500,000 active artisans in 36 months).

---

### 12. Unit Economics & Middleman Margin Transformation
Comparison of value distribution on a ₹2,000 Handloom Silk Scarf:

| Cost Component | Traditional Middleman Channel | Kalaswar Integrated Platform | Impact & Wage Shift |
| :--- | :--- | :--- | :--- |
| **Artisan Earnings** | ₹300 (15%) | ₹1,360 (68%) | 4.5x Direct Income Increase |
| **Middleman / Trader Margin**| ₹1,100 (55%) | ₹0 (0%) | Exploitative margin entirely eliminated |
| **First-Mile Logistics** | ₹300 (15%) | ₹300 (15%) | Paid directly to postal/courier partners |
| **Platform & Tech Fee** | ₹0 (0%) | ₹140 (7%) | Sustains cloud, AI, and L2 operations |
| **B2B Buyer Savings** | ₹300 (15% markup) | ₹200 (10% saving) | Lower procurement cost for corporates |

---

### 13. Phased 16-Week Implementation Roadmap

- **Phase 1: WhatsApp Bot & Media (W1–W4)**  
  Meta API integration, Whisper speech-to-text pipeline, Cloudinary signed upload presets, and dynamic GI watermarking engine.
- **Phase 2: E-Commerce & Workroom (W5–W8)**  
  FastAPI auto-listing generator, Kalaswar B2C Storefront, ONDC multi-publishing connectors, and Coordinator Dashboard.
- **Phase 3: Blockchain DPP & Factoring (W9–W12)**  
  Polygon L2 smart contract deployment, Merkle state batching engine, public QR passport viewer, and PO micro-factoring.
- **Phase 4 [Future Vision]: Edge CV QC (W13–W16)**  
  YOLOv8 defect detection model training, WebGPU/TFLite mobile scanner integration, and automated pre-dispatch A/B/C grading.

---

### 14. Summary Pitch & Key Performance Indicators

- **Artisan Income Share:** 68% vs 15%
- **Listing Time:** < 3 Mins via WhatsApp
- **Tech Infrastructure Cost:** < $0.05 / Unit

*Kalaswar bridges rural heritage craft with global commerce—turning handmade work into meaningful, traceable economic independence.*
