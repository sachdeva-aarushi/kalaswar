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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const orderNumber = id || 'KO-2026-0034';

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Navigation & Spoken Help Bar */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Palette.onSurface} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={styles.langPill}
              onPress={toggleLanguage}
              accessibilityLabel="Change language"
            >
              <Text style={styles.langText}>EN | हि</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listenPill}
              onPress={handlePlayAudio}
              accessibilityLabel="Listen"
            >
              <Ionicons name="volume-high" size={20} color={Palette.onSecondaryFixed} />
              <Text style={styles.listenText}>Listen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Playing State Banner */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="pulse" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              Coordinator Sunita speaking: "Details of Order {orderNumber}. 150 pieces allocated to your unit."
            </Text>
            <TouchableOpacity onPress={() => setIsPlayingAudio(false)}>
              <Ionicons name="close" size={18} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Headline */}
        <View style={styles.titleSection}>
          <View style={styles.activeTag}>
            <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
            <Text style={styles.activeTagText}>Active Production</Text>
          </View>
          <Text style={styles.orderHeading}>Order {orderNumber}</Text>
          <Text style={styles.orderSubHeading}>Order Details</Text>
        </View>

        {/* Craft Product Showcase (4:5 Aspect Ratio) */}
        <View style={styles.showcaseFrame}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
            }}
            style={styles.showcaseImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlayBadgeRow}>
            <View style={styles.quantityBadge}>
              <Ionicons name="cube-outline" size={16} color={Palette.secondary} />
              <Text style={styles.quantityBadgeText}>500 pastel laptop sleeves</Text>
            </View>
            <View style={styles.batchBadge}>
              <Text style={styles.batchBadgeText}>SHG Batch #4</Text>
            </View>
          </View>
        </View>

        {/* Assignment Overview Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Order</Text>
            <Text style={styles.metaValue}>500 pastel laptop sleeves</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Collective</Text>
            <View style={styles.collectiveRow}>
              <Ionicons name="people-outline" size={18} color={Palette.secondary} />
              <Text style={styles.metaValue}>3 collectives · Aerev Tech</Text>
            </View>
            <Text style={styles.collectiveSub}>Co-produced by 3 craft units</Text>
          </View>

          {/* Your Share Callout */}
          <View style={styles.shareBox}>
            <View>
              <Text style={styles.shareLabel}>YOUR SHARE</Text>
              <Text style={styles.shareAmount}>150 pieces</Text>
              <Text style={styles.shareSub}>Allocated to your craft unit</Text>
            </View>
            <View style={styles.shareIconBox}>
              <Ionicons name="hardware-chip-outline" size={24} color={Palette.onPrimary} />
            </View>
          </View>

          <View style={styles.dueDateRow}>
            <Text style={styles.metaLabel}>DUE DATE</Text>
            <View style={styles.dateBadge}>
              <Ionicons name="time-outline" size={16} color={Palette.secondary} />
              <Text style={styles.dateBadgeText}>About 20 Nov</Text>
            </View>
          </View>

          <View style={styles.disclaimerRow}>
            <Ionicons name="information-circle-outline" size={16} color={Palette.secondary} />
            <Text style={styles.disclaimerText}>
              Dates are approximate and depend on climate and material batch arrival.
            </Text>
          </View>
        </View>

        {/* Vertical Milestone Timeline Tracker */}
        <View style={styles.milestonesCard}>
          <View style={styles.milestoneHeader}>
            <View>
              <Text style={styles.milestoneTitle}>Production Milestones</Text>
              <Text style={styles.milestoneSub}>Overall progress & stage tracking</Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>Step 3 of 5</Text>
            </View>
          </View>

          <View style={styles.timelineList}>
            {/* Step 1: Done */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeDone]}>
                <Ionicons name="checkmark" size={18} color={Palette.onPrimary} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.stepTitle}>Materials ready</Text>
                  <Text style={styles.stepDateDone}>10 Nov</Text>
                </View>
                <Text style={styles.stepStatusDone}>✓ Done (fabric & threads received)</Text>
              </View>
            </View>

            {/* Step 2: Done */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeDone]}>
                <Ionicons name="checkmark" size={18} color={Palette.onPrimary} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.stepTitle}>Sample approved</Text>
                  <Text style={styles.stepDateDone}>14 Nov</Text>
                </View>
                <Text style={styles.stepStatusDone}>✓ Done (master sample signed off)</Text>
              </View>
            </View>

            {/* Step 3: In Progress (Active) */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodeActive]}>
                <Ionicons name="build" size={18} color={Palette.onSecondaryContainer} />
              </View>
              <View style={[styles.timelineContent, styles.contentActive]}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.stepTitleBold}>Making & stitching</Text>
                  <View style={styles.inProgressBadge}>
                    <Text style={styles.inProgressText}>In progress</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressTracker}>
                  <View style={styles.progressNumbersRow}>
                    <Text style={styles.progressCount}>72 of 150 ready</Text>
                    <Text style={styles.progressPercent}>48%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: '48%' }]} />
                  </View>
                </View>
                <Text style={styles.stepNotes}>
                  72 pieces completed, 78 pieces currently in stitching
                </Text>
              </View>
            </View>

            {/* Step 4: Quality Check (Pending) */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodePending]}>
                <Ionicons name="time-outline" size={18} color={Palette.onSurfaceVariant} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.stepTitlePending}>Quality check</Text>
                  <Text style={styles.stepUpcoming}>Upcoming</Text>
                </View>
                <Text style={styles.stepNotes}>
                  Final seam, finish, and zipper inspection at cluster Kendra
                </Text>
              </View>
            </View>

            {/* Step 5: Dispatch (Pending) */}
            <View style={styles.timelineItem}>
              <View style={[styles.timelineNode, styles.nodePending]}>
                <Ionicons name="car-outline" size={18} color={Palette.onSurfaceVariant} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.stepTitlePending}>Dispatch</Text>
                  <Text style={styles.stepUpcoming}>Upcoming</Text>
                </View>
                <Text style={styles.stepNotes}>
                  Batched packing and handover to main collection center
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Kendra Support Pill */}
        <View style={styles.supportPill}>
          <View style={styles.supportIconBox}>
            <Ionicons name="headset-outline" size={24} color={Palette.onPrimary} />
          </View>
          <View style={styles.supportCol}>
            <Text style={styles.supportTag}>Kendra Support</Text>
            <Text style={styles.supportMain}>Questions? Coordinator Sunita is at Kendra today</Text>
            <Text style={styles.supportSub}>Visit cluster desk or tap Listen for voice instructions</Text>
          </View>
        </View>

        {/* Dignified Note */}
        <View style={styles.dignityNote}>
          <Ionicons name="heart-outline" size={18} color={Palette.primary} />
          <Text style={styles.dignityText}>
            Handcrafted with pride & sustainable livelihood
          </Text>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    ...Typography.labelMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  langPill: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
  },
  langText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
    fontWeight: '700',
  },
  listenPill: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenText: {
    ...Typography.labelMd,
    color: Palette.onSecondaryFixed,
    fontWeight: '700',
  },
  audioToast: {
    backgroundColor: Palette.primary,
    borderRadius: Radii.lg,
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
  titleSection: {
    gap: 2,
  },
  activeTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginBottom: 4,
  },
  activeTagText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderHeading: {
    ...Typography.headlineLg,
    color: Palette.primary,
  },
  orderSubHeading: {
    ...Typography.headlineSm,
    color: Palette.onSurfaceVariant,
  },
  showcaseFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainer,
    ...Shadows.sm,
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    ...Shadows.sm,
  },
  quantityBadgeText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  batchBadge: {
    backgroundColor: 'rgba(35, 76, 61, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  batchBadgeText: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
  },
  metaCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  metaRow: {
    gap: 2,
  },
  metaLabel: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
  },
  metaValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  collectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectiveSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginLeft: 24,
  },
  shareBox: {
    backgroundColor: Palette.primaryFixed,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareLabel: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  shareAmount: {
    ...Typography.headlineMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  shareSub: {
    ...Typography.bodySm,
    color: Palette.primary,
  },
  shareIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.md,
  },
  dateBadgeText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  disclaimerText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  milestonesCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  milestoneSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  stepBadge: {
    backgroundColor: Palette.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  stepBadgeText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryFixed,
    fontWeight: '700',
  },
  timelineList: {
    gap: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timelineNode: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  nodeDone: {
    backgroundColor: Palette.primary,
  },
  nodeActive: {
    backgroundColor: Palette.secondaryContainer,
  },
  nodePending: {
    backgroundColor: Palette.surfaceContainerHigh,
  },
  timelineContent: {
    flex: 1,
    gap: 2,
  },
  contentActive: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepTitle: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  stepTitleBold: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '700',
  },
  stepTitlePending: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
  },
  stepDateDone: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  stepUpcoming: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  stepStatusDone: {
    ...Typography.bodySm,
    color: Palette.primary,
  },
  inProgressBadge: {
    backgroundColor: Palette.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  inProgressText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryFixed,
    fontWeight: '700',
  },
  progressTracker: {
    marginTop: 6,
    gap: 4,
  },
  progressNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCount: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '600',
  },
  progressPercent: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Palette.secondary,
  },
  stepNotes: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 4,
  },
  supportPill: {
    backgroundColor: Palette.tertiaryGuidance,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  supportIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCol: {
    flex: 1,
  },
  supportTag: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  supportMain: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  supportSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    fontSize: 12,
  },
  dignityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  dignityText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
});

