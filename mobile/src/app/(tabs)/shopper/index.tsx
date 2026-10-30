import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useProducts, type ProductItem } from '@/hooks/queries/use-products';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';

export default function ShopperCatalogScreen() {
  const { t } = useTranslation();
  const { data: products, isLoading } = useProducts();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('shopper.title')}
        subtitle={t('shopper.subtitle')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* MakePossible Custom Gift Banner */}
        <Card variant="ai" style={styles.bannerCard}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIcon}>
              <Ionicons name="sparkles" size={24} color={Palette.primaryContainer} />
            </View>
            <View style={styles.bannerText}>
              <Text style={styles.bannerHeading}>
                {t('shopper.customRequestBanner')}
              </Text>
              <Text style={styles.bannerSub}>
                MakePossible connects directly with SHG master artisans for custom dimensions and bespoke motifs.
              </Text>
            </View>
          </View>
        </Card>

        {/* Catalog Section Header */}
        <View style={styles.sectionHeader}>
          <Ionicons name="cube-outline" size={20} color={Palette.headlineDark} />
          <Text style={styles.sectionTitle}>{t('shopper.featured')}</Text>
        </View>

        {/* Product Cards Grid */}
        {products?.map((product: ProductItem) => (
          <Card key={product.id} variant="white" style={styles.productCard}>
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />

            <View style={styles.productBody}>
              <View style={styles.productTop}>
                <Text style={styles.categoryText}>{product.category}</Text>
                {product.gi_tagged && (
                  <View style={styles.giBadge}>
                    <Ionicons name="ribbon-outline" size={12} color={Palette.secondary} />
                    <Text style={styles.giText}>GI Certified</Text>
                  </View>
                )}
              </View>

              <Text style={styles.productTitle}>{product.title}</Text>
              <Text style={styles.clusterText}>{product.cluster}</Text>

              {/* Fair Price & Wage Breakdown */}
              <View style={styles.priceContainer}>
                <View>
                  <Text style={styles.priceLabel}>Price</Text>
                  <Text style={styles.priceValue}>₹{product.price.toLocaleString()}</Text>
                </View>

                <View style={styles.wageHighlightBox}>
                  <Ionicons name="heart" size={14} color={Palette.primaryContainer} />
                  <Text style={styles.wageHighlightText}>
                    ₹{product.artisan_share} (68%) to {product.artisan_name}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button
                  label={t('shopper.addToBag')}
                  iconName="bag-add-outline"
                  variant="primary"
                  onPress={() => {}}
                  style={styles.addBtn}
                />
              </View>
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
  bannerCard: {
    marginBottom: Spacing.md,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerText: {
    flex: 1,
  },
  bannerHeading: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  bannerSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
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
  productCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  productImage: {
    width: '100%',
    height: 180,
    backgroundColor: Palette.surfaceContainer,
  },
  productBody: {
    padding: Spacing.md,
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    ...Typography.labelSm,
    color: Palette.outline,
    textTransform: 'uppercase',
  },
  giBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainer,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radii.sm,
  },
  giText: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
    fontSize: 10,
  },
  productTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
    marginVertical: 4,
  },
  clusterText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surfaceCard,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  priceLabel: {
    ...Typography.labelSm,
    color: Palette.outline,
  },
  priceValue: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
  },
  wageHighlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.tertiaryGuidance,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.sm,
  },
  wageHighlightText: {
    ...Typography.labelSm,
    color: Palette.primaryContainer,
    fontWeight: '700',
  },
  actionRow: {
    marginTop: Spacing.xs,
  },
  addBtn: {
    width: '100%',
  },
});

