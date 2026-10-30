# Kalaswar Mobile — Artisan, Coordinator & Shopper App

A cross-platform mobile companion for **Kalaswar**, built with **Expo SDK 58**, **TypeScript**, and **Expo Router**.

Designed specifically for rural women artisans, Self-Help Group (SHG) cluster coordinators under India's DAY-NRLM mission, and ethical craft shoppers.

---

## 🎨 Design System

Mapped directly from the **Stitch MCP** project **"Kalaswar Artisan Mobile UI"** (*Artisan Vernacular* theme):
- **Earthy Palette:** Deep Forest Green (`#083527`, `#234C3D`), Warm Untreated Ivory (`#FEF9EE`), Pressed Parchment (`#F1ECE1`), Muted Raw Gold (`#7B5812`, `#C69B50`), and Terracotta Alert (`#B85F45`).
- **Touch Ergonomics:** Enforces a minimum **56dp × 56dp** bounding box on all primary touch targets for comfortable outdoor and field usage.
- **Dual Modality:** Paired visual iconography with high-contrast text labels for accessibility across varying literacy levels.
- **Card Surfaces:** Soft 20dp border-radius with ambient forest elevation.

---

## 🌟 Core Capabilities

1. **Supabase Auth with Expo SecureStore:**
   - Persistent token storage using `expo-secure-store` (with web fallback).
   - Seamless sign-in using the exact same Supabase database and seed accounts as the web workroom.
   - 1-tap quick demo login directly on the login screen.

2. **Role-Based Tab Layouts:**
   - Evaluates roles dynamically from Supabase `user_roles` and `profiles`:
     - **SHG Coordinator (`coordinator`):** Cluster overview, urgent inspections, production order allocations, raw materials inventory intake.
     - **Master Artisan (`artisan`):** Current craft assignment progress bar, voice/photo intake auto-listing with Fair Price calculation (68% wage guarantee), direct benefit transfer (DBT) wage records.
     - **Shopper (`shopper`):** Verified craft catalog, MakePossible Custom Gift Concierge wizard, orders with Polygon L2 Digital Product Passport (DPP) anchors.

3. **OpenAPI Typed Client:**
   - Generated TypeScript client powered by `openapi-fetch` using backend OpenAPI 3.0 types from `src/api/schema.d.ts`.
   - Automatic bearer token injection middleware from the active Supabase session.

4. **TanStack Query Hooks:**
   - `useProducts`: Curated craft catalog with fair price breakdowns.
   - `useOrders`: Production & customer order tracking.
   - `useArtisanTasks`: Daily work logging and craft stages.
   - `useCoordinatorOverview`: Real-time cluster KPIs and approval queues.
   - `useEarnings`: Transparent DBT payouts ledger and escrow status.

5. **Bilingual Localization (i18n):**
   - Full translation parity between **English** and **Hindi (हिंदी)** via `i18next`.
   - Instant language toggle pill in the app header and login screen.

6. **EAS Build Configuration (`eas.json`):**
   - Configured `preview` profile with `buildType: "apk"` for instant standalone Android installation and field testing.

---

## 🔑 Demo Credentials

Pre-configured accounts matching `supabase/seed.sql`:

| Role | Name | Email | Password | Landing Tab |
|---|---|---|---|---|
| **SHG Coordinator** | Sunita Patil | `coordinator.sunita@kalaswar.demo` | `KalaswarDemo@2025` | `/(tabs)/coordinator` |
| **Master Artisan** | Anita Devi | `artisan.anita@kalaswar.demo` | `KalaswarDemo@2025` | `/(tabs)/artisan` |
| **Retail Shopper** | Priya Sharma | `customer.priya@kalaswar.demo` | `KalaswarDemo@2025` | `/(tabs)/shopper` |

*Note: 1-tap demo buttons on the login screen pre-fill and sign in with these credentials automatically.*

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8000` | FastAPI backend service URL |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://hptiiyicxqgdtucxswal.supabase.co` | Remote Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_u_51_fQEMUj1UTns_ENCrA_ws-KlyWA` | Supabase publishable anonymous key |

---

## 🚀 Development Scripts

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run TypeScript compiler check
npm run typecheck

# Run unit and integration tests
npm test

# Build standalone Android APK via EAS
eas build --profile preview --platform android
```
