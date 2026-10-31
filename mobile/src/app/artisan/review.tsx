import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useArtisanProfile } from '@/hooks/queries/use-artisan-profile';
import { useCreateProduct } from '@/hooks/queries/use-products';

export default function ArtisanReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    description?: string;
    category?: string;
    fairPrice?: string;
    artisanShare?: string;
    materials?: string;
    estimatedHours?: string;
    idempotencyId?: string;
    photoUri?: string;
    photoPublicId?: string;
  }>();
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const { user } = useAuth();
  const { data: profile } = useArtisanProfile();
  const createProduct = useCreateProduct();

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productName, setProductName] = useState(params.title || 'Hand-embroidered cotton cushion cover');
  const [description, setDescription] = useState(
    params.description ||
      (params.title
        ? `Handcrafted artisan piece (${params.materials || 'Pure cotton and silk embroidery'})`
        : 'Hand embroidered cushion cover in red thread, 40 cm square.')
  );
  const [materials, setMaterials] = useState(params.materials || 'Cotton, silk thread');
  const [dimensions, setDimensions] = useState('40 x 40 cm');
  const [price, setPrice] = useState(params.fairPrice ? String(params.fairPrice) : '1450');
  const [isEditingName, setIsEditingName] = useState(false);
  const [washCareAdded, setWashCareAdded] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const artisanId = profile?.artisan_id || user?.id;
    if (!artisanId) {
      Alert.alert(isHindi ? 'त्रुटि' : 'Error', 'Artisan session not found.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createProduct.mutateAsync({
        artisan_id: artisanId,
        title: productName,
        description,
        category: params.category || 'Home Decor',
        price: Number(price) || 1200,
        image_url: params.photoUri || 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800',
        cloudinary_public_id: params.photoPublicId,
        materials,
        dimensions,
        production_lead_time_days: 7,
      });

      router.push({
        pathname: '/artisan/submission-status',
        params: {
          idempotencyId: params.idempotencyId || `wamid.HBgM${Date.now()}`,
          productName,
          price,
        },
      } as any);
    } catch (err: any) {
      const msg = err?.message || 'Submission failed';
      Alert.alert(isHindi ? 'प्रकाशन त्रुटि' : 'Submission Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Navigation & Offline Sync Status */}
        <View style={styles.topNavRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Palette.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={styles.langPill}
              onPress={toggleLanguage}
              accessibilityLabel="Toggle language"
            >
              <Text style={styles.langText}>EN | हि</Text>
            </TouchableOpacity>

            <View style={styles.offlinePill}>
              <Ionicons name="cloud-done" size={16} color={Palette.primary} />
              <Text style={styles.offlineText}>Offline ready</Text>
            </View>
          </View>
        </View>

        {/* Audio Toast */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? 'AI द्वारा तैयार ड्राफ़्ट की जाँच करें। यदि कोई जानकारी ग़लत है तो बदलें।'
                : 'Review the AI suggested draft. Change any details that need correction.'}
            </Text>
          </View>
        )}

        {/* Title & Voice Readout Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.subHeading}>Draft Review</Text>
            <Text style={styles.mainHeading}>Check your product</Text>
          </View>

          <TouchableOpacity
            style={styles.listenBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen to draft summary aloud"
          >
            <Ionicons name="volume-high" size={22} color={Palette.primary} />
            <Text style={styles.listenBtnText}>Listen</Text>
          </TouchableOpacity>
        </View>

        {/* AI Suggestion Advisory Banner */}
        <View style={styles.aiAdvisoryBanner}>
          <View style={styles.aiAdvisoryIconBox}>
            <Ionicons name="sparkles" size={18} color={Palette.primary} />
          </View>
          <View style={styles.aiAdvisoryCol}>
            <Text style={styles.aiAdvisoryTitle}>AI suggestion</Text>
            <Text style={styles.aiAdvisoryText}>
              Please read it. Change anything that is wrong.
            </Text>
          </View>
        </View>

        {/* Craft Photos Read-only Strip */}
        <View style={styles.photosSection}>
          <View style={styles.photosHeader}>
            <Text style={styles.photosTitle}>Craft Photos (1 of 3)</Text>
            <Text style={styles.photosSubtitle}>Verified capture</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
            <View style={styles.photoBoxPrimary}>
              <Image
                source={{
                  uri:
                    params.photoUri ||
                    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
                }}
                style={styles.thumbImage}
              />
              <View style={styles.primaryTag}>
                <Text style={styles.primaryTagText}>Primary</Text>
              </View>
            </View>

            <View style={styles.photoBox}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=70',
                }}
                style={styles.thumbImage}
              />
            </View>

            <View style={styles.photoBox}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
                }}
                style={styles.thumbImage}
              />
            </View>
          </ScrollView>
        </View>

        {/* Field Cards Stack */}
        <View style={styles.fieldsStack}>
          {/* Field 1: Name */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Name</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={Palette.primary} />
                <Text style={styles.aiBadgeText}>AI suggestion</Text>
              </View>
            </View>

            {isEditingName ? (
              <TextInput
                style={styles.fieldInput}
                value={productName}
                onChangeText={setProductName}
                onBlur={() => setIsEditingName(false)}
                autoFocus
              />
            ) : (
              <Text style={styles.fieldValueBold}>{productName}</Text>
            )}

            <View style={styles.fieldActionsRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => setIsEditingName(!isEditingName)}
              >
                <Ionicons name="create-outline" size={18} color={Palette.primary} />
                <Text style={styles.editBtnText}>{isEditingName ? 'Done' : 'Edit'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sayItBtn}
                onPress={() => setProductName('Hand-embroidered Red Cushion Cover')}
              >
                <Ionicons name="mic-outline" size={18} color={Palette.onSecondaryContainer} />
                <Text style={styles.sayItText}>Say it</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Field 2: Made of */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Made of</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={Palette.primary} />
                <Text style={styles.aiBadgeText}>AI suggestion</Text>
              </View>
            </View>
            <Text style={styles.fieldValue}>{materials}</Text>
          </View>

          {/* Field 3: Description */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Description</Text>
              <View style={styles.changedBadge}>
                <Ionicons name="create-outline" size={12} color={Palette.onSurfaceVariant} />
                <Text style={styles.changedBadgeText}>You changed it</Text>
              </View>
            </View>
            <Text style={styles.fieldValue}>{description}</Text>
          </View>

          {/* Field 4: Size */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Size</Text>
              <View style={styles.addedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={Palette.primary} />
                <Text style={styles.addedBadgeText}>You added it</Text>
              </View>
            </View>
            <Text style={styles.fieldValueBold}>{dimensions}</Text>
          </View>

          {/* Field 5: Quantity */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Quantity</Text>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={Palette.primary} />
                <Text style={styles.aiBadgeText}>AI suggestion</Text>
              </View>
            </View>
            <Text style={styles.fieldValueBold}>12 pieces</Text>
          </View>

          {/* Field 6: Price */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldTop}>
              <Text style={styles.fieldLabel}>Price</Text>
              <View style={styles.priceEstimateBadge}>
                <Ionicons name="information-circle-outline" size={14} color={Palette.onSurfaceVariant} />
                <Text style={styles.estimateBadgeText}>Estimated price, not a quote</Text>
              </View>
            </View>
            <Text style={styles.priceValue}>₹{price}</Text>
          </View>

          {/* Field 7: Missing Data Alert Card */}
          {!washCareAdded ? (
            <View style={styles.missingAlertCard}>
              <View style={styles.missingLeft}>
                <Ionicons name="warning" size={24} color={Palette.errorTerracotta} />
                <View>
                  <Text style={styles.missingTitle}>Wash care</Text>
                  <Text style={styles.missingSub}>Missing information</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addMissingBtn}
                onPress={() => setWashCareAdded(true)}
              >
                <Ionicons name="add" size={18} color={Palette.errorTerracotta} />
                <Text style={styles.addMissingText}>Add this</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.fieldCard}>
              <View style={styles.fieldTop}>
                <Text style={styles.fieldLabel}>Wash care</Text>
                <View style={styles.addedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Palette.primary} />
                  <Text style={styles.addedBadgeText}>Added</Text>
                </View>
              </View>
              <Text style={styles.fieldValue}>Gentle hand wash in cold water with mild detergent</Text>
            </View>
          )}
        </View>

        {/* Explicit Clarification Note */}
        <View style={styles.coordinatorNotice}>
          <Ionicons name="information-circle-outline" size={20} color={Palette.secondary} />
          <Text style={styles.coordinatorNoticeText}>
            A coordinator will review your draft first.
          </Text>
        </View>

        {/* Bottom 56dp Primary Trigger Dock */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            accessibilityLabel="Submit for review"
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Palette.onPrimary} />
            ) : (
              <Ionicons name="checkmark" size={24} color={Palette.onPrimary} />
            )}
            <Text style={styles.submitBtnText}>
              {isSubmitting
                ? isHindi ? 'जमा कर रहे हैं...' : 'Submitting...'
                : isHindi ? 'सत्यापन के लिए भेजें' : 'Submit for review'}
            </Text>
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
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  langPill: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
  },
  langText: {
    ...Typography.labelMd,
    color: Palette.primary,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
  },
  offlineText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  subHeading: {
    ...Typography.labelMd,
    color: Palette.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  mainHeading: {
    ...Typography.headlineLg,
    color: Palette.primary,
    marginTop: 2,
  },
  listenBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  aiAdvisoryBanner: {
    backgroundColor: Palette.primaryFixed,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  aiAdvisoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAdvisoryCol: {
    flex: 1,
  },
  aiAdvisoryTitle: {
    ...Typography.labelMd,
    color: Palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiAdvisoryText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    marginTop: 2,
  },
  photosSection: {
    gap: Spacing.xs,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photosTitle: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  photosSubtitle: {
    ...Typography.labelSm,
    color: Palette.secondary,
  },
  photosScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  photoBoxPrimary: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainer,
    ...Shadows.sm,
  },
  photoBox: {
    width: 90,
    height: 120,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainerHigh,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  primaryTag: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(50, 48, 41, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  primaryTagText: {
    ...Typography.labelSm,
    color: Palette.inverseOnSurface,
    fontSize: 10,
  },
  fieldsStack: {
    gap: Spacing.sm,
  },
  fieldCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadows.sm,
  },
  fieldTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  aiBadgeText: {
    ...Typography.labelSm,
    color: Palette.primary,
  },
  changedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  changedBadgeText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
  },
  addedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  addedBadgeText: {
    ...Typography.labelSm,
    color: Palette.primary,
  },
  fieldValueBold: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  fieldValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
  },
  fieldInput: {
    ...Typography.headlineSm,
    color: Palette.primary,
    borderBottomWidth: 1,
    borderBottomColor: Palette.primary,
    paddingVertical: 4,
  },
  fieldActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 4,
  },
  editBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  sayItBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.secondaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sayItText: {
    ...Typography.labelLg,
    color: Palette.onSecondaryContainer,
  },
  priceEstimateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  estimateBadgeText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  priceValue: {
    ...Typography.headlineLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  missingAlertCard: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  missingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  missingTitle: {
    ...Typography.labelLg,
    color: Palette.errorTerracotta,
    fontWeight: '700',
  },
  missingSub: {
    ...Typography.bodySm,
    color: Palette.errorTerracotta,
    fontSize: 12,
  },
  addMissingBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Shadows.sm,
  },
  addMissingText: {
    ...Typography.labelLg,
    color: Palette.errorTerracotta,
  },
  coordinatorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  coordinatorNoticeText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  bottomDock: {
    paddingTop: Spacing.xs,
  },
  submitBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  submitBtnText: {
    ...Typography.labelLg,
    color: Palette.surfaceContainerLowest,
    fontWeight: '700',
  },
});

