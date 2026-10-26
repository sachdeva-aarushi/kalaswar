import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, Plus } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  createMaterial,
  materialsAllQuery,
  shgsQuery,
  updateMaterial,
  type MaterialWithShg,
} from "@/lib/data";
import { formatDate } from "@/lib/money";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export const Route = createFileRoute("/shg/inventory")({
  head: () => ({ meta: [{ title: "Inventory — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(materialsAllQuery());
    void context.queryClient.ensureQueryData(shgsQuery());
  },
  component: ShgInventory,
});

function ShgInventory() {
  const { t } = useLang();
  const { data: materials } = useSuspenseQuery(materialsAllQuery());
  const { data: shgs } = useSuspenseQuery(shgsQuery());

  const isLow = (m: MaterialWithShg) =>
    m.low_stock_threshold !== null && Number(m.quantity) <= Number(m.low_stock_threshold);
  const lowCount = materials.filter(isLow).length;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("inv_title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("inv_sub")}</p>
        </div>
        <AddMaterialDialog
          shgs={shgs.map((s) => ({ id: s.id, name: s.name }))}
        />
      </header>

      {lowCount > 0 && (
        <p className="mt-4 rounded-md border border-terracotta/40 bg-card px-4 py-3 text-sm text-terracotta">
          {t("inv_low_banner", { n: lowCount })}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inv_material")}</TableHead>
              <TableHead>{t("exp_shg")}</TableHead>
              <TableHead>{t("inv_unit")}</TableHead>
              <TableHead className="text-right">{t("inv_qty")}</TableHead>
              <TableHead className="text-right">{t("inv_threshold")}</TableHead>
              <TableHead>{t("inv_updated")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <MaterialRow key={m.id} material={m} low={isLow(m)} />
            ))}
            {materials.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("inv_none")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DemoNote className="mt-8">{t("inv_note")}</DemoNote>
    </div>
  );
}

function MaterialRow({ material: m, low }: { material: MaterialWithShg; low: boolean }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(String(m.quantity));
  const [threshold, setThreshold] = useState(m.low_stock_threshold === null ? "" : String(m.low_stock_threshold));
  const dirty =
    qty !== String(m.quantity) || threshold !== (m.low_stock_threshold === null ? "" : String(m.low_stock_threshold));

  const mutation = useMutation({
    mutationFn: () =>
      updateMaterial(m.id, {
        quantity: Number(qty) || 0,
        low_stock_threshold: threshold === "" ? null : Number(threshold),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialsAll"] });
      queryClient.invalidateQueries({ queryKey: ["collectiveSnapshots"] });
      toast.success(t("inv_saved"));
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <TableRow>
      <TableCell className="font-medium">
        {m.name}
        {low && (
          <span className="ml-2 rounded-sm bg-terracotta/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-terracotta">
            {t("inv_low")}
          </span>
        )}
      </TableCell>
      <TableCell className="text-sm">{m.shg_name ?? "—"}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{m.unit}</TableCell>
      <TableCell className="text-right">
        <Input
          inputMode="decimal"
          aria-label={`${m.name}: ${t("inv_qty")}`}
          className={`h-8 w-20 text-right text-sm ${low ? "border-terracotta" : ""}`}
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </TableCell>
      <TableCell className="text-right">
        <Input
          inputMode="decimal"
          aria-label={`${m.name}: ${t("inv_threshold")}`}
          className="h-8 w-20 text-right text-sm"
          placeholder="—"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
        />
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDate(m.updated_at)}
        {dirty && (
          <Button
            size="sm"
            variant="outline"
            className="ml-2 h-7"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? t("f_saving") : t("f_save")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function AddMaterialDialog({ shgs }: { shgs: { id: string; name: string }[] }) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [shgId, setShgId] = useState(shgs[0]?.id ?? "");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [qty, setQty] = useState("");
  const [threshold, setThreshold] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createMaterial({
        shg_id: shgId,
        name,
        unit,
        quantity: Number(qty) || 0,
        low_stock_threshold: threshold === "" ? null : Number(threshold),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialsAll"] });
      queryClient.invalidateQueries({ queryKey: ["collectiveSnapshots"] });
      toast.success(t("inv_saved"));
      setName("");
      setQty("");
      setThreshold("");
      setOpen(false);
    },
    onError: () => toast.error(t("common_error")),
  });

  const valid = shgId && name.trim() && Number(qty) >= 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          {t("inv_add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("inv_add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mat-shg">{t("exp_shg")}</Label>
            <Select value={shgId} onValueChange={setShgId}>
              <SelectTrigger id="mat-shg" className="w-full">
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
            <Label htmlFor="mat-name">{t("inv_material")}</Label>
            <Input id="mat-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mat-unit">{t("inv_unit")}</Label>
              <Input id="mat-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-qty">{t("inv_qty")}</Label>
              <Input
                id="mat-qty"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mat-threshold">{t("inv_threshold")}</Label>
              <Input
                id="mat-threshold"
                inputMode="decimal"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? t("f_saving") : t("inv_add")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("f_cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
