# Web — Kalaswar Web Application

React 19 web experience served by TanStack Start v1 (file-based routing, server functions, SSR for public routes) and styled with Tailwind CSS v4 through a semantic design-token theme.

```
web/
├── public/           Static assets served as-is (favicon, robots.txt)
├── src/              Application source
│   ├── routes/       Pages and screens (file-based routing)
│   │   └── api/public/ Voice pipeline endpoints (STT, TTS, Assistant)
│   ├── components/   Shared UI components (editorial design system)
│   ├── lib/          Data layer (TanStack Query / Supabase), i18n (EN/HI/MR), business engines
│   ├── hooks/        Shared React hooks
│   ├── integrations/ Generated Supabase database client bindings
│   ├── assets/       Brand and image assets
│   └── styles.css    Tailwind CSS v4 theme and design tokens
├── package.json      Scripts and dependencies
├── vite.config.ts    Vite configuration
├── tsconfig.json     TypeScript configuration
└── vitest.config.ts  Vitest test configuration
```

## Running Web Commands

Run from within the `web/` directory:

```bash
cd web
npm install --legacy-peer-deps
npm run dev       # Vite dev server with SSR
npm test          # vitest (runs unit test suite)
npm run build     # compiles client and SSR bundles
npm run lint      # runs ESLint
```
