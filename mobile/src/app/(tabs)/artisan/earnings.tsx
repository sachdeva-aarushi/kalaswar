import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useEarnings, type PayoutRecord } from '@/hooks/queries/use-earnings';
import { LoadingState, ErrorState, EmptyState, AuthExpiredState } from '@/components/StateView';

export default function ArtisanEarningsScreen() {
  const { t, i18n } = useTranslation();
  const { data: earnings, isLoading, isError, error, refetch } = useEarnings();
  const isHindi = i18n.language === 'hi';

  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(isHindi ? 'en' : 'hi');
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LoadingState
          message={isHindi ? 'कमाई का ब्योरा लोड हो रहा है...' : 'Loading earnings ledger...'}
        />
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
          title={isHindi ? 'विवरण लोड नहीं हो सका' : 'Could not load earnings'}
          message={error?.message || (isHindi ? 'कृपया पुनः प्रयास करें' : 'Please try again')}
          onRetry={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  if (!earnings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState
          title={isHindi ? 'कोई भुगतान रिकॉर्ड नहीं मिला' : 'No payout records found'}
          message={isHindi ? 'आपके नए कार्य पूरे होने पर भुगतान यहाँ दिखेगा।' : 'Payments will appear once your craft assignments are verified.'}
          actionLabel={isHindi ? 'रिफ्रेश करें' : 'Refresh'}
          onAction={() => refetch()}
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
            <Ionicons name="wallet-outline" size={24} color={Palette.onPrimary} />
          </View>
          <View style={styles.headerCol}>
            <Text style={styles.headerTitle}>M-13: Earnings</Text>
            <Text style={styles.headerSub}>KALASWAR</Text>
          </View>
        </View>

        <View style={styles.headerActionsRow}>
          {/* Language Toggle */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={toggleLanguage}
            accessibilityLabel="Switch language / भाषा बदलें"
          >
            <Text style={[styles.langText, !isHindi && styles.langActive]}>EN</Text>
            <Text style={styles.langSep}>|</Text>
            <Text style={[styles.langText, isHindi && styles.langActive]}>हि</Text>
          </TouchableOpacity>

          {/* Audio Assist */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen Audio in Hindi"
          >
            <Ionicons name="volume-high-outline" size={26} color={Palette.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline sync & Listen Bar */}
        <View style={styles.utilityBar}>
          <View style={styles.offlineChip}>
            <Ionicons name="cloud-done" size={18} color={Palette.primary} />
            <Text style={styles.offlineText}>
              {isHindi ? 'फ़ोन पर सुरक्षित' : 'Saved offline'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.listenBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen to Earnings explanation"
          >
            <Ionicons name="volume-high" size={20} color={Palette.onSecondaryContainer} />
            <Text style={styles.listenBtnText}>
              {isHindi ? 'सुनें' : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Audio Toast */}
        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <View style={styles.audioToastCol}>
              <Text style={styles.audioToastTitle}>
                {isHindi ? 'ऑडियो चल रहा है...' : 'Playing audio...'}
              </Text>
              <Text style={styles.audioToastBody}>
                {isHindi
                  ? `इस महीने की कुल कमाई ₹${earnings.totalThisMonth.toLocaleString()} है। ₹${earnings.paidAmount.toLocaleString()} बैंक खाते में जमा हो चुके हैं।`
                  : `Total earnings this month are ₹${earnings.totalThisMonth.toLocaleString()}. ₹${earnings.paidAmount.toLocaleString()} deposited in bank.`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setIsPlayingAudio(false)}>
              <Ionicons name="close" size={18} color={Palette.onPrimary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Screen Title */}
        <View style={styles.screenHeading}>
          <Text style={styles.mainHeading}>
            {isHindi ? 'कमाई' : 'Earnings'}
          </Text>
          <Text style={styles.subHeading}>
            {isHindi
              ? 'आपके बैंक खाते में सीधा, सुरक्षित भुगतान'
              : 'Direct, secure payment to your bank account'}
          </Text>
        </View>

        {/* Large Monthly Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.monthLabel}>
              {isHindi ? 'इस महीने · THIS MONTH' : 'THIS MONTH'}
            </Text>
            <Ionicons name="calendar-outline" size={22} color={Palette.primary} />
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalAmount}>
              ₹{earnings.totalThisMonth.toLocaleString()}
            </Text>
            <Text style={styles.totalCaption}>
              {isHindi ? 'कुल राशि' : 'Total amount'}
            </Text>
          </View>

          {/* Paid vs Coming 2-Col Grid */}
          <View style={styles.summaryGrid}>
            <View style={styles.gridCard}>
              <View style={styles.gridHeaderRow}>
                <Ionicons name="checkmark-circle" size={18} color={Palette.primary} />
                <Text style={styles.gridBadgeText}>
                  {isHindi ? 'जमा (PAID)' : 'PAID'}
                </Text>
              </View>
              <Text style={styles.gridAmount}>
                ₹{earnings.paidAmount.toLocaleString()}
              </Text>
              <Text style={styles.gridFootnote}>
                {isHindi ? 'बैंक में जमा' : 'Deposited in bank'}
              </Text>
            </View>

            <View style={styles.gridCard}>
              <View style={styles.gridHeaderRow}>
                <Ionicons name="time-outline" size={18} color={Palette.secondary} />
                <Text style={[styles.gridBadgeText, { color: Palette.secondary }]}>
                  {isHindi ? 'आने वाला (COMING)' : 'COMING'}
                </Text>
              </View>
              <Text style={[styles.gridAmount, { color: Palette.onSurface }]}>
                ₹{earnings.comingAmount.toLocaleString()}
              </Text>
              <Text style={styles.gridFootnote}>
                {isHindi ? 'जल्द भेजा जाएगा' : 'Sending soon'}
              </Text>
            </View>
          </View>

          {/* Next Payout Schedule Notice */}
          <View style={styles.nextPayoutStrip}>
            <Ionicons name="today-outline" size={22} color={Palette.secondary} />
            <View style={styles.nextPayoutCol}>
              <Text style={styles.nextPayoutTitle}>
                {isHindi
                  ? `अगला भुगतान लगभग ${earnings.nextPayoutDateHi || earnings.nextPayoutDate}`
                  : `Next payout about ${earnings.nextPayoutDate}`}
              </Text>
              <Text style={styles.nextPayoutSub}>
                {isHindi ? 'तय भुगतान की तारीख' : 'Scheduled disbursement date'}
              </Text>
            </View>
          </View>
        </View>

        {/* Calculation Explanation Accordion */}
        <View style={styles.accordionContainer}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setIsBreakdownOpen(!isBreakdownOpen)}
            activeOpacity={0.8}
            accessibilityLabel="How is this worked out"
          >
            <View style={styles.accordionHeaderLeft}>
              <Ionicons name="help-circle-outline" size={22} color={Palette.secondary} />
              <Text style={styles.accordionTitle}>
                {isHindi ? 'यह हिसाब कैसे लगा?' : 'How is this worked out?'}
              </Text>
            </View>
            <Ionicons
              name={isBreakdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Palette.onSurfaceVariant}
            />
          </TouchableOpacity>

          {isBreakdownOpen && (
            <View style={styles.accordionBody}>
              <View style={styles.accordionInnerBox}>
                <Text style={styles.accordionExplText}>
                  {isHindi
                    ? 'आपका भुगतान आपके द्वारा लगाए गए कच्चे माल और श्रम के घंटों को कवर करता है।'
                    : 'Your pay covers your materials and the hours you worked.'}
                </Text>
              </View>
              <View style={styles.breakdownPercentages}>
                <Text style={styles.percentText}>
                  {isHindi ? 'हस्तशिल्प श्रम: 80%' : 'Craft Labor: 80%'}
                </Text>
                <Text style={styles.percentText}>
                  {isHindi ? 'सामग्री: 20%' : 'Materials: 20%'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Payout History Section */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.historyTitle}>
              {isHindi ? 'भुगतान इतिहास' : 'Payout History'}
            </Text>
            <Text style={styles.historyMonth}>
              {isHindi ? 'अक्टूबर 2026' : 'October 2026'}
            </Text>
          </View>

          {/* List of Disbursements */}
          {earnings.payouts.map((record: PayoutRecord) => {
            const isPaid = record.status === 'paid';
            return (
              <View
                key={record.id}
                style={[
                  styles.historyCard,
                  !isPaid && styles.historyCardPending,
                ]}
              >
                <View
                  style={[
                    styles.historyIconCircle,
                    isPaid ? styles.paidCircle : styles.pendingCircle,
                  ]}
                >
                  <Ionicons
                    name={isPaid ? 'checkmark' : 'hourglass-outline'}
                    size={22}
                    color={isPaid ? Palette.primary : Palette.onSecondaryContainer}
                  />
                </View>

                <View style={styles.historyDetailsCol}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyRecordTitle}>
                      {isPaid
                        ? `${isHindi ? 'भुगतान' : 'Payout'} · ${record.date}`
                        : `${isHindi ? 'आने वाला' : 'Coming'} · ${record.date}`}
                    </Text>
                    <Text style={styles.historyRecordAmount}>
                      ₹{record.amount.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.historySubtitle}>
                    {isPaid
                      ? (isHindi ? 'बैंक खाते में भेजा गया ···4417' : 'Sent to bank ···4417')
                      : (isHindi ? 'ऑर्डर डिलीवरी बाकी' : 'Order delivery pending')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tactile Bank Trigger Button (56dp standard) */}
        <TouchableOpacity
          style={styles.bankButton}
          onPress={() => setShowBankModal(!showBankModal)}
          accessibilityLabel="Bank account ending in 4417"
          activeOpacity={0.88}
        >
          <View style={styles.bankBtnLeft}>
            <View style={styles.bankIconBox}>
              <Ionicons name="business-outline" size={22} color={Palette.primary} />
            </View>
            <View style={styles.bankBtnTextCol}>
              <Text style={styles.bankAccountNum}>
                {earnings.bankAccountMasked || 'Bank account ···4417'}
              </Text>
              <Text style={styles.bankName}>
                State Bank of India (SBI DBT Direct)
              </Text>
            </View>
          </View>
          <View style={styles.bankBtnRight}>
            <Text style={styles.detailsTag}>
              {isHindi ? 'विवरण' : 'DETAILS'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.primary} />
          </View>
        </TouchableOpacity>

        {showBankModal && (
          <View style={styles.bankDetailCard}>
            <Text style={styles.bankDetailHeading}>
              {isHindi ? 'सत्यापित DBT बैंक खाता' : 'Verified DBT Bank Details'}
            </Text>
            <Text style={styles.bankDetailLine}>
              <Text style={{ fontWeight: '700' }}>Account Holder: </Text>Anita Ansari / Aparna Ghosh
            </Text>
            <Text style={styles.bankDetailLine}>
              <Text style={{ fontWeight: '700' }}>Bank: </Text>State Bank of India (Murshidabad Branch)
            </Text>
            <Text style={styles.bankDetailLine}>
              <Text style={{ fontWeight: '700' }}>IFSC: </Text>SBIN0001842
            </Text>
            <Text style={styles.bankDetailLine}>
              <Text style={{ fontWeight: '700' }}>Aadhaar Seeding: </Text>✓ Active (DBT Enabled)
            </Text>
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerCol: {
    flexDirection: 'column',
  },
  headerTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    lineHeight: 22,
  },
  headerSub: {
    ...Typography.labelSm,
    color: Palette.secondary,
    letterSpacing: 1.2,
  },
  headerActionsRow: {
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
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  offlineText: {
    ...Typography.labelSm,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  listenBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenBtnText: {
    ...Typography.labelLg,
    color: Palette.onSecondaryContainer,
  },
  audioToast: {
    backgroundColor: Palette.primary,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  audioToastCol: {
    flex: 1,
  },
  audioToastTitle: {
    ...Typography.labelMd,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  audioToastBody: {
    ...Typography.labelSm,
    color: Palette.onPrimaryContainer,
  },
  screenHeading: {
    marginBottom: Spacing.md,
  },
  mainHeading: {
    ...Typography.headlineLg,
    color: Palette.primary,
  },
  subHeading: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  monthLabel: {
    ...Typography.labelLg,
    color: Palette.secondary,
    letterSpacing: 1.1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: Spacing.md,
  },
  totalAmount: {
    ...Typography.headlineXl,
    color: Palette.primary,
    fontWeight: '700',
  },
  totalCaption: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  gridBadgeText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  gridAmount: {
    ...Typography.headlineMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  gridFootnote: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  nextPayoutStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surfaceContainerHigh,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  nextPayoutCol: {
    flex: 1,
  },
  nextPayoutTitle: {
    ...Typography.bodySm,
    color: Palette.primary,
    fontWeight: '600',
  },
  nextPayoutSub: {
    ...Typography.labelSm,
    color: Palette.onSurfaceVariant,
  },
  accordionContainer: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    ...Typography.labelLg,
    color: Palette.primary,
    textDecorationLine: 'underline',
  },
  accordionBody: {
    paddingTop: Spacing.sm,
  },
  accordionInnerBox: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  accordionExplText: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    lineHeight: 20,
  },
  breakdownPercentages: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  percentText: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '600',
  },
  historySection: {
    marginBottom: Spacing.md,
  },
  historySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  historyMonth: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
  },
  historyCard: {
    minHeight: 76,
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  historyCardPending: {
    backgroundColor: Palette.surfaceContainerLowest,
  },
  historyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidCircle: {
    backgroundColor: Palette.primaryFixed,
  },
  pendingCircle: {
    backgroundColor: Palette.secondaryFixed,
  },
  historyDetailsCol: {
    flex: 1,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  historyRecordTitle: {
    ...Typography.bodyMd,
    color: Palette.primary,
    fontWeight: '700',
  },
  historyRecordAmount: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontWeight: '700',
  },
  historySubtitle: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  bankButton: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  bankBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bankIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankBtnTextCol: {
    flexDirection: 'column',
  },
  bankAccountNum: {
    ...Typography.labelLg,
    color: Palette.primary,
    fontWeight: '700',
  },
  bankName: {
    ...Typography.labelSm,
    color: Palette.secondary,
  },
  bankBtnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsTag: {
    ...Typography.labelMd,
    color: Palette.primary,
  },
  bankDetailCard: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  bankDetailHeading: {
    ...Typography.labelLg,
    color: Palette.primary,
    marginBottom: Spacing.xs,
  },
  bankDetailLine: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    marginBottom: 4,
  },
});
