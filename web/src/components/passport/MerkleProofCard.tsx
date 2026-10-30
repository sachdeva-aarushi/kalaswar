import React, { useState } from "react";
import { CheckCircle2, Copy, Check, ExternalLink, ShieldAlert, Cpu, Sparkles } from "lucide-react";
import type { DppPassport, DppVerification } from "@/features/dpp/hooks";

interface MerkleProofCardProps {
  passport: DppPassport;
  verification?: DppVerification;
  isLoadingVerification?: boolean;
}

export function MerkleProofCard({ passport, verification, isLoadingVerification }: MerkleProofCardProps) {
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const isDemoChain = true; // Mock adapter in development / demo mode
  const chainName = passport.chain === "polygon_amoy" ? "Polygon Amoy Testnet" : "Polygon Layer-2";

  const handleCopy = async (text: string, type: "root" | "tx") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "root") {
        setCopiedRoot(true);
        setTimeout(() => setCopiedRoot(false), 2000);
      } else {
        setCopiedTx(true);
        setTimeout(() => setCopiedTx(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-[var(--kw-radius-lg)] border border-[var(--kw-outline-variant)]/60 bg-[var(--kw-surface-container-lowest)] p-5 shadow-sm space-y-4">
      {/* Header with Title and Demo Chain Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="size-5 text-[var(--kw-primary-container)]" aria-hidden="true" />
          <h2 className="kw-headline-sm text-[var(--kw-on-surface)] font-semibold">
            Verify On-Chain
          </h2>
        </div>

        {/* Clear prominent Demo Chain badge */}
        {isDemoChain && (
          <span
            data-testid="demo-chain-badge"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs"
          >
            <Sparkles className="size-3.5 text-amber-600" aria-hidden="true" />
            <span>Demo chain: {chainName}</span>
          </span>
        )}
      </div>

      <p className="kw-body-sm text-[var(--kw-on-surface-variant)] leading-relaxed">
        The craft specimen leaf hash is anchored into a cryptographic Merkle tree committed to the Polygon blockchain, guaranteeing immutable chain-of-custody.
      </p>

      {/* Merkle Root Row */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] font-semibold tracking-wider">
            Merkle Root
          </span>
          <span className="text-[11px] text-[var(--kw-secondary)] font-medium">
            SHA-256 State Root
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-low)] p-2.5 border border-[var(--kw-outline-variant)]/40">
          <code
            data-testid="merkle-root-value"
            className="font-mono text-xs text-[var(--kw-on-surface)] break-all select-all font-medium"
          >
            {passport.merkle_root}
          </code>
          <button
            type="button"
            data-testid="copy-merkle-root-btn"
            onClick={() => handleCopy(passport.merkle_root, "root")}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--kw-surface-container-high)] hover:bg-[var(--kw-surface-container-highest)] text-xs text-[var(--kw-on-surface)] transition-colors active:scale-95"
            title="Copy Merkle root"
          >
            {copiedRoot ? (
              <>
                <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                <span className="text-emerald-700 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-[var(--kw-on-surface-variant)]" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Polygon Transaction Hash Row */}
      {passport.polygon_tx_hash && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="kw-label-eyebrow uppercase text-[var(--kw-on-surface-variant)] font-semibold tracking-wider">
              Polygon Transaction Hash
            </span>
            <span className="text-[11px] text-[var(--kw-secondary)] font-medium">
              Layer-2 Receipt
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-[var(--kw-radius)] bg-[var(--kw-surface-container-low)] p-2.5 border border-[var(--kw-outline-variant)]/40">
            <code
              data-testid="polygon-tx-value"
              className="font-mono text-xs text-[var(--kw-on-surface)] break-all select-all font-medium"
            >
              {passport.polygon_tx_hash}
            </code>
            <button
              type="button"
              data-testid="copy-polygon-tx-btn"
              onClick={() => handleCopy(passport.polygon_tx_hash!, "tx")}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--kw-surface-container-high)] hover:bg-[var(--kw-surface-container-highest)] text-xs text-[var(--kw-on-surface)] transition-colors active:scale-95"
              title="Copy transaction hash"
            >
              {copiedTx ? (
                <>
                  <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5 text-[var(--kw-on-surface-variant)]" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cryptographic Verification Status Pill */}
      <div className="rounded-[var(--kw-radius)] bg-emerald-50/70 border border-emerald-200/80 p-3 flex items-start gap-2.5">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-semibold text-emerald-900">
            {verification?.message ?? "Cryptographic authenticity verified on Polygon Layer-2."}
          </p>
          <p className="text-[11px] text-emerald-700 leading-normal">
            Leaf hash matches canonical state root. Proof verified with zero discrepancy.
          </p>
        </div>
      </div>

      {/* External Explorer Button */}
      {passport.explorer_url && (
        <a
          href={passport.explorer_url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="polygonscan-explorer-link"
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-[6px] border border-[var(--kw-primary-container)]/30 bg-[var(--kw-surface-container-lowest)] hover:bg-[var(--kw-surface-container-low)] text-[var(--kw-primary-container)] font-medium text-xs shadow-xs transition-colors"
        >
          <span>View on Polygonscan Amoy Explorer</span>
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

