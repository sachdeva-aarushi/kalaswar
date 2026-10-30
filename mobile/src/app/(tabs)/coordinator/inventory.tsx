import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';

const INVENTORY_ITEMS = [
  {
    id: 'mat-1',
    name: 'Raw Mulberry Silk Hanks (20/22 denier)',
    category: 'Yarn & Thread',
    stock: '14.5 kg',
    reorderLevel: '5.0 kg',
    status: 'adequate',
    location: 'Shed A - Bin 3',
  },
  {
    id: 'mat-2',
    name: 'Natural Terracotta Clay (Purified)',
    category: 'Pottery & Sculpture',
    stock: '120 kg',
    reorderLevel: '50 kg',
    status: 'adequate',
    location: 'Clay Prep Shed',
  },
  {
    id: 'mat-3',
    name: 'Real Brass Zari Metallic Thread',
    category: 'Embroidery & Borders',
    stock: '1.2 kg',
    reorderLevel: '2.5 kg',
    status: 'low',
    location: 'Secure Store - Lock 1',
  },
  {
    id: 'mat-4',
    name: 'Organic Indigo Dye Paste',
    category: 'Natural Pigments',
    stock: '6.0 kg',
    reorderLevel: '3.0 kg',
    status: 'adequate',
    location: 'Dyeing Vat Room',
  },
];

export default function CoordinatorInventoryScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.coordinator.inventory')}
        subtitle={t('coordinator.stockLevel')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Action Header */}
        <View style={styles.actionHeader}>
          <Button
            label={t('coordinator.newIntake')}
            iconName="add-circle-outline"
            variant="primary"
            onPress={() => {}}
            style={styles.intakeBtn}
          />
        </View>

        {/* Stock Items List */}
        {INVENTORY_ITEMS.map((item) => (
          <Card key={item.id} variant="standard" style={styles.itemCard}>
            <View style={styles.cardHeader}>
              <View style={styles.titleArea}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>
              <StatusBadge
                label={item.status === 'low' ? 'Low Stock' : 'In Stock'}
                status={item.status === 'low' ? 'alert' : 'active'}
              />
            </View>

            <View style={styles.stockDetailsRow}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Available Stock</Text>
                <Text style={styles.detailValue}>{item.stock}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Reorder Level</Text>
                <Text style={styles.detailValue}>{item.reorderLevel}</Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Storage Bay</Text>
                <Text style={styles.detailValue}>{item.location}</Text>
              </View>
            </View>

            <View style={styles.itemActionRow}>
              <Button
                label="Log Consumption"
                variant="secondary"
                onPress={() => {}}
                style={styles.logBtn}
              />
              <Button
                label="Order More"
                variant="ghost"
                onPress={() => {}}
                style={styles.reorderBtn}
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
  actionHeader: {
    marginBottom: Spacing.md,
  },
  intakeBtn: {
    width: '100%',
  },
  itemCard: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleArea: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemName: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
  },
  itemCategory: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  stockDetailsRow: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceWhite,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  detailBox: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  detailValue: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
    marginTop: 2,
  },
  itemActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  logBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  reorderBtn: {
    minHeight: 44,
  },
});

