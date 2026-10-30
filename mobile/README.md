# Kalaswar Mobile — Artisan, Coordinator & Shopper App

A cross-platform mobile companion for **Kalaswar** (कलास्वर — India's craft, her voice, her livelihood), built with **Expo SDK 58**, **React Native**, **TypeScript**, and **Expo Router**.

Designed specifically for rural women artisans, Self-Help Group (SHG) cluster coordinators under India's DAY-NRLM mission, and ethical craft shoppers.

---

## 🎨 Brand Identity & Design System

- **App Name:** **Kalaswar** (कलास्वर)
- **Version:** `1.0.0` (Android `versionCode: 1`)
- **Theme:** Mapped from the **Stitch MCP** project **"Kalaswar Artisan Mobile UI"** (*Artisan Vernacular* theme):
  - **Forest Green Primary:** `#083527`, `#234C3D`
  - **Muted Raw Gold Accents:** `#7B5812`, `#C69B50`, `#FDCD7D`
  - **Untreated Ivory Surfaces:** `#FEF9EE`, `#F1ECE1`
  - **Terracotta Alert:** `#BA1A1A`, `#B85F45`
- **Iconography & Splash:**
  - **App Icon (`assets/images/icon.png`):** 1024×1024 artisanal mandala with central loom shuttle flame and dual Devanagari/Latin logotype.
  - **Android Adaptive Icon:** Separate foreground (`android-icon-foreground.png`, 512×512, transparent background with safe-zone emblem), background (`android-icon-background.png`, `#083527` radial forest gradient), and monochrome (`android-icon-monochrome.png`, 432×432 white silhouette for Material You dynamic theming).
  - **Splash Screen (`assets/images/splash-icon.png`):** Seamless high-resolution craft emblem on `#083527` background.
- **Ergonomics:** Minimum **56dp × 56dp** primary touch targets and dual audio/visual modality tailored for varying literacy levels.

---

## 🌟 Core Features & Modules

### 1. Coordinator Operations Deck
- **Cluster Dashboard:** Live KPI counts (active artisans, orders ready for dispatch) and automated cluster risk alerts (depleted dyes, loom pacing delays) queried from `GET /api/v1/dashboard/coordinator`.
- **QR Code Scanner:** Powered by `expo-camera` (`CameraView`) with custom bracket reticle, torch toggle, and demo token chips to scan and verify products in the field.
- **Digital Product Passport (DPP):** Resolves `GET /public/passports/{token}` and displays cryptographic Merkle root provenance, Polygon transaction hash with direct PolygonScan link, fair wage breakdown (68% artisan share guarantee), and SHG cluster territory.
- **Production Assignments:** Dynamic allocation modal to assign craft orders to artisans with units, wages per piece, and due dates via `GET /api/v1/assignments` and `POST /api/v1/assignments`.
- **Order Dispatch & Tracking:** Multi-stage order queue with carrier selection (India Post Speed Post, Blue Dart, Delhivery) and AWB tracking updates via `POST /api/v1/shipments` and `PATCH /api/v1/orders/{id}/status`.

### 2. Artisan Voice & Photo Pipeline Fallback
- **Media & Photo Capture:** Live viewfinder photo capture with fallback to device gallery via `expo-image-picker`.
- **Voice Description:** Audio recording via `expo-av` with dual Hindi/English playback.
- **Listing Pipeline Integration:** Posts media and audio to `/api/v1/internal/whatsapp/media` and `/api/v1/internal/whatsapp/voice` using unique `whatsapp_message_id` idempotency tokens (`wamid.HBgM...`).
- **Draft Review:** Renders AI-derived product title, dimensions, fair retail price, and artisan share before final submission.

### 3. Push Notifications & Offline Cache
- **Push Notifications:** Configured via `expo-notifications` with Android notification channels, user permission prompting, and token registration to Supabase `profiles.push_token` and the backend registry.
- **Offline Query Cache:** Powered by `@tanstack/react-query-persist-client` and `@react-native-async-storage/async-storage` on key `KALASWAR_OFFLINE_QUERY_CACHE` with 24-hour retention for last-loaded orders, assignments, inventory, and notifications.

### 4. Authentication & Localization
- **Supabase Auth:** Backed by `expo-secure-store` with automatic role-based routing (`coordinator`, `artisan`, `shopper`).
- **Bilingual i18n:** Real-time English and Hindi (हिंदी) toggle across all screens via `i18next`.

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher (or bun)
- **Expo CLI / EAS CLI:** Installed globally or run via `npx`

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create `.env` by copying `.env.example`:

```bash
cp .env.example .env
```

Ensure the following variables are set:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_SUPABASE_URL=https://hptiiyicxqgdtucxswal.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_u_51_fQEMUj1UTns_ENCrA_ws-KlyWA
```

---

## 🚀 Running the App

### Start Metro Bundler

```bash
npx expo start
```

### Options:
- Press `a` in the terminal to launch on a connected Android device or emulator.
- Press `w` to open in your web browser.
- Scan the printed QR code with **Expo Go** on your physical Android or iOS device.

---

## 🧪 Verification & Testing

### TypeScript Check
Verifies zero compilation or type mismatches across all routes and API client schemas:
```bash
npm run typecheck
```

### Unit & Integration Tests
Runs the Vitest suite covering theme token parity, i18n translation coverage, OpenAPI client middleware, and role routing:
```bash
npm test
```

### Local Expo Bundle Export
Verifies complete offline bundle generation without bytecode errors:
```bash
npx expo export --no-bytecode
```

---

## 📱 Building Standalone Android APK (EAS Build)

The project is pre-configured with **Expo Application Services (EAS)** for generating standalone Android preview APKs:

### 1. Check EAS Authentication
```bash
npx eas whoami
```
*(If prompted, run `npx eas login` to authenticate with your Expo account).*

### 2. Trigger Preview APK Build
```bash
npx eas build -p android --profile preview
```

The `preview` profile defined in `eas.json` produces an installable Android APK (`buildType: "apk"`) with remote cloud credentials. You can track progress or download the generated APK directly from your Expo dashboard:
- **Build Console:** `https://expo.dev/accounts/sambhav-g/projects/kalaswar-mobile/builds`

---

## 🔑 Demo Credentials

The app includes pre-configured demo users that match the backend seed database:

| Role | Email | Password | Assigned Experience |
|---|---|---|---|
| **SHG Coordinator** | `coordinator@kalaswar.org` | `demo-pass-123` | Risk flags, approvals, assignments, dispatch, QR scanner |
| **Master Artisan** | `artisan@kalaswar.org` | `demo-pass-123` | Task logging, voice/photo listing fallback, DBT wage records |
| **Shopper / Patron** | `shopper@kalaswar.org` | `demo-pass-123` | Handcraft catalog, gift concierge, DPP verification |

*(Note: The login screen also features 1-tap quick login chips to sign in as any role without manual typing).*
