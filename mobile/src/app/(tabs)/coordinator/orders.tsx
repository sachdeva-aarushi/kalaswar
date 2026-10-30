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
import { useTranslation } from 'react-i18next';
import { Palette, Typography, Spacing, Radii, Shadows } from '@/constants/theme';
import { useLanguage } from '@/hooks/use-language';
import {
  useOrders,
  useUpdateOrderStatus,
  useDispatchOrder,
  type OrderItem,
} from '@/hooks/queries/use-orders';

export default function CoordinatorOrdersScreen() {
  const router = useRouter();
  const { isHindi, toggleLanguage } = useLanguage();
  const { data: orders, isLoading, isError, refetch } = useOrders('coordinator');
  const updateStatusMutation = useUpdateOrderStatus();
  const dispatchMutation = useDispatchOrder();

  const [filter, setFilter] = useState<'all' | 'in_production' | 'quality_check' | 'dispatched'>('all');
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<OrderItem | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('India Post SpeedPost');

  const filteredOrders = orders?.filter((o) => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const handleOpenDispatchModal = (order: OrderItem) => {
    setSelectedOrderForDispatch(order);
    setTrackingNumber(`IN-POST-${Math.floor(1000000 + Math.random() * 9000000)}`);
  };

  const handleConfirmDispatch = () => {
    if (!selectedOrderForDispatch) return;
    dispatchMutation.mutate(
      {
        orderId: selectedOrderForDispatch.id,
        trackingNumber: trackingNumber.trim() || 'IN-POST-9912048',
        carrier,
      },
      {
        onSuccess: () => {
          setSelectedOrderForDispatch(null);
        },
      }
    );
  };

  const getStatusBadge = (status: OrderItem['status']) => {
    switch (status) {
      case 'dispatched':
      case 'delivered':
        return {
          label: isHindi ? 'प्रेषित · Dispatched' : 'Dispatched',
          bg: Palette.primaryFixed,
          color: Palette.primary,
        };
      case 'quality_check':
        return {
          label: isHindi ? 'गुणवत्ता जांच' : 'Quality Check',
          bg: Palette.secondaryContainer,
          color: Palette.onSecondaryContainer,
        };
      case 'in_production':
      default:
        return {
          label: isHindi ? 'उत्पादन में' : 'In Production',
          bg: Palette.surfaceContainerHigh,
          color: Palette.primary,
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>KALASWAR COORDINATOR</Text>
          <Text style={styles.headerTitle}>
            {isHindi ? 'आदेश और प्रेषण' : 'Orders & Dispatch'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => router.push('/coordinator/scan')}
            accessibilityLabel="Scan QR"
          >
            <Ionicons name="qr-code-outline" size={20} color={Palette.primary} />
            <Text style={styles.scanBtnText}>{isHindi ? 'स्कैन' : 'Scan'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.langPill}
            onPress={toggleLanguage}
            accessibilityLabel="Toggle Language"
          >
            <Text style={styles.langPillText}>{isHindi ? 'EN' : 'हि'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['all', 'in_production', 'quality_check', 'dispatched'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.filterPill, filter === tab && styles.filterPillActive]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === tab && styles.filterTextActive,
                ]}
              >
                {tab === 'all'
                  ? isHindi ? 'सभी' : 'All'
                  : tab === 'in_production'
                  ? isHindi ? 'उत्पादन' : 'In Prod'
                  : tab === 'quality_check'
                  ? isHindi ? 'गुणवत्ता' : 'QC'
                  : isHindi ? 'प्रेषित' : 'Dispatched'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Palette.primary} />
            <Text style={styles.loadingText}>
              {isHindi ? 'आदेश सूची लोड हो रही है...' : 'Loading order shipments...'}
            </Text>
          </View>
        )}

        {/* Error State */}
        {isError && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Palette.errorTerracotta} />
            <Text style={styles.errorTitle}>
              {isHindi ? 'डेटा लोड नहीं हो सका' : 'Could not load orders'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>{isHindi ? 'पुनः प्रयास करें' : 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !isError && filteredOrders && filteredOrders.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="documents-outline" size={48} color={Palette.outline} />
            <Text style={styles.errorTitle}>
              {isHindi ? 'कोई आदेश नहीं मिला' : 'No orders in this status'}
            </Text>
          </View>
        )}

        {/* Orders List */}
        {!isLoading &&
          filteredOrders &&
          filteredOrders.map((order) => {
            const badge = getStatusBadge(order.status);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.customerName}>{order.customerName}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.productBlock}>
                  <Text style={styles.productTitle}>{order.productTitle}</Text>
                  <View style={styles.productMetaRow}>
                    <Text style={styles.productQty}>Qty: {order.quantity} units</Text>
                    <Text style={styles.productPrice}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Tracking & Passport Tag */}
                <View style={styles.tagRow}>
                  {order.dppPassportId && (
                    <TouchableOpacity
                      style={styles.passportTag}
                      onPress={() => router.push(`/passport/${order.dppPassportId}` as any)}
                    >
                      <Ionicons name="shield-checkmark" size={14} color={Palette.primary} />
                      <Text style={styles.passportTagText}>DPP PASSPORT</Text>
                    </TouchableOpacity>
                  )}

                  {order.trackingNumber && (
                    <View style={styles.trackingTag}>
                      <Ionicons name="airplane-outline" size={14} color={Palette.onSurfaceVariant} />
                      <Text style={styles.trackingTagText}>{order.trackingNumber}</Text>
                    </View>
                  )}

                  <Text style={styles.deliveryDateText}>Due {order.deliveryDate}</Text>
                </View>

                {/* Coordinator Action Buttons */}
                <View style={styles.actionRow}>
                  {order.status !== 'dispatched' && order.status !== 'delivered' ? (
                    <TouchableOpacity
                      style={styles.dispatchBtn}
                      onPress={() => handleOpenDispatchModal(order)}
                    >
                      <Ionicons name="paper-plane" size={18} color={Palette.onPrimary} />
                      <Text style={styles.dispatchBtnText}>
                        {isHindi ? 'प्रेषित करें (Dispatch)' : 'Dispatch Order'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.dispatchedConfirmedPill}>
                      <Ionicons name="checkmark-done" size={18} color={Palette.primary} />
                      <Text style={styles.dispatchedConfirmedText}>
                        {isHindi ? 'सफलतापूर्वक प्रेषित' : 'Dispatched with Tracking'}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.detailBtn}
                    onPress={() => router.push(`/orders/${order.id}` as any)}
                  >
                    <Ionicons name="chevron-forward" size={18} color={Palette.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dispatch Modal with Waybill & Tracking Entry */}
      <Modal
        visible={Boolean(selectedOrderForDispatch)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderForDispatch(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isHindi ? 'आदेश प्रेषण एवं ट्रैकिंग' : 'Dispatch Order & Generate Waybill'}
                </Text>
                <Text style={styles.modalSub}>
                  {selectedOrderForDispatch?.orderNumber} · {selectedOrderForDispatch?.customerName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrderForDispatch(null)}>
                <Ionicons name="close" size={24} color={Palette.onSurface} />
              </TouchableOpacity>
            </View>

            {/* QR Scan Reassurance Button */}
            <TouchableOpacity
              style={styles.scanPassportCta}
              onPress={() => {
                setSelectedOrderForDispatch(null);
                router.push('/coordinator/scan');
              }}
            >
              <Ionicons name="qr-code-outline" size={22} color={Palette.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanPassportTitle}>
                  {isHindi ? 'प्रेषण से पहले क्यूआर पासपोर्ट जांचें' : 'Verify Passport QR Before Dispatch'}
                </Text>
                <Text style={styles.scanPassportSub}>
                  Ensure cryptographic certificate is printed & attached
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Palette.primary} />
            </TouchableOpacity>

            {/* Carrier Tracking Input */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{isHindi ? 'कूरियर ट्रैकिंग नंबर' : 'Courier Tracking AWB'}</Text>
              <TextInput
                style={styles.inputField}
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder="e.g. IN-POST-9912048"
                placeholderTextColor={Palette.outline}
              />
            </View>

            {/* Carrier Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{isHindi ? 'लॉजिस्टिक्स पार्टनर' : 'Logistics Partner'}</Text>
              <View style={styles.carrierGrid}>
                {['India Post SpeedPost', 'Delhivery Surface', 'Kendra Self-Courier'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.carrierPill, carrier === c && styles.carrierPillActive]}
                    onPress={() => setCarrier(c)}
                  >
                    <Text style={[styles.carrierText, carrier === c && styles.carrierTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 56dp Confirm Dispatch Button */}
            <TouchableOpacity
              style={styles.confirmDispatchBtn}
              onPress={handleConfirmDispatch}
              disabled={dispatchMutation.isPending}
            >
              {dispatchMutation.isPending ? (
                <ActivityIndicator color={Palette.onPrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={22} color={Palette.onPrimary} />
                  <Text style={styles.confirmDispatchText}>
                    {isHindi ? 'प्रेषण की पुष्टि करें · Confirm Dispatch' : 'Confirm Dispatch & Send Tracking'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Palette.surfaceContainer,
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primary,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.onSurface,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scanBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.primary,
  },
  langPill: {
    minWidth: 40,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    backgroundColor: Palette.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterPillActive: {
    backgroundColor: Palette.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  filterTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.primary,
  },
  customerName: {
    fontSize: 13,
    color: Palette.onSurfaceVariant,
    marginTop: 1,
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
  productBlock: {
    backgroundColor: Palette.surfaceContainerLow,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: 4,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.onSurface,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQty: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.secondary,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  passportTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  passportTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.primary,
  },
  trackingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  trackingTagText: {
    fontSize: 10,
    color: Palette.onSurfaceVariant,
    fontFamily: 'monospace',
  },
  deliveryDateText: {
    fontSize: 11,
    color: Palette.outline,
    marginLeft: 'auto',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  dispatchBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dispatchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.onPrimary,
  },
  dispatchedConfirmedPill: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primaryFixed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dispatchedConfirmedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  detailBtn: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: Palette.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
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
  modalSub: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
    marginTop: 2,
  },
  scanPassportCta: {
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Palette.outlineVariant,
  },
  scanPassportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Palette.primary,
  },
  scanPassportSub: {
    fontSize: 11,
    color: Palette.outline,
    marginTop: 1,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Palette.onSurfaceVariant,
  },
  inputField: {
    height: 50,
    backgroundColor: Palette.surfaceContainer,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 14,
    color: Palette.onSurface,
  },
  carrierGrid: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  carrierPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Palette.surfaceContainerHigh,
  },
  carrierPillActive: {
    backgroundColor: Palette.primary,
  },
  carrierText: {
    fontSize: 12,
    color: Palette.onSurfaceVariant,
  },
  carrierTextActive: {
    color: Palette.onPrimary,
    fontWeight: '700',
  },
  confirmDispatchBtn: {
    minHeight: 56,
    borderRadius: Radii.lg,
    backgroundColor: Palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  confirmDispatchText: {
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
