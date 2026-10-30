import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { DemoSwitcher } from '@/components/DemoSwitcher';

export default function ShopperProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isHindi, setLanguage } = useLanguage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.shopper.profile')}
        subtitle="Shopper & Corporate Gifting Account"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card variant="standard" style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="bag-handle" size={36} color={Palette.primaryContainer} />
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.name}>{user?.name || 'Priya Sharma'}</Text>
              <Text style={styles.roleTitle}>{t('roles.shopper')}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Impact Contribution</Text>
              <Text style={styles.metaValue}>₹28,400 to SHGs</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Verified Passports</Text>
              <Text style={styles.metaValue}>12 Pieces</Text>
            </View>
          </View>
        </Card>

        {/* Corporate Sourcing Details */}
        <Card variant="white" style={styles.settingsCard}>
          <Text style={styles.sectionHeading}>Corporate Invoicing (GSTIN)</Text>
          <Text style={styles.bodyDetail}>GSTIN: 27AABCF1294C1ZV</Text>
          <Text style={styles.bodyDetail}>Entity: FabIndia Gifting Div.</Text>
        </Card>

        {/* Language Selection */}
        <Card variant="white" style={styles.settingsCard}>
          <Text style={styles.sectionHeading}>{t('common.language')}</Text>
          <View style={styles.langSelector}>
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              style={[styles.langChoice, !isHindi && styles.langChoiceActive]}
            >
              <Text style={[styles.langChoiceText, !isHindi && styles.langChoiceTextActive]}>
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('hi')}
              style={[styles.langChoice, isHindi && styles.langChoiceActive]}
            >
              <Text style={[styles.langChoiceText, isHindi && styles.langChoiceTextActive]}>
                हिंदी (Hindi)
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Demo Persona Switcher */}
        <DemoSwitcher />

        {/* Sign Out Button */}
        <Button
          label={t('common.logout')}
          iconName="log-out-outline"
          variant="alert"
          onPress={() => void signOut()}
          style={styles.signOutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    marginBottom: Spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radii.card,
    backgroundColor: Palette.tertiaryGuidance,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  identityDetails: {
    flex: 1,
  },
  name: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
  },
  roleTitle: {
    ...Typography.bodySm,
    color: Palette.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  emailText: {
    ...Typography.bodySm,
    color: Palette.outline,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceWhite,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  metaBlock: {
    flex: 1,
  },
  metaLabel: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  metaValue: {
    ...Typography.bodySm,
    fontWeight: '600',
    color: Palette.headlineDark,
    marginTop: 2,
  },
  settingsCard: {
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    ...Typography.labelLg,
    color: Palette.headlineDark,
    marginBottom: Spacing.xs,
  },
  bodyDetail: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  langSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  langChoice: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
  },
  langChoiceActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  langChoiceText: {
    ...Typography.bodyMd,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  langChoiceTextActive: {
    color: Palette.onPrimary,
  },
  signOutBtn: {
    marginTop: Spacing.xl,
  },
});

