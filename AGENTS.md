<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Kalaswar — project decisions

- Demo-mode data access: all public tables allow anon reads; orders/assignments/products/tips allow anon writes so the demonstration journey (assign, upload, tip) works without auth. RLS policies label this clearly; production needs real auth + scoped policies before publishing to real users.
- Production RBAC (migration 0010): roles live in user_roles (app_role: admin/coordinator/artisan/customer/buyer). Signup metadata may grant only customer/buyer; coordinator/artisan/admin require trusted service-role assignment. Authenticated policies scope every private table through is_shg_coordinator / owns_buyer / is_org_artisan membership helpers — when adding a new private table, add the equivalent scoped policy in the same migration. Demonstration anon policies stay until production launch; removing them (and gating /shg/* + /artisan-space) is the single documented hardening step.
- Cloudinary image upload is a real unsigned-upload workflow reading `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`. When unset, the UI shows a configuration error and never simulates success. Production should switch to a server-signed upload flow (API secret stays server-side).
- Voice: primary pipeline records a complete WAV in-browser → `/api/public/stt` → `/api/public/assistant` (Lovable AI on the server: model, prompt, tools; may return a `navigate` screen action the client follows) → streamed TTS from `/api/public/tts`; browser speech synthesis is the playback fallback and the pure `routeCommand` router (unit-tested, en/hi/mr) answers whenever the assistant is unreachable. Voice is never the only path — text fallback always present; audio is uploaded for transcription only, never stored.
- Languages: single dictionary i18n in `frontend/src/lib/i18n.tsx` (en/hi/mr); Hindi and Marathi must cover every English key (enforced by test).
- UPI payments: QR codes are generated client-side from the collective's own UPI ID; Kalaswar displays the QR but never processes or verifies money — payment rows and order events are clearly labelled demonstration records.
- Order steps auto-append to `order_events` (best-effort) inside `assignOrder`/`updateOrderStatus`/`recordPayment` in the data layer; the timeline UI and CSV exports read from it.
- Seeded demonstration data uses fixed UUIDs; `DEMO_ARTISAN_ID` in `frontend/src/lib/constants.ts` anchors the artisan experience. Demo imagery/records must stay visibly labeled as demonstration.
- Data layer lives in `frontend/src/lib/data.ts` as TanStack Query options over the generated browser Supabase client (RLS applies); no admin client is used anywhere.
- MakePossible feasibility is pure deterministic code (`frontend/src/lib/makepossible.ts`), never AI: it judges only recorded skills/materials/capacity/workload/comparable prices, reports unknowns as missing, and generic craft words (weaving, bag, …) never count as skill evidence — keep it unit-tested. A request with missing information is `insufficient_information`, never silently "feasible".
- Custom-order confirmation requires both customer and coordinator approval of the exact same proposal version (`proposal_approvals` rows); the confirmed order stores `proposal_id` and `is_custom`. Confirmation writes are currently non-transactional browser calls (demo); production must move them into an authenticated transactional server function.
- Repository layout: application code lives in `frontend/` (React 19 app + TanStack Start server routes; Vite's `srcDirectory` points at `frontend/src`), database schema, Drizzle migrations, drizzle config and `.env.example` live in `backend/`, and documentation lives under `docs/` (architecture/, product/, operations/, ROADMAP.md, REPOSITORY_STRUCTURE.md — see docs/REPOSITORY_STRUCTURE.md). The root holds toolchain config plus README.md and AGENTS.md; `supabase/config.toml` stays at the root because the platform manages it. README.md is user-maintained: fetch it from the GitHub repo when needed and never rewrite or restructure it.
