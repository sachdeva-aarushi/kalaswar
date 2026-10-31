# Kalaswar Mobile App — Manual Testing Checklist

This document details the end-to-end verification checklist for the Kalaswar mobile application (Expo / React Native). All tests operate against the live backend (`http://localhost:8000`) and Supabase PostgreSQL.

---

## Batch 1: Artisan Core Screens (Verified)

### 1. Screen 1: Artisan Home (`/artisan`)
- [ ] **Auth & Profile Load**:
  - Sign in as artisan (`artisan.anita@gmail.com` or artisan role).
  - Confirm greeting displays artisan name (`user.name`) and real cluster (`DAY-NRLM Self Help Group`).
  - No demo credentials or persona switchers present on screen.
- [ ] **Assigned Next Task Card**:
  - When orders are assigned in backend (`GET /api/v1/orders`), displays real task, product image, order reference, unit counts, and wage per unit.
  - When no tasks are assigned, displays clean dashed card: *"No active tasks · अभी कोई नया काम नहीं है"*.
  - Tapping "Open task · काम खोलें" navigates to `/artisan/task/[id]`.
- [ ] **Live Earnings Summary**:
  - Displays real monthly sum computed from `GET /api/v1/payouts` (no hardcoded ₹4,250).
  - Displays Paid vs Coming breakdown.
  - Tapping "See earnings · विवरण" navigates to `/(tabs)/artisan/earnings`.
- [ ] **Add a Product Button**:
  - Tap primary hero button: *"Add a product · नया सामान जोड़ें"*.
  - **Expected Result**: Successfully opens camera flow (`/artisan/camera`). Does **NOT** redirect back to Home.
- [ ] **Dual-Modality & Vernacular**:
  - Tap `EN | हि` pill in header bar. Confirm instant UI text translation between English and Hindi.
  - Audio assist button toggles speech prompt without crashing.
- [ ] **Offline Resilience**:
  - Disable network (Airplane Mode or disconnect Wi-Fi).
  - Open `/artisan`. Confirm cached task and earnings appear immediately from React Query AsyncStorage persister (`KALASWAR_OFFLINE_QUERY_CACHE`).

---

### 2. Screen 2: Artisan Products (`/artisan/products`)
- [ ] **Real Catalog Loading**:
  - Fetches items from `GET /api/v1/products?page_size=50` with active Supabase Bearer token.
  - Shows real product title, image, category, and artisan price.
- [ ] **Status Badges**:
  - Products in review show *"Waiting for review · समीक्षा जारी"*.
  - Approved products show *"Approved · स्वीकृत"*.
  - Drafts show *"Draft · कच्चा मसौदा"*.
  - No fake hardcoded subtitles (e.g. "पेस्टल लैपटॉप स्लीव") or fake feedback bubbles on index 1.
- [ ] **Segmented Filter Tabs**:
  - Switch between *"All (N) · सब"* and *"Waiting (M) · समीक्षा में"*.
  - Counts reflect the actual data from the query.
- [ ] **Empty State**:
  - If artisan has no products, displays *"No products listed yet · कोई सामान सूचीबद्ध नहीं है"*.
  - Includes a clear action button: *"Add First Product · पहला सामान जोड़ें"* navigating to `/artisan/camera`.
- [ ] **Error Handling**:
  - If backend is stopped or returns an error, displays specific message in `ErrorState` with a working "Retry" button.
- [ ] **Add Product Floating Button**:
  - Tap sticky bottom button: *"New product · नया सामान जोड़ें"*.
  - Successfully navigates to `/artisan/camera`.

---

### 3. Screen 3: Artisan Work (`/artisan/work`)
- [ ] **Real Task List**:
  - Fetches assigned tasks from `GET /api/v1/orders`.
  - Filter pills dynamically count tasks:
    - *All Tasks (N)*
    - *In Progress (N)*
    - *Done (N)*
- [ ] **Task Details Navigation**:
  - Tapping any task card opens `/artisan/task/[id]`.
  - Task progress and milestone steps render properly.
- [ ] **Empty State**:
  - When no tasks match filter, displays *"कोई कार्य नहीं · No tasks here"*.
- [ ] **Offline Cache**:
  - Tasks cached in `AsyncStorage` remain accessible offline.

---

## Upcoming Batches

### Batch 2: Artisan Lifecycle & Story
- [ ] Screen 4: Artisan Earnings & Payout Ledger (`/artisan/earnings`)
- [ ] Screen 5: Artisan Profile & SHG Join Request (`/artisan/profile`)
- [ ] Screen 6: Add / Edit Craft Story & Audio (`/artisan/story`)

### Batch 3: Coordinator (SHG) Management
- [ ] Screen 7: Coordinator Overview & Metric Cards (`/coordinator`)
- [ ] Screen 8: Listing Validation Queue & Approvals (`/coordinator/approvals`)
- [ ] Screen 9: Orders & Dispatch Pipeline (`/coordinator/orders`)

### Batch 4: Coordinator Operations
- [ ] Screen 10: Inventory & Stock Control (`/coordinator/inventory`)
- [ ] Screen 11: Artisan Assignment Dispatch (`/coordinator/assignments`)
- [ ] Screen 12: DPP QR Code Scanner (`/coordinator/scan`)

### Batch 5: Customer (Individual & B2B)
- [ ] Screen 13: Catalog Explore & Filter Search (`/shopper`)
- [ ] Screen 14: Gift Concierge & Custom Order Inquiries (`/shopper/concierge`)
- [ ] Screen 15: Customer Orders & Digital Product Passport (`/shopper/orders`)

