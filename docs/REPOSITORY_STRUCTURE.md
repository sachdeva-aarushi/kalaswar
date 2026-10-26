# Repository Structure

Kalaswar is a full-stack TypeScript application. The build tooling (Vite, TypeScript, ESLint, Bun) requires its configuration at the repository root, so the application code lives in standard locations and the backend artifacts are grouped in their own folders. This document maps every top-level entry to its role.

```
kalaswar/
├── README.md                      Project overview, architecture, and impact story
├── AGENTS.md                      Working conventions for AI-assisted development
├── docs/                          Product, architecture, and operations documentation
│   ├── ROADMAP.md                 Build roadmap and phase status
│   ├── REPOSITORY_STRUCTURE.md    This file
│   ├── architecture/              System design and API integration status
│   ├── product/                   Requirements, implementation, and audit records
│   ├── operations/                Deployment, environment setup, and seed data guides
│   └── images/                    README and documentation assets
├── src/                           FRONTEND — the React application
│   ├── routes/                    Pages and screens (TanStack file-based routing)
│   │   └── api/                   BACKEND — server routes and server functions
│   ├── components/                Shared UI components (editorial design system)
│   ├── lib/                       Data layer, business logic, i18n (EN/HI/MR)
│   ├── assets/                    Brand and image assets
│   ├── integrations/              Generated database client bindings
│   └── styles.css                 Tailwind CSS v4 theme and design tokens
├── public/                        FRONTEND — static assets served as-is
├── drizzle/                       BACKEND — database schema and migrations
│   └── migrations/                Versioned SQL migrations (0000–0012)
├── supabase/                      BACKEND — database service configuration
├── .env.example                   Template for required environment variables
└── (tooling configs)              package.json, vite.config.ts, tsconfig.json,
                                   vitest.config.ts, eslint.config.js, .prettierrc,
                                   components.json, drizzle.config.ts, bunfig.toml, bun.lock
```

## Frontend

The customer, artisan, and coordinator experiences are a single React 19 application built with TanStack Start (file-based routing, server functions) and styled with Tailwind CSS v4 through a semantic design-token theme. All user-facing screens live under `src/routes/`, shared components under `src/components/`, and the typed data layer, i18n dictionary, and deterministic business engines (feasibility, pricing, quotation) under `src/lib/`.

## Backend

Backend logic is co-located with the application it serves:

- **Server routes and functions** — `src/routes/api/` exposes the public voice pipeline endpoints (speech-to-text, assistant, text-to-speech) and internal server functions run through TanStack Start's server runtime.
- **Database schema and migrations** — `drizzle/` holds the versioned SQL schema and migration history for all application tables (products, orders, assignments, payments, tips, notifications, roles, stories, B2B records).
- **Database service configuration** — `supabase/config.toml` configures the managed database service.

## Root-level configuration

The files at the repository root are not clutter: JavaScript/TypeScript tooling (package managers, bundlers, compilers, linters, test runners) resolves their configuration from the working-directory root by convention, and moving them would break the build pipeline and every continuous-integration setup that clones this repository.
