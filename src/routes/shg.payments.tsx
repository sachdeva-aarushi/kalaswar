import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  artisansQuery,
  ordersQuery,
  paymentsQuery,
  recordPayment,
  saveUpiId,
  shgsQuery,
} from "@/lib/data";
import { isValidUpiId } from "@/lib/upi";
import { formatINR, formatDate } from "@/lib/money";
import { downloadCsv, toCsv } from "@/lib/csv";
import type { PaymentDirection, PaymentWithDetails } from "@/lib/types";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/shg/payments")({
  head: () => ({
    meta: [
      { title: "Payments — Coordinator Workspace — Kalaswar" },
      {
        name: "description",
        content:
          "UPI QR payment records for self-help-group collectives — customer payments, artisan payouts and the collective's UPI ID.",
      },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(paymentsQuery());
    void context.queryClient.ensureQueryData(shgsQuery());
    void context.queryClient.ensureQueryData(ordersQuery());
    void context.queryClient.ensureQueryData(artisansQuery());
  },
  component: ShgPayments,
});

function ShgPayments() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: payments } = useSuspenseQuery(paymentsQuery());
  const { data: shgs } = useSuspenseQuery(shgsQuery());
  const { data: orders } = useSuspenseQuery(ordersQuery());
  const { data: artisans } = useSuspenseQuery(artisansQuery());

  return (
    <div>
      <header>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("shg_payments")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("f_upi_note")}</p>
      </header>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <UpiSettingsCard shgs={shgs.map((s) => ({ id: s.id, name: s.name, upi_id: s.upi_id ?? null }))} />
        <RecordPaymentCard
          orders={orders.map((o) => ({ id: o.id, ref: o.customer_reference }))}
          artisans={artisans.map((a) => ({ id: a.id, name: a.name, shgId: a.shg_id }))}
        />
      </div>

      <section className="mt-10" aria-label={t("shg_payments")}>
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl text-foreground">{t("shg_payments")}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = toCsv(payments, [
                { key: "created_at", label: "When" },
                { key: "direction", label: "Type" },
                { key: "order_reference", label: "Order" },
                { key: "artisan_name", label: "Artisan" },
                { key: "shg_name", label: "Collective" },
                { key: "amount", label: "Amount (INR)" },
                { key: "status", label: "Status" },
                { key: "note", label: "Note" },
              ]);
              downloadCsv("kalaswar-payments.csv", csv);
              toast.success(t("export_done"));
            }}
          >
            <Download className="size-4" aria-hidden="true" />
            CSV
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tbl_ref")}</TableHead>
                <TableHead>{t("tbl_direction")}</TableHead>
                <TableHead>{t("tbl_artisan")}</TableHead>
                <TableHead className="text-right">{t("tbl_amount")}</TableHead>
                <TableHead>{t("tbl_status")}</TableHead>
                <TableHead>{t("event_placed")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.order_reference ?? "—"}</TableCell>
                  <TableCell>
                    {p.direction === "customer_payment" ? t("pay_in") : t("pay_out")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.artisan_name ?? p.shg_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatINR(p.amount)}</TableCell>
                  <TableCell className="text-sm">
                    {p.status === "paid" ? t("pay_status_paid") : t("pay_status_recorded")}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t("pay_none")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <DemoNote className="mt-8">{t("demo_note")}</DemoNote>
    </div>
  );
}

function UpiSettingsCard({
  shgs,
}: {
  shgs: { id: string; name: string; upi_id: string | null }[];
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [shgId, setShgId] = useState(shgs[0]?.id ?? "");
  const current = shgs.find((s) => s.id === shgId);
  const [upiId, setUpiId] = useState(current?.upi_id ?? "");
  const [key, setKey] = useState(shgId);

  // Re-seed the input when the selected collective changes.
  if (shgId !== key) {
    setKey(shgId);
    setUpiId(shgs.find((s) => s.id === shgId)?.upi_id ?? "");
  }

  const mutation = useMutation({
    mutationFn: () => saveUpiId(shgId, upiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shgs"] });
      queryClient.invalidateQueries({ queryKey: ["artisans"] });
      toast.success(t("upi_saved"));
    },
    onError: () => toast.error(t("common_error")),
  });

  const valid = isValidUpiId(upiId);

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Wallet className="size-4 text-primary" aria-hidden="true" />
        <h2 className="font-display text-xl text-foreground">{t("f_upi")}</h2>
      </div>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="upi-shg">{t("makers_collective")}</Label>
          <Select value={shgId} onValueChange={setShgId}>
            <SelectTrigger id="upi-shg" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {shgs.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="upi-id">{t("f_upi")}</Label>
          <Input
            id="upi-id"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="naav@bank"
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">{t("f_upi_note")}</p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
          {mutation.isPending ? t("f_saving") : t("f_upi_save")}
        </Button>
        {!valid && upiId.length > 0 && (
          <p className="text-xs text-terracotta">{t("upi_invalid")}</p>
        )}
      </div>
      <DemoNote className="mt-4">{t("pay_demo_note")}</DemoNote>
    </div>
  );
}

function RecordPaymentCard({
  orders,
  artisans,
}: {
  orders: { id: string; ref: string }[];
  artisans: { id: string; name: string; shgId: string }[];
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<PaymentDirection>("customer_payment");
  const [orderId, setOrderId] = useState("none");
  const [artisanId, setArtisanId] = useState("none");
  const [amount, setAmount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      recordPayment({
        direction,
        order_id: direction === "customer_payment" && orderId !== "none" ? orderId : null,
        artisan_id: direction === "artisan_payout" && artisanId !== "none" ? artisanId : null,
        shg_id:
          direction === "artisan_payout" && artisanId !== "none"
            ? (artisans.find((a) => a.id === artisanId)?.shgId ?? null)
            : null,
        amount: Number(amount),
        status: direction === "artisan_payout" ? "paid" : "recorded",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["orderEvents"] });
      queryClient.invalidateQueries({ queryKey: ["orderEventsAll"] });
      toast.success(t("pay_recorded"));
      setOrderId("none");
      setArtisanId("none");
      setAmount("");
    },
    onError: () => toast.error(t("common_error")),
  });

  const valid = Number(amount) > 0;

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <h2 className="font-display text-xl text-foreground">{t("pay_record")}</h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pay-direction">{t("tbl_direction")}</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as PaymentDirection)}>
            <SelectTrigger id="pay-direction" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer_payment">{t("pay_in")}</SelectItem>
              <SelectItem value="artisan_payout">{t("pay_out")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {direction === "customer_payment" ? (
          <div className="space-y-1.5">
            <Label htmlFor="pay-order">{t("pay_order")}</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger id="pay-order" className="w-full">
                <SelectValue placeholder={t("pay_order")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common_all")}</SelectItem>
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.ref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="pay-artisan">{t("pay_artisan")}</Label>
            <Select value={artisanId} onValueChange={setArtisanId}>
              <SelectTrigger id="pay-artisan" className="w-full">
                <SelectValue placeholder={t("pay_artisan")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("common_all")}</SelectItem>
                {artisans.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="pay-amount">{t("f_price")}</Label>
          <Input
            id="pay-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
          {mutation.isPending ? t("f_saving") : t("pay_record")}
        </Button>
      </div>
    </div>
  );
}

export type { PaymentWithDetails };
