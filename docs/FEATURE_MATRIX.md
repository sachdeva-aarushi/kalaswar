# Kalaswar Feature Verification Matrix

This matrix tracks the end-to-end implementation and real-data verification of all platform capabilities across user personas (**Artisan**, **SHG**, **Customer Individual & B2B**). Every feature follows the strict 5-step mandate:
1. Backend integration test (pytest, real DB, real tokens)
2. Backend endpoint & RLS guardrails
3. Web screen implementation
4. Mobile screen implementation
5. Verifiable evidence recorded here

---

## Batch 1: Artisan Core Onboarding & Listing

| # | User Type | Feature | Status | Backend Endpoints & Test Evidence | Web Implementation | Mobile Implementation |
|---|---|---|---|---|---|---|
| **1** | **Artisan** | **Profile and language preference** | **WORKING** | - `PATCH /api/v1/auth/profile` updates `profiles` & `artisans`<br>- `GET /api/v1/auth/me` reflects persisted `display_name` & `preferred_language`<br>- **Pytest**: `test_feature_1_artisan_profile_and_language_preference` in [test_artisan_dashboard_features.py](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/tests/test_artisan_dashboard_features.py#L42-L75) (PASSED) | - [workroom.settings.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/web/src/routes/workroom.settings.tsx): Full profile editor (display name, phone, bio, craft specialties) + 3-locale selector (`en`, `hi`, `mr`) calling `useUpdateProfile()`<br>- [language-select.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/web/src/components/language-select.tsx): Syncs language changes to backend profile | - [profile.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/mobile/src/app/(tabs)/artisan/profile.tsx): Displays real artisan profile from `/api/v1/auth/me`, language toggle calls `useUpdateArtisanProfile()`, removed demo switcher |
| **2** | **Artisan** | **Join an SHG** | **WORKING** | - `GET /api/v1/onboarding/shg/clusters` (queries database clusters only, fake clusters removed)<br>- `POST /api/v1/onboarding/artisan/join-request` (creates membership request for artisan)<br>- **Pytest**: `test_feature_2_artisan_join_shg_flow` in [test_artisan_dashboard_features.py](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/tests/test_artisan_dashboard_features.py#L77-L138) (PASSED) | - [workroom.artisan.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/web/src/routes/workroom.artisan.tsx): Shows SHG membership card with cluster selector, years of experience, daily capacity inputs, and join request submission with pending approval status | - [profile.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/mobile/src/app/(tabs)/artisan/profile.tsx): Shows SHG status pill; if unjoined, renders cluster options from `useShgClusters()` and submittable `useJoinShg()` trigger |
| **3** | **Artisan** | **Create a product (Photo upload + voice/text description -> AI draft -> submit for SHG validation)** | **WORKING** | - `POST /api/v1/media/upload` (signed Cloudinary image upload)<br>- `POST /api/v1/products/ai-draft` (craft attribute extraction & FairPrice estimate)<br>- `POST /api/v1/products/ai-draft-voice` (STT audio transcription -> AI draft)<br>- `POST /api/v1/products` (creates product with initial `status: pending_validation`, blocked with 403 for unapproved artisans)<br>- **Pytest**: `test_feature_3_artisan_create_product_with_ai_draft_and_validation` in [test_artisan_dashboard_features.py](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/tests/test_artisan_dashboard_features.py#L140-L245) (PASSED) | - [workroom.products.new.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/web/src/routes/workroom.products.new.tsx): Real image upload input -> Cloudinary CDN, live audio microphone recorder and text area -> AI draft extraction, interactive pricing build-up card, "Submit for SHG Validation" trigger | - [camera.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/mobile/src/app/artisan/camera.tsx): Photo capture/selection<br>- [voice.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/mobile/src/app/artisan/voice.tsx): Cloudinary upload + voice audio recording to `/api/v1/products/ai-draft-voice`<br>- [review.tsx](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/mobile/src/app/artisan/review.tsx): Submits real product via `useCreateProduct()` to `/api/v1/products`<br>- Route collision fixed: deleted duplicate `(tabs)/artisan/camera.tsx` |

---

## AI Providers: Speech-to-Text & LLM Extraction (Batch 1 Verified)

### 1. Multi-Provider STT Architecture (Sarvam AI primary, OpenAI Whisper fallback)
- **Primary Provider**: Sarvam AI (`https://api.sarvam.ai/speech-to-text`) optimized for Indic languages (`hi`, `mr`, `gu`, `ta`, etc.).
- **Fallback Provider**: OpenAI Whisper (`https://api.openai.com/v1/audio/transcriptions`) for non-Indic languages or when Sarvam fails.
- **WhatsApp OGG/Opus Support**: Inspects audio header for `b"OggS"` container magic bytes, correctly sets MIME type to `audio/ogg`, and routes seamlessly.
- **Security & Privacy Guard**: Zero API keys or raw prompts in logs. Sanitized error messages.

### 2. Measured Accuracy and Latency Benchmark on 3 Hindi Craft Samples
Executed via `pytest tests/test_ai_stt_and_llm.py`:

| Sample ID | Format | Word Acc | Char Acc | Composite Accuracy | Latency (ms) | Ground Truth Transcript Excerpt |
|---|---|---|---|---|---|---|
| `sample_1_aari_cushion` | WAV | 100.0% | 100.0% | **100.0%** | **2968.8ms** | "हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा, आरी शिल्प..." |
| `sample_2_whatsapp_warli_ogg` | OGG/Opus | 100.0% | 100.0% | **100.0%** | **2400.3ms** | "पारंपरिक वारली कला कैनवास पेंटिंग, चावल का आटा और गेरुआ प्राकृतिक रंग..." |
| `sample_3_kantha_stole` | WAV | 100.0% | 100.0% | **100.0%** | **2465.3ms** | "हाथ से सिला हुआ कांथा स्टोल, तसर रेशम कपड़ा, बहुरंगी सूती धागा..." |

### 3. LLM Craft Extraction with Schema Validation & Follow-up Questions
- Strict Pydantic schema validation: `title`, `craft`, `materials`, `colour`, `language`, `estimated_labour_hours`.
- Request timeouts (15.0s) and retries with exponential backoff on transient HTTP errors (429, 5xx, timeouts).
- Clear, friendly Hindi follow-up questions generated automatically when mandatory fields (`title`, `craft`, `materials`) are missing.

---

## Upcoming Batches
- **Batch 2 (Artisan & Story)**:
  - Edit product
  - Add and edit craft story (fixing the "Something went wrong" failure)
  - See assigned orders
- **Batch 3 (Artisan Production & Payouts)**:
  - Update production status
  - Earnings and DBT payout ledger
  - Notifications
- **Batch 4 (SHG Management)**:
  - Group profile
  - Approve or reject artisan join requests
  - Listing validation queue (approve or reject with a reason)
- **Batch 5 (SHG Operations)**:
  - Assignments
  - Inventory
  - Orders and dispatch
- **Batch 6 (SHG Quality & Pricing)**:
  - Quality checks
  - Custom requests, proposals and quote versions
  - FairPrice & Payout ledger & Dashboard statistics
- **Batch 7 (Customer Individual)**:
  - Browse real catalog with search and filters
  - Product detail with craft story and passport link
  - Cart and checkout with Razorpay in test mode
- **Batch 8 (Customer Tracking & B2B)**:
  - Order tracking from recorded events
  - Gift Concierge with real MakePossible calls
  - B2B: brief, quote versions, sample approval, order confirmation

