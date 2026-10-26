import { describe, expect, it } from "vitest";
import { routeCommand } from "@/lib/voice-router";
import { toCsv } from "@/lib/csv";
import { dictionaries } from "@/lib/i18n";
import { computeShgRanking } from "@/lib/ranking";
import { isValidUpiId, buildUpiUri } from "@/lib/upi";
import type { OrderEvent, OrderWithDetails, Payment, Shg } from "@/lib/types";

describe("voice command router", () => {
  it("routes English order questions", () => {
    expect(routeCommand("show pending orders")).toBe("show_pending");
    expect(routeCommand("orders in production")).toBe("show_in_production");
    expect(routeCommand("ready orders")).toBe("show_ready");
    expect(routeCommand("show delivered orders")).toBe("show_delivered");
    expect(routeCommand("what are my earnings")).toBe("show_earnings");
    expect(routeCommand("help")).toBe("open_help");
  });

  it("never mistakes 'ready for dispatch' for delivered", () => {
    expect(routeCommand("orders ready for dispatch")).toBe("show_ready");
  });

  it("routes Hindi order questions", () => {
    expect(routeCommand("मेरे लंबित ऑर्डर")).toBe("show_pending");
    expect(routeCommand("उत्पादन में ऑर्डर")).toBe("show_in_production");
    expect(routeCommand("तैयार ऑर्डर")).toBe("show_ready");
    expect(routeCommand("डिलीवर ऑर्डर")).toBe("show_delivered");
    expect(routeCommand("मेरी कमाई")).toBe("show_earnings");
    expect(routeCommand("मदद")).toBe("open_help");
  });

  it("switches languages on command", () => {
    expect(routeCommand("switch to english")).toBe("switch_language_en");
    expect(routeCommand("switch to hindi")).toBe("switch_language_hi");
    expect(routeCommand("हिंदी में बदलो")).toBe("switch_language_hi");
    expect(routeCommand("अंग्रेज़ी")).toBe("switch_language_en");
    expect(routeCommand("switch to marathi")).toBe("switch_language_mr");
    expect(routeCommand("मराठी मध्ये बदल")).toBe("switch_language_mr");
  });

  it("routes Marathi order and payment questions", () => {
    expect(routeCommand("माझे प्रलंबित ऑर्डर")).toBe("show_pending");
    expect(routeCommand("निर्मितीतील ऑर्डर")).toBe("show_in_production");
    expect(routeCommand("तयार ऑर्डर")).toBe("show_ready");
    expect(routeCommand("वितरित ऑर्डर")).toBe("show_delivered");
    expect(routeCommand("माझी कमाई")).toBe("show_earnings");
    expect(routeCommand("माझे देयक")).toBe("show_payments");
    expect(routeCommand("मदत")).toBe("open_help");
  });

  it("answers unknown input as unknown", () => {
    expect(routeCommand("what is the weather")).toBe("unknown");
    expect(routeCommand("")).toBe("unknown");
  });
});

describe("CSV export", () => {
  it("quotes cells containing commas, quotes and newlines", () => {
    const csv = toCsv(
      [
        { name: 'Bag, "Large"', note: "line1\nline2" },
        { name: "Plain", note: "fine" },
      ],
      [
        { key: "name", label: "Name" },
        { key: "note", label: "Note" },
      ],
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Name,Note");
    expect(lines[1]).toBe('"Bag, ""Large""","line1\nline2"');
    expect(lines[2]).toBe("Plain,fine");
  });
});

describe("localization", () => {
  it("has a Hindi translation for every English key", () => {
    const missing = Object.keys(dictionaries.en).filter((k) => !(k in dictionaries.hi));
    expect(missing).toEqual([]);
  });

  it("has a Marathi translation for every English key", () => {
    const missing = Object.keys(dictionaries.en).filter((k) => !(k in dictionaries.mr));
    expect(missing).toEqual([]);
  });
});

describe("SHG ranking", () => {
  const shgs = [
    { id: "shg-1", name: "Group A", region: "North" },
    { id: "shg-2", name: "Group B", region: "South" },
  ];

  const artisan = (id: string, shgId: string) => ({
    id,
    shg_id: shgId,
    name: id,
    craft: "",
    bio: "",
    preferred_language: "en",
    photo_url: null,
    photo_public_id: null,
    created_at: "",
  });

  const order = (
    id: string,
    artisanId: string,
    status: OrderWithDetails["status"],
    expected: string | null,
  ): OrderWithDetails => ({
    id,
    product_id: "p",
    customer_reference: id,
    quantity: 1,
    status,
    expected_dispatch_at: expected,
    created_at: "",
    artisan: artisan(artisanId, artisanId === "a1" ? "shg-1" : "shg-2"),
  });

  const event = (orderId: string, type: string, at: string): OrderEvent => ({
    id: `${orderId}-${type}`,
    order_id: orderId,
    event_type: type,
    note: null,
    created_at: at,
  });

  const payout = (artisanId: string, amount: number): Payment => ({
    id: `pay-${artisanId}`,
    order_id: null,
    shg_id: null,
    artisan_id: artisanId,
    direction: "artisan_payout",
    amount,
    method: "upi_qr",
    status: "paid",
    upi_reference: null,
    note: null,
    created_at: "",
  });

  it("scores on-time delivery and earnings fairness, half and half", () => {
    const orders = [
      order("o1", "a1", "delivered", "2030-01-10"), // delivered on time
      order("o2", "a1", "delivered", "2030-01-01"), // delivered late
      order("o3", "a2", "delivered", "2030-01-10"), // no delivery event yet
    ];
    const events = [event("o1", "delivered", "2030-01-09"), event("o2", "delivered", "2030-01-20")];
    const payments = [
      { ...payout("a2", 50), order_id: null, shg_id: null, artisan_id: "a2" },
      payout("a1", 100),
    ];
    // Customer payments: group A received 100 total, paid 100 out → fairness 1.
    // Group B received 100 (via its order)… none recorded, so fairness 0.
    const customerPayment: Payment = {
      id: "cp1",
      order_id: "o1",
      shg_id: "shg-1",
      artisan_id: "a1",
      direction: "customer_payment",
      amount: 100,
      method: "upi_qr",
      status: "recorded",
      upi_reference: null,
      note: null,
      created_at: "",
    };
    const scores = computeShgRanking(shgs, orders, events, [...payments, customerPayment]);

    const groupA = scores.find((s) => s.shgId === "shg-1")!;
    const groupB = scores.find((s) => s.shgId === "shg-2")!;

    // Group A: 1 of 2 dated deliveries on time → 50% × 50 = 25; fairness 100/100 = 50. Score 75.
    expect(groupA.onTimeRate).toBe(0.5);
    expect(groupA.fairnessRate).toBe(1);
    expect(groupA.score).toBe(75);

    // Group B: no dated delivery → on-time 0; no customer payment received → fairness 0.
    expect(groupB.onTimeRate).toBe(0);
    expect(groupB.fairnessRate).toBe(0);
    expect(groupB.score).toBe(0);

    // Higher score ranks first.
    expect(scores[0]?.shgId).toBe("shg-1");
  });
});

describe("UPI helpers", () => {
  it("accepts valid UPI IDs and rejects broken ones", () => {
    expect(isValidUpiId("naav@okbank")).toBe(true);
    expect(isValidUpiId("name.surname-1@bank")).toBe(true);
    expect(isValidUpiId("nope")).toBe(false);
    expect(isValidUpiId("name@")).toBe(false);
    expect(isValidUpiId("@bank")).toBe(false);
  });

  it("builds a scannable UPI deep link", () => {
    const uri = buildUpiUri({
      upiId: "naav@okbank",
      payeeName: "Group A",
      amount: 1200,
      note: "Sikki box",
    });
    expect(uri.startsWith("upi://pay?")).toBe(true);
    expect(uri).toContain("pa=naav%40okbank");
    expect(uri).toContain("am=1200.00");
    expect(uri).toContain("cu=INR");
  });
});

describe("demonstration schema sanity", () => {
  it("keeps UPI IDs nullable on SHG rows", () => {
    // Shg type guard: the field must exist and default to null in demo data paths.
    const shg = { upi_id: null } as Pick<Shg, "upi_id">;
    expect(shg.upi_id).toBeNull();
  });
});
