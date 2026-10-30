# FROZEN.md — Visual Freeze Registry

## VISUAL FREEZE RULE

The following pages must look and behave **visually exactly** as they do today:
same layout, markup structure, copy, styles, fonts, colours, spacing, animations and assets.

You **MAY** change their logic (form submit handlers, auth state, redirects, API calls,
route links, data fetching) to wire them to the real backend, but:

1. **Do not add, remove or restyle any visible element.** For loading, error and success
   feedback, reuse elements or components already present on those pages; if no suitable
   one exists, STOP and ask the developer.

2. **New design tokens are scoped under `.kw-app`** and used only by new routes. Never
   edit global `:root` variables, Tailwind base colours, global fonts, or shared
   components in a way that changes how the frozen pages render. If a shared component
   must change, create a variant.

3. **Take Playwright screenshots** of both pages at 375, 768 and 1280 px into
   `docs/frozen-baseline/` (reuse existing ones if present) and compare after every task.
   Any visual diff: revert and fix.

4. **Report which frozen files you changed** (logic only) after each task in this
   document's "Change Log" section.

---

## Frozen Files

| File | Description |
| :--- | :--- |
| `web/src/routes/index.tsx` | Landing / home page |
| `web/src/routes/auth.tsx` | Login / sign-up page |
| `web/src/routes/__root.tsx` | Root shell (HTML, providers, global Toaster) |
| `web/src/styles.css` | Global CSS design tokens (**do NOT edit `:root`**) |

---

## Change Log

<!-- Append entries here after each task. Format:
### Task: <name> — <date>
**Branch:** `frontend/web`
**Files changed (logic only):**
- `web/src/routes/auth.tsx` — replaced mock afterAuth with real redirect
-->

### Task: Frontend Infrastructure Setup — 2026-10-30
**Branch:** `frontend/web`
**Files changed (logic only):**
- None. Frozen pages untouched in this task.

### Task: Auth & Landing Real Backend Wiring — 2026-10-30
**Branch:** `frontend/web`
**Files changed (logic only):**
- `web/src/routes/auth.tsx` — wired submit handlers to `useAuth().signIn` and `signUp`, mapped backend errors to existing `DemoNote` container, and added role-based post-login redirection. Zero markup or style changes.
- `web/src/routes/index.tsx` — wired navigation links, craft categories, and closing CTAs to `/shop`, `/workroom`, `/stories`, `/gift`, and `/b2b`. Zero markup or visual styling changes.
- `web/src/routes/__root.tsx` — wrapped router outlet with `AuthProvider` inside existing QueryClientProvider. Zero markup or layout changes.
