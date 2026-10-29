import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { useLang } from "@/lib/i18n";
import { artisansQuery, ordersQuery, productsQuery, saveProduct } from "@/lib/data";
import { CATEGORIES } from "@/lib/constants";
import { estimatePrice } from "@/lib/price-estimate";
import { formatDate, formatINR } from "@/lib/money";
import type { ProductWithArtisan } from "@/lib/types";
import { CloudinaryUploader, type UploadedImage } from "@/components/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/shg/products")({
  head: () => ({ meta: [{ title: "Products — Coordinator Workspace — Kalaswar" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(productsQuery({}));
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(ordersQuery());
  },
  validateSearch: (search: Record<string, unknown>) => ({
    new: Boolean(search["new"]),
    edit: typeof search["edit"] === "string" ? search["edit"] : undefined,
  }),
  component: ShgProducts,
});

/** `?new=1` opens the create dialog directly — the voice assistant deep-links here. */
function ShgProducts() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: products } = useSuspenseQuery(productsQuery({}));
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const [editing, setEditing] = useState<ProductWithArtisan | null>(null);
  const [creating, setCreating] = useState(false);
  const openNew = Route.useSearch({ select: (s) => s.new });
  const editId = Route.useSearch({ select: (s) => s.edit });

  useEffect(() => {
    if (openNew) setCreating(true);
  }, [openNew]);

  // The voice agent deep-links here after publishing her piece, so she can
  // take its photograph herself and press save.
  useEffect(() => {
    if (!editId || editing) return;
    const found = products.find((p) => p.id === editId);
    if (found) setEditing(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, products]);

  const availabilityMutation = useMutation({
    mutationFn: (p: ProductWithArtisan) =>
      saveProduct({
        id: p.id,
        artisan_id: p.artisan_id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: Number(p.price),
        availability: !p.availability,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    onError: () => toast.error(t("common_error")),
  });

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground md:text-4xl">{t("shg_products")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("explore_results", { n: products.length })}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" aria-hidden="true" />
          {t("products_new")}
        </Button>
      </header>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-md border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">{t("f_image")}</TableHead>
              <TableHead>{t("f_name")}</TableHead>
              <TableHead>{t("f_artisan")}</TableHead>
              <TableHead>{t("f_category")}</TableHead>
              <TableHead className="text-right">{t("f_price")}</TableHead>
              <TableHead>{t("f_availability")}</TableHead>
              <TableHead>{t("prod_last_edit")}</TableHead>
              <TableHead className="text-right">{t("tbl_actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="size-10 rounded object-cover" />
                  ) : (
                    <div className="size-10 rounded border border-dashed border-border" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-sm">{p.artisan?.name}</TableCell>
                <TableCell className="text-sm">{p.category}</TableCell>
                <TableCell className="text-right tabular-nums">{formatINR(p.price)}</TableCell>
                <TableCell>
                  <Switch
                    checked={p.availability}
                    onCheckedChange={() => availabilityMutation.mutate(p)}
                    aria-label={`${p.name}: ${t("f_availability")}`}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {p.updated_at
                    ? `${formatDate(p.updated_at)}${p.updated_by ? ` · ${p.updated_by}` : ""}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    {t("products_edit")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="mt-6 space-y-3 md:hidden">
        {products.map((p) => (
          <div key={p.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              {p.image_url && (
                <img src={p.image_url} alt="" className="size-14 rounded object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.artisan?.name} · {p.category}
                </p>
                <p className="mt-0.5 text-sm tabular-nums">{formatINR(p.price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch
                  checked={p.availability}
                  onCheckedChange={() => availabilityMutation.mutate(p)}
                  aria-label={`${p.name}: ${t("f_availability")}`}
                />
                <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                  <Pencil className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <ProductFormDialog
          product={editing}
          artisans={artisans.map((a) => ({ id: a.id, name: `${a.name} — ${a.craft}` }))}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ProductFormDialog({
  product,
  artisans,
  onClose,
}: {
  product: ProductWithArtisan | null;
  artisans: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? CATEGORIES[0]);
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [artisanId, setArtisanId] = useState(product?.artisan_id ?? "");
  const [availability, setAvailability] = useState(product?.availability ?? true);
  const [image, setImage] = useState<UploadedImage | null>(
    product?.image_url && product?.image_public_id
      ? { url: product.image_url, publicId: product.image_public_id }
      : null,
  );
  const [keepExistingImage] = useState(!product?.image_url || Boolean(product?.image_public_id));
  void keepExistingImage;

  const mutation = useMutation({
    mutationFn: () =>
      saveProduct({
        ...(product ? { id: product.id } : {}),
        artisan_id: artisanId,
        name,
        description,
        category,
        price: Number(price) || 0,
        availability,
        ...(image
          ? { image_url: image.url, image_public_id: image.publicId }
          : product
            ? {}
            : { image_url: null, image_public_id: null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["artisanProducts"] });
      toast.success(product ? t("f_updated") : t("f_created"));
      onClose();
    },
    onError: () => toast.error(t("f_error")),
  });

  const valid = name.trim() && artisanId && Number(price) >= 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {product ? t("products_edit") : t("products_new")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">{t("f_name")}</Label>
            <Input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-desc">{t("f_description")}</Label>
            <Textarea
              id="pf-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-price">{t("f_price")}</Label>
              <Input
                id="pf-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-category">{t("f_category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="pf-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Transparent price estimation — arithmetic on her own figures */}
          <PriceEstimator
            onUse={(v) => setPrice(String(v))}
          />
          <div className="space-y-1.5">
            <Label htmlFor="pf-artisan">{t("f_artisan")}</Label>
            <Select value={artisanId} onValueChange={setArtisanId}>
              <SelectTrigger id="pf-artisan" className="w-full">
                <SelectValue placeholder={t("assign_pick")} />
              </SelectTrigger>
              <SelectContent>
                {artisans.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("f_image")}</Label>
            <CloudinaryUploader value={image} onChange={setImage} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <Label htmlFor="pf-avail" className="cursor-pointer">
              {t("f_availability")}
            </Label>
            <Switch id="pf-avail" checked={availability} onCheckedChange={setAvailability} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? t("f_saving") : t("f_save")}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t("f_cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PriceEstimator({ onUse }: { onUse: (value: number) => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState("");
  const [hours, setHours] = useState("");
  const [rate, setRate] = useState("");
  const [overhead, setOverhead] = useState("10");
  const [margin, setMargin] = useState("30");

  const estimate = estimatePrice({
    materialsCost: Number(materials) || 0,
    labourHours: Number(hours) || 0,
    labourRatePerHour: Number(rate) || 0,
    overheadPercent: Number(overhead) || 0,
    marginPercent: Number(margin) || 0,
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("est_title")}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{t("est_title")}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {t("f_cancel")}
        </button>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("est_sub")}</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="est-materials" className="text-xs">{t("est_materials")}</Label>
          <Input
            id="est-materials"
            inputMode="decimal"
            className="h-9"
            value={materials}
            onChange={(e) => setMaterials(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-hours" className="text-xs">{t("est_hours")}</Label>
          <Input
            id="est-hours"
            inputMode="decimal"
            className="h-9"
            value={hours}
            onChange={(e) => setHours(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="est-rate" className="text-xs">{t("est_rate")}</Label>
          <Input
            id="est-rate"
            inputMode="decimal"
            className="h-9"
            value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="est-overhead" className="text-xs">{t("est_overhead")}</Label>
            <Input
              id="est-overhead"
              inputMode="decimal"
              className="h-9"
              value={overhead}
              onChange={(e) => setOverhead(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="est-margin" className="text-xs">{t("est_margin")}</Label>
            <Input
              id="est-margin"
              inputMode="decimal"
              className="h-9"
              value={margin}
              onChange={(e) => setMargin(e.target.value.replace(/[^0-9.]/g, ""))}
            />
          </div>
        </div>
      </div>
      {estimate.valid ? (
        <div className="mt-3 rounded-md bg-secondary p-3">
          <p className="font-display text-2xl tabular-nums text-foreground">
            {formatINR(estimate.suggested)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("est_floor")}: {formatINR(estimate.floor)} · {t("est_materials")} {formatINR(estimate.materials)} · {t("est_rate")} {formatINR(estimate.labour)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("est_basis", { o: overhead, m: margin })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              onUse(estimate.suggested);
              setOpen(false);
            }}
          >
            {t("est_use", { n: estimate.suggested })}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-terracotta">{t("est_missing")}</p>
      )}
    </div>
  );
}
