import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Info } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { buyersQuery, upsertBuyer } from "@/lib/data";
import type { Buyer } from "@/lib/types";

export const Route = createFileRoute("/b2b/buyer-profile")({
  component: BuyerProfilePage,
});

function BuyerProfilePage() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data: buyers } = useSuspenseQuery(buyersQuery());
  const existing: Buyer | undefined = buyers[0];

  const [form, setForm] = useState({
    org_name: existing?.org_name ?? "",
    category: existing?.category ?? "",
    contact_name: existing?.contact_name ?? "",
    contact_email: existing?.contact_email ?? "",
    contact_phone: existing?.contact_phone ?? "",
    region: existing?.region ?? "",
    intended_use: existing?.intended_use ?? "",
  });
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () =>
      upsertBuyer({
        ...(existing?.id ? { id: existing.id } : {}),
        org_name: form.org_name,
        category: form.category,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        region: form.region,
        intended_use: form.intended_use,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["buyers"] });
      void queryClient.invalidateQueries({ queryKey: ["buyerRequests"] });
      setNote(t("b2b_profile_saved"));
      setError(null);
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("b2b_profile_title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("b2b_profile_intro")}</p>
      </header>

      <form
        className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.org_name.trim()) {
            setError(t("b2b_validation_missing"));
            return;
          }
          saveMut.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Label htmlFor="b-org">{t("b2b_f_org")}</Label>
          <Input id="b-org" value={form.org_name} onChange={set("org_name")} required />
        </div>
        <div>
          <Label htmlFor="b-cat">{t("b2b_f_buyer_category")}</Label>
          <Input id="b-cat" value={form.category} onChange={set("category")} placeholder="Corporate gifting, boutique, hospitality…" />
        </div>
        <div>
          <Label htmlFor="b-region">{t("b2b_f_region")}</Label>
          <Input id="b-region" value={form.region} onChange={set("region")} />
        </div>
        <div>
          <Label htmlFor="b-cname">{t("b2b_f_contact_name")}</Label>
          <Input id="b-cname" value={form.contact_name} onChange={set("contact_name")} />
        </div>
        <div>
          <Label htmlFor="b-cemail">{t("b2b_f_contact_email")}</Label>
          <Input id="b-cemail" type="email" value={form.contact_email} onChange={set("contact_email")} />
        </div>
        <div>
          <Label htmlFor="b-cphone">{t("b2b_f_contact_phone")}</Label>
          <Input id="b-cphone" value={form.contact_phone} onChange={set("contact_phone")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="b-use">{t("b2b_f_intended_use")}</Label>
          <Textarea id="b-use" value={form.intended_use} onChange={set("intended_use")} rows={2} />
        </div>

        {existing && (
          <div className="sm:col-span-2">
            <Badge variant="outline" className="border-border text-muted-foreground">
              {t("b2b_verification_unverified")}
            </Badge>
          </div>
        )}

        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? "…" : t("capacity_save")}
          </Button>
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
      </form>

      <p className="max-w-2xl text-xs text-muted-foreground">{t("b2b_profile_verify_note")}</p>
    </div>
  );
}
