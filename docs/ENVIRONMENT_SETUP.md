# Kalaswar — Environment Setup

All Supabase/Cloud variables are provisioned automatically by Lovable Cloud — do not set them by
hand in the Lovable environment. The lists below document what exists and what a self-hosted or
external deployment would need.

## Server-only (never prefixed `VITE_`, read only inside handlers)

| Variable | Set by | Used by | Purpose |
|---|---|---|---|
| `SUPABASE_URL` | Lovable Cloud | `/api/public/assistant` | publishable server client for assistant reads |
| `SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud | `/api/public/assistant` | same (opaque key, sent as `apikey`) |
| `LOVABLE_API_KEY` | Lovable Cloud | stt.ts, tts.ts, assistant.ts | Lovable AI Gateway calls (STT, TTS, chat-with-tools) |

## Browser (VITE_ prefix)

| Variable | Set by | Used by | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Lovable Cloud (auto-gen `.env`) | generated client | database access with RLS |
| `VITE_CLOUDINARY_CLOUD_NAME` | you (Cloudinary dashboard) | product image upload | unsigned upload target |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | you (Cloudinary dashboard) | product image upload | unsigned upload preset |

## What you must configure yourself

1. **Cloudinary (image uploads).** Create a free Cloudinary account, note the cloud name, create
   an *unsigned* upload preset, and set the two `VITE_CLOUDINARY_*` values via Lovable's secret/
   environment settings. Until then the product form shows a clear "not configured" message.
   Production should switch to a signed upload flow with a constrained preset.
2. **External STT/TTS provider (optional, not yet chosen).** When a provider is selected, its key
   would be added as a server-only secret and the three voice endpoints adapted; the pipeline is
   already structured for a swap. Do not add provider keys before choosing a provider.

## Local development

```bash
npm install
npm run dev      # Vite dev server with SSR
npm test         # vitest (dictionary parity, feasibility engine, voice router)
```

Never commit `.env`. `.env.example` in the repo root lists every variable name with no values.
