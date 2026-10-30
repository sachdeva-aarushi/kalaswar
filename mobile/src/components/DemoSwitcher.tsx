import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth, DEMO_ACCOUNTS, type DemoAccount, type AppRole } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

export function DemoSwitcher() {
  const { user, role, switchRole, signInAsDemo } = useAuth();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="people-circle-outline" size={20} color={Palette.secondary} />
        <Text style={styles.title}>{t('common.switchRole')}</Text>
      </View>
      <View style={styles.buttonRow}>
        {DEMO_ACCOUNTS.map((demo: DemoAccount) => {
          const isActive = role === demo.role;
          return (
            <TouchableOpacity
              key={demo.id}
              onPress={() => {
                if (user) {
                  switchRole(demo.role);
                } else {
                  void signInAsDemo(demo);
                }
              }}
              style={[
                styles.rolePill,
                isActive && styles.activePill,
              ]}
            >
              <Text style={[styles.roleText, isActive && styles.activeRoleText]}>
                {demo.role === 'coordinator'
                  ? 'Coordinator'
                  : demo.role === 'artisan'
                  ? 'Artisan'
                  : 'Shopper'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.labelMd,
    color: Palette.headlineDark,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rolePill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceWhite,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  roleText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  activeRoleText: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
});

