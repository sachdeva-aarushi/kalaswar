/**
 * /workroom/artisans — Artisans list for coordinators
 */

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";

interface ApiArtisan {
  id: string;
  name?: string;
  phone?: string;
  dialect?: string;
  shg_cluster_id?: string;
  status?: string;
}

interface ArtisanListResponse {
  items: ApiArtisan[];
  total: number;
}

export const Route = createFileRoute("/workroom/artisans")({
  head: () => ({
    meta: [{ title: "Artisans — Kalaswar Workroom" }],
  }),
  component: WorkroomArtisans,
});

function WorkroomArtisans() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["artisans", "workroom"],
    queryFn: () => apiClient.get<ArtisanListResponse>("/api/v1/artisans"),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Artisans</h1>

      {isLoading ? (
        <KwLoadingState label="Loading artisans…" />
      ) : isError ? (
        <KwErrorState
          title="Could not load artisans"
          detail={(error as Error)?.message}
          retry={() => void refetch()}
        />
      ) : !data?.items?.length ? (
        <KwEmptyState
          title="No artisans registered"
          description="Artisans onboarded via WhatsApp or admin portal will appear here."
        />
      ) : (
        <div className="kw-card p-0 overflow-x-auto">
          <table className="kw-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Dialect</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((artisan) => (
                <tr key={artisan.id}>
                  <td className="kw-body-md-med">{artisan.name ?? "–"}</td>
                  <td className="kw-body-md">{artisan.dialect ?? "–"}</td>
                  <td className="kw-body-md font-mono text-xs">{artisan.phone ?? "–"}</td>
                  <td>
                    <span className="kw-badge kw-badge-success">{artisan.status ?? "active"}</span>
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
