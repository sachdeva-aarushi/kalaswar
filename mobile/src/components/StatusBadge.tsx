import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Palette, Typography, Radii, Spacing } from '@/constants/theme';

export type BadgeStatus = 'active' | 'pending' | 'alert' | 'info';

interface StatusBadgeProps {
  label: string;
  status?: BadgeStatus;
}

export function StatusBadge({ label, status = 'active' }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case 'active':
        return {
          bg: Palette.tertiaryGuidance,
          text: Palette.primaryContainer,
        };
      case 'pending':
        return {
          bg: '#fbf2df',
          text: Palette.secondary,
        };
      case 'alert':
        return {
          bg: '#fce8e2',
          text: Palette.errorTerracotta,
        };
      case 'info':
      default:
        return {
          bg: Palette.surfaceContainer,
          text: Palette.onSurfaceVariant,
        };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 32,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    ...Typography.labelSm,
    fontWeight: '700',
  },
});

