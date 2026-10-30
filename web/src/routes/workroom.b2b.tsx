/**
 * /workroom/b2b — B2B Coordinator Section
 *
 * Scoped under .kw-app.
 * Flow 7: B2B coordinator section:
 * - Quote versions & two-sided approvals
 * - Sample approval workflow
 * - PO micro-factoring & working capital escrow (strictly labelled [DEMO])
 * - RLS enforcement: Coordinators & Admins can progress escrow; Artisans are read-only.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Coins,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useProposalList, useUpdateSampleStatus } from "@/features/proposals/hooks";
import { useFactoringList, useAdvanceFactoringStep, type POFactoringRecord } from "@/features/factoring/hooks";
import { useAuth } from "@/features/auth";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

export const Route = createFileRoute("/workroom/b2b")({
  head: () => ({
    meta: [{ title: "B2B Coordinator & Factoring — Kalaswar Workroom" }],
  }),
  component: WorkroomB2BPage,
});

function WorkroomB2BPage() {
  const { user } = useAuth();
  const isArtisan = user?.role === "artisan";

  const { data: proposals, isLoading: isProposalsLoading } = useProposalList();
  const { data: rawFactoringList, isLoading: isFactoringLoading, refetch: refetchFactoring } = useFactoringList();
  const advanceStep = useAdvanceFactoringStep();
  const updateSample = useUpdateSampleStatus();

  const [activeTab, setActiveTab] = useState<"factoring" | "quotes" | "samples">("factoring");
  const [actionError, setActionError] = useState<string | null>(null);

  // Fallback demo factoring records if backend list is empty
  const factoringList: POFactoringRecord[] = rawFactoringList && rawFactoringList.length > 0
    ? rawFactoringList
    : [
        {
          id: "fac-demo-001",
          po_number: "PO-FAB-2026-8941",
          buyer_id: "buyer-fabindia",
          buyer_name: "FabIndia Corporate Sourcing",
          shg_id: "shg-santiniketan",
          shg_name: "Santiniketan Mahila Samiti",
          total_order_value_inr: 145000,
          advance_amount_inr: 116000,
          escrow_balance_inr: 116000,
          status: "tokenized",
          token_id: "VOUCHER-L2-0041",
          blockchain_tx_hash: "0x8f2d...3c1b",
          created_at: "2026-10-25T10:00:00Z",
          updated_at: "2026-10-28T14:30:00Z",
          ledger_entries: [
            {
              id: "leg-1",
              step: "po_created",
              description: "Corporate PO verified & approved by coordinator",
              amount_inr: 145000,
              timestamp: "2026-10-25T10:00:00Z",
            },
            {
              id: "leg-2",
              step: "tokenized",
              description: "Locked into simulated Layer-2 factoring escrow",
              amount_inr: 116000,
              timestamp: "2026-10-26T12:00:00Z",
              tx_hash: "0x8f2d...3c1b",
            },
          ],
        },
      ];

  const handleAdvanceStep = async (record: POFactoringRecord) => {
    setActionError(null);
    let nextStep: "tokenize" | "disburse-advance" | "deliver" | "release-escrow" = "tokenize";
    if (record.status === "po_created") nextStep = "tokenize";
    else if (record.status === "tokenized") nextStep = "disburse-advance";
    else if (record.status === "advance_disbursed") nextStep = "deliver";
    else if (record.status === "delivered") nextStep = "release-escrow";

    try {
      await advanceStep.mutateAsync({ id: record.id, step: nextStep });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to transition factoring state.";
      setActionError(msg);
    }
  };

  const handleAdvanceSample = async (proposalId: string, sampleId: string, currentStatus: string) => {
    setActionError(null);
    const nextStatus = currentStatus === "requested" ? "in_production" : currentStatus === "in_production" ? "sent" : "approved";
    try {
      await updateSample.mutateAsync({
        proposalId,
        sampleId,
        new_status: nextStatus,
        feedback: "Physical sample verified by SHG coordinator.",
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to update sample status.";
      setActionError(msg);
    }
  };

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">B2B Coordinator Desk</h1>
            <span className="kw-badge kw-badge-primary">B2B Commercials</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
              [DEMO] Simulated Escrow
            </span>
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
            Quote versions, pre-production sample approvals, and working capital PO micro-factoring.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {isArtisan && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          <ShieldAlert className="size-4 shrink-0 text-amber-600" />
          <span>
            <strong>Artisan View:</strong> Financial factoring operations and quote commitments are coordinator actions.
          </span>
        </div>
      )}

      {/* ── Tabs: PO Factoring vs Quotes vs Samples ──────────────────────── */}
      <div className="flex items-center gap-6 border-b border-[var(--kw-outline-variant)] pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("factoring")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "factoring"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <Coins className="size-4" />
          <span>PO Micro-Factoring (Demo)</span>
          <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
            {factoringList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quotes")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "quotes"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <FileText className="size-4" />
          <span>Quote Versions</span>
          {proposals && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {proposals.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("samples")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "samples"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <Sparkles className="size-4" />
          <span>Sample Approvals</span>
        </button>
      </div>

      {/* ── Tab Content: Factoring & Escrow ──────────────────────────────── */}
      {activeTab === "factoring" && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <Coins className="size-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">[DEMO] Simulated Working Capital Escrow</span>
              <span>
                PO Factoring allows the SHG collective to unlock 80% upfront working capital against corporate purchase orders. All Layer-2 mints and balance releases are simulated for demonstration purposes.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {factoringList.map((rec) => {
              const statusPills: Record<string, { label: string; color: string }> = {
                po_created: { label: "PO Created", color: "bg-blue-100 text-blue-800" },
                tokenized: { label: "Tokenized in Escrow", color: "bg-purple-100 text-purple-800" },
                advance_disbursed: { label: "80% Advance Disbursed", color: "bg-emerald-100 text-emerald-800" },
                delivered: { label: "Goods Delivered", color: "bg-cyan-100 text-cyan-800" },
                escrow_released: { label: "Escrow Released (100%)", color: "bg-green-100 text-green-800" },
              };
              const currentStatusInfo = statusPills[rec.status] || { label: rec.status, color: "bg-neutral-100 text-neutral-800" };
              const poNumber = rec.po_reference || rec.po_number || "PO-DEMO";
              const totalAmount = rec.total_order_value_inr ?? rec.po_amount_inr ?? 0;
              const advanceAmount = rec.advance_amount_inr ?? Math.round(totalAmount * 0.8);

              return (
                <div key={rec.id} className="kw-card p-5 space-y-4 border border-[var(--kw-outline-variant)]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--kw-outline-variant)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[var(--kw-primary)]">{poNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${currentStatusInfo.color}`}>
                          {currentStatusInfo.label}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground bg-[var(--kw-surface-container)] px-1.5 py-0.5 rounded">
                          {rec.token_id || "VOUCHER-DEMO"}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--kw-on-surface-variant)] mt-0.5">
                        Client: {rec.buyer_name || "FabIndia Sourcing"} · Cluster: {rec.shg_name || "Santiniketan Collective"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-[var(--kw-on-surface-variant)] block">Total PO Value</span>
                      <span className="font-bold text-base text-[var(--kw-primary)]">
                        ₹{totalAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Escrow Progress Stepper */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-[var(--kw-surface-container-low)]">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">1. Verified PO</span>
                      <span className="font-semibold text-emerald-700">₹{totalAmount.toLocaleString("en-IN")} ✓</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--kw-surface-container-low)]">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">2. Escrow Lock</span>
                      <span className="font-semibold text-purple-700">{rec.blockchain_tx_hash || "Simulated L2"}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--kw-surface-container-low)]">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">3. 80% Advance</span>
                      <span className="font-semibold text-emerald-700">₹{advanceAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--kw-surface-container-low)]">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">4. Final Settlement</span>
                      <span className="font-semibold text-[var(--kw-primary)]">Remaining 20% on Delivery</span>
                    </div>
                  </div>

                  {/* Actions & Ledger */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] text-[var(--kw-on-surface-variant)]">
                      Simulated State Transition: Advances the PO voucher on simulated Layer-2 escrow.
                    </span>

                    {rec.status !== "escrow_released" ? (
                      <button
                        type="button"
                        disabled={isArtisan || advanceStep.isPending}
                        onClick={() => void handleAdvanceStep(rec)}
                        className={`kw-btn h-9 px-3 text-xs inline-flex items-center gap-1.5 ${
                          isArtisan
                            ? "kw-btn-secondary opacity-50 cursor-not-allowed"
                            : "kw-btn-primary shadow-xs"
                        }`}
                        title={isArtisan ? "Requires Coordinator or Admin role" : "Advance factoring lifecycle step"}
                      >
                        <RefreshCw className={`size-3.5 ${advanceStep.isPending ? "animate-spin" : ""}`} />
                        <span>
                          {rec.status === "po_created"
                            ? "Mint Token & Lock Escrow"
                            : rec.status === "tokenized"
                            ? "Disburse 80% Advance (Demo)"
                            : rec.status === "advance_disbursed"
                            ? "Mark Goods Delivered"
                            : "Release Escrow Balance"}
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="size-4" /> Escrow 100% Settled
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab Content: Quote Versions ──────────────────────────────────── */}
      {activeTab === "quotes" && (
        <div className="space-y-4">
          {!proposals?.length ? (
            <KwEmptyState
              title="No quotes drafted yet"
              description="B2B quotes drafted from incoming bespoke buyer requests will appear here."
            />
          ) : (
            <div className="kw-card p-0 overflow-x-auto">
              <table className="kw-table">
                <thead>
                  <tr>
                    <th>Quote / Project</th>
                    <th>Current Version</th>
                    <th>Quantity</th>
                    <th>Total Quote (₹)</th>
                    <th>Two-Sided Approvals</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((prop) => (
                    <tr key={prop.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                      <td>
                        <span className="kw-body-md font-semibold text-[var(--kw-primary)] block">
                          {prop.title}
                        </span>
                        <span className="text-[11px] text-[var(--kw-on-surface-variant)]">
                          ID: {prop.id.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <span className="kw-badge kw-badge-primary">
                          V{prop.current_version} ({prop.versions.length} edits)
                        </span>
                      </td>
                      <td className="kw-body-sm">{prop.current_spec.quantity} units</td>
                      <td className="kw-body-md font-semibold tabular-nums">
                        ₹{prop.current_spec.total_price_inr.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${prop.both_parties_approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {prop.both_parties_approved ? "Both Approved ✓" : "Pending Approval"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Link
                          to="/workroom/requests/$id/proposal"
                          params={{ id: prop.id }}
                          className="kw-btn kw-btn-secondary h-8 text-xs inline-flex items-center gap-1"
                        >
                          <span>Open Sheet</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Sample Approvals ────────────────────────────────── */}
      {activeTab === "samples" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="kw-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[var(--kw-primary)]">Pre-Production Sample #SMP-042</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  In Production
                </span>
              </div>
              <p className="text-xs text-[var(--kw-on-surface-variant)]">
                Sample: Kantha Pastel Cushion (1 unit) with custom corner FabIndia label.
              </p>
              <div className="rounded-lg p-2.5 bg-[var(--kw-surface-container-low)] text-xs flex justify-between">
                <span>Sample Fee: ₹1,200</span>
                <span className="text-emerald-700 font-semibold">Buyer Approved Spec</span>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isArtisan}
                  onClick={() => handleAdvanceSample("prop-1", "smp-1", "in_production")}
                  className="kw-btn kw-btn-primary h-8 text-xs"
                >
                  Mark Sample Dispatched
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

