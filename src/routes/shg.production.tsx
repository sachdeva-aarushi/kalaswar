import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  ordersQuery,
  productionPlansQuery,
  saveProductionPlan,
  type ProductionPlanStage,
} from "@/lib/data";
import { formatDate } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/shg/production")({
  head: () => ({ meta: [{ title: "Production plans — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(productionPlansQuery());
  },
  component: ShgProduction,
});

type PlanStatus = "draft" | "active" | "done";

/** Coordinator production planning: stage-by-stage plans recorded per order. */
function ShgProduction() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: plans } = useSuspenseQuery(productionPlansQuery());
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const activeOrders = orders.filter((o) =>
    ["pending", "in_production", "ready_for_dispatch"].includes(o.status),
  );
  const planByOrder = new Map(plans.map((p) => [p.order_id, p]));

  const saveMut = useMutation({
    mutationFn: (input: { orderId: string; stages: ProductionPlanStage[]; status: string }) =>
      saveProductionPlan(input.orderId, input.stages, input.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productionPlans"] });
      toast.success(t("f_updated"));
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">
          {t("shg_production")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("prod_sub")}
        </p>
      </header>

      {activeOrders.length === 0 ? (
        <p className="mt-8 border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          {t("orders_index_empty")}
        </p>
      ) : (
        <div className="mt-8 grid gap-4">
          {activeOrders.map((o) => (
            <OrderPlanCard
              key={o.id}
              orderId={o.id}
              productName={o.product?.name ?? o.customer_reference}
              quantity={o.quantity}
              status={o.status}
              dispatch={o.expected_dispatch_at}
              existing={planByOrder.get(o.id) ?? null}
              open={openOrderId === o.id}
              onToggle={() => setOpenOrderId(openOrderId === o.id ? null : o.id)}
              onSave={(stages, status) =>
                saveMut.mutate({ orderId: o.id, stages, status })
              }
              saving={saveMut.isPending}
            />
          ))}
        </div>
      )}

      <DemoNote className="mt-8">{t("shg_demo")}</DemoNote>
    </div>
  );
}

function OrderPlanCard({
  orderId,
  productName,
  quantity,
  status,
  dispatch,
  existing,
  open,
  onToggle,
  onSave,
  saving,
}: {
  orderId: string;
  productName: string;
  quantity: number;
  status: string;
  dispatch: string | null;
  existing: {
    stages: ProductionPlanStage[];
    status: string;
    updated_at: string;
  } | null;
  open: boolean;
  onToggle: () => void;
  onSave: (stages: ProductionPlanStage[], status: string) => void;
  saving: boolean;
}) {
  const { t } = useLang();
  const [stages, setStages] = useState<ProductionPlanStage[]>(
    existing?.stages.length ? existing.stages : [],
  );
  const [planStatus, setPlanStatus] = useState<PlanStatus>(
    (existing?.status as PlanStatus) ?? "draft",
  );

  const updateStage = (i: number, patch: Partial<ProductionPlanStage>) =>
    setStages((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));

  return (
    <div className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl leading-snug text-foreground">{productName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t("tbl_qty")}: {quantity} · {t("tbl_dispatch")}: {formatDate(dispatch)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <Button variant="outline" size="sm" className="h-9" onClick={onToggle}>
            <ClipboardList className="size-4" aria-hidden="true" />
            {existing
              ? existing.status === "draft"
                ? t("prod_status_draft")
                : existing.status === "active"
                  ? t("prod_status_active")
                  : t("prod_status_done")
              : t("prod_no_plan")}
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          {stages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("prod_no_plan")}</p>
          )}
          {stages.map((st, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input
                value={st.name}
                onChange={(e) => updateStage(i, { name: e.target.value })}
                placeholder={t("prod_stage_ph")}
                className="h-10 min-w-48 flex-1 border-border bg-background"
              />
              <Input
                type="date"
                value={st.target_date ?? ""}
                onChange={(e) => updateStage(i, { target_date: e.target.value || null })}
                className="h-10 w-40 border-border bg-background"
              />
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={st.done}
                  onChange={(e) => updateStage(i, { done: e.target.checked })}
                  className="size-4 shrink-0 accent-primary"
                />
                ✓
              </label>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("fp_remove")}
                onClick={() => setStages((s) => s.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setStages((s) => [...s, { name: "", target_date: null, done: false }])}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("prod_add_stage")}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("prod_status")}</span>
              <Select value={planStatus} onValueChange={(v) => setPlanStatus(v as PlanStatus)}>
                <SelectTrigger className="h-10 w-40 border-border bg-background" aria-label={t("prod_status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t("prod_status_draft")}</SelectItem>
                  <SelectItem value="active">{t("prod_status_active")}</SelectItem>
                  <SelectItem value="done">{t("prod_status_done")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="h-9"
              disabled={saving || stages.every((s) => !s.name.trim())}
              onClick={() =>
                onSave(
                  stages.filter((s) => s.name.trim()),
                  planStatus,
                )
              }
            >
              {t("prod_save")}
            </Button>
            {existing && (
              <p className="text-xs text-muted-foreground">
                {t("prod_last_edit")}: {formatDate(existing.updated_at)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
