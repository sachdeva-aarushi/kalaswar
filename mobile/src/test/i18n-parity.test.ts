import { describe, it, expect } from 'vitest';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';

describe('i18n English & Hindi Translation Parity', () => {
  it('has identical top-level domain sections in both languages', () => {
    const enKeys = Object.keys(en);
    const hiKeys = Object.keys(hi);
    expect(enKeys).toEqual(hiKeys);
    expect(enKeys).toContain('common');
    expect(enKeys).toContain('auth');
    expect(enKeys).toContain('roles');
    expect(enKeys).toContain('tabs');
    expect(enKeys).toContain('coordinator');
    expect(enKeys).toContain('artisan');
    expect(enKeys).toContain('shopper');
  });

  it('provides matching tab labels for coordinator, artisan, and shopper in Hindi', () => {
    expect(hi.tabs.coordinator.overview).toBe('समीक्षा');
    expect(hi.tabs.coordinator.orders).toBe('आदेश');
    expect(hi.tabs.artisan.home).toBe('मेरा काम');
    expect(hi.tabs.artisan.earnings).toBe('कमाई');
    expect(hi.tabs.shopper.explore).toBe('शिल्प खोजें');
    expect(hi.tabs.shopper.concierge).toBe('कस्टम उपहार');
  });

  it('provides translated role badges for low-literacy clarity', () => {
    expect(hi.roles.coordinator).toBe('समूह समन्वयक');
    expect(hi.roles.artisan).toBe('कारीगर');
    expect(hi.roles.shopper).toBe('ग्राहक / ख़रीदार');
  });
});

