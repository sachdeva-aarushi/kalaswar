import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Palette, Typography, Spacing, Radii } from '@/constants/theme';
import { Button } from './Button';
import { Card } from './Card';
import { useAuth } from '@/hooks/use-auth';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'लोड हो रहा है... Loading...' }: LoadingStateProps) {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={Palette.primaryContainer} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'कनेक्शन त्रुटि · Network Issue',
  message = 'डेटा लोड करने में त्रुटि · Error loading data',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.stateWrapper}>
      <Card variant="alert" style={styles.cardBox}>
        <View style={styles.iconRow}>
          <Ionicons name="alert-circle" size={32} color={Palette.errorTerracotta} />
          <Text style={styles.errorTitle}>{title}</Text>
        </View>
        <Text style={styles.errorBody}>{message}</Text>
        {onRetry && (
          <Button
            label="पुनः प्रयास करें · Retry"
            iconName="refresh"
            variant="alert"
            onPress={onRetry}
            style={styles.retryBtn}
          />
        )}
      </Card>
    </View>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'कोई रिकॉर्ड नहीं मिला · No records found',
  message = 'वर्तमान में कोई लंबित कार्य या डेटा उपलब्ध नहीं है।',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.stateWrapper}>
      <Card variant="standard" style={styles.cardBox}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="folder-open-outline" size={36} color={Palette.outline} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{message}</Text>
        {actionLabel && onAction && (
          <Button
            label={actionLabel}
            iconName="add-circle-outline"
            variant="primary"
            onPress={onAction}
            style={styles.actionBtn}
          />
        )}
      </Card>
    </View>
  );
}

interface AuthExpiredStateProps {
  onSignIn?: () => void;
}

export function AuthExpiredState({ onSignIn }: AuthExpiredStateProps) {
  const { signOut } = useAuth();

  return (
    <View style={styles.stateWrapper}>
      <Card variant="alert" style={styles.cardBox}>
        <View style={styles.iconRow}>
          <Ionicons name="key-outline" size={32} color={Palette.errorTerracotta} />
          <Text style={styles.errorTitle}>सत्र समाप्त · Session Expired</Text>
        </View>
        <Text style={styles.errorBody}>
          सुरक्षा कारणों से आपका सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।
          (Your session has expired. Please sign in again.)
        </Text>
        <Button
          label="पुनः साइन इन करें · Sign In Again"
          iconName="log-in-outline"
          variant="primary"
          onPress={() => {
            if (onSignIn) {
              onSignIn();
            } else {
              void signOut();
            }
          }}
          style={styles.retryBtn}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  stateWrapper: {
    padding: Spacing.lg,
  },
  cardBox: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    ...Typography.headlineSm,
    color: Palette.errorTerracotta,
  },
  errorBody: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  retryBtn: {
    minHeight: 48,
    width: '100%',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headlineSm,
    color: Palette.headlineDark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    ...Typography.bodyMd,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  actionBtn: {
    minHeight: 48,
    width: '100%',
  },
});

