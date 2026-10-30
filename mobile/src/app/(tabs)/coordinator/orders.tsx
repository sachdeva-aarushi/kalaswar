import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useOrders, type OrderItem } from '@/hooks/queries/use-orders';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';

export default function CoordinatorOrdersScreen() {
  const { t } = useTranslation();
  const { data: orders, isLoading } = useOrders('coordinator');
  const [filter, setFilter] = useState<'all' | 'in_production' | 'quality_check'>('all');

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.coordinator.orders')}
        subtitle="Manage batch allocations & production deadlines"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'in_production', 'quality_check'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === tab && styles.filterTextActive,
                ]}
              >
                {tab === 'all'
                  ? 'All Orders'
                  : tab === 'in_production'
                  ? 'In Production'
                  : 'Quality Check'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orders List */}
        {filteredOrders?.map((order: OrderItem) => (
          <Card key={order.id} variant="standard" style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <View>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.customerName}>{order.customerName}</Text>
              </View>
              <StatusBadge
                label={order.status.replace('_', ' ').toUpperCase()}
                status={
                  order.status === 'in_production'
                    ? 'active'
                    : order.status === 'quality_check'
                    ? 'pending'
                    : 'info'
                }
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.productTitle}>{order.productTitle}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={16} color={Palette.outline} />
                <Text style={styles.metaText}>{order.quantity} units</Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={Palette.outline} />
                <Text style={styles.metaText}>Due: {order.deliveryDate}</Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color={Palette.secondary} />
                <Text style={[styles.metaText, { color: Palette.secondary, fontWeight: '700' }]}>
                  ₹{order.totalAmount.toLocaleString()}
                </Text>
              </View>
            </View>

            {order.blockchainVerified && (
              <View style={styles.provenanceRow}>
                <Ionicons name="shield-checkmark" size={14} color={Palette.primaryContainer} />
                <Text style={styles.provenanceText}>Polygon L2 DPP Passport Anchored</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <Button
                label="Assign Artisans"
                iconName="people-outline"
                variant="secondary"
                onPress={() => {}}
                style={styles.cardBtn}
              />
              <Button
                label="Log QC"
                iconName="checkmark-done-outline"
                variant="primary"
                onPress={() => {}}
                style={styles.cardBtn}
              />
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
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceCard,
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  filterPillActive: {
    backgroundColor: Palette.primaryContainer,
    borderColor: Palette.primary,
  },
  filterText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  filterTextActive: {
    color: Palette.onPrimary,
  },
  orderCard: {
    marginBottom: Spacing.md,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    ...Typography.labelMd,
    color: Palette.primaryContainer,
  },
  customerName: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.borderNeutral,
    marginVertical: Spacing.sm,
  },
  productTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  provenanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.tertiaryGuidance,
    padding: 6,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  },
  provenanceText: {
    ...Typography.labelSm,
    color: Palette.primaryContainer,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cardBtn: {
    flex: 1,
    minHeight: 46,
  },
});

