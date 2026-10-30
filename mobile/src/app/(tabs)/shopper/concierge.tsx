import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { Header } from '@/components/Header';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { StatusBadge } from '@/components/StatusBadge';

export default function ShopperConciergeScreen() {
  const { t } = useTranslation();
  const [occasion, setOccasion] = useState('');
  const [quantity, setQuantity] = useState('25');
  const [targetDate, setTargetDate] = useState('2026-11-25');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="MakePossible Concierge"
        subtitle="Two-sided custom craft feasibility assessment"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro Card */}
        <Card variant="ai" style={styles.introCard}>
          <View style={styles.introRow}>
            <Ionicons name="sparkles" size={24} color={Palette.primaryContainer} />
            <Text style={styles.introTitle}>Direct Craft Commissioning</Text>
          </View>
          <Text style={styles.introBody}>
            Describe what you need. MakePossible compares your requirements with SHG cluster capacity, raw silk/clay stock, and historical weaving speeds before committing.
          </Text>
        </Card>

        {isSubmitted ? (
          <Card variant="white" style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Palette.primaryContainer} />
            </View>
            <Text style={styles.successTitle}>Custom Request Submitted</Text>
            <Text style={styles.successBody}>
              Coordinator Sunita Patil at Dahanu Warli Collective has received your brief. Feasibility quote ready within 4 hours.
            </Text>
            <Button
              label="Submit Another Request"
              variant="secondary"
              onPress={() => setIsSubmitted(false)}
              style={styles.anotherBtn}
            />
          </Card>
        ) : (
          <Card variant="standard" style={styles.formCard}>
            <Input
              label="Occasion or Gift Purpose"
              placeholder="e.g., Corporate Diwali Gift, Wedding Keepsake"
              value={occasion}
              onChangeText={setOccasion}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label="Units Needed"
                  placeholder="25"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="Target Delivery Date"
                  placeholder="YYYY-MM-DD"
                  value={targetDate}
                  onChangeText={setTargetDate}
                />
              </View>
            </View>

            <Input
              label="Custom Specifications / Colors"
              placeholder="Natural indigo dye with brass zari accents..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />

            <Button
              label="Check Craft Feasibility"
              iconName="paper-plane-outline"
              variant="primary"
              onPress={() => setIsSubmitted(true)}
              style={styles.submitBtn}
            />
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
  introCard: {
    marginBottom: Spacing.md,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  introTitle: {
    ...Typography.bodyMd,
    fontWeight: '700',
    color: Palette.headlineDark,
  },
  introBody: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    lineHeight: 20,
  },
  formCard: {
    marginBottom: Spacing.md,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  halfInput: {
    flex: 1,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  successCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.md,
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.headlineMd,
    color: Palette.headlineDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successBody: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  anotherBtn: {
    minHeight: 46,
    width: '100%',
  },
});

