/**
 * CartDrawer — Slide-over cart and simulated checkout modal
 *
 * Scoped under .kw-app styling tokens.
 * Features:
 * - Line item quantity decrement/increment and removal
 * - Transparent subtotal calculation
 * - Checkout form with customer details & payment method
 * - Strictly labelled [DEMO] Simulated Payment
 * - Direct transition to Order Tracking (/orders/$id)
 */

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useCheckout,
  type CheckoutResponse,
} from "@/features/cart/hooks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CartDrawerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CartDrawer({ trigger, open: controlledOpen, onOpenChange }: CartDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const navigate = useNavigate();
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const checkout = useCheckout();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState("Aarav Sharma");
  const [shippingAddress, setShippingAddress] = useState("C-44, Hauz Khas Enclave, New Delhi 110016");
  const [paymentMethod, setPaymentMethod] = useState<"upi_qr" | "dbt_bank" | "cod">("upi_qr");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const totalItems = cart?.total_items ?? items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart?.subtotal_inr ?? items.reduce((s, i) => s + i.total_price, 0);

  const handleUpdateQty = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItem.mutate(itemId);
    } else {
      updateItem.mutate({ id: itemId, quantity: newQty });
    }
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!customerName.trim()) {
      setErrorMsg("Please provide your name or organisation reference.");
      return;
    }
    try {
      const res = await checkout.mutateAsync({
        customer_reference: customerName.trim(),
        shipping_address: shippingAddress.trim(),
        payment_method: paymentMethod,
      });
      setCheckoutResult(res);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Checkout failed. Please try again.";
      setErrorMsg(msg);
    }
  };

  const resetState = () => {
    setIsCheckingOut(false);
    setCheckoutResult(null);
    setErrorMsg(null);
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) resetState();
      }}
    >
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}

      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-[var(--kw-surface)] border-l border-[var(--kw-outline-variant)]">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-[var(--kw-outline-variant)] flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-[var(--kw-primary)]" />
            <SheetTitle className="kw-headline-sm text-[var(--kw-on-surface)] m-0">
              Shopping Cart {totalItems > 0 && `(${totalItems})`}
            </SheetTitle>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            [DEMO]
          </span>
        </SheetHeader>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {checkoutResult ? (
            /* Checkout Success State */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto size-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="size-8" />
              </div>
              <div>
                <h3 className="kw-headline-md text-[var(--kw-on-surface)] font-bold">Order Placed!</h3>
                <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-1">
                  Thank you, <strong>{checkoutResult.customer_reference}</strong>. Your order is queued for artisan craft production.
                </p>
              </div>

              {/* Demo Badge Alert */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <ShieldCheck className="size-4" />
                  <span>[DEMO] Simulated Payment Verified</span>
                </div>
                <p>
                  No real funds were charged. A simulated <strong>{checkoutResult.payment_method}</strong> receipt was generated.
                </p>
                <p className="font-mono text-[11px] text-amber-800">
                  Ref: {checkoutResult.payment_reference}
                </p>
              </div>

              {/* Order ID & Action */}
              <div className="p-3 rounded-lg bg-[var(--kw-surface-container-low)] text-xs text-muted-foreground font-mono">
                Order ID: {checkoutResult.order_id}
              </div>

              <div className="pt-2 space-y-2">
                <Button
                  className="w-full kw-btn kw-btn-primary h-11"
                  onClick={() => {
                    setIsOpen(false);
                    resetState();
                    void navigate({ to: `/orders/${checkoutResult.order_id}` });
                  }}
                >
                  <span>Track Order Journey</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    resetState();
                    void navigate({ to: "/shop" });
                  }}
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          ) : isCheckingOut ? (
            /* Checkout Form */
            <form onSubmit={handleProcessCheckout} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--kw-outline-variant)]">
                <span className="font-bold text-sm text-[var(--kw-on-surface)]">Simulated Checkout</span>
                <button
                  type="button"
                  onClick={() => setIsCheckingOut(false)}
                  className="text-xs text-[var(--kw-primary)] hover:underline"
                >
                  ← Back to cart
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Recipient Name / Reference *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Meera Sharma"
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Shipping Delivery Address
                </label>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Street, City, PIN code"
                  className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[var(--kw-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-2">
                  Payment Method (Demonstration)
                </label>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === "upi_qr"
                        ? "border-[var(--kw-primary)] bg-[var(--kw-surface-container)] font-semibold"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="upi_qr"
                      checked={paymentMethod === "upi_qr"}
                      onChange={() => setPaymentMethod("upi_qr")}
                      className="accent-[var(--kw-primary)]"
                    />
                    <QrCode className="size-4 text-[var(--kw-primary)]" />
                    <div className="flex-1">
                      <span>UPI Instant Settlement (Demo)</span>
                      <p className="text-[10px] text-muted-foreground font-normal">GPay / PhonePe / Paytm simulated QR</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === "dbt_bank"
                        ? "border-[var(--kw-primary)] bg-[var(--kw-surface-container)] font-semibold"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="dbt_bank"
                      checked={paymentMethod === "dbt_bank"}
                      onChange={() => setPaymentMethod("dbt_bank")}
                      className="accent-[var(--kw-primary)]"
                    />
                    <Building2 className="size-4 text-[var(--kw-primary)]" />
                    <div className="flex-1">
                      <span>Direct Benefit Transfer (DBT)</span>
                      <p className="text-[10px] text-muted-foreground font-normal">Direct bank transfer to SHG collective account</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === "cod"
                        ? "border-[var(--kw-primary)] bg-[var(--kw-surface-container)] font-semibold"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="accent-[var(--kw-primary)]"
                    />
                    <CreditCard className="size-4 text-[var(--kw-primary)]" />
                    <div className="flex-1">
                      <span>Cash on Delivery (COD)</span>
                      <p className="text-[10px] text-muted-foreground font-normal">Pay upon physical courier delivery</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Transparent Demo Notice */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>[DEMO] Simulated Checkout:</strong> This transaction will record a demo order and simulate payment confirmation without real banking charges.
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={checkout.isPending}
                  className="w-full kw-btn kw-btn-primary h-11 text-xs"
                >
                  {checkout.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                      <span>Simulating Payment…</span>
                    </>
                  ) : (
                    <span>Confirm & Place Order (₹{subtotal.toLocaleString("en-IN")})</span>
                  )}
                </Button>
              </div>
            </form>
          ) : items.length === 0 ? (
            /* Empty Cart */
            <div className="text-center py-12 space-y-3">
              <div className="mx-auto size-12 rounded-full bg-[var(--kw-surface-container)] flex items-center justify-center text-muted-foreground">
                <ShoppingBag className="size-6" />
              </div>
              <h4 className="kw-headline-sm text-[var(--kw-on-surface)]">Your cart is empty</h4>
              <p className="kw-body-sm text-[var(--kw-on-surface-variant)] max-w-xs mx-auto">
                Explore handcrafted pieces created by women artisan collectives across India.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  void navigate({ to: "/shop" });
                }}
                className="mt-2 text-xs"
              >
                Browse Shop
              </Button>
            </div>
          ) : (
            /* Cart Items List */
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] flex gap-3 items-center"
                >
                  <div className="size-16 rounded-lg bg-[var(--kw-surface-container)] shrink-0 overflow-hidden flex items-center justify-center">
                    {item.product_image_url ? (
                      <img
                        src={item.product_image_url}
                        alt={item.product_title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Craft</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="kw-body-sm font-semibold text-[var(--kw-on-surface)] truncate">
                      {item.product_title}
                    </h5>
                    <p className="text-xs font-semibold text-[var(--kw-primary)] mt-0.5">
                      ₹{item.unit_price.toLocaleString("en-IN")}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-[var(--kw-outline-variant)] rounded-md">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                          className="p-1 hover:bg-[var(--kw-surface-container)] text-muted-foreground hover:text-foreground"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                          className="p-1 hover:bg-[var(--kw-surface-container)] text-muted-foreground hover:text-foreground"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem.mutate(item.id)}
                        className="p-1 text-red-500 hover:text-red-700 ml-auto"
                        title="Remove item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with subtotal & CTA */}
        {!checkoutResult && items.length > 0 && !isCheckingOut && (
          <div className="p-6 border-t border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--kw-on-surface-variant)]">Subtotal ({totalItems} items)</span>
              <span className="font-bold text-base text-[var(--kw-on-surface)] tabular-nums">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            <Button
              className="w-full kw-btn kw-btn-primary h-11 text-xs"
              onClick={() => setIsCheckingOut(true)}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

