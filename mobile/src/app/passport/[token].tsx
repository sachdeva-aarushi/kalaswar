import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { usePassport } from '@/hooks/queries/use-passport';

export default function PassportScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { isHindi, toggleLanguage } = useLanguage();

  const passportToken = Array.isArray(token) ? token[0] : token || 'dpp-demo-kantha-001';
  const { data: passport, isLoading, isError, refetch } = usePassport(passportToken);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Palette.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Palette.primary} />
            <Text style={styles.headerBadgeText}>DPP PASSPORT</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.langPill}
          onPress={toggleLanguage}
          accessibilityLabel="Switch language"
        >
          <Text style={styles.langPillText}>{isHindi ? 'EN' : 'हि'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'पासपोर्ट डेटा लोड हो रहा है...' : 'Verifying cryptographic passport...'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Palette.errorTerracotta} />
            <Text style={styles.errorTitle}>
              {isHindi ? 'पासपोर्ट लोड नहीं हो सका' : 'Passport Verification Error'}
            </Text>
            <Text style={styles.errorSub}>
              {isHindi
                ? 'टोकन की जांच करें या इंटरनेट कनेक्शन देखें।'
                : 'Unable to resolve passport token. Please retry.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>
                {isHindi ? 'पुनः प्रयास करें' : 'Retry Verification'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loaded Passport Content */}
        {!isLoading && passport && (
          <>
            {/* Authenticity Hero Banner */}
            <View style={styles.heroBanner}>
              <View style={styles.heroTopRow}>
                <View style={styles.shieldCircle}>
                  <Ionicons name="ribbon" size={28} color={Palette.secondaryFixed} />
                </View>
                <View style={styles.verifiedTag}>
                  <Ionicons name="checkmark-circle" size={16} color={Palette.primaryFixed} />
                  <Text style={styles.verifiedTagText}>
                    {isHindi ? 'प्रमाणित हस्तशिल्प' : 'Verified Authentic'}
                  </Text>
                </View>
              </View>

              <Text style={styles.productTitle}>{passport.product_title}</Text>
              <Text style={styles.craftCategory}>{passport.craft_category}</Text>

              <View style={styles.tokenPill}>
                <Ionicons name="finger-print-outline" size={14} color={Palette.secondaryFixed} />
                <Text style={styles.tokenPillText}>TOKEN: {passport.token}</Text>
              </View>
            </View>

            {/* Maker & Cluster Identity Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={22} color={Palette.primary} />
                <Text style={styles.cardHeading}>
                  {isHindi ? 'शिल्पकार और क्लस्टर पहचान' : 'Maker & Cluster Provenance'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isHindi ? 'कारीगर' : 'Artisan Maker'}</Text>
                <Text style={styles.infoValue}>{passport.maker_display_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isHindi ? 'समूह / क्लस्टर' : 'SHG Cluster'}</Text>
                <Text style={styles.infoValue}>{passport.cluster_name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{isHindi ? 'क्षेत्र / जीपीएस' : 'Craft Origin'}</Text>
                <Text style={styles.infoValue}>{passport.gps_region}</Text>
              </View>

              <View style={styles.privacyNote}>
                <Ionicons name="lock-closed" size={14} color={Palette.outline} />
                <Text style={styles.privacyNoteText}>{passport.privacy_policy_notice}</Text>
              </View>
            </View>

            {/* Guaranteed Fair Wage Direct Share */}
            <View style={styles.wageCard}>
              <View style={styles.wageHeader}>
                <Ionicons name="cash-outline" size={24} color={Palette.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.wageTitle}>
                    {isHindi ? 'सीधा शिल्पकार पारिश्रमिक' : 'Guaranteed Artisan Share'}
                  </Text>
                  <Text style={styles.wageSub}>
                    {isHindi
                      ? 'बिक्री मूल्य का पारदर्शी सीधा बैंक भुगतान'
                      : 'Direct-to-bank fair wage share without middlemen'}
                  </Text>
                </View>
              </View>

              <View style={styles.wageStatBox}>
                <Text style={styles.wageStatNumber}>{passport.wage_split_pct}%</Text>
                <Text style={styles.wageStatDesc}>
                  {isHindi ? 'सीधा भुगतान किया गया' : 'Direct Artisan Wage'}
                </Text>
              </View>
            </View>

            {/* Cryptographic Layer-2 Ledger Proof */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="cube-outline" size={22} color={Palette.primary} />
                <Text style={styles.cardHeading}>
                  {isHindi ? 'ब्लॉकचेन सत्यापन प्रमाण' : 'Layer-2 Provenance Ledger'}
                </Text>
              </View>

              <View style={styles.cryptoBlock}>
                <Text style={styles.cryptoLabel}>MERKLE ROOT</Text>
                <Text style={styles.cryptoCode} numberOfLines={2}>
                  {passport.merkle_root}
                </Text>
              </View>

              {passport.polygon_tx_hash && (
                <View style={styles.cryptoBlock}>
                  <Text style={styles.cryptoLabel}>POLYGON TRANSACTION HASH</Text>
                  <Text style={styles.cryptoCode} numberOfLines={2}>
                    {passport.polygon_tx_hash}
                  </Text>
                </View>
              )}

              <View style={styles.chainBadgeRow}>
                <View style={styles.chainPill}>
                  <Ionicons name="link" size={14} color={Palette.primary} />
                  <Text style={styles.chainPillText}>{passport.chain.toUpperCase()}</Text>
                </View>

                {passport.committed_at && (
                  <Text style={styles.committedDateText}>
                    Committed {new Date(passport.committed_at).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {passport.explorer_url && (
                <TouchableOpacity
                  style={styles.explorerBtn}
                  onPress={() => Linking.openURL(passport.explorer_url!)}
                >
                  <Ionicons name="open-outline" size={18} color={Palette.primary} />
                  <Text style={styles.explorerBtnText}>
                    {isHindi ? 'पॉलीगॉन एक्सप्लोरर पर देखें' : 'View on PolygonScan'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Official Trust Footnote */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={20} color={Palette.primary} />
              <Text style={styles.trustBadgeText}>
                {isHindi
                  ? 'कलास्वर डिजिटल उत्पाद पासपोर्ट · प्रामाणिक और अपरिवर्तनीय'
                  : 'Kalaswar Digital Product Passport · Tamper-proof & Verified'}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    height: 60,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.primary,
    letterSpacing: 1,
  },
  langPill: {
    minWidth: 44,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  centerContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    marginTop: Spacing.sm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.errorTerracotta,
  },
  errorSub: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  heroBanner: {
    backgroundColor: Palette.primaryContainer,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shieldCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  verifiedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.onPrimary,
    lineHeight: 28,
  },
  craftCategory: {
    fontSize: 14,
    color: Palette.secondaryFixed,
    fontWeight: '600',
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.md,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tokenPillText: {
    fontSize: 11,
    color: Palette.secondaryFixed,
    fontWeight: '700',
  },
  card: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainerHigh,
    paddingBottom: Spacing.sm,
  },
  cardHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
    textAlign: 'right',
    maxWidth: '65%',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceContainerLow,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: 4,
  },
  privacyNoteText: {
    fontSize: 11,
    color: Palette.outline,
    flex: 1,
  },
  wageCard: {
    backgroundColor: Palette.secondaryContainer,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  wageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  wageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  wageSub: {
    fontSize: 12,
    color: Palette.onSecondaryContainer,
    opacity: 0.9,
    marginTop: 2,
  },
  wageStatBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  wageStatNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Palette.secondary,
  },
  wageStatDesc: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  cryptoBlock: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: 4,
  },
  cryptoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  cryptoCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Palette.primary,
  },
  chainBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  chainPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.primary,
  },
  committedDateText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  explorerBtn: {
    minHeight: 52,
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
  },
  explorerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLow,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
});
