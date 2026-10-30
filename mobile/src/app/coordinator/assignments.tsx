import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import {
  useAssignments,
  useCreateAssignment,
  type ProductionAssignment,
} from '@/hooks/queries/use-coordinator';

export default function AssignmentsScreen() {
  const router = useRouter();
  const { isHindi, toggleLanguage } = useLanguage();
  const { data: assignments, isLoading, isError, refetch } = useAssignments();
  const createAssignmentMutation = useCreateAssignment();

  // Create Assignment Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [orderNumber, setOrderNumber] = useState('KW-ORD-9012');
  const [artisanName, setArtisanName] = useState('Anita Devi');
  const [targetUnits, setTargetUnits] = useState('20');
  const [wagePerUnit, setWagePerUnit] = useState('450');
  const [dueDate, setDueDate] = useState('2026-11-20');
  const [notes, setNotes] = useState('Silk zari weaving with natural vegetable dyes');

  const handleCreateAssignment = () => {
    createAssignmentMutation.mutate(
      {
        orderId: 'ord-101',
        orderNumber,
        artisanName,
        targetUnits: parseInt(targetUnits, 10) || 10,
        wagePerUnit: parseInt(wagePerUnit, 10) || 350,
        dueDate,
        notes,
      },
      {
        onSuccess: () => {
          setIsModalVisible(false);
        },
      }
    );
  };

  const getStatusBadge = (status: ProductionAssignment['status']) => {
    switch (status) {
      case 'completed':
        return { label: isHindi ? 'पूर्ण' : 'Completed', bg: Palette.primaryFixed, color: Palette.primary };
      case 'delayed':
        return { label: isHindi ? 'विलंबित' : 'Delayed', bg: Palette.errorContainer, color: Palette.errorTerracotta };
      case 'in_progress':
      default:
        return { label: isHindi ? 'प्रगति पर' : 'In Progress', bg: Palette.secondaryContainer, color: Palette.onSecondaryContainer };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={Palette.onSurface} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {isHindi ? 'उत्पादन कार्य आवंटन' : 'Production Assignments'}
        </Text>

        <TouchableOpacity
          style={styles.langPill}
          onPress={toggleLanguage}
          accessibilityLabel="Switch Language"
        >
          <Text style={styles.langPillText}>{isHindi ? 'EN' : 'हि'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards Row */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>{assignments?.length ?? 3}</Text>
            <Text style={styles.metricLabel}>{isHindi ? 'सक्रिय कार्य' : 'Active Tasks'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>
              {assignments?.reduce((sum, a) => sum + a.targetUnits, 0) ?? 77}
            </Text>
            <Text style={styles.metricLabel}>{isHindi ? 'लक्षित इकाइयां' : 'Target Units'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNumber}>
              {assignments?.reduce((sum, a) => sum + a.completedUnits, 0) ?? 37}
            </Text>
            <Text style={styles.metricLabel}>{isHindi ? 'तैयार उत्पाद' : 'Completed'}</Text>
          </View>
        </View>

        {/* Primary Action Button (56dp min target) */}
        <TouchableOpacity
          style={styles.newAssignmentBtn}
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="Create new assignment"
        >
          <Ionicons name="add-circle" size={22} color={Palette.onPrimary} />
          <Text style={styles.newAssignmentText}>
            {isHindi ? '+ नया कार्य आवंटित करें' : '+ Assign New Craft Work'}
          </Text>
        </TouchableOpacity>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'आवंटन लोड हो रहे हैं...' : 'Loading assignments...'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Palette.errorTerracotta} />
            <Text style={styles.errorTitle}>
              {isHindi ? 'डेटा लोड नहीं हो सका' : 'Could not load assignments'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isHindi ? 'पुनः प्रयास करें' : 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assignments List */}
        {!isLoading &&
          assignments &&
          assignments.map((item) => {
            const badge = getStatusBadge(item.status);
            const progressPct = Math.min(
              100,
              Math.round((item.completedUnits / (item.targetUnits || 1)) * 100)
            );

            return (
              <View key={item.id} style={styles.assignmentCard}>
                <View style={styles.cardTopRow}>
                  <View style={styles.artisanInfo}>
                    <View style={styles.avatarCircle}>
                      <Ionicons name="person" size={18} color={Palette.primary} />
                    </View>
                    <View>
                      <Text style={styles.artisanName}>{item.artisanName}</Text>
                      <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar & Units */}
                <View style={styles.progressSection}>
                  <View style={styles.progressTextRow}>
                    <Text style={styles.progressLabel}>
                      {isHindi ? 'पूर्ण इकाइयां' : 'Units Progress'}:
                    </Text>
                    <Text style={styles.progressCount}>
                      {item.completedUnits} / {item.targetUnits} units ({progressPct}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
                  </View>
                </View>

                {/* Wage and Due Date Footer */}
                <View style={styles.cardFooter}>
                  <View style={styles.footerCol}>
                    <Text style={styles.footerLabel}>{isHindi ? 'पारिश्रमिक' : 'Wage / Unit'}</Text>
                    <Text style={styles.footerValue}>₹{item.wagePerUnit}</Text>
                  </View>
                  <View style={styles.footerCol}>
                    <Text style={styles.footerLabel}>{isHindi ? 'तय तारीख' : 'Due Date'}</Text>
                    <Text style={styles.footerValue}>{item.dueDate}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.taskDetailBtn}
                    onPress={() => router.push(`/orders/${item.orderId}` as any)}
                  >
                    <Text style={styles.taskDetailBtnText}>{isHindi ? 'ऑर्डर' : 'Order'} →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Assignment Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isHindi ? 'नया कार्य आवंटित करें' : 'Assign Craft Order to Artisan'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: Spacing.sm }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{isHindi ? 'ऑर्डर नंबर' : 'Order Number'}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={orderNumber}
                  onChangeText={setOrderNumber}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{isHindi ? 'कारीगर का नाम' : 'Artisan Name'}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={artisanName}
                  onChangeText={setArtisanName}
                />
              </View>

              <View style={styles.rowTwo}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{isHindi ? 'लक्षित संख्या' : 'Target Units'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={targetUnits}
                    onChangeText={setTargetUnits}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>{isHindi ? 'प्रति नग मजदूरी (₹)' : 'Wage / Unit (₹)'}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={wagePerUnit}
                    onChangeText={setWagePerUnit}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{isHindi ? 'तय तारीख' : 'Due Date'}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{isHindi ? 'सामग्री व निर्देश' : 'Materials & Notes'}</Text>
                <TextInput
                  style={[styles.modalInput, { height: 72 }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={styles.submitAssignmentBtn}
                onPress={handleCreateAssignment}
                disabled={createAssignmentMutation.isPending}
              >
                {createAssignmentMutation.isPending ? (
                  <ActivityIndicator color={Palette.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={Palette.onPrimary} />
                    <Text style={styles.submitAssignmentText}>
                      {isHindi ? 'आवंटित करें · Confirm & Assign' : 'Confirm & Assign'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    height: 60,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  langPill: {
    minWidth: 44,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
  newAssignmentBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.ambient,
  },
  newAssignmentText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  assignmentCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  artisanInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artisanName: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  orderNumber: {
    fontSize: 12,
    color: Palette.secondary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressSection: {
    gap: 4,
    marginTop: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  progressCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Palette.primary,
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Palette.surfaceContainerHigh,
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  footerCol: {
    gap: 2,
  },
  footerLabel: {
    fontSize: 11,
    color: Palette.outline,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  taskDetailBtn: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.lg,
    maxHeight: '85%',
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  modalInput: {
    height: 48,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    color: Palette.onSurface,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  submitAssignmentBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  submitAssignmentText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  centerContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.errorTerracotta,
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});

