import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useLang } from "@/lib/i18n";
import { collectiveSnapshotsQuery } from "@/lib/data";

export const Route = createFileRoute("/b2b/discover")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(collectiveSnapshotsQuery());
  },
  component: DiscoverPage,
});

function DiscoverPage() {
  const { t } = useLang();
  const { data: snapshots } = useSuspenseQuery(collectiveSnapshotsQuery());

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">{t("b2b_discover_title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("b2b_discover_intro")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {snapshots.map((snap) => (
          <article key={snap.shg.id} className="border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
            <h2 className="font-display text-xl font-medium text-foreground">{snap.shg.name}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_recorded_skills")}</dt>
                <dd>{snap.skills.length > 0 ? snap.skills.map((s) => s.skill).join(", ") : t("capacity_unset")}</dd>
              </div>
              <div className="flex gap-6">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_capacity_pieces_month")}</dt>
                  <dd>{snap.shg.monthly_capacity != null ? `${snap.shg.monthly_capacity} pcs` : t("capacity_unset")}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_workload_now")}</dt>
                  <dd>{snap.activeWorkloadUnits} pcs</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{t("b2b_materials_recorded")}</dt>
                  <dd>{snap.materials.length}</dd>
                </div>
              </div>
            </dl>
            <Link
              to="/b2b/request"
              className="mt-4 inline-block text-sm text-primary underline underline-offset-4"
            >
              {t("b2b_request_new")} →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
