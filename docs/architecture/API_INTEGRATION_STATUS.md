# Kalaswar — API Integration Status

Status of every external or platform integration, as implemented today.

## Lovable Cloud (managed Supabase) — live

- Generated browser client with RLS for all app reads/writes (`src/lib/data.ts`).
- Server publishable client inside `/api/public/assistant` for public assistant reads
  (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, opaque-key `apikey` header, no session storage).
- Auth scaffolding (profiles, user_roles, has_role, signup trigger) deployed; login UI not wired.

## Lovable AI Gateway — live

| Endpoint | Purpose | Auth | State |
|---|---|---|---|
| `POST /api/public/stt` | WAV → text (EN/HI/MR) | server `LOVABLE_API_KEY` | working; audio not stored |
| `POST /api/public/assistant` | tool-using assistant; may return `{ action: "navigate", screen }` | same | working; drives screen switching and form filling |
| `POST /api/public/tts` | streamed text → speech | same | working; browser speech-synthesis fallback |

**Provider abstraction:** the three endpoints are the provider boundary — swapping to an external
STT/TTS provider means changing only their internals, after the provider is chosen. No external
provider credentials are configured; none should be invented.

## Cloudinary — real but unconfigured

- Client-side **unsigned** upload in the product form reading `VITE_CLOUDINARY_CLOUD_NAME` and
  `VITE_CLOUDINARY_UPLOAD_PRESET` (`src/lib/constants.ts`).
- When unset: the UI shows a configuration error and never simulates success.
- Production recommendation: signed uploads with a constrained preset (see DEPLOYMENT_GUIDE.md).

## UPI payments — display only (by design)

- QR codes are generated client-side from the collective's own UPI ID; Kalaswar never processes
  or verifies money. Payment rows and order events are clearly labeled demonstration records.

## GitHub sync — external repo

- Source is continuously committed to `sachdeva-aarushi/kalaswar` through the owner's GitHub
  connection, authored under her account. `.env`, dependencies, build output and Git metadata are
  excluded.

## Not integrated (no claim of support)

- Payment settlement providers, logistics/carrier APIs, SMS/WhatsApp notification providers,
  external translation services.
