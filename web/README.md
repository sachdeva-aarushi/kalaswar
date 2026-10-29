# Frontend — Kalaswar application

React 19 single-page experience served by TanStack Start v1 (file-based routing,
server functions, SSR for public routes) and styled with Tailwind CSS v4 through
a semantic design-token theme.

```
frontend/
├── public/           Static assets served as-is (favicon, robots.txt)
└── src/              Application source
    ├── routes/       Pages and screens + api/public/ voice endpoints
    ├── components/   Shared UI components (editorial design system)
    ├── lib/          Data layer, i18n (EN/HI/MR), business engines
    ├── hooks/        Shared React hooks
    ├── integrations/ Generated database client bindings
    ├── assets/       Brand and image assets
    └── styles.css    Tailwind CSS v4 theme and design tokens
```

The backend server routes (speech-to-text, assistant, text-to-speech) live at
`src/routes/api/public/` — they run inside the same TanStack Start server
runtime as the app. Database schema, migrations and the environment template
live in the sibling `backend/` folder. See `../docs/REPOSITORY_STRUCTURE.md`.

Tooling is configured at the repository root (`vite.config.ts` points TanStack
Start at `frontend/src`); run all commands from the repo root:

```bash
npm install
npm run dev       # Vite dev server with SSR
npm test          # vitest
npm run lint
```
