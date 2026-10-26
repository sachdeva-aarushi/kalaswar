import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { artisansQuery, ordersQuery, shgCapacityQuery, updateShgCapacity } from "@/lib/data";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shg/artisans")({
  head: () => ({ meta: [{ title: "Artisans — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(shgCapacityQuery());
  },
  component: ShgArtisans,
});

function ShgArtisans() {
  const { t } = useLang();
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: collectives } = useSuspenseQuery(shgCapacityQuery());

  const workload = new Map<string, { assignments: number; units: number }>();
  for (const o of orders) {
    if (o.status !== "in_production" && o.status !== "ready_for_dispatch") continue;
    if (!o.artisan) continue;
    const w = workload.get(o.artisan.id) ?? { assignments: 0, units: 0 };
    w.assignments += 1;
    w.units += o.quantity;
    workload.set(o.artisan.id, w);
  }

  const totalActiveUnits = [...workload.values()].reduce((n, w) => n + w.units, 0);

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("shg_artisans")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("explore_results", { n: artisans.length })}
        </p>
      </header>

      {/* Capacity planning — the recorded figure MakePossible judges feasibility against */}
      <section className="mt-6 rounded-md border border-border bg-card p-5">
        <h2 className="font-display text-xl text-foreground">{t("capacity_title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("capacity_sub")}</p>
        <ul className="mt-4 space-y-3">
          {collectives.map((shg) => (
            <CapacityRow key={shg.id} shgId={shg.id} name={shg.name} initial={shg.monthly_capacity} />
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("capacity_active_now", { n: totalActiveUnits })}
        </p>
        <DemoNote className="mt-2">{t("demo_note")}</DemoNote>
      </section>

      <ul className="mt-8 divide-y divide-border border-y border-border">
        {artisans.map((a) => {
          const w = workload.get(a.id) ?? { assignments: 0, units: 0 };
          return (
            <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              {a.photo_url && (
                <img
                  src={a.photo_url}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  to="/artisan/$id"
                  params={{ id: a.id }}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {a.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">
                  {a.craft} · {a.shg?.name}
                </p>
              </div>
              <div className="flex gap-6 text-sm sm:justify-end">
                <div>
                  <p className="font-display text-xl tabular-nums text-foreground">
                    {w.assignments}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("artisans_active")}</p>
                </div>
                <div>
                  <p
                    className={cn(
                      "font-display text-xl tabular-nums",
                      w.units > 15 ? "text-terracotta" : "text-foreground",
                    )}
                  >
                    {w.units}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("artisans_workload")}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One collective's monthly capacity — saved to the recorded figure feasibility reads. */
function CapacityRow({ shgId, name, initial }: { shgId: string; name: string; initial: number | null }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(initial == null ? "" : String(initial));
  const mut = useMutation({
    mutationFn: () =>
      updateShgCapacity(shgId, value.trim() === "" ? null : Math.max(0, Number(value))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shgCapacity"] });
      void queryClient.invalidateQueries({ queryKey: ["collectiveSnapshots"] });
      toast.success(t("capacity_saved"));
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const changed = value.trim() === "" ? initial != null : Number(value) !== initial;
  return (
    <li className="flex items-center gap-3">
      <span className="min-w-40 flex-1 truncate text-sm text-foreground">{name}</span>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("capacity_unset")}
        aria-label={t("capacity_input_label", { shg: name })}
        className="h-9 w-24"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => mut.mutate()}
        disabled={mut.isPending || !changed}
      >
        {t("capacity_save")}
      </Button>
    </li>
  );
}
