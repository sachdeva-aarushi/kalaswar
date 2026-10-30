import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import {
  useArtisanTasks,
  useLogTaskProgress,
  type ArtisanTask,
} from '@/hooks/queries/use-artisan-tasks';
import { LoadingState, ErrorState, EmptyState, AuthExpiredState } from '@/components/StateView';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const { data: tasks, isLoading, isError, error, refetch } = useArtisanTasks();
  const logProgressMutation = useLogTaskProgress();

  const task: ArtisanTask | undefined =
    tasks?.find((t) => t.id === id || t.orderNumber === id) || tasks?.[0];

  const [currentCount, setCurrentCount] = useState<number>(task?.completedUnits ?? 4);
  const [selectedStatus, setSelectedStatus] = useState<'not_started' | 'stitching' | 'finished'>('stitching');
  const [artisanMessage, setArtisanMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const maxUnits = task?.totalUnits ?? task?.targetUnits ?? 12;

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    setTimeout(() => {
      setArtisanMessage(
        isHindi
          ? 'धागा कम पड़ गया है (Need 2 more thread rolls)'
          : 'Need 2 more thread rolls for red embroidery border.'
      );
      setIsListening(false);
    }, 2000);
  };

  const handleSaveProgress = () => {
    if (!task) return;
    logProgressMutation.mutate(
      { taskId: task.id, completedUnits: currentCount, notes: artisanMessage },
      {
        onSuccess: () => {
          setShowSavedToast(true);
          setTimeout(() => {
            setShowSavedToast(false);
          }, 3000);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message={isHindi ? 'कार्य विवरण लोड हो रहा है...' : 'Loading task details...'} />
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
          title={isHindi ? 'कार्य लोड नहीं हो सका' : 'Could not load task'}
          message={error?.message || (isHindi ? 'कृपया पुनः प्रयास करें' : 'Please try again')}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title={isHindi ? 'कार्य नहीं मिला' : 'Task not found'}
          message={isHindi ? 'कृपया कार्य सूची में वापस जाएं।' : 'Please return to your tasks list.'}
          actionLabel={isHindi ? 'वापस जाएं' : 'Go back'}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="color-palette-outline" size={24} color={Palette.onPrimary} />
          </View>
          <Text style={styles.headerTitle}>M-05: Task Detail</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={handlePlayAudio}
          accessibilityLabel="Voice Assistant"
        >
          <Ionicons name="volume-high-outline" size={26} color={Palette.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action & Audio Assistance Bar */}
        <View style={styles.utilityBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Palette.primary} />
            <Text style={styles.backButtonText}>वापस · Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.listenButton}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen to screen instructions"
          >
            <Ionicons name="volume-high" size={22} color={Palette.onSecondaryContainer} />
            <Text style={styles.listenButtonText}>सुनें · Listen</Text>
          </TouchableOpacity>
        </View>

        {/* Audio Toast */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? `यह 12 कुशन कवर की सिलाई का काम है। अब तक 4 पूरे हुए हैं। तारीख 20 नवंबर है।`
                : `This task is for 12 cushion covers. 4 are completed so far. Due date is 20 November.`}
            </Text>
          </View>
        )}

        {/* Offline Trust Banner */}
        <View style={styles.offlineBanner}>
          <Ionicons name="checkmark-done-circle" size={20} color={Palette.primary} />
          <Text style={styles.offlineBannerText}>
            फ़ोन पर सुरक्षित · Saved on your phone
          </Text>
        </View>

        {/* Primary Task Title (Bilingual) */}
        <View style={styles.titleSection}>
          <Text style={styles.taskTitleEn}>{task.title || task.craftName}</Text>
          <Text style={styles.taskTitleHi}>{task.titleHi || task.craftNameHi || '12 कुशन कवर की कढ़ाई'}</Text>
        </View>

        {/* Product Craft Photo (4:5 Aspect Ratio) */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: task.imageUrl }}
            style={styles.craftImage}
            resizeMode="cover"
          />
          <View style={styles.referenceSamplePill}>
            <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
            <Text style={styles.referenceSampleText}>नमूना फ़ोटो · Reference Sample</Text>
          </View>
        </View>

        {/* Order & Assignment Metadata Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>FOR · किसके लिए</Text>
            <Text style={styles.metaValue}>
              {task.clusterName || task.cluster} ({task.orderNumber})
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>DUE · तय तारीख</Text>
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={18} color={Palette.primary} />
              <Text style={styles.dueDateValue}>
                {task.dueDate} ({task.dueDateHi || '20 नवंबर'})
              </Text>
            </View>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>MATERIALS GIVEN · मिला हुआ सामान</Text>
            <View style={styles.materialsRow}>
              <Ionicons name="checkmark-circle" size={18} color={Palette.primary} />
              <Text style={styles.materialsValue}>
                {Array.isArray(task.materialsAssigned)
                  ? task.materialsAssigned.join(', ')
                  : task.materialsAssigned || task.materialsNote || 'सूती कपड़ा, लाल रेशमी धागा'}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Stepper / Radio Selection */}
        <View style={styles.statusSection}>
          <Text style={styles.statusSectionTitle}>
            काम कैसा चल रहा है? · How is it going?
          </Text>

          {/* Option 1: Not Started */}
          <TouchableOpacity
            style={[
              styles.statusOption,
              selectedStatus === 'not_started' && styles.statusOptionActive,
            ]}
            onPress={() => setSelectedStatus('not_started')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedStatus === 'not_started' }}
          >
            <View style={styles.statusOptionLeft}>
              <View style={styles.statusIconCircle}>
                <Ionicons name="ellipse-outline" size={22} color={Palette.onSurfaceVariant} />
              </View>
              <View>
                <Text style={styles.statusLabelEn}>Not started</Text>
                <Text style={styles.statusLabelHi}>काम अभी शुरू नहीं हुआ</Text>
              </View>
            </View>
            <Ionicons
              name={selectedStatus === 'not_started' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selectedStatus === 'not_started' ? Palette.primary : Palette.outlineVariant}
            />
          </TouchableOpacity>

          {/* Option 2: Stitching */}
          <TouchableOpacity
            style={[
              styles.statusOption,
              selectedStatus === 'stitching' && styles.statusOptionActive,
            ]}
            onPress={() => setSelectedStatus('stitching')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedStatus === 'stitching' }}
          >
            <View style={styles.statusOptionLeft}>
              <View style={[styles.statusIconCircle, { backgroundColor: Palette.primaryContainer }]}>
                <Ionicons name="build" size={20} color={Palette.onPrimary} />
              </View>
              <View>
                <Text style={[styles.statusLabelEn, { color: Palette.primary }]}>Stitching</Text>
                <Text style={styles.statusLabelHi}>सिलाई जारी है</Text>
              </View>
            </View>
            <View style={styles.activeCheckBadge}>
              <Ionicons name="checkmark" size={16} color={Palette.onPrimary} />
            </View>
          </TouchableOpacity>

          {/* Option 3: Finished */}
          <TouchableOpacity
            style={[
              styles.statusOption,
              selectedStatus === 'finished' && styles.statusOptionActive,
            ]}
            onPress={() => setSelectedStatus('finished')}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedStatus === 'finished' }}
          >
            <View style={styles.statusOptionLeft}>
              <View style={styles.statusIconCircle}>
                <Ionicons name="checkmark-done" size={22} color={Palette.onSurfaceVariant} />
              </View>
              <View>
                <Text style={styles.statusLabelEn}>Finished</Text>
                <Text style={styles.statusLabelHi}>सब तैयार हो गया</Text>
              </View>
            </View>
            <Ionicons
              name={selectedStatus === 'finished' ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selectedStatus === 'finished' ? Palette.primary : Palette.outlineVariant}
            />
          </TouchableOpacity>
        </View>

        {/* Big Tactile Counter */}
        <View style={styles.counterCard}>
          <Text style={styles.counterHeaderTitle}>
            कितने तैयार हैं? · How many are done?
          </Text>
          <Text style={styles.counterHeaderSub}>
            दबाकर संख्या बदलें (Tap to adjust tally)
          </Text>

          <View style={styles.counterControlsRow}>
            {/* Minus Button (56dp target) */}
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => currentCount > 0 && setCurrentCount(currentCount - 1)}
              accessibilityLabel="Decrease quantity"
            >
              <Ionicons name="remove" size={32} color={Palette.primary} />
            </TouchableOpacity>

            {/* Large Digit Display */}
            <View style={styles.countDisplay}>
              <Text style={styles.countText}>
                {currentCount}{' '}
                <Text style={styles.maxUnitsText}>/ {maxUnits}</Text>
              </Text>
              <Text style={styles.unitsDoneLabel}>कुशन बने · Made</Text>
            </View>

            {/* Plus Button (56dp target) */}
            <TouchableOpacity
              style={[styles.counterButton, styles.plusButton]}
              onPress={() => currentCount < maxUnits && setCurrentCount(currentCount + 1)}
              accessibilityLabel="Increase quantity"
            >
              <Ionicons name="add" size={32} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Text & Voice Communication Card */}
        <View style={styles.commCard}>
          <Text style={styles.commTitle}>
            समन्वयक को कुछ बताना है?
          </Text>
          <Text style={styles.commSub}>
            Anything to tell the coordinator?
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="यहाँ लिखें या बोलें · Type here or speak..."
              placeholderTextColor={Palette.onSurfaceVariant}
              value={artisanMessage}
              onChangeText={setArtisanMessage}
            />
          </View>

          {/* Prominent Voice Action Button (56dp target) */}
          <TouchableOpacity
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={handleVoiceInput}
            accessibilityLabel="Say message"
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={26}
              color={isListening ? Palette.errorTerracotta : Palette.primary}
            />
            <Text style={styles.voiceButtonText}>
              {isListening ? 'सुन रहे हैं... · Listening...' : 'बोलें · Say it'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirmation Toast */}
        {showSavedToast && (
          <View style={styles.savedToast}>
            <View style={styles.savedToastLeft}>
              <Ionicons name="checkmark-circle" size={24} color={Palette.primary} />
              <Text style={styles.savedToastText}>प्रगति सहेजी गई · Progress saved</Text>
            </View>
            <Ionicons name="checkmark-done" size={20} color={Palette.primary} />
          </View>
        )}

        {/* Primary Bottom Action (56dp target) */}
        <View style={styles.bottomActionContainer}>
          <TouchableOpacity
            style={styles.saveProgressButton}
            onPress={handleSaveProgress}
            accessibilityLabel="Save progress"
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle" size={24} color={Palette.onPrimary} />
            <Text style={styles.saveProgressText}>
              प्रगति सहेजें · Save progress
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
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
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 90,
    gap: Spacing.md,
  },
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
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
  backButtonText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  listenButton: {
    minHeight: 56,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenButtonText: {
    ...Typography.labelLg,
    color: Palette.onSecondaryContainer,
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surfaceContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  offlineBannerText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    fontWeight: '600',
  },
  titleSection: {
    gap: 4,
  },
  taskTitleEn: {
    ...Typography.headlineLg,
    color: Palette.primary,
    lineHeight: 32,
  },
  taskTitleHi: {
    ...Typography.headlineMd,
    color: Palette.onSurfaceVariant,
    fontWeight: '500',
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceContainerHigh,
    ...Shadows.md,
  },
  craftImage: {
    width: '100%',
    height: '100%',
  },
  referenceSamplePill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  referenceSampleText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '600',
  },
  metaCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    ...Typography.labelSm,
    color: Palette.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  materialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  materialsValue: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    flex: 1,
  },
  statusSection: {
    gap: Spacing.sm,
  },
  statusSectionTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    marginBottom: 4,
  },
  statusOption: {
    minHeight: 64,
    padding: Spacing.md,
    borderRadius: Radii.xl,
    backgroundColor: Palette.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  statusOptionActive: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: Palette.primary,
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabelEn: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  statusLabelHi: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  activeCheckBadge: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  counterHeaderTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    textAlign: 'center',
  },
  counterHeaderSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 6,
  },
  counterControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  counterButton: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  plusButton: {
    backgroundColor: Palette.primary,
  },
  countDisplay: {
    flex: 1,
    height: 64,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  countText: {
    ...Typography.headlineXl,
    color: Palette.primary,
    fontWeight: '700',
  },
  maxUnitsText: {
    ...Typography.bodyLg,
    color: Palette.onSurfaceVariant,
    fontWeight: '400',
  },
  unitsDoneLabel: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '600',
  },
  commCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  commTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  commSub: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  inputContainer: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  textInput: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
  },
  voiceButton: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  voiceButtonActive: {
    backgroundColor: Palette.secondaryFixed,
  },
  voiceButtonText: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  savedToast: {
    backgroundColor: Palette.primaryFixed,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.md,
  },
  savedToastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  savedToastText: {
    ...Typography.labelLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  bottomActionContainer: {
    paddingTop: Spacing.xs,
  },
  saveProgressButton: {
    minHeight: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  saveProgressText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
});

