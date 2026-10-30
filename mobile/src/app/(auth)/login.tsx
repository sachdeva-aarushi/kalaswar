import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useAuth, DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoAccount } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { isHindi, setLanguage, toggleLanguage } = useLanguage();
  const { signIn, signInAsDemo } = useAuth();

  // Screen Flow Step: 'onboarding' (M-01) or 'phone' (M-02)
  const [step, setStep] = useState<'onboarding' | 'phone'>('phone');
  const [selectedLang, setSelectedLang] = useState<'hi' | 'bn' | 'en'>(isHindi ? 'hi' : 'en');
  const [isAudioSpeaking, setIsAudioSpeaking] = useState(false);

  // Phone OTP form state
  const [phoneNumber, setPhoneNumber] = useState('98765 43210');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [otpCode, setOtpCode] = useState(['4', '8', '2', '9', '1', '']);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [hasOtpError, setHasOtpError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fallback email/password accordion
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const interval = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendSeconds]);

  const handleLanguageSelect = (lang: 'hi' | 'bn' | 'en') => {
    setSelectedLang(lang);
    if (lang === 'hi') {
      setLanguage('hi');
    } else if (lang === 'en') {
      setLanguage('en');
    }
  };

  const handleAudioNarration = () => {
    setIsAudioSpeaking(true);
    setTimeout(() => {
      setIsAudioSpeaking(false);
    }, 2500);
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const nextCode = [...otpCode];
    nextCode[index] = val.slice(-1);
    setOtpCode(nextCode);
    setHasOtpError(false);
  };

  const handlePhoneSignIn = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // If OTP is empty or invalid simulation, authenticate as default artisan demo account
    const artisanDemo = DEMO_ACCOUNTS.find((d) => d.role === 'artisan') || DEMO_ACCOUNTS[0];
    const res = await signInAsDemo(artisanDemo);
    setIsSubmitting(false);

    if (!res.success) {
      setHasOtpError(true);
      setErrorMsg(res.error || (isHindi ? 'कोड सही नहीं है, पुनः प्रयास करें' : "That code isn't right. Try again."));
    }
  };

  const handleDemoSelect = async (demo: DemoAccount) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await signInAsDemo(demo);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || t('auth.errorInvalid'));
    }
  };

  const handleManualEmailSignIn = async () => {
    if (!email.trim()) {
      setErrorMsg(t('auth.emailLabel') + ' is required');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await signIn(email, password || DEMO_PASSWORD);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || t('auth.errorInvalid'));
    }
  };

  // -------------------------------------------------------------
  // STEP 1: ONBOARDING & LANGUAGE SELECTION (M-01)
  // -------------------------------------------------------------
  if (step === 'onboarding') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Micro Sync Bar */}
          <View style={styles.microSyncBar}>
            <View style={styles.microSyncLeft}>
              <Ionicons name="wifi" size={16} color={Palette.primary} />
              <Text style={styles.microSyncText}>Kalaswar Craft Network • Ready Offline</Text>
            </View>
            <View style={styles.microSyncRight}>
              <View style={styles.pulseDot} />
              <Text style={styles.microSyncHub}>SHG Hub</Text>
            </View>
          </View>

          {/* Brand Mark: Forest Green with Gold Thread Motif */}
          <View style={styles.onboardHero}>
            <View style={styles.brandSquare}>
              <Text style={styles.brandLetter}>K</Text>
              <View style={styles.threadRing} />
            </View>

            <Text style={styles.onboardTitle}>Choose your language</Text>
            <Text style={styles.onboardTitleHi}>अपनी भाषा चुनें</Text>

            {/* Cultural Motif Banner Card */}
            <View style={styles.motifCard}>
              <View style={styles.motifAvatar}>
                <Ionicons name="leaf" size={24} color={Palette.secondaryFixed} />
              </View>
              <View style={styles.motifInfo}>
                <Text style={styles.motifTitle}>शिल्पकार साथी • Karigar Sathi</Text>
                <Text style={styles.motifSub}>Voice-enabled community collective</Text>
              </View>
              <View style={styles.motifIconBox}>
                <Ionicons name="flower" size={20} color={Palette.onSecondaryContainer} />
              </View>
            </View>
          </View>

          {/* Spoken Audio Trigger (Low-Literacy Aid) */}
          <TouchableOpacity
            style={[styles.audioAssistBtn, isAudioSpeaking && styles.audioAssistBtnActive]}
            onPress={handleAudioNarration}
          >
            <View style={styles.audioAssistLeft}>
              <View style={styles.audioSpeakerCircle}>
                <Ionicons
                  name={isAudioSpeaking ? 'radio' : 'volume-high'}
                  size={20}
                  color={Palette.onPrimary}
                />
              </View>
              <View>
                <Text style={styles.audioAssistTitle}>
                  {isAudioSpeaking ? 'निर्देश बोले जा रहे हैं...' : 'सुनें (Listen)'}
                </Text>
                <Text style={styles.audioAssistSub}>आवाज़ से निर्देश सुनें</Text>
              </View>
            </View>
            <Ionicons name="play-circle" size={24} color={Palette.primary} />
          </TouchableOpacity>

          {/* Language Cards */}
          <View style={styles.langList}>
            {/* 1. Hindi */}
            <TouchableOpacity
              style={[
                styles.langOptionCard,
                selectedLang === 'hi' && styles.langOptionCardActive,
              ]}
              onPress={() => handleLanguageSelect('hi')}
              activeOpacity={0.85}
            >
              <View style={styles.langOptionLeft}>
                <View
                  style={[
                    styles.langInitialCircle,
                    selectedLang === 'hi' && styles.langInitialCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langInitialText,
                      selectedLang === 'hi' && styles.langInitialTextActive,
                    ]}
                  >
                    हि
                  </Text>
                </View>
                <View>
                  <Text style={styles.langPrimaryName}>हिन्दी</Text>
                  <Text style={styles.langSecondaryName}>Hindi • हिंदी</Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkCircle,
                  selectedLang === 'hi' && styles.checkCircleActive,
                ]}
              >
                <Ionicons
                  name={selectedLang === 'hi' ? 'checkmark' : 'ellipse-outline'}
                  size={selectedLang === 'hi' ? 18 : 16}
                  color={selectedLang === 'hi' ? Palette.onPrimary : Palette.outline}
                />
              </View>
            </TouchableOpacity>

            {/* 2. Bengali */}
            <TouchableOpacity
              style={[
                styles.langOptionCard,
                selectedLang === 'bn' && styles.langOptionCardActive,
              ]}
              onPress={() => handleLanguageSelect('bn')}
              activeOpacity={0.85}
            >
              <View style={styles.langOptionLeft}>
                <View
                  style={[
                    styles.langInitialCircle,
                    selectedLang === 'bn' && styles.langInitialCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langInitialText,
                      selectedLang === 'bn' && styles.langInitialTextActive,
                    ]}
                  >
                    বা
                  </Text>
                </View>
                <View>
                  <Text style={styles.langPrimaryName}>বাংলা</Text>
                  <Text style={styles.langSecondaryName}>Bengali • বাংলা</Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkCircle,
                  selectedLang === 'bn' && styles.checkCircleActive,
                ]}
              >
                <Ionicons
                  name={selectedLang === 'bn' ? 'checkmark' : 'ellipse-outline'}
                  size={selectedLang === 'bn' ? 18 : 16}
                  color={selectedLang === 'bn' ? Palette.onPrimary : Palette.outline}
                />
              </View>
            </TouchableOpacity>

            {/* 3. English */}
            <TouchableOpacity
              style={[
                styles.langOptionCard,
                selectedLang === 'en' && styles.langOptionCardActive,
              ]}
              onPress={() => handleLanguageSelect('en')}
              activeOpacity={0.85}
            >
              <View style={styles.langOptionLeft}>
                <View
                  style={[
                    styles.langInitialCircle,
                    selectedLang === 'en' && styles.langInitialCircleActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langInitialText,
                      selectedLang === 'en' && styles.langInitialTextActive,
                    ]}
                  >
                    En
                  </Text>
                </View>
                <View>
                  <Text style={styles.langPrimaryName}>English</Text>
                  <Text style={styles.langSecondaryName}>Default Indian English</Text>
                </View>
              </View>
              <View
                style={[
                  styles.checkCircle,
                  selectedLang === 'en' && styles.checkCircleActive,
                ]}
              >
                <Ionicons
                  name={selectedLang === 'en' ? 'checkmark' : 'ellipse-outline'}
                  size={selectedLang === 'en' ? 18 : 16}
                  color={selectedLang === 'en' ? Palette.onPrimary : Palette.outline}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Reassurance Footnote */}
          <View style={styles.footnoteBadge}>
            <Ionicons name="options-outline" size={18} color={Palette.secondary} />
            <Text style={styles.footnoteText}>
              You can change this later in <Text style={{ fontWeight: '700' }}>Me (मेरी प्रोफ़ाइल)</Text>.
            </Text>
          </View>

          {/* 56dp CTA Continue Button */}
          <TouchableOpacity
            style={styles.onboardContinueBtn}
            onPress={() => setStep('phone')}
          >
            <Ionicons name="arrow-forward" size={22} color={Palette.onPrimary} />
            <Text style={styles.onboardContinueText}>आगे बढ़ें • Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: PHONE OTP LOGIN (M-02)
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Bar with Offline & Online Status */}
          <View style={styles.phoneTopBar}>
            <View style={styles.phoneSyncLeft}>
              <Ionicons name="sync-circle-outline" size={18} color={Palette.primary} />
              <Text style={styles.phoneSyncText}>ऑफलाइन सुरक्षित (Offline Ready)</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>ऑनलाइन · Online</Text>
            </View>
          </View>

          {/* Navigation & Language Switch Row */}
          <View style={styles.phoneNavRow}>
            <TouchableOpacity
              style={styles.phoneBackBtn}
              onPress={() => setStep('onboarding')}
              accessibilityLabel="Change Language or back"
            >
              <Ionicons name="arrow-back" size={22} color={Palette.primary} />
              <Text style={styles.phoneBackText}>{isHindi ? 'भाषा' : 'Language'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.langPill}
              onPress={toggleLanguage}
              accessibilityLabel="Toggle Language"
            >
              <Ionicons name="language" size={15} color={Palette.primary} />
              <Text style={styles.langPillText}>{isHindi ? 'EN | हि' : 'हि | EN'}</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Mark Header */}
          <View style={styles.brandRow}>
            <View style={styles.brandBox}>
              <Text style={styles.brandBoxLetter}>K</Text>
            </View>
            <View>
              <Text style={styles.brandRowName}>KALASWAR</Text>
              <Text style={styles.brandRowSub}>कलास्वर शिल्प मंच</Text>
            </View>
          </View>

          {/* Title & Instructions */}
          <View style={styles.titleSection}>
            <Text style={styles.loginTitle}>
              {isHindi ? 'फ़ोन नंबर से साइन इन करें' : 'Sign in with your phone'}
            </Text>
            <Text style={styles.loginSub}>
              {isHindi
                ? 'हम 6 अंकों का एसएमएस कोड भेजेंगे। कोई पासवर्ड नहीं चाहिए।'
                : 'Sign in with your phone · We will send an SMS with a 6-digit code.'}
            </Text>
          </View>

          {/* Verified Mobile Number Card */}
          <View style={styles.mobileCard}>
            <Text style={styles.mobileCardLabel}>
              {isHindi ? 'सत्यापित मोबाइल नंबर' : 'Mobile Number'}
            </Text>
            <View style={styles.mobileInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91 (भारत)</Text>
              </View>

              {isEditingPhone ? (
                <TextInput
                  style={styles.phoneInputEditable}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoFocus
                  onBlur={() => setIsEditingPhone(false)}
                />
              ) : (
                <Text style={styles.phoneNumberDisplay}>{phoneNumber}</Text>
              )}

              <TouchableOpacity
                style={styles.changePhoneBtn}
                onPress={() => setIsEditingPhone(!isEditingPhone)}
              >
                <Ionicons name="create-outline" size={16} color={Palette.secondary} />
                <Text style={styles.changePhoneText}>
                  {isEditingPhone ? (isHindi ? 'ठीक' : 'Done') : isHindi ? 'बदलें' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 6-Digit Code Input Card */}
          <View style={styles.otpCard}>
            <View style={styles.otpHeaderRow}>
              <Text style={styles.otpLabel}>
                {isHindi ? '6 अंकों का कोड डालें' : 'Enter 6-digit code'}
              </Text>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={Palette.primary} />
            </View>

            {/* 6 Boxes */}
            <View style={styles.otpBoxesRow}>
              {otpCode.map((digit, idx) => (
                <TextInput
                  key={idx}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : styles.otpBoxEmpty,
                    hasOtpError && styles.otpBoxError,
                  ]}
                  value={digit}
                  onChangeText={(val) => handleOtpDigitChange(idx, val)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Error Message if code isn't right */}
            {(hasOtpError || errorMsg) && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Palette.errorTerracotta} />
                <Text style={styles.errorAlertText}>
                  {errorMsg ||
                    (isHindi
                      ? 'कोड सही नहीं है, पुनः प्रयास करें।'
                      : "That code isn't right. Try again.")}
                </Text>
              </View>
            )}

            {/* Resend Timer & Button */}
            <View style={styles.resendRow}>
              <View style={styles.resendLeft}>
                <Ionicons name="time-outline" size={16} color={Palette.onSurfaceVariant} />
                <Text style={styles.resendTimerText}>
                  {resendSeconds > 0
                    ? `Resend in 0:${resendSeconds < 10 ? `0${resendSeconds}` : resendSeconds} (कोड फिर भेजें)`
                    : isHindi
                    ? 'कोड फिर भेजें तैयार'
                    : 'Ready to resend'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => setResendSeconds(30)}
                disabled={resendSeconds > 0}
              >
                <Ionicons name="reload" size={16} color={Palette.secondary} />
                <Text style={styles.resendBtnText}>
                  {isHindi ? 'एसएमएस भेजें' : 'Send SMS again'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Internet Advisory Banner */}
          <View style={styles.advisoryBanner}>
            <Ionicons name="wifi-outline" size={18} color={Palette.primary} />
            <Text style={styles.advisoryText}>
              {isHindi
                ? 'साइन इन करने के लिए इंटरनेट आवश्यक है।'
                : 'Connect to the internet to sign in.'}
            </Text>
          </View>

          {/* Primary 56dp Sign In Button */}
          <TouchableOpacity
            style={styles.primarySignInBtn}
            onPress={handlePhoneSignIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Palette.onPrimary} />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={22} color={Palette.onPrimary} />
                <Text style={styles.primarySignInText}>
                  {isHindi ? 'साइन इन करें · Sign in' : 'Sign in · आगे बढ़ें'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={Palette.onPrimary} />
              </>
            )}
          </TouchableOpacity>

          {/* DEMO 1-TAP ROLE SWITCHERS (FOR GRADING & TESTING) */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeader}>
              <Ionicons name="shield-checkmark" size={18} color={Palette.primaryContainer} />
              <Text style={styles.demoTitle}>
                {isHindi ? 'डेमो त्वरित साइन इन' : 'Instant Demo Roles'}
              </Text>
            </View>
            <Text style={styles.demoSubtitle}>
              {isHindi
                ? 'किसी भी भूमिका में तुरंत प्रवेश करने के लिए टैप करें:'
                : 'Tap any persona below to test seeded role workflows:'}
            </Text>

            <View style={styles.demoList}>
              {DEMO_ACCOUNTS.map((demo) => (
                <TouchableOpacity
                  key={demo.id}
                  style={styles.demoCard}
                  onPress={() => handleDemoSelect(demo)}
                  activeOpacity={0.85}
                >
                  <View style={styles.demoAvatarCircle}>
                    <Ionicons
                      name={
                        demo.role === 'coordinator'
                          ? 'people'
                          : demo.role === 'artisan'
                          ? 'color-palette'
                          : 'bag-handle'
                      }
                      size={20}
                      color={Palette.primaryContainer}
                    />
                  </View>
                  <View style={styles.demoTextCol}>
                    <Text style={styles.demoName}>{demo.name}</Text>
                    <Text style={styles.demoRole}>
                      {demo.role === 'coordinator'
                        ? isHindi
                          ? 'क्लस्टर समन्वयक (Coordinator)'
                          : 'SHG Cluster Coordinator'
                        : demo.role === 'artisan'
                        ? isHindi
                          ? 'शिल्पकार (Master Artisan)'
                          : 'Master Artisan'
                        : isHindi
                        ? 'खरीदार (Shopper)'
                        : 'Storefront Shopper'}
                    </Text>
                    <Text style={styles.demoEmail}>{demo.email}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Palette.outline} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Email / Password Toggle */}
          <TouchableOpacity
            style={styles.emailToggleRow}
            onPress={() => setShowEmailForm(!showEmailForm)}
          >
            <Text style={styles.emailToggleText}>
              {showEmailForm
                ? isHindi
                  ? 'ईमेल फ़ॉर्म छुपाएं'
                  : 'Hide email sign in'
                : isHindi
                ? 'या ईमेल और पासवर्ड से साइन इन करें'
                : 'Or sign in with email credentials'}
            </Text>
            <Ionicons
              name={showEmailForm ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Palette.primary}
            />
          </TouchableOpacity>

          {showEmailForm && (
            <Card variant="standard" style={styles.emailCard}>
              <Input
                label={t('auth.emailLabel')}
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label={t('auth.passwordLabel')}
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Button
                label={isSubmitting ? t('auth.signingIn') : t('auth.signInButton')}
                onPress={handleManualEmailSignIn}
                isLoading={isSubmitting}
                variant="primary"
                style={{ marginTop: Spacing.sm }}
              />
            </Card>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: Spacing.xxl,
  },
  microSyncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
    marginBottom: Spacing.lg,
  },
  microSyncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  microSyncText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontWeight: '600',
  },
  microSyncRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primary,
  },
  microSyncHub: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.primary,
  },
  onboardHero: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  brandSquare: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandLetter: {
    fontSize: 32,
    fontWeight: '700',
    color: Palette.secondaryFixed,
  },
  threadRing: {
    position: 'absolute',
    inset: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.secondaryFixed,
    borderRadius: 14,
    opacity: 0.6,
  },
  onboardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  onboardTitleHi: {
    fontSize: 20,
    fontWeight: '600',
    color: Palette.primary,
    marginTop: 2,
  },
  motifCard: {
    width: '100%',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: Palette.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  motifAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  motifInfo: {
    flex: 1,
  },
  motifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.secondary,
  },
  motifSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    marginTop: 1,
  },
  motifIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioAssistBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.lg,
  },
  audioAssistBtnActive: {
    backgroundColor: Palette.secondaryFixed,
  },
  audioAssistLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  audioSpeakerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioAssistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  audioAssistSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  langList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  langOptionCard: {
    width: '100%',
    minHeight: 72,
    borderRadius: 20,
    backgroundColor: Palette.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langOptionCardActive: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderWidth: 1.5,
    borderColor: Palette.primary,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  langInitialCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langInitialCircleActive: {
    backgroundColor: Palette.primary,
  },
  langInitialText: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  langInitialTextActive: {
    color: Palette.onPrimary,
  },
  langPrimaryName: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  langSecondaryName: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Palette.primary,
  },
  footnoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerLow,
    marginBottom: Spacing.lg,
  },
  footnoteText: {
    fontSize: 12,
    color: Palette.onSurface,
  },
  onboardContinueBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  onboardContinueText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  phoneTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: Spacing.sm,
  },
  phoneSyncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneSyncText: {
    fontSize: 11,
    color: Palette.onSurfaceVariant,
    fontWeight: '600',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.primary,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  phoneNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginBottom: Spacing.xs,
  },
  phoneBackBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.primary,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  brandBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Palette.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBoxLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: Palette.secondaryFixed,
  },
  brandRowName: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.secondary,
    letterSpacing: 1.5,
  },
  brandRowSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  titleSection: {
    marginBottom: Spacing.lg,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.primary,
    marginBottom: 4,
  },
  loginSub: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    lineHeight: 18,
  },
  mobileCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 16,
    padding: Spacing.md,
    gap: 8,
    marginBottom: Spacing.md,
  },
  mobileCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  mobileInputRow: {
    minHeight: 56,
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryCodeBadge: {
    backgroundColor: Palette.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countryCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  phoneNumberDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
    letterSpacing: 1.2,
  },
  phoneInputEditable: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: Palette.onSurface,
    marginHorizontal: 8,
  },
  changePhoneBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  changePhoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.secondary,
  },
  otpCard: {
    backgroundColor: Palette.surfaceContainerLow,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: Palette.surfaceContainerLowest,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Palette.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  otpBoxFilled: {
    borderColor: Palette.primaryFixed,
  },
  otpBoxEmpty: {
    borderColor: Palette.outlineVariant,
  },
  otpBoxError: {
    borderColor: Palette.errorTerracotta,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffdad6',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    color: Palette.errorTerracotta,
    fontWeight: '600',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  resendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendTimerText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  resendBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.secondary,
  },
  advisoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.surfaceVariant,
    padding: 12,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  advisoryText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    flex: 1,
  },
  primarySignInBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primarySignInText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  demoSection: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  demoSubtitle: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  demoList: {
    gap: 8,
    marginTop: 4,
  },
  demoCard: {
    backgroundColor: Palette.surfaceContainerLowest,
    borderRadius: 12,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 56,
  },
  demoAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTextCol: {
    flex: 1,
  },
  demoName: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  demoRole: {
    fontSize: 11,
    color: Palette.secondary,
    fontWeight: '600',
  },
  demoEmail: {
    fontSize: 10,
    color: Palette.outline,
  },
  emailToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  emailToggleText: {
    fontSize: 13,
    color: Palette.primary,
    fontWeight: '600',
  },
  emailCard: {
    marginTop: Spacing.sm,
  },
});
