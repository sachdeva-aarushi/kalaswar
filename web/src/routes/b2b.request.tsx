import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buyersQuery, buyerRequestsQuery, buyerRequestQuery, createBuyerRequest, fetchBuyerRequest, updateBuyerRequest } from "@/lib/data";
import { prefillBriefForReorder, validateBrief } from "@/lib/b2b";

export const Route = createFileRoute("/b2b/request")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["edit"] === "string" ? { edit: search["edit"] } : {}),
    ...(typeof search["from"] === "string" ? { from: search["from"] } : {}),
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(buyersQuery());
    void context.queryClient.ensureQueryData(buyerRequestsQuery());
  },
  component: RequestFormPage,
});

const EMPTY_FORM = {
  title: "",
  craft_category: "",
  product_references: "",
  quantity: "",
  budget_per_unit: "",
  budget_total: "",
  intended_use: "",
  customisation: "",
  materials: "",
  dimensions: "",
  packaging: "",
  branding: "",
  sample_requirements: "",
  deadline: "",
  delivery_location: "",
  reference_links: "",
  notes: "",
};

const FIELD_LABELS: Record<string, string> = {
  title: "b2b_f_title",
  craft_category: "b2b_f_category",
  quantity: "b2b_f_qty",
  deadline: "b2b_f_deadline",
  delivery_location: "b2b_f_delivery",
};

const OPTIONAL_FIELDS = [
  ["product_references", "b2b_f_refs"],
  ["budget_per_unit", "b2b_f_budget_unit"],
  ["budget_total", "b2b_f_budget_total"],
  ["intended_use", "b2b_f_use"],
  ["customisation", "b2b_f_custom"],
  ["materials", "b2b_f_materials"],
  ["dimensions", "b2b_f_dims"],
  ["packaging", "b2b_f_packaging"],
  ["branding", "b2b_f_branding"],
  ["sample_requirements", "b2b_f_sample"],
  ["reference_links", "b2b_f_ref_links"],
  ["notes", "b2b_f_notes"],
] as const;

const REQUIRED_FIELDS = [
  ["title", "b2b_f_title"],
  ["craft_category", "b2b_f_category"],
  ["quantity", "b2b_f_qty"],
  ["deadline", "b2b_f_deadline"],
  ["delivery_location", "b2b_f_delivery"],
] as const;

function RequestFormPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { edit, from } = Route.useSearch();
  const { data: buyers } = useSuspenseQuery(buyersQuery());

  const editQ = useQuery({
    queryKey: ["buyerRequest", edit ?? ""],
    queryFn: () => fetchBuyerRequest(edit!),
    enabled: !!edit,
  });
  const existing = editQ.data ?? null;

  const [form, setForm] = useState(EMPTY_FORM);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  /* Reorder prefill: reuse the specification as a starting point. */
  useEffect(() => {
    if (!from) return;
    const list = queryClient.getQueryData(buyerRequestsQuery().queryKey) as
      | { id: string; structured: Record<string, unknown> }[]
      | undefined;
    const source = list?.find((r) => r.id === from);
    if (source) {
      const brief = prefillBriefForReorder(source.structured ?? {});
      const merged = { ...EMPTY_FORM } as Record<string, string>;
      for (const k of Object.keys(merged)) {
        if (brief[k] != null) merged[k] = String(brief[k]);
      }
      setForm(merged as typeof EMPTY_FORM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  useEffect(() => {
    if (!existing) return;
    const brief = { ...(existing.structured ?? {}) } as Record<string, unknown>;
    brief["title"] = existing.title;
    const merged = { ...EMPTY_FORM } as Record<string, string>;
    for (const k of Object.keys(merged)) {
      if (brief[k] != null) merged[k] = String(brief[k]);
    }
    setForm(merged as typeof EMPTY_FORM);
  }, [existing]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const buildBrief = (): Record<string, unknown> => {
    const brief: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      brief[k] = v.trim() === "" ? null : k === "quantity" || k === "budget_per_unit" || k === "budget_total" ? Number(v) || null : v.trim();
    }
    if (edit) brief["request_code"] = undefined;
    return brief;
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["buyerRequests"] });
    void queryClient.invalidateQueries({ queryKey: ["buyerRequest"] });
  };

  const saveMut = useMutation({
    mutationFn: async (submit: boolean) => {
      const buyerId = buyers[0]?.id;
      if (!buyerId) throw new Error(t("b2b_needs_profile"));
      const brief = buildBrief();
      if (edit && existing) {
        const status = submit ? "submitted" : existing.status === "draft" ? "draft" : existing.status;
        await updateBuyerRequest(existing.id, {
          title: String(brief["title"] ?? ""),
          structured: brief,
          status,
        });
        return { id: existing.id, submit };
      }
      const created = await createBuyerRequest({
        buyer_id: buyerId,
        title: String(brief["title"] ?? ""),
        structured: brief,
        status: submit ? "submitted" : "draft",
      });
      return { id: created.id, submit };
    },
    onSuccess: ({ id, submit }) => {
      invalidate();
      if (submit) {
        setNote(t("b2b_submitted_note"));
        void navigate({ to: "/b2b/requests/$id", params: { id } });
      } else {
        setNote(t("b2b_draft_saved"));
      }
      setError(null);
    },
    onError: (e) => setError((e as Error).message),
  });

  const handleSubmit = (submit: boolean) => {
    const brief = buildBrief();
    const validation = validateBrief(brief);
    setInvalidFields([...validation.missing, ...validation.invalid]);
    if (submit && !validation.ok) {
      setError(validation.missing.length > 0 ? t("b2b_validation_missing") : t("b2b_validation_invalid"));
      return;
    }
    setError(null);
    saveMut.mutate(submit);
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground sm:text-4xl">{edit ? t("b2b_request_edit") : t("b2b_request_new")}</h1>
        {from && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("b2b_reorder_note")}</p>}
      </header>

      <form
        className="grid gap-x-6 gap-y-5 border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg sm:grid-cols-2 sm:p-8 [&_input]:mt-2 [&_input]:min-h-11 [&_input]:rounded-none [&_input]:border-border [&_input]:bg-background [&_textarea]:mt-2 [&_textarea]:rounded-none [&_textarea]:border-border [&_textarea]:bg-background"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(true);
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="r-title">
            {t("b2b_f_title")} <span className="text-destructive">({t("b2b_required")})</span>
          </Label>
          <Input id="r-title" value={form.title} onChange={set("title")} />
        </div>
        <div>
          <Label htmlFor="r-cat">
            {t("b2b_f_category")} <span className="text-destructive">({t("b2b_required")})</span>
          </Label>
          <Input id="r-cat" value={form.craft_category} onChange={set("craft_category")} />
        </div>
        <div>
          <Label htmlFor="r-qty">
            {t("b2b_f_qty")} <span className="text-destructive">({t("b2b_required")})</span>
          </Label>
          <Input id="r-qty" type="number" min={1} value={form.quantity} onChange={set("quantity")} />
        </div>
        <div>
          <Label htmlFor="r-deadline">
            {t("b2b_f_deadline")} <span className="text-destructive">({t("b2b_required")})</span>
          </Label>
          <Input id="r-deadline" type="date" value={form.deadline} onChange={set("deadline")} />
        </div>
        <div>
          <Label htmlFor="r-delivery">
            {t("b2b_f_delivery")} <span className="text-destructive">({t("b2b_required")})</span>
          </Label>
          <Input id="r-delivery" value={form.delivery_location} onChange={set("delivery_location")} />
        </div>

        {OPTIONAL_FIELDS.map(([key, label]) =>
          key === "notes" || key === "dimensions" || key === "customisation" || key === "sample_requirements" ? (
            <div key={key} className="sm:col-span-2">
              <Label htmlFor={`r-${key}`}>{t(label)}</Label>
              <Textarea id={`r-${key}`} value={form[key]} onChange={set(key)} rows={2} />
            </div>
          ) : (
            <div key={key}>
              <Label htmlFor={`r-${key}`}>{t(label)}</Label>
              <Input id={`r-${key}`} value={form[key]} onChange={set(key)} />
            </div>
          ),
        )}

        <div className="sm:col-span-2 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="submit" disabled={saveMut.isPending}>
            {t("b2b_submit")}
          </Button>
          <Button type="button" variant="outline" disabled={saveMut.isPending} onClick={() => handleSubmit(false)}>
            {t("b2b_save_draft")}
          </Button>
          {edit && (
            <Link to="/b2b/requests/$id" params={{ id: edit }} className="text-sm text-muted-foreground underline underline-offset-4">
              {t("b2b_nav_requests")}
            </Link>
          )}
        </div>

        {invalidFields.length > 0 && (
          <p className="sm:col-span-2 text-sm text-destructive">
            {t("b2b_validation_missing")} ({invalidFields.map((f) => t(FIELD_LABELS[f] ?? f)).join(", ")})
          </p>
        )}
        {note && (
          <p className="flex items-center gap-2 text-sm text-primary sm:col-span-2">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {note}
          </p>
        )}
        {error && (
          <p className="flex items-center gap-2 text-sm text-destructive sm:col-span-2">
            <Info className="size-4" aria-hidden="true" />
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
