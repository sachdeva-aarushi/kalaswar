import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useArtisanTasks } from '@/hooks/queries/use-artisan-tasks';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { DemoSwitcher } from '@/components/DemoSwitcher';

export default function ArtisanHomeScreen() {
  const { t } = useTranslation();
  const { data: tasks, isLoading } = useArtisanTasks();
  const currentTask = tasks?.[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('artisan.welcome')}
        subtitle={t('artisan.clusterBadge')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Floating Voice Help Banner */}
        <Card variant="ai" style={styles.voiceAssistantCard}>
          <View style={styles.voiceRow}>
            <View style={styles.micIconCircle}>
              <Ionicons name="mic" size={24} color={Palette.onPrimary} />
            </View>
            <View style={styles.voiceInfo}>
              <Text style={styles.voiceTitle}>आवाज़ सहायता (Voice Copilot)</Text>
              <Text style={styles.voiceSubtext}>{t('artisan.voicePrompt')}</Text>
            </View>
          </View>
        </Card>

        {/* Current Active Craft Task */}
        {currentTask && (
          <Card variant="standard" style={styles.taskCard}>
            <View style={styles.taskTopRow}>
              <StatusBadge label="In Production" status="active" />
              <Text style={styles.orderNumber}>{currentTask.orderNumber}</Text>
            </View>

            <Text style={styles.craftName}>{currentTask.craftName}</Text>
            <Text style={styles.stageName}>{currentTask.stageName}</Text>

            {/* Visual Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${currentTask.progressPercent}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressText}>
                  {currentTask.completedUnits} of {currentTask.targetUnits} meters completed
                </Text>
                <Text style={styles.progressPercent}>{currentTask.progressPercent}%</Text>
              </View>
            </View>

            <View style={styles.wageRow}>
              <View>
                <Text style={styles.wageLabel}>Wage Per Unit</Text>
                <Text style={styles.wageValue}>₹{currentTask.wagePerUnit}/m</Text>
              </View>
              <View>
                <Text style={styles.wageLabel}>Expected Payout</Text>
                <Text style={styles.wageTotal}>₹{currentTask.estimatedEarnings.toLocaleString()}</Text>
              </View>
            </View>

            <Button
              label={t('artisan.logProgress')}
              iconName="create-outline"
              variant="primary"
              onPress={() => {}}
              style={styles.logWorkBtn}
            />
          </Card>
        )}

        {/* Recent Earnings Summary */}
        <Card variant="white" style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="wallet-outline" size={20} color={Palette.secondary} />
            <Text style={styles.earningsTitle}>{t('artisan.recentEarnings')}</Text>
          </View>
          <Text style={styles.earningsAmount}>₹18,500</Text>
          <Text style={styles.earningsStatus}>
            ✓ Deposited directly into State Bank of India (DBT)
          </Text>
        </Card>

        {/* Demo Persona Switcher */}
        <DemoSwitcher />
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
  voiceAssistantCard: {
    marginBottom: Spacing.md,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  micIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceInfo: {
    flex: 1,
  },
  voiceTitle: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  voiceSubtext: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  taskCard: {
    marginBottom: Spacing.md,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  orderNumber: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  craftName: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
    marginBottom: 4,
  },
  stageName: {
    ...Typography.bodyMd,
    color: Palette.secondary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.borderNeutral,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  progressPercent: {
    ...Typography.labelSm,
    color: Palette.headlineDark,
    fontWeight: '700',
  },
  wageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceWhite,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  wageLabel: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  wageValue: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
    marginTop: 2,
  },
  wageTotal: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.secondary,
    marginTop: 2,
  },
  logWorkBtn: {
    width: '100%',
  },
  earningsCard: {
    marginBottom: Spacing.md,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  earningsTitle: {
    ...Typography.labelMd,
    color: Palette.secondary,
  },
  earningsAmount: {
    ...Typography.headlineLg,
    color: Palette.headlineDark,
  },
  earningsStatus: {
    ...Typography.bodySm,
    color: Palette.primaryContainer,
    marginTop: 4,
  },
});

