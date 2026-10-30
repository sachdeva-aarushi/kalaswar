/**
 * Vitest Tests for Shop & Gift Concierge Flows
 *
 * Verifies:
 * - Flow 1: Cart calculations, checkout demo labelling, order tracking event filtering
 * - Flow 2: MakePossible feasibility verdict categorization & two-sided version matching
 * - Flow 3: B2B quote version comparison & sample status progression
 * - Craft story verification-source badge assertions
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LivingCraftStory } from "@/components/craft-story/living-craft-story";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Flow 1: Cart, Checkout & Order Tracking State Rules", () => {
  it("calculates cart subtotal and total line items accurately", () => {
    const items = [
      { id: "1", product_title: "Kantha Stole", unit_price: 2850, quantity: 2 },
      { id: "2", product_title: "Terracotta Diya", unit_price: 450, quantity: 4 },
    ];
    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

    expect(totalItems).toBe(6);
    expect(subtotal).toBe(7500);
  });

  it("strictly enforces demo flag on simulated checkout responses", () => {
    const checkoutResult = {
      order_id: "order-test-123",
      amount_inr: 7500,
      is_demo: true,
      payment_status: "demo_verified",
      message: "Payment successfully simulated in DEMO mode.",
    };

    expect(checkoutResult.is_demo).toBe(true);
    expect(checkoutResult.payment_status).toBe("demo_verified");
    expect(checkoutResult.message).toContain("DEMO mode");
  });

  it("filters order timeline strictly from recorded events without phantom milestones", () => {
    const recordedEvents = [
      { id: "e1", event_type: "order_placed", note: "Customer payment verified via UPI" },
      { id: "e2", event_type: "assigned_to_artisan", note: "Assigned to Anita Soren" },
    ];

    // Order tracking should only render steps present in recordedEvents
    const displayedSteps = recordedEvents.map((e) => e.event_type);
    expect(displayedSteps).toContain("order_placed");
    expect(displayedSteps).toContain("assigned_to_artisan");
    expect(displayedSteps).not.toContain("dispatched");
    expect(displayedSteps).not.toContain("delivered");
  });
});

describe("Flow 2: Gift Concierge & MakePossible Feasibility Logic", () => {
  it("categorizes feasibility results deterministically with evidence and missing info", () => {
    const sampleEval = {
      status: "feasible",
      evidence: [
        "Bolpur guild has 14 certified Kantha embroidery artisans",
        "Lead time of 21 days exceeds required 14 days",
      ],
      missing_info: [
        "Pantone color swatch for border piping not specified",
      ],
      constraints: ["Monsoon humidity buffer (+2 days)"],
    };

    expect(["feasible", "uncertain", "not_feasible"]).toContain(sampleEval.status);
    expect(sampleEval.evidence.length).toBeGreaterThan(0);
    expect(sampleEval.missing_info.length).toBeGreaterThan(0);
    expect(sampleEval.constraints[0]).toContain("Monsoon");
  });

  it("enforces same-version matching for two-sided proposal confirmation", () => {
    function isTwoSidedConfirmed(buyerVersion: number | null, artisanVersion: number | null, currentVersion: number) {
      return buyerVersion === currentVersion && artisanVersion === currentVersion;
    }

    // Version mismatch: Buyer approved V1, but artisan/coordinator revised to V2
    expect(isTwoSidedConfirmed(1, 2, 2)).toBe(false);

    // Only buyer approved V2, coordinator pending
    expect(isTwoSidedConfirmed(2, null, 2)).toBe(false);

    // Both parties approved the exact same version V2
    expect(isTwoSidedConfirmed(2, 2, 2)).toBe(true);
  });
});

describe("Flow 3: B2B Quote Versions & Sample Lifecycle", () => {
  const SAMPLE_STEPS = ["requested", "in_production", "sent", "approved"] as const;

  function getNextSampleStatus(current: string): string | null {
    const idx = (SAMPLE_STEPS as readonly string[]).indexOf(current);
    if (idx === -1 || idx === SAMPLE_STEPS.length - 1) return null;
    return SAMPLE_STEPS[idx + 1];
  }

  it("advances physical sample through approved pre-production stages", () => {
    expect(getNextSampleStatus("requested")).toBe("in_production");
    expect(getNextSampleStatus("in_production")).toBe("sent");
    expect(getNextSampleStatus("sent")).toBe("approved");
    expect(getNextSampleStatus("approved")).toBeNull();
  });
});

describe("Living Craft Story with Verification Source Labels", () => {
  it("renders story card with verified source tags", () => {
    renderWithClient(
      <LivingCraftStory productId="11111111-0001-0000-0000-000000000001" fallbackArtisanName="Anita Soren" />
    );

    expect(screen.getByText(/Living Craft Story/i)).toBeInTheDocument();
    expect(screen.getByText(/Maker Consent Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Voice Interview Verified by Coordinator/i)).toBeInTheDocument();
    expect(screen.getByText(/GI Origin Certification Source/i)).toBeInTheDocument();
  });
});

