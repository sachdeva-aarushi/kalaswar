import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Header({ title, subtitle, showBack, onBack }: HeaderProps) {
  const { isHindi, toggleLanguage } = useLanguage();
  const { user, role } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={Palette.headlineDark} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.brandTitle}>कलास्वर • KALASWAR</Text>
            {user && (
              <Text style={styles.userRolePill}>
                {user.name} ({role})
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={toggleLanguage}
          style={styles.langPill}
          accessibilityLabel="Switch Language"
        >
          <Ionicons name="globe-outline" size={16} color={Palette.primary} />
          <Text style={styles.langText}>{isHindi ? 'English' : 'हिंदी'}</Text>
        </TouchableOpacity>
      </View>

      {(title || subtitle) && (
        <View style={styles.titleContainer}>
          {title && <Text style={styles.titleText}>{title}</Text>}
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderNeutral,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
  },
  brandTitle: {
    ...Typography.labelMd,
    color: Palette.primaryContainer,
    letterSpacing: 1.2,
  },
  userRolePill: {
    ...Typography.labelSm,
    color: Palette.secondary,
    marginTop: 2,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.tertiaryGuidance,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.primaryContainer,
  },
  langText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  titleContainer: {
    marginTop: Spacing.xs,
  },
  titleText: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
  },
  subtitleText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
});

