import React from "react";
import { Coins, HeartHandshake, ShieldCheck } from "lucide-react";

interface FairWageDonutProps {
  wageSplitPct: number;
  productPrice?: number;
}

export function FairWageDonut({ wageSplitPct, productPrice }: FairWageDonutProps) {
  const artisanShare = Math.round(wageSplitPct);
  const materialShare = Math.round((100 - artisanShare) * 0.55);
  const logisticsShare = 100 - artisanShare - materialShare;

  const artisanAmount = productPrice ? Math.round((productPrice * artisanShare) / 100) : null;

  return (
    <div className="rounded-[var(--kw-radius-lg)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-lowest)] p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="size-5 text-[var(--kw-tertiary-container)]" aria-hidden="true" />
          <span className="kw-label-eyebrow uppercase text-[var(--kw-tertiary-container)] tracking-wider font-semibold">
            Fair Wage Split
          </span>
        </div>
        <span className="kw-label-caption px-2 py-0.5 rounded-full bg-[var(--kw-primary-fixed)] text-[var(--kw-on-primary-fixed)] font-medium">
          Independently Verified
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Visual Progress Dial / Gauge */}
        <div className="relative size-28 shrink-0 flex items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              className="text-[var(--kw-surface-container-highest)]"
              strokeWidth="3.8"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Direct artisan share */}
            <path
              className="text-[var(--kw-primary-container)]"
              strokeDasharray={`${artisanShare}, 100`}
              strokeWidth="3.8"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="kw-headline-md font-bold text-[var(--kw-primary-container)] leading-none tabular-nums">
              {artisanShare}%
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--kw-on-surface-variant)] mt-0.5">
              Maker Share
            </span>
          </div>
        </div>

        {/* Breakdown details */}
        <div className="w-full space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[var(--kw-on-surface)] font-medium">
              <span className="size-2.5 rounded-full bg-[var(--kw-primary-container)]" />
              Direct Artisan Wage &amp; SHG Fund
            </span>
            <span className="font-semibold text-[var(--kw-on-surface)] tabular-nums">
              {artisanShare}% {artisanAmount ? `(₹${artisanAmount.toLocaleString("en-IN")})` : ""}
            </span>
          </div>

          <div className="flex items-center justify-between text-[var(--kw-on-surface-variant)]">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#B86B4B]" />
              Raw Materials &amp; Natural Dyes
            </span>
            <span className="tabular-nums">{materialShare}%</span>
          </div>

          <div className="flex items-center justify-between text-[var(--kw-on-surface-variant)]">
            <span className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[var(--kw-surface-container-highest)]" />
              Cluster Logistics &amp; Packaging
            </span>
            <span className="tabular-nums">{logisticsShare}%</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--kw-outline-variant)]/40 flex items-start gap-2">
        <HeartHandshake className="size-4 shrink-0 mt-0.5 text-[var(--kw-secondary)]" aria-hidden="true" />
        <p className="kw-body-sm text-[var(--kw-on-surface-variant)] leading-relaxed">
          Guaranteed FairPrice floor wage disbursed directly via Direct Benefit Transfer (DBT) to the artisan collective passbook. No intermediary deductions.
        </p>
      </div>
    </div>
  );
}
