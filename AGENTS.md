# AGENTS.md — Working Rules for AI Agents & Engineering Team

**Kalaswar Project** (Hackathon Team — 3 Developers & AI Pair Programmers)  
This document establishes the collaboration contract, codebase ownership, and execution guidelines for all autonomous and pair-programming AI agents working in this repository.

---

## 1. Codebase Architecture & Folder Ownership

To prevent merge conflicts and maintain clear boundaries across the team, the repository is partitioned into distinct domains:

| Directory | Domain & Stack | Owner | Working Rules |
| :--- | :--- | :--- | :--- |
| **`web/`** | React 19 + TanStack Start, Tailwind CSS v4, Radix UI, TanStack Query | Web Teammate | Customer Storefront, Gift Concierge, SHG Workroom, and B2B Portal. Must run commands (`npm test`, `npm run build`) from inside `web/`. |
| **`backend/`** | FastAPI (Python 3.12), Pydantic v2, Uvicorn | WhatsApp & Backend Teammate | Core business logic, Meta WhatsApp webhooks, AI voice pipeline (Whisper/Sarvam), Cloudinary dynamic media pipeline, and listing auto-engine. |
| **`supabase/`** | PostgreSQL, Row Level Security (RLS), Supabase Auth | Database / Shared | SQL migrations (`supabase/migrations/`) and seed data (`supabase/seed.sql`). All table changes and RLS policies must be versioned. |
| **`mobile/`** | Expo (React Native) | Mobile Teammate | Reserved for future mobile client (coordinator offline inventory and Edge AI QC). |
| **`docs/`** | Markdown documentation & diagrams | All Teammates | System architecture, masterplan, repo audits, and deployment guides. Keep updated with any structural changes. |

> **Rule:** Agents working on one folder must not modify files in another teammate's folder without explicit instructions.

---

## 2. Branch Naming Conventions

All work must be developed on feature or fix branches before opening a Pull Request:

- `feat/<feature-name>`: New functionality (e.g., `feat/whatsapp-audio-parser`, `feat/dpp-merkle-batching`, `feat/b2b-rfp-flow`).
- `fix/<bug-name>`: Bug fixes and edge-case handling (e.g., `fix/makepossible-capacity-check`, `fix/voice-stt-timeout`).
- `chore/<task-name>`: Refactoring, dependency upgrades, restructuring (e.g., `chore/restructure`).

---

## 3. Security: Never Commit Secrets

- **Zero-Secret Policy:** Never commit `.env`, `.env.local`, API keys, Supabase service-role keys, Cloudinary secrets, private keys, or seed phrases to git.
- **Environment Templates:** Document required environment variables in `backend/.env.example` and `web/.env.example` using blank or safe placeholder values.
- **Client vs. Server Secrets:** Browser code in `web/` must only access public `VITE_*` variables. Privileged secrets (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `CLOUDINARY_API_SECRET`, `WHATSAPP_TOKEN`) belong strictly in `backend/` or server-side functions.

---

## 4. OpenAPI is the API Contract

- The FastAPI backend OpenAPI specification (`/api/v1/openapi.json` and interactive docs at `/api/v1/docs`) is the **authoritative API contract** between backend services, the web application, WhatsApp bots, and mobile clients.
- Any change to request payloads, query parameters, or responses must be reflected in typed Pydantic models under `backend/app/schemas/`.
- Frontend API clients must consume endpoints conforming strictly to this OpenAPI contract.

---

## 5. Core Product Principle: AI Drafts, Humans Approve

- **Artisan & Coordinator Agency:** AI assists by converting voice notes to text, structuring custom gift requests, optimizing images, and calculating fair cost estimates. However, **AI never makes binding operational or financial decisions**.
- **Human Approval Required:**
  - Product listings drafted via WhatsApp or voice require explicit confirmation (`[Approve & Publish]`).
  - Custom gift proposals require two-sided approval (both customer and SHG coordinator must approve the exact same version).
  - Production allocations and order dispatch gating must be performed by human coordinators.

---

## 6. Demonstration Honesty: Simulated Features Must Be Labelled "demo"

- **Explicit Demo Labelling:** When live third-party integrations (such as WhatsApp Business API, UPI payment gateways, Polygon mainnet transactions, or Cloudinary unsigned presets) are unconfigured or mocked, the UI, API responses, and database rows must be explicitly labelled with `"demo"` or `"demo_*"` (e.g., `payment_status: 'demo'`, `mode: 'demo'`).
- **No Invisible Fakes:** If a service (e.g., Cloudinary) is unconfigured, display an explicit configuration error rather than simulating an invisible upload. Never present synthetic data as verified production records.

---

## 7. Quality Gate: Run Lint & Tests Before Finishing

Before marking any task as complete, every agent must execute the respective test and validation suite:

- **Web App (`web/`):**
  ```bash
  cd web
  npm test          # vitest suite must pass (100% pass rate)
  npm run build     # vite build must compile cleanly
  ```
- **Backend (`backend/`):**
  ```bash
  cd backend
  python -m compileall app    # verify zero syntax errors
  # If tests exist:
  pytest
  ```

---

## 8. Preserving Git History & Code Integrity

- Never use `git push --force` or rebase/squash commits that have already been shared.
- When relocating existing files across folders, always use `git mv` to preserve commit history.
- Never delete existing code without explicitly asking the human operator first.

---

## 9. Visual Freeze — Landing & Auth Pages

The **landing page** (`web/src/routes/index.tsx`) and **auth page** (`web/src/routes/auth.tsx`)
are **visually frozen**. They must look and behave visually exactly as they do today:
same layout, markup structure, copy, styles, fonts, colours, spacing, animations and assets.

**You MAY change their logic** (form submit handlers, auth state, redirects, API calls,
route links, data fetching) to wire them to the real backend, but:

1. **Do not add, remove or restyle any visible element.** For loading, error and success
   feedback, reuse elements or components already present on those pages; if no suitable
   one exists, STOP and ask the developer.

2. **New design tokens must be scoped under `.kw-app`** and used only by new routes.
   Never edit global `:root` variables, Tailwind base colours, global fonts, or shared
   components in a way that changes how these two pages render. If a shared component
   must change, create a variant.

3. **Take Playwright screenshots** of both pages at 375, 768 and 1280 px into
   `docs/frozen-baseline/` (reuse existing ones if present) and compare after every task.
   Any visual diff: revert and fix.

4. **Report changed files** in `docs/FROZEN.md` after each task. See that file for the
   full frozen file list and change log.

