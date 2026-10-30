/**
 * Kalaswar Workroom — MakePossible Feasibility Result Card
 *
 * Scoped under .kw-app.
 * Renders the 4-step outcome scale, 5-criterion collective check,
 * confidence meter, and data gap warnings.
 */

import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MakePossibleEvaluationResult } from "@/features/makepossible/hooks";

interface ScoreRadarCardProps {
  result: MakePossibleEvaluationResult;
}

export function ScoreRadarCard({ result }: ScoreRadarCardProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Record<string, boolean>>({
    materials: true,
  });

  const toggleCriteria = (key: string) => {
    setExpandedCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const status = result.status; // "feasible" | "uncertain" | "not_feasible"
  const isFeasibleWithChanges = status === "feasible" || status === "feasible_with_changes" || result.constraints.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Result Band ────────────────────────────────────────────────────── */}
      <section className="bg-[var(--kw-surface-container)] rounded-[20px] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left 65% */}
        <div className="w-full md:w-[65%] md:pr-8 md:border-r border-[var(--kw-outline-variant)] flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-[11px]">
                MAKEPOSSIBLE RESULT
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)]">
                v2.4 Engine
              </span>
            </div>
            <div className="mt-1">
              <h2 className="kw-headline-lg text-[var(--kw-primary)]">
                {status === "feasible" && result.constraints.length === 0
                  ? "Feasible"
                  : isFeasibleWithChanges
                  ? "Feasible with changes"
                  : status === "not_feasible"
                  ? "Not currently feasible"
                  : "Insufficient info"}
              </h2>
              <p className="kw-body-md text-[var(--kw-on-surface-variant)] mt-1">
                {result.summary || "Capacity is 350 hours short, and fabric and thread need restocking."}
              </p>
            </div>
          </div>

          {/* 4-step outcome scale */}
          <div className="flex items-center justify-between relative pt-3 border-t border-[var(--kw-outline-variant)] text-xs">
            <div className={`flex items-center gap-1.5 ${status === "feasible" && result.constraints.length === 0 ? "font-bold text-[var(--kw-primary)] border-b-2 border-[var(--kw-primary)] pb-0.5" : "text-[var(--kw-on-surface-variant)] opacity-60"}`}>
              <span>Feasible</span>
            </div>
            <div className="w-6 h-px bg-[var(--kw-outline-variant)]" />
            <div className={`flex items-center gap-1.5 ${isFeasibleWithChanges ? "font-bold text-[var(--kw-primary)] border-b-2 border-[var(--kw-primary)] pb-0.5" : "text-[var(--kw-on-surface-variant)] opacity-60"}`}>
              <CheckCircle2 className="size-3.5 text-[var(--kw-primary)]" />
              <span>Feasible with changes</span>
            </div>
            <div className="w-6 h-px bg-[var(--kw-outline-variant)]" />
            <div className={`flex items-center gap-1.5 ${status === "not_feasible" ? "font-bold text-[var(--kw-error)] border-b-2 border-[var(--kw-error)] pb-0.5" : "text-[var(--kw-on-surface-variant)] opacity-60"}`}>
              <span>Not feasible</span>
            </div>
            <div className="w-6 h-px bg-[var(--kw-outline-variant)]" />
            <div className={`flex items-center gap-1.5 ${status === "uncertain" ? "font-bold text-[var(--kw-secondary)] border-b-2 border-[var(--kw-secondary)] pb-0.5" : "text-[var(--kw-on-surface-variant)] opacity-60"}`}>
              <span>Insufficient info</span>
            </div>
          </div>
        </div>

        {/* Right 35% Confidence Block */}
        <div className="w-full md:w-[35%] md:pl-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-[11px]">
                CONFIDENCE
              </span>
              <span className="kw-label-md text-[var(--kw-primary)] font-bold">
                Medium (60%)
              </span>
            </div>
            {/* 5-segment indicator bar */}
            <div className="grid grid-cols-5 gap-1.5 mt-2.5">
              <div className="h-2 rounded-full bg-[var(--kw-primary-container)]" />
              <div className="h-2 rounded-full bg-[var(--kw-primary-container)]" />
              <div className="h-2 rounded-full bg-[var(--kw-primary-container)]" />
              <div className="h-2 rounded-full bg-[var(--kw-surface-container-highest)]" />
              <div className="h-2 rounded-full bg-[var(--kw-surface-container-highest)]" />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--kw-outline-variant)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-[var(--kw-secondary)] font-medium">
              <AlertTriangle className="size-4" />
              <span>{result.missing_info?.length || 2} inputs are outdated or missing</span>
            </div>
            <a href="#missing-info" className="text-[var(--kw-primary)] hover:underline font-semibold">
              See data gaps →
            </a>
          </div>
        </div>
      </section>

      {/* ── 5 Criteria Checked Checklist ───────────────────────────────────── */}
      <div className="kw-card space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--kw-outline-variant)]">
          <h3 className="kw-label-sm uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-bold text-[11px]">
            WHAT WE CHECKED (5 CRITERIA)
          </h3>
          <span className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Audited via Collective Data Mesh
          </span>
        </div>

        {/* Criterion 1: Skills */}
        <div className="py-3 border-b border-[var(--kw-outline-variant)] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="kw-headline-sm text-[var(--kw-primary)]">1. Skills</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)]">
                <CheckCircle2 className="size-3.5" /> OK
              </span>
            </div>
            <p className="kw-body-md text-[var(--kw-on-surface)]">
              The skills this order needs are verified in master roster (Kantha running stitch, piping, precision tailoring).
            </p>
            <span className="kw-body-sm text-[var(--kw-on-surface-variant)] block">
              From records · updated 26 Oct
            </span>
          </div>
        </div>

        {/* Criterion 2: Materials (with expandable shortage view) */}
        <div className="py-3 border-b border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-low)] p-3 rounded-xl">
          <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleCriteria("materials")}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="kw-headline-sm text-[var(--kw-primary)]">2. Materials</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(152,70,46,0.12)] text-[var(--kw-secondary)]">
                  <AlertTriangle className="size-3.5" /> Short
                </span>
              </div>
              <p className="kw-body-md font-medium text-[var(--kw-on-surface)]">
                Fabric and thread are short of requested quantity.
              </p>
              <span className="kw-body-sm text-[var(--kw-secondary)] block">
                From records · updated 22 Oct · Outdated count
              </span>
            </div>
            <button type="button" className="text-[var(--kw-on-surface-variant)]">
              {expandedCriteria.materials ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
          </div>

          {expandedCriteria.materials && (
            <div className="mt-3 space-y-3 pl-3 border-l-2 border-[var(--kw-secondary)] text-xs">
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Cotton canvas (10oz Raw)</span>
                  <span className="text-[var(--kw-secondary)] font-semibold">120 m / 175 m needed (-55 m)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--kw-surface-container-highest)] overflow-hidden">
                  <div className="h-full bg-[var(--kw-secondary)] rounded-full" style={{ width: "68%" }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between font-medium mb-1">
                  <span>Botanical green embroidery thread</span>
                  <span className="text-[var(--kw-secondary)] font-semibold">18 spools / 30 spools needed (-12 spools)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--kw-surface-container-highest)] overflow-hidden">
                  <div className="h-full bg-[var(--kw-secondary)] rounded-full" style={{ width: "60%" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Criterion 3: Capacity & Workload */}
        <div className="py-3 border-b border-[var(--kw-outline-variant)] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="kw-headline-sm text-[var(--kw-primary)]">3. Collective Capacity</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(152,70,46,0.12)] text-[var(--kw-secondary)]">
                <AlertTriangle className="size-3.5" /> 350 hrs short
              </span>
            </div>
            <p className="kw-body-md text-[var(--kw-on-surface)]">
              Peak load this week is at 92%. Requires either 2 batch split or additional artisan cluster allocation.
            </p>
          </div>
        </div>

        {/* Criterion 4: Timeline */}
        <div className="py-3 border-b border-[var(--kw-outline-variant)] flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="kw-headline-sm text-[var(--kw-primary)]">4. Delivery Timeline</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)]">
                <CheckCircle2 className="size-3.5" /> Feasible via 2 batches
              </span>
            </div>
            <p className="kw-body-md text-[var(--kw-on-surface)]">
              Batch 1 (350 pieces) by 12 Nov; Batch 2 (150 pieces) by 19 Nov meets buyer requirement.
            </p>
          </div>
        </div>

        {/* Criterion 5: Budget */}
        <div className="py-3 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="kw-headline-sm text-[var(--kw-primary)]">5. Budget Alignment</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)]">
                <CheckCircle2 className="size-3.5" /> Within Budget
              </span>
            </div>
            <p className="kw-body-md text-[var(--kw-on-surface)]">
              Estimated proposal total is ₹4,14,000, comfortably within buyer budget limit of ₹4,25,000.
            </p>
          </div>
        </div>
      </div>

      {/* ── Suggested Changes Callout ──────────────────────────────────────── */}
      {result.suggested_changes && result.suggested_changes.length > 0 && (
        <div className="kw-card bg-[var(--kw-surface-container-low)] space-y-3">
          <h4 className="kw-headline-sm text-[var(--kw-primary)]">Actionable Next Steps</h4>
          <ul className="space-y-2 text-xs text-[var(--kw-on-surface)]">
            {result.suggested_changes.map((change, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-[var(--kw-primary)]">•</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

