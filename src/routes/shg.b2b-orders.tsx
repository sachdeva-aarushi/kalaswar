import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { b2bOrdersQuery, recordB2bStage } from "@/lib/data";
import { orderEventsQuery } from "@/lib/data";

export const Route = createFileRoute("/shg/b2b-orders")({
  head: () => ({
    meta: [
      { title: "B2B orders — Kalaswar coordinator" },
      { property: "og:title", content: "B2B orders — Kalaswar coordinator" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(b2bOrdersQuery());
  },
  component: CoordinatorOrdersPage,
});

const STAGES = [
  "materials_confirmed",
  "work_assigned",
  "production_started",
  "mid_review",
  "quality_inspection",
  "rework",
  "final_approval",
  "packing",
  "dispatch",
  "delivery_confirmation",
] as const;

function CoordinatorOrdersPage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: orders } = useSuspenseQuery(b2bOrdersQuery());
  const [stageFor, setStageFor] = useState<string | null>(null);
  const [stageKey, setStageKey] = useState<string>("materials_confirmed");
  const [stageNote, setStageNote] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stageMut = useMutation({
    mutationFn: ({ orderId, stage, note: n }: { orderId: string; stage: string; note?: string }) =>
      recordB2bStage(orderId, stage, n),
    onSuccess: (_d, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["orderEvents", vars.orderId] });
      setStageFor(null);
      setStageNote("");
      setNote(t(`b2b_stage_${vars.stage}`));
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("shg_b2b_orders")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("b2b_stage_title")}</p>
      </header>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("shg_b2b_no_orders")}</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{o.customer_reference}</p>
                  <p className="font-medium">{o.request_title}</p>
                  <p className="text-sm text-muted-foreground">
                    {o.buyer_org_name} · {o.quantity} pcs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {o.status.replace(/_/g, " ")}
                  </Badge>
                  <Link to="/shg/orders" className="text-xs text-muted-foreground underline underline-offset-4">
                    {t("shg_orders")}
                  </Link>
                </div>
              </div>

              <OrderTimeline orderId={o.id} />

              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                {stageFor === o.id ? (
                  <>
                    <div className="w-56">
                      <Select value={stageKey} onValueChange={setStageKey}>
                        <SelectTrigger aria-label={t("b2b_stage_record")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`b2b_stage_${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="max-w-64"
                      value={stageNote}
                      onChange={(e) => setStageNote(e.target.value)}
                      placeholder="…"
                    />
                    <Button
                      size="sm"
                      disabled={stageMut.isPending}
                      onClick={() => stageMut.mutate({ orderId: o.id, stage: stageKey, ...(stageNote ? { note: stageNote } : {}) })}
                    >
                      {t("b2b_stage_record")}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setStageFor(o.id); setStageKey("materials_confirmed"); }}>
                    {t("b2b_stage_record")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p className="flex items-center gap-2 text-sm text-primary">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {note}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <Info className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}

function OrderTimeline({ orderId }: { orderId: string }) {
  const { t } = useLang();
  const { data: events } = useSuspenseQuery(orderEventsQuery(orderId));
  if (events.length === 0) return null;
  return (
    <ol className="mt-3 space-y-1 border-l border-border pl-4 text-xs text-muted-foreground">
      {[...events].reverse().map((e) => (
        <li key={e.id}>
          {new Date(e.created_at).toLocaleString()} —{" "}
          {t(`b2b_stage_${e.event_type}`) === `b2b_stage_${e.event_type}` ? e.event_type.replace(/_/g, " ") : t(`b2b_stage_${e.event_type}`)}
          {e.note ? ` — ${e.note}` : ""}
        </li>
      ))}
    </ol>
  );
}
