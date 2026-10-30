import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { useArtisanTasks, type ArtisanTask } from '@/hooks/queries/use-artisan-tasks';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateView';

export default function MyWorkScreen() {
  const router = useRouter();
  const { data: tasks, isLoading, isError, refetch } = useArtisanTasks();
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState message="काम सूची लोड हो रही है... Loading work assignments..." />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorState onRetry={() => refetch()} />
      </SafeAreaView>
    );
  }

  const filteredTasks = tasks?.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') return t.progressPercent < 100;
    return t.progressPercent >= 100;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backTouch}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Palette.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Work · मेरा काम</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: `All Tasks (${tasks?.length ?? 3})` },
            { id: 'in_progress', label: 'In Progress (2)' },
            { id: 'completed', label: 'Done (1)' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setFilter(tab.id as any)}
              style={[
                styles.filterPill,
                filter === tab.id && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === tab.id && styles.filterPillTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(!filteredTasks || filteredTasks.length === 0) && (
          <EmptyState
            title="कोई कार्य नहीं · No tasks here"
            message="वर्तमान में इस श्रेणी में कोई कार्य उपलब्ध नहीं है।"
          />
        )}

        {/* Task Cards List */}
        {filteredTasks?.map((task: ArtisanTask) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskCardTop}>
              <Image
                source={{ uri: task.imageUrl }}
                style={styles.taskImg}
                resizeMode="cover"
              />
              <View style={styles.taskMainCol}>
                <Text style={styles.taskName}>{task.craftName}</Text>
                <Text style={styles.taskNameHi}>{task.craftNameHi}</Text>
                <Text style={styles.stageTag}>{task.stageName}</Text>
              </View>
            </View>

            <View style={styles.taskMetaRow}>
              <View style={styles.pillBox}>
                <Ionicons name="calendar-outline" size={14} color={Palette.primary} />
                <Text style={styles.pillText}>{task.dueDate}</Text>
              </View>
              <View style={styles.pillBox}>
                <Ionicons name="receipt-outline" size={14} color={Palette.onSurfaceVariant} />
                <Text style={styles.pillText}>{task.orderNumber}</Text>
              </View>
              <View style={styles.pillBox}>
                <Ionicons name="cash-outline" size={14} color={Palette.secondary} />
                <Text style={[styles.pillText, { color: Palette.secondary, fontWeight: '700' }]}>
                  ₹{task.estimatedEarnings}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressUnits}>
                  {task.completedUnits} / {task.targetUnits} units completed
                </Text>
                <Text style={styles.progressPct}>{task.progressPercent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${task.progressPercent}%` },
                  ]}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => router.push(`/artisan/task/${task.id}`)}
                style={styles.viewDetailBtn}
              >
                <Text style={styles.viewDetailText}>Open Details · विवरण</Text>
                <Ionicons name="chevron-forward" size={18} color={Palette.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  backTouch: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
  },
  filterPillActive: {
    backgroundColor: Palette.primaryContainer,
  },
  filterPillText: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  taskCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  taskCardTop: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  taskImg: {
    width: 64,
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
  },
  taskMainCol: {
    flex: 1,
  },
  taskName: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  taskNameHi: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  stageTag: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
    marginTop: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginVertical: Spacing.sm,
  },
  pillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
  },
  pillText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
  },
  progressContainer: {
    marginVertical: Spacing.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressUnits: {
    ...Typography.bodySm,
    color: Palette.onSurface,
  },
  progressPct: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.primary,
  },
  btnRow: {
    marginTop: Spacing.xs,
  },
  viewDetailBtn: {
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  viewDetailText: {
    ...Typography.labelMd,
    color: Palette.primary,
  },
});
