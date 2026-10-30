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

export default function ArtisanProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isHindi, setLanguage } = useLanguage();

  const skills = [
    'Pure Silk Jacquard Weaving',
    'Real Silver & Gold Zari',
    'Natural Vegetable Dyeing',
    'GI Certified Master Weaver',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.artisan.profile')}
        subtitle="Artisan Identity & Pehchan Card Verification"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Identity Card */}
        <Card variant="standard" style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Ionicons name="sparkles" size={36} color={Palette.secondaryAccent} />
            </View>
            <View style={styles.identityDetails}>
              <Text style={styles.name}>{user?.name || 'Anita Devi'}</Text>
              <Text style={styles.roleTitle}>{t('roles.artisan')}</Text>
              <Text style={styles.emailText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Cluster</Text>
              <Text style={styles.metaValue}>Varanasi Handloom</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Pehchan Card ID</Text>
              <Text style={styles.metaValue}>UP-VAR-991204</Text>
            </View>
          </View>
        </Card>

        {/* Certified Skills */}
        <Card variant="white" style={styles.skillsCard}>
          <Text style={styles.skillsHeading}>Certified Craft Techniques</Text>
          <View style={styles.skillBadgeGrid}>
            {skills.map((skill, index) => (
              <View key={index} style={styles.skillPill}>
                <Ionicons name="checkmark-circle" size={16} color={Palette.primaryContainer} />
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
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
    backgroundColor: Palette.primaryContainer,
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
  skillsCard: {
    marginBottom: Spacing.md,
  },
  skillsHeading: {
    ...Typography.labelLg,
    color: Palette.headlineDark,
    marginBottom: Spacing.sm,
  },
  skillBadgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skillPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  skillText: {
    ...Typography.bodySm,
    color: Palette.headlineDark,
  },
  settingsCard: {
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    ...Typography.labelLg,
    color: Palette.headlineDark,
    marginBottom: Spacing.sm,
  },
  langSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
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

