import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import {
  useCoordinatorOverview,
  type PendingProductReview,
} from '@/hooks/queries/use-coordinator';
import { LoadingState, ErrorState, EmptyState, AuthExpiredState } from '@/components/StateView';

export default function CoordinatorOverviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: overview, isLoading, isError, error, refetch } = useCoordinatorOverview();
  const isHindi = i18n.language === 'hi';

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState
          message={isHindi ? 'क्लस्टर अवलोकन लोड हो रहा है...' : 'Loading cluster overview...'}
        />
      </SafeAreaView>
    );
  }

  const isAuthExpired = error && (error.message?.includes('auth') || error.message?.includes('JWT'));
  if (isAuthExpired) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AuthExpiredState />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState
          title={isHindi ? 'डेटा लोड नहीं हो सका' : 'Could not load cluster data'}
          message={error?.message || (isHindi ? 'कृपया पुनः प्रयास करें' : 'Please try again')}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const waitingCount = overview?.totalWaitingCount ?? overview?.pendingReviews.length ?? 3;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Fixed Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Palette.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isHindi ? 'गुणवत्ता निरीक्षण' : 'Quality Inspection'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langPill}
            onPress={toggleLanguage}
            accessibilityLabel="Switch language / भाषा बदलें"
          >
            <Ionicons name="language" size={16} color={Palette.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.langText, !isHindi && styles.langActive]}>EN</Text>
            <Text style={styles.langSep}>|</Text>
            <Text style={[styles.langText, isHindi && styles.langActive]}>हि</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen Audio"
          >
            <Ionicons name="volume-high" size={22} color={Palette.primary} />
          </TouchableOpacity>

          <View style={styles.userBadge}>
            <Ionicons name="person" size={16} color={Palette.onPrimary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Coordinator Profile Strip */}
        <View style={styles.profileStrip}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>SD</Text>
            </View>
            <View style={styles.profileCol}>
              <Text style={styles.coordinatorName}>Coordinator Sunita</Text>
              <Text style={styles.clusterSub}>Bhagirathi SHG #BHAG-04</Text>
            </View>
          </View>

          <View style={styles.stripActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push('/notifications')}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color={Palette.primary} />
              <View style={styles.unreadDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listenChip}
              onPress={handlePlayAudio}
              accessibilityLabel="Listen to cluster summary"
            >
              <Ionicons name="volume-high" size={18} color={Palette.onSecondaryContainer} />
              <Text style={styles.listenChipText}>
                {isHindi ? 'सुनें' : 'Listen'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? `सुनीता जी, 3 हस्तशिल्प उत्पाद निरीक्षण के लिए प्रतीक्षारत हैं। कच्चा सूती कपड़ा कम हो रहा है।`
                : `Sunita, 3 handcrafted products are waiting for quality inspection. Raw cotton cloth is low.`}
            </Text>
          </View>
        )}

        {/* Headline Section */}
        <View style={styles.headlineRow}>
          <View style={styles.headlineLeft}>
            <Text style={styles.mainTitle}>
              {isHindi ? `${waitingCount} उत्पाद प्रतीक्षारत हैं।` : 'Three products are waiting.'}
            </Text>
            <View style={styles.clusterTagRow}>
              <Ionicons name="people-outline" size={18} color={Palette.primary} />
              <Text style={styles.clusterTagName}>
                {overview?.clusterName || 'Bhagirathi Artisan Cluster'}
              </Text>
            </View>
          </View>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>{waitingCount}</Text>
          </View>
        </View>

        {/* Review Cards Stack */}
        <View style={styles.cardsStack}>
          {overview?.pendingReviews.map((review: PendingProductReview) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewCardTop}>
                <Image
                  source={{ uri: review.imageUrl }}
                  style={styles.productThumb}
                  resizeMode="cover"
                />
                <View style={styles.reviewDetailsCol}>
                  {review.badgeLabel && (
                    <View
                      style={[
                        styles.badgePill,
                        review.badgeType === 'ai'
                          ? styles.aiBadge
                          : styles.quotaBadge,
                      ]}
                    >
                      {review.badgeType === 'ai' && (
                        <Ionicons
                          name="sparkles"
                          size={12}
                          color={Palette.primary}
                          style={{ marginRight: 4 }}
                        />
                      )}
                      <Text
                        style={[
                          styles.badgeText,
                          review.badgeType === 'ai'
                            ? styles.aiBadgeText
                            : styles.quotaBadgeText,
                        ]}
                      >
                        {review.badgeLabel}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.productTitle}>{review.title}</Text>

                  <View style={styles.submittedRow}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Palette.onSurfaceVariant}
                    />
                    <Text style={styles.submittedText}>
                      {review.artisanName} · {review.submittedAt}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Button: 56dp height */}
              <TouchableOpacity
                style={styles.reviewButton}
                onPress={() => router.push('/coordinator/approvals')}
                accessibilityLabel={`Review ${review.artisanName}'s craft`}
                activeOpacity={0.88}
              >
                <View style={styles.reviewBtnContent}>
                  <Ionicons name="checkbox-outline" size={20} color={Palette.primary} />
                  <Text style={styles.reviewBtnText}>
                    {review.id === 'rev-001' ? 'Review (M-17)' : 'Review'}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={Palette.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Stock Warning Row (Kendra) */}
        <View style={styles.stockAlertBox}>
          <View style={styles.stockAlertTop}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="warning" size={20} color={Palette.errorTerracotta} />
            </View>
            <View style={styles.stockTextCol}>
              <Text style={styles.stockAlertTitle}>
                {isHindi ? 'केंद्र पर कच्चा माल कम है' : 'Stock is low at Kendra'}
              </Text>
              <Text style={styles.stockAlertBody}>
                {isHindi
                  ? 'कच्चा सूती कपड़ा (12m शेष) और प्राकृतिक नील डाई समाप्त।'
                  : 'Raw cotton cloth (12m left) and Natural indigo dye depleted.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.seeStockBtn}
            onPress={() => router.push('/(tabs)/coordinator/inventory')}
            accessibilityLabel="See stock inventory"
            activeOpacity={0.88}
          >
            <View style={styles.reviewBtnContent}>
              <Ionicons name="cube-outline" size={20} color={Palette.errorTerracotta} />
              <Text style={styles.seeStockBtnText}>
                {isHindi ? 'स्टॉक देखें' : 'See stock'}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Palette.errorTerracotta} />
          </TouchableOpacity>
        </View>

        {/* Reassuring Cluster Note */}
        <View style={styles.clusterNoteBox}>
          <View style={styles.noteVerifiedCircle}>
            <Ionicons name="checkmark-done" size={18} color={Palette.onPrimary} />
          </View>
          <View style={styles.clusterNoteCol}>
            <Text style={styles.clusterNoteText}>
              <Text style={styles.clusterNoteBold}>Quick cluster note: </Text>
              {isHindi
                ? 'इस सप्ताह 8 उत्पाद स्वीकृत हुए। सभी विवरण डेस्कटॉप वर्कशॉप में सिंक हो गए हैं।'
                : '8 products approved this week. All entries synced to desktop Workroom.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.surface,
  },
  topHeader: {
    height: 64,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainerHigh,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  langPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  langActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  langSep: {
    marginHorizontal: 4,
    color: Palette.outlineVariant,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.errorTerracotta,
  },
  userBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
  },
  profileStrip: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.headlineSm,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  profileCol: {
    flexDirection: 'column',
  },
  coordinatorName: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
  },
  clusterSub: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  stripActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listenChip: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenChipText: {
    ...Typography.labelMd,
    color: Palette.onSecondaryContainer,
    fontWeight: '700',
  },
  audioToast: {
    backgroundColor: Palette.primary,
    padding: Spacing.md,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  audioToastText: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    flex: 1,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headlineLeft: {
    flex: 1,
  },
  mainTitle: {
    ...Typography.headlineLg,
    color: Palette.primary,
    lineHeight: 30,
  },
  clusterTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clusterTagName: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  counterBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  counterBadgeText: {
    ...Typography.labelLg,
    color: Palette.onSecondaryContainer,
    fontWeight: '700',
  },
  cardsStack: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reviewCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  reviewCardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  productThumb: {
    width: 64,
    height: 72,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  reviewDetailsCol: {
    flex: 1,
  },
  badgePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginBottom: 4,
  },
  aiBadge: {
    backgroundColor: Palette.tertiaryGuidance,
  },
  quotaBadge: {
    backgroundColor: Palette.surfaceContainerHigh,
  },
  badgeText: {
    ...Typography.labelSm,
  },
  aiBadgeText: {
    color: Palette.primary,
    fontWeight: '700',
  },
  quotaBadgeText: {
    color: Palette.onSurfaceVariant,
  },
  productTitle: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
  },
  submittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  submittedText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  reviewButton: {
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  reviewBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  stockAlertBox: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.15)',
  },
  stockAlertTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  warningIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockTextCol: {
    flex: 1,
  },
  stockAlertTitle: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
  },
  stockAlertBody: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  seeStockBtn: {
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    ...Shadows.sm,
  },
  seeStockBtnText: {
    ...Typography.labelLg,
    color: Palette.errorTerracotta,
    fontWeight: '700',
  },
  clusterNoteBox: {
    backgroundColor: 'rgba(192, 236, 216, 0.4)',
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  noteVerifiedCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterNoteCol: {
    flex: 1,
  },
  clusterNoteText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    lineHeight: 20,
  },
  clusterNoteBold: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
});
