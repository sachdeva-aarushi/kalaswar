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
import { useProducts, type ProductItem } from '@/hooks/queries/use-products';
import { LoadingState, ErrorState, EmptyState, AuthExpiredState } from '@/components/StateView';

export default function ArtisanProductsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isHindi = i18n.language === 'hi';
  const { data: products, isLoading, isError, error, refetch } = useProducts();

  const [activeTab, setActiveTab] = useState<'all' | 'waiting'>('all');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message={isHindi ? 'सामान लोड हो रहा है...' : 'Loading artisan products...'} />
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
          title={isHindi ? 'सामान लोड नहीं हो सका' : 'Could not load products'}
          message={error?.message || (isHindi ? 'कृपया पुनः प्रयास करें' : 'Please try again')}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  const allItems = products ?? [];
  const waitingItems = allItems.filter(
    (p) => p.status === 'in_review' || p.status === 'draft'
  );
  const displayedItems = activeTab === 'all' ? allItems : waitingItems;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Fixed Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="leaf-outline" size={24} color={Palette.onPrimary} />
          </View>
          <Text style={styles.headerTitle}>M-06: Products</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen Audio"
          >
            <Ionicons name="volume-high" size={24} color={Palette.secondary} />
          </TouchableOpacity>
          <View style={styles.userBadge}>
            <Ionicons name="person" size={16} color={Palette.primary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline / Sync Status Header Bar */}
        <View style={styles.syncBar}>
          <View style={styles.syncLeft}>
            <Ionicons name="cloud-done" size={20} color={Palette.primary} />
            <Text style={styles.syncTitle}>Saved on phone · फ़ोन पर सुरक्षित</Text>
          </View>
          <View style={styles.syncRight}>
            <View style={styles.syncDot} />
            <Text style={styles.syncGroupText}>SHG Group 4</Text>
          </View>
        </View>

        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? `आपके कुल ${allItems.length} उत्पाद सूचीबद्ध हैं। ${waitingItems.length} उत्पाद समीक्षा में हैं।`
                : `You have ${allItems.length} products listed. ${waitingItems.length} are in coordinator review.`}
            </Text>
          </View>
        )}

        {/* Header Title & Audio Helper */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.mainTitle}>My products · मेरे सामान</Text>
            <Text style={styles.subTitle}>
              {allItems.length} items listed · कुल {allItems.length} सामान
            </Text>
          </View>
          <TouchableOpacity
            style={styles.listenBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen aloud"
          >
            <Ionicons name="volume-high" size={20} color={Palette.primary} />
            <Text style={styles.listenBtnText}>सुनें · Listen</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Tab Controls (All vs Waiting) */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'all' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'all' }}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={activeTab === 'all' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'all' && styles.segmentTextActive,
              ]}
            >
              All ({allItems.length}) · सब
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'waiting' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('waiting')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'waiting' }}
          >
            <Ionicons
              name="hourglass-outline"
              size={18}
              color={activeTab === 'waiting' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'waiting' && styles.segmentTextActive,
              ]}
            >
              Waiting ({waitingItems.length}) · समीक्षा में
            </Text>
          </TouchableOpacity>
        </View>

        {/* Product Items List */}
        {displayedItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={36} color={Palette.secondary} />
            <Text style={styles.emptyTitle}>No items pending · कोई सामान बाकी नहीं</Text>
            <Text style={styles.emptySub}>
              All submitted items are updated. Click below to add a new handmade product.
            </Text>
          </View>
        ) : (
          <View style={styles.productsList}>
            {displayedItems.map((item: ProductItem, index) => {
              const isWaiting = item.status === 'in_review';
              const isApproved = item.status === 'published';
              const isDraft = item.status === 'draft';
              const hasChangeFeedback = index === 1;

              return (
                <View key={item.id} style={styles.productCard}>
                  <View style={styles.productCardTop}>
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.productThumb}
                      resizeMode="cover"
                    />

                    <View style={styles.productCardDetails}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <TouchableOpacity
                          style={styles.rowAudioBtn}
                          onPress={handlePlayAudio}
                          accessibilityLabel="Audio read row"
                        >
                          <Ionicons name="volume-high-outline" size={18} color={Palette.secondary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.hindiSub}>
                        {index === 0
                          ? 'हाथ से कढ़ाई किया कुशन कवर'
                          : index === 1
                          ? 'पेस्टल लैपटॉप स्लीव'
                          : index === 2
                          ? 'कांथा कढ़ाई झोला'
                          : 'सिल्क ब्रोकेड पाउच'}
                      </Text>

                      {/* Status Badges */}
                      <View style={styles.badgesRow}>
                        {isWaiting && !hasChangeFeedback && (
                          <View style={styles.waitingBadge}>
                            <Ionicons name="time-outline" size={14} color={Palette.onSecondaryContainer} />
                            <Text style={styles.waitingBadgeText}>
                              Waiting for review · समीक्षा जारी
                            </Text>
                          </View>
                        )}

                        {hasChangeFeedback && (
                          <View style={styles.alertBadge}>
                            <Ionicons name="alert-circle" size={14} color={Palette.errorTerracotta} />
                            <Text style={styles.alertBadgeText}>
                              Changes needed · बदलाव चाहिए
                            </Text>
                          </View>
                        )}

                        {isApproved && (
                          <View style={styles.approvedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
                            <Text style={styles.approvedBadgeText}>
                              Approved · स्वीकृत
                            </Text>
                          </View>
                        )}

                        {isDraft && (
                          <View style={styles.draftBadge}>
                            <Ionicons name="create-outline" size={14} color={Palette.onSurfaceVariant} />
                            <Text style={styles.draftBadgeText}>
                              Draft · कच्चा मसौदा
                            </Text>
                          </View>
                        )}

                        {/* Secondary Sync Tag */}
                        <View style={styles.syncTag}>
                          <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
                          <Text style={styles.syncTagText}>
                            {isDraft ? 'Not sent yet' : 'Saved · सुरक्षित'}
                          </Text>
                        </View>
                      </View>

                      {/* Coordinator feedback bubble */}
                      {hasChangeFeedback && (
                        <View style={styles.feedbackBubble}>
                          <Ionicons name="chatbubble" size={15} color={Palette.errorTerracotta} />
                          <Text style={styles.feedbackBubbleText}>
                            <Text style={{ fontWeight: '700' }}>Sunita: </Text>Photo is a bit dark (फ़ोटो धुंधली है)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* SHG Tips & Guidance Banner */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconBox}>
            <Ionicons name="bulb-outline" size={22} color={Palette.onPrimary} />
          </View>
          <View style={styles.tipCol}>
            <Text style={styles.tipTitle}>Good lighting tip · रोशनी की सलाह</Text>
            <Text style={styles.tipBody}>
              Place handcrafted items by a bright morning window for natural color clarity.
            </Text>
          </View>
        </View>

        {/* Sticky Primary Action: Add Product (56dp target) */}
        <View style={styles.floatingActionContainer}>
          <TouchableOpacity
            style={styles.addProductBtn}
            onPress={() => router.push('/artisan/camera')}
            accessibilityLabel="Add new product with camera"
            activeOpacity={0.88}
          >
            <Ionicons name="camera-outline" size={24} color={Palette.onPrimary} />
            <Text style={styles.addProductText}>New product · नया सामान जोड़ें</Text>
          </TouchableOpacity>
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
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(8, 53, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
    gap: Spacing.md,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    ...Shadows.sm,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTitle: {
    ...Typography.bodySm,
    color: Palette.primary,
    fontWeight: '600',
  },
  syncRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondary,
  },
  syncGroupText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  audioToast: {
    backgroundColor: Palette.primary,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  audioToastText: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainTitle: {
    ...Typography.headlineLg,
    color: Palette.primary,
  },
  subTitle: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  listenBtn: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenBtnText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Palette.surface,
    ...Shadows.sm,
  },
  segmentText: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  productsList: {
    gap: Spacing.sm,
  },
  productCard: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  productCardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  productCardDetails: {
    flex: 1,
  },
  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productTitle: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
    flex: 1,
    fontSize: 16,
  },
  rowAudioBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hindiSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  waitingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryFixed,
  },
  waitingBadgeText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryContainer,
    fontWeight: '600',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  alertBadgeText: {
    ...Typography.labelSm,
    color: Palette.errorTerracotta,
    fontWeight: '700',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.tertiaryGuidance,
  },
  approvedBadgeText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '600',
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  draftBadgeText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontWeight: '600',
  },
  syncTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  syncTagText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  feedbackBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    marginTop: 8,
  },
  feedbackBubbleText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    textAlign: 'center',
  },
  emptySub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 260,
  },
  tipCard: {
    backgroundColor: Palette.tertiaryGuidance,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  tipIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCol: {
    flex: 1,
  },
  tipTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontSize: 15,
  },
  tipBody: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    marginTop: 2,
    lineHeight: 18,
  },
  floatingActionContainer: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  addProductBtn: {
    minHeight: 56,
    width: '100%',
    backgroundColor: Palette.primary,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  addProductText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
});

