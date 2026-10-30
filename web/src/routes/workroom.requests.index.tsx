/**
 * /workroom/requests/ — Custom Requests and RFPs List
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useProposalList } from "@/features/proposals/hooks";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";
import { ArrowRight, Sparkles, FileText, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/workroom/requests/")({
  head: () => ({ meta: [{ title: "Custom Requests — Kalaswar Workroom" }] }),
  component: WorkroomRequestsList,
});

function WorkroomRequestsList() {
  const { data: proposals, isLoading, isError, error, refetch } = useProposalList();

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Custom Requests & Proposals</h1>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Evaluate bespoke client briefs with MakePossible and issue cost-plus proposals.
          </p>
        </div>
      </div>

      {isLoading ? (
        <KwLoadingState label="Loading custom requests…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load requests"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !proposals?.length ? (
        <KwEmptyState
          title="No custom requests yet"
          description="Customer bespoke and corporate gift briefs will appear here."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Title / Scope</th>
                <th>Craft</th>
                <th>Quantity</th>
                <th>Value (₹)</th>
                <th>Version</th>
                <th>Status</th>
                <th>MakePossible</th>
                <th>Proposal</th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((prop) => (
                <tr key={prop.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                  <td className="kw-body-md font-semibold text-[var(--kw-primary)]">
                    {prop.title}
                  </td>
                  <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                    {prop.current_spec.craft}
                  </td>
                  <td className="kw-body-md tabular-nums font-medium">
                    {prop.current_spec.quantity} units
                  </td>
                  <td className="kw-body-md tabular-nums font-semibold">
                    ₹{prop.current_spec.total_price_inr.toLocaleString("en-IN")}
                  </td>
                  <td className="kw-body-sm font-mono text-xs">
                    v{prop.current_version}
                  </td>
                  <td>
                    <span
                      className={`kw-badge ${
                        prop.status === "confirmed"
                          ? "kw-badge-success"
                          : prop.status === "submitted"
                          ? "kw-badge-primary"
                          : "kw-badge-warning"
                      }`}
                    >
                      {prop.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      to="/workroom/requests/$id/makepossible"
                      params={{ id: prop.id }}
                      className="kw-btn kw-btn-secondary h-8 text-xs inline-flex items-center gap-1"
                    >
                      <Sparkles className="size-3 text-[var(--kw-primary)]" />
                      <span>Evaluate</span>
                    </Link>
                  </td>
                  <td>
                    <Link
                      to="/workroom/requests/$id/proposal"
                      params={{ id: prop.id }}
                      className="kw-btn kw-btn-primary h-8 text-xs inline-flex items-center gap-1"
                    >
                      <FileText className="size-3" />
                      <span>Review</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

