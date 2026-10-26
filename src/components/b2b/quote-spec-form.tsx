import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { QuotationSpec } from "@/lib/types";

/* Shared quotation-spec editor for the coordinator workspace:
   prepare a first quotation or record a new version. */

const EMPTY: QuotationSpec = {
  product_spec: "",
  quantity: undefined,
  unit_price_inr: undefined,
  fees_pct: undefined,
  taxes_note: "",
  packaging_logistics: "",
  sample_fee_inr: undefined,
  lead_time_days: undefined,
  delivery_assumptions: "",
  payment_terms: "",
  expiry_date: "",
  included_services: "",
  excluded_services: "",
  limitations: "",
  changes_from_previous: "",
};

const NUMERIC: (keyof QuotationSpec)[] = ["quantity", "unit_price_inr", "fees_pct", "sample_fee_inr", "lead_time_days"];

const TEXT_FIELDS: [keyof QuotationSpec, string, boolean][] = [
  ["product_spec", "qspec_product", true],
  ["taxes_note", "qspec_taxes", false],
  ["packaging_logistics", "qspec_packaging", false],
  ["delivery_assumptions", "qspec_delivery", false],
  ["payment_terms", "qspec_payment", false],
  ["expiry_date", "qspec_expiry", false],
  ["included_services", "qspec_included", false],
  ["excluded_services", "qspec_excluded", false],
  ["limitations", "qspec_limitations", false],
  ["changes_from_previous", "qspec_changes_note", false],
];

export function QuoteSpecForm({
  initial,
  isRevision,
  submitLabel,
  onSubmit,
  pending,
}: {
  initial?: QuotationSpec | undefined;
  isRevision?: boolean | undefined;
  submitLabel: string;
  onSubmit: (spec: QuotationSpec) => void;
  pending?: boolean | undefined;
}) {
  const { t } = useLang();
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const [k] of TEXT_FIELDS) base[k] = initial?.[k] != null ? String(initial[k]) : "";
    return base;
  });
  const [nums, setNums] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const k of NUMERIC) base[k] = initial?.[k] != null ? String(initial[k]) : "";
    return base;
  });

  const build = (): QuotationSpec => {
    const spec: QuotationSpec = { ...(initial ?? {}) };
    for (const [k, v] of Object.entries(form)) {
      (spec as Record<string, unknown>)[k] = v.trim() === "" ? undefined : v;
    }
    for (const k of Object.keys(nums)) {
      const raw = (nums[k] ?? "").trim();
      (spec as Record<string, unknown>)[k] = raw === "" ? undefined : Number(raw);
    }
    if (isRevision) spec["changes_from_previous"] = form["changes_from_previous"] || spec["changes_from_previous"];
    return spec;
  };

  const num = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setNums((f) => ({ ...f, [k]: e.target.value }));
  const txt = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form
      className="grid gap-x-6 gap-y-5 border border-border bg-card p-6 sm:grid-cols-2 [&_input]:mt-2 [&_input]:min-h-11 [&_input]:rounded-none [&_input]:border-border [&_input]:bg-background [&_textarea]:mt-2 [&_textarea]:rounded-none [&_textarea]:border-border [&_textarea]:bg-background"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(build());
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor="qs-product">{t("qspec_product")}</Label>
        <Textarea id="qs-product" value={form["product_spec"]} onChange={txt("product_spec")} rows={2} />
      </div>
      <div>
        <Label htmlFor="qs-qty">{t("qspec_qty")}</Label>
        <Input id="qs-qty" type="number" min={1} value={nums["quantity"] ?? ""} onChange={num("quantity")} />
      </div>
      <div>
        <Label htmlFor="qs-price">{t("qspec_price")}</Label>
        <Input id="qs-price" type="number" min={1} value={nums["unit_price_inr"] ?? ""} onChange={num("unit_price_inr")} />
      </div>
      <div>
        <Label htmlFor="qs-fees">{t("qspec_fees")}</Label>
        <Input id="qs-fees" type="number" min={0} value={nums["fees_pct"] ?? ""} onChange={num("fees_pct")} />
      </div>
      <div>
        <Label htmlFor="qs-sample">{t("qspec_sample_fee")}</Label>
        <Input id="qs-sample" type="number" min={0} value={nums["sample_fee_inr"] ?? ""} onChange={num("sample_fee_inr")} />
      </div>
      <div>
        <Label htmlFor="qs-lead">{t("qspec_lead")}</Label>
        <Input id="qs-lead" type="number" min={1} value={nums["lead_time_days"] ?? ""} onChange={num("lead_time_days")} />
      </div>
      <div>
        <Label htmlFor="qs-expiry">{t("qspec_expiry")}</Label>
        <Input id="qs-expiry" type="date" value={form["expiry_date"]} onChange={txt("expiry_date")} />
      </div>
      {TEXT_FIELDS.filter(([k]) => k !== "product_spec" && k !== "expiry_date").map(([k, label]) =>
        k === "changes_from_previous" || k === "delivery_assumptions" ? (
          <div key={k} className="sm:col-span-2">
            <Label htmlFor={`qs-${k}`}>{t(label)}</Label>
            <Textarea id={`qs-${k}`} value={form[k] ?? ""} onChange={txt(k)} rows={2} />
          </div>
        ) : (
          <div key={k} className={k === "payment_terms" || k === "packaging_logistics" ? "sm:col-span-2" : undefined}>
            <Label htmlFor={`qs-${k}`}>{t(label)}</Label>
            <Input id={`qs-${k}`} value={form[k] ?? ""} onChange={txt(k)} />
          </div>
        ),
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
