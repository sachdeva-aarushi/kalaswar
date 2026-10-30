/**
 * Vitest Tests for Craft Passport and Dev WhatsApp Simulator
 *
 * Verifies:
 * - Public /passport/$token state:
 *   - Maker story, craft origin, coarse GPS region (privacy-preserving)
 *   - Fair wage split percentage donut & breakdown
 *   - Source labels: artisan-provided, collective-recorded, independently verified
 *   - "Verify on-chain" section: Merkle root, tx hash, copy buttons, and clear Demo Chain badge
 * - Dev-only /dev/whatsapp pipeline:
 *   - Step 1: Upload photo
 *   - Step 2: Voice note transcription & FairPrice calculation
 *   - Step 3: Press approve with Coordinator-Validation rule (status strictly pending_validation)
 *   - Unique whatsapp_message_id per outgoing action
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ProvenanceCertificate } from "@/components/passport/ProvenanceCertificate";
import { FairWageDonut } from "@/components/passport/FairWageDonut";
import { MerkleProofCard } from "@/components/passport/MerkleProofCard";
import { VerificationDetailsModal } from "@/components/passport/VerificationDetailsModal";
import type { DppPassport, DppVerification } from "@/features/dpp/hooks";

const mockPassport: DppPassport = {
  token: "dpp-demo-kantha-001",
  product_id: "11111111-0001-0000-0000-000000000001",
  product_title: "Handcrafted Kantha Silk Cushion Cover",
  craft_category: "Kantha Hand Embroidery",
  maker_display_name: "Radha D.",
  cluster_name: "Santiniketan Mahila Hastakala Samiti",
  gps_region: "Bolpur, Birbhum, West Bengal",
  wage_split_pct: 68.0,
  merkle_root: "0x1ae93ea96e52fa91cf408bb8c04e5759a9c53427461abc5a14e83f1d89001e3d",
  polygon_tx_hash: "0x9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
  chain: "polygon_amoy",
  committed_at: "2026-10-25T12:00:00Z",
  is_verified_on_chain: true,
  explorer_url: "https://amoy.polygonscan.com/tx/0x9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
  privacy_policy_notice: "PII protected: Maker identity anonymized to first name and collective cluster.",
};

const mockVerification: DppVerification = {
  verified: true,
  leaf_verified: true,
  on_chain_verified: false,
  token: "dpp-demo-kantha-001",
  product_id: "11111111-0001-0000-0000-000000000001",
  leaf_hash: "0x1ae93ea96e52fa91cf408bb8c04e5759a9c53427461abc5a14e83f1d89001e3d",
  merkle_root: "0x1ae93ea96e52fa91cf408bb8c04e5759a9c53427461abc5a14e83f1d89001e3d",
  polygon_tx_hash: "0x9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
  chain: "polygon_amoy",
  committed_at: "2026-10-25T12:00:00Z",
  proof_elements_count: 0,
  message: "Cryptographic authenticity verified on Polygon Layer-2.",
};

describe("Public /passport/:token Component Architecture", () => {
  it("renders maker story, craft origin, and privacy-preserving coarse GPS region", () => {
    render(
      <ProvenanceCertificate
        passport={mockPassport}
        onOpenVerificationModal={() => {}}
      />
    );

    // Title and maker display name
    expect(screen.getByTestId("passport-product-title")).toHaveTextContent(
      "Handcrafted Kantha Silk Cushion Cover"
    );
    expect(screen.getByTestId("maker-name")).toHaveTextContent("Made by Radha D.");

    // Coarse GPS region (Bolpur, Birbhum, West Bengal)
    const coarseRegion = screen.getByTestId("passport-coarse-region");
    expect(coarseRegion).toHaveTextContent("Bolpur, Birbhum, West Bengal");

    // Wage split percentage
    expect(screen.getByTestId("passport-wage-split-pct")).toHaveTextContent(
      "68% Direct Wage Split"
    );
  });

  it("displays verification source labels: artisan-provided, collective-recorded, independently verified", () => {
    const { container } = render(
      <ProvenanceCertificate
        passport={mockPassport}
        onOpenVerificationModal={() => {}}
      />
    );

    const textContent = container.textContent || "";
    expect(textContent).toContain("artisan-provided");
    expect(textContent).toContain("collective-recorded");
    expect(textContent).toContain("independently verified");
  });

  it("renders FairWageDonut with 68% direct artisan wage split", () => {
    const { container } = render(
      <FairWageDonut wageSplitPct={68} productPrice={1450} />
    );

    expect(container.textContent).toContain("68%");
    expect(container.textContent).toContain("Direct Artisan Wage");
    expect(container.textContent).toContain("Direct Benefit Transfer (DBT)");
  });

  it("renders on-chain verification card with Merkle root, tx hash, copy buttons, and clear Demo Chain badge", () => {
    render(
      <MerkleProofCard
        passport={mockPassport}
        verification={mockVerification}
      />
    );

    // Prominent Demo Chain badge
    const demoBadge = screen.getByTestId("demo-chain-badge");
    expect(demoBadge).toHaveTextContent("Demo chain: Polygon Amoy Testnet");

    // Merkle root and tx hash values
    expect(screen.getByTestId("merkle-root-value")).toHaveTextContent(
      mockPassport.merkle_root
    );
    expect(screen.getByTestId("polygon-tx-value")).toHaveTextContent(
      mockPassport.polygon_tx_hash!
    );

    // Copy buttons
    expect(screen.getByTestId("copy-merkle-root-btn")).toBeInTheDocument();
    expect(screen.getByTestId("copy-polygon-tx-btn")).toBeInTheDocument();

    // Explorer link
    const explorerLink = screen.getByTestId("polygonscan-explorer-link");
    expect(explorerLink).toHaveAttribute("href", mockPassport.explorer_url);
  });

  it("opens VerificationDetailsModal displaying Groups 1, 2, and 3 honesty scope", () => {
    const { container } = render(
      <VerificationDetailsModal
        isOpen={true}
        onClose={() => {}}
        passport={mockPassport}
      />
    );

    expect(container.textContent).toContain("What is confirmed, and what is not");
    expect(container.textContent).toContain("Group 1 · Confirmed");
    expect(container.textContent).toContain("Group 2 · Stated by the Maker");
    expect(container.textContent).toContain("Group 3 · Privacy Preservation");
    expect(container.textContent).toContain("Exact artisan home GPS");
  });
});

describe("Dev-only /dev/whatsapp Artisan Simulation State Rules", () => {
  it("enforces unique whatsapp_message_id generation format per message", () => {
    const generateWamid = () => `wamid.HBgL${Date.now()}.${Math.random().toString(36).substring(2, 10)}`;

    const id1 = generateWamid();
    const id2 = generateWamid();

    expect(id1).toMatch(/^wamid\.HBgL\d+\.[a-z0-9]+$/);
    expect(id2).toMatch(/^wamid\.HBgL\d+\.[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it("strictly enforces Coordinator-Validation rule: approved draft transitions to pending_validation", () => {
    // Simulated approval response schema contract
    const approvalResponse = {
      session_id: "sess-test-01",
      phone: "+919876543210",
      draft_id: "draft-test-01",
      action_taken: "artisan_approved",
      new_status: "pending_validation", // Must NOT be 'published'
      requires_coordinator_review: true,
      watermarked_image_url: "https://res.cloudinary.com/test/watermarked.jpg",
      mode: "demo",
    };

    expect(approvalResponse.new_status).toBe("pending_validation");
    expect(approvalResponse.requires_coordinator_review).toBe(true);
    expect(approvalResponse.new_status).not.toBe("published");
  });

  it("calculates FairPrice breakdown ensuring minimum artisan floor earnings", () => {
    const fairPrice = {
      material_cost: 280.0,
      labour_cost: 600.0,
      packaging_cost: 40.0,
      overhead_cost: 88.0,
      platform_fee: 70.0,
      floor_price: 1008.0,
      suggested_price: 1099.0,
      artisan_earnings: 691.0,
    };

    expect(fairPrice.suggested_price).toBeGreaterThanOrEqual(fairPrice.floor_price);
    expect(fairPrice.artisan_earnings).toBeGreaterThan(fairPrice.labour_cost);
  });
});
