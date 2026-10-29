import { describe, expect, it } from "vitest";
import { summarizeArtisanMoney, summarizeCollectiveMoney } from "../lib/earnings";

describe("summarizeArtisanMoney", () => {
  it("separates earned, paid out and awaiting payout from recorded rows", () => {
    const m = summarizeArtisanMoney({
      deliveredValue: 2000,
      tips: 150,
      payments: [
        { direction: "artisan_payout", amount: 1200, status: "paid" },
        { direction: "customer_payment", amount: 850, status: "recorded" },
      ],
      expenses: [{ amount: 200 }],
    });
    expect(m.earnedTotal).toBe(2150);
    expect(m.payouts).toBe(1200);
    expect(m.awaitingPayout).toBe(950);
    expect(m.customerPaymentsRecorded).toBe(850);
    expect(m.expenses).toBe(200);
  });

  it("never shows a negative awaiting payout", () => {
    const m = summarizeArtisanMoney({
      deliveredValue: 500,
      tips: 0,
      payments: [{ direction: "artisan_payout", amount: 900, status: "paid" }],
      expenses: [],
    });
    expect(m.awaitingPayout).toBe(0);
  });

  it("returns zeros when nothing is recorded", () => {
    const m = summarizeArtisanMoney({ deliveredValue: 0, tips: 0, payments: [], expenses: [] });
    expect(m.earnedTotal).toBe(0);
    expect(m.payouts).toBe(0);
    expect(m.awaitingPayout).toBe(0);
  });
});

describe("summarizeCollectiveMoney", () => {
  it("splits recorded customer payments by status and subtracts outflow", () => {
    const m = summarizeCollectiveMoney({
      orderValue: 5000,
      payments: [
        { direction: "customer_payment", amount: 3000, status: "paid" },
        { direction: "customer_payment", amount: 1000, status: "recorded" },
        { direction: "artisan_payout", amount: 1500, status: "paid" },
      ],
      expenses: [{ amount: 300 }, { amount: 200 }],
    });
    expect(m.orderValue).toBe(5000);
    expect(m.paymentsRecorded).toBe(4000);
    expect(m.paymentsPaid).toBe(3000);
    expect(m.payouts).toBe(1500);
    expect(m.expenses).toBe(500);
    expect(m.recordedBalance).toBe(2000);
  });

  it("lets the recorded balance go negative instead of hiding outflow", () => {
    const m = summarizeCollectiveMoney({
      orderValue: 1000,
      payments: [{ direction: "customer_payment", amount: 500, status: "paid" }],
      expenses: [{ amount: 800 }],
    });
    expect(m.recordedBalance).toBe(-300);
  });
});
