import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Palette, Radii, Spacing, Shadows } from '@/constants/theme';

export type CardVariant = 'standard' | 'white' | 'ai' | 'alert';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'standard', style }: CardProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'white':
        return Palette.surfaceWhite;
      case 'ai':
        return Palette.tertiaryGuidance;
      case 'alert':
        return Palette.errorContainer;
      case 'standard':
      default:
        return Palette.surfaceCard;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'alert':
        return Palette.errorTerracotta;
      case 'ai':
        return Palette.primaryContainer;
      case 'standard':
      case 'white':
      default:
        return Palette.borderNeutral;
    }
  };

  return (
    <View
      style={[
        styles.base,
        Shadows.ambient,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderLeftWidth: variant === 'ai' ? 4 : 1,
          borderLeftColor: variant === 'ai' ? Palette.primaryContainer : getBorderColor(),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.card, // 20dp tactile radius
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
});

