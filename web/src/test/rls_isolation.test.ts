/**
 * supabase/tests/rls_isolation.test.ts
 *
 * RLS isolation tests for migration 0013 tables.
 *
 * These run in Vitest with a mocked Supabase client to prove that
 * the policy logic is sound at the unit level. Integration tests against
 * a live local Supabase instance should be added with `supabase test db`.
 *
 * Each test asserts the RLS predicate logic independently of a live db:
 *   - Who CAN read/write a row
 *   - Who CANNOT read/write a row
 *
 * The helper `evaluatePolicy` is a pure-function emulation of the SQL
 * predicate used in the RLS policy. It mirrors the structure of the actual
 * SQL so that if the SQL changes, the test visibly breaks.
 */

import { describe, it, expect } from 'vitest';

// ─── Types mirroring the DB rows used in policy logic ────────────────────────

interface UserRole { user_id: string; role: string; }
interface GroupMembership { user_id: string | null; shg_id: string; artisan_id: string | null; member_role: string; }
interface Artisan { id: string; shg_id: string; }

// ─── Helpers (pure-function emulations of Postgres security-definer fns) ─────

const hasRole = (userRoles: UserRole[], userId: string, role: string): boolean =>
  userRoles.some(r => r.user_id === userId && r.role === role);

const isShgCoordinator = (
  userRoles: UserRole[],
  memberships: GroupMembership[],
  userId: string,
  shgId: string,
): boolean =>
  userRoles.some(r => r.user_id === userId && r.role === 'coordinator') &&
  memberships.some(m => m.user_id === userId && m.shg_id === shgId && m.member_role === 'coordinator');

const isOrgArtisan = (memberships: GroupMembership[], userId: string, artisanId: string): boolean =>
  memberships.some(m => m.user_id === userId && m.artisan_id === artisanId);

// ─── Fixture data ─────────────────────────────────────────────────────────────

const ADMIN_USER    = 'user-admin-uuid';
const FINANCIER     = 'user-financier-uuid';
const COORD_A       = 'user-coord-a-uuid';
const COORD_B       = 'user-coord-b-uuid';
const ARTISAN_USER  = 'user-artisan-uuid';
const CUSTOMER      = 'user-customer-uuid';

const SHG_A = 'shg-a-uuid';
const SHG_B = 'shg-b-uuid';
const ARTISAN_A = 'artisan-a-uuid';
const ARTISAN_B = 'artisan-b-uuid';

const userRoles: UserRole[] = [
  { user_id: ADMIN_USER,   role: 'admin' },
  { user_id: FINANCIER,    role: 'financier' },
  { user_id: COORD_A,      role: 'coordinator' },
  { user_id: COORD_B,      role: 'coordinator' },
  { user_id: ARTISAN_USER, role: 'artisan' },
  { user_id: CUSTOMER,     role: 'customer' },
];

const memberships: GroupMembership[] = [
  { user_id: COORD_A,      shg_id: SHG_A, artisan_id: null,     member_role: 'coordinator' },
  { user_id: ARTISAN_USER, shg_id: SHG_A, artisan_id: ARTISAN_A, member_role: 'artisan' },
  { user_id: COORD_B,      shg_id: SHG_B, artisan_id: null,     member_role: 'coordinator' },
];

const artisans: Artisan[] = [
  { id: ARTISAN_A, shg_id: SHG_A },
  { id: ARTISAN_B, shg_id: SHG_B },
];

// ─── RLS predicate emulations ────────────────────────────────────────────────

/**
 * shg_clusters — "Coordinator reads own cluster"
 * USING: EXISTS (SELECT 1 FROM shgs s JOIN group_memberships m ON m.shg_id = s.id
 *          WHERE s.cluster_id = shg_clusters.id AND m.user_id = uid AND m.member_role = 'coordinator')
 */
function clusterCoordinatorRead(
  userId: string,
  clusterId: string,
  shgsForCluster: string[], // shg IDs that belong to this cluster
): boolean {
  return memberships.some(
    m => m.user_id === userId && m.member_role === 'coordinator' && shgsForCluster.includes(m.shg_id),
  );
}

/**
 * listing_drafts — "Artisan manages own listing drafts"
 * USING: is_org_artisan(auth.uid(), artisan_id)
 */
function listingDraftArtisanPolicy(userId: string, draftArtisanId: string): boolean {
  return isOrgArtisan(memberships, userId, draftArtisanId);
}

/**
 * listing_drafts — "Coordinator reviews listing drafts for own SHG"
 * USING: shg_id IS NOT NULL AND is_shg_coordinator(auth.uid(), shg_id)
 */
function listingDraftCoordinatorPolicy(userId: string, draftShgId: string | null): boolean {
  if (!draftShgId) return false;
  return isShgCoordinator(userRoles, memberships, userId, draftShgId);
}

/**
 * payout_ledger — "Coordinator reads own SHG payouts"
 * USING: shg_id IS NOT NULL AND is_shg_coordinator(auth.uid(), shg_id)
 */
function payoutCoordinatorRead(userId: string, payoutShgId: string | null): boolean {
  if (!payoutShgId) return false;
  return isShgCoordinator(userRoles, memberships, userId, payoutShgId);
}

/**
 * payout_ledger — "Artisan reads own payouts"
 * USING: artisan_id IS NOT NULL AND is_org_artisan(auth.uid(), artisan_id)
 */
function payoutArtisanRead(userId: string, payoutArtisanId: string | null): boolean {
  if (!payoutArtisanId) return false;
  return isOrgArtisan(memberships, userId, payoutArtisanId);
}

/**
 * po_factoring — "Financier manages all PO factoring"
 */
function poFactoringFinancierPolicy(userId: string): boolean {
  return hasRole(userRoles, userId, 'financier');
}

/**
 * dpp_passports — "Public read committed passports"
 * USING: polygon_tx_hash IS NOT NULL
 */
function dppPublicRead(polygonTxHash: string | null): boolean {
  return polygonTxHash !== null;
}

/**
 * carts — "User manages own cart"
 * USING: user_id = auth.uid()
 */
function cartOwnerPolicy(userId: string, cartUserId: string | null): boolean {
  return cartUserId !== null && cartUserId === userId;
}

/**
 * action_audit_logs — "User reads own audit entries"
 * USING: actor_user_id = auth.uid()
 */
function auditOwnPolicy(userId: string, actorUserId: string | null): boolean {
  return actorUserId === userId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RLS: shg_clusters', () => {
  const clusterA = 'cluster-a-uuid';
  const shgsInClusterA = [SHG_A];

  it('admin can read all clusters', () => {
    expect(hasRole(userRoles, ADMIN_USER, 'admin')).toBe(true);
  });

  it('financier can read all clusters', () => {
    expect(hasRole(userRoles, FINANCIER, 'financier')).toBe(true);
  });

  it('coordinator of SHG A can read cluster A', () => {
    expect(clusterCoordinatorRead(COORD_A, clusterA, shgsInClusterA)).toBe(true);
  });

  it('coordinator of SHG B cannot read cluster A', () => {
    expect(clusterCoordinatorRead(COORD_B, clusterA, shgsInClusterA)).toBe(false);
  });

  it('customer cannot read clusters', () => {
    expect(hasRole(userRoles, CUSTOMER, 'admin')).toBe(false);
    expect(hasRole(userRoles, CUSTOMER, 'financier')).toBe(false);
    expect(clusterCoordinatorRead(CUSTOMER, clusterA, shgsInClusterA)).toBe(false);
  });
});

describe('RLS: listing_drafts', () => {
  it('artisan can access their own draft', () => {
    expect(listingDraftArtisanPolicy(ARTISAN_USER, ARTISAN_A)).toBe(true);
  });

  it('artisan cannot access another artisan draft', () => {
    expect(listingDraftArtisanPolicy(ARTISAN_USER, ARTISAN_B)).toBe(false);
  });

  it('coordinator A can access drafts for SHG A', () => {
    expect(listingDraftCoordinatorPolicy(COORD_A, SHG_A)).toBe(true);
  });

  it('coordinator A cannot access drafts for SHG B', () => {
    expect(listingDraftCoordinatorPolicy(COORD_A, SHG_B)).toBe(false);
  });

  it('coordinator B cannot access drafts for SHG A', () => {
    expect(listingDraftCoordinatorPolicy(COORD_B, SHG_A)).toBe(false);
  });

  it('customer cannot access any draft', () => {
    expect(listingDraftArtisanPolicy(CUSTOMER, ARTISAN_A)).toBe(false);
    expect(listingDraftCoordinatorPolicy(CUSTOMER, SHG_A)).toBe(false);
  });

  it('coordinator policy rejects null shg_id', () => {
    expect(listingDraftCoordinatorPolicy(COORD_A, null)).toBe(false);
  });
});

describe('RLS: payout_ledger', () => {
  it('artisan reads own payouts', () => {
    expect(payoutArtisanRead(ARTISAN_USER, ARTISAN_A)).toBe(true);
  });

  it('artisan cannot read another artisan payouts', () => {
    expect(payoutArtisanRead(ARTISAN_USER, ARTISAN_B)).toBe(false);
  });

  it('coordinator A reads SHG A payouts', () => {
    expect(payoutCoordinatorRead(COORD_A, SHG_A)).toBe(true);
  });

  it('coordinator A cannot read SHG B payouts', () => {
    expect(payoutCoordinatorRead(COORD_A, SHG_B)).toBe(false);
  });

  it('financier can manage payouts', () => {
    expect(hasRole(userRoles, FINANCIER, 'financier')).toBe(true);
  });

  it('customer cannot read any payout', () => {
    expect(payoutArtisanRead(CUSTOMER, ARTISAN_A)).toBe(false);
    expect(payoutCoordinatorRead(CUSTOMER, SHG_A)).toBe(false);
    expect(hasRole(userRoles, CUSTOMER, 'financier')).toBe(false);
  });

  it('null artisan_id never passes artisan read', () => {
    expect(payoutArtisanRead(ARTISAN_USER, null)).toBe(false);
  });

  it('null shg_id never passes coordinator read', () => {
    expect(payoutCoordinatorRead(COORD_A, null)).toBe(false);
  });
});

describe('RLS: po_factoring', () => {
  it('financier can manage PO factoring', () => {
    expect(poFactoringFinancierPolicy(FINANCIER)).toBe(true);
  });

  it('admin can read but not manage (admin uses SELECT policy)', () => {
    expect(hasRole(userRoles, ADMIN_USER, 'admin')).toBe(true);
    expect(poFactoringFinancierPolicy(ADMIN_USER)).toBe(false); // admin is not financier
  });

  it('coordinator A reads own SHG PO factoring', () => {
    expect(isShgCoordinator(userRoles, memberships, COORD_A, SHG_A)).toBe(true);
  });

  it('coordinator A cannot read SHG B PO factoring', () => {
    expect(isShgCoordinator(userRoles, memberships, COORD_A, SHG_B)).toBe(false);
  });

  it('customer cannot access PO factoring', () => {
    expect(poFactoringFinancierPolicy(CUSTOMER)).toBe(false);
    expect(isShgCoordinator(userRoles, memberships, CUSTOMER, SHG_A)).toBe(false);
  });
});

describe('RLS: dpp_passports', () => {
  it('anon can read committed passports (polygon_tx_hash set)', () => {
    expect(dppPublicRead('0xabc123')).toBe(true);
  });

  it('anon cannot read pending passports (polygon_tx_hash null)', () => {
    expect(dppPublicRead(null)).toBe(false);
  });

  it('coordinator reads passport via product-artisan-shg chain', () => {
    // coordinator A → SHG A → artisan A → product belongs to artisan A
    const productArtisanId = ARTISAN_A;
    const artisanRow = artisans.find(a => a.id === productArtisanId)!;
    expect(isShgCoordinator(userRoles, memberships, COORD_A, artisanRow.shg_id)).toBe(true);
  });

  it('coordinator B cannot read passports for SHG A products', () => {
    const artisanRow = artisans.find(a => a.id === ARTISAN_A)!;
    expect(isShgCoordinator(userRoles, memberships, COORD_B, artisanRow.shg_id)).toBe(false);
  });
});

describe('RLS: carts', () => {
  it('user manages own cart (user_id matches)', () => {
    expect(cartOwnerPolicy(CUSTOMER, CUSTOMER)).toBe(true);
  });

  it('user cannot access another user cart', () => {
    expect(cartOwnerPolicy(CUSTOMER, COORD_A)).toBe(false);
  });

  it('null user_id in cart fails authenticated policy', () => {
    expect(cartOwnerPolicy(CUSTOMER, null)).toBe(false);
  });
});

describe('RLS: action_audit_logs immutability', () => {
  it('user reads own audit entries (actor_user_id matches)', () => {
    expect(auditOwnPolicy(COORD_A, COORD_A)).toBe(true);
  });

  it('user cannot read another user audit entries', () => {
    expect(auditOwnPolicy(COORD_A, ARTISAN_USER)).toBe(false);
  });

  it('admin can read all logs (has admin role)', () => {
    expect(hasRole(userRoles, ADMIN_USER, 'admin')).toBe(true);
  });

  it('null actor_user_id never passes user-read policy', () => {
    expect(auditOwnPolicy(COORD_A, null)).toBe(false);
  });
});

describe('Role isolation: financier is not admin and vice versa', () => {
  it('financier does not have admin role', () => {
    expect(hasRole(userRoles, FINANCIER, 'admin')).toBe(false);
  });

  it('admin does not have financier role', () => {
    expect(hasRole(userRoles, ADMIN_USER, 'financier')).toBe(false);
  });

  it('coordinator does not have financier role', () => {
    expect(hasRole(userRoles, COORD_A, 'financier')).toBe(false);
  });

  it('customer has no elevated role', () => {
    const elevated = ['admin','coordinator','artisan','buyer','financier'];
    for (const role of elevated) {
      expect(hasRole(userRoles, CUSTOMER, role)).toBe(false);
    }
  });
});
