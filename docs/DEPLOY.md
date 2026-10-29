# Kalaswar Production Deployment Guide

> **Target Architecture**:  
> * **Backend**: FastAPI Container on **Render** (or **Railway**) via Dockerfile  
> * **Web Frontend**: Vite / SSR Application on **Vercel**  
> * **Database & Auth**: Supabase Cloud PostgreSQL  
> * **CI/CD**: GitHub Actions (Lint, Test, Build)  
> * **Security Standard**: **Strict Zero-Secrets-in-Repository Policy**

---

## 1. Deployment Topology

```
                         ┌────────────────────────────────────┐
                         │         Vercel (Edge CDN)          │
                         │   Web App: https://kalaswar.org    │
                         └─────────────────┬──────────────────┘
                                           │
                                           │ (API Requests / SSR)
                                           ▼
┌───────────────────────┐        ┌────────────────────────────────────┐
│    Cloudinary CDN     │        │     Render / Railway (Docker)      │
│  (GI Watermarks/Media)│◄───────┤ Backend: https://api.kalaswar.org  │
└───────────────────────┘        └─────────────────┬──────────────────┘
                                                   │
                         ┌─────────────────────────┴────────────────────────┐
                         │                                                  │
                         ▼                                                  ▼
         ┌───────────────────────────────┐                  ┌───────────────────────────────┐
         │     Supabase Cloud (PaaS)     │                  │     Polygon PoS / Amoy L2     │
         │ PostgreSQL, Auth, RLS, Realtime│                  │ Merkle Root DPP Registry      │
         └───────────────────────────────┘                  └───────────────────────────────┘
```

---

## 2. Environment Variables Specification

> [!CAUTION]
> **Strict Security Rule**: Never commit actual production secrets, private keys, or API tokens to git. All credentials must be configured securely in the respective hosting platform dashboard (Render Environment, Railway Variables, Vercel Project Settings) or GitHub Repository Secrets.

### A. Backend Service Environment Variables

| Variable Name | Required | Default / Example | Purpose / Where to Obtain |
| :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | Yes | `production` | Environment tier (`development`, `staging`, `production`) |
| `PROJECT_NAME` | No | `Kalaswar Core Services API` | Application identifier displayed in OpenAPI `/docs` |
| `VERSION` | No | `3.0.0` | API semantic version |
| `PORT` | Auto | `8000` | Port uvicorn binds to (automatically injected by Render / Railway) |
| `SECRET_KEY` | Yes | *(32+ char random hex)* | HMAC secret for session and cryptographic integrity |
| `SUPABASE_URL` | Yes | `https://<ref>.supabase.co` | Supabase Cloud project URL (from Supabase Dashboard $\to$ Settings $\to$ API) |
| `SUPABASE_KEY` | Yes | `eyJ...` | Supabase Anon / Public API Key |
| `SUPABASE_SERVICE_ROLE_KEY`| Yes | `eyJ...` | Privileged service-role key for background workers, batch anchoring, and audit logging |
| `SUPABASE_JWT_SECRET` | Yes | `your-jwt-secret` | Supabase JWT Secret (from Supabase Dashboard $\to$ Settings $\to$ API $\to$ JWT Secret) |
| `INTERNAL_SERVICE_TOKEN` | Yes | `kalaswar_internal_service_secret_token` | Shared secret header (`X-Service-Token`) for internal teammate microservices |
| `WHATSAPP_SHARED_SERVICE_TOKEN`| Yes | `kalaswar_internal_service_secret_token` | Token for WhatsApp Bot webhook pipeline |
| `CLOUDINARY_CLOUD_NAME` | No | `kalaswar` | Cloudinary cloud identifier for image optimization & watermarking |
| `CLOUDINARY_API_KEY` | No | *(Numeric API key)* | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | No | *(Secret string)* | Cloudinary API Secret |
| `CHAIN_ADAPTER_TYPE` | Yes | `mock` | `mock` for local/staging simulation, or `polygon` for live Layer-2 anchor |
| `RPC_URL` | No | `https://rpc-amoy.polygon.technology` | Polygon RPC endpoint (required if `CHAIN_ADAPTER_TYPE=polygon`) |
| `DPP_CONTRACT_ADDRESS` | No | `0x1234...5678` | Deployed `KalaswarDPPRegistry` contract address |
| `DPP_PRIVATE_KEY` | No | `0xabcd...` | Relayer private key with MATIC/POL gas funds |
| `SARVAM_API_KEY` | No | *(Sarvam token)* | Indic Speech-to-Text key for authentic Hindi/regional audio notes |
| `OPENAI_API_KEY` | No | `sk-...` | Optional fallback for Whisper STT and LLM extraction |

---

### B. Web Frontend Environment Variables

| Variable Name | Required | Default / Example | Purpose / Platform |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | `https://api.kalaswar.org` | URL of the deployed FastAPI backend service |
| `VITE_SUPABASE_URL` | Yes | `https://<ref>.supabase.co` | Supabase Cloud project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | `eyJ...` | Supabase Public / Anonymous Key (safe for browser) |
| `NODE_ENV` | Auto | `production` | Node execution environment |

---

## 3. Backend Deployment

### Option 1: Render Deployment (Recommended via Blueprint)

Kalaswar includes an infrastructure-as-code Blueprint specification in [`render.yaml`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/render.yaml).

#### Step-by-Step Deployment:
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\to$ **Blueprint**.
3. Connect your GitHub repository (`kalaswar`).
4. Render will automatically detect `render.yaml`:
   * Service name: `kalaswar-backend`
   * Environment: `Docker` (using [`backend/Dockerfile`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/backend/Dockerfile))
   * Context: `./backend`
   * Health Check: `/health`
5. In the Render UI, supply the values for the `sync: false` variables:
   * `SUPABASE_URL`
   * `SUPABASE_KEY`
   * `SUPABASE_SERVICE_ROLE_KEY`
   * `SUPABASE_JWT_SECRET`
   * `INTERNAL_SERVICE_TOKEN`
   * `CLOUDINARY_*` (optional)
6. Click **Apply**. Render will build the multi-stage Docker image and deploy.

---

### Option 2: Railway Deployment

Kalaswar includes native Railway configuration in [`railway.json`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/railway.json).

#### Step-by-Step Deployment:
1. Authenticate with the Railway CLI:
   ```bash
   npx @railway/cli login
   ```
   *(A browser window will open to authenticate your account).*

2. Initialize or link your project:
   ```bash
   npx @railway/cli init
   # Or link an existing project:
   npx @railway/cli link
   ```

3. Set your production environment variables:
   ```bash
   npx @railway/cli variables --set "SUPABASE_URL=https://hptiiyicxqgdtucxswal.supabase.co"
   npx @railway/cli variables --set "SUPABASE_KEY=your_anon_key"
   npx @railway/cli variables --set "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
   npx @railway/cli variables --set "SUPABASE_JWT_SECRET=your_jwt_secret"
   npx @railway/cli variables --set "INTERNAL_SERVICE_TOKEN=kalaswar_internal_service_secret_token"
   npx @railway/cli variables --set "CHAIN_ADAPTER_TYPE=mock"
   ```

4. Deploy the backend:
   ```bash
   npx @railway/cli up
   ```

---

## 4. Web Frontend Deployment (Vercel)

The web frontend is built with Vite / TanStack Start and configured for Vercel in [`web/vercel.json`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/web/vercel.json) and root [`vercel.json`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/vercel.json).

### Method A: Deploy via Vercel CLI

1. Authenticate with Vercel:
   ```bash
   npx vercel login
   ```
   *(Select your email/GitHub provider and complete authentication in the browser).*

2. Deploy the web project:
   ```bash
   cd web
   npx vercel
   ```
   * Link to existing project? **No** (or select your existing team/project)
   * Project name? **kalaswar-web**
   * Directory located? **`./`**
   * Override settings? **No** (configured by `vercel.json`)

3. Set production environment variables:
   ```bash
   npx vercel env add VITE_API_BASE_URL production
   npx vercel env add VITE_SUPABASE_URL production
   npx vercel env add VITE_SUPABASE_ANON_KEY production
   ```

4. Deploy directly to production:
   ```bash
   npx vercel --prod
   ```

### Method B: Deploy via Vercel Git Integration (Continuous Deployment)

1. Navigate to [Vercel Dashboard](https://vercel.com/dashboard) $\to$ **Add New Project**.
2. Select the `kalaswar` repository.
3. Configure project settings:
   * **Root Directory**: `web`
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `.output/public`
4. Add Environment Variables:
   * `VITE_API_BASE_URL`: URL of your deployed Render/Railway backend (e.g. `https://kalaswar-backend.onrender.com`)
   * `VITE_SUPABASE_URL`: Supabase Project URL
   * `VITE_SUPABASE_ANON_KEY`: Supabase Anonymous API Key
5. Click **Deploy**.

---

## 5. Continuous Integration (GitHub Actions)

Kalaswar includes an automated continuous integration pipeline in [`.github/workflows/ci.yml`](file:///d:/Sambhav/code/Hackathons/Kalaswar/kalaswar/.github/workflows/ci.yml).

### Pipeline Checks on Every Push & PR:
1. **`backend-ci` Job**:
   * Sets up Python 3.12 with pip dependency caching.
   * Runs Python syntax and module compilation (`python -m compileall`).
   * Executes Ruff code quality and security lint checks.
   * Runs all 63 unit, integration, and security tests across the backend with pytest.
2. **`web-build` Job**:
   * Sets up Node.js 20 with npm caching.
   * Installs frontend dependencies with `npm ci`.
   * Verifies production build assets with `npm run build`.

---

## 6. Post-Deployment Verification Checklist

Once both services are deployed, perform these verification steps:

- [ ] **Backend Health Check**:
  ```bash
  curl -I https://<your-backend-domain>/health
  # Must return HTTP 200 OK with {"status": "ok", "version": "3.0.0"}
  ```

- [ ] **OpenAPI Documentation**:
  Visit `https://<your-backend-domain>/docs` and verify that all endpoints (Auth, WhatsApp, DPP, PO Factoring, Products) are visible and interactive.

- [ ] **Public Passport QR Lookup**:
  ```bash
  curl https://<your-backend-domain>/public/passports/DPP-KANTHA-BOLPUR-2026-0001
  # Must return privacy-safe passport detail with no artisan phone/Aadhaar PII
  ```

- [ ] **Web Frontend**:
  Visit `https://<your-web-domain>` and verify:
  * Catalog loads products from the backend.
  * WhatsApp simulator integration communicates with the backend.
