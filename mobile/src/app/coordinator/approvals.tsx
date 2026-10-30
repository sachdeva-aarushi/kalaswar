import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import {
  useCoordinatorOverview,
  useApproveProduct,
  type PendingProductReview,
} from '@/hooks/queries/use-coordinator';
import { LoadingState, ErrorState, EmptyState, AuthExpiredState } from '@/components/StateView';

export default function CoordinatorApprovalsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: overview, isLoading, isError, error, refetch } = useCoordinatorOverview();
  const approveMutation = useApproveProduct();
  const isHindi = i18n.language === 'hi';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ title: string; body: string } | null>(null);

  const reviews = overview?.pendingReviews ?? [];
  const currentProduct: PendingProductReview | undefined = reviews[currentIndex] || reviews[0];

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter((c) => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const showNotification = (title: string, body: string) => {
    setFeedbackToast({ title, body });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  const handleApprove = () => {
    if (!currentProduct) return;
    approveMutation.mutate(
      { productId: currentProduct.id, approved: true },
      {
        onSuccess: () => {
          showNotification(
            isHindi ? 'उत्पाद स्वीकृत · Product Approved' : 'Product Approved',
            isHindi
              ? `${currentProduct.artisanName} को स्वीकृति सूचना भेज दी गई है।`
              : `${currentProduct.artisanName} received coordinator approval.`
          );
          if (currentIndex < reviews.length - 1) {
            setTimeout(() => setCurrentIndex(currentIndex + 1), 1000);
          } else {
            setTimeout(() => router.back(), 1500);
          }
        },
      }
    );
  };

  const handleRequestChanges = () => {
    if (!currentProduct) return;
    const chipsMessage = selectedChips.length > 0 ? selectedChips.join(', ') : 'कृपया विवरण जांचें';
    showNotification(
      isHindi ? 'बदलाव अनुरोध भेजा गया' : 'Changes Requested',
      isHindi
        ? `${currentProduct.artisanName} को सुधार हेतु संदेश भेजा गया: ${chipsMessage}`
        : `Notes sent to ${currentProduct.artisanName}: ${chipsMessage}`
    );
  };

  const handleDecline = () => {
    Alert.alert(
      isHindi ? 'अस्वीकृति की पुष्टि' : 'Decline Product',
      isHindi
        ? 'क्या आप सुनिश्चित हैं कि यह उत्पाद क्लस्टर मानकों के अनुरूप नहीं है?'
        : 'Are you sure this product does not meet cluster standards? A written reason will be logged.',
      [
        { text: isHindi ? 'रद्द करें' : 'Cancel', style: 'cancel' },
        {
          text: isHindi ? 'अस्वीकार करें' : 'Decline',
          style: 'destructive',
          onPress: () => {
            showNotification(
              isHindi ? 'अस्वीकृति दर्ज की गई' : 'Product Declined',
              isHindi
                ? 'निरीक्षण रिपोर्ट क्लस्टर एडमिन को भेजी गई।'
                : 'Inspection audit logged for coordinator review.'
            );
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message={isHindi ? 'निरीक्षण सूची लोड हो रही है...' : 'Loading inspection queue...'} />
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
          title={isHindi ? 'निरीक्षण लोड नहीं हो सका' : 'Could not load approvals'}
          message={error?.message || (isHindi ? 'कृपया पुनः प्रयास करें' : 'Please try again')}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  if (!currentProduct) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title={isHindi ? 'सभी निरीक्षण पूरे हो चुके हैं' : 'All reviews completed'}
          message={isHindi ? 'वर्तमान में कोई लंबित उत्पाद समीक्षा शेष नहीं है।' : 'Great job! There are no pending reviews in the queue.'}
          actionLabel={isHindi ? 'वापस जाएं' : 'Go back'}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

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
          <Text style={styles.headerTitle}>Coordinator Quality Inspection</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.langPill}
            onPress={toggleLanguage}
            accessibilityLabel="Toggle language"
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
        {/* Offline / Sync Status Indicator Bar */}
        <View style={styles.syncBar}>
          <View style={styles.syncLeft}>
            <Ionicons name="cloud-done" size={18} color={Palette.primary} />
            <Text style={styles.syncTitle}>Cluster Sync Active</Text>
          </View>
          <Text style={styles.syncSub}>SHG #BHAG-04</Text>
        </View>

        {/* Stepper Navigation Card */}
        <View style={styles.stepperCard}>
          <View style={styles.stepperLeft}>
            <TouchableOpacity
              style={[styles.stepperNavBtn, currentIndex === 0 && styles.stepperNavDisabled]}
              onPress={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
              accessibilityLabel="Previous product"
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={currentIndex === 0 ? Palette.outlineVariant : Palette.primary}
              />
            </TouchableOpacity>

            <View style={styles.stepperTextCol}>
              <Text style={styles.stepperTitle}>
                {isHindi
                  ? `उत्पाद ${currentIndex + 1} / ${reviews.length}`
                  : `Product ${currentIndex + 1} of ${reviews.length}`}
              </Text>
              <Text style={styles.stepperSub}>Inspection Queue</Text>
            </View>
          </View>

          <View style={styles.stepperRight}>
            <TouchableOpacity
              style={styles.listenPill}
              onPress={handlePlayAudio}
              accessibilityLabel="Listen to voice readout"
            >
              <Ionicons name="volume-high" size={18} color={Palette.primary} />
              <Text style={styles.listenPillText}>
                {isHindi ? 'सुनें' : 'Listen'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepperNavBtn, currentIndex === reviews.length - 1 && styles.stepperNavDisabled]}
              onPress={() => currentIndex < reviews.length - 1 && setCurrentIndex(currentIndex + 1)}
              disabled={currentIndex === reviews.length - 1}
              accessibilityLabel="Next product"
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={currentIndex === reviews.length - 1 ? Palette.outlineVariant : Palette.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reviewer & Submitter Card */}
        <View style={styles.reviewerCard}>
          <View style={styles.submitterLeft}>
            <View style={styles.submitterAvatar}>
              <Text style={styles.submitterInitial}>
                {currentProduct.artisanName.charAt(0)}
              </Text>
            </View>
            <View style={styles.submitterCol}>
              <View style={styles.nameVerifiedRow}>
                <Text style={styles.artisanName}>{currentProduct.artisanName}</Text>
                <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
              </View>
              <Text style={styles.artisanCluster}>Artisan · Bhagirathi Cluster</Text>
            </View>
          </View>

          <View style={styles.reviewerRight}>
            <Text style={styles.reviewerLabel}>Reviewer</Text>
            <Text style={styles.reviewerName}>Sunita Devi (Coordinator)</Text>
          </View>
        </View>

        {/* Product Visual Evidence Showcase */}
        <View style={styles.showcaseContainer}>
          <View style={styles.imageFrame}>
            <Image
              source={{ uri: currentProduct.imageUrl }}
              style={styles.showcaseImage}
              resizeMode="cover"
            />
            {/* Photo Counter Badge */}
            <View style={styles.photoCountBadge}>
              <Ionicons name="camera-outline" size={16} color={Palette.primary} />
              <Text style={styles.photoCountText}>1 of 3 photos</Text>
            </View>
            {/* Quick Zoom Target */}
            <TouchableOpacity
              style={styles.zoomButton}
              accessibilityLabel="Zoom photo for detailed inspection"
            >
              <Ionicons name="search" size={22} color={Palette.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.craftHeading}>{currentProduct.title}</Text>
            <Text style={styles.craftSpecs}>
              {currentProduct.material} · {currentProduct.dimensions}
            </Text>
          </View>
        </View>

        {/* Audit Ledger of Product Fields */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <Text style={styles.ledgerTitle}>Audit Ledger · Product Details</Text>
            <Text style={styles.ledgerSubtitle}>Coordinator Verification</Text>
          </View>

          {/* Row 1: Craft Type */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Craft Type</Text>
              <Text style={styles.ledgerFieldValue}>{currentProduct.craftType}</Text>
            </View>
            <View style={styles.acceptedPill}>
              <Ionicons name="checkmark-circle" size={15} color={Palette.primary} />
              <Text style={styles.acceptedPillText}>Accepted as suggested</Text>
            </View>
          </View>

          {/* Row 2: Material */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Material</Text>
              <Text style={styles.ledgerFieldValue}>{currentProduct.material}</Text>
            </View>
            <View style={styles.acceptedPill}>
              <Ionicons name="checkmark-circle" size={15} color={Palette.primary} />
              <Text style={styles.acceptedPillText}>Accepted as suggested</Text>
            </View>
          </View>

          {/* Row 3: Description */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Description</Text>
              <Text style={styles.ledgerFieldValue}>"{currentProduct.description}"</Text>
            </View>
            <View style={styles.editedPill}>
              <Ionicons name="create-outline" size={15} color={Palette.onSecondaryContainer} />
              <Text style={styles.editedPillText}>Edited by artisan</Text>
            </View>
          </View>

          {/* Row 4: Dimensions */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Dimensions</Text>
              <Text style={styles.ledgerFieldValue}>{currentProduct.dimensions}</Text>
            </View>
            <View style={styles.acceptedPill}>
              <Ionicons name="add-circle-outline" size={15} color={Palette.primary} />
              <Text style={styles.acceptedPillText}>Added by artisan</Text>
            </View>
          </View>

          {/* Row 5: Quantity */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Quantity</Text>
              <Text style={styles.ledgerFieldValue}>{currentProduct.quantity} units</Text>
            </View>
            <View style={styles.aiPill}>
              <Ionicons name="sparkles" size={14} color={Palette.onSurfaceVariant} />
              <Text style={styles.aiPillText}>AI suggestion</Text>
            </View>
          </View>

          {/* Row 6: Price Line with Estimate Benchmark */}
          <View style={[styles.ledgerRow, styles.priceRow]}>
            <View style={styles.ledgerCol}>
              <Text style={styles.ledgerFieldLabel}>Price per unit</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceNumber}>₹{currentProduct.pricePerUnit.toLocaleString()}</Text>
                <Text style={styles.pricePerUnitLabel}>per unit</Text>
              </View>
            </View>
            <View style={styles.benchmarkPill}>
              <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
              <Text style={styles.benchmarkPillText}>Matches cluster benchmark</Text>
            </View>
          </View>
        </View>

        {/* AI Transparency & Audio Transcription Accordion */}
        <View style={styles.aiAccordionCard}>
          <TouchableOpacity
            style={styles.aiAccordionHeader}
            onPress={() => setIsAiPanelOpen(!isAiPanelOpen)}
            accessibilityLabel="Toggle AI Transcription panel"
            activeOpacity={0.8}
          >
            <View style={styles.aiHeaderLeft}>
              <Ionicons name="sparkles" size={20} color={Palette.primary} />
              <View style={styles.aiTitleCol}>
                <Text style={styles.aiMainTitle}>AI Transcription & Original Draft</Text>
                <Text style={styles.aiSubTitle}>View voice note audio transcription</Text>
              </View>
            </View>
            <Ionicons
              name={isAiPanelOpen ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={Palette.primary}
            />
          </TouchableOpacity>

          {isAiPanelOpen && (
            <View style={styles.aiPanelContent}>
              {/* Voice Note Transcription (Sage Box) */}
              <View style={styles.sageNoteBox}>
                <View style={styles.sageHeader}>
                  <Ionicons name="mic-outline" size={16} color={Palette.primary} />
                  <Text style={styles.sageHeaderTitle}>Artisan Voice Note Transcription</Text>
                </View>
                <Text style={styles.sageVoiceQuote}>
                  "{currentProduct.voiceTranscript || 'सुनीता दीदी, ये बारह कुशन कवर तैयार हैं। लाल रेशम धागे और शीशे का बारीक काम किया है। नाप चालीस सेंटीमीटर है।'}"
                </Text>
              </View>

              {/* Initial AI Draft */}
              <View style={styles.aiDraftBox}>
                <Text style={styles.aiDraftHeader}>Initial AI Draft</Text>
                <Text style={styles.aiDraftText}>
                  "{currentProduct.initialAiDraft || 'Red thread embroidered decorative cushion set with traditional mirror inserts. 40x40 standard dimensions for living room decor.'}"
                </Text>
                <View style={styles.aiRefinementNotice}>
                  <Ionicons name="information-circle-outline" size={16} color={Palette.onSurfaceVariant} />
                  <Text style={styles.aiRefinementText}>
                    {currentProduct.artisanName} refined this to highlight authentic square dimensions before sending.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Quick Feedback Suggestions */}
        <View style={styles.feedbackSection}>
          <View style={styles.feedbackHeaderRow}>
            <Text style={styles.feedbackTitle}>Quick Feedback Suggestions</Text>
            <Text style={styles.feedbackOptional}>
              {isHindi ? 'वैकल्पिक' : 'Optional'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {[
              { label: 'Photo is blurry', icon: 'image-outline' },
              { label: 'Price looks low', icon: 'cash-outline' },
              { label: 'Description needs detail', icon: 'document-text-outline' },
              { label: 'Verify dimensions', icon: 'resize-outline' },
            ].map((chip) => {
              const isSelected = selectedChips.includes(chip.label);
              return (
                <TouchableOpacity
                  key={chip.label}
                  style={[styles.feedbackChip, isSelected && styles.feedbackChipSelected]}
                  onPress={() => toggleChip(chip.label)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={chip.icon as any}
                    size={16}
                    color={isSelected ? Palette.onSecondaryContainer : Palette.secondary}
                  />
                  <Text style={[styles.feedbackChipText, isSelected && styles.feedbackChipTextSelected]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Decision Bottom Actions Area (56dp standard height) */}
        <View style={styles.actionButtonsArea}>
          {/* Primary CTA: Approve Product */}
          <TouchableOpacity
            style={styles.approveButton}
            onPress={handleApprove}
            accessibilityLabel="Approve product"
            activeOpacity={0.88}
            disabled={approveMutation.isPending}
          >
            <Ionicons name="checkmark-circle" size={24} color={Palette.onPrimary} />
            <Text style={styles.approveButtonText}>
              {approveMutation.isPending
                ? (isHindi ? 'स्वीकृत हो रहा है...' : 'Approving...')
                : (isHindi ? 'उत्पाद स्वीकृत करें' : 'Approve product')}
            </Text>
          </TouchableOpacity>

          {/* Secondary CTA: Request Changes */}
          <TouchableOpacity
            style={styles.requestChangesButton}
            onPress={handleRequestChanges}
            accessibilityLabel="Request changes"
            activeOpacity={0.88}
          >
            <Ionicons name="create-outline" size={22} color={Palette.primary} />
            <Text style={styles.requestChangesText}>
              {isHindi ? 'बदलाव का अनुरोध करें' : 'Request changes'}
            </Text>
          </TouchableOpacity>

          {/* Quiet Decline Action */}
          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            accessibilityLabel="Decline product"
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={Palette.errorTerracotta} />
            <Text style={styles.declineText}>
              {isHindi ? 'अस्वीकार करें (कारण आवश्यक)' : 'Decline (Reason required)'}
            </Text>
          </TouchableOpacity>

          {/* Legal / Cluster Responsibility Notice */}
          <View style={styles.legalNoticeBox}>
            <Ionicons name="shield-checkmark-outline" size={18} color={Palette.onSurfaceVariant} />
            <Text style={styles.legalNoticeText}>
              Approval records this item as Approved. {currentProduct.artisanName} will be notified immediately.
              Publishing and Craft Passport generation are subsequent workflow steps.
            </Text>
          </View>
        </View>

        {/* Feedback Toast */}
        {feedbackToast && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={24} color={Palette.primaryFixed} />
            <View style={styles.toastCol}>
              <Text style={styles.toastTitle}>{feedbackToast.title}</Text>
              <Text style={styles.toastBody}>{feedbackToast.body}</Text>
            </View>
          </View>
        )}
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
    flex: 1,
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
    fontSize: 16,
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
  },
  userBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  syncBar: {
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncTitle: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '600',
  },
  syncSub: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  stepperCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  stepperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepperNavBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  stepperNavDisabled: {
    opacity: 0.4,
  },
  stepperTextCol: {
    flexDirection: 'column',
  },
  stepperTitle: {
    ...Typography.labelMd,
    color: Palette.onSurface,
    fontWeight: '700',
  },
  stepperSub: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  stepperRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listenPill: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listenPillText: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  reviewerCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  submitterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  submitterAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitterInitial: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  submitterCol: {
    flexDirection: 'column',
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  artisanName: {
    ...Typography.headlineSm,
    color: Palette.onSurface,
    fontSize: 16,
  },
  artisanCluster: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    fontSize: 12,
  },
  reviewerRight: {
    alignItems: 'flex-end',
  },
  reviewerLabel: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontSize: 11,
  },
  reviewerName: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  showcaseContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  imageFrame: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainer,
    ...Shadows.md,
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoCountText: {
    ...Typography.labelMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  zoomButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  titleSection: {
    marginTop: Spacing.sm,
    paddingHorizontal: 4,
  },
  craftHeading: {
    ...Typography.headlineLg,
    color: Palette.onSurface,
    fontSize: 20,
    lineHeight: 28,
  },
  craftSpecs: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontSize: 16,
    marginTop: 2,
  },
  ledgerSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  ledgerTitle: {
    ...Typography.labelLg,
    color: Palette.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
  },
  ledgerSubtitle: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  ledgerRow: {
    minHeight: 56,
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  priceRow: {
    backgroundColor: Palette.surfaceContainerHigh,
  },
  ledgerCol: {
    flex: 1,
  },
  ledgerFieldLabel: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontSize: 11,
  },
  ledgerFieldValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
    marginTop: 2,
  },
  acceptedPill: {
    backgroundColor: Palette.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  acceptedPillText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '600',
  },
  editedPill: {
    backgroundColor: Palette.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editedPillText: {
    ...Typography.labelSm,
    color: Palette.onSecondaryContainer,
    fontWeight: '600',
  },
  aiPill: {
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiPillText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontWeight: '600',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  priceNumber: {
    ...Typography.headlineMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  pricePerUnitLabel: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  benchmarkPill: {
    backgroundColor: Palette.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benchmarkPillText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  aiAccordionCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  aiAccordionHeader: {
    minHeight: 56,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  aiTitleCol: {
    flex: 1,
  },
  aiMainTitle: {
    ...Typography.labelMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  aiSubTitle: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    fontSize: 12,
  },
  aiPanelContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sageNoteBox: {
    backgroundColor: Palette.tertiaryGuidance,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 6,
  },
  sageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sageHeaderTitle: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sageVoiceQuote: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  aiDraftBox: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 4,
  },
  aiDraftHeader: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  aiDraftText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    lineHeight: 20,
  },
  aiRefinementNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  aiRefinementText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    fontSize: 11,
    flex: 1,
  },
  feedbackSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  feedbackTitle: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  feedbackOptional: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '600',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 4,
  },
  feedbackChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  feedbackChipSelected: {
    backgroundColor: Palette.secondaryContainer,
  },
  feedbackChipText: {
    ...Typography.labelMd,
    color: Palette.onSurface,
  },
  feedbackChipTextSelected: {
    color: Palette.onSecondaryContainer,
    fontWeight: '700',
  },
  actionButtonsArea: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  approveButton: {
    minHeight: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  approveButtonText: {
    ...Typography.headlineSm,
    color: Palette.onPrimary,
    fontSize: 16,
  },
  requestChangesButton: {
    minHeight: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  requestChangesText: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontSize: 16,
  },
  declineButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  declineText: {
    ...Typography.labelLg,
    color: Palette.errorTerracotta,
  },
  legalNoticeBox: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  legalNoticeText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  toastBanner: {
    position: 'absolute',
    bottom: 24,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Palette.inverseSurface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  toastCol: {
    flex: 1,
  },
  toastTitle: {
    ...Typography.labelMd,
    color: Palette.inverseOnSurface,
    fontWeight: '700',
  },
  toastBody: {
    ...Typography.bodySm,
    color: Palette.inverseOnSurface,
    fontSize: 12,
  },
});

