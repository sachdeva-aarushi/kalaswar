import { describe, it, expect } from 'vitest';
import {
  normalizeAppRole,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
} from '../hooks/use-auth';
import { ExpoSecureStoreAdapter } from '../lib/secure-store';

describe('Mobile Auth & Role Resolution', () => {
  it('normalizes database and profile roles to the 3 mobile tab roles', () => {
    // Coordinator roles
    expect(normalizeAppRole('coordinator')).toBe('coordinator');
    expect(normalizeAppRole('admin')).toBe('coordinator');
    expect(normalizeAppRole('Cluster Coordinator')).toBe('coordinator');

    // Artisan roles
    expect(normalizeAppRole('artisan')).toBe('artisan');
    expect(normalizeAppRole('master_artisan')).toBe('artisan');
    expect(normalizeAppRole('weaver')).toBe('artisan');

    // Shopper roles
    expect(normalizeAppRole('customer')).toBe('shopper');
    expect(normalizeAppRole('buyer')).toBe('shopper');
    expect(normalizeAppRole('shopper')).toBe('shopper');
    expect(normalizeAppRole(null)).toBe('shopper');
    expect(normalizeAppRole(undefined)).toBe('shopper');
  });

  it('contains the verified README demo accounts for all 3 persona roles', () => {
    const coordinator = DEMO_ACCOUNTS.find((d) => d.role === 'coordinator');
    expect(coordinator).toBeDefined();
    expect(coordinator?.email).toBe('coordinator.sunita@kalaswar.demo');
    expect(coordinator?.name).toBe('Sunita Patil');

    const artisan = DEMO_ACCOUNTS.find((d) => d.role === 'artisan');
    expect(artisan).toBeDefined();
    expect(artisan?.email).toBe('artisan.anita@kalaswar.demo');
    expect(artisan?.name).toBe('Anita Devi');

    const shopper = DEMO_ACCOUNTS.find((d) => d.role === 'shopper');
    expect(shopper).toBeDefined();
    expect(shopper?.email).toBe('customer.priya@kalaswar.demo');
    expect(shopper?.name).toBe('Priya Sharma');

    expect(DEMO_PASSWORD).toBe('KalaswarDemo@2025');
  });

  it('implements the SecureStore adapter storage interface correctly', async () => {
    expect(typeof ExpoSecureStoreAdapter.getItem).toBe('function');
    expect(typeof ExpoSecureStoreAdapter.setItem).toBe('function');
    expect(typeof ExpoSecureStoreAdapter.removeItem).toBe('function');
  });
});

