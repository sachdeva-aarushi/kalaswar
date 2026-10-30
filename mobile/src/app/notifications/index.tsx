import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useToggleNotificationRead,
  type NotificationItem,
} from '@/hooks/queries/use-notifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isHindi, toggleLanguage } = useLanguage();
  const { user } = useAuth();

  const { data: notifications, isLoading, isError, refetch } = useNotifications();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const toggleReadMutation = useToggleNotificationRead();

  const [activeAudioText, setActiveAudioText] = useState<string | null>(null);
  const [isVoiceSheetVisible, setIsVoiceSheetVisible] = useState(false);
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  const handlePlayAudio = (text: string) => {
    setActiveAudioText(text);
  };

  const handleStopAudio = () => {
    setActiveAudioText(null);
    setIsPlayingAll(false);
  };

  const handleToggleListenAll = () => {
    if (isPlayingAll) {
      handleStopAudio();
    } else {
      setIsPlayingAll(true);
      setActiveAudioText(
        isHindi
          ? 'सुनीता दीदी ने आपके कुशन कवर में बदलाव का अनुरोध किया। आपका ₹2,800 का भुगतान बैंक खाते में भेज दिया गया है।'
          : 'Sunita asked for a change to your cushion cover. Payout of ₹2,800 was sent to bank account.'
      );
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    toggleReadMutation.mutate(item.id);
    if (item.linkRoute) {
      router.push(item.linkRoute as any);
    }
  };

  const getIconName = (type: NotificationItem['type']) => {
    switch (type) {
      case 'feedback':
        return 'chatbubble-ellipses';
      case 'payment':
        return 'wallet';
      case 'order':
        return 'construct';
      case 'cluster':
      default:
        return 'cube';
    }
  };

  // Auth-expired or missing user check
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateCenterContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={Palette.outline} />
          <Text style={styles.stateTitle}>{isHindi ? 'सत्र समाप्त' : 'Session Expired'}</Text>
          <Text style={styles.stateSubtitle}>
            {isHindi ? 'कृपया पुनः साइन इन करें।' : 'Please sign in again to view your notifications.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.retryBtnText}>{isHindi ? 'लॉगिन करें' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <TouchableOpacity
            style={styles.langBadge}
            onPress={toggleLanguage}
            accessibilityLabel="Toggle Language"
          >
            <Text style={styles.langBadgeText}>{isHindi ? 'हि | EN' : 'EN | हि'}</Text>
          </TouchableOpacity>
          <View style={styles.headerLogo}>
            <Ionicons name="sparkles" size={18} color={Palette.secondaryFixed} />
          </View>
          <View>
            <Text style={styles.brandTitle}>KALASWAR</Text>
            <Text style={styles.headerSubtitle}>{isHindi ? 'कलाकार साथी' : 'Artisan Updates'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={handleToggleListenAll}
            accessibilityLabel="Listen aloud"
          >
            <Ionicons
              name={isPlayingAll ? 'pause-circle' : 'volume-high'}
              size={24}
              color={Palette.primary}
            />
          </TouchableOpacity>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={16} color={Palette.onPrimary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline / Sync Status Indicator Bar */}
        <View style={styles.syncBar}>
          <View style={styles.syncLeft}>
            <Ionicons name="cloud-done-outline" size={18} color={Palette.primaryContainer} />
            <Text style={styles.syncText}>
              {isHindi ? 'सभी अपडेट सिंक हैं · सुरक्षित' : 'All caught up · Saved & synced'}
            </Text>
          </View>
          <View style={styles.pulseDot} />
        </View>

        {/* Navigation Action Row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Palette.onSurface} />
            <Text style={styles.backBtnText}>{isHindi ? 'वापस' : 'Back'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listenAllBtn, isPlayingAll && styles.listenAllBtnActive]}
            onPress={handleToggleListenAll}
            accessibilityLabel="Listen to all updates spoken aloud"
          >
            <Ionicons
              name={isPlayingAll ? 'pause' : 'volume-high'}
              size={20}
              color={isPlayingAll ? Palette.primary : Palette.secondaryFixed}
            />
            <Text
              style={[
                styles.listenAllBtnText,
                isPlayingAll && styles.listenAllBtnTextActive,
              ]}
            >
              {isPlayingAll
                ? isHindi
                  ? 'रुकें · Pause'
                  : 'Pause'
                : isHindi
                ? 'सुनें · Listen'
                : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Page Headline & Mark All As Read */}
        <View style={styles.headlineSection}>
          <View style={styles.headlineRow}>
            <Text style={styles.headlineTitle}>{isHindi ? 'ताज़ा अपडेट' : 'Updates'}</Text>
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={() => markAllReadMutation.mutate()}
            >
              <Ionicons name="checkmark-done" size={18} color={Palette.primaryContainer} />
              <Text style={styles.markReadText}>
                {isHindi ? 'सब पढ़ लिया' : 'Mark all read'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headlineSubtitle}>
            {isHindi
              ? 'आदेश, बैंक भुगतान और केंद्र की सूचनाएं'
              : 'Live craft orders, bank payouts & center alerts'}
          </Text>
        </View>

        {/* Audio Playback Banner */}
        {activeAudioText && (
          <View style={styles.audioBanner}>
            <View style={styles.audioBannerLeft}>
              <Ionicons name="megaphone" size={22} color={Palette.onSecondaryContainer} />
              <View style={styles.audioBannerTextCol}>
                <Text style={styles.audioBannerTitle}>
                  {isHindi ? 'निर्देश बोले जा रहे हैं...' : 'Reading update aloud...'}
                </Text>
                <Text style={styles.audioBannerSub} numberOfLines={2}>
                  {activeAudioText}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.audioCloseBtn}
              onPress={handleStopAudio}
              accessibilityLabel="Stop audio readout"
            >
              <Ionicons name="close" size={20} color={Palette.onSecondaryContainer} />
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.stateCenterContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.stateSubtitle}>
              {isHindi ? 'अपडेट लोड हो रहे हैं...' : 'Loading updates...'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
          <View style={styles.stateCenterContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Palette.errorTerracotta} />
            <Text style={styles.stateTitle}>
              {isHindi ? 'लोड करने में असमर्थ' : 'Unable to load updates'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isHindi ? 'पुनः प्रयास करें' : 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !isError && notifications && notifications.length === 0 && (
          <View style={styles.stateCenterContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Palette.outline} />
            <Text style={styles.stateTitle}>{isHindi ? 'कोई नई सूचना नहीं' : 'No Updates Yet'}</Text>
            <Text style={styles.stateSubtitle}>
              {isHindi
                ? 'जब भी नया ऑर्डर या भुगतान आएगा, यहाँ दिखेगा।'
                : 'Any new orders or payouts will appear here.'}
            </Text>
          </View>
        )}

        {/* Notifications List */}
        {!isLoading &&
          !isError &&
          notifications &&
          notifications.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notifCard,
                item.isUnread ? styles.notifCardUnread : styles.notifCardRead,
              ]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.85}
            >
              {/* Unread indicator vertical bar */}
              {item.isUnread && <View style={styles.unreadBar} />}

              {/* Icon Frame */}
              <View
                style={[
                  styles.iconFrame,
                  item.isUnread ? styles.iconFrameUnread : styles.iconFrameRead,
                ]}
              >
                <Ionicons
                  name={getIconName(item.type)}
                  size={26}
                  color={item.isUnread ? Palette.primary : Palette.onSurfaceVariant}
                />
              </View>

              {/* Text Content */}
              <View style={styles.notifContent}>
                <View style={styles.metaRow}>
                  {item.isUnread && (
                    <View style={styles.unreadPill}>
                      <View style={styles.unreadPillDot} />
                      <Text style={styles.unreadPillText}>{isHindi ? 'नया' : 'New'}</Text>
                    </View>
                  )}
                  <Text style={styles.timeAgoText}>{item.timeAgo}</Text>
                </View>

                <Text style={styles.notifTitle}>
                  {isHindi ? item.titleHi || item.title : item.title}
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.audioListenBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handlePlayAudio(
                        isHindi
                          ? item.bodyHi || item.audioText || item.body
                          : item.audioText || item.body
                      );
                    }}
                  >
                    <Ionicons name="volume-high-outline" size={16} color={Palette.primary} />
                    <Text style={styles.audioListenText}>{isHindi ? 'सुनें' : 'Listen'}</Text>
                  </TouchableOpacity>

                  {item.linkText && (
                    <Text style={styles.linkText}>{item.linkText}</Text>
                  )}
                </View>
              </View>

              {/* Chevron */}
              <View style={styles.chevronBox}>
                <Ionicons name="chevron-forward" size={20} color={Palette.outline} />
              </View>
            </TouchableOpacity>
          ))}

        {/* Reassuring Coordinator Support Card */}
        <View style={styles.supportCard}>
          <View style={styles.supportTopRow}>
            <View style={styles.supportAvatar}>
              <Ionicons name="woman" size={32} color={Palette.primary} />
            </View>
            <View style={styles.supportInfo}>
              <Text style={styles.supportBadge}>SHG COORDINATOR</Text>
              <Text style={styles.supportTitle}>
                {isHindi ? 'सुनीता दीदी से बात करें' : 'Talk with Sunita Didi'}
              </Text>
              <Text style={styles.supportDesc}>
                {isHindi
                  ? 'किसी भी अपडेट पर संदेह है? सीधे कॉल करें।'
                  : 'Questions about an update? Call Coordinator Sunita Didi.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL('tel:+919823100000')}
          >
            <Ionicons name="call" size={20} color={Palette.onPrimary} />
            <Text style={styles.callBtnText}>Call +91 98231 00000</Text>
          </TouchableOpacity>

          <View style={styles.langAssistRow}>
            <Ionicons name="chatbubbles-outline" size={16} color={Palette.onSurfaceVariant} />
            <Text style={styles.langAssistText}>
              {isHindi
                ? 'हिंदी, बांग्ला और क्षेत्रीय भाषा में सहायता उपलब्ध'
                : 'Assistance available in English, Hindi & regional languages'}
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating 64dp Mic FAB */}
      <TouchableOpacity
        style={styles.floatingMicBtn}
        onPress={() => setIsVoiceSheetVisible(true)}
        accessibilityLabel="Voice assistant search"
      >
        <Ionicons name="mic" size={30} color={Palette.secondaryFixed} />
      </TouchableOpacity>

      {/* Voice Assistant Bottom Sheet Modal */}
      <Modal
        visible={isVoiceSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVoiceSheetVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderLeft}>
                <View style={styles.sheetMicCircle}>
                  <Ionicons name="mic" size={22} color={Palette.primary} />
                </View>
                <View>
                  <Text style={styles.sheetTitle}>
                    {isHindi ? 'सुन रहे हैं, बोलिए...' : 'Listening, speak now...'}
                  </Text>
                  <Text style={styles.sheetSub}>
                    {isHindi
                      ? 'ऑर्डर, अपडेट या भुगतान के बारे में पूछें'
                      : 'Ask about updates, orders or payouts'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsVoiceSheetVisible(false)}
              >
                <Ionicons name="close" size={22} color={Palette.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Audio Waveform Simulator */}
            <View style={styles.waveformRow}>
              <View style={[styles.waveBar, { height: 16 }]} />
              <View style={[styles.waveBar, { height: 32 }]} />
              <View
                style={[
                  styles.waveBar,
                  { height: 48, backgroundColor: Palette.secondaryContainer },
                ]}
              />
              <View style={[styles.waveBar, { height: 26 }]} />
              <View style={[styles.waveBar, { height: 14 }]} />
            </View>

            {/* Query Example Box */}
            <View style={styles.exampleBox}>
              <Text style={styles.exampleText}>
                {isHindi
                  ? '"सुनीता दीदी का आख़िरी संदेश क्या था?"'
                  : '"What was Sunita Didi\'s latest message?"'}
              </Text>
              <Text style={styles.exampleSub}>
                {isHindi ? 'उदाहरण प्रश्न' : 'Example spoken query'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sheetActionBtn}
              onPress={() => setIsVoiceSheetVisible(false)}
            >
              <Text style={styles.sheetActionText}>{isHindi ? 'बंद करें' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    height: 64,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
    minHeight: 32,
    justifyContent: 'center',
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primaryContainer,
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: Palette.surfaceContainer,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    color: Palette.primaryContainer,
    fontWeight: '600',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.primary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    minWidth: 56,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  listenAllBtn: {
    minWidth: 56,
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listenAllBtnActive: {
    backgroundColor: Palette.secondaryContainer,
  },
  listenAllBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.secondaryFixed,
  },
  listenAllBtnTextActive: {
    color: Palette.primary,
  },
  headlineSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headlineTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  markReadBtn: {
    minHeight: 56,
    paddingHorizontal: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primaryContainer,
  },
  headlineSubtitle: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  audioBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  audioBannerTextCol: {
    flex: 1,
  },
  audioBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  audioBannerSub: {
    fontSize: 12,
    color: Palette.onSecondaryContainer,
    opacity: 0.9,
    marginTop: 2,
  },
  audioCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  notifCard: {
    position: 'relative',
    minHeight: 96,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainerHighest,
  },
  notifCardUnread: {
    backgroundColor: Palette.surfaceContainerLow,
  },
  notifCardRead: {
    backgroundColor: Palette.surface,
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: Palette.primary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  iconFrame: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconFrameUnread: {
    backgroundColor: Palette.primaryFixed,
  },
  iconFrameRead: {
    backgroundColor: Palette.surfaceContainerHigh,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
  },
  unreadPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primaryFixed,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  timeAgoText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  notifTitle: {
    fontSize: 16,
    color: Palette.onSurface,
    lineHeight: 22,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  audioListenBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioListenText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.secondary,
  },
  chevronBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  supportCard: {
    margin: Spacing.lg,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: 20,
    backgroundColor: Palette.surfaceContainer,
    gap: Spacing.md,
  },
  supportTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  supportAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportInfo: {
    flex: 1,
  },
  supportBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.secondary,
    letterSpacing: 0.8,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
    marginTop: 2,
  },
  supportDesc: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  callBtn: {
    minHeight: 56,
    width: '100%',
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  callBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  langAssistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  langAssistText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
  floatingMicBtn: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
    elevation: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.outlineVariant,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sheetMicCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  sheetSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  sheetCloseBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: Palette.primary,
  },
  exampleBox: {
    backgroundColor: Palette.surfaceContainer,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'center',
    gap: 4,
  },
  exampleText: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  exampleSub: {
    fontSize: 11,
    color: Palette.outline,
  },
  sheetActionBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  stateCenterContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  stateSubtitle: {
    fontSize: 14,
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
});

