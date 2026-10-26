# Seed Data Guide — Kalaswar

## Where the seed lives

- `drizzle/migrations/0000_kalaswar_schema_and_demo_data.sql` — base schema + interconnected demonstration data (SHGs, artisans, products, orders, payments, rankings, UPI demo records).
- `drizzle/migrations/0005_demo_insert_orders.sql` — additional demonstration orders.
- `drizzle/migrations/0008_kalaswar_expansion_pillars_foundation.sql` — expansion-pillar schema; demonstration B2B/story/costing rows where present.

## Idempotency strategy

The seed runs exactly once because it ships as a Drizzle migration: the journal records it, and re-running the toolset skips applied entries. All seeded rows use fixed, stable UUIDs (e.g. SHG ids `11111111-0000-…`, artisan ids `22222222-0000-…`, `DEMO_ARTISAN_ID` in `frontend/src/lib/constants.ts` anchors the artisan experience), so any future additive seed can upsert on the same keys without duplicating products, organisations, materials, requests, or orders.

**Never** run a destructive demo reset against production data: reseeding must only be additive (upsert by fixed id), never DELETE/TRUNCATE of live rows.

## What the demonstration data covers

1. **Artisan and SHG data** — demonstration SHGs and artisans across Indian craft practices, artisan skill records, coordinator-facing records. All labeled as demonstration in the UI.
2. **Product data** — products with categories, prices, availability, image URLs; linked to artisans via real foreign keys.
3. **Craft stories** — stories with consent records; published rows respect the consent model.
4. **Materials, costing, inventory** — material price history, product cost inputs/snapshots backing the FairPrice engine.
5. **Inventory and capacity** — materials_inventory and monthly capacity used by MakePossible evidence.
6. **B2B buyer data** — buyers, buyer requests, versioned quotations, samples, and the ten-stage production flow (also creatable live through `/b2b`).
7. **Orders and production** — orders with order_events timelines, quality checks, shipments, expenses, payments (labeled demonstration, UPI QR only).
8. **Notifications and audit** — notifications rows and `action_audit_logs` entries written by data-layer actions.

## Demo accounts

Accounts are real Supabase Auth users created through the application's own signup (`/auth`) — no fake localStorage users, no passwords in the repository.

- Signup grants only `customer` or `buyer` (from the account type chosen at signup). Coordinator, artisan, and admin roles are **never** granted through signup metadata.
- To provision a demo **coordinator** or **artisan** account after they sign up (and confirm their email), a trusted service-role operation inserts the role and membership:

```sql
-- after the user signs up and confirms their email (lookup by their email)
insert into public.user_roles (user_id, role)
select id, 'coordinator' from auth.users where email = '<their-email>'
on conflict do nothing;

insert into public.group_memberships (user_id, shg_id, member_role)
select u.id, s.id, 'coordinator'
from auth.users u, public.shgs s
where u.email = '<their-email>' and s.id = '<shg-uuid>'
on conflict do nothing;
```

- Demo users must not be given the `admin` role in production.
- The demonstration surfaces (`/shg/*`, `/artisan-space`) remain usable without an account; they are labeled demonstration access, and their writes are recorded as demonstration records.

## Re-seeding for a fresh demonstration environment

1. Start from the migrations (they create schema + seed in order).
2. If you need extra demonstration rows later, add a new migration with fixed UUIDs and upsert-style inserts (`on conflict (id) do update`), never deletes.
3. Verify no real user data is touched: user-owned rows live in Supabase Auth, `profiles`, `user_roles`, `group_memberships`, and buyer/user-linked records — seed migrations must not reference or delete them.
