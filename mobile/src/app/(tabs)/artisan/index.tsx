import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useArtisanTasks } from '@/hooks/queries/use-artisan-tasks';
import { useEarnings } from '@/hooks/queries/use-earnings';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LoadingState, ErrorState, AuthExpiredState } from '@/components/StateView';
import { DemoSwitcher } from '@/components/DemoSwitcher';

export default function ArtisanHomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isHindi, toggleLanguage } = useLanguage();
  const { data: tasks, isLoading, isError, error, refetch } = useArtisanTasks();
  const { data: earnings } = useEarnings();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="शिल्प कार्यकक्ष लोड हो रहा है... Loading Artisan Workroom..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    if (error?.message === 'auth_expired') {
      return (
        <SafeAreaView style={styles.safeArea}>
          <AuthExpiredState onSignIn={() => router.replace('/(auth)/login')} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const currentTask = tasks?.[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.paletteIconBox}>
            <Ionicons name="color-palette" size={24} color={Palette.onPrimary} />
          </View>
          <Text style={styles.headerTitle}>Artisan Home</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={styles.langPill}
            accessibilityLabel="Switch language"
          >
            <Ionicons name="globe-outline" size={16} color={Palette.primary} />
            <Text style={styles.langPillText}>{isHindi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsPlayingAudio(!isPlayingAudio)}
            style={[styles.audioSpeakerBtn, isPlayingAudio && styles.audioSpeakerActive]}
            accessibilityLabel="Voice assistant audio"
          >
            <Ionicons
              name={isPlayingAudio ? 'volume-high' : 'volume-medium'}
              size={22}
              color={isPlayingAudio ? Palette.secondaryAccent : Palette.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offline Ready Banner */}
        <View style={styles.offlineBanner}>
          <View style={styles.offlineLeft}>
            <Ionicons name="wifi-outline" size={18} color={Palette.primary} />
            <Text style={styles.offlineText} numberOfLines={1}>
              इंटरनेट तैयार · Ready offline. All work is kept on your phone.
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color={Palette.primary} />
        </View>

        {/* Artisan Welcome Card */}
        <View style={styles.welcomeRow}>
          <View style={styles.artisanAvatarBox}>
            <Text style={styles.artisanInitials}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AD'}
            </Text>
          </View>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeGreeting}>
              Namaste, {user?.name || 'Anita'}
            </Text>
            <Text style={styles.clusterSubtext} numberOfLines={1}>
              Bhagirathi cluster (भागीरथी स्वयं सहायता समूह)
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.bellButton}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={Palette.primary} />
            <View style={styles.unreadDot} />
          </TouchableOpacity>
        </View>

        {/* Audio Assistance Bar (Dual-Modality Aid) */}
        <TouchableOpacity
          onPress={() => router.push('/artisan/voice')}
          activeOpacity={0.85}
          style={styles.audioAssistBar}
        >
          <View style={styles.audioAssistLeft}>
            <View style={styles.micCircleSmall}>
              <Ionicons name="mic" size={18} color={Palette.primary} />
            </View>
            <Text style={styles.audioAssistText}>
              आवाज़ से सुनें या बोलकर काम दर्ज करें
            </Text>
          </View>
          <View style={styles.listenCircle}>
            <Ionicons name="volume-medium" size={18} color={Palette.primary} />
          </View>
        </TouchableOpacity>

        {/* Next Task Card */}
        {currentTask && (
          <View style={styles.taskCardContainer}>
            <View style={styles.taskCardHeader}>
              <View style={styles.taskBadgeRow}>
                <Ionicons name="hammer-outline" size={18} color={Palette.primary} />
                <Text style={styles.taskBadgeText}>NEXT TASK · अगला काम</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPlayingAudio(!isPlayingAudio)}
                style={styles.iconBtnTouch}
                accessibilityLabel="Audio readout task"
              >
                <Ionicons name="volume-medium-outline" size={20} color={Palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            <View style={styles.craftShowcaseRow}>
              <Image
                source={{ uri: currentTask.imageUrl }}
                style={styles.craftThumb}
                resizeMode="cover"
              />
              <View style={styles.craftTitleCol}>
                <Text style={styles.craftMainTitle}>{currentTask.craftName}</Text>
                <Text style={styles.craftHindiSubtitle}>{currentTask.craftNameHi}</Text>
              </View>
            </View>

            {/* Badges: Due date & Order */}
            <View style={styles.pillsRow}>
              <View style={styles.datePill}>
                <Ionicons name="time-outline" size={14} color={Palette.primary} />
                <Text style={styles.datePillText}>
                  {currentTask.dueDate} · {currentTask.dueDateHi}
                </Text>
              </View>

              <View style={styles.orderPill}>
                <Ionicons name="cube-outline" size={14} color={Palette.onSurfaceVariant} />
                <Text style={styles.orderPillText}>{currentTask.orderNumber}</Text>
              </View>
            </View>

            {/* Progress Tracker */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <View style={styles.progressUnitRow}>
                  <Ionicons name="cut-outline" size={16} color={Palette.primary} />
                  <Text style={styles.progressUnitText}>
                    {currentTask.completedUnits} of {currentTask.targetUnits} done · {currentTask.completedUnits} तैयार हैं
                  </Text>
                </View>
                <Text style={styles.progressPercentText}>{currentTask.progressPercent}% पूरा</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarActive,
                    { width: `${currentTask.progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            {/* Primary Task CTA (56dp target) */}
            <TouchableOpacity
              onPress={() => router.push(`/artisan/task/${currentTask.id}`)}
              activeOpacity={0.85}
              style={styles.openTaskBtn}
            >
              <Text style={styles.openTaskBtnText}>Open task · काम खोलें</Text>
              <Ionicons name="arrow-forward" size={20} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Earnings Glance Card */}
        <View style={styles.earningsCardContainer}>
          <View style={styles.earningsHeaderRow}>
            <View style={styles.earningsHeaderLeft}>
              <Ionicons name="wallet" size={20} color={Palette.secondary} />
              <Text style={styles.earningsHeaderTag}>
                THIS MONTH · इस महीने की कमाई
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPlayingAudio(!isPlayingAudio)}
              style={styles.iconBtnTouch}
            >
              <Ionicons name="volume-medium-outline" size={20} color={Palette.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountDisplayRow}>
            <View>
              <Text style={styles.bigAmountText}>
                ₹{earnings?.totalThisMonth.toLocaleString() ?? '4,250'}
              </Text>
              <Text style={styles.amountSubtext}>कुल अर्जित राशि</Text>
            </View>
            <View style={styles.growthBadge}>
              <Ionicons name="trending-up" size={14} color={Palette.primary} />
              <Text style={styles.growthText}>+{earnings?.growthPercent ?? 18}%</Text>
            </View>
          </View>

          {/* Breakdown Grid */}
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownTag}>
                <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
                <Text style={styles.breakdownPaidTag}>Paid · मिला</Text>
              </View>
              <Text style={styles.breakdownPaidAmount}>
                ₹{earnings?.paidAmount.toLocaleString() ?? '2,800'}
              </Text>
            </View>

            <View style={styles.breakdownCard}>
              <View style={styles.breakdownTag}>
                <Ionicons name="time" size={14} color={Palette.secondary} />
                <Text style={styles.breakdownComingTag}>Coming · बाकी</Text>
              </View>
              <Text style={styles.breakdownComingAmount}>
                ₹{earnings?.comingAmount.toLocaleString() ?? '1,450'}
              </Text>
            </View>
          </View>

          {/* Details Link */}
          <View style={styles.payoutFooterRow}>
            <View style={styles.payoutDueRow}>
              <Ionicons name="time-outline" size={16} color={Palette.onSurfaceVariant} />
              <Text style={styles.payoutDueText}>
                Next payout {earnings?.nextPayoutDate} · {earnings?.nextPayoutDateHi}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/artisan/earnings')}
              style={styles.seeEarningsBtn}
            >
              <Text style={styles.seeEarningsText}>See earnings · विवरण</Text>
              <Ionicons name="chevron-forward" size={16} color={Palette.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cluster Activity Strip */}
        <View style={styles.clusterStripContainer}>
          <View style={styles.clusterStripLeft}>
            <View style={styles.avatarStack}>
              <View style={[styles.microAvatar, { backgroundColor: Palette.primary }]}>
                <Text style={styles.microAvatarText}>SD</Text>
              </View>
              <View style={[styles.microAvatar, { backgroundColor: Palette.primaryContainer, marginLeft: -12 }]}>
                <Text style={styles.microAvatarText}>LM</Text>
              </View>
              <View style={[styles.microAvatarPlus, { marginLeft: -12 }]}>
                <Text style={styles.microAvatarPlusText}>+6</Text>
              </View>
            </View>
            <View style={styles.clusterStripTextCol}>
              <Text style={styles.clusterActiveCount}>8 cluster sisters crafting today</Text>
              <Text style={styles.clusterActiveHi}>समूह के 8 सदस्य सक्रिय हैं</Text>
            </View>
          </View>
          <Ionicons name="people-outline" size={20} color={Palette.onSurfaceVariant} />
        </View>

        {/* Hero Primary Action Button (Add a Product) */}
        <TouchableOpacity
          onPress={() => router.push('/artisan/camera')}
          activeOpacity={0.88}
          style={styles.heroAddProductBtn}
        >
          <View style={styles.heroAddProductLeft}>
            <View style={styles.cameraIconBox}>
              <Ionicons name="camera" size={26} color={Palette.onPrimary} />
            </View>
            <View>
              <Text style={styles.heroAddProductTitle}>
                Add a product · नया सामान जोड़ें
              </Text>
              <Text style={styles.heroAddProductSub}>Voice + 1 Photo in 3 mins</Text>
            </View>
          </View>
          <View style={styles.heroMicCircle}>
            <Ionicons name="mic" size={18} color={Palette.onSecondary} />
          </View>
        </TouchableOpacity>

        {/* Persona Switcher for Verification */}
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
  headerBar: {
    height: 56,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.borderNeutral,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paletteIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headlineMd,
    color: Palette.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  langPillText: {
    ...Typography.labelSm,
    fontWeight: '700',
    color: Palette.primary,
  },
  audioSpeakerBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioSpeakerActive: {
    backgroundColor: Palette.surfaceContainer,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  offlineBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.surfaceContainer,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  offlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  offlineText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    flex: 1,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  artisanAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artisanInitials: {
    ...Typography.labelLg,
    color: Palette.background,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeGreeting: {
    ...Typography.headlineLg,
    color: Palette.primary,
  },
  clusterSubtext: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondary,
    position: 'absolute',
    top: 10,
    right: 12,
  },
  audioAssistBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Palette.primaryFixed,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginBottom: Spacing.md,
  },
  audioAssistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  micCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioAssistText: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Palette.headlineDark,
    flex: 1,
  },
  listenCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCardContainer: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  taskBadgeText: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  iconBtnTouch: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  craftShowcaseRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  craftThumb: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
  },
  craftTitleCol: {
    flex: 1,
  },
  craftMainTitle: {
    ...Typography.headlineMd,
    color: Palette.primary,
  },
  craftHindiSubtitle: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  datePillText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
  },
  orderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
  },
  orderPillText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressUnitText: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  progressPercentText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.surface,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
  },
  openTaskBtn: {
    height: 56, // 56dp minimum touch target
    borderRadius: Radii.md,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  openTaskBtnText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
  },
  earningsCardContainer: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  earningsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  earningsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  earningsHeaderTag: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  amountDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  bigAmountText: {
    ...Typography.headlineXl,
    color: Palette.primary,
  },
  amountSubtext: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryFixed,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  growthText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  breakdownTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  breakdownPaidTag: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  breakdownPaidAmount: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  breakdownComingTag: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
  },
  breakdownComingAmount: {
    ...Typography.headlineSm,
    color: Palette.secondary,
  },
  payoutFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Palette.borderNeutral,
    paddingTop: Spacing.sm,
  },
  payoutDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  payoutDueText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  seeEarningsBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeEarningsText: {
    ...Typography.labelMd,
    color: Palette.primary,
  },
  clusterStripContainer: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.card,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clusterStripLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  microAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Palette.surfaceContainer,
  },
  microAvatarText: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  microAvatarPlus: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Palette.surfaceContainer,
  },
  microAvatarPlusText: {
    ...Typography.labelSm,
    color: Palette.onSecondary,
    fontWeight: '700',
  },
  clusterStripTextCol: {
    flex: 1,
  },
  clusterActiveCount: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Palette.primary,
  },
  clusterActiveHi: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  heroAddProductBtn: {
    height: 64, // 64dp hero touch target
    borderRadius: Radii.card,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroAddProductLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cameraIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAddProductTitle: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
  },
  heroAddProductSub: {
    ...Typography.labelSm,
    color: Palette.primaryFixed,
    marginTop: 2,
  },
  heroMicCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
