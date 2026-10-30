import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  FileEdit,
  MinusCircle,
  Copy,
  Check,
  ChevronDown,
  Info,
  ShieldCheck,
} from "lucide-react";
import type { DppPassport } from "@/features/dpp/hooks";

interface VerificationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  passport: DppPassport;
}

export function VerificationDetailsModal({ isOpen, onClose, passport }: VerificationDetailsModalProps) {
  const [copiedProof, setCopiedProof] = useState(false);
  const [showHowToCheck, setShowHowToCheck] = useState(false);

  if (!isOpen) return null;

  const proofCode = `KP-${passport.token} · ${passport.merkle_root.slice(2, 6).toUpperCase()} ${passport.merkle_root.slice(-4).toUpperCase()}`;

  const handleCopyProof = async () => {
    try {
      await navigator.clipboard.writeText(proofCode);
      setCopiedProof(true);
      setTimeout(() => setCopiedProof(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--kw-radius-xl)] bg-[var(--kw-surface)] border border-[var(--kw-outline-variant)] shadow-xl p-6 sm:p-7 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close verification dialog"
          className="absolute top-4 right-4 p-2 rounded-full text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container-high)] transition-colors"
        >
          <X className="size-5" aria-hidden="true" />
        </button>

        {/* Title */}
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-[#B86B4B]" aria-hidden="true" />
            <span className="kw-label-eyebrow uppercase text-[#B86B4B] tracking-wider font-semibold">
              Chain of Integrity
            </span>
          </div>
          <h2 id="verification-dialog-title" className="kw-headline-md text-[var(--kw-on-surface)] font-semibold">
            What is confirmed, and what is not.
          </h2>
          <div className="w-12 h-0.5 bg-[#C69B50] mt-2" />
        </div>

        {/* Group 1: Confirmed (independently verified & collective-recorded) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="kw-label-eyebrow uppercase font-semibold text-[var(--kw-primary-container)] tracking-wider">
              Group 1 · Confirmed
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-800 font-medium">
              4 of 4 Verified
            </span>
          </div>

          <div className="rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-lowest)] divide-y divide-[var(--kw-outline-variant)]/40 overflow-hidden">
            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">Maker identity &amp; cluster</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    Enrolled at {passport.cluster_name}; display name "{passport.maker_display_name}"
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                collective-recorded
              </span>
            </div>

            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">Craft origin &amp; coarse GPS region</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    {passport.gps_region} ({passport.craft_category})
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                collective-recorded
              </span>
            </div>

            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">Fair wage split guarantee</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    {passport.wage_split_pct}% minimum direct wage guaranteed in listing smart contract
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-purple-700 shrink-0">
                independently verified
              </span>
            </div>

            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="size-4.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">On-chain Merkle commitment</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    Anchored to {passport.chain ?? "Polygon Layer-2"} with cryptographic leaf verification
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-purple-700 shrink-0">
                independently verified
              </span>
            </div>
          </div>
        </div>

        {/* Group 2: Stated by the Maker (artisan-provided) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="kw-label-eyebrow uppercase font-semibold text-[var(--kw-on-surface-variant)] tracking-wider">
              Group 2 · Stated by the Maker
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--kw-surface-container-high)] text-[var(--kw-on-surface-variant)] font-medium">
              Artisan Log
            </span>
          </div>

          <div className="rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-lowest)] divide-y divide-[var(--kw-outline-variant)]/40 overflow-hidden">
            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <FileEdit className="size-4.5 text-[var(--kw-secondary)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">Raw materials &amp; technique</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    Reported by maker via conversational voice prompt (Pure silk yarn &amp; cotton ground)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-amber-700 shrink-0">
                artisan-provided
              </span>
            </div>

            <div className="p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <FileEdit className="size-4.5 text-[var(--kw-secondary)] mt-0.5 shrink-0" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-[var(--kw-on-surface)]">Handcrafted time log</p>
                  <p className="text-[var(--kw-on-surface-variant)]">
                    Self-recorded working hours (~14 to 18 hours across stitching sessions)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-medium text-amber-700 shrink-0">
                artisan-provided
              </span>
            </div>
          </div>
        </div>

        {/* Group 3: Privacy & Honest Unverified Scope */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="kw-label-eyebrow uppercase font-semibold text-[var(--kw-outline)] tracking-wider">
              Group 3 · Privacy Preservation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-[var(--kw-surface-container-highest)] text-[var(--kw-on-surface-variant)] font-medium">
              Privacy-First
            </span>
          </div>

          <div className="rounded-[var(--kw-radius)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-low)] p-3.5 space-y-2">
            <div className="flex items-start gap-2.5 text-xs">
              <MinusCircle className="size-4.5 text-[var(--kw-outline)] mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-[var(--kw-on-surface)]">Exact artisan home GPS</p>
                <p className="text-[var(--kw-on-surface-variant)] mt-0.5">
                  Not published: coarse regional cluster location is provided ({passport.gps_region}) to strictly protect artisan home and personal privacy.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What this does not show callout */}
        <div className="rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-high)] p-3.5 flex items-start gap-2.5 text-xs">
          <Info className="size-4 text-[var(--kw-on-surface-variant)] mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-[var(--kw-on-surface-variant)] leading-relaxed">
            <strong>What this does not show:</strong> It does not destructive-test the cloth fibres in a laboratory or claim moral superiority. It simply provides an unvarnished, immutable record of what was verified, recorded, and attested.
          </p>
        </div>

        {/* Proof Reference Code */}
        <div className="space-y-2">
          <span className="kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] text-xs font-semibold tracking-wider">
            Proof Reference
          </span>
          <div className="flex items-center justify-between gap-2 p-3 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)]/60">
            <code className="font-mono text-xs text-[var(--kw-on-surface)] font-semibold truncate select-all">
              {proofCode}
            </code>
            <button
              type="button"
              onClick={handleCopyProof}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--kw-surface-container-high)] text-xs font-medium text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container-highest)] transition-colors"
            >
              {copiedProof ? (
                <>
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* How to check this code disclosure */}
        <div>
          <button
            type="button"
            onClick={() => setShowHowToCheck((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--kw-primary-container)] hover:underline"
          >
            <span>How to check this code</span>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${showHowToCheck ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {showHowToCheck && (
            <div className="mt-2.5 p-3 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-low)] space-y-2 text-xs text-[var(--kw-on-surface)] animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <span className="size-4.5 rounded-full bg-[var(--kw-primary-fixed)] text-[var(--kw-on-primary-fixed)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  <strong>Physical Garment Tag:</strong> Check the alphanumeric QR code printed on the sewn cotton label.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-4.5 rounded-full bg-[var(--kw-primary-fixed)] text-[var(--kw-on-primary-fixed)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  <strong>Cluster Registry Match:</strong> Cross-reference the timestamp and token directly against the local SHG ledger.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="size-4.5 rounded-full bg-[var(--kw-primary-fixed)] text-[var(--kw-on-primary-fixed)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  <strong>On-Chain Ledger:</strong> Verify the SHA-256 leaf hash against the root on Polygon Amoy Explorer.
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-[6px] bg-[var(--kw-primary-container)] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          Return to Craft Specimen
        </button>
      </div>
    </div>
  );
}

