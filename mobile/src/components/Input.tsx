import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        onFocus={(e) => {
          setIsFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={Palette.outline}
        style={[
          styles.input,
          {
            borderColor: error
              ? Palette.error
              : isFocused
              ? Palette.primaryContainer
              : Palette.borderNeutral,
            borderWidth: isFocused ? 2 : 1.5,
          },
          style,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Palette.headlineDark,
    marginBottom: Spacing.xs,
  },
  input: {
    minHeight: Spacing.touchTargetMin, // 56dp minimum touch target
    backgroundColor: Palette.surfaceWhite,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    color: Palette.onSurface,
  },
  errorText: {
    ...Typography.bodySm,
    color: Palette.error,
    marginTop: 4,
  },
});

