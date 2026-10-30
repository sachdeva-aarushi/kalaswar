import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';

interface MaterialStock {
  id: string;
  name: string;
  nameHi: string;
  stock: string;
  status: 'enough' | 'low' | 'empty';
  imageUrl?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

const MATERIALS_DATA: MaterialStock[] = [
  {
    id: 'mat-1',
    name: 'Red Silk Thread',
    nameHi: 'लाल रेशमी धागा',
    stock: '6 reels available',
    status: 'enough',
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'mat-2',
    name: 'Raw Cotton Cloth (Khadi)',
    nameHi: 'कच्चा सूती कपड़ा',
    stock: '12 meters left',
    status: 'low',
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'mat-3',
    name: 'Natural Indigo Dye',
    nameHi: 'प्राकृतिक नील डाई',
    stock: '1 packet critically depleted',
    status: 'empty',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=70',
  },
  {
    id: 'mat-4',
    name: 'Mirror Craft Pieces (Abla)',
    nameHi: 'आभला शीशा',
    stock: '250 pieces in box',
    status: 'enough',
    iconName: 'sparkles-outline',
  },
  {
    id: 'mat-5',
    name: 'Embroidery Needles (#7)',
    nameHi: 'कढ़ाई की सुई',
    stock: '10 needles available',
    status: 'enough',
    iconName: 'pin-outline',
  },
];

const FINISHED_GOODS = [
  { id: 'fin-1', name: 'Embroidered Dupatta', ready: '4 pieces ready', icon: 'shirt-outline' },
  { id: 'fin-2', name: 'Cushion Cover (Pair)', ready: '2 pairs ready', icon: 'square-outline' },
  { id: 'fin-3', name: 'Handcrafted Tote Bag', ready: '1 piece ready', icon: 'bag-handle-outline' },
];

export default function CoordinatorInventoryScreen() {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';

  const [activeTab, setActiveTab] = useState<'materials' | 'finished'>('materials');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => setIsPlayingAudio(false), 4000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconContainer}>
            <Ionicons name="cube-outline" size={24} color={Palette.onPrimary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>M-11: Stock & Inventory</Text>
            <Text style={styles.headerSub}>KALASWAR CLUSTER</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handlePlayAudio}
          accessibilityLabel="Listen Audio"
        >
          <Ionicons name="volume-high" size={24} color={Palette.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Offline Sync Status Banner */}
        <View style={styles.syncBanner}>
          <View style={styles.syncLeft}>
            <View style={styles.syncIconBox}>
              <Ionicons name="cloud-done" size={18} color={Palette.primary} />
            </View>
            <Text style={styles.syncText}>Saved on your phone · फ़ोन पर सुरक्षित</Text>
          </View>
          <View style={styles.pulsingIndicator} />
        </View>

        {/* Screen Header & Listen Assistant */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={styles.screenTag}>INVENTORY</Text>
            <Text style={styles.mainTitle}>Stock & Craft Materials</Text>
            <Text style={styles.subTitle}>Manage artisan supplies and items</Text>
          </View>
          <TouchableOpacity
            style={styles.listenBtn}
            onPress={handlePlayAudio}
            accessibilityLabel="Listen stock status"
          >
            <Ionicons name="volume-high" size={20} color={Palette.onSecondaryContainer} />
            <Text style={styles.listenBtnText}>Listen</Text>
          </TouchableOpacity>
        </View>

        {isPlayingAudio && (
          <View style={styles.audioToast}>
            <Ionicons name="mic" size={20} color={Palette.primaryFixed} />
            <Text style={styles.audioToastText}>
              {isHindi
                ? 'नील रंग और सूती कपड़े की कमी है। 3 सामग्री पर्याप्त हैं।'
                : 'Indigo dye and raw cotton cloth are running low. 3 materials are well-stocked.'}
            </Text>
          </View>
        )}

        {/* Category Toggle (48dp height segmented switch) */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'materials' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('materials')}
          >
            <Ionicons
              name="color-palette-outline"
              size={18}
              color={activeTab === 'materials' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text style={[styles.segmentText, activeTab === 'materials' && styles.segmentTextActive]}>
              Materials (5)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'finished' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('finished')}
          >
            <Ionicons
              name="checkbox-outline"
              size={18}
              color={activeTab === 'finished' ? Palette.primary : Palette.onSurfaceVariant}
            />
            <Text style={[styles.segmentText, activeTab === 'finished' && styles.segmentTextActive]}>
              Finished Goods (3)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Materials List */}
        {activeTab === 'materials' ? (
          <View style={styles.listContainer}>
            {MATERIALS_DATA.map((item) => {
              const isEnough = item.status === 'enough';
              const isLow = item.status === 'low';
              const isEmpty = item.status === 'empty';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.materialCard,
                    isEmpty && styles.emptyMaterialCard,
                  ]}
                >
                  <View style={styles.materialTop}>
                    <View style={styles.materialThumbCol}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.materialThumb} />
                      ) : (
                        <View style={styles.materialIconThumb}>
                          <Ionicons
                            name={(item.iconName || 'cube-outline') as any}
                            size={28}
                            color={Palette.primary}
                          />
                        </View>
                      )}
                      <View style={styles.materialTextCol}>
                        <Text style={styles.materialName}>{item.name}</Text>
                        <View style={styles.stockAmountRow}>
                          <Text
                            style={[
                              styles.stockNumber,
                              isLow && { color: Palette.errorTerracotta },
                              isEmpty && { color: Palette.errorTerracotta },
                            ]}
                          >
                            {item.stock}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    {isEnough && (
                      <View style={styles.enoughBadge}>
                        <Ionicons name="checkmark-circle" size={14} color={Palette.primary} />
                        <Text style={styles.enoughBadgeText}>Enough</Text>
                      </View>
                    )}
                    {isLow && (
                      <View style={styles.lowBadge}>
                        <Ionicons name="warning" size={14} color={Palette.errorTerracotta} />
                        <Text style={styles.lowBadgeText}>Low</Text>
                      </View>
                    )}
                    {isEmpty && (
                      <View style={styles.emptyBadge}>
                        <Ionicons name="alert-circle" size={14} color="#ffffff" />
                        <Text style={styles.emptyBadgeText}>Empty</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions for Low / Empty items */}
                  {isLow && (
                    <TouchableOpacity
                      style={styles.actionBtnLow}
                      onPress={() => showToast(`Requested 30m of ${item.name} for Kendra.`)}
                    >
                      <View style={styles.actionBtnLeft}>
                        <Ionicons name="cart-outline" size={20} color={Palette.primary} />
                        <Text style={styles.actionBtnTextLow}>Ask for more</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color={Palette.primary} />
                    </TouchableOpacity>
                  )}

                  {isEmpty && (
                    <TouchableOpacity
                      style={styles.actionBtnUrgent}
                      onPress={() => showToast(`Urgent reorder logged: ${item.name} dispatch notified.`)}
                    >
                      <View style={styles.actionBtnLeft}>
                        <Ionicons name="alert-circle" size={20} color="#ffffff" />
                        <Text style={styles.actionBtnTextUrgent}>Request urgently</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {FINISHED_GOODS.map((item) => (
              <View key={item.id} style={styles.finishedCard}>
                <View style={styles.finishedLeft}>
                  <View style={styles.finishedIconBox}>
                    <Ionicons name={item.icon as any} size={26} color={Palette.onSecondaryFixed} />
                  </View>
                  <View>
                    <Text style={styles.finishedTitle}>{item.name}</Text>
                    <Text style={styles.finishedReady}>{item.ready}</Text>
                  </View>
                </View>
                <View style={styles.enoughBadge}>
                  <Text style={styles.enoughBadgeText}>Ready</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* SHG Cluster Note */}
        <View style={styles.clusterNoteBox}>
          <View style={styles.clusterNoteIconBox}>
            <Ionicons name="headset-outline" size={24} color={Palette.secondary} />
          </View>
          <View style={styles.clusterNoteCol}>
            <Text style={styles.clusterNoteTag}>SHG CLUSTER NOTE</Text>
            <Text style={styles.clusterNoteBody}>
              Bhagirathi cluster supplies managed by Sunita Didi
            </Text>
          </View>
        </View>

        {/* Primary Sticky Bottom Request Action (56dp target) */}
        <TouchableOpacity
          style={styles.stickyAskBtn}
          onPress={() => showToast('Cluster request sent to Sunita Didi.')}
          activeOpacity={0.88}
        >
          <Ionicons name="chatbubble-outline" size={22} color={Palette.onPrimary} />
          <Text style={styles.stickyAskText}>Ask for materials</Text>
        </TouchableOpacity>

        {/* Toast Feedback */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Palette.primaryFixed} />
            <Text style={styles.toastBannerText}>{toastMessage}</Text>
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
  headerLeft: {
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
  headerTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
  },
  headerSub: {
    ...Typography.labelSm,
    color: Palette.secondary,
    letterSpacing: 1.2,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: 110,
    gap: Spacing.md,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surfaceContainer,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.lg,
    ...Shadows.sm,
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncIconBox: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(8, 53, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: {
    ...Typography.bodySm,
    color: Palette.primary,
    fontWeight: '600',
  },
  pulsingIndicator: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
    backgroundColor: Palette.primary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCol: {
    flex: 1,
  },
  screenTag: {
    ...Typography.labelSm,
    color: Palette.secondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  mainTitle: {
    ...Typography.headlineLg,
    color: Palette.primary,
    lineHeight: 28,
  },
  subTitle: {
    ...Typography.bodySm,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  listenBtn: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
    backgroundColor: Palette.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.sm,
  },
  listenBtnText: {
    ...Typography.labelMd,
    color: Palette.onSecondaryContainer,
    fontWeight: '700',
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
  segmentContainer: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.lg,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Palette.surfaceContainerLowest,
    ...Shadows.sm,
  },
  segmentText: {
    ...Typography.labelMd,
    color: Palette.onSurfaceVariant,
  },
  segmentTextActive: {
    color: Palette.primary,
    fontWeight: '700',
  },
  listContainer: {
    gap: Spacing.sm,
  },
  materialCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  emptyMaterialCard: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  materialTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  materialThumbCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  materialThumb: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  materialIconThumb: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialTextCol: {
    flex: 1,
  },
  materialName: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontSize: 16,
  },
  stockAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  stockNumber: {
    ...Typography.bodyMd,
    color: Palette.onSurface,
    fontWeight: '600',
  },
  enoughBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.tertiaryGuidance,
  },
  enoughBadgeText: {
    ...Typography.labelSm,
    color: Palette.primary,
    fontWeight: '600',
  },
  lowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  lowBadgeText: {
    ...Typography.labelSm,
    color: Palette.errorTerracotta,
    fontWeight: '700',
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
    backgroundColor: Palette.errorTerracotta,
  },
  emptyBadgeText: {
    ...Typography.labelSm,
    color: '#ffffff',
    fontWeight: '700',
  },
  actionBtnLow: {
    minHeight: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    ...Shadows.sm,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnTextLow: {
    ...Typography.labelLg,
    color: Palette.primary,
  },
  actionBtnUrgent: {
    minHeight: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.errorTerracotta,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    ...Shadows.md,
  },
  actionBtnTextUrgent: {
    ...Typography.labelLg,
    color: '#ffffff',
    fontWeight: '700',
  },
  finishedCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  finishedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  finishedIconBox: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedTitle: {
    ...Typography.headlineSm,
    color: Palette.primary,
    fontSize: 16,
  },
  finishedReady: {
    ...Typography.bodyMd,
    color: Palette.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  clusterNoteBox: {
    backgroundColor: Palette.surfaceContainerHigh,
    borderRadius: Radii.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clusterNoteIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(123, 88, 18, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterNoteCol: {
    flex: 1,
  },
  clusterNoteTag: {
    ...Typography.labelSm,
    color: Palette.secondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  clusterNoteBody: {
    ...Typography.bodySm,
    color: Palette.onSurface,
    marginTop: 2,
  },
  stickyAskBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadows.md,
  },
  stickyAskText: {
    ...Typography.labelLg,
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  toastBanner: {
    backgroundColor: Palette.primary,
    borderRadius: Radii.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.lg,
  },
  toastBannerText: {
    ...Typography.bodySm,
    color: Palette.onPrimary,
    flex: 1,
  },
});
