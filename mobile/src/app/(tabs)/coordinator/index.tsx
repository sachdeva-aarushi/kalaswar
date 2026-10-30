import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useCoordinatorOverview } from '@/hooks/queries/use-coordinator';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { DemoSwitcher } from '@/components/DemoSwitcher';

export default function CoordinatorOverviewScreen() {
  const { t } = useTranslation();
  const { data: overview, isLoading } = useCoordinatorOverview();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('coordinator.title')}
        subtitle={overview?.clusterName || t('coordinator.subtitle')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cluster Metric KPI Cards */}
        <View style={styles.statsRow}>
          <Card variant="standard" style={styles.statCard}>
            <Ionicons name="people" size={24} color={Palette.primaryContainer} />
            <Text style={styles.statNumber}>{overview?.totalArtisans ?? 48}</Text>
            <Text style={styles.statLabel}>{t('coordinator.activeArtisans')}</Text>
          </Card>

          <Card variant="ai" style={styles.statCard}>
            <Ionicons name="alert-circle" size={24} color={Palette.errorTerracotta} />
            <Text style={[styles.statNumber, { color: Palette.errorTerracotta }]}>
              {overview?.pendingApprovals ?? 3}
            </Text>
            <Text style={styles.statLabel}>{t('coordinator.pendingApprovals')}</Text>
          </Card>

          <Card variant="standard" style={styles.statCard}>
            <Ionicons name="checkmark-done-circle" size={24} color={Palette.secondary} />
            <Text style={styles.statNumber}>82%</Text>
            <Text style={styles.statLabel}>{t('coordinator.weeklyQuota')}</Text>
          </Card>
        </View>

        {/* Action Button: Quick Intake */}
        <Button
          label={t('coordinator.newIntake')}
          iconName="add-circle-outline"
          onPress={() => {}}
          variant="primary"
          style={styles.intakeBtn}
        />

        {/* Urgent Actions Section */}
        <View style={styles.sectionHeader}>
          <Ionicons name="flash" size={18} color={Palette.errorTerracotta} />
          <Text style={styles.sectionTitle}>{t('coordinator.urgentActions')}</Text>
        </View>

        {overview?.urgentTasks.map((task) => (
          <Card key={task.id} variant="standard" style={styles.urgentCard}>
            <View style={styles.urgentTop}>
              <StatusBadge
                label={task.priority === 'high' ? 'High Priority' : 'Action Needed'}
                status={task.priority === 'high' ? 'alert' : 'pending'}
              />
              <Text style={styles.clusterTag}>{task.cluster}</Text>
            </View>

            <Text style={styles.taskTitle}>{task.title}</Text>

            <View style={styles.cardActionRow}>
              <Button
                label={task.actionText}
                iconName="checkmark-circle-outline"
                variant="secondary"
                onPress={() => {}}
                style={styles.actionBtn}
              />
            </View>
          </Card>
        ))}

        {/* Direct Benefit Transfer (DBT) Payout Status */}
        <Card variant="white" style={styles.dbtCard}>
          <View style={styles.dbtHeader}>
            <Ionicons name="wallet-outline" size={20} color={Palette.secondary} />
            <Text style={styles.dbtTitle}>{t('coordinator.dbtLedger')}</Text>
          </View>
          <Text style={styles.dbtAmount}>₹3,42,000</Text>
          <Text style={styles.dbtSubtext}>
            Disbursed this month directly into artisan bank accounts (DBT)
          </Text>
        </Card>

        {/* Persona Switcher for Evaluation */}
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
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: 0,
  },
  statNumber: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
    marginTop: Spacing.xs,
  },
  statLabel: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 2,
  },
  intakeBtn: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
  },
  urgentCard: {
    marginBottom: Spacing.md,
  },
  urgentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  clusterTag: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  taskTitle: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
    marginBottom: Spacing.md,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  dbtCard: {
    marginTop: Spacing.sm,
  },
  dbtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dbtTitle: {
    ...Typography.labelMd,
    color: Palette.secondary,
  },
  dbtAmount: {
    ...Typography.headlineLg,
    color: Palette.headlineDark,
  },
  dbtSubtext: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
});

