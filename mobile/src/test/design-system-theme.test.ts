import { describe, it, expect } from 'vitest';
import { Palette, Spacing, Radii, Typography } from '../constants/theme';

describe('Stitch Design System Mapping ("Artisan Vernacular")', () => {
  it('maps the exact color palette tokens from Stitch MCP', () => {
    // Primary Forest Green
    expect(Palette.primary).toBe('#083527');
    expect(Palette.primaryContainer).toBe('#234c3d');
    expect(Palette.headlineDark).toBe('#18372d');

    // Secondary Raw Gold
    expect(Palette.secondary).toBe('#7b5812');
    expect(Palette.secondaryAccent).toBe('#c69b50');

    // Untreated Ivory Canvas & Parchment
    expect(Palette.background).toBe('#fef9ee');
    expect(Palette.surfaceCard).toBe('#f1ece1');
    expect(Palette.surfaceWhite).toBe('#ffffff');

    // Alert & Terracotta
    expect(Palette.errorTerracotta).toBe('#b85f45');

    // Guidance Sage
    expect(Palette.tertiaryGuidance).toBe('#dde8da');
  });

  it('enforces touch target minimum of 56dp for field ergonomics', () => {
    expect(Spacing.touchTargetMin).toBe(56);
  });

  it('enforces 20dp tactile radius on cards', () => {
    expect(Radii.card).toBe(20);
  });

  it('defines typographic hierarchy with high-contrast font metrics', () => {
    expect(Typography.headlineXl.fontSize).toBe(30);
    expect(Typography.headlineLg.fontSize).toBe(24);
    expect(Typography.headlineMd.fontSize).toBe(20);
    expect(Typography.bodyMd.fontSize).toBe(16);
    expect(Typography.bodySm.fontSize).toBe(14);
  });
});

