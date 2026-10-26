# Kalaswar — Architecture

## Stack

- **Frontend + backend:** TanStack Start v1 (React 19, Vite 7), SSR for public routes,
  client-only for protected shells. App-internal server logic uses `createServerFn`; external
  endpoints (STT, TTS, assistant) are TanStack server routes under `frontend/src/routes/api/public/*`.
- **Database:** Lovable Cloud (managed Supabase). All application tables live in `public`;
  access is via the generated browser client (`frontend/src/integrations/supabase/client`) so Row Level
  Security always applies. No admin client is used anywhere in app code.
- **AI:** Lovable AI Gateway server-side (`LOVABLE_API_KEY`) for speech-to-text, assistant
  completions with tools, and streamed text-to-speech.

## Module map

```
frontend/src/
  lib/
    i18n.tsx          single dictionary, EN/HI/MR, parity enforced by test
    types.ts          handcrafted domain types mirroring the DB
    data.ts           TanStack Query options + write helpers over the browser Supabase client
    makepossible.ts   deterministic feasibility engine (rules over recorded data only)
    constants.ts      demo IDs, categories, Cloudinary env reads
    voice.ts          browser recording (WAV) + playback fallbacks
    routeCommand.ts   deterministic en/hi/mr command router (unit-tested, offline fallback)
  routes/
    index.tsx explore.tsx artisans.tsx artisan.$id.tsx product.$id.tsx concierge.tsx
    artisan-space.tsx                 voice-first artisan workspace
    shg.tsx shg.orders.tsx shg.artisans.tsx shg.products.tsx shg.payments.tsx
    shg.reports.tsx shg.requests.tsx  coordinator workroom
    api/public/stt.ts tts.ts assistant.ts   voice pipeline endpoints
```

## Data flow decisions

1. **Single data layer.** All reads/writes go through `frontend/src/lib/data.ts` query options over the
   generated browser client. RLS is the authorization boundary; there is no privileged read
   anywhere in app code.
2. **Feasibility is code, not AI.** `assessFeasibility` is a pure function over a collective
   snapshot (skills, materials, monthly capacity, active workload, comparable prices). The AI is
   never asked to judge feasibility, so results are reproducible and explainable, and are covered
   by unit tests. Estimated production days (`estimateProductionDays`) are labelled as estimates.
3. **Proposal versioning + two-sided approval.** `custom_requests` → `proposals` (versioned,
   immutable spec JSON) → `proposal_approvals` (one row per approver role per proposal id). Order
   confirmation requires both approvals for the same proposal id, checked before writes; the
   resulting order carries `proposal_id` and `is_custom` for the audit trail.
4. **Order event trail.** `assignOrder`, `updateOrderStatus`, `recordPayment` best-effort append
   to `order_events`; the timeline UI and CSV exports read from that table.
5. **Voice pipeline.** Browser records a complete WAV → `/api/public/stt` → `/api/public/assistant`
   (model + prompt + tools on the server; may return a `navigate` action the client follows) →
   streamed TTS from `/api/public/tts`. Audio is uploaded for transcription only and never stored.
   The pure `routeCommand` router answers whenever the assistant is unreachable.
6. **Server boundary rules.** `process.env.*` reads happen only inside server handlers; browser
   config uses `import.meta.env.VITE_*`. Webhooks/public endpoints verify their caller; private
   data never returns from a public route.

## Demonstration vs production

The current build is an end-to-end **demonstration**:

- All public tables allow anon reads; orders, assignments, products and tips allow anon writes so
  the journeys work without sign-in. Policies are titled "Demo…" with comments to replace before
  production.
- Coordinator and artisan pages are labeled "Demonstration access — not production-secured".
- `confirmCustomOrder` performs its writes as separate browser-client calls (non-transactional).
  Production must move consequential writes behind an authenticated, transactional server action.
- Auth scaffolding exists (`profiles`, `user_roles`, `has_role`, signup trigger) but no login UI
  is wired; production should gate `/shg/*` and `/artisan-space` with role-checked auth.

Production hardening steps are listed in DEPLOYMENT_GUIDE.md.
