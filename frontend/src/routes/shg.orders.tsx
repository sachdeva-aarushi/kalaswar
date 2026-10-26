import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ScrollText, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  artisansQuery,
  assignOrder,
  ordersQuery,
  recordQualityCheck,
  recordShipment,
  updateOrderStatus,
} from "@/lib/data";
import { assessOrderRisk } from "@/lib/risk";
import { formatDate } from "@/lib/money";
import { ORDER_STATUSES, type OrderStatus, type OrderWithDetails } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { OrderRecordTimeline } from "@/components/order-record";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Deterministic radar from recorded dates and assignments — see src/lib/risk.ts. */
function riskOf(o: OrderWithDetails) {
  return assessOrderRisk(
    { status: o.status, expected_dispatch_at: o.expected_dispatch_at, assigned: Boolean(o.artisan) },
    { today: new Date(), leadDays: 3 },
  );
}

export const Route = createFileRoute("/shg/orders")({
  head: () => ({ meta: [{ title: "Orders — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(artisansQuery());
  },
  component: ShgOrders,
});

function ShgOrders() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: artisans } = useSuspenseQuery(artisansQuery());

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<OrderWithDetails | null>(null);
  const [qcOrder, setQcOrder] = useState<OrderWithDetails | null>(null);
  const [shipOrder, setShipOrder] = useState<OrderWithDetails | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["artisanOrders"] });
      queryClient.invalidateQueries({ queryKey: ["artisanSummary"] });
      const ref = orders.find((o) => o.id === vars.id)?.customer_reference ?? "";
      toast.success(t("status_update_success", { ref }));
    },
    onError: () => toast.error(t("common_error")),
  });

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.customer_reference.toLowerCase().includes(s) ||
      (o.product?.name ?? "").toLowerCase().includes(s)
    );
  });

  const statusActions: { status: OrderStatus; label: string }[] = [
    { status: "in_production", label: t("mark_production") },
    { status: "ready_for_dispatch", label: t("mark_ready") },
    { status: "delivered", label: t("mark_delivered") },
    { status: "delayed", label: t("mark_delayed") },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("shg_orders")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("explore_results", { n: filtered.length })}
          </p>
        </div>
      </header>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("orders_search")}
          aria-label={t("orders_search")}
          className="h-10 md:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full md:w-52" aria-label={t("tbl_status")}>
            <SelectValue placeholder={t("orders_all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("orders_all")}</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status_${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-md border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tbl_ref")}</TableHead>
              <TableHead>{t("tbl_product")}</TableHead>
              <TableHead>{t("tbl_artisan")}</TableHead>
              <TableHead className="text-right">{t("tbl_qty")}</TableHead>
              <TableHead>{t("tbl_status")}</TableHead>
              <TableHead>{t("tbl_dispatch")}</TableHead>
              <TableHead className="text-right">{t("tbl_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <Fragment key={o.id}>
              <TableRow>
                <TableCell className="font-medium">{o.customer_reference}</TableCell>
                <TableCell>
                  {o.product?.name}
                  <span className="block text-xs text-muted-foreground">
                    {o.product?.category}
                  </span>
                </TableCell>
                <TableCell>
                  {o.artisan ? (
                    o.artisan.name
                  ) : (
                    <span className="text-muted-foreground">{t("unassigned")}</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{o.quantity}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <StatusBadge status={o.status} />
                    <RiskDot order={o} />
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(o.expected_dispatch_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("view_record")}
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    >
                      <ScrollText className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("qc_title")}
                      onClick={() => setQcOrder(o)}
                    >
                      <ShieldCheck className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={t("ship_title")}
                      onClick={() => setShipOrder(o)}
                    >
                      <Truck className="size-4" aria-hidden="true" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setAssigning(o)}>
                      {o.artisan ? t("reassign") : t("assign")}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label={t("tbl_status")}>
                          <ChevronDown className="size-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t("tbl_status")}</DropdownMenuLabel>
                        {statusActions
                          .filter((a) => a.status !== o.status)
                          .map((a) => (
                            <DropdownMenuItem
                              key={a.status}
                              onClick={() =>
                                statusMutation.mutate({ id: o.id, status: a.status })
                              }
                            >
                              {a.label}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
              {expandedId === o.id && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-secondary/40">
                    <OrderRecordTimeline orderId={o.id} />
                  </TableCell>
                </TableRow>
              )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {t("app_none")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="mt-6 space-y-3 md:hidden">
        {filtered.map((o) => (
          <div key={o.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{o.customer_reference}</p>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {o.product?.name} × {o.quantity}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("tbl_artisan")}:{" "}
              {o.artisan ? o.artisan.name : <span className="text-terracotta">{t("unassigned")}</span>}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("tbl_dispatch")}: {formatDate(o.expected_dispatch_at)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("view_record")}
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <ScrollText className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("qc_title")}
                onClick={() => setQcOrder(o)}
              >
                <ShieldCheck className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("ship_title")}
                onClick={() => setShipOrder(o)}
              >
                <Truck className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAssigning(o)}>
                {o.artisan ? t("reassign") : t("assign")}
              </Button>
              <Select
                value=""
                onValueChange={(v) =>
                  statusMutation.mutate({ id: o.id, status: v as OrderStatus })
                }
              >
                <SelectTrigger className="h-8 flex-1 text-xs" aria-label={t("tbl_status")}>
                  <SelectValue placeholder={t("tbl_status")} />
                </SelectTrigger>
                <SelectContent>
                  {statusActions
                    .filter((a) => a.status !== o.status)
                    .map((a) => (
                      <SelectItem key={a.status} value={a.status}>
                        {a.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {expandedId === o.id && (
              <div className="mt-4 border-t border-border pt-4">
                <OrderRecordTimeline orderId={o.id} />
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-muted-foreground">{t("app_none")}</p>
        )}
      </div>

      {assigning && (
        <AssignDialog
          order={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
      {qcOrder && <QcDialog order={qcOrder} onClose={() => setQcOrder(null)} />}
      {shipOrder && <DispatchDialog order={shipOrder} onClose={() => setShipOrder(null)} />}
    </div>
  );
}

/** Radar dot: amber outline for a warning, solid terracotta when overdue. */
function RiskDot({ order }: { order: OrderWithDetails }) {
  const { t } = useLang();
  const risk = riskOf(order);
  if (risk.level === "low") return null;
  const reason = risk.reasons
    .map((r) => (r === "due_soon" ? t("risk_due_soon", { n: risk.daysRemaining ?? 0, plural: (risk.daysRemaining ?? 0) === 1 ? "" : "s" }) : t(`risk_${r}`)))
    .join(" · ");
  return (
    <span
      role="img"
      aria-label={reason}
      title={reason}
      className={cn(
        "size-2 shrink-0 rounded-full",
        risk.level === "high" ? "bg-terracotta" : "border-2 border-terracotta bg-transparent",
      )}
    />
  );
}

function QcDialog({ order, onClose }: { order: OrderWithDetails; onClose: () => void }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [result, setResult] = useState("pass");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      recordQualityCheck({
        order_id: order.id,
        result,
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderEvents"] });
      queryClient.invalidateQueries({ queryKey: ["orderEventsAll"] });
      queryClient.invalidateQueries({ queryKey: ["orderQualityChecks"] });
      toast.success(t("qc_done"));
      onClose();
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("qc_title")}</DialogTitle>
          <DialogDescription>
            {order.customer_reference} · {order.product?.name} × {order.quantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="qc-result" className="text-sm font-medium">{t("qc_result")}</label>
          <Select value={result} onValueChange={setResult}>
            <SelectTrigger id="qc-result" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">{t("qc_pass")}</SelectItem>
              <SelectItem value="rework">{t("qc_rework")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="qc-notes" className="text-sm font-medium">{t("qc_notes")}</label>
          <Input id="qc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? t("f_saving") : t("qc_record")}
          </Button>
          <Button variant="ghost" onClick={onClose}>{t("f_cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DispatchDialog({ order, onClose }: { order: OrderWithDetails; onClose: () => void }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("dispatched");
  const [carrier, setCarrier] = useState("");
  const [trackingRef, setTrackingRef] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      recordShipment({
        order_id: order.id,
        status,
        carrier: carrier.trim() ? carrier.trim() : null,
        tracking_ref: trackingRef.trim() ? trackingRef.trim() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderEvents"] });
      queryClient.invalidateQueries({ queryKey: ["orderEventsAll"] });
      queryClient.invalidateQueries({ queryKey: ["orderShipments"] });
      toast.success(t("ship_done"));
      onClose();
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("ship_title")}</DialogTitle>
          <DialogDescription>
            {order.customer_reference} · {order.product?.name} × {order.quantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="ship-status" className="text-sm font-medium">{t("ship_status")}</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="ship-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="packed">{t("ship_packed")}</SelectItem>
              <SelectItem value="dispatched">{t("ship_dispatched")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ship-carrier" className="text-sm font-medium">{t("ship_carrier")}</label>
          <Input id="ship-carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ship-tracking" className="text-sm font-medium">{t("ship_tracking")}</label>
          <Input id="ship-tracking" value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">{t("ship_demo")}</p>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? t("f_saving") : t("ship_record")}
          </Button>
          <Button variant="ghost" onClick={onClose}>{t("f_cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  order,
  onClose,
}: {
  order: OrderWithDetails;
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [artisanId, setArtisanId] = useState(order.artisan?.id ?? "");
  const { data: artisans } = useSuspenseQuery(artisansQuery());

  const mutation = useMutation({
    mutationFn: () => assignOrder(order.id, artisanId),
    onSuccess: (_d, _v, _c) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["artisanOrders"] });
      queryClient.invalidateQueries({ queryKey: ["artisanSummary"] });
      toast.success(
        t("assign_success", {
          ref: order.customer_reference,
          name: artisans.find((a) => a.id === artisanId)?.name ?? "",
        }),
      );
      onClose();
    },
    onError: () => toast.error(t("assign_error")),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("assign_title", { ref: order.customer_reference })}
          </DialogTitle>
          <DialogDescription>
            {order.product?.name} × {order.quantity}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="assign-artisan" className="text-sm font-medium">
            {t("assign_pick")}
          </label>
          <Select value={artisanId} onValueChange={setArtisanId}>
            <SelectTrigger id="assign-artisan" className="w-full">
              <SelectValue placeholder={t("assign_pick")} />
            </SelectTrigger>
            <SelectContent>
              {artisans.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} — {a.craft}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!artisanId || mutation.isPending}>
            {mutation.isPending ? t("f_saving") : t("assign_save")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("f_cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
