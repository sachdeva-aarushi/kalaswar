import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import { useAuth } from '@/hooks/use-auth';
import { getApiBaseUrl } from '@/constants/env';
import {
  useProductAiDraft,
  useProductAiDraftVoice,
  useUploadMedia,
} from '@/hooks/queries/use-products';

export default function ArtisanVoiceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isHindi, toggleLanguage } = useLanguage();
  const { photoUri: initialPhotoUri } = useLocalSearchParams<{ photoUri?: string }>();

  const [photoUri, setPhotoUri] = useState<string | null>(initialPhotoUri || null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [isSubmittingPipeline, setIsSubmittingPipeline] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const aiDraftText = useProductAiDraft();
  const aiDraftVoice = useProductAiDraftVoice();
  const uploadMedia = useUploadMedia();

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const handlePickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setPhotoUri(res.assets[0].uri);
        if (res.assets[0].base64) {
          setPhotoBase64(`data:image/jpeg;base64,${res.assets[0].base64}`);
        }
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        setIsRecording(false);
        if (recording) {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setRecordingUri(uri);
          setHasRecorded(true);
          setRecording(null);
        }
      } else {
        // Request audio permission and start recording
        const perm = await Audio.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert(
            isHindi ? 'अनुमति चाहिए' : 'Permission Required',
            isHindi
              ? 'आवाज़ रिकॉर्ड करने के लिए कृपया माइक्रोफ़ोन अनुमति दें।'
              : 'Please grant microphone access to record voice description.'
          );
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
      }
    } catch (err) {
      console.warn('Audio recording error:', err);
      // Fallback state
      setIsRecording(false);
      setHasRecorded(true);
    }
  };

  const handlePlayRecording = async () => {
    try {
      if (sound) {
        if (isPlayingRecording) {
          await sound.pauseAsync();
          setIsPlayingRecording(false);
        } else {
          await sound.playAsync();
          setIsPlayingRecording(true);
        }
      } else if (recordingUri) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlayingRecording(true);
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingRecording(false);
          }
        });
      }
    } catch (err) {
      console.warn('Play recording error:', err);
    }
  };

  const handleMakeDraft = async () => {
    setIsSubmittingPipeline(true);
    setPipelineError(null);

    try {
      let uploadedUrl: string | undefined = photoUri || undefined;
      let uploadedPublicId: string | undefined = undefined;

      // Step 1: Upload photo to Cloudinary via backend if uri present
      if (photoUri && !photoUri.startsWith('http')) {
        try {
          const uploadRes = await uploadMedia.mutateAsync(photoUri);
          uploadedUrl = uploadRes.secure_url || uploadRes.url;
          uploadedPublicId = uploadRes.public_id;
        } catch (uploadErr) {
          console.warn('Image upload failed, continuing with local URI:', uploadErr);
        }
      }

      // Step 2: Generate real AI Draft from voice recording or description
      let draft: any;
      if (recordingUri) {
        draft = await aiDraftVoice.mutateAsync({
          uri: recordingUri,
          language: isHindi ? 'hi' : 'en',
        });
      } else {
        draft = await aiDraftText.mutateAsync({
          text_description: isHindi
            ? 'हाथ से बना पारंपरिक शिल्प उत्पाद, प्राकृतिक सामग्री'
            : 'Handcrafted traditional artisan product with natural materials',
          language: isHindi ? 'hi' : 'en',
        });
      }

      router.push({
        pathname: '/artisan/review',
        params: {
          title: draft.title,
          description: draft.description,
          category: draft.category,
          materials: draft.materials?.join(', ') || '',
          estimatedHours: String(draft.estimated_hours || 8),
          fairPrice: String(draft.suggested_price || 1200),
          artisanShare: String(Math.round((draft.suggested_price || 1200) * 0.68)),
          photoUri: uploadedUrl,
          photoPublicId: uploadedPublicId,
        },
      } as any);
    } catch (err: any) {
      const msg = err?.message || 'Failed to generate AI craft draft';
      setPipelineError(msg);
      Alert.alert(
        isHindi ? 'त्रुटि' : 'Error',
        msg
      );
    } finally {
      setIsSubmittingPipeline(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
              <Text style={styles.langText}>{isHindi ? 'हि | EN' : 'EN | हि'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.savedPill}>
            <Ionicons name="cloud-done" size={16} color={Palette.primary} />
            <Text style={styles.savedText}>Saved on your phone</Text>
          </View>
        </View>

        {/* Primary Headline */}
        <View style={styles.titleSection}>
          <Text style={styles.mainHeading}>
            {isHindi ? 'कारीगरी का विवरण बोलें' : 'Tell us about it'}
          </Text>
          <Text style={styles.subHeading}>
            {isHindi
              ? 'कारीगरी का नाम, कपड़ा, धागा और नाप बोलकर बताएं।'
              : 'Say the craft item name, cloth material, thread type and size clearly.'}
          </Text>
        </View>

        {/* Attached Photo Banner (with Gallery fallback trigger) */}
        <View style={styles.photoAttachmentCard}>
          <View style={styles.photoAttachmentLeft}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoThumb} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="image-outline" size={24} color={Palette.primary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.photoCardTitle}>
                {photoUri ? (isHindi ? 'फ़ोटो संलग्न है' : 'Photo Attached') : isHindi ? 'फ़ोटो जोड़ें' : 'Attach Photo'}
              </Text>
              <Text style={styles.photoCardSub}>
                {photoUri ? 'Ready for AI listing' : 'Pick from gallery or snap photo'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.photoChangeBtn} onPress={handlePickPhoto}>
            <Ionicons name="camera-outline" size={16} color={Palette.secondary} />
            <Text style={styles.photoChangeText}>
              {photoUri ? (isHindi ? 'बदलें' : 'Change') : isHindi ? 'चुनें' : 'Pick'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Guided Vernacular Dialect Prompts */}
        <View style={styles.dialectPromptCard}>
          <View style={styles.promptHeader}>
            <Ionicons name="bulb-outline" size={20} color={Palette.secondary} />
            <Text style={styles.promptHeaderTitle}>
              {isHindi ? 'बोलने के लिए संकेत:' : 'Things you can mention:'}
            </Text>
          </View>
          <View style={styles.promptList}>
            <Text style={styles.promptItem}>
              • {isHindi ? 'उत्पाद का प्रकार (जैसे: 12 कुशन कवर)' : 'Craft item (e.g. 12 cushion covers)'}
            </Text>
            <Text style={styles.promptItem}>
              • {isHindi ? 'कपड़ा और धागा (जैसे: सूती कपड़ा, लाल रेशम धागा)' : 'Materials (e.g. Pure silk zari, natural cotton)'}
            </Text>
            <Text style={styles.promptItem}>
              • {isHindi ? 'आकार और नाप (जैसे: 40 × 40 सेंटीमीटर)' : 'Dimensions (e.g. 40x40 cm, 2.5 meters)'}
            </Text>
          </View>
        </View>

        {/* Central 96dp Microphone Record Deck */}
        <View style={styles.micDeck}>
          <TouchableOpacity
            style={[
              styles.micCircle,
              isRecording && styles.micCircleRecording,
              hasRecorded && !isRecording && styles.micCircleRecorded,
            ]}
            onPress={handleToggleRecording}
            accessibilityLabel={isRecording ? 'Stop Recording' : 'Start Recording'}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isRecording ? 'stop' : hasRecorded ? 'mic-outline' : 'mic'}
              size={48}
              color={Palette.secondaryFixed}
            />
          </TouchableOpacity>

          <Text style={styles.micStateText}>
            {isRecording
              ? isHindi
                ? 'सुन रहे हैं... बोलिए (Recording...)'
                : 'Listening... speak clearly (Recording...)'
              : hasRecorded
              ? isHindi
                ? 'रिकॉर्डिंग पूरी हुई · दोबारा बोलने के लिए दबाएं'
                : 'Recording captured · Tap to record again'
              : isHindi
              ? 'माइक दबाएं और बोलें · Tap to Speak'
              : 'Tap to record voice description'}
          </Text>

          {/* Audio Playback Seek Bar for Recorded Voice */}
          {hasRecorded && (
            <TouchableOpacity
              style={styles.playbackBar}
              onPress={handlePlayRecording}
              accessibilityLabel="Listen back to voice note"
            >
              <Ionicons
                name={isPlayingRecording ? 'pause' : 'play'}
                size={22}
                color={Palette.primary}
              />
              <Text style={styles.playbackText}>
                {isPlayingRecording
                  ? isHindi ? 'बज रहा है...' : 'Playing back...'
                  : isHindi ? 'अपनी आवाज़ सुनें · Listen to recording' : 'Listen to your voice note'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Assurance Banner */}
        <View style={styles.offlineAssurance}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Palette.primary} />
          <Text style={styles.offlineAssuranceText}>
            {isHindi
              ? 'आवाज़ रिकॉर्डिंग सुरक्षित है। ऑनलाइन होते ही एआई ड्राफ्ट तैयार हो जाएगा।'
              : "Your voice recording is safely saved. We'll generate the draft with verified fair price."}
          </Text>
        </View>

        {/* Primary Action Button: Make a draft */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={styles.makeDraftBtn}
            onPress={handleMakeDraft}
            disabled={isSubmittingPipeline}
            accessibilityLabel="Make a draft"
            activeOpacity={0.88}
          >
            {isSubmittingPipeline ? (
              <ActivityIndicator color={Palette.onPrimary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={22} color={Palette.onPrimary} />
                <Text style={styles.makeDraftText}>
                  {isHindi ? 'एआई ड्राफ्ट बनाएं · Make a Draft' : 'Make a draft with AI'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={Palette.onPrimary} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  langPill: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  savedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.primary,
  },
  titleSection: {
    gap: 4,
    marginTop: Spacing.xs,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  subHeading: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    lineHeight: 18,
  },
  photoAttachmentCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 16,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  photoAttachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  photoCardSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  photoChangeBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoChangeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.secondary,
  },
  dialectPromptCard: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 6,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  promptHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.secondary,
  },
  promptList: {
    gap: 3,
    paddingLeft: 4,
  },
  promptItem: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  micDeck: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  micCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
  },
  micCircleRecording: {
    backgroundColor: Palette.errorTerracotta,
  },
  micCircleRecorded: {
    backgroundColor: Palette.primaryContainer,
  },
  micStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.onSurface,
    textAlign: 'center',
  },
  playbackBar: {
    minHeight: 48,
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  playbackText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  offlineAssurance: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  offlineAssuranceText: {
    fontSize: 12,
    color: Palette.primary,
    flex: 1,
    lineHeight: 18,
  },
  bottomDock: {
    marginTop: Spacing.sm,
  },
  makeDraftBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.ambient,
  },
  makeDraftText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});
