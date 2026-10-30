import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useAuth, DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isHindi, toggleLanguage } = useLanguage();
  const { signIn, signInAsDemo } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleManualSignIn = async () => {
    if (!email.trim()) {
      setErrorMsg(t('auth.emailLabel') + ' is required');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await signIn(email, password || DEMO_PASSWORD);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || t('auth.errorInvalid'));
    }
  };

  const handleDemoSelect = async (demo: DemoAccount) => {
    setEmail(demo.email);
    setPassword(DEMO_PASSWORD);
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await signInAsDemo(demo);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || t('auth.errorInvalid'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Language Toggle */}
          <View style={styles.topBar}>
            <View style={styles.brandBadge}>
              <Ionicons name="sparkles" size={16} color={Palette.secondaryAccent} />
              <Text style={styles.brandBadgeText}>कलास्वर • KALASWAR</Text>
            </View>

            <TouchableOpacity
              onPress={toggleLanguage}
              style={styles.langButton}
              accessibilityLabel="Switch Language"
            >
              <Ionicons name="globe-outline" size={16} color={Palette.primary} />
              <Text style={styles.langButtonText}>{isHindi ? 'English' : 'हिंदी'}</Text>
            </TouchableOpacity>
          </View>

          {/* Header Title Section */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>{t('auth.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          {/* Quick Demo Personas (1-Tap Logins) */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeaderRow}>
              <Ionicons name="shield-checkmark" size={18} color={Palette.primaryContainer} />
              <Text style={styles.demoSectionTitle}>{t('auth.demoSection')}</Text>
            </View>
            <Text style={styles.demoHintText}>{t('auth.demoHint')}</Text>

            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((demo) => (
                <TouchableOpacity
                  key={demo.id}
                  onPress={() => handleDemoSelect(demo)}
                  activeOpacity={0.85}
                  style={[styles.demoCard, Shadows.ambient]}
                >
                  <View style={styles.demoAvatar}>
                    <Ionicons
                      name={
                        demo.role === 'coordinator'
                          ? 'grid'
                          : demo.role === 'artisan'
                          ? 'color-palette'
                          : 'bag-handle'
                      }
                      size={20}
                      color={Palette.primaryContainer}
                    />
                  </View>
                  <View style={styles.demoInfo}>
                    <Text style={styles.demoName}>{demo.name}</Text>
                    <Text style={styles.demoRole}>
                      {demo.role === 'coordinator'
                        ? t('auth.coordinatorRole')
                        : demo.role === 'artisan'
                        ? t('auth.artisanRole')
                        : t('auth.shopperRole')}
                    </Text>
                    <Text style={styles.demoEmail}>{demo.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Palette.outline} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual Email / Password Form */}
          <Card variant="standard" style={styles.formCard}>
            <Text style={styles.formTitle}>Or sign in with email credentials</Text>

            {errorMsg && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color={Palette.errorTerracotta} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Input
              label={t('auth.emailLabel')}
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label={t('auth.passwordLabel')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              label={isSubmitting ? t('auth.signingIn') : t('auth.signInButton')}
              onPress={handleManualSignIn}
              isLoading={isSubmitting}
              iconName="log-in-outline"
              variant="primary"
              style={styles.signInBtn}
            />
          </Card>

          {/* Footer Mission Tagline */}
          <Text style={styles.footerTagline}>{t('common.tagline')}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceCard,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  brandBadgeText: {
    ...Typography.labelSm,
    color: Palette.headlineDark,
    letterSpacing: 1,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.tertiaryGuidance,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Palette.primaryContainer,
  },
  langButtonText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  heroSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.headlineXl,
    color: Palette.headlineDark,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    lineHeight: 22,
  },
  demoSection: {
    marginBottom: Spacing.xl,
  },
  demoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  demoSectionTitle: {
    ...Typography.labelLg,
    color: Palette.headlineDark,
  },
  demoHintText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  demoGrid: {
    gap: Spacing.sm,
  },
  demoCard: {
    backgroundColor: Palette.surfaceWhite,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  demoAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Palette.tertiaryGuidance,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  demoInfo: {
    flex: 1,
  },
  demoName: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  demoRole: {
    ...Typography.labelSm,
    color: Palette.secondary,
    marginTop: 2,
  },
  demoEmail: {
    ...Typography.labelSm,
    color: Palette.outline,
    marginTop: 2,
  },
  formCard: {
    marginBottom: Spacing.xl,
  },
  formTitle: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.errorContainer,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    ...Typography.bodySm,
    color: Palette.errorTerracotta,
    flex: 1,
  },
  signInBtn: {
    marginTop: Spacing.sm,
  },
  footerTagline: {
    ...Typography.bodySm,
    color: Palette.outline,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

