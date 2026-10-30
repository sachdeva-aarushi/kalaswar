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

export default function SubmissionStatusScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const [activeState, setActiveState] = useState<'success' | 'offline' | 'error'>('success');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
        {/* Top Navigation & Spoken Assistance Bar */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => router.replace('/(tabs)/artisan')}
            accessibilityLabel="Home"
          >
            <Ionicons name="arrow-back" size={24} color={Palette.primary} />
            <Text style={styles.homeBtnText}>Home</Text>
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={styles.langPill}
              onPress={toggleLanguage}
              accessibilityLabel="Switch language"
            >
              <Text style={styles.langText}>EN | हि</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.listenPill}
              onPress={handlePlayAudio}
              accessibilityLabel="Spoken Help Readout"
            >
              <Ionicons name="volume-high" size={20} color={Palette.onSecondaryContainer} />
              <Text style={styles.listenText}>Listen</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Audio Playing Feedback Pill */}
        {isPlayingAudio && (
          <View style={styles.audioPill}>
            <Ionicons name="pulse" size={20} color={Palette.primary} />
            <Text style={styles.audioPillText}>
              सुनीता दीदी को आपकी कारीगरी भेज दी गई है...
            </Text>
            <Text style={styles.audioOnLabel}>Audio ON</Text>
          </View>
        )}

        {/* Variant Switcher Tab Bar (Sent / Offline / Blocked) */}
        <View style={styles.variantBar}>
          <TouchableOpacity
            style={[styles.variantTab, activeState === 'success' && styles.variantTabActive]}
            onPress={() => setActiveState('success')}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={activeState === 'success' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text
              style={[
                styles.variantText,
                activeState === 'success' && styles.variantTextActive,
              ]}
            >
              Sent
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.variantTab, activeState === 'offline' && styles.variantTabActive]}
            onPress={() => setActiveState('offline')}
          >
            <Ionicons
              name="cloud-offline"
              size={18}
              color={activeState === 'offline' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text
              style={[
                styles.variantText,
                activeState === 'offline' && styles.variantTextActive,
              ]}
            >
              Offline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.variantTab, activeState === 'error' && styles.variantTabActive]}
            onPress={() => setActiveState('error')}
          >
            <Ionicons
              name="alert-circle"
              size={18}
              color={activeState === 'error' ? Palette.errorTerracotta : Palette.onSurfaceVariant}
            />
            <Text
              style={[
                styles.variantText,
                activeState === 'error' && { color: Palette.errorTerracotta, fontWeight: '700' },
              ]}
            >
              Blocked
            </Text>
          </TouchableOpacity>
        </View>

        {/* VARIANT 1: SENT / SUCCESS */}
        {activeState === 'success' && (
          <View style={styles.stateContainer}>
            <View style={styles.heroCard}>
              {/* 72dp Circle with Forest Green Checkmark */}
              <View style={styles.checkCircle72}>
                <Ionicons name="checkmark-circle" size={42} color={Palette.primary} />
              </View>

              <Text style={styles.heroHeading}>Sent for review</Text>

              {/* Status pill with clock */}
              <View style={styles.statusClockPill}>
                <Ionicons name="time-outline" size={18} color={Palette.primary} />
                <Text style={styles.statusClockText}>
                  Sunita will look at it soon.
                </Text>
              </View>

              {/* Submitted Item Preview Tile */}
              <View style={styles.itemPreviewTile}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
                  }}
                  style={styles.previewThumb}
                />
                <View style={styles.previewCol}>
                  <View style={styles.batchTag}>
                    <Ionicons name="cube-outline" size={12} color={Palette.onSecondaryFixed} />
                    <Text style={styles.batchTagText}>Batch #12</Text>
                  </View>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    Hand-embroidered cushion cover
                  </Text>
                  <Text style={styles.previewSub}>
                    Handmade craft item (1 unit)
                  </Text>
                </View>
              </View>

              {/* Verification Timestamp Chip */}
              <View style={styles.verifyChip}>
                <View style={styles.verifyLeft}>
                  <Ionicons name="shield-checkmark" size={16} color={Palette.primary} />
                  <Text style={styles.verifyText}>
                    Saved to SHG Ledger (सुरक्षित रिकॉर्ड)
                  </Text>
                </View>
                <Text style={styles.verifyTime}>11:42 AM</Text>
              </View>
            </View>

            {/* Actions for Success */}
            <View style={styles.actionsStack}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={() => router.push('/artisan/camera')}
                accessibilityLabel="Add another product"
                activeOpacity={0.88}
              >
                <Ionicons name="camera" size={24} color={Palette.onPrimary} />
                <Text style={styles.primaryCtaText}>Add another product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={() => router.replace('/(tabs)/artisan')}
                accessibilityLabel="Back to Home"
                activeOpacity={0.88}
              >
                <Ionicons name="home-outline" size={24} color={Palette.primary} />
                <Text style={styles.secondaryCtaText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* VARIANT 2: OFFLINE STATE CARD */}
        {activeState === 'offline' && (
          <View style={styles.stateContainer}>
            <View style={styles.heroCard}>
              <View style={styles.offlineCircle56}>
                <Ionicons name="cloud-offline" size={30} color={Palette.onSecondaryFixed} />
              </View>

              <View style={styles.noInternetBadge}>
                <Ionicons name="wifi-outline" size={14} color={Palette.onSecondaryContainer} />
                <Text style={styles.noInternetText}>No internet · इंटरनेट बंद</Text>
              </View>

              <Text style={styles.heroHeading}>
                Saved on your phone{'\n'}
                <Text style={styles.hindiHeading}>फ़ोन पर सुरक्षित</Text>
              </Text>

              <View style={styles.offlineExplainBox}>
                <Text style={styles.offlineExplainMain}>
                  We'll send it when you're online.
                </Text>
                <Text style={styles.offlineExplainSub}>
                  ✓ इंटरनेट आने पर अपने-आप भेज दिया जाएगा।
                </Text>
              </View>

              <TouchableOpacity
                style={styles.tryNowBtn}
                onPress={() => setActiveState('success')}
              >
                <Ionicons name="sync" size={20} color={Palette.onPrimary} />
                <Text style={styles.tryNowText}>Try now · अभी भेजें</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryCta}
              onPress={() => router.replace('/(tabs)/artisan')}
            >
              <Ionicons name="arrow-back" size={22} color={Palette.primary} />
              <Text style={styles.secondaryCtaText}>Keep working offline · काम जारी रखें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* VARIANT 3: ERROR / BLOCKED STATE CARD */}
        {activeState === 'error' && (
          <View style={styles.stateContainer}>
            <View style={[styles.heroCard, styles.errorCard]}>
              <View style={styles.errorCircle56}>
                <Ionicons name="alert" size={32} color="#ffffff" />
              </View>

              <View style={styles.attentionBadge}>
                <Ionicons name="warning" size={14} color={Palette.errorTerracotta} />
                <Text style={styles.attentionText}>Needs attention · ध्यान दें</Text>
              </View>

              <Text style={[styles.heroHeading, { color: Palette.errorTerracotta }]}>
                It didn't go through{'\n'}
                <Text style={styles.hindiHeading}>सामान नहीं भेजा जा सका</Text>
              </Text>

              <View style={styles.reassureBox}>
                <View style={styles.reassureTitleRow}>
                  <Ionicons name="shield-checkmark" size={18} color={Palette.primary} />
                  <Text style={styles.reassureTitle}>No work is lost · कोई काम नहीं खोया</Text>
                </View>
                <Text style={styles.reassureBody}>
                  Your product is saved safely on your phone.
                </Text>
                <Text style={styles.reassureHindi}>
                  आपका सामान फ़ोन में सुरक्षित है। नेटवर्क धीमा होने के कारण रुका है।
                </Text>
              </View>

              <TouchableOpacity
                style={styles.errorTryAgainBtn}
                onPress={() => setActiveState('success')}
              >
                <Ionicons name="reload" size={22} color="#ffffff" />
                <Text style={styles.errorTryAgainText}>Try again · दोबारा कोशिश करें</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryCta}
              onPress={() => alert('Calling Coordinator Sunita Devi...')}
            >
              <Ionicons name="call-outline" size={22} color={Palette.primary} />
              <Text style={styles.secondaryCtaText}>Call Coordinator · दीदी से सहायता लें</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Persistent Floating Voice Mic Dock (64dp target) */}
        <View style={styles.voiceDock}>
          <TouchableOpacity
            style={styles.dockMicBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Voice dictation and help"
          >
            <Ionicons name="mic" size={32} color={Palette.secondaryFixed} />
          </TouchableOpacity>
          <Text style={styles.dockMicLabel}>Tap to speak</Text>
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
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.md,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeBtn: {
    minHeight: 56,
    minWidth: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  homeBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  langPill: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    justifyContent: 'center',
    ...Shadows.sm,
  },
  langText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  listenPill: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenText: {
    ...Typography.labelLg,
    color: Palette.onSecondaryContainer,
  },
  audioPill: {
    backgroundColor: Palette.primaryFixed,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  audioPillText: {
    ...Typography.bodySm,
    color: Palette.primary,
    flex: 1,
    marginHorizontal: 8,
  },
  audioOnLabel: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  variantBar: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: 4,
    gap: 4,
  },
  variantTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  variantTabActive: {
    backgroundColor: Palette.surfaceContainerLowest,
    ...Shadows.sm,
  },
  variantText: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
  },
  variantTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  stateContainer: {
    gap: Spacing.md,
  },
  heroCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  errorCard: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  checkCircle72: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  offlineCircle56: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorCircle56: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: Palette.errorTerracotta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroHeading: {
    ...Typography.headlineLg,
    color: Palette.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  hindiHeading: {
    ...Typography.bodyLg,
    color: Palette.onSurfaceVariant,
  },
  statusClockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginBottom: Spacing.lg,
  },
  statusClockText: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
  },
  itemPreviewTile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
  },
  previewCol: {
    flex: 1,
  },
  batchTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.secondaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginBottom: 2,
  },
  batchTagText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryFixed,
    fontSize: 10,
    fontWeight: '700',
  },
  previewTitle: {
    ...Typography.labelLg,
    color: Palette.onSurface,
  },
  previewSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  verifyChip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },
  verifyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  verifyTime: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  actionsStack: {
    gap: Spacing.sm,
  },
  primaryCta: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  primaryCtaText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  secondaryCta: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  secondaryCtaText: {
    ...Typography.labelLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  noInternetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginBottom: Spacing.sm,
  },
  noInternetText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryContainer,
    fontWeight: '600',
  },
  offlineExplainBox: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
    gap: 4,
  },
  offlineExplainMain: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
  },
  offlineExplainSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  tryNowBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  tryNowText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
  },
  attentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    marginBottom: Spacing.sm,
  },
  attentionText: {
    ...Typography.labelSm,
    color: Palette.errorTerracotta,
    fontWeight: '700',
  },
  reassureBox: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    width: '100%',
    marginBottom: Spacing.lg,
    gap: 4,
    ...Shadows.sm,
  },
  reassureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reassureTitle: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  reassureBody: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
  },
  reassureHindi: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  errorTryAgainBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.errorTerracotta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  errorTryAgainText: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontWeight: '700',
  },
  voiceDock: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    gap: 6,
  },
  dockMicBtn: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  dockMicLabel: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
});

