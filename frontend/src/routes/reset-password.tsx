import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoNote } from "@/components/demo-note";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Kalaswar" },
      { name: "description", content: "Choose a new password for your Kalaswar account." },
      { property: "og:title", content: "Set a new password — Kalaswar" },
      { property: "og:description", content: "Choose a new password for your Kalaswar account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  const submit = async () => {
    if (password.length < 8) {
      setError(t("auth_err_weak"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth_err_mismatch"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      setDone(true);
      setTimeout(() => void navigate({ to: "/auth", replace: true, search: { redirect: undefined } }), 1800);
    } catch {
      setError(t("auth_err_generic"));
    } finally {
      setBusy(false);
    }
  };

  if (!isRecovery) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-24">
        <div className="w-full max-w-md border border-border bg-card p-8 text-center">
          <Wordmark size="md" />
          <p className="mt-6 text-sm text-muted-foreground">{t("auth_reset_not_recovery")}</p>
          <Button asChild variant="outline" size="sm" className="mt-6">
            <a href="/auth">{t("auth_back_signin")}</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-24">
      <div className="w-full max-w-md border border-border bg-card p-8">
        <div className="text-center">
          <Wordmark size="md" />
          <h1 className="mt-6 font-display text-2xl text-foreground">{t("auth_reset_title")}</h1>
        </div>
        {done ? (
          <DemoNote className="mt-6">{t("auth_reset_ok")}</DemoNote>
        ) : (
          <form
            className="mt-6 space-y-5 border border-border bg-secondary p-6 [&_input]:h-12 [&_input]:border-border [&_input]:bg-background"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) void submit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rp-pass">{t("auth_password")}</Label>
              <Input id="rp-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">{t("auth_password_confirm")}</Label>
              <Input id="rp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            {error && <DemoNote className="text-destructive">{error}</DemoNote>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("auth_reset_btn")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
