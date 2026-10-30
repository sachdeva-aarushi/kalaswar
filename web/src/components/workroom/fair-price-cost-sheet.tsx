/**
 * FairPrice Cost-Sheet Component
 *
 * Provides a radical transparent cost breakdown for products, proposals, and quotes:
 * - Direct raw materials & natural dyes
 * - Living wage benchmarked artisan hours
 * - Technique preservation / GI complexity premium
 * - SHG collective welfare & quality reserve
 * - Platform & insured logistics fee
 * - Artisan share percentage gauge
 */

import React from "react";
import { ShieldCheck, HeartHandshake, Sparkles, TrendingUp, HelpCircle } from "lucide-react";

export interface FairPriceBreakdown {
  materialsCost?: number;
  labourCost?: number;
  qualityReserve?: number;
  platformLogisticsFee?: number;
  retailPrice?: number;
  artisanSharePercent?: number;
  materialsLines?: Array<{ name: string; cost: number }>;
  labourStages?: Array<{ stage: string; hours: number; rate: number }>;
}

interface FairPriceCostSheetProps {
  price?: number;
  breakdown?: FairPriceBreakdown;
  className?: string;
  showTitle?: boolean;
}

export function FairPriceCostSheet({
  price = 1450,
  breakdown,
  className = "",
  showTitle = true,
}: FairPriceCostSheetProps) {
  const materials = breakdown?.materialsCost ?? Math.round(price * 0.28);
  const labour = breakdown?.labourCost ?? Math.round(price * 0.46);
  const reserve = breakdown?.qualityReserve ?? Math.round(price * 0.12);
  const platformFee = breakdown?.platformLogisticsFee ?? Math.max(0, price - materials - labour - reserve);
  const artisanIncome = labour + Math.round(reserve * 0.5);
  const sharePct = breakdown?.artisanSharePercent ?? Math.round((artisanIncome / price) * 100);

  return (
    <div className={`rounded-xl border border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] p-5 shadow-sm ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-[var(--kw-primary-container)]/10 text-[var(--kw-primary-container)]">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--kw-on-surface)]">FairPrice™ Living Cost Sheet</h3>
              <p className="text-xs text-[var(--kw-on-surface-variant)]">Verified fair trade & living wage cost buildup</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
            <HeartHandshake className="size-3.5" />
            {sharePct}% to Artisan
          </span>
        </div>
      )}

      {/* Share Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-[var(--kw-on-surface)]">Artisan Direct Share</span>
          <span className="text-emerald-700 font-semibold">{sharePct}% (₹{artisanIncome.toLocaleString("en-IN")})</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--kw-surface-container)]">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, sharePct)}%` }}
            role="progressbar"
            aria-valuenow={sharePct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-[var(--kw-outline-variant)]/40">
          <span className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)]">
            <span className="size-2 rounded-full bg-blue-500" />
            Direct Raw Materials & Dyes
          </span>
          <span className="font-medium text-[var(--kw-on-surface)]">₹{materials.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[var(--kw-outline-variant)]/40">
          <span className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)]">
            <span className="size-2 rounded-full bg-emerald-500" />
            Artisan Living Wage (Labor)
          </span>
          <span className="font-medium text-emerald-700">₹{labour.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[var(--kw-outline-variant)]/40">
          <span className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)]">
            <span className="size-2 rounded-full bg-amber-500" />
            SHG Welfare & Quality Reserve
          </span>
          <span className="font-medium text-[var(--kw-on-surface)]">₹{reserve.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-[var(--kw-outline-variant)]/40">
          <span className="flex items-center gap-1.5 text-[var(--kw-on-surface-variant)]">
            <span className="size-2 rounded-full bg-purple-500" />
            Platform & Insured Logistics
          </span>
          <span className="font-medium text-[var(--kw-on-surface)]">₹{platformFee.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Total Box */}
      <div className="mt-4 rounded-lg bg-[var(--kw-surface-container)] p-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--kw-on-surface-variant)]">Total Transparent Price</p>
          <p className="text-xs text-[var(--kw-on-surface-variant)]">Zero hidden intermediary cuts</p>
        </div>
        <p className="font-display text-lg font-bold text-[var(--kw-on-surface)]">
          ₹{price.toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}

