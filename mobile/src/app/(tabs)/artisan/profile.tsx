import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import {
  useArtisanProfile,
  useUpdateArtisanProfile,
  useShgClusters,
  useJoinShg,
} from '@/hooks/queries/use-artisan-profile';

export default function ArtisanProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { isHindi, setLanguage } = useLanguage();

  const { data: profile, isLoading: isProfileLoading } = useArtisanProfile();
  const updateProfile = useUpdateArtisanProfile();
  const { data: clusters = [], isLoading: isClustersLoading } = useShgClusters();
  const joinShgMutation = useJoinShg();

  const [selectedClusterId, setSelectedClusterId] = useState('');
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [voiceHelpActive, setVoiceHelpActive] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  const toggleLanguage = async () => {
    const nextLang = isHindi ? 'en' : 'hi';
    await setLanguage(nextLang);
    updateProfile.mutate({ preferred_language: nextLang });
  };

  const handleCheckSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const handleVoiceNarrate = () => {
    setIsNarrating(true);
    setTimeout(() => {
      setIsNarrating(false);
    }, 2500);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'LM';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Preview text font size style
  const getPreviewTextStyle = () => {
    switch (textSize) {
      case 'normal':
        return { fontSize: 16, lineHeight: 24 };
      case 'xlarge':
        return { fontSize: 26, lineHeight: 34, fontWeight: '700' as const };
      case 'large':
      default:
        return { fontSize: 20, lineHeight: 28, fontWeight: '600' as const };
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateCenterContainer}>
          <Ionicons name="lock-closed-outline" size={48} color={Palette.outline} />
          <Text style={styles.stateTitle}>{isHindi ? 'सत्र समाप्त' : 'Session Expired'}</Text>
          <Text style={styles.stateSubtitle}>
            {isHindi ? 'कृपया पुनः साइन इन करें।' : 'Please sign in again to view your profile.'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.retryBtnText}>{isHindi ? 'लॉगिन करें' : 'Sign In'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Ionicons name="sparkles" size={18} color={Palette.secondaryFixed} />
          </View>
          <View>
            <Text style={styles.brandTitle}>KALASWAR</Text>
            <Text style={styles.headerSubtitle}>{isHindi ? 'मेरी प्रोफ़ाइल' : 'Artisan Me'}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.langBadge}
            onPress={toggleLanguage}
            accessibilityLabel="Switch Language"
          >
            <Ionicons name="language" size={15} color={Palette.primary} />
            <Text style={styles.langBadgeText}>{isHindi ? 'हि | EN' : 'EN | हि'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={handleVoiceNarrate}
            accessibilityLabel="Listen to instructions in local dialect"
          >
            <Ionicons
              name={isNarrating ? 'pause-circle' : 'volume-high'}
              size={22}
              color={Palette.primary}
            />
          </TouchableOpacity>

          <View style={styles.userAvatarTop}>
            <Ionicons name="person" size={16} color={Palette.onPrimary} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Listen Assist Bar */}
        <View style={styles.narrateBar}>
          <View style={styles.narrateLeft}>
            <View style={styles.narrateIconCircle}>
              <Ionicons name="ear" size={24} color={Palette.primary} />
            </View>
            <View style={styles.narrateCol}>
              <Text style={styles.narrateTitle}>
                {isHindi ? 'प्रोफ़ाइल और सेटिंग्स' : 'Profile & Settings'}
              </Text>
              <Text style={styles.narrateSub}>
                {isHindi ? 'स्क्रीन गाइड सुनें' : 'Listen to screen guide'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.narrateBtn, isNarrating && styles.narrateBtnActive]}
            onPress={handleVoiceNarrate}
            accessibilityLabel="Listen to Profile overview"
          >
            <Ionicons
              name={isNarrating ? 'mic' : 'volume-high'}
              size={20}
              color={Palette.onSecondaryContainer}
            />
            <Text style={styles.narrateBtnText}>
              {isNarrating
                ? isHindi
                  ? 'बोल रहे हैं...'
                  : 'Speaking...'
                : isHindi
                ? 'सुनें'
                : 'Listen'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            {/* 64dp Avatar circle with initials */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {getInitials(profile?.display_name || user.name || 'Artisan')}
              </Text>
            </View>

            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName}>
                {profile?.display_name || user.name || 'Artisan'}
              </Text>
              <Text style={styles.profileCluster}>
                {profile?.shg_id
                  ? isHindi ? `एसएचजी क्लस्टर: ${profile.shg_id}` : `SHG Cluster: ${profile.shg_id}`
                  : isHindi ? 'कोई क्लस्टर संबद्ध नहीं' : 'No SHG Cluster affiliated'}
              </Text>
            </View>
          </View>

          {/* Phone Badge with Verified State */}
          <View style={styles.phoneBadgeRow}>
            <View style={styles.phoneBadgeLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={Palette.primary} />
              <Text style={styles.phoneBadgeNumber}>{profile?.phone || user?.phone || '+91 98765 43210'}</Text>
            </View>

            <View style={[styles.verifiedPill, profile?.onboarding_status !== 'approved' && { backgroundColor: Palette.surfaceContainer }]}>
              <Ionicons
                name={profile?.onboarding_status === 'approved' ? 'checkmark-circle' : 'time-outline'}
                size={16}
                color={profile?.onboarding_status === 'approved' ? Palette.primary : Palette.outline}
              />
              <Text style={[styles.verifiedText, profile?.onboarding_status !== 'approved' && { color: Palette.onSurfaceVariant }]}>
                {profile?.onboarding_status === 'approved'
                  ? isHindi ? 'सत्यापित शिल्पकार' : 'Verified Artisan'
                  : isHindi ? 'सत्यापन लंबित' : 'Pending Approval'}
              </Text>
            </View>
          </View>
        </View>

        {/* Feature 2: SHG Membership & Join Section */}
        {(!profile?.shg_id || profile?.onboarding_status === 'pending_approval') && (
          <View style={[styles.settingCard, { padding: Spacing.md }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs }}>
              <Ionicons name="people" size={22} color={Palette.primary} />
              <Text style={styles.settingTitle}>
                {isHindi ? 'स्वयं सहायता समूह (SHG) से जुड़ें' : 'Join Self-Help Group (SHG)'}
              </Text>
            </View>

            {profile?.onboarding_status === 'pending_approval' ? (
              <Text style={[styles.settingSub, { color: Palette.primary, marginTop: 4 }]}>
                {isHindi
                  ? 'आपका जुड़ने का अनुरोध समन्वयक के पास सत्यापन के लिए लंबित है।'
                  : 'Your request to join an SHG cluster is awaiting coordinator approval.'}
              </Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'उत्पादों की लिस्टिंग और सामूहिक बिक्री के लिए अपना स्थानीय क्लस्टर चुनें:'
                    : 'Choose your local cluster for product validation & group dispatch:'}
                </Text>

                <View style={{ marginTop: 8, gap: 6 }}>
                  {clusters.slice(0, 4).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.segmentBtn,
                        selectedClusterId === c.id && styles.segmentBtnActive,
                        { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'flex-start' },
                      ]}
                      onPress={() => setSelectedClusterId(c.id)}
                    >
                      <Text
                        style={[
                          styles.segmentLabel,
                          selectedClusterId === c.id && styles.segmentLabelActive,
                          { fontSize: 13 },
                        ]}
                      >
                        {c.name} {c.state ? `(${c.state})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.narrateBtn,
                    { marginTop: 10, backgroundColor: Palette.primary, paddingVertical: 12, borderRadius: Radii.md },
                    (!selectedClusterId || joinShgMutation.isPending) && { opacity: 0.6 },
                  ]}
                  disabled={!selectedClusterId || joinShgMutation.isPending}
                  onPress={() => {
                    if (selectedClusterId) {
                      joinShgMutation.mutate({
                        cluster_id: selectedClusterId,
                        self_declared_experience_years: 5,
                        daily_capacity: 2,
                      });
                    }
                  }}
                >
                  <Text style={[styles.narrateBtnText, { color: Palette.onPrimary, fontWeight: '700' }]}>
                    {joinShgMutation.isPending
                      ? isHindi ? 'अनुरोध भेज रहे हैं...' : 'Submitting request...'
                      : isHindi ? 'क्लस्टर से जुड़ने का अनुरोध भेजें' : 'Request to Join Cluster'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Grouped Settings Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>
            {isHindi ? 'प्राथमिकताएं और सेटिंग्स' : 'PREFERENCES & SETTINGS'}
          </Text>
          <Text style={styles.touchReadyTag}>56dp Touch Ready</Text>
        </View>

        {/* 1. Language Row */}
        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRowBtn}
            onPress={toggleLanguage}
            accessibilityLabel="Change Language"
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconBox}>
                <Ionicons name="language-outline" size={26} color={Palette.primary} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>{isHindi ? 'भाषा' : 'Language'}</Text>
                <Text style={styles.settingSub}>
                  {isHindi
                    ? 'भाषा प्राथमिकताएं बदलने के लिए टैप करें'
                    : 'Tap to change language preferences'}
                </Text>
              </View>
            </View>

            <View style={styles.settingRight}>
              <View style={styles.langSelectedBadge}>
                <Text style={styles.langSelectedText}>{isHindi ? 'हिंदी' : 'English'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Palette.outline} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2. Text Size Setting with Segmented Control & Live Preview */}
        <View style={styles.settingCard}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBox}>
              <Ionicons name="text-outline" size={26} color={Palette.primary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>{isHindi ? 'अक्षर का आकार' : 'Text size'}</Text>
              <Text style={styles.settingSub}>
                {isHindi ? 'आसान पढ़ने के लिए आकार चुनें' : 'Adjust size for easier reading'}
              </Text>
            </View>
          </View>

          {/* Segmented Control */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, textSize === 'normal' && styles.segmentBtnActive]}
              onPress={() => setTextSize('normal')}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  textSize === 'normal' && styles.segmentLabelActive,
                ]}
              >
                {isHindi ? 'सामान्य' : 'Normal'}
              </Text>
              <Text
                style={[styles.segmentSub, textSize === 'normal' && styles.segmentSubActive]}
              >
                Default
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, textSize === 'large' && styles.segmentBtnActive]}
              onPress={() => setTextSize('large')}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  textSize === 'large' && styles.segmentLabelActive,
                ]}
              >
                {isHindi ? 'बड़ा' : 'Large'}
              </Text>
              <Text
                style={[styles.segmentSub, textSize === 'large' && styles.segmentSubActive]}
              >
                Recommended
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, textSize === 'xlarge' && styles.segmentBtnActive]}
              onPress={() => setTextSize('xlarge')}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  textSize === 'xlarge' && styles.segmentLabelActive,
                ]}
              >
                {isHindi ? 'बहुत बड़ा' : 'Extra large'}
              </Text>
              <Text
                style={[
                  styles.segmentSub,
                  textSize === 'xlarge' && styles.segmentSubActive,
                ]}
              >
                Maximum
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live Preview Box */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTag}>LIVE PREVIEW:</Text>
            <Text style={[styles.previewText, getPreviewTextStyle()]}>
              {isHindi ? 'हाथ में हुनर, जीवन में गरिमा' : 'Craft in hand, dignity in life'}
            </Text>
            <Text style={styles.previewSub}>Sample text size preview for craft logs</Text>
          </View>
        </View>

        {/* 3. Voice Help / Audio Assistance Toggle */}
        <View style={styles.settingCardRow}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIconBox}>
              <Ionicons name="mic-circle-outline" size={28} color={Palette.primary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>
                {isHindi ? 'आवाज़ से सहायता' : 'Voice help'}
              </Text>
              <Text style={styles.settingSub}>
                {isHindi
                  ? 'स्क्रीन के निर्देश अपने आप बोलकर सुनाएं'
                  : 'Read screens aloud automatically'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.switchToggle,
              voiceHelpActive ? styles.switchToggleOn : styles.switchToggleOff,
            ]}
            onPress={() => setVoiceHelpActive(!voiceHelpActive)}
            accessibilityLabel="Toggle voice guidance"
          >
            <View
              style={[
                styles.switchThumb,
                voiceHelpActive ? styles.switchThumbOn : styles.switchThumbOff,
              ]}
            >
              <Ionicons
                name={voiceHelpActive ? 'checkmark' : 'close'}
                size={16}
                color={voiceHelpActive ? Palette.primary : Palette.outline}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* 4. Offline Data & Sync Status */}
        <View style={styles.settingCard}>
          <View style={styles.syncHeaderRow}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconBox}>
                <Ionicons name="cloud-done-outline" size={26} color={Palette.primary} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'ऑफलाइन डेटा और सिंक' : 'Offline data & Sync'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi ? 'इस डिवाइस पर सुरक्षित सहेजा गया' : 'Saved safely on this device'}
                </Text>
              </View>
            </View>

            <View style={styles.allSyncedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Palette.primary} />
              <Text style={styles.allSyncedText}>All Synced</Text>
            </View>
          </View>

          <View style={styles.syncActionRow}>
            <Text style={styles.lastSyncText}>
              {isHindi ? 'आख़िरी सिंक: आज दोपहर 02:15' : 'Last synced: Today at 02:15 PM'}
            </Text>
            <TouchableOpacity
              style={styles.checkSyncBtn}
              onPress={handleCheckSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Palette.primary} />
              ) : (
                <Ionicons name="sync" size={18} color={Palette.primary} />
              )}
              <Text style={styles.checkSyncText}>
                {isSyncing
                  ? isHindi
                    ? 'जांच रहे हैं...'
                    : 'Syncing...'
                  : isHindi
                  ? 'सिंक जांचें'
                  : 'Check sync'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. Notifications */}
        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingRowBtn}
            onPress={() => router.push('/notifications')}
            accessibilityLabel="Notifications"
          >
            <View style={styles.settingLeft}>
              <View style={styles.settingIconBox}>
                <Ionicons name="notifications-outline" size={26} color={Palette.primary} />
              </View>
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>
                  {isHindi ? 'सूचनाएं' : 'Notifications'}
                </Text>
                <Text style={styles.settingSub}>
                  {isHindi ? 'ध्वनि और संदेश अलर्ट सक्रिय' : 'Sound & SMS alerts active'}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={22} color={Palette.outline} />
          </TouchableOpacity>
        </View>

        {/* SHG Cluster Help Card (Direct Rural Support) */}
        <View style={styles.supportCard}>
          <View style={styles.supportLeft}>
            <View style={styles.supportIconCircle}>
              <Ionicons name="headset" size={24} color={Palette.secondary} />
            </View>
            <View style={styles.supportCol}>
              <Text style={styles.supportTitle}>
                {isHindi ? 'केंद्र सहायता केंद्र' : 'Kendra Help Support'}
              </Text>
              <Text style={styles.supportSub}>
                {isHindi
                  ? 'क्लस्टर समन्वयक से सीधे बात करें'
                  : 'Speak directly with cluster coordinator'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.callSupportBtn}
            onPress={() => Linking.openURL('tel:1800123456')}
          >
            <Ionicons name="call" size={18} color={Palette.onPrimary} />
            <Text style={styles.callSupportText}>
              {isHindi ? 'कॉल करें' : 'Call Center'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section: Sign Out */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={signOut}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={22} color={Palette.errorTerracotta} />
            <Text style={styles.signOutText}>{isHindi ? 'साइन आउट' : 'Sign out'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpLinkRow}
            onPress={() => Linking.openURL('tel:1800123456')}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={Palette.primary} />
            <Text style={styles.helpLinkText}>
              {isHindi ? 'केंद्र से सहायता प्राप्त करें' : 'Get help from Kendra Support'}
            </Text>
          </TouchableOpacity>

          {/* App Version & Dignified Artisan Footer */}
          <View style={styles.footerCol}>
            <View style={styles.footerBrandRow}>
              <Ionicons name="shield-checkmark" size={16} color={Palette.onSurfaceVariant} />
              <Text style={styles.footerBrand}>KALASWAR PLATFORM</Text>
            </View>
            <Text style={styles.footerVersion}>
              Version 1.0 (Build 104) · Made for Rural Artisans
            </Text>
            <Text style={styles.footerCluster}>
              Bhagirathi Women SHG Cluster Federation
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  header: {
    height: 64,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primaryContainer,
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  langBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
  },
  langBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  iconCircleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarTop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  narrateBar: {
    width: '100%',
    backgroundColor: Palette.primaryContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  narrateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  narrateIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrateCol: {
    flex: 1,
  },
  narrateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  narrateSub: {
    fontSize: 12,
    color: Palette.outlineVariant,
  },
  narrateBtn: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  narrateBtnActive: {
    backgroundColor: Palette.secondaryFixedDim,
  },
  narrateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  profileCard: {
    width: '100%',
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.secondaryFixed,
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  profileCluster: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  phoneBadgeRow: {
    width: '100%',
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneBadgeNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: Palette.onSurfaceVariant,
    letterSpacing: 1,
  },
  touchReadyTag: {
    fontSize: 11,
    color: Palette.secondary,
    fontWeight: '700',
  },
  settingCard: {
    width: '100%',
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  settingCardRow: {
    width: '100%',
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingRowBtn: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingIconBox: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  settingSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langSelectedBadge: {
    backgroundColor: Palette.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  langSelectedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: 4,
    gap: 6,
    marginTop: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Palette.primary,
    ...Shadows.ambient,
  },
  segmentLabel: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
  },
  segmentLabelActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  segmentSub: {
    fontSize: 10,
    color: Palette.outline,
    marginTop: 1,
  },
  segmentSubActive: {
    color: Palette.outlineVariant,
  },
  previewBox: {
    width: '100%',
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: 2,
    marginTop: Spacing.xs,
  },
  previewTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  previewText: {
    color: Palette.primary,
  },
  previewSub: {
    fontSize: 11,
    color: Palette.outline,
  },
  switchToggle: {
    width: 64,
    height: 40,
    borderRadius: 20,
    padding: 3,
    justifyContent: 'center',
  },
  switchToggleOn: {
    backgroundColor: Palette.primary,
  },
  switchToggleOff: {
    backgroundColor: Palette.surfaceContainerHigh,
  },
  switchThumb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchThumbOn: {
    alignSelf: 'flex-end',
  },
  switchThumbOff: {
    alignSelf: 'flex-start',
  },
  syncHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allSyncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  allSyncedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  syncActionRow: {
    width: '100%',
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  lastSyncText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  checkSyncBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkSyncText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  supportCard: {
    width: '100%',
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: 20,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  supportIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCol: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  supportSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  callSupportBtn: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  callSupportText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  bottomSection: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  signOutBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.surfaceContainerHighest,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  helpLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
  },
  helpLinkText: {
    fontSize: 13,
    color: Palette.primary,
    textDecorationLine: 'underline',
  },
  footerCol: {
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.xs,
  },
  footerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '800',
    color: Palette.onSurfaceVariant,
    letterSpacing: 1.5,
  },
  footerVersion: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  footerCluster: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.primary,
  },
  stateCenterContainer: {
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  stateSubtitle: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
});
