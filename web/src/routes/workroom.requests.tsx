/**
 * /workroom/requests — Custom requests list for coordinators
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

interface ApiRequest {
  id: string;
  customer_id?: string;
  description?: string;
  status?: string;
  created_at?: string;
}
interface RequestListResponse { items: ApiRequest[]; total: number; }

export const Route = createFileRoute("/workroom/requests")({
  head: () => ({ meta: [{ title: "Requests — Kalaswar Workroom" }] }),
  component: WorkroomRequests,
});

function WorkroomRequests() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["requests", "workroom"],
    queryFn: () => apiClient.get<RequestListResponse>("/api/v1/custom-requests"),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Custom Requests</h1>

      {isLoading ? (
        <KwLoadingState label="Loading requests…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load requests"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !data?.items?.length ? (
        <KwEmptyState
          title="No custom requests yet"
          description="Customer gift or bespoke requests will appear here."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((req) => (
                <tr key={req.id}>
                  <td className="kw-body-md font-mono text-xs">{req.id.slice(0, 8)}…</td>
                  <td className="kw-body-md">{req.description ?? "–"}</td>
                  <td>
                    <span className={`kw-badge ${req.status === "approved" ? "kw-badge-success" : req.status === "pending" ? "kw-badge-warning" : "kw-badge-neutral"}`}>
                      {req.status ?? "new"}
                    </span>
                  </td>
                  <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                    {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN") : "–"}
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
