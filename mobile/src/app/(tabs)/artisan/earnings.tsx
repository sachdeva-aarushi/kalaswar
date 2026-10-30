import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useEarnings, type PayoutRecord } from '@/hooks/queries/use-earnings';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';

export default function ArtisanEarningsScreen() {
  const { t } = useTranslation();
  const { data: earnings } = useEarnings();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.artisan.earnings')}
        subtitle="Transparent DBT wage ledger & escrow releases"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Payout Balance Card */}
        <Card variant="standard" style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Total Earned (FY 2026-27)</Text>
              <Text style={styles.balanceAmount}>
                ₹{earnings?.totalEarnedYtd.toLocaleString()}
              </Text>
            </View>
            <View style={styles.bankPill}>
              <Ionicons name="card-outline" size={16} color={Palette.primaryContainer} />
              <Text style={styles.bankPillText}>SBI DBT</Text>
            </View>
          </View>

          <View style={styles.escrowBox}>
            <View style={styles.escrowRow}>
              <Ionicons name="lock-closed" size={16} color={Palette.secondary} />
              <Text style={styles.escrowLabel}>In Escrow (Awaiting Buyer Confirmation)</Text>
            </View>
            <Text style={styles.escrowAmount}>
              ₹{earnings?.pendingInEscrow.toLocaleString()}
            </Text>
          </View>

          <Text style={styles.bankAccountInfo}>
            Linked Account: {earnings?.bankAccountMasked}
          </Text>
        </Card>

        {/* Transaction History Heading */}
        <View style={styles.sectionHeader}>
          <Ionicons name="time-outline" size={18} color={Palette.headlineDark} />
          <Text style={styles.sectionTitle}>Recent Bank Disbursements</Text>
        </View>

        {/* Payout Records */}
        {earnings?.payouts.map((record: PayoutRecord) => (
          <Card key={record.id} variant="white" style={styles.payoutCard}>
            <View style={styles.payoutTop}>
              <View>
                <Text style={styles.payoutCraft}>{record.craftItem}</Text>
                <Text style={styles.payoutOrder}>{record.orderNumber} • {record.date}</Text>
              </View>
              <Text style={styles.payoutAmount}>₹{record.amount.toLocaleString()}</Text>
            </View>

            <View style={styles.payoutBottom}>
              <StatusBadge
                label={record.status === 'transferred' ? 'Paid to Bank' : 'Escrow Hold'}
                status={record.status === 'transferred' ? 'active' : 'pending'}
              />
              <Text style={styles.refCode}>{record.bankReference}</Text>
            </View>
          </Card>
        ))}
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
  balanceCard: {
    marginBottom: Spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  balanceAmount: {
    ...Typography.headlineXl,
    color: Palette.headlineDark,
    marginTop: 2,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.tertiaryGuidance,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  bankPillText: {
    ...Typography.labelSm,
    color: Palette.primaryContainer,
    fontWeight: '700',
  },
  escrowBox: {
    backgroundColor: Palette.surfaceContainer,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  escrowLabel: {
    ...Typography.bodySm,
    color: Palette.secondary,
    fontWeight: '600',
  },
  escrowAmount: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
    marginLeft: 22,
  },
  bankAccountInfo: {
    ...Typography.bodySm,
    color: Palette.outline,
    marginTop: 4,
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
  payoutCard: {
    marginBottom: Spacing.sm,
  },
  payoutTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  payoutCraft: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  payoutOrder: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  payoutAmount: {
    ...Typography.headlineSm,
    color: Palette.primaryContainer,
  },
  payoutBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refCode: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
});

