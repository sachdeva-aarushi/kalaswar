import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, getRedirectForRole, resolveUserRole } from "@/features/auth";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoNote } from "@/components/demo-note";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Kalaswar" },
      { name: "description", content: "Sign in to your Kalaswar account — customers, B2B buyers, coordinators and artisans." },
      { property: "og:title", content: "Sign in — Kalaswar" },
      { property: "og:description", content: "Sign in to your Kalaswar account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? (search["redirect"] as string) : undefined,
  }),
  beforeLoad: async () => {
    // Signed-in users should not see the sign-in form. Client-only check.
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const role = await resolveUserRole(data.session.user.id);
        throw redirect({ to: getRedirectForRole(role) });
      }
    }
  },
  component: AuthPage,
});

const LANGS = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "mr", label: "मराठी" },
];

const DEMO_PRESETS = [
  { label: "Shopper", email: "shopper@kalaswar.org", password: "demo-pass-123" },
  { label: "Coordinator", email: "coordinator@kalaswar.org", password: "demo-pass-123" },
  { label: "Artisan", email: "artisan@kalaswar.org", password: "demo-pass-123" },
  { label: "Admin", email: "admin@kalaswar.org", password: "demo-pass-123" },
];

type ErrorKind = "creds" | "exists" | "weak" | "generic" | null;

function AuthPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const redirectTo = search['redirect'] as string | undefined;
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [language, setLanguage] = useState("en");
  const [accountType, setAccountType] = useState<"customer" | "buyer">("customer");
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKind>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  useEffect(() => {
    document.title = mode === "signin" ? "Sign in — Kalaswar" : "Create account — Kalaswar";
  }, [mode]);

  const submit = async () => {
    setError(null);
    setErrorMsg(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const res = await signIn({ email, password });
        if (res.error) {
          const msg = res.error.message?.toLowerCase() ?? "";
          if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
            setError("creds");
          } else {
            setError("generic");
            setErrorMsg(res.error.message);
          }
          return;
        }
        const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : getRedirectForRole(res.role);
        await navigate({ to: target });
      } else {
        if (password.length < 8) {
          setError("weak");
          return;
        }
        const res = await signUp({
          email,
          password,
          fullName,
          language,
          accountType,
          orgName,
        });
        if (res.error) {
          const msg = res.error.message?.toLowerCase() ?? "";
          if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already registered")) {
            setError("exists");
          } else if (msg.includes("at least 8")) {
            setError("weak");
          } else if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit")) {
            setError("generic");
            setErrorMsg("Supabase email verification rate limit reached. Please sign in directly with the pre-configured demo logins below.");
          } else {
            setError("generic");
            setErrorMsg(res.error.message);
          }
          return;
        }
        if (res.awaitingConfirm) {
          setAwaitingConfirm(true);
          return;
        }
        const target = redirectTo && redirectTo.startsWith("/") ? redirectTo : getRedirectForRole(accountType);
        await navigate({ to: target });
      }
    } catch (e: any) {
      setError("generic");
      setErrorMsg(e?.message ?? null);
    } finally {
      setBusy(false);
    }
  };

  if (awaitingConfirm) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-24">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <Wordmark size="md" />
          <h1 className="mt-6 font-display text-2xl text-foreground">{t("auth_check_email_title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("auth_check_email_body", { email })}</p>
          <Button asChild variant="outline" size="sm" className="mt-6">
            <Link to="/">{t("auth_back_home")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-24 pb-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <Wordmark size="md" />
          </Link>
          <h1 className="mt-6 font-display text-3xl text-foreground">
            {mode === "signin" ? t("auth_signin_title") : t("auth_signup_title")}
          </h1>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) void submit();
          }}
        >
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="au-name">{t("auth_full_name")}</Label>
              <Input id="au-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="au-email">{t("auth_email")}</Label>
            <Input id="au-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="au-pass">{t("auth_password")}</Label>
              {mode === "signin" && (
                <Link to="/forgot-password" className="text-xs text-muted-foreground underline hover:text-primary">
                  {t("auth_forgot")}
                </Link>
              )}
            </div>
            <Input
              id="au-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">{t("auth_password_hint")}</p>
            )}
          </div>

          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label>{t("auth_language")}</Label>
                <div className="flex gap-2">
                  {LANGS.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLanguage(l.value)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        language === l.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("auth_account_type")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["customer", "buyer"] as const).map((tp) => (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => setAccountType(tp)}
                      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                        accountType === tp
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {t(tp === "customer" ? "auth_type_customer" : "auth_type_buyer")}
                    </button>
                  ))}
                </div>
              </div>
              {accountType === "buyer" && (
                <div className="space-y-1.5">
                  <Label htmlFor="au-org">{t("auth_org_name")}</Label>
                  <Input id="au-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder={t("auth_org_hint")} />
                </div>
              )}
            </>
          )}

          {error && (
            <DemoNote className="text-destructive">
              {errorMsg ?? t(`auth_err_${error === "weak" ? "weak" : error === "exists" ? "exists" : error === "creds" ? "creds" : "generic"}`)}
            </DemoNote>
          )}

          <Button type="submit" className="w-full" disabled={busy || !email || !password || (mode === "signup" && !fullName.trim())}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {mode === "signin" ? t("auth_signin_btn") : t("auth_signup_btn")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground underline hover:text-primary"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setAwaitingConfirm(false);
            }}
          >
            {mode === "signin" ? t("auth_mode_switch_signup") : t("auth_mode_switch_signin")}
          </button>
        </div>
        {mode === "signin" && (
          <div className="mt-4 rounded-lg bg-muted/40 p-3 border border-border">
            <p className="text-xs font-semibold text-foreground mb-1.5">Demo Accounts (click to auto-fill):</p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setEmail(p.email);
                    setPassword(p.password);
                    setError(null);
                    setErrorMsg(null);
                  }}
                  className="flex items-center justify-between rounded border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:border-primary/50 text-left"
                >
                  <span className="font-medium truncate">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 shrink-0">Auto-fill</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">{t("auth_demo_entry")}</p>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/shg">{t("auth_enter_shg")}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/artisan-space">{t("auth_enter_artisan")}</Link>
            </Button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t("auth_demo_note")}</p>
      </div>
    </main>
  );
}
