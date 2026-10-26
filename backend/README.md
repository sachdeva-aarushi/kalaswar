# Backend — Kalaswar data layer

Everything that defines the database and its environment:

```
backend/
├── drizzle/
│   ├── schema.ts           Full typed schema for all application tables
│   └── migrations/         Versioned SQL migrations (0000–0012)
├── drizzle.config.ts       Drizzle Kit configuration
└── .env.example            Variable names only — never commit real values
```

The runtime application code (including the voice API server routes) lives in
`frontend/src` and talks to the managed database through the generated browser
client, so Row Level Security always applies. This folder exists so the schema,
its migration history and the environment template are reviewable in one place.

## Commands (from the repo root)

```bash
npx drizzle-kit --config=backend/drizzle.config.ts generate   # after schema edits
npx drizzle-kit --config=backend/drizzle.config.ts migrate    # apply pending migrations
```

`LOVABLE_DB_MIGRATION_URL` is provisioned by the platform; copy
`backend/.env.example` and fill values only for external deployments.
