import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';

export default function QRScannerScreen() {
  const router = useRouter();
  const { isHindi } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanning) return;
    setIsScanning(false);

    // Extract token from full URL or token string
    let token = data.trim();
    if (token.includes('/')) {
      const parts = token.split('/');
      token = parts[parts.length - 1] || token;
    }

    router.push(`/passport/${encodeURIComponent(token)}` as any);
  };

  const handleManualVerify = () => {
    const token = manualToken.trim() || 'dpp-demo-kantha-001';
    router.push(`/passport/${encodeURIComponent(token)}` as any);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <Text style={styles.permissionText}>Checking camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerBox}>
          <Ionicons name="camera-outline" size={56} color={Palette.primary} />
          <Text style={styles.permissionTitle}>
            {isHindi ? 'कैमरा अनुमति आवश्यक है' : 'Camera Access Needed'}
          </Text>
          <Text style={styles.permissionSubtitle}>
            {isHindi
              ? 'उत्पाद पासपोर्ट क्यूआर कोड स्कैन करने के लिए कृपया कैमरा अनुमति दें।'
              : 'Please allow camera access to scan digital craft passport QR codes.'}
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>
              {isHindi ? 'अनुमति दें' : 'Grant Camera Access'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualFallbackBtn}
            onPress={() => setShowManualInput(true)}
          >
            <Text style={styles.manualFallbackText}>
              {isHindi ? 'टोकन कोड हाथ से डालें' : 'Or enter passport token manually'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputCard}>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. dpp-demo-kantha-001"
                placeholderTextColor={Palette.outline}
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.verifyBtn} onPress={handleManualVerify}>
                <Text style={styles.verifyBtnText}>
                  {isHindi ? 'पासपोर्ट देखें' : 'Verify Passport'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header Controls */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>
            {isHindi ? 'पासपोर्ट क्यूआर स्कैनर' : 'Scan Craft Passport'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.headerIconBtn, torchEnabled && styles.headerIconBtnActive]}
          onPress={() => setTorchEnabled(!torchEnabled)}
          accessibilityLabel="Toggle flash"
        >
          <Ionicons
            name={torchEnabled ? 'flash' : 'flash-off'}
            size={22}
            color={torchEnabled ? Palette.secondaryContainer : '#ffffff'}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Camera View with Framing Reticle */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            enableTorch={torchEnabled}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
          />

          {/* Semi-transparent Overlay Mask */}
          <View style={styles.reticleOverlay}>
            <View style={styles.reticleBox}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
              <View style={styles.laserLine} />
            </View>

            <Text style={styles.scanInstruction}>
              {isHindi
                ? 'कलास्वर उत्पाद का क्यूआर कोड फ्रेम के अंदर लाएं'
                : 'Align QR code within the frame to verify craft'}
            </Text>
          </View>
        </View>

        {/* Bottom Control & Manual Fallback Section */}
        <View style={styles.bottomSection}>
          <View style={styles.demoChipRow}>
            <Text style={styles.demoChipLabel}>
              {isHindi ? 'त्वरित डेमो परीक्षण:' : 'Quick demo test:'}
            </Text>
            <TouchableOpacity
              style={styles.demoChip}
              onPress={() => router.push('/passport/dpp-demo-kantha-001' as any)}
            >
              <Ionicons name="sparkles" size={14} color={Palette.secondary} />
              <Text style={styles.demoChipText}>dpp-demo-kantha-001</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.manualToggleRow}
            onPress={() => setShowManualInput(!showManualInput)}
          >
            <Ionicons
              name={showManualInput ? 'chevron-down' : 'key-outline'}
              size={18}
              color={Palette.primary}
            />
            <Text style={styles.manualToggleText}>
              {showManualInput
                ? isHindi
                  ? 'मैन्युअल फ़ील्ड छुपाएं'
                  : 'Hide manual entry'
                : isHindi
                ? 'टोकन हाथ से डालें (Manual Token)'
                : 'Enter token manually'}
            </Text>
          </TouchableOpacity>

          {showManualInput && (
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="dpp-demo-kantha-001"
                placeholderTextColor={Palette.outline}
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.verifyBtn} onPress={handleManualVerify}>
                <Ionicons name="checkmark" size={20} color={Palette.onPrimary} />
                <Text style={styles.verifyBtnText}>{isHindi ? 'जांचें' : 'Verify'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: '#000000',
    zIndex: 10,
  },
  headerIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnActive: {
    backgroundColor: Palette.primaryContainer,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  reticleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticleBox: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: Palette.secondaryFixed,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  laserLine: {
    width: 230,
    height: 2,
    backgroundColor: Palette.secondaryContainer,
    opacity: 0.8,
  },
  scanInstruction: {
    marginTop: Spacing.xl,
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  bottomSection: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  demoChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  demoChipLabel: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  demoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.onSecondaryContainer,
  },
  manualToggleRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  manualToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  inputField: {
    flex: 1,
    height: 52,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    color: Palette.onSurface,
  },
  verifyBtn: {
    minWidth: 100,
    height: 52,
    backgroundColor: Palette.primary,
    borderRadius: Radii.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  centerBox: {
    flex: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.background,
  },
  permissionText: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.onSurface,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 14,
    color: Palette.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionBtn: {
    minHeight: 56,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  manualFallbackBtn: {
    minHeight: 48,
    paddingVertical: Spacing.sm,
  },
  manualFallbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.primary,
    textDecorationLine: 'underline',
  },
  manualInputCard: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
