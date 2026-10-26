import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { ChevronDown, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { artisansQuery, assignOrder, ordersQuery, updateOrderStatus } from "@/lib/data";
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
                  <StatusBadge status={o.status} />
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
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("view_record")}
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <ScrollText className="size-4" aria-hidden="true" />
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
    </div>
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
