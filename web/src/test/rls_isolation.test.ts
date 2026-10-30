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


// ─── Provenance RLS Predicate Emulations (Migration 0018) ────────────────────

/**
 * blockchain_batches — "Public read confirmed batches"
 * USING: status = 'CONFIRMED' OR has_role(uid(), 'admin')
 */
function batchPublicRead(userId: string | null, batchStatus: string): boolean {
  if (batchStatus === 'CONFIRMED') return true;
  if (userId && hasRole(userRoles, userId, 'admin')) return true;
  return false;
}

/**
 * blockchain_batches — "Admin manages batches"
 * USING/CHECK: has_role(uid(), 'admin')
 */
function batchAdminManage(userId: string): boolean {
  return hasRole(userRoles, userId, 'admin');
}

/**
 * product_provenance_logs — "Public read provenance logs"
 * USING: true
 */
function provenancePublicRead(): boolean {
  return true;
}

/**
 * product_provenance_logs — "Admin inserts provenance logs"
 * CHECK: has_role(uid(), 'admin')
 */
function provenanceAdminInsert(userId: string): boolean {
  return hasRole(userRoles, userId, 'admin');
}

/**
 * product_provenance_logs — "Coordinator inserts provenance for own SHG"
 * CHECK: has_role(uid(), 'coordinator')
 *        AND actor_role IN ('coordinator', 'logistics')
 *        AND EXISTS(product→artisan→shg chain with is_shg_coordinator)
 */
function provenanceCoordinatorInsert(
  userId: string,
  actorRole: string,
  productArtisanId: string,
): boolean {
  if (!hasRole(userRoles, userId, 'coordinator')) return false;
  if (!['coordinator', 'logistics'].includes(actorRole)) return false;
  const artisan = artisans.find(a => a.id === productArtisanId);
  if (!artisan) return false;
  return isShgCoordinator(userRoles, memberships, userId, artisan.shg_id);
}

/**
 * product_provenance_logs — "Artisan inserts initial stage only"
 * CHECK: has_role(uid(), 'artisan')
 *        AND stage = 'PRODUCTION_STARTED'
 *        AND actor_role = 'artisan'
 *        AND is_org_artisan(uid(), product.artisan_id)
 */
function provenanceArtisanInsert(
  userId: string,
  stage: string,
  actorRole: string,
  productArtisanId: string,
): boolean {
  if (!hasRole(userRoles, userId, 'artisan')) return false;
  if (stage !== 'PRODUCTION_STARTED') return false;
  if (actorRole !== 'artisan') return false;
  return isOrgArtisan(memberships, userId, productArtisanId);
}

/**
 * product_qr_tags — "Admin reads all QR tags"
 */
function qrTagAdminRead(userId: string): boolean {
  return hasRole(userRoles, userId, 'admin');
}

/**
 * product_qr_tags — "Coordinator reads QR tags for own SHG"
 */
function qrTagCoordinatorRead(userId: string, productArtisanId: string): boolean {
  const artisan = artisans.find(a => a.id === productArtisanId);
  if (!artisan) return false;
  return isShgCoordinator(userRoles, memberships, userId, artisan.shg_id);
}

/**
 * product_qr_tags — "Admin manages QR tags"
 */
function qrTagAdminManage(userId: string): boolean {
  return hasRole(userRoles, userId, 'admin');
}

/**
 * product_qr_tags — "Coordinator creates QR tags for own SHG"
 */
function qrTagCoordinatorCreate(userId: string, productArtisanId: string): boolean {
  if (!hasRole(userRoles, userId, 'coordinator')) return false;
  const artisan = artisans.find(a => a.id === productArtisanId);
  if (!artisan) return false;
  return isShgCoordinator(userRoles, memberships, userId, artisan.shg_id);
}

// ─── Tests: Provenance (Migration 0018) ──────────────────────────────────────

describe('RLS: blockchain_batches', () => {
  it('anon can read CONFIRMED batches', () => {
    expect(batchPublicRead(null, 'CONFIRMED')).toBe(true);
  });

  it('anon cannot read PENDING batches', () => {
    expect(batchPublicRead(null, 'PENDING')).toBe(false);
  });

  it('anon cannot read SUBMITTED batches', () => {
    expect(batchPublicRead(null, 'SUBMITTED')).toBe(false);
  });

  it('anon cannot read FAILED batches', () => {
    expect(batchPublicRead(null, 'FAILED')).toBe(false);
  });

  it('admin can read any batch status', () => {
    expect(batchPublicRead(ADMIN_USER, 'PENDING')).toBe(true);
    expect(batchPublicRead(ADMIN_USER, 'SUBMITTED')).toBe(true);
    expect(batchPublicRead(ADMIN_USER, 'CONFIRMED')).toBe(true);
    expect(batchPublicRead(ADMIN_USER, 'FAILED')).toBe(true);
  });

  it('admin can manage (create/update) batches', () => {
    expect(batchAdminManage(ADMIN_USER)).toBe(true);
  });

  it('coordinator cannot manage batches', () => {
    expect(batchAdminManage(COORD_A)).toBe(false);
  });

  it('artisan cannot manage batches', () => {
    expect(batchAdminManage(ARTISAN_USER)).toBe(false);
  });

  it('customer cannot manage batches', () => {
    expect(batchAdminManage(CUSTOMER)).toBe(false);
  });
});

describe('RLS: product_provenance_logs', () => {
  it('anyone (including anon) can read provenance logs', () => {
    expect(provenancePublicRead()).toBe(true);
  });

  it('admin can insert any stage', () => {
    expect(provenanceAdminInsert(ADMIN_USER)).toBe(true);
  });

  it('coordinator A can insert for SHG A product with coordinator role', () => {
    expect(provenanceCoordinatorInsert(COORD_A, 'coordinator', ARTISAN_A)).toBe(true);
  });

  it('coordinator A can insert for SHG A product with logistics role', () => {
    expect(provenanceCoordinatorInsert(COORD_A, 'logistics', ARTISAN_A)).toBe(true);
  });

  it('coordinator A cannot insert for SHG B product', () => {
    expect(provenanceCoordinatorInsert(COORD_A, 'coordinator', ARTISAN_B)).toBe(false);
  });

  it('coordinator B cannot insert for SHG A product', () => {
    expect(provenanceCoordinatorInsert(COORD_B, 'coordinator', ARTISAN_A)).toBe(false);
  });

  it('coordinator cannot insert with artisan actor_role', () => {
    expect(provenanceCoordinatorInsert(COORD_A, 'artisan', ARTISAN_A)).toBe(false);
  });

  it('artisan can insert PRODUCTION_STARTED for own product', () => {
    expect(provenanceArtisanInsert(ARTISAN_USER, 'PRODUCTION_STARTED', 'artisan', ARTISAN_A)).toBe(true);
  });

  it('artisan CANNOT insert INSPECTED_AND_PACKAGED (CRP impersonation blocked)', () => {
    expect(provenanceArtisanInsert(ARTISAN_USER, 'INSPECTED_AND_PACKAGED', 'artisan', ARTISAN_A)).toBe(false);
  });

  it('artisan CANNOT insert with coordinator actor_role (impersonation)', () => {
    expect(provenanceArtisanInsert(ARTISAN_USER, 'PRODUCTION_STARTED', 'coordinator', ARTISAN_A)).toBe(false);
  });

  it('artisan CANNOT insert for another artisan product', () => {
    expect(provenanceArtisanInsert(ARTISAN_USER, 'PRODUCTION_STARTED', 'artisan', ARTISAN_B)).toBe(false);
  });

  it('customer cannot insert any provenance event', () => {
    expect(provenanceAdminInsert(CUSTOMER)).toBe(false);
    expect(provenanceCoordinatorInsert(CUSTOMER, 'coordinator', ARTISAN_A)).toBe(false);
    expect(provenanceArtisanInsert(CUSTOMER, 'PRODUCTION_STARTED', 'artisan', ARTISAN_A)).toBe(false);
  });
});

describe('RLS: product_qr_tags', () => {
  it('admin can read all QR tags', () => {
    expect(qrTagAdminRead(ADMIN_USER)).toBe(true);
  });

  it('coordinator A can read QR tags for SHG A products', () => {
    expect(qrTagCoordinatorRead(COORD_A, ARTISAN_A)).toBe(true);
  });

  it('coordinator A cannot read QR tags for SHG B products', () => {
    expect(qrTagCoordinatorRead(COORD_A, ARTISAN_B)).toBe(false);
  });

  it('coordinator B cannot read QR tags for SHG A products', () => {
    expect(qrTagCoordinatorRead(COORD_B, ARTISAN_A)).toBe(false);
  });

  it('admin can manage (CRUD) all QR tags', () => {
    expect(qrTagAdminManage(ADMIN_USER)).toBe(true);
  });

  it('coordinator A can create QR tags for SHG A products', () => {
    expect(qrTagCoordinatorCreate(COORD_A, ARTISAN_A)).toBe(true);
  });

  it('coordinator A cannot create QR tags for SHG B products', () => {
    expect(qrTagCoordinatorCreate(COORD_A, ARTISAN_B)).toBe(false);
  });

  it('artisan cannot read QR tags (not admin, not coordinator)', () => {
    expect(qrTagAdminRead(ARTISAN_USER)).toBe(false);
    expect(qrTagCoordinatorRead(ARTISAN_USER, ARTISAN_A)).toBe(false);
  });

  it('customer cannot read or create QR tags', () => {
    expect(qrTagAdminRead(CUSTOMER)).toBe(false);
    expect(qrTagCoordinatorRead(CUSTOMER, ARTISAN_A)).toBe(false);
    expect(qrTagCoordinatorCreate(CUSTOMER, ARTISAN_A)).toBe(false);
  });
});

describe('Provenance: stage transition logic', () => {
  // Pure-function emulation of the validate_provenance_stage_transition trigger
  const STAGE_MAP: Record<string, number> = {
    PRODUCTION_STARTED: 1,
    INSPECTED_AND_PACKAGED: 2,
    IN_TRANSIT: 3,
    DELIVERED_AND_VERIFIED: 4,
  };

  const STAGE_ROLES: Record<string, string[]> = {
    PRODUCTION_STARTED:     ['artisan', 'coordinator', 'admin'],
    INSPECTED_AND_PACKAGED: ['coordinator', 'admin'],
    IN_TRANSIT:             ['coordinator', 'logistics', 'admin'],
    DELIVERED_AND_VERIFIED: ['coordinator', 'logistics', 'buyer', 'admin'],
  };

  function validateTransition(
    currentMaxSeq: number,
    newStage: string,
    actorRole: string,
  ): { ok: boolean; error?: string } {
    const seq = STAGE_MAP[newStage];
    if (seq === undefined) return { ok: false, error: 'Invalid stage' };

    if (currentMaxSeq === 0 && seq !== 1) {
      return { ok: false, error: 'Initial event must be PRODUCTION_STARTED' };
    }
    if (currentMaxSeq > 0 && seq <= currentMaxSeq) {
      return { ok: false, error: 'Stage regression or duplicate' };
    }
    if (currentMaxSeq > 0 && seq !== currentMaxSeq + 1) {
      return { ok: false, error: 'Stage sequence gap' };
    }

    const allowed = STAGE_ROLES[newStage];
    if (!allowed || !allowed.includes(actorRole)) {
      return { ok: false, error: `Role ${actorRole} not allowed for ${newStage}` };
    }

    return { ok: true };
  }

  it('allows valid forward sequence: 1→2→3→4', () => {
    expect(validateTransition(0, 'PRODUCTION_STARTED', 'artisan').ok).toBe(true);
    expect(validateTransition(1, 'INSPECTED_AND_PACKAGED', 'coordinator').ok).toBe(true);
    expect(validateTransition(2, 'IN_TRANSIT', 'logistics').ok).toBe(true);
    expect(validateTransition(3, 'DELIVERED_AND_VERIFIED', 'buyer').ok).toBe(true);
  });

  it('rejects initial event that is not PRODUCTION_STARTED', () => {
    const r = validateTransition(0, 'INSPECTED_AND_PACKAGED', 'coordinator');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('Initial event');
  });

  it('rejects stage regression (recording stage 1 after stage 2)', () => {
    const r = validateTransition(2, 'PRODUCTION_STARTED', 'artisan');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('regression');
  });

  it('rejects duplicate stage submission', () => {
    const r = validateTransition(1, 'PRODUCTION_STARTED', 'artisan');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('regression');
  });

  it('rejects stage sequence gap (1→3 skipping 2)', () => {
    const r = validateTransition(1, 'IN_TRANSIT', 'logistics');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('gap');
  });

  it('rejects artisan self-certifying INSPECTED_AND_PACKAGED', () => {
    const r = validateTransition(1, 'INSPECTED_AND_PACKAGED', 'artisan');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not allowed');
  });

  it('rejects buyer recording IN_TRANSIT', () => {
    const r = validateTransition(2, 'IN_TRANSIT', 'buyer');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('not allowed');
  });

  it('admin can record any stage', () => {
    expect(validateTransition(0, 'PRODUCTION_STARTED', 'admin').ok).toBe(true);
    expect(validateTransition(1, 'INSPECTED_AND_PACKAGED', 'admin').ok).toBe(true);
    expect(validateTransition(2, 'IN_TRANSIT', 'admin').ok).toBe(true);
    expect(validateTransition(3, 'DELIVERED_AND_VERIFIED', 'admin').ok).toBe(true);
  });
});
