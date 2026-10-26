# Repository Structure

Kalaswar is a full-stack TypeScript application split into two top-level code
folders — `frontend/` (the application) and `backend/` (the database layer) —
with documentation in `docs/` and the JavaScript/TypeScript toolchain
configuration at the repository root, where the build tooling (Vite,
TypeScript, ESLint, Bun) resolves it by convention.

```
kalaswar/
├── README.md                      Project overview, architecture, and impact story
├── AGENTS.md                      Working conventions for AI-assisted development
├── frontend/                      FRONTEND — the application
│   ├── README.md                  What lives here and how to run it
│   ├── public/                    Static assets served as-is
│   └── src/                       React 19 + TanStack Start source
│       ├── routes/                Pages and screens (file-based routing)
│       │   └── api/public/        BACKEND ROUTES — voice pipeline endpoints
│       ├── components/            Shared UI components (editorial design system)
│       ├── lib/                   Data layer, business logic, i18n (EN/HI/MR)
│       ├── hooks/                 Shared React hooks
│       ├── integrations/          Generated database client bindings
│       ├── assets/                Brand and image assets
│       └── styles.css             Tailwind CSS v4 theme and design tokens
├── backend/                       BACKEND — database schema and environment
│   ├── README.md                  What lives here and how to run migrations
│   ├── drizzle/                   Typed schema and versioned migrations (0000–0012)
│   ├── drizzle.config.ts          Drizzle Kit configuration
│   └── .env.example               Variable names only, never real values
├── supabase/                      Managed database service configuration (platform-managed)
├── docs/                          Product, architecture, and operations documentation
│   ├── ROADMAP.md                 Build roadmap and phase status
│   ├── REPOSITORY_STRUCTURE.md    This file
│   ├── architecture/              System design and API integration status
│   ├── product/                   Requirements, implementation, and audit records
│   └── operations/                Deployment, environment setup, and seed data guides
└── (tooling configs)              package.json, vite.config.ts, tsconfig.json,
                                   vitest.config.ts, eslint.config.js,
                                   components.json, bunfig.toml, bun.lock
```

## Frontend

`frontend/` holds the complete application: the customer, artisan, and
coordinator experiences are a single React 19 application built with TanStack
Start (file-based routing, server functions) and styled with Tailwind CSS v4
through a semantic design-token theme. All user-facing screens live under
`frontend/src/routes/`, shared components under `frontend/src/components/`, and
the typed data layer, i18n dictionary, and deterministic business engines
(feasibility, pricing, quotation) under `frontend/src/lib/`.

The application is full-stack: API server routes that must run inside the same
TanStack Start server runtime as the app (the voice pipeline: speech-to-text,
assistant, text-to-speech) live at `frontend/src/routes/api/public/`. They are
listed here because they execute server-side, even though they sit inside the
frontend source tree.

`vite.config.ts` at the root points TanStack Start at `frontend/src`
(`srcDirectory`) and aliases `@` to it; `frontend/public` is the static asset
directory.

## Backend

`backend/` groups everything that defines the database and its environment:

- **Database schema and migrations** — `backend/drizzle/` holds the typed
  schema and versioned SQL migration history for all application tables
  (products, orders, assignments, payments, tips, notifications, roles,
  stories, B2B records).
- **Drizzle Kit configuration** — `backend/drizzle.config.ts`.
- **Environment template** — `backend/.env.example` lists every variable name
  (server-only and browser) with no values; `.env` is never committed.

Runtime database access goes through the generated browser client in
`frontend/src/integrations/supabase/` so Row Level Security always applies;
`supabase/config.toml` at the root configures the managed database service and
is maintained by the platform.

## Root-level configuration

The files at the repository root are not clutter: JavaScript/TypeScript tooling
(package managers, bundlers, compilers, linters, test runners) resolves their
configuration from the working-directory root by convention, and moving them
would break the build pipeline and every continuous-integration setup that
clones this repository.
