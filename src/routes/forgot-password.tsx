import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoNote } from "@/components/demo-note";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Kalaswar" },
      { name: "description", content: "Request a Kalaswar password reset link." },
      { property: "og:title", content: "Reset password — Kalaswar" },
      { property: "og:description", content: "Request a Kalaswar password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError(t("auth_err_generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-24">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <Wordmark size="md" />
          </Link>
          <h1 className="mt-6 font-display text-2xl text-foreground">{t("auth_forgot_title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("auth_forgot_body")}</p>
        </div>
        {sent ? (
          <DemoNote className="mt-6">{t("auth_forgot_sent")}</DemoNote>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy && email) void submit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">{t("auth_email")}</Label>
              <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            {error && <DemoNote className="text-destructive">{error}</DemoNote>}
            <Button type="submit" className="w-full" disabled={busy || !email}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {t("auth_forgot_btn")}
            </Button>
          </form>
        )}
        <div className="mt-6 text-center">
          <Link to="/auth" search={{ redirect: undefined }} className="text-sm text-muted-foreground underline hover:text-primary">
            {t("auth_back_signin")}
          </Link>
        </div>
      </div>
    </main>
  );
}
