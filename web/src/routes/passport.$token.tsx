/**
 * /passport/$token — Digital Product Passport public route
 *
 * Resolves a scanned physical QR tag to the product's provenance data.
 * Public route: no auth required.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useDppPassport } from "@/features/dpp/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { Shield, MapPin, User, CheckCircle, XCircle } from "lucide-react";
import kwAppCss from "@/kw-app.css?url";

export const Route = createFileRoute("/passport/$token")({
  head: () => ({
    meta: [
      { title: "Product Passport — Kalaswar" },
      { name: "description", content: "Verify the provenance and artisan behind this Kalaswar product." },
    ],
  }),
  component: PassportPage,
});

function PassportPage() {
  const { token } = Route.useParams();
  const { data, isLoading, isError, error } = useDppPassport(token);

  return (
    <>
      <link rel="stylesheet" href={kwAppCss} />
      <div className="kw-app min-h-screen">
        <DemoModeBanner />
        <main className="flex min-h-[calc(100vh-40px)] items-center justify-center p-[var(--kw-space-lg)]">
          {isLoading ? (
            <KwLoadingState label="Loading passport…" />
          ) : isError ? (
            <div className="w-full max-w-md">
              <KwErrorState
                title="Passport not found"
                detail={(error as Error)?.message ?? "This QR code may be invalid or the product record has not yet been anchored on-chain."}
              />
            </div>
          ) : data ? (
            <div className="w-full max-w-md space-y-[var(--kw-space-lg)]">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center size-16 rounded-[var(--kw-radius-lg)] bg-[var(--kw-primary-container)]">
                  <Shield className="size-8 text-white" aria-hidden="true" />
                </div>
                <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Digital Product Passport</h1>
                <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">Product ID: {token}</p>
              </div>

              {/* Artisan card */}
              <div className="kw-card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--kw-surface-container)]">
                    <User className="size-6 text-[var(--kw-on-surface-variant)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="kw-headline-sm text-[var(--kw-on-surface)]">
                      {data.artisan_name ?? "Artisan name withheld"}
                    </p>
                    <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                      {data.craft_technique ?? "Indian Handicraft"}
                    </p>
                  </div>
                </div>

                {/* Cluster origin */}
                {data.cluster_name && (
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 shrink-0 mt-0.5 text-[var(--kw-on-surface-variant)]" aria-hidden="true" />
                    <div>
                      <p className="kw-body-md-med text-[var(--kw-on-surface)]">{data.cluster_name}</p>
                      {data.cluster_state && (
                        <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">{data.cluster_state}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Wage share */}
                {data.wage_share_pct != null && (
                  <div className="rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)] p-3">
                    <p className="kw-label-sm text-[var(--kw-on-surface-variant)]">Artisan wage share</p>
                    <p className="kw-headline-md text-[var(--kw-primary-container)] tabular-nums">
                      {data.wage_share_pct}%
                    </p>
                    <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
                      of the sale price goes directly to the artisan collective.
                    </p>
                  </div>
                )}
              </div>

              {/* On-chain verification */}
              <div className="kw-card">
                <div className="flex items-center gap-2 mb-3">
                  {data.on_chain_verified ? (
                    <CheckCircle className="size-5 text-[#18372d]" aria-hidden="true" />
                  ) : (
                    <XCircle className="size-5 text-[var(--kw-secondary)]" aria-hidden="true" />
                  )}
                  <span className="kw-label-md text-[var(--kw-on-surface)]">
                    {data.on_chain_verified ? "On-chain verified" : "Pending on-chain verification"}
                  </span>
                </div>
                {data.polygon_tx_hash && (
                  <p className="kw-body-sm text-[var(--kw-on-surface-variant)] font-mono break-all">
                    Tx: {data.polygon_tx_hash}
                  </p>
                )}
                {data.merkle_root && (
                  <p className="kw-body-sm text-[var(--kw-on-surface-variant)] font-mono break-all mt-1">
                    Merkle root: {data.merkle_root}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
}
