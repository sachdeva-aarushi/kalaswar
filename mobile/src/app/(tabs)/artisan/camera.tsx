import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';

export default function ArtisanCameraScreen() {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [hasCapturedDraft, setHasCapturedDraft] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={t('tabs.artisan.camera')}
        subtitle="Voice description & photo auto-listing"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photo Viewfinder Mock */}
        <Card variant="standard" style={styles.viewfinderCard}>
          <View style={styles.viewfinder}>
            <Ionicons name="camera-outline" size={48} color={Palette.outline} />
            <Text style={styles.viewfinderText}>
              Align craft piece in natural morning light
            </Text>
            <Button
              label={t('artisan.takePhoto')}
              iconName="camera"
              variant="secondary"
              onPress={() => setHasCapturedDraft(true)}
              style={styles.captureBtn}
            />
          </View>
        </Card>

        {/* Voice Recording Control */}
        <Card variant="ai" style={styles.voiceCard}>
          <Text style={styles.voicePromptHeading}>
            आवाज़ से विवरण बताएं (Spoken Craft Note)
          </Text>
          <Text style={styles.voiceInstruction}>
            "सामान का नाम, बुनाई का प्रकार और लगने वाले घंटे बताएं"
          </Text>

          <View style={styles.micContainer}>
            <TouchableOpacity
              onPress={() => setIsRecording(!isRecording)}
              activeOpacity={0.8}
              style={[
                styles.micButton,
                isRecording && styles.micButtonRecording,
                Shadows.elevated,
              ]}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={36}
                color={Palette.onPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.recordingState}>
              {isRecording ? 'Listening... बोलें' : 'Tap mic to speak'}
            </Text>
          </View>
        </Card>

        {/* AI Auto-Listing Draft Review */}
        {hasCapturedDraft && (
          <Card variant="white" style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <StatusBadge label="AI Draft Ready" status="active" />
              <Text style={styles.aiBadge}>Whisper + Gemini Flash</Text>
            </View>

            <Text style={styles.draftTitle}>
              हाथ से कढ़ाई किया गया शुद्ध रेशम कुशन कवर
            </Text>
            <Text style={styles.draftCategory}>
              Handloom Silk • Zari Stitch • 16x16 inches
            </Text>

            <View style={styles.fairPriceBox}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Suggested Retail Price</Text>
                <Text style={styles.priceValue}>₹1,650</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.wageHighlight}>Your Guaranteed Wage (68%)</Text>
                <Text style={styles.wageHighlightValue}>₹1,122</Text>
              </View>
            </View>

            <View style={styles.approvalButtons}>
              <Button
                label="मंजूर करें (Approve Listing)"
                iconName="checkmark-circle"
                variant="primary"
                onPress={() => {}}
                style={styles.approveBtn}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  viewfinderCard: {
    marginBottom: Spacing.md,
  },
  viewfinder: {
    height: 180,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  viewfinderText: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  captureBtn: {
    minHeight: 44,
  },
  voiceCard: {
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  voicePromptHeading: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
    textAlign: 'center',
  },
  voiceInstruction: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 4,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  micContainer: {
    alignItems: 'center',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Palette.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Palette.secondaryAccent,
  },
  micButtonRecording: {
    backgroundColor: Palette.errorTerracotta,
  },
  recordingState: {
    ...Typography.labelSm,
    color: Palette.headlineDark,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  draftCard: {
    marginBottom: Spacing.md,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  aiBadge: {
    ...Typography.labelSm,
    color: Palette.secondary,
  },
  draftTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
  },
  draftCategory: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  fairPriceBox: {
    backgroundColor: Palette.surfaceCard,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceLabel: {
    ...Typography.bodySm,
    color: Palette.outline,
  },
  priceValue: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  wageHighlight: {
    ...Typography.bodySm,
    fontWeight: '700',
    color: Palette.primaryContainer,
  },
  wageHighlightValue: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.primaryContainer,
  },
  approvalButtons: {
    marginTop: Spacing.xs,
  },
  approveBtn: {
    width: '100%',
  },
});

