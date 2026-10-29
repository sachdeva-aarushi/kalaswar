import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import {
  materialPricesQuery,
  materialsAllQuery,
  productCostSnapshotsQuery,
  productsQuery,
  recordMaterialPrice,
  saveCostSnapshot,
  saveProductCostInputs,
  saveProductLabourInputs,
  shgsQuery,
  fetchProductCostInputs,
  fetchProductLabourInputs,
  type CostSnapshotRecord,
  type MaterialPriceEntry,
} from "@/lib/data";
import { computeFairPrice, type FairPriceResult } from "@/lib/fairprice";
import { formatINR, formatDate } from "@/lib/money";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shg/pricing")({
  head: () => ({ meta: [{ title: "FairPrice — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(productsQuery());
    void context.queryClient.ensureQueryData(materialPricesQuery());
  },
  component: ShgPricing,
});

interface CostLineDraft {
  material_name: string;
  quantity_per_unit: string;
  unit: string;
  unit_cost_inr: string;
  wastage_percent: string;
}

interface LabourDraft {
  stage_name: string;
  hours_per_unit: string;
  rate_inr_per_hour: string; // "" = rate not recorded — the engine holds the estimate open
  rate_source: string;
}

const STALE_MS = 60 * 24 * 60 * 60 * 1000;

function ShgPricing() {
  const { t } = useLang();
  const { data: products } = useSuspenseQuery(productsQuery());
  const [productId, setProductId] = useState<string>(products[0]?.id ?? "");

  const product = products.find((p) => p.id === productId) ?? products[0];

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("fp_title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("fp_sub")}</p>
        </div>
      </header>

      {products.length === 0 ? (
        <p className="mt-8 rounded-md border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          {t("fp_no_products")}
        </p>
      ) : (
        <>
          <div className="mt-6 max-w-sm space-y-1.5">
            <Label htmlFor="fp-product">{t("fp_pick_product")}</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="fp-product" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {product && <ProductCosting key={product.id} productId={product.id} listingPrice={product.price} />}

          <PriceLedger className="mt-10" />
        </>
      )}

      <DemoNote className="mt-8">{t("fp_never_free")}</DemoNote>
    </div>
  );
}

/* ---------- Product costing editor ---------- */

function ProductCosting({ productId, listingPrice }: { productId: string; listingPrice: number }) {
  const { t } = useLang();
  const queryClient = useQueryClient();

  const inputsQuery = useQuery({
    queryKey: ["productCostInputs", productId],
    queryFn: () => fetchProductCostInputs(productId),
  });
  const labourQuery = useQuery({
    queryKey: ["productLabourInputs", productId],
    queryFn: () => fetchProductLabourInputs(productId),
  });
  const snapshotsQuery = useSuspenseQuery(productCostSnapshotsQuery(productId));

  const [materials, setMaterials] = useState<CostLineDraft[]>([]);
  const [stages, setStages] = useState<LabourDraft[]>([]);
  const [packaging, setPackaging] = useState("");
  const [overhead, setOverhead] = useState("10");
  const [other, setOther] = useState("");
  const [logistics, setLogistics] = useState("");
  const [fee, setFee] = useState("");
  const [mode, setMode] = useState<"margin" | "markup">("margin");
  const [margin, setMargin] = useState("30");
  const [markup, setMarkup] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the editor from recorded inputs once per product.
  useEffect(() => {
    if (inputsQuery.data && labourQuery.data && !hydrated) {
      setMaterials(
        inputsQuery.data.map((l) => ({
          material_name: l.material_name,
          quantity_per_unit: String(l.quantity_per_unit),
          unit: l.unit ?? "",
          unit_cost_inr: String(l.unit_cost_inr),
          wastage_percent: String(l.wastage_percent ?? 0),
        })),
      );
      setStages(
        labourQuery.data.map((s) => ({
          stage_name: s.stage_name,
          hours_per_unit: String(s.hours_per_unit),
          rate_inr_per_hour: s.rate_inr_per_hour === null ? "" : String(s.rate_inr_per_hour),
          rate_source: s.rate_source ?? "",
        })),
      );
      setHydrated(true);
    }
  }, [inputsQuery.data, labourQuery.data, hydrated]);

  const result: FairPriceResult = computeFairPrice({
    materials: materials.map((m) => ({
      name: m.material_name,
      quantityPerUnit: Number(m.quantity_per_unit) || 0,
      unit: m.unit || undefined,
      unitCostInr: Number(m.unit_cost_inr) || 0,
      wastagePercent: Number(m.wastage_percent) || 0,
    })),
    labourStages: stages.map((s) => ({
      name: s.stage_name,
      hoursPerUnit: Number(s.hours_per_unit) || 0,
      rateInrPerHour: s.rate_inr_per_hour === "" ? null : Number(s.rate_inr_per_hour),
      rateSource: s.rate_source || undefined,
    })),
    packagingPerUnitInr: Number(packaging) || 0,
    overheadPercent: Number(overhead) || 0,
    otherPerUnitInr: Number(other) || 0,
    logisticsPerUnitInr: Number(logistics) || 0,
    platformFeePercent: Number(fee) || 0,
    targetMarginPercent: mode === "margin" ? Number(margin) || 0 : 0,
    markupPercent: mode === "markup" ? Number(markup) || 0 : 0,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await saveProductCostInputs(
        productId,
        null,
        materials.map((m) => ({
          material_name: m.material_name,
          quantity_per_unit: Number(m.quantity_per_unit) || 0,
          unit: m.unit || null,
          unit_cost_inr: Number(m.unit_cost_inr) || 0,
          wastage_percent: Number(m.wastage_percent) || 0,
        })),
      );
      await saveProductLabourInputs(
        productId,
        stages.map((s) => ({
          stage_name: s.stage_name,
          hours_per_unit: Number(s.hours_per_unit) || 0,
          rate_inr_per_hour: s.rate_inr_per_hour === "" ? null : Number(s.rate_inr_per_hour),
          rate_source: s.rate_source || null,
        })),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productCostInputs", productId] });
      queryClient.invalidateQueries({ queryKey: ["productLabourInputs", productId] });
      toast.success(t("fp_saved_generic"));
    },
    onError: () => toast.error(t("common_error")),
  });

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      await saveCostSnapshot(productId, {
        materials: result.materialLines,
        labour: result.labourLines,
        packaging: result.packaging,
        overhead: result.overhead,
        other: result.other,
        logistics: result.logistics,
        productionCost: result.productionCost,
        priceMode: result.priceMode,
        suggested: result.suggested,
        floor: result.floor,
        platformFee: result.platformFee,
        estimatedEarningsPerUnit: result.estimatedEarningsPerUnit,
        warnings: result.warnings,
        missing: result.missing,
        savedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productCostSnapshots", productId] });
      toast.success(t("fp_snapshot_saved"));
    },
    onError: () => toast.error(t("common_error")),
  });

  const num = (label: string, value: string, onChange: (v: string) => void, id: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        className="h-9 w-full text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
      />
    </div>
  );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Inputs */}
      <section className="space-y-6">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">{t("fp_materials")}</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setMaterials((m) => [...m, { material_name: "", quantity_per_unit: "", unit: "", unit_cost_inr: "", wastage_percent: "0" }])
              }
            >
              <Plus className="size-4" aria-hidden="true" /> {t("fp_add_material")}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {materials.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">{t("fp_no_lines")}</p>
            )}
            {materials.map((m, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr_0.7fr_auto] items-end gap-2">
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`mn-${i}`}>{t("fp_material_name")}</Label>
                  <Input
                    id={`mn-${i}`}
                    placeholder={t("fp_material_name")}
                    className="h-9 text-sm"
                    value={m.material_name}
                    onChange={(e) =>
                      setMaterials((arr) => arr.map((x, j) => (j === i ? { ...x, material_name: e.target.value } : x)))
                    }
                  />
                </div>
                {num("", m.quantity_per_unit, (v) => setMaterials((arr) => arr.map((x, j) => (j === i ? { ...x, quantity_per_unit: v } : x))), `mq-${i}`)}
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`mu-${i}`}>{t("fp_unit")}</Label>
                  <Input id={`mu-${i}`} placeholder={t("fp_unit")} className="h-9 text-sm" value={m.unit}
                    onChange={(e) => setMaterials((arr) => arr.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
                </div>
                {num("", m.unit_cost_inr, (v) => setMaterials((arr) => arr.map((x, j) => (j === i ? { ...x, unit_cost_inr: v } : x))), `mc-${i}`)}
                {num("", m.wastage_percent, (v) => setMaterials((arr) => arr.map((x, j) => (j === i ? { ...x, wastage_percent: v } : x))), `mw-${i}`)}
                <Button size="icon" variant="ghost" aria-label={t("fp_remove")}
                  onClick={() => setMaterials((arr) => arr.filter((_, j) => j !== i))}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">{t("fp_labour")}</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setStages((s) => [...s, { stage_name: "", hours_per_unit: "", rate_inr_per_hour: "", rate_source: "" }])
              }
            >
              <Plus className="size-4" aria-hidden="true" /> {t("fp_add_stage")}
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {stages.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">{t("fp_no_lines")}</p>
            )}
            {stages.map((s, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_0.7fr_0.9fr_1fr_auto] items-end gap-2">
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`sn-${i}`}>{t("fp_stage_name")}</Label>
                  <Input id={`sn-${i}`} placeholder={t("fp_stage_name")} className="h-9 text-sm" value={s.stage_name}
                    onChange={(e) => setStages((arr) => arr.map((x, j) => (j === i ? { ...x, stage_name: e.target.value } : x)))} />
                </div>
                {num("", s.hours_per_unit, (v) => setStages((arr) => arr.map((x, j) => (j === i ? { ...x, hours_per_unit: v } : x))), `sh-${i}`)}
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`sr-${i}`}>{t("fp_rate")}</Label>
                  <Input
                    id={`sr-${i}`}
                    placeholder={s.rate_inr_per_hour === "" ? t("fp_rate_missing") : t("fp_rate")}
                    inputMode="decimal"
                    className={cn("h-9 text-sm", s.rate_inr_per_hour === "" && Number(s.hours_per_unit) > 0 && "border-terracotta")}
                    value={s.rate_inr_per_hour}
                    onChange={(e) => setStages((arr) => arr.map((x, j) => (j === i ? { ...x, rate_inr_per_hour: e.target.value.replace(/[^0-9.]/g, "") } : x)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="sr-only" htmlFor={`ss-${i}`}>{t("fp_rate_source")}</Label>
                  <Input id={`ss-${i}`} placeholder={t("fp_rate_source")} className="h-9 text-sm" value={s.rate_source}
                    onChange={(e) => setStages((arr) => arr.map((x, j) => (j === i ? { ...x, rate_source: e.target.value } : x)))} />
                </div>
                <Button size="icon" variant="ghost" aria-label={t("fp_remove")}
                  onClick={() => setStages((arr) => arr.filter((_, j) => j !== i))}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="font-display text-lg">{t("fp_other_costs")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            {num(t("fp_packaging"), packaging, setPackaging, "fp-pack")}
            {num(t("fp_overhead"), overhead, setOverhead, "fp-over")}
            {num(t("fp_other_cost"), other, setOther, "fp-other")}
            {num(t("fp_logistics"), logistics, setLogistics, "fp-log")}
            {num(t("fp_fee"), fee, setFee, "fp-fee")}
          </div>
          <div className="mt-4 space-y-1.5">
            <Label>{t("fp_price_basis")}</Label>
            <div className="flex gap-2">
              {(["margin", "markup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  {m === "margin" ? t("fp_margin") : t("fp_markup")}
                </button>
              ))}
              <div className="w-24">{num("", mode === "margin" ? margin : markup, (v) => (mode === "margin" ? setMargin(v) : setMarkup(v)), "fp-basis")}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? t("f_saving") : t("f_save")}
            </Button>
            <Button size="sm" disabled={snapshotMutation.isPending} onClick={() => snapshotMutation.mutate()}>
              {snapshotMutation.isPending ? t("f_saving") : t("fp_save_snapshot")}
            </Button>
          </div>
        </div>
      </section>

      {/* Breakdown + history */}
      <section className="space-y-6">
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="font-display text-lg">{t("fp_calculated")}</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label={t("fp_materials")} value={formatINR(result.materialCost)} />
            {result.materialLines.map((l, i) => (
              <Row key={i} sub label={l.name} value={formatINR(l.amount)} />
            ))}
            <Row label={t("fp_labour")} value={formatINR(result.labourCost)} />
            {result.labourLines.map((l, i) => (
              <Row
                key={i}
                sub
                label={l.rateMissing ? `${l.name} — ${t("fp_rate_missing")}` : l.name}
                value={l.rateMissing ? "—" : formatINR(l.amount)}
              />
            ))}
            <Row label={t("fp_packaging")} value={formatINR(result.packaging)} />
            <Row label={t("fp_overhead")} value={formatINR(result.overhead)} />
            {result.other > 0 && <Row label={t("fp_other_cost")} value={formatINR(result.other)} />}
            {result.logistics > 0 && <Row label={t("fp_logistics")} value={formatINR(result.logistics)} />}
            <div className="my-2 border-t border-border" />
            <Row label={t("fp_production_cost")} strong value={result.productionCost === null ? "—" : formatINR(result.productionCost)} />
            <Row label={t("fp_floor")} value={result.floor === null ? "—" : formatINR(result.floor)} />
            {result.suggested !== null && <Row label={t("fp_suggested")} strong value={formatINR(result.suggested)} />}
            {result.platformFee !== null && <Row label={t("fp_fee")} value={formatINR(result.platformFee)} />}
            {result.estimatedEarningsPerUnit !== null && <Row label={t("fp_earnings")} value={formatINR(result.estimatedEarningsPerUnit)} />}
            <Row label={t("fp_listing_price")} value={formatINR(listingPrice)} />
          </dl>

          {result.missing.length > 0 && (
            <div className="mt-3 rounded-sm border border-terracotta/40 bg-terracotta/5 p-3 text-xs text-terracotta">
              <p className="font-semibold">{t("fp_incomplete")}</p>
              <ul className="mt-1 list-disc pl-4">
                {result.missing.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          )}
          {result.warnings.map((w, i) => (
            <p key={i} className="mt-2 rounded-sm border border-stone/30 bg-card p-2 text-xs text-muted-foreground">{w}</p>
          ))}
        </div>

        <SnapshotHistory snapshots={snapshotsQuery.data} />
      </section>
    </div>
  );
}

function Row({ label, value, sub, strong }: { label: string; value: string; sub?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", sub && "pl-4 text-muted-foreground", strong && "font-semibold")}>
      <dt className={sub ? "text-xs" : undefined}>{label}</dt>
      <dd className={cn("tabular-nums", sub && "text-xs")}>{value}</dd>
    </div>
  );
}

function SnapshotHistory({ snapshots }: { snapshots: CostSnapshotRecord[] }) {
  const { t } = useLang();
  if (snapshots.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h2 className="font-display text-lg">{t("fp_snapshots")}</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {snapshots.map((s) => {
          const b = s.breakdown as { productionCost?: number; suggested?: number | null };
          return (
            <li key={s.id} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
              <span className="text-xs text-muted-foreground">
                {t("fp_version")} {s.version} · {t("fp_saved_when")} {formatDate(s.created_at)}
              </span>
              <span className="tabular-nums">
                {b.productionCost != null ? formatINR(b.productionCost) : "—"}
                {" → "}
                <span className="font-semibold">{b.suggested != null ? formatINR(b.suggested) : "—"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Material price ledger ---------- */

function PriceLedger({ className }: { className?: string }) {
  const { t } = useLang();
  const { data: prices } = useSuspenseQuery(materialPricesQuery());
  const { data: materials } = useSuspenseQuery(materialsAllQuery());
  const { data: shgs } = useSuspenseQuery(shgsQuery());

  const stale = (p: MaterialPriceEntry) => Date.now() - new Date(p.recorded_at).getTime() > STALE_MS;

  return (
    <div className={cn("rounded-md border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">{t("fp_prices")}</h2>
          <p className="text-xs text-muted-foreground">{t("fp_prices_sub")}</p>
        </div>
        <RecordPriceDialog
          materials={materials.map((m) => ({ id: m.id, name: m.name, unit: m.unit, shg_id: m.shg_id }))}
          shgFallback={shgs[0]?.id ?? ""}
        />
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fp_material_name")}</TableHead>
              <TableHead>{t("fp_unit")}</TableHead>
              <TableHead className="text-right">{t("fp_price")}</TableHead>
              <TableHead>{t("fp_source")}</TableHead>
              <TableHead>{t("fp_recorded")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.slice(0, 15).map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.material_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.unit ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(p.unit_price_inr)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.source ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDate(p.recorded_at)}
                  {stale(p) && (
                    <span className="ml-2 rounded-sm bg-terracotta/10 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-terracotta">
                      {t("fp_stale")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {prices.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  {t("fp_record_price")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecordPriceDialog({
  materials,
  shgFallback,
}: {
  materials: { id: string; name: string; unit: string; shg_id: string }[];
  shgFallback: string;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [source, setSource] = useState("");

  const chosen = materials.find((m) => m.id === materialId);
  const mutation = useMutation({
    mutationFn: () =>
      recordMaterialPrice({
        shg_id: chosen?.shg_id || shgFallback,
        material_id: chosen?.id ?? null,
        material_name: chosen?.name ?? "",
        unit: chosen?.unit ?? null,
        unit_price_inr: Number(price) || 0,
        source: source || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materialPrices"] });
      toast.success(t("fp_saved_generic"));
      setPrice("");
      setSource("");
      setOpen(false);
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("fp_record_price")}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t("fp_record_price")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mp-material">{t("fp_material_name")}</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger id="mp-material" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-price">{t("fp_price")}</Label>
            <Input id="mp-price" inputMode="decimal" value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mp-source">{t("fp_source")}</Label>
            <Input id="mp-source" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" disabled={!chosen || !price || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? t("f_saving") : t("fp_record_price")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t("f_cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
