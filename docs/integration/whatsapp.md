# Kalaswar WhatsApp Artisan Integration Guide

> **Audience**: WhatsApp Bot Teammate / Conversational AI Engineer  
> **Status**: Ready for Bot Connection  
> **Backend Service**: `http://localhost:8000`  
> **Auth Header**: `X-Service-Token: kalaswar_internal_service_secret_token`

---

## 1. Executive Architecture Overview

Kalaswar's WhatsApp integration enables grassroots rural artisans (many of whom are non-literate or speak regional Indic dialects) to catalog, price, and publish their handcrafted products entirely via **voice notes and WhatsApp photos**.

```
┌─────────────────────────────────┐
│     Artisan on WhatsApp         │
│  (Sends photo + Hindi audio)    │
└────────────────┬────────────────┘
                 │ (WhatsApp Business API)
                 ▼
┌─────────────────────────────────┐
│     WhatsApp Bot Service        │
│   (Meta Cloud API / Twilio)     │
└────────────────┬────────────────┘
                 │ (Internal REST API with X-Service-Token)
                 ▼
┌──────────────────────────────────────────────────────────────┐
│                    Kalaswar Core Backend                     │
│                                                              │
│  1. Cloudinary Adapter: f_auto, q_auto, background clean     │
│  2. STT Adapter: Sarvam AI Indic / Whisper / Mock            │
│  3. LLM Adapter: Structured Craft & Material Extraction      │
│  4. FairPrice Engine: Transparent Artisan Margin Breakdown   │
│  5. Coordinator Validation Gate: Status -> pending_validation│
│  6. Action Audit Logs: Immutable compliance logging          │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Base URLs & Authentication

### Base URLs
* **Local Development**: `http://localhost:8000`
* **Staging Server**: `https://api.staging.kalaswar.org`
* **Production**: `https://api.kalaswar.org`

### Authentication Header
Every internal WhatsApp endpoint is protected by a shared service token. You must include **either** of the following HTTP headers in every request:

```http
X-Service-Token: kalaswar_internal_service_secret_token
```
*or*
```http
Authorization: Bearer kalaswar_internal_service_secret_token
```

### Environment Configuration in `backend/.env`
```env
# Shared secret for internal teammate microservices
INTERNAL_SERVICE_TOKEN=kalaswar_internal_service_secret_token
WHATSAPP_SHARED_SERVICE_TOKEN=kalaswar_internal_service_secret_token
```

> [!WARNING]
> Requests missing a valid token or providing an incorrect token will be rejected immediately with `HTTP 401 Unauthorized`:
> ```json
> {
>   "error": {
>     "code": "AUTH_ERROR",
>     "message": "Invalid or missing internal service token",
>     "status_code": 401,
>     "request_id": "req-987a-654b"
>   }
> }
> ```

---

## 3. Conversation State Machine

The conversation is tracked per artisan phone number (`E.164` format, e.g. `+919876543210`) using a state machine:

```mermaid
stateDiagram-v2
    [*] --> awaiting_media: Initial Artisan Message
    awaiting_media --> awaiting_voice: Step 1: Photo Ingested (POST /media)
    awaiting_voice --> needs_clarification: Step 2: Voice Missing Craft/Materials
    needs_clarification --> awaiting_voice: Artisan Sends Clarification
    awaiting_voice --> awaiting_approval: Step 2: Voice Extracted & FairPrice Ready
    awaiting_approval --> completed: Step 3: Button Click 'btn_approve'
    awaiting_approval --> awaiting_voice: Step 3: Button Click 'btn_edit'
    awaiting_approval --> cancelled: Step 3: Button Click 'btn_cancel'
    completed --> [*]
```

### Core Business Rules
1. **AI Honesty Rule**:
   * If an artisan's voice note does not specify mandatory craft details (e.g. material type or craft tradition), the system **never guesses or invents attributes**.
   * It transitions to `needs_clarification` and returns a polite Hindi follow-up question.
2. **Coordinator Validation Rule (Mandatory Quality Guard)**:
   * When an artisan clicks **Approve (`btn_approve`)**, the product draft status does **NOT** go directly to `published`.
   * It transitions strictly to **`pending_validation`**.
   * Products must be reviewed and given final validation by the SHG Cluster Coordinator before appearing on ONDC or the buyer storefront.
   * A dynamic **Geographical Indication (GI) watermark overlay** is automatically attached to the Cloudinary asset.

---

## 4. Internal API Endpoints Reference

### A. Ingest Product Photo (Step 1)
Uploads artisan photo to Cloudinary, applies `f_auto`, `q_auto`, and background clean transforms, initializes session to `awaiting_voice`, and returns prompt text.

* **Method**: `POST`
* **Path**: `/internal/whatsapp/media`
* **Headers**:
  ```http
  Content-Type: application/json
  X-Service-Token: kalaswar_internal_service_secret_token
  ```
* **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "media_url": "https://example.com/artisan_cushion.jpg",
    "media_base64": null,
    "media_id": null,
    "caption": "हाथ से कढ़ाई किया गया कांथा कुशन कवर"
  }
  ```
  *(Note: You can pass either `media_url`, raw `media_base64` string, or Meta `media_id`).*

* **Response (`HTTP 200 OK`)**:
  ```json
  {
    "session_id": "8208a53f-048c-47e9-b2cb-dadef19d2e1f",
    "phone": "+919876543210",
    "step": "awaiting_voice",
    "image_url": "https://res.cloudinary.com/kalaswar-demo/image/upload/f_auto,q_auto,e_improve,c_fill,w_800,h_800/kalaswar/artisans/919876543210_1793297966.webp",
    "cloudinary_public_id": "kalaswar/artisans/919876543210_1793297966",
    "prompt_text_hi": "इस सामान का नाम और इस्तेमाल किया गया धागा बताएं।",
    "audio_script_text": "नमस्ते! कृपया इस सुंदर सामान का नाम, शिल्प और इस्तेमाल किया गया धागा बोलकर बताएं।",
    "mode": "demo"
  }
  ```

---

### B. Ingest Voice Note & Auto-Draft (Step 2)
Transcribes audio note, extracts structured craft attributes via LLM, computes FairPrice breakdown, and creates a record in `listing_drafts`.

* **Method**: `POST`
* **Path**: `/internal/whatsapp/voice`
* **Headers**:
  ```http
  Content-Type: application/json
  X-Service-Token: kalaswar_internal_service_secret_token
  ```
* **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "audio_url": "https://example.com/artisan_voice_note.mp3",
    "audio_base64": null,
    "language": "hi",
    "stt_provider": "sarvam"
  }
  ```
  *(Supported `stt_provider` values: `"mock"` (default), `"sarvam"` (Indic), `"whisper"`).*

* **Response (`HTTP 200 OK` - Happy Path)**:
  ```json
  {
    "session_id": "8208a53f-048c-47e9-b2cb-dadef19d2e1f",
    "phone": "+919876543210",
    "step": "awaiting_approval",
    "status": "draft_created",
    "transcript": "हाथ से कढ़ाई किया गया सूती कुशन कवर, लाल रेशम धागा, आरी शिल्प, नीला रंग",
    "draft_id": "225ab5eb-8ffc-453e-826d-34173fbdd08b",
    "extracted_craft": {
      "title": "हाथ से कढ़ाई किया गया सूती कुशन कवर",
      "craft": "Aari Hand Embroidery",
      "materials": ["Cotton fabric", "Silk embroidery thread"],
      "colour": "लाल और नीला (Red & Blue)",
      "language": "hi",
      "estimated_labour_hours": 4.0,
      "confidence": 0.96
    },
    "fair_price": {
      "material_cost": 360.0,
      "labour_cost": 600.0,
      "packaging_cost": 40.0,
      "overhead_cost": 115.8,
      "platform_fee": 114.86,
      "floor_price": 1115.8,
      "suggested_price": 1640.88,
      "artisan_earnings": 1010.22,
      "currency": "INR",
      "is_complete": true,
      "breakdown_notes": ["Fair wage benchmark: ₹150/hr (Skilled Artisan)"]
    },
    "hindi_text": "✅ आपके उत्पाद का विवरण तैयार है:\n\n📌 नाम: हाथ से कढ़ाई किया गया सूती कुशन कवर\n🧵 शिल्प: Aari Hand Embroidery\n🎨 रंग व सामग्री: लाल और नीला (Red & Blue), Cotton fabric, Silk embroidery thread\n💰 सुझाई गई उचित कीमत: ₹1641 (सीधे कारीगर की आय: ₹1010)\n\nकृपया नीचे दिए गए बटन पर क्लिक करके मंजूर करें।",
    "audio_script_text": "नमस्ते! आपके द्वारा बताए गए हाथ से कढ़ाई किया गया सूती कुशन कवर का ड्राफ्ट तैयार कर लिया गया है। इसकी उचित खुदरा कीमत ₹1640 तय की गई है, जिसमें से ₹1010 सीधे आपके बैंक खाते में जाएंगे। क्या आप इसे मंजूर करते हैं?",
    "interactive_buttons": [
      {
        "id": "btn_approve",
        "title": "मंजूर करें / Approve & Publish"
      },
      {
        "id": "btn_edit",
        "title": "बदलाव करें / Edit Details"
      },
      {
        "id": "btn_cancel",
        "title": "रद्द करें / Cancel"
      }
    ],
    "missing_fields": [],
    "needs_clarification": false,
    "mode": "demo"
  }
  ```

* **Response (`HTTP 200 OK` - Missing Attributes / Clarification Gate)**:
  ```json
  {
    "session_id": "8208a53f-048c-47e9-b2cb-dadef19d2e1f",
    "phone": "+919876543210",
    "step": "needs_clarification",
    "status": "needs_clarification",
    "transcript": "यह कुशन कवर है",
    "draft_id": null,
    "extracted_craft": {
      "title": "कुशन कवर",
      "craft": null,
      "materials": [],
      "colour": null
    },
    "fair_price": null,
    "hindi_text": "कृपया बताएं कि इसमें कौन सा शिल्प और किस प्रकार के धागे या कपड़े का इस्तेमाल किया गया है?",
    "audio_script_text": "कृपया बताएं कि इसमें कौन सा शिल्प और किस प्रकार के धागे या कपड़े का इस्तेमाल किया गया है?",
    "interactive_buttons": [
      {
        "id": "btn_retry_voice",
        "title": "पुनः बोलें / Speak Again"
      }
    ],
    "missing_fields": ["craft", "materials"],
    "needs_clarification": true,
    "mode": "demo"
  }
  ```

---

### C. Artisan Approval Button (Step 3)
Triggered when the artisan clicks one of the WhatsApp interactive buttons (`btn_approve`, `btn_edit`, or `btn_cancel`).

* **Method**: `POST`
* **Path**: `/internal/whatsapp/approve`
* **Headers**:
  ```http
  Content-Type: application/json
  X-Service-Token: kalaswar_internal_service_secret_token
  ```
* **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "button_id": "btn_approve",
    "draft_id": "225ab5eb-8ffc-453e-826d-34173fbdd08b"
  }
  ```

* **Response (`HTTP 200 OK`)**:
  ```json
  {
    "session_id": "8208a53f-048c-47e9-b2cb-dadef19d2e1f",
    "phone": "+919876543210",
    "draft_id": "225ab5eb-8ffc-453e-826d-34173fbdd08b",
    "action_taken": "artisan_approved",
    "new_status": "pending_validation",
    "requires_coordinator_review": true,
    "watermarked_image_url": "https://res.cloudinary.com/kalaswar-demo/image/upload/l_kalaswar_gi_badge,w_130,g_south_east,x_20,y_20,o_90/f_auto,q_auto/kalaswar/artisans/919876543210_1793297966.webp",
    "hindi_text": "🎉 आपका ड्राफ्ट सफलतापूर्वक मंजूर कर लिया गया है!\n\n📋 कोऑर्डिनेटर सत्यापन नियम (Coordinator Rule):\nसरकारी और ई-कॉमर्स गुणवत्ता मानकों के अनुसार, यह ड्राफ्ट अब आपके स्वयं सहायता समूह (SHG) के कोऑर्डिनेटर के पास अंतिम सत्यापन (Validation) के लिए भेजा गया है। जैसे ही वे इसे अंतिम मंजूरी देंगे, यह उत्पाद ONDC और कलास्वर स्टोर पर लाइव हो जाएगा।",
    "audio_script_text": "बधाई हो! आपका उत्पाद ड्राफ्ट मंजूर हो गया है और GI सत्यापन बैज के साथ सुरक्षित कर लिया गया है। अंतिम समीक्षा के लिए यह आपके SHG कोऑर्डिनेटर के पास पहुंच गया है।",
    "mode": "demo"
  }
  ```

---

### D. Get Current Conversation State
Retrieves the real-time session state, draft reference, and history for any phone number.

* **Method**: `GET`
* **Path**: `/internal/whatsapp/session/{phone}`
* **Example**: `/internal/whatsapp/session/+919876543210`
* **Headers**:
  ```http
  X-Service-Token: kalaswar_internal_service_secret_token
  ```
* **Response (`HTTP 200 OK`)**:
  ```json
  {
    "session_id": "8208a53f-048c-47e9-b2cb-dadef19d2e1f",
    "phone": "+919876543210",
    "artisan_id": "cccccccc-0001-0000-0000-000000000001",
    "step": "completed",
    "status": "completed",
    "image_url": "https://res.cloudinary.com/kalaswar-demo/image/upload/f_auto,q_auto.../sample.webp",
    "draft_id": "225ab5eb-8ffc-453e-826d-34173fbdd08b",
    "draft_status": "pending_validation",
    "last_activity_at": "2026-10-29T18:19:26.422534+00:00",
    "mode": "demo"
  }
  ```

---

## 5. Authentic Hindi Message Templates

Use these standardized Hindi strings when formatting WhatsApp outbound messages or passing to an Indic Text-to-Speech (TTS) engine:

| Event | Text Message | Audio / TTS Script |
| :--- | :--- | :--- |
| **Photo Ingested** | `इस सामान का नाम और इस्तेमाल किया गया धागा बताएं।` | `नमस्ते! कृपया इस सुंदर सामान का नाम, शिल्प और इस्तेमाल किया गया धागा बोलकर बताएं।` |
| **Draft Ready** | `✅ आपके उत्पाद का विवरण तैयार है:<br><br>📌 नाम: {title}<br>🧵 शिल्प: {craft}<br>🎨 रंग व सामग्री: {colour}, {materials}<br>💰 सुझाई गई उचित कीमत: ₹{price} (सीधे आपकी आय: ₹{earnings})<br><br>कृपया नीचे दिए गए बटन पर क्लिक करके मंजूर करें।` | `नमस्ते! आपके द्वारा बताए गए {title} का ड्राफ्ट तैयार कर लिया गया है। इसकी उचित खुदरा कीमत ₹{price} तय की गई है, जिसमें से ₹{earnings} सीधे आपके बैंक खाते में जाएंगे। क्या आप इसे मंजूर करते हैं?` |
| **Missing Info** | `कृपया बताएं कि इसमें कौन सा शिल्प और किस प्रकार के धागे या कपड़े का इस्तेमाल किया गया है?` | `कृपया बोलकर बताएं कि इसमें कौन सा शिल्प और क्या सामग्री इस्तेमाल हुई है?` |
| **Approved** | `🎉 आपका ड्राफ्ट सफलतापूर्वक मंजूर कर लिया गया है!<br><br>📋 कोऑर्डिनेटर सत्यापन नियम (Coordinator Rule):<br>सरकारी और ई-कॉमर्स गुणवत्ता मानकों के अनुसार, यह ड्राफ्ट अब आपके SHG कोऑर्डिनेटर के पास अंतिम सत्यापन के लिए भेजा गया है।` | `बधाई हो! आपका उत्पाद ड्राफ्ट मंजूर हो गया है और GI सत्यापन बैज के साथ सुरक्षित कर लिया गया है। अंतिम समीक्षा के लिए यह आपके SHG कोऑर्डिनेटर के पास पहुंच गया है।` |

---

## 6. How to Test Locally with ngrok

To connect the Meta Cloud API webhook to your local developer machine:

### Step 1: Start the Kalaswar Backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Open an ngrok Tunnel
In a new terminal:
```bash
ngrok http 8000
```
ngrok will provide a public forwarding URL such as:
`https://a1b2-c3d4.ngrok-free.app`

### Step 3: Configure Meta Developer Portal Webhook
1. Go to **Meta for Developers $\to$ WhatsApp $\to$ Configuration $\to$ Webhook**.
2. **Callback URL**: `https://a1b2-c3d4.ngrok-free.app/internal/whatsapp/webhook`
3. **Verify Token**: Set to matching `WHATSAPP_VERIFY_TOKEN` (default: `kalaswar_webhook_verify_token`).
4. Subscribe to the `messages` field.

### Step 4: Rapid Manual Verification via `curl`
You can test the entire pipeline locally without sending real WhatsApp messages:

```bash
# 1. Test Ingest Photo
curl -X POST http://localhost:8000/internal/whatsapp/media \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: kalaswar_internal_service_secret_token" \
  -d '{"phone": "+919876543210", "media_url": "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2"}'

# 2. Test Ingest Voice Note
curl -X POST http://localhost:8000/internal/whatsapp/voice \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: kalaswar_internal_service_secret_token" \
  -d '{"phone": "+919876543210", "language": "hi", "stt_provider": "mock"}'

# 3. Test Approve Button
curl -X POST http://localhost:8000/internal/whatsapp/approve \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: kalaswar_internal_service_secret_token" \
  -d '{"phone": "+919876543210", "button_id": "btn_approve"}'

# 4. Check Session
curl -X GET http://localhost:8000/internal/whatsapp/session/+919876543210 \
  -H "X-Service-Token: kalaswar_internal_service_secret_token"
```

---

## 7. Using the CLI Conversation Simulator (`whatsapp_sim.py`)

A full CLI simulation script is provided in [`backend/scripts/whatsapp_sim.py`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/scripts/whatsapp_sim.py) using sample assets in [`backend/samples/`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/samples/).

### Quick Run
```bash
python backend/scripts/whatsapp_sim.py
```
*(Auto-detects whether `http://localhost:8000` is running; if offline, runs seamlessly in-process).*

### Interactive Demo Mode (Pauses at each conversational turn)
```bash
python backend/scripts/whatsapp_sim.py --interactive
```

### Full JSON Debug Output
```bash
python backend/scripts/whatsapp_sim.py --json
```

### Custom Phone Number & STT Provider
```bash
python backend/scripts/whatsapp_sim.py --phone +919812345678 --stt sarvam
```
