/**
 * Honest money — deterministic reconciliation of recorded financial records.
 * A sale is never mistaken for money received: every figure here comes from
 * recorded rows (orders, payments, expenses), never from estimates.
 */

export interface PaymentLike {
  direction: string;
  amount: number;
  status: string;
}

export interface ExpenseLike {
  amount: number;
}

export interface ArtisanMoney {
  /** Value of delivered orders recorded against the artisan. */
  deliveredValue: number;
  tips: number;
  earnedTotal: number;
  /** Payouts recorded to the artisan. */
  payouts: number;
  /** Earned but not yet recorded as paid out (never negative). */
  awaitingPayout: number;
  /** Customer payments recorded against this artisan's orders. */
  customerPaymentsRecorded: number;
  expenses: number;
}

export function summarizeArtisanMoney(input: {
  deliveredValue: number;
  tips: number;
  payments: PaymentLike[];
  expenses: ExpenseLike[];
}): ArtisanMoney {
  let payouts = 0;
  let customerPaymentsRecorded = 0;
  for (const p of input.payments) {
    const amount = Number(p.amount) || 0;
    if (p.direction === "artisan_payout") payouts += amount;
    else if (p.direction === "customer_payment") customerPaymentsRecorded += amount;
  }
  const deliveredValue = Number(input.deliveredValue) || 0;
  const tips = Number(input.tips) || 0;
  const earnedTotal = deliveredValue + tips;
  return {
    deliveredValue,
    tips,
    earnedTotal,
    payouts,
    awaitingPayout: Math.max(0, earnedTotal - payouts),
    customerPaymentsRecorded,
    expenses: input.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),
  };
}

export interface CollectiveMoney {
  /** Recorded order value (product price × quantity over all orders). */
  orderValue: number;
  /** Customer payments recorded, split by status. */
  paymentsRecorded: number;
  paymentsPaid: number;
  /** Payouts recorded to artisans. */
  payouts: number;
  /** Collective expenses recorded. */
  expenses: number;
  /** paymentsRecorded − payouts − expenses; can be negative. */
  recordedBalance: number;
}

export function summarizeCollectiveMoney(input: {
  orderValue: number;
  payments: PaymentLike[];
  expenses: ExpenseLike[];
}): CollectiveMoney {
  let paymentsRecorded = 0;
  let paymentsPaid = 0;
  let payouts = 0;
  for (const p of input.payments) {
    const amount = Number(p.amount) || 0;
    if (p.direction === "customer_payment") {
      paymentsRecorded += amount;
      if (p.status === "paid") paymentsPaid += amount;
    } else if (p.direction === "artisan_payout") {
      payouts += amount;
    }
  }
  const expenses = input.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return {
    orderValue: Number(input.orderValue) || 0,
    paymentsRecorded,
    paymentsPaid,
    payouts,
    expenses,
    recordedBalance: paymentsRecorded - payouts - expenses,
  };
}
