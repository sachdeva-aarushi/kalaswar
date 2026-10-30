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
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';

export default function ArtisanCameraScreen() {
  const router = useRouter();
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showLowLightWarning, setShowLowLightWarning] = useState(true);

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const handleShutter = () => {
    setIsCaptured(true);
  };

  const handleRetake = () => {
    setIsCaptured(false);
  };

  const handleUsePhoto = () => {
    router.push('/artisan/voice');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Ambient App Bar */}
      <View style={styles.topAppBar}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => router.back()}
          accessibilityLabel="Close and return"
        >
          <Ionicons name="arrow-back" size={20} color={Palette.onPrimary} />
          <View>
            <Text style={styles.pillEn}>Close</Text>
            <Text style={styles.pillHi}>बंद करें</Text>
          </View>
        </TouchableOpacity>

        {/* Flash Control */}
        <TouchableOpacity
          style={[styles.pillButton, isFlashOn && styles.pillActive]}
          onPress={() => setIsFlashOn(!isFlashOn)}
          accessibilityLabel="Toggle Flash"
        >
          <Ionicons
            name={isFlashOn ? 'flash' : 'flash-off'}
            size={20}
            color={isFlashOn ? Palette.onSecondaryContainer : Palette.onPrimary}
          />
          <View>
            <Text style={[styles.pillEn, isFlashOn && { color: Palette.onSecondaryContainer }]}>
              {isFlashOn ? 'Flash: On' : 'Flash: Off'}
            </Text>
            <Text style={[styles.pillHi, isFlashOn && { color: Palette.onSecondaryContainer }]}>
              {isFlashOn ? 'फ़्लैश: चालू' : 'फ़्लैश: बंद'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Spoken Voice Guidance Button */}
        <TouchableOpacity
          style={[styles.pillButton, styles.listenPill]}
          onPress={handlePlayAudio}
          accessibilityLabel="Listen to camera guidelines"
        >
          <Ionicons name="volume-high" size={20} color={Palette.onSecondary} />
          <View>
            <Text style={styles.listenEn}>Listen</Text>
            <Text style={styles.listenHi}>आवाज़ सुनें</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Ambient Audio Announcement Banner */}
        <View style={styles.ambientCoachBanner}>
          <View style={styles.coachContent}>
            <Ionicons name="bulb-outline" size={20} color={Palette.secondary} />
            <Text style={styles.coachText} numberOfLines={1}>
              Use daylight on a plain surface · <Text style={{ fontSize: 12 }}>धूप में व सादे कपड़े पर रखें</Text>
            </Text>
          </View>
          <Ionicons name="pulse" size={20} color={Palette.primary} />
        </View>

        {/* Audio Toast */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              कृपया हस्तशिल्प को साफ़ रोशनी में रखें। कोने सीधे रखें और कैमरा स्थिर पकड़ें।
            </Text>
          </View>
        )}

        {/* Camera Live Viewport Stage (4:5 Aspect Ratio) */}
        <View style={styles.viewportFrame}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
            }}
            style={styles.viewfinderImage}
            resizeMode="cover"
          />

          {/* Framing Brackets */}
          <View style={styles.bracketsContainer}>
            <View style={styles.bracketsTopRow}>
              <View style={[styles.bracketCorner, styles.tlCorner]} />
              {/* Multi-photo Counter Badge */}
              <View style={styles.counterBadge}>
                <Ionicons name="images-outline" size={16} color={Palette.primary} />
                <View>
                  <Text style={styles.counterEn}>1 of 3 photos</Text>
                  <Text style={styles.counterHi}>1/3 फ़ोटो</Text>
                </View>
              </View>
              <View style={[styles.bracketCorner, styles.trCorner]} />
            </View>

            {/* Horizon Level Indicator */}
            <View style={styles.horizonContainer}>
              <View style={styles.horizonBar}>
                <View style={styles.horizonBubble}>
                  <View style={styles.bubbleCenter} />
                </View>
              </View>
              <Text style={styles.horizonLabel}>Hold Steady · सीधा रखें</Text>
            </View>

            {/* Bottom Brackets & Filmstrip Stack */}
            <View style={styles.bracketsBottomRow}>
              <View style={[styles.bracketCorner, styles.blCorner]} />

              <View style={styles.filmstripStack}>
                <View style={styles.slotActive}>
                  <Ionicons name="checkmark" size={16} color={Palette.primary} />
                </View>
                <View style={styles.slotEmpty}>
                  <Ionicons name="add" size={14} color={Palette.onPrimary} />
                  <Text style={styles.slotNum}>2</Text>
                </View>
                <View style={styles.slotEmpty}>
                  <Ionicons name="add" size={14} color={Palette.onPrimary} />
                  <Text style={styles.slotNum}>3</Text>
                </View>
              </View>

              <View style={[styles.bracketCorner, styles.brCorner]} />
            </View>
          </View>
        </View>

        {/* Low Light Advisory Banner (Terracotta #B85F45) */}
        {showLowLightWarning && (
          <View style={styles.lowLightBanner}>
            <View style={styles.warningCircle}>
              <Ionicons name="warning" size={20} color="#ffffff" />
            </View>
            <View style={styles.warningCol}>
              <Text style={styles.warningTitle}>
                This photo looks dark · यह फ़ोटो अंधेरी है
              </Text>
              <Text style={styles.warningSub}>
                Try near window or open door · खिड़की के पास ले जाएं
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowLowLightWarning(false)}>
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Shutter & Controls Deck */}
        <View style={styles.controlsDeck}>
          <View style={styles.deckButtonsRow}>
            {/* Gallery Upload */}
            <TouchableOpacity style={styles.deckButton} accessibilityLabel="Open Gallery">
              <Ionicons name="images-outline" size={24} color={Palette.onPrimary} />
              <Text style={styles.deckBtnEn}>Gallery</Text>
              <Text style={styles.deckBtnHi}>गैलरी</Text>
            </TouchableOpacity>

            {/* Primary Capture Shutter Trigger */}
            <View style={styles.shutterWrapper}>
              <TouchableOpacity
                style={styles.shutterRing}
                onPress={handleShutter}
                accessibilityLabel="Take Photo"
                activeOpacity={0.8}
              >
                <View style={styles.shutterInnerRing}>
                  <View style={styles.shutterCore}>
                    <Ionicons name="camera" size={32} color={Palette.primary} />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.shutterLabelEn}>Take photo</Text>
              <Text style={styles.shutterLabelHi}>फ़ोटो लें</Text>
            </View>

            {/* Say It Direct Trigger */}
            <TouchableOpacity
              style={styles.deckButton}
              onPress={() => router.push('/artisan/voice')}
              accessibilityLabel="Say It"
            >
              <Ionicons name="mic-outline" size={24} color={Palette.onPrimary} />
              <Text style={styles.deckBtnEn}>Say It</Text>
              <Text style={styles.deckBtnHi}>बोलें</Text>
            </TouchableOpacity>
          </View>

          {/* Post-Capture Decision State */}
          {isCaptured && (
            <View style={styles.postCaptureCard}>
              <View style={styles.postCaptureInfo}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
                  }}
                  style={styles.capturedThumb}
                />
                <View style={styles.capturedCol}>
                  <Text style={styles.capturedTitle}>
                    Photo 1 captured · पहली फ़ोटो तैयार
                  </Text>
                  <Text style={styles.capturedSub}>Ready to add craft details</Text>
                </View>
              </View>

              <View style={styles.twoWayActions}>
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handleRetake}
                  accessibilityLabel="Retake Photo"
                >
                  <Ionicons name="reload" size={18} color={Palette.onPrimary} />
                  <View>
                    <Text style={styles.actionEn}>Retake</Text>
                    <Text style={styles.actionHi}>दोबारा लें</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.usePhotoBtn}
                  onPress={handleUsePhoto}
                  accessibilityLabel="Use Photo"
                >
                  <Ionicons name="checkmark-circle" size={20} color={Palette.onSecondaryContainer} />
                  <View>
                    <Text style={styles.actionUseEn}>Use photo</Text>
                    <Text style={styles.actionUseHi}>फ़ोटो रखें</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.primary,
  },
  topAppBar: {
    backgroundColor: Palette.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.md,
  },
  pillButton: {
    minHeight: 52,
    minWidth: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillActive: {
    backgroundColor: Palette.secondaryContainer,
  },
  listenPill: {
    backgroundColor: Palette.secondary,
  },
  pillEn: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  pillHi: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    fontSize: 11,
    opacity: 0.9,
  },
  listenEn: {
    ...Typography.labelSm,
    color: Palette.onSecondary,
    fontWeight: '700',
  },
  listenHi: {
    ...Typography.bodySm,
    color: Palette.onSecondary,
    fontSize: 11,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  ambientCoachBanner: {
    backgroundColor: Palette.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    backgroundColor: Palette.surfaceContainerLowest,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  coachText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  audioToast: {
    backgroundColor: Palette.primaryContainer,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  audioToastText: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    flex: 1,
  },
  viewportFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: Palette.tertiary,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  viewfinderImage: {
    width: '100%',
    height: '100%',
  },
  bracketsContainer: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  bracketsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bracketCorner: {
    width: 36,
    height: 36,
    borderColor: '#ffffff',
  },
  tlCorner: {
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  trCorner: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  counterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  counterEn: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  counterHi: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    fontSize: 10,
  },
  horizonContainer: {
    alignItems: 'center',
  },
  horizonBar: {
    width: 180,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizonBubble: {
    width: 20,
    height: 20,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  bubbleCenter: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
  },
  horizonLabel: {
    ...Typography.labelSm,
    color: '#ffffff',
    backgroundColor: 'rgba(8, 53, 39, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginTop: 6,
    fontSize: 11,
  },
  bracketsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  blCorner: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  brCorner: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  filmstripStack: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(8, 53, 39, 0.85)',
    padding: 6,
    borderRadius: Radii.md,
  },
  slotActive: {
    width: 40,
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    width: 40,
    height: 52,
    borderRadius: Radii.sm,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotNum: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
    fontSize: 10,
  },
  lowLightBanner: {
    backgroundColor: '#b85f45',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  warningCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningCol: {
    flex: 1,
  },
  warningTitle: {
    ...Typography.labelLg,
    color: '#ffffff',
  },
  warningSub: {
    ...Typography.bodySm,
    color: '#ffffff',
    fontSize: 12,
    opacity: 0.95,
  },
  controlsDeck: {
    backgroundColor: Palette.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  deckButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  deckButton: {
    minHeight: 56,
    minWidth: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckBtnEn: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  deckBtnHi: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    fontSize: 11,
    opacity: 0.9,
  },
  shutterWrapper: {
    alignItems: 'center',
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    ...Shadows.lg,
  },
  shutterInnerRing: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterLabelEn: {
    ...Typography.labelLg,
    color: '#ffffff',
    marginTop: 6,
    fontWeight: '600',
  },
  shutterLabelHi: {
    ...Typography.bodySm,
    color: Palette.surfaceContainerHighest,
    fontSize: 12,
  },
  postCaptureCard: {
    backgroundColor: 'rgba(35, 76, 61, 0.9)',
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.md,
  },
  postCaptureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  capturedThumb: {
    width: 48,
    height: 56,
    borderRadius: Radii.md,
  },
  capturedCol: {
    flex: 1,
  },
  capturedTitle: {
    ...Typography.labelMd,
    color: '#ffffff',
    fontWeight: '700',
  },
  capturedSub: {
    ...Typography.bodySm,
    color: Palette.onPrimaryContainer,
  },
  twoWayActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  retakeBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionEn: {
    ...Typography.labelSm,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  actionHi: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    fontSize: 11,
    opacity: 0.8,
  },
  usePhotoBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadows.md,
  },
  actionUseEn: {
    ...Typography.labelSm,
    color: Palette.onSecondaryContainer,
    fontWeight: '700',
  },
  actionUseHi: {
    ...Typography.bodySm,
    color: Palette.onSecondaryContainer,
    fontSize: 11,
  },
});

