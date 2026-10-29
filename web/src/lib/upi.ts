/** UPI deep-link helpers: build scannable payment QRs from a collective's UPI ID. */

export function isValidUpiId(value: string): boolean {
  return /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(value.trim());
}

export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}

export function buildUpiUri({ upiId, payeeName, amount, note }: UpiPaymentParams): string {
  const params = new URLSearchParams({
    pa: upiId.trim(),
    pn: payeeName.trim(),
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.trim(),
  });
  return `upi://pay?${params.toString()}`;
}
