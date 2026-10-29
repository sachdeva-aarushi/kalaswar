# Backend — Kalaswar FastAPI Core Services

FastAPI backend application orchestrating the WhatsApp Bot webhook, AI speech pipeline (Whisper/Sarvam), dynamic Cloudinary media optimization, and Layer-2 Blockchain Provenance / DPP.

```
backend/
├── app/
│   ├── main.py                # FastAPI entrypoint, OpenAPI docs & CORS
│   ├── config.py              # Pydantic Settings configuration
│   ├── routers/
│   │   ├── whatsapp.py        # Meta WhatsApp Cloud API webhooks & voice listing
│   │   ├── ai_voice.py        # Whisper / Sarvam STT & TTS pipeline
│   │   ├── products.py        # Product catalog & auto-publishing
│   │   └── dpp.py             # Digital Product Passport & Merkle root batching
│   ├── schemas/               # Pydantic data contract models
│   └── services/              # External provider adapters (Cloudinary, Whisper, L2)
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variables template
└── README.md
```

## Setup & Running Locally

1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

4. View interactive API documentation (OpenAPI):
   - Swagger UI: `http://localhost:8000/api/v1/docs`
   - ReDoc: `http://localhost:8000/api/v1/redoc`
