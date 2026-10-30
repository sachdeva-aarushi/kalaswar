/**
 * /gift (index) — Gift Concierge with MakePossible & Two-Sided Proposal Approval
 *
 * Scoped under .kw-app styling tokens.
 * Flow 2:
 * 1. Guided intake (occasion, craft, quantity, budget, personalisation)
 * 2. Editable structured request specification
 * 3. MakePossible feasibility evaluation (feasible / uncertain / not feasible, with evidence and missing info)
 * 4. Proposal review with version history and same-version two-sided approval
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Gift,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Coins,
  History,
  FileCheck2,
  ArrowRight,
  RotateCcw,
  Sliders,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import {
  useEvaluateFeasibility,
  type MakePossibleEvaluationResult,
} from "@/features/makepossible/hooks";
import {
  useCreateProposal,
  useProposalDetail,
  useApproveProposal,
  useReviseProposal,
  useDeclineProposal,
  type ProposalResponse,
} from "@/features/proposals/hooks";
import { FairPriceCostSheet } from "@/components/workroom/fair-price-cost-sheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/gift/")({
  head: () => ({ meta: [{ title: "Gift Concierge & Bespoke Commissions — Kalaswar" }] }),
  component: GiftConciergePage,
});

type ConciergeStep = "intake" | "structured" | "makepossible" | "proposal";

const OCCASIONS = [
  "Wedding Heritage Keepsake",
  "Corporate Milestone Sourcing",
  "Festive & Diwali Hamper",
  "Family Heirloom Gift",
  "Artisan Bespoke Commission",
] as const;

const CRAFTS = [
  { name: "Kantha Silk Hand-Embroidery", category: "Textiles & Apparel", cluster: "Bolpur Guild, West Bengal" },
  { name: "Warli Tribal Canvas Painting", category: "Paintings & Folk Art", cluster: "Dahanu Tribal Collective, Maharashtra" },
  { name: "Sikki Golden Grass Weaving", category: "Natural Fiber Crafts", cluster: "Madhubani Craft Guild, Bihar" },
  { name: "Bankura Terracotta Temple Filigree", category: "Pottery & Terracotta", cluster: "Panchmura Village, West Bengal" },
] as const;

function GiftConciergePage() {
  const [currentStep, setCurrentStep] = useState<ConciergeStep>("intake");

  // Step 1: Intake inputs
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0]);
  const [selectedCraftIndex, setSelectedCraftIndex] = useState(0);
  const [quantity, setQuantity] = useState(25);
  const [unitBudget, setUnitBudget] = useState(1450);
  const [deadlineDays, setDeadlineDays] = useState(21);
  const [personalisation, setPersonalisation] = useState("Custom monogram of couple initials hand-stitched in gold thread");

  // Step 2: Editable Structured Request Spec
  const [specTitle, setSpecTitle] = useState("Wedding Keepsake Kantha Cushion Covers");
  const [specCategory, setSpecCategory] = useState("Textiles & Apparel");
  const [specMaterials, setSpecMaterials] = useState("Pure Murshidabad Mulberry Silk, natural lac dye threads");

  // Step 3: MakePossible Evaluation Result
  const [evalResult, setEvalResult] = useState<MakePossibleEvaluationResult | null>(null);

  // Step 4: Active Proposal ID & Data
  const [activeProposalId, setActiveProposalId] = useState<string>("66666666-0001-0000-0000-000000000001");
  const [customProposalIdInput, setCustomProposalIdInput] = useState("");
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);

  // Modals for revision and decline
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [revisedUnitPrice, setRevisedUnitPrice] = useState(1500);

  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Mutations & Queries
  const evaluateEngine = useEvaluateFeasibility();
  const createProposal = useCreateProposal();
  const approveProposal = useApproveProposal();
  const reviseProposal = useReviseProposal();
  const declineProposal = useDeclineProposal();

  const { data: proposal, isLoading: isProposalLoading, refetch: refetchProposal } = useProposalDetail(activeProposalId);

  // Handlers
  const handleIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const craft = CRAFTS[selectedCraftIndex];
    setSpecTitle(`${occasion} — ${craft.name}`);
    setSpecCategory(craft.category);
    setCurrentStep("structured");
  };

  const handleEvaluate = async () => {
    try {
      const res = await evaluateEngine.mutateAsync({
        request: {
          quantity: Number(quantity),
          craft_preference: CRAFTS[selectedCraftIndex].name,
          category: specCategory,
          materials: specMaterials,
          budget_inr_per_unit: Number(unitBudget),
          budget_inr_total: Number(quantity) * Number(unitBudget),
          deadline_in_days: Number(deadlineDays),
          customisation_notes: personalisation,
        },
        inventory_freshness_threshold_days: 60,
      });
      setEvalResult(res);
      setCurrentStep("makepossible");
    } catch (err) {
      console.error("Evaluation failed", err);
    }
  };

  const handleCreateProposalFromSpec = async () => {
    try {
      const res = await createProposal.mutateAsync({
        title: specTitle,
        spec: {
          title: specTitle,
          craft: CRAFTS[selectedCraftIndex].name,
          quantity: Number(quantity),
          unit_price_inr: Number(unitBudget),
          total_price_inr: Number(quantity) * Number(unitBudget),
          timeline_days: Number(deadlineDays),
          materials_summary: specMaterials,
          delivery_terms: "Direct dispatch from collective workshop with tamper-evident GI seal.",
          cancellation_terms: "100% advance refunded if sample disapproved; 50% once raw silk warp is drawn.",
          customisation_details: personalisation,
        },
      });
      setActiveProposalId(res.id);
      setCurrentStep("proposal");
    } catch (err) {
      console.error("Proposal creation failed", err);
    }
  };

  const handleBuyerApprove = async () => {
    if (!proposal) return;
    const v = selectedVersionNum ?? proposal.current_version;
    await approveProposal.mutateAsync({
      id: proposal.id,
      payload: {
        version: v,
        approver_role: "buyer",
        approver_name: "Commissioning Client",
        notes: "Approved proposal specification and unit pricing.",
      },
    });
    void refetchProposal();
  };

  const handleConfirmRevise = async () => {
    if (!proposal || !revisionReason.trim()) return;
    const currentSpec = proposal.current_spec;
    await reviseProposal.mutateAsync({
      id: proposal.id,
      payload: {
        reason_for_revision: revisionReason.trim(),
        new_spec: {
          ...currentSpec,
          unit_price_inr: Number(revisedUnitPrice),
          total_price_inr: Number(revisedUnitPrice) * currentSpec.quantity,
          customisation_details: `${currentSpec.customisation_details || ""} [Revision: ${revisionReason.trim()}]`,
        },
      },
    });
    setRevisionModalOpen(false);
    setRevisionReason("");
    void refetchProposal();
  };

  const handleConfirmDecline = async () => {
    if (!proposal || !declineReason.trim()) return;
    await declineProposal.mutateAsync({
      id: proposal.id,
      reason: declineReason.trim(),
    });
    setDeclineModalOpen(false);
    setDeclineReason("");
    void refetchProposal();
  };

  return (
    <div className="space-y-[var(--kw-space-xl)] max-w-6xl mx-auto px-2 sm:px-4">
      {/* ── Top Stepper Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="kw-badge kw-badge-primary">Bespoke Concierge</span>
            <span className="text-xs text-[var(--kw-on-surface-variant)]">Deterministic Feasibility Engine</span>
          </div>
          <h1 className="kw-headline-xl text-[var(--kw-on-surface)] mt-1">Commission a Bespoke Gift</h1>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: "intake", label: "1. Guided Intake" },
            { id: "structured", label: "2. Structured Spec" },
            { id: "makepossible", label: "3. MakePossible" },
            { id: "proposal", label: "4. Proposal Review" },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentStep(s.id as ConciergeStep)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                currentStep === s.id
                  ? "bg-[var(--kw-primary)] text-white font-bold"
                  : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container-high)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── STAGE 1: GUIDED INTAKE ────────────────────────────────────────── */}
      {currentStep === "intake" && (
        <form onSubmit={handleIntakeSubmit} className="space-y-6">
          <div className="kw-card p-6 space-y-6 border border-[var(--kw-outline-variant)]">
            <div>
              <h2 className="kw-headline-sm text-[var(--kw-on-surface)] font-bold">1. Select Occasion & Craft Preference</h2>
              <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
                Tell us about your celebration. We match requests against verified artisan guilds.
              </p>
            </div>

            {/* Occasion Selection */}
            <div>
              <label className="block text-xs font-bold text-[var(--kw-on-surface)] uppercase tracking-wide mb-2">
                Occasion / Celebration
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasion(occ)}
                    className={`p-3 rounded-xl border text-left text-xs font-semibold transition-colors flex items-center justify-between ${
                      occasion === occ
                        ? "border-[var(--kw-primary)] bg-[var(--kw-surface-container)] text-[var(--kw-primary)] ring-1 ring-[var(--kw-primary)]"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container-low)]"
                    }`}
                  >
                    <span>{occ}</span>
                    {occasion === occ && <Check className="size-4 shrink-0 text-[var(--kw-primary)]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Craft Guild Selection */}
            <div>
              <label className="block text-xs font-bold text-[var(--kw-on-surface)] uppercase tracking-wide mb-2">
                Craft Heritage & Artisan Guild
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRAFTS.map((craft, idx) => (
                  <button
                    key={craft.name}
                    type="button"
                    onClick={() => setSelectedCraftIndex(idx)}
                    className={`p-4 rounded-xl border text-left transition-colors ${
                      selectedCraftIndex === idx
                        ? "border-[var(--kw-primary)] bg-[var(--kw-surface-container)] ring-1 ring-[var(--kw-primary)]"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] hover:bg-[var(--kw-surface-container-low)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--kw-on-surface)]">{craft.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border text-muted-foreground font-semibold">
                        {craft.category}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--kw-on-surface-variant)] mt-1">
                      Origin: {craft.cluster}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity, Budget & Deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--kw-outline-variant)]">
              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Quantity (Units)
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:ring-2 focus:ring-[var(--kw-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Target Budget / Unit (₹)
                </label>
                <input
                  type="number"
                  min={100}
                  value={unitBudget}
                  onChange={(e) => setUnitBudget(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:ring-2 focus:ring-[var(--kw-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Required Timeline (Days)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:ring-2 focus:ring-[var(--kw-primary)]"
                />
              </div>
            </div>

            {/* Customisation Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                Personalisation & Dimension Requirements
              </label>
              <textarea
                rows={2}
                value={personalisation}
                onChange={(e) => setPersonalisation(e.target.value)}
                placeholder="Specific embroidery motifs, initials, colors, custom box packaging…"
                className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm focus:ring-2 focus:ring-[var(--kw-primary)]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="kw-btn kw-btn-primary h-11 px-6 text-xs gap-1.5">
              <span>Generate Structured Specification</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </form>
      )}

      {/* ── STAGE 2: EDITABLE STRUCTURED REQUEST ──────────────────────────── */}
      {currentStep === "structured" && (
        <div className="space-y-6">
          <div className="kw-card p-6 space-y-6 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-3">
              <div>
                <h2 className="kw-headline-sm text-[var(--kw-on-surface)] font-bold">2. Review & Edit Structured Request</h2>
                <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
                  Verify the parameters before triggering the MakePossible feasibility evaluation engine.
                </p>
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                Editable Specification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Commission Title
                </label>
                <input
                  type="text"
                  value={specTitle}
                  onChange={(e) => setSpecTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Craft Category
                </label>
                <input
                  type="text"
                  value={specCategory}
                  onChange={(e) => setSpecCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Materials Specification
                </label>
                <input
                  type="text"
                  value={specMaterials}
                  onChange={(e) => setSpecMaterials(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--kw-on-surface)] mb-1">
                  Target Unit Price (₹)
                </label>
                <input
                  type="number"
                  value={unitBudget}
                  onChange={(e) => setUnitBudget(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[var(--kw-surface-container-low)] flex items-center justify-between text-xs">
              <span>Estimated Commission Budget:</span>
              <span className="font-bold text-base text-[var(--kw-primary)]">
                ₹{(Number(quantity) * Number(unitBudget)).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("intake")}
              className="text-xs"
            >
              ← Back to Intake
            </Button>

            <Button
              onClick={handleEvaluate}
              disabled={evaluateEngine.isPending}
              className="kw-btn kw-btn-primary h-11 px-6 text-xs gap-1.5"
            >
              {evaluateEngine.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Evaluating Feasibility…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Run MakePossible™ Feasibility Check</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STAGE 3: MAKEPOSSIBLE RESULT ──────────────────────────────────── */}
      {currentStep === "makepossible" && evalResult && (
        <div className="space-y-6">
          <div className="kw-card p-6 space-y-6 border border-[var(--kw-outline-variant)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--kw-outline-variant)] pb-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
                  MakePossible Feasibility Verdict
                </span>
                <h2 className="kw-headline-md text-xl font-bold text-[var(--kw-on-surface)] mt-1">
                  {specTitle}
                </h2>
              </div>

              {/* Status Badge */}
              <div>
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    evalResult.status === "feasible"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : evalResult.status === "uncertain"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }`}
                >
                  {evalResult.status === "feasible" ? (
                    <CheckCircle2 className="size-4 text-emerald-700" />
                  ) : evalResult.status === "uncertain" ? (
                    <AlertTriangle className="size-4 text-amber-700" />
                  ) : (
                    <XCircle className="size-4 text-red-700" />
                  )}
                  <span>Status: {evalResult.status.replace("_", " ")}</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--kw-on-surface-variant)] leading-relaxed">
              {evalResult.summary}
            </p>

            {/* Evidence & Missing Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Evidence */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-700" />
                  <span>Verified Capability Evidence</span>
                </span>
                <ul className="text-xs text-emerald-800 space-y-1.5 list-disc pl-4">
                  {evalResult.evidence.length > 0 ? (
                    evalResult.evidence.map((ev, i) => <li key={i}>{ev}</li>)
                  ) : (
                    <li>Collective skills matched based on catalog history.</li>
                  )}
                </ul>
              </div>

              {/* Missing Info / Operational Checks */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="size-4 text-amber-700" />
                  <span>Missing Inputs & Audit Points</span>
                </span>
                <ul className="text-xs text-amber-800 space-y-1.5 list-disc pl-4">
                  {evalResult.missing_info.length > 0 ? (
                    evalResult.missing_info.map((m, i) => <li key={i}>{m}</li>)
                  ) : (
                    <li>No blocking operational gaps identified.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Constraints & Suggestions */}
            {(evalResult.constraints.length > 0 || evalResult.suggested_changes.length > 0) && (
              <div className="p-4 rounded-xl bg-[var(--kw-surface-container-low)] space-y-2 text-xs">
                <span className="font-bold text-[var(--kw-on-surface)] block">
                  Coordinator Recommendations & Buffer Assumptions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--kw-on-surface-variant)]">
                  {evalResult.constraints.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <Clock className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                  {evalResult.suggested_changes.map((sc, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-blue-700 font-medium">
                      <Sparkles className="size-3.5 shrink-0 mt-0.5" />
                      <span>{sc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("structured")}
              className="text-xs"
            >
              ← Edit Specification
            </Button>

            <Button
              onClick={handleCreateProposalFromSpec}
              disabled={createProposal.isPending}
              className="kw-btn kw-btn-primary h-11 px-6 text-xs gap-1.5"
            >
              {createProposal.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Issuing Proposal…</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Issue Formal Proposal with Two-Sided Approval</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── STAGE 4: PROPOSAL REVIEW & SAME-VERSION TWO-SIDED APPROVAL ─────── */}
      {currentStep === "proposal" && (
        <div className="space-y-6">
          {/* Proposal Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[var(--kw-surface-container)] border border-[var(--kw-outline-variant)]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">Proposal ID:</span>
              <span className="font-mono text-xs font-bold text-[var(--kw-primary)]">
                {activeProposalId.slice(0, 18)}…
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Load Proposal UUID…"
                value={customProposalIdInput}
                onChange={(e) => setCustomProposalIdInput(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-xs font-mono"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  if (customProposalIdInput.trim()) {
                    setActiveProposalId(customProposalIdInput.trim());
                  }
                }}
              >
                Load
              </Button>
            </div>
          </div>

          {isProposalLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading proposal details…
            </div>
          ) : !proposal ? (
            <div className="p-8 text-center bg-card border rounded-xl space-y-2">
              <p className="text-sm font-semibold text-foreground">Proposal not found</p>
              <p className="text-xs text-muted-foreground">Try generating a new request from step 1 or loading the seeded demo ID.</p>
              <Button
                size="sm"
                onClick={() => setActiveProposalId("66666666-0001-0000-0000-000000000001")}
                className="text-xs mt-2"
              >
                Load Seeded Demo Proposal
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Proposal Header & Same-Version Two-Sided Approval Status */}
              <div className="kw-card p-6 space-y-5 border border-[var(--kw-outline-variant)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="kw-badge kw-badge-primary">Version {proposal.current_version}</span>
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(proposal.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h2 className="kw-headline-md text-xl font-bold text-[var(--kw-on-surface)] mt-1">
                      {proposal.title}
                    </h2>
                  </div>

                  {/* Two-Sided Approval Status Banner */}
                  <div className="p-3 rounded-xl border flex items-center gap-3 text-xs bg-[var(--kw-surface-container-low)]">
                    <div className="text-right">
                      <span className="block text-[10px] text-muted-foreground font-bold uppercase">
                        Two-Sided Approval State
                      </span>
                      <span className={`font-bold ${proposal.both_parties_approved ? "text-emerald-700" : "text-amber-700"}`}>
                        {proposal.both_parties_approved ? "Both Parties Approved V" + proposal.current_version + " ✓" : "Pending Mutual Approval"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`size-3 rounded-full ${proposal.both_parties_approved ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-amber-400"}`}
                        title="Two-sided lock status"
                      />
                    </div>
                  </div>
                </div>

                {/* Version History Selector */}
                <div>
                  <span className="text-xs font-bold text-[var(--kw-on-surface)] block mb-2 flex items-center gap-1.5">
                    <History className="size-3.5" />
                    <span>Version History & Audit Log:</span>
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {proposal.versions.map((v) => (
                      <button
                        key={v.version}
                        type="button"
                        onClick={() => setSelectedVersionNum(v.version)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          (selectedVersionNum ?? proposal.current_version) === v.version
                            ? "bg-[var(--kw-primary)] text-white shadow-xs"
                            : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container-high)]"
                        }`}
                      >
                        <span>V{v.version}</span>
                        {v.status === "confirmed" && <Check className="size-3" />}
                        {v.status === "superseded" && <span className="text-[10px] opacity-70">(superseded)</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Version Spec Grid */}
                {(() => {
                  const activeVersion = proposal.versions.find(
                    (v) => v.version === (selectedVersionNum ?? proposal.current_version),
                  ) || proposal.versions[0];
                  const spec = activeVersion.spec;

                  return (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
                          <span className="text-[10px] text-muted-foreground block font-bold">Quantity</span>
                          <span className="font-bold text-sm text-[var(--kw-on-surface)]">{spec.quantity} units</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
                          <span className="text-[10px] text-muted-foreground block font-bold">Unit Price</span>
                          <span className="font-bold text-sm text-[var(--kw-primary)]">₹{spec.unit_price_inr.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
                          <span className="text-[10px] text-muted-foreground block font-bold">Total Quote</span>
                          <span className="font-bold text-sm text-[var(--kw-primary)]">₹{spec.total_price_inr.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
                          <span className="text-[10px] text-muted-foreground block font-bold">Lead Time</span>
                          <span className="font-bold text-sm text-[var(--kw-on-surface)]">{spec.timeline_days} Days</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-[var(--kw-outline-variant)] text-xs space-y-1">
                        <span className="font-bold text-[var(--kw-on-surface)]">Materials & Craft Terms:</span>
                        <p className="text-[var(--kw-on-surface-variant)]">{spec.materials_summary}</p>
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Delivery: {spec.delivery_terms} · Terms: {spec.cancellation_terms}
                        </p>
                      </div>

                      {/* Embedded FairPrice Cost Sheet */}
                      <FairPriceCostSheet price={spec.unit_price_inr} showTitle={true} />

                      {/* Approval Action Controls */}
                      <div className="pt-4 border-t border-[var(--kw-outline-variant)] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDeclineModalOpen(true)}
                            className="px-3 py-2 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                          >
                            Decline Proposal
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRevisedUnitPrice(spec.unit_price_inr);
                              setRevisionModalOpen(true);
                            }}
                            className="px-3 py-2 rounded-lg text-xs font-semibold text-[var(--kw-on-surface)] bg-[var(--kw-surface-container)] hover:bg-[var(--kw-surface-container-high)]"
                          >
                            Request Revision
                          </button>
                        </div>

                        <div>
                          <Button
                            onClick={handleBuyerApprove}
                            disabled={approveProposal.isPending}
                            className="kw-btn kw-btn-primary h-10 px-5 text-xs gap-1.5"
                          >
                            {approveProposal.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                            <span>Approve V{activeVersion.version} (Client Confirmation)</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REVISION MODAL ────────────────────────────────────────────────── */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--kw-surface)] border border-[var(--kw-outline-variant)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-[var(--kw-on-surface)]">Request Proposal Revision</h3>
            <p className="text-xs text-[var(--kw-on-surface-variant)]">
              Specify your proposed adjustments. This increments the proposal specification version.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1">Proposed Unit Price (₹)</label>
              <input
                type="number"
                value={revisedUnitPrice}
                onChange={(e) => setRevisedUnitPrice(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Reason for Revision *</label>
              <textarea
                rows={3}
                required
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                placeholder="e.g. Budget ceiling ₹1,350 per unit or adjust border stitch motif"
                className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setRevisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!revisionReason.trim() || reviseProposal.isPending}
                onClick={handleConfirmRevise}
                className="kw-btn kw-btn-primary"
              >
                Submit Revision
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DECLINE MODAL ─────────────────────────────────────────────────── */}
      {declineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--kw-surface)] border border-[var(--kw-outline-variant)] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-red-700">Decline Proposal</h3>
            <p className="text-xs text-[var(--kw-on-surface-variant)]">
              Please let the artisan collective coordinator know why this proposal is declined.
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1">Decline Reason *</label>
              <textarea
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Project timeline changed, chosen alternative craft…"
                className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeclineModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!declineReason.trim() || declineProposal.isPending}
                onClick={handleConfirmDecline}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
