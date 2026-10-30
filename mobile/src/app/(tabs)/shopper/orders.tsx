import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useOrders, type OrderItem } from '@/hooks/queries/use-orders';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';

export default function ShopperOrdersScreen() {
  const { t } = useTranslation();
  const { data: orders } = useOrders('shopper');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.shopper.orders')}
        subtitle="Track artisanal craft creation & Digital Passports"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* DPP Scan Banner */}
        <Card variant="standard" style={styles.qrScanCard}>
          <View style={styles.qrRow}>
            <View style={styles.qrIconBox}>
              <Ionicons name="qr-code-outline" size={28} color={Palette.headlineDark} />
            </View>
            <View style={styles.qrInfo}>
              <Text style={styles.qrTitle}>{t('shopper.dppScan')}</Text>
              <Text style={styles.qrSubtext}>
                Scan the physical tag on your delivered craft to view artisan video, GPS cluster provenance, and Polygon L2 Merkle proof.
              </Text>
            </View>
          </View>
        </Card>

        {/* Orders List */}
        {orders?.map((order: OrderItem) => (
          <Card key={order.id} variant="white" style={styles.orderCard}>
            <View style={styles.orderTop}>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
              <StatusBadge
                label={order.status.replace('_', ' ').toUpperCase()}
                status={
                  order.status === 'delivered'
                    ? 'active'
                    : order.status === 'in_production'
                    ? 'pending'
                    : 'info'
                }
              />
            </View>

            <Text style={styles.productTitle}>{order.productTitle}</Text>

            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>{order.quantity} item(s)</Text>
              <Text style={styles.amountText}>₹{order.totalAmount.toLocaleString()}</Text>
            </View>

            {order.blockchainVerified && (
              <View style={styles.passportBox}>
                <Ionicons name="shield-checkmark" size={16} color={Palette.primaryContainer} />
                <Text style={styles.passportText}>
                  Digital Product Passport (DPP): {order.dppPassportId || 'DPP-ANCHORED'}
                </Text>
              </View>
            )}

            <Button
              label="View Passport & Maker Story"
              iconName="ribbon-outline"
              variant="secondary"
              onPress={() => {}}
              style={styles.passportBtn}
            />
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
  qrScanCard: {
    marginBottom: Spacing.md,
  },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  qrIconBox: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceWhite,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.borderNeutral,
  },
  qrInfo: {
    flex: 1,
  },
  qrTitle: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  qrSubtext: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 18,
  },
  orderCard: {
    marginBottom: Spacing.md,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  orderNumber: {
    ...Typography.labelMd,
    color: Palette.outline,
  },
  productTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
    marginBottom: Spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  detailText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  amountText: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  passportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.tertiaryGuidance,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
  },
  passportText: {
    ...Typography.labelSm,
    color: Palette.primaryContainer,
  },
  passportBtn: {
    minHeight: 46,
  },
});

