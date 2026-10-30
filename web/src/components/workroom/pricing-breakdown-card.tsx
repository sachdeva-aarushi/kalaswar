/**
 * Kalaswar Workroom — Transparent FairPrice Costing Breakdown Card
 *
 * Scoped under .kw-app.
 * Renders transparent cost build-up:
 * Materials + Labour + Packaging + Overhead + Margin + Platform Fee = Selling Price
 * Clearly displays direct artisan earnings and collective share percentage.
 */

import { Info, AlertCircle, CheckCircle2 } from "lucide-react";
import type { FairPriceEstimateResponse } from "@/features/products/hooks";

interface PricingBreakdownCardProps {
  pricing?: FairPriceEstimateResponse | null;
  isLoading?: boolean;
}

export function PricingBreakdownCard({ pricing, isLoading }: PricingBreakdownCardProps) {
  if (isLoading) {
    return (
      <div className="kw-card animate-pulse space-y-4">
        <div className="h-5 bg-[var(--kw-surface-container)] rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-4 bg-[var(--kw-surface-container)] rounded" />
          <div className="h-4 bg-[var(--kw-surface-container)] rounded w-5/6" />
        </div>
      </div>
    );
  }

  // Fallback defaults matching Stitch prototype if estimate not fetched yet
  const materialsCost = pricing?.materials_cost ?? 420;
  const laborCost = pricing?.labour_cost ?? 680;
  const packagingCost = pricing?.packaging_cost ?? 40;
  const overheadCost = pricing?.overhead_cost ?? 114;
  const profitAmount = pricing?.profit_amount ?? 310;
  const suggestedPrice = pricing?.suggested_retail_price ?? 1650;
  const artisanSharePercent = pricing?.artisan_share_percent ?? 60.6;
  const artisanEarnings = pricing?.artisan_earnings ?? (materialsCost + laborCost + profitAmount);

  return (
    <div className="kw-card space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-3">
        <div className="space-y-0.5">
          <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
            FairPrice Costing Build-up
          </span>
          <h3 className="kw-headline-sm text-[var(--kw-primary)]">Cost-Plus Transparency</h3>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[rgba(35,76,61,0.12)] text-[var(--kw-primary-container)] kw-label-sm">
          <CheckCircle2 className="size-3.5" />
          <span>Fair Wage Certified</span>
        </div>
      </div>

      {/* Breakdown rows */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between py-1 text-[var(--kw-on-surface)]">
          <span>Raw Materials & Dyes</span>
          <span className="font-semibold tabular-nums">₹{materialsCost.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between py-1 text-[var(--kw-on-surface)]">
          <span>Artisan Handloom / Embroidery Labour</span>
          <span className="font-semibold tabular-nums">₹{laborCost.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between py-1 text-[var(--kw-on-surface)]">
          <span>Eco-Friendly Packaging & Labelling</span>
          <span className="font-semibold tabular-nums">₹{packagingCost.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between py-1 text-[var(--kw-on-surface-variant)]">
          <span>SHG Overhead (Cluster maintenance & tools)</span>
          <span className="tabular-nums">₹{overheadCost.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between py-1 text-[var(--kw-on-surface-variant)]">
          <span>Collective Margin & Social Security Reserve</span>
          <span className="tabular-nums">₹{profitAmount.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Suggested retail price banner */}
      <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-4 flex items-baseline justify-between border border-[var(--kw-outline-variant)]">
        <div>
          <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
            Suggested Retail Price
          </span>
          <span className="kw-headline-md text-[var(--kw-primary)] tabular-nums font-bold">
            ₹{suggestedPrice.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="text-right">
          <span className="kw-label-sm text-[var(--kw-primary)] block font-semibold">
            {artisanSharePercent.toFixed(1)}% to Collective
          </span>
          <span className="kw-body-sm text-[var(--kw-on-surface-variant)] tabular-nums">
            ₹{artisanEarnings.toLocaleString("en-IN")} direct income
          </span>
        </div>
      </div>

      {/* Warnings & validity */}
      {pricing?.warnings && pricing.warnings.length > 0 && (
        <div className="rounded-lg bg-[rgba(152,70,46,0.08)] p-3 flex items-start gap-2 text-xs text-[var(--kw-secondary)]">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {pricing.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-[var(--kw-on-surface-variant)]">
        <Info className="size-3.5 shrink-0" />
        <span>Price validity guaranteed for 30 days from date of estimation.</span>
      </div>
    </div>
  );
}
