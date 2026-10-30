import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';

export default function ArtisanVoiceScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showLowVolumeNotice, setShowLowVolumeNotice] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayInstructions = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setHasRecorded(true);
      }, 3000);
    } else {
      setIsRecording(false);
      setHasRecorded(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top App Bar Navigation & Status */}
        <View style={styles.topNavRow}>
          <View style={styles.topNavLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={Palette.primary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.langPill}
              onPress={toggleLanguage}
              accessibilityLabel="Switch language"
            >
              <Ionicons name="language" size={14} color={Palette.primary} />
              <Text style={styles.langText}>EN | हि</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.savedPill}>
            <Ionicons name="cloud-done" size={16} color={Palette.primary} />
            <Text style={styles.savedText}>Saved on your phone</Text>
          </View>
        </View>

        {/* Audio Toast */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="volume-high" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? 'कारीगरी का नाम, कपड़ा, धागा और नाप बोलकर बताएं।'
                : 'Say the craft item name, cloth material, thread type and size clearly.'}
            </Text>
          </View>
        )}

        {/* Primary Headline */}
        <View style={styles.titleSection}>
          <Text style={styles.mainHeading}>
            {isHindi ? 'कारीगरी का विवरण बोलें' : 'Tell us about it'}
          </Text>
        </View>

        {/* Spoken Guided Prompt Card */}
        <View style={styles.promptCard}>
          <View style={styles.promptCardTop}>
            <View style={styles.promptIconBox}>
              <Ionicons name="volume-high" size={22} color={Palette.primary} />
            </View>
            <TouchableOpacity
              style={styles.listenBtn}
              onPress={handlePlayInstructions}
              accessibilityLabel="Listen to instructions aloud"
            >
              <Ionicons name="play-circle-outline" size={20} color={Palette.primary} />
              <Text style={styles.listenBtnText}>Listen</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.promptTextCol}>
            <Text style={styles.promptMainText}>
              Say the name of the craft and what material or thread is used.
            </Text>
            <Text style={styles.promptSubText}>
              Be as descriptive as you like.
            </Text>
          </View>

          <View style={styles.promptHintRow}>
            <Ionicons name="bulb-outline" size={16} color={Palette.secondary} />
            <Text style={styles.promptHintText}>
              e.g., "Handmade cushion cover with red silk embroidery..."
            </Text>
          </View>
        </View>

        {/* Live Recording Control & Audio State Matrix */}
        <View style={styles.recordingCard}>
          {/* Status Indicator Badge */}
          <View style={styles.recordingStatusBadge}>
            <View style={[styles.pulseDot, isRecording && styles.pulseDotActive]} />
            <Text style={styles.recordingStatusText}>
              {isRecording ? 'Recording in progress' : 'Voice capture ready'}
            </Text>
          </View>

          {/* Waveform & Timer Visualizer */}
          <View style={styles.waveformContainer}>
            <View style={styles.waveformBarsRow}>
              {[16, 32, 48, 38, 24, 12].map((height, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.waveformBar,
                    { height: isRecording ? height : 12 },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.timerText}>
              {isRecording ? '0:12 of 1:00' : '0:00 of 1:00'}
            </Text>
          </View>

          {/* Giant 96dp Ergonomic Microphone FAB */}
          <View style={styles.micFabWrapper}>
            <TouchableOpacity
              style={[styles.giantMicFab, isRecording && styles.giantMicFabRecording]}
              onPress={toggleRecording}
              accessibilityLabel="Hold to talk"
              activeOpacity={0.85}
            >
              <Ionicons name="mic" size={48} color={Palette.onPrimary} />
            </TouchableOpacity>
            <Text style={styles.micFabLabel}>
              {isRecording ? 'Tap to finish' : 'Tap to talk'}
            </Text>
          </View>

          {/* Stop Interaction Controller */}
          {isRecording && (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={() => setIsRecording(false)}
            >
              <Ionicons name="stop-circle" size={20} color={Palette.primary} />
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Post-Recording Review & Re-take Options */}
        {hasRecorded && !isRecording && (
          <View style={styles.reviewAudioCard}>
            <View style={styles.playbackRow}>
              <TouchableOpacity
                style={styles.playBtn}
                onPress={() => setIsPlayingRecording(!isPlayingRecording)}
                accessibilityLabel="Play audio"
              >
                <Ionicons
                  name={isPlayingRecording ? 'pause' : 'play'}
                  size={24}
                  color={Palette.primary}
                />
                <Text style={styles.playBtnText}>Play</Text>
              </TouchableOpacity>

              {/* Seek Bar */}
              <View style={styles.seekCol}>
                <View style={styles.seekTrack}>
                  <View style={styles.seekProgress} />
                </View>
                <View style={styles.seekTimeRow}>
                  <Text style={styles.timeLabel}>0:05</Text>
                  <Text style={styles.timeLabel}>0:12</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => setIsRecording(true)}
              accessibilityLabel="Record again"
            >
              <Ionicons name="reload" size={20} color={Palette.primary} />
              <Text style={styles.retakeBtnText}>Record again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Clarity State Notice (Terracotta Accent) */}
        {showLowVolumeNotice && (
          <View style={styles.clarityWarning}>
            <Ionicons name="warning" size={22} color={Palette.errorTerracotta} />
            <Text style={styles.clarityText}>
              We couldn't hear you clearly. Please try again a little closer.
            </Text>
          </View>
        )}

        {/* Offline Assurance Banner */}
        <View style={styles.offlineAssurance}>
          <Ionicons name="cloud-offline-outline" size={20} color={Palette.primary} />
          <Text style={styles.offlineAssuranceText}>
            Your voice recording is saved. We'll generate the draft when you're back online.
          </Text>
        </View>

        {/* Bottom 56dp Primary Action: Make a draft */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={styles.makeDraftBtn}
            onPress={() => router.push('/artisan/review')}
            accessibilityLabel="Make a draft"
            activeOpacity={0.88}
          >
            <Ionicons name="sparkles" size={22} color={Palette.onPrimary} />
            <Text style={styles.makeDraftText}>Make a draft</Text>
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
  topNavLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  backBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  langPill: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
  },
  savedText: {
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
  titleSection: {
    marginTop: 4,
  },
  mainHeading: {
    ...Typography.headlineLg,
    color: Palette.primary,
  },
  promptCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  promptCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenBtn: {
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHighest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  promptTextCol: {
    gap: 2,
  },
  promptMainText: {
    ...Typography.headlineSm,
    color: Palette.primary,
    lineHeight: 24,
  },
  promptSubText: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
  },
  promptHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  promptHintText: {
    ...Typography.labelSm,
    color: Palette.primary,
    opacity: 0.9,
  },
  recordingCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  recordingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryFixed,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
  },
  pulseDotActive: {
    backgroundColor: Palette.errorTerracotta,
  },
  recordingStatusText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  waveformContainer: {
    alignItems: 'center',
    gap: 6,
  },
  waveformBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  waveformBar: {
    width: 8,
    backgroundColor: Palette.primaryContainer,
    borderRadius: Radii.full,
  },
  timerText: {
    ...Typography.labelLg,
    color: Palette.primary,
    letterSpacing: 2,
    fontWeight: '600',
  },
  micFabWrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  giantMicFab: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  giantMicFabRecording: {
    backgroundColor: Palette.errorTerracotta,
  },
  micFabLabel: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  stopButton: {
    width: '100%',
    height: 48,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stopButtonText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  reviewAudioCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  playBtn: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  playBtnText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  seekCol: {
    flex: 1,
    gap: 4,
  },
  seekTrack: {
    height: 6,
    backgroundColor: Palette.surfaceContainerHighest,
    borderRadius: Radii.full,
    overflow: 'hidden',
  },
  seekProgress: {
    width: '40%',
    height: '100%',
    backgroundColor: Palette.primary,
  },
  seekTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeLabel: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontSize: 10,
  },
  retakeBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  retakeBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  clarityWarning: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  clarityText: {
    ...Typography.bodySm,
    color: Palette.errorTerracotta,
    flex: 1,
  },
  offlineAssurance: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  offlineAssuranceText: {
    ...Typography.bodySm,
    color: Palette.primary,
    flex: 1,
  },
  bottomDock: {
    paddingTop: Spacing.xs,
  },
  makeDraftBtn: {
    width: '100%',
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  makeDraftText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
});

