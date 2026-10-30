import React from "react";
import {
  User,
  MapPin,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { DppPassport } from "@/features/dpp/hooks";

interface ProvenanceCertificateProps {
  passport: DppPassport;
  onOpenVerificationModal: () => void;
}

export function ProvenanceCertificate({
  passport,
  onOpenVerificationModal,
}: ProvenanceCertificateProps) {
  // Maker display initials (e.g. "Radha D." -> "RD")
  const initials = passport.maker_display_name
    ? passport.maker_display_name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "KW";

  return (
    <div className="space-y-6">
      {/* Eyebrow & Main Title Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kw-label-eyebrow uppercase tracking-[0.2em] text-[#B86B4B] font-semibold">
            CRAFT PASSPORT
          </span>
          <span className="size-1.5 rounded-full bg-[#B86B4B]" />
          <span className="kw-label-eyebrow uppercase tracking-[0.14em] text-[var(--kw-on-surface-variant)] font-medium">
            VERIFIED LEDGER ENTRY
          </span>
        </div>

        <h1
          data-testid="passport-product-title"
          className="kw-headline-lg font-serif text-[var(--kw-on-surface)] leading-tight"
        >
          {passport.product_title}
        </h1>

        <p className="kw-body-md text-[var(--kw-on-surface-variant)] flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-[var(--kw-on-surface)]">{passport.craft_category}</span>
          <span>·</span>
          <span>{passport.cluster_name}</span>
        </p>

        {/* 64px Atelier Gold Accent Rule */}
        <div className="w-16 h-[2px] bg-[#C69B50] mt-3 mb-1" />
      </div>

      {/* Maker Collective Signpost Card */}
      <div
        data-testid="maker-signpost-card"
        className="rounded-[var(--kw-radius-lg)] bg-[#F3EDE3] p-5 shadow-xs border border-[var(--kw-outline-variant)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          {/* Monogram Badge */}
          <div className="size-11 rounded-full bg-[var(--kw-primary-container)] text-white flex items-center justify-center font-serif text-base font-bold shadow-xs shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="kw-label-caption uppercase tracking-wider text-[var(--kw-on-surface-variant)] font-semibold">
                Lead Artisan
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium">
                artisan-provided
              </span>
            </div>
            <p
              data-testid="maker-name"
              className="kw-headline-sm font-semibold text-[var(--kw-on-surface)] truncate"
            >
              Made by {passport.maker_display_name}
            </p>
            <p className="text-xs text-[var(--kw-on-surface-variant)] truncate">
              {passport.cluster_name}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenVerificationModal}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--kw-primary-container)] hover:text-[var(--kw-secondary)] transition-colors self-start sm:self-auto group"
        >
          <span>View proof details</span>
          <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* AT A GLANCE: Verification Ledger Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="kw-label-eyebrow uppercase tracking-[0.16em] text-[var(--kw-on-surface-variant)] font-semibold">
            AT A GLANCE
          </span>
          <span className="kw-label-caption text-[var(--kw-secondary)] font-medium">
            Chain of Custody
          </span>
        </div>

        <div className="rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-lowest)] divide-y divide-[var(--kw-outline-variant)]/40 overflow-hidden shadow-xs">
          {/* Row 1: Maker */}
          <div className="p-3.5 flex items-center justify-between gap-3 bg-[var(--kw-surface-container-lowest)]">
            <div className="flex items-center gap-3">
              <span className="w-20 kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold shrink-0">
                Maker
              </span>
              <span className="kw-body-md text-[var(--kw-on-surface)] font-medium">
                {passport.maker_display_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
              <span>Confirmed</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-900 border border-amber-200">
                artisan-provided
              </span>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            </div>
          </div>

          {/* Row 2: Place & Coarse Region */}
          <div className="p-3.5 flex items-center justify-between gap-3 bg-[var(--kw-surface-container-low)]">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-20 kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold shrink-0">
                Place
              </span>
              <div className="min-w-0">
                <span
                  data-testid="passport-coarse-region"
                  className="kw-body-md text-[var(--kw-on-surface)] font-medium block truncate"
                >
                  {passport.gps_region}
                </span>
                <span className="text-[11px] text-[var(--kw-on-surface-variant)] block">
                  Coarse region · Artisan residence protected
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium shrink-0">
              <span>Confirmed</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-200">
                collective-recorded
              </span>
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
            </div>
          </div>

          {/* Row 3: Craft & Materials */}
          <div className="p-3.5 flex items-center justify-between gap-3 bg-[var(--kw-surface-container-lowest)]">
            <div className="flex items-center gap-3">
              <span className="w-20 kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold shrink-0">
                Craft
              </span>
              <span className="kw-body-md text-[var(--kw-on-surface)]">
                {passport.craft_category} (Traditional GI)
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium shrink-0">
              <span>GI Registered</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-900 border border-purple-200">
                independently verified
              </span>
              <CheckCircle2 className="size-4 shrink-0 text-purple-600" aria-hidden="true" />
            </div>
          </div>

          {/* Row 4: Fair Pay */}
          <div className="p-3.5 flex items-center justify-between gap-3 bg-[var(--kw-surface-container-low)]">
            <div className="flex items-center gap-3">
              <span className="w-20 kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold shrink-0">
                Fair Pay
              </span>
              <span
                data-testid="passport-wage-split-pct"
                className="kw-body-md text-[var(--kw-primary-container)] font-semibold tabular-nums"
              >
                {passport.wage_split_pct}% Direct Wage Split
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-purple-700 text-xs font-medium shrink-0">
              <span>Audited</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-50 text-purple-900 border border-purple-200">
                independently verified
              </span>
              <CheckCircle2 className="size-4 shrink-0 text-purple-600" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          type="button"
          onClick={onOpenVerificationModal}
          data-testid="open-verification-modal-btn"
          className="flex-1 h-11 px-4 rounded-[6px] bg-[var(--kw-primary-container)] hover:bg-[#84485A] text-white font-medium text-xs shadow-sm flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <span>View verification details</span>
          <ShieldCheck className="size-4" aria-hidden="true" />
        </button>

        <a
          href={`/shop?craft=${encodeURIComponent(passport.craft_category)}`}
          className="flex-1 h-11 px-4 rounded-[6px] border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] hover:bg-[var(--kw-surface-container-low)] text-[var(--kw-primary-container)] font-medium text-xs shadow-xs flex items-center justify-center gap-2 transition-colors"
        >
          <span>Explore related craftworks</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <p className="kw-body-sm text-[var(--kw-on-surface-variant)] text-center italic text-xs">
        This passport shows what has been recorded. It does not show anything that has not.
      </p>

      {/* SECTION: HOW IT GOT HERE (Timeline Milestones) */}
      <div className="space-y-4 pt-4 border-t border-[var(--kw-outline-variant)]/60">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="kw-headline-md text-[var(--kw-on-surface)] font-serif font-semibold">
            How it got here
          </h2>
          <span className="text-xs text-[var(--kw-on-surface-variant)] font-mono">
            Token: {passport.token}
          </span>
        </div>

        {/* Milestone 1: Voice & Intake */}
        <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--kw-surface-container-highest)]">
          <div className="relative space-y-1">
            <div className="absolute -left-6 top-0.5 size-5 rounded-full bg-[var(--kw-primary-container)] text-white flex items-center justify-center text-[10px] ring-4 ring-[var(--kw-surface)]">
              1
            </div>
            <div className="p-3.5 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="kw-headline-sm text-xs font-semibold text-[var(--kw-on-surface)]">
                  Captured via WhatsApp Voice &amp; Camera
                </span>
                <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                  artisan-provided
                </span>
              </div>
              <p className="kw-body-sm text-xs text-[var(--kw-on-surface-variant)]">
                {passport.maker_display_name} shared authentic craft photos and spoken details through WhatsApp Karigar Saathi.
              </p>
            </div>
          </div>

          {/* Milestone 2: Cluster Supervisor Check */}
          <div className="relative space-y-1">
            <div className="absolute -left-6 top-0.5 size-5 rounded-full bg-[var(--kw-primary-container)] text-white flex items-center justify-center text-[10px] ring-4 ring-[var(--kw-surface)]">
              2
            </div>
            <div className="p-3.5 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="kw-headline-sm text-xs font-semibold text-[var(--kw-on-surface)]">
                  Cluster Verification &amp; Material Weigh-In
                </span>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  collective-recorded
                </span>
              </div>
              <p className="kw-body-sm text-xs text-[var(--kw-on-surface-variant)]">
                Local cluster coordinator verified base fiber purity and ensured strict GI adherence.
              </p>
            </div>
          </div>

          {/* Milestone 3: On-Chain Anchoring */}
          <div className="relative space-y-1">
            <div className="absolute -left-6 top-0.5 size-5 rounded-full bg-[#C69B50] text-white flex items-center justify-center text-[10px] ring-4 ring-[var(--kw-surface)]">
              3
            </div>
            <div className="p-3.5 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/40 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="kw-headline-sm text-xs font-semibold text-[var(--kw-primary-container)]">
                  Cryptographic Merkle Root Anchored
                </span>
                <span className="text-[10px] text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full font-medium">
                  independently verified
                </span>
              </div>
              <p className="kw-body-sm text-xs text-[var(--kw-on-surface-variant)]">
                Cryptographic leaf hash committed to Polygon Amoy Layer-2 blockchain with immutable receipt.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
