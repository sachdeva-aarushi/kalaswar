import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'alert' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Button({
  label,
  onPress,
  iconName,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return Palette.outlineVariant;
    switch (variant) {
      case 'primary':
        return Palette.primaryContainer;
      case 'secondary':
        return Palette.surfaceCard;
      case 'alert':
        return Palette.errorTerracotta;
      case 'ghost':
        return 'transparent';
    }
  };

  const getTextColor = () => {
    if (disabled) return Palette.onSurfaceVariant;
    switch (variant) {
      case 'primary':
      case 'alert':
        return Palette.onPrimary;
      case 'secondary':
        return Palette.headlineDark;
      case 'ghost':
        return Palette.primaryContainer;
    }
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return Palette.primaryContainer;
    return 'transparent';
  };

  const textColor = getTextColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'secondary' ? 1.5 : 0,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {iconName && (
            <Ionicons
              name={iconName}
              size={22}
              color={textColor}
              style={styles.leadingIcon}
            />
          )}
          <Text style={[styles.labelText, { color: textColor }, textStyle]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Spacing.touchTargetMin, // 56dp minimum touch target
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingIcon: {
    marginRight: Spacing.sm,
  },
  labelText: {
    ...Typography.bodyMd,
    fontWeight: '700',
  },
});

