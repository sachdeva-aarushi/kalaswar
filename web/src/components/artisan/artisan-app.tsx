import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { HelpCircle, Mic, Send, Square } from "lucide-react";

import { useLang, type Lang } from "@/lib/i18n";
import {
  artisanOrdersQuery,
  artisanPaymentsQuery,
  artisanQuery,
  artisanSummaryQuery,
  artisansQuery,
  craftGuidesQuery,
  recordArtisanNote,
} from "@/lib/data";
import { planAssignedWork, type PlanOrder } from "@/lib/artisan-plan";
import { matchCraftGuides } from "@/lib/guides";
import { formatINR } from "@/lib/money";
import { routeCommand, type VoiceIntent } from "@/lib/voice-router";
import { clearSpeech, speak } from "@/lib/speech";
import { useVoiceAssistant, type AssistantError } from "@/hooks/use-voice-assistant";
import { DEMO_ARTISAN_ID } from "@/lib/constants";
import { formatDate } from "@/lib/money";
import { StoryEditorSection } from "@/components/artisan/story-editor";
import { NotificationsPanel } from "@/components/notifications-panel";
import { Wordmark } from "@/components/wordmark";
import { LanguageSelect } from "@/components/language-select";
import { useBackendProfile } from "@/features/auth/hooks";
import { useAuth } from "@/features/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FOCUSABLE: { intent: VoiceIntent; section: string; status: string }[] = [
  { intent: "show_pending", section: "app_pending", status: "pending" },
  { intent: "show_in_production", section: "app_in_production", status: "in_production" },
  { intent: "show_ready", section: "app_ready", status: "ready_for_dispatch" },
  { intent: "show_delivered", section: "app_delivered", status: "delivered" },
];

export function ArtisanApp() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const { data: profile } = useBackendProfile();
  const { user } = useAuth();
  const { data: artisanList } = useQuery(artisansQuery());
  const effectiveArtisanId = profile?.artisan_id || user?.id || artisanList?.[0]?.id || "";
  const [artisanId, setArtisanId] = useState(effectiveArtisanId || DEMO_ARTISAN_ID);

  useEffect(() => {
    if (effectiveArtisanId) {
      setArtisanId(effectiveArtisanId);
    }
  }, [effectiveArtisanId]);

  const [fallbackReply, setFallbackReply] = useState("");
  const [transcript, setTranscript] = useState("");
  const [focus, setFocus] = useState<VoiceIntent | null>(null);
  const [question, setQuestion] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);
  const { data: artisan } = useQuery({
    ...artisanQuery(artisanId),
    placeholderData: (prev) => prev,
  });
  const { data: orders } = useQuery({
    ...artisanOrdersQuery(artisanId),
    placeholderData: (prev) => prev,
  });
  const { data: summary } = useQuery({
    ...artisanSummaryQuery(artisanId),
    placeholderData: (prev) => prev,
  });
  const { data: payments } = useQuery({
    ...artisanPaymentsQuery(artisanId),
    placeholderData: (prev) => prev,
  });

  const counts = summary?.counts;

  const { data: guides } = useQuery(craftGuidesQuery());
  const matchedGuides = useMemo(
    () => matchCraftGuides(guides ?? [], artisan?.craft ?? ""),
    [guides, artisan?.craft],
  );

  /** Weekly plan — buckets come only from recorded dispatch dates and status. */
  const plan = useMemo(
    () =>
      planAssignedWork(
        (orders ?? []).map((o) => ({
          id: o.id,
          status: o.status,
          expected_dispatch_at: o.expected_dispatch_at,
          quantity: o.quantity,
        })),
      ),
    [orders],
  );

  /** The agent can move her to another screen by itself, mid-conversation. */
  const handleNavigate = useCallback(
    (screen: string, productId?: string | null) => {
      const scrollTo = (id: string) =>
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      switch (screen) {
        case "orders":
          setFocus("show_pending");
          scrollTo("sec-show_pending");
          break;
        case "earnings":
          setFocus("show_earnings");
          scrollTo("sec-show_earnings");
          break;
        case "payments":
          setFocus("show_payments");
          scrollTo("sec-show_payments");
          break;
        case "help":
          setFocus("open_help");
          scrollTo("sec-open_help");
          break;
        case "upload_product":
          navigate({ to: "/workroom/products/new" });
          break;
        case "edit_product":
          navigate({ to: "/shg/products", search: { new: false, edit: productId ?? "" } });
          break;
        case "marketplace":
          navigate({ to: "/" });
          break;
        case "profile":
          navigate({ to: "/artisan/$id", params: { id: artisanId } });
          break;
      }
    },
    [navigate, artisanId],
  );

  const voice = useVoiceAssistant({ lang, artisanId, onNavigate: handleNavigate });

  // Offline fallback: the bounded command router answers when the assistant
  // cannot be reached, so the interface keeps working without a network.
  const localFallback = useCallback(
    (text: string) => {
      const intent = routeCommand(text);
      setTranscript(text);
      let reply = t("resp_unknown");
      let replyLang = lang;

      if (counts) {
        if (intent === "show_pending")
          reply = t("resp_pending", { n: counts.pending, plural: counts.pending === 1 ? "" : "s" });
        else if (intent === "show_in_production")
          reply = t("resp_in_production", { n: counts.in_production, verb: counts.in_production === 1 ? "is" : "are" });
        else if (intent === "show_ready")
          reply = t("resp_ready", { n: counts.ready_for_dispatch, plural: counts.ready_for_dispatch === 1 ? "" : "s", verb: counts.ready_for_dispatch === 1 ? "is" : "are" });
        else if (intent === "show_delivered")
          reply = t("resp_delivered", { n: counts.delivered, plural: counts.delivered === 1 ? "" : "s", verb: counts.delivered === 1 ? "was" : "were" });
      }
      if (intent === "show_earnings" && summary)
        reply = t("resp_earnings", { amount: formatINR(summary.earnings) });
      if (intent === "show_payments") reply = t("resp_payments");
      if (intent === "open_help") {
        reply = t("resp_help");
        setFocus("open_help");
      }
      if (intent === "switch_language_en") {
        setLang("en");
        replyLang = "en";
        reply = t("resp_language_en");
      }
      if (intent === "switch_language_hi") {
        setLang("hi");
        replyLang = "hi";
        reply = t("resp_language_hi");
      }
      if (intent === "switch_language_mr") {
        setLang("mr");
        replyLang = "mr";
        reply = t("resp_language_mr");
      }

      setFallbackReply(reply);
      speak(reply, replyLang);
      queryClient.invalidateQueries({ queryKey: ["artisanSummary", artisanId] });
    },
    [counts, summary, lang, t, setLang, queryClient, artisanId],
  );

  // When the assistant is unreachable, answer from the local command router.
  useEffect(() => {
    if (voice.error === "assistant" && voice.transcript) localFallback(voice.transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.error]);

  useEffect(() => {
    if (focus) {
      document.getElementById(`sec-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      responseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [focus, fallbackReply, voice.reply]);

  useEffect(() => () => clearSpeech(), []);

  const errorText: Record<AssistantError, string> = {
    unsupported: t("app_no_support"),
    permission: t("app_permission"),
    listen: t("app_error_voice"),
    assistant: t("app_error_assistant"),
  };

  const askTyped = () => {
    if (question.trim()) {
      setFallbackReply("");
      voice.submit(question.trim());
      setQuestion("");
    }
  };

  const statusLine = voice.listening
    ? t("app_listening")
    : voice.status === "transcribing"
      ? t("app_processing")
      : voice.status === "thinking"
        ? t("app_thinking")
        : t("app_voice_hint");

  const reply = voice.reply || fallbackReply;

  /** Next-step aggregation — read only from recorded orders, never invented. */
  const nextSteps = useMemo(() => {
    const list = orders ?? [];
    const steps: { label: string; intent: VoiceIntent }[] = [];
    const due = list
      .filter((o) => o.status === "in_production" && o.expected_dispatch_at)
      .sort((a, b) => (a.expected_dispatch_at ?? "").localeCompare(b.expected_dispatch_at ?? ""))[0];
    if (due) {
      steps.push({
        label: t("app_next_due", {
          name: due.product?.name ?? "",
          date: formatDate(due.expected_dispatch_at),
        }),
        intent: "show_in_production",
      });
    }
    const ready = counts?.ready_for_dispatch ?? 0;
    if (ready > 0) steps.push({ label: t("app_next_ready", { n: ready }), intent: "show_ready" });
    const pending = counts?.pending ?? 0;
    if (pending > 0) steps.push({ label: t("app_next_pending", { n: pending }), intent: "show_pending" });
    return steps;
  }, [orders, counts, t]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-xl px-4 pb-20 pt-8 sm:px-6 md:pt-12">
      {/* Top identity */}
      <header className="flex items-center justify-between">
        <Wordmark size="sm" withFeather={false} />
        <div className="flex items-center gap-1">
          <LanguageSelect />
        </div>
      </header>

      {/* ---------- Voice panel ---------- */}
      <section
        aria-label={t("app_mic")}
        className="mt-8 rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <div className="flex flex-col items-center">
          <div className="relative flex flex-col items-center">
            {voice.listening && !reduce && (
              <motion.span
                aria-hidden="true"
                className="absolute -inset-3 rounded-full border-2 border-primary"
                animate={{ scale: [1, 1.45], opacity: [0.55, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <motion.button
              type="button"
              aria-label={t("app_mic")}
              aria-pressed={voice.listening}
              onClick={() => (voice.listening ? voice.stop() : (voice.hush(), voice.start()))}
              whileTap={{ scale: 0.94 }}
              className="relative z-10 flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              {voice.listening ? <Square className="size-7" /> : <Mic className="size-8" />}
            </motion.button>
            {voice.listening && (
              <div className="mt-4 flex h-5 items-end gap-1" aria-hidden="true">
                {[10, 18, 12, 22, 9, 15].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-terracotta"
                    animate={{ height: [h * 0.4, h, h * 0.5, h * 0.8] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">{statusLine}</p>

          {voice.handsFree && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={voice.end}
              aria-label={t("app_end")}
            >
              {t("app_end")}
            </Button>
          )}

          {(voice.transcript || voice.error) && (
            <p className="mt-3 text-center text-sm text-foreground">
              {voice.error ? (
                <span className="font-medium text-destructive">{errorText[voice.error]}</span>
              ) : (
                <>
                  <span className="text-muted-foreground">{t("app_transcript")}: </span>
                  {voice.transcript}
                </>
              )}
            </p>
          )}

          {voice.busy && !voice.listening && (
            <p className="mt-2 text-center text-xs text-muted-foreground" aria-live="polite">
              {voice.status === "transcribing" || voice.status === "thinking"
                ? t("app_thinking")
                : ""}
            </p>
          )}

          {reply && (
            <div
              ref={responseRef}
              className="mt-4 w-full rounded-md border-l-2 border-primary bg-secondary p-4"
              role="status"
              aria-live="polite"
            >
              <p className="text-base font-medium leading-relaxed text-foreground">{reply}</p>
            </div>
          )}

          {/* Text fallback — voice is never the only way */}
          <div className="mt-5 flex w-full gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askTyped()}
              placeholder={t("app_type_placeholder")}
              aria-label={t("app_type_placeholder")}
            />
            <Button variant="outline" size="icon" onClick={askTyped} aria-label={t("app_send")} className="shrink-0">
              <Send className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <h1 className="mt-8 font-display text-4xl leading-tight text-foreground md:text-5xl">
        {t("app_greeting")}, {artisan?.name ?? "…"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {artisan?.craft}
        {artisan?.shg ? ` · ${artisan.shg.name}` : ""}
      </p>

      {/* Demonstration viewer selector */}
      <div className="mt-4 flex items-center gap-2">
        <span className="shrink-0 text-sm text-muted-foreground">{t("app_select")}</span>
        <Select value={artisanId} onValueChange={setArtisanId}>
          <SelectTrigger className="h-11 flex-1 border-border bg-card text-sm" aria-label={t("app_select")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(artisanList ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} — {a.craft}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ---------- What to do next ---------- */}
      <section
        aria-label={t("app_next_title")}
        className="mt-8 rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_next_title")}</h2>
        {nextSteps.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("app_next_none")}</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {nextSteps.map((s) => (
              <li key={s.intent}>
                <button
                  type="button"
                  onClick={() => setFocus(s.intent)}
                  className="w-full rounded-md border border-border bg-background p-4 text-left text-sm text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NotificationsPanel audience="artisan" audienceRef={artisanId} className="mt-4" />

      {/* ---------- My work: weekly plan ---------- */}
      <section
        id="sec-assignments"
        aria-label={t("app_work_title")}
        className="mt-10 rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
      >
        <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_work_title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("app_work_sub")}</p>
        {(
          [
            ["overdue", "plan_overdue", "text-terracotta"],
            ["thisWeek", "plan_week", "text-foreground"],
            ["later", "plan_later", "text-muted-foreground"],
            ["done", "plan_done", "text-muted-foreground"],
          ] as const
        ).map(([key, label, tone]) => {
          const ids = new Set(plan[key].map((p: PlanOrder) => p.id));
          const items = (orders ?? []).filter((o) => ids.has(o.id));
          if (items.length === 0) return null;
          return (
            <div key={key} className="mt-4">
              <p className={cn("text-xs font-semibold uppercase tracking-wide", tone)}>
                {t(label)} · {items.length}
              </p>
              <ul className="mt-2 space-y-2.5">
                {items.map((o) => {
                  const latest = o.assignments?.[0];
                  return (
                    <li key={o.id} className="rounded-md border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate font-medium text-foreground">
                          {o.product?.name} × {o.quantity}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {o.customer_reference}
                        </span>
                      </div>
                      <dl className="mt-1 flex gap-4 text-xs text-muted-foreground">
                        <div className="flex gap-1">
                          <dt>{t("app_work_due")}:</dt>
                          <dd className="text-foreground">{formatDate(o.expected_dispatch_at)}</dd>
                        </div>
                        {latest && (
                          <div className="flex gap-1">
                            <dt>{t("app_work_assigned")}:</dt>
                            <dd className="text-foreground">{formatDate(latest.assigned_at)}</dd>
                          </div>
                        )}
                      </dl>
                      {key !== "done" && <ArtisanNoteRow orderId={o.id} />}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {(orders ?? []).length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("app_none")}</p>}
      </section>

      {/* ---------- Order sections ---------- */}
      <div className="mt-8 space-y-8">
        {FOCUSABLE.map(({ intent, section, status }) => {
          const list = (orders ?? []).filter((o) => o.status === status);
          return (
            <section
              key={intent}
              id={`sec-${intent}`}
              className={cn(
                "rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                focus === intent && "border-primary ring-2 ring-primary/30",
              )}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl leading-snug text-foreground">{t(section)}</h2>
                <span className="font-display text-3xl tabular-nums text-primary">
                  {counts ? counts[status as keyof typeof counts] : "—"}
                </span>
              </div>
              {status === "pending" && counts && counts.delayed > 0 && (
                <p className="mt-1 text-xs font-medium text-terracotta">
                  {t("status_delayed")}: {counts.delayed}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {list.length === 0 && (
                  <li className="text-sm text-muted-foreground">{t("app_none")}</li>
                )}
                {list.slice(0, 4).map((o) => (
                  <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-3 rounded-md border border-border bg-card p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                    <span className="truncate text-foreground">
                      <span className="font-medium">{o.customer_reference}</span> ·{" "}
                      {o.product?.name} × {o.quantity}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {o.status === "delivered" ? "" : formatDate(o.expected_dispatch_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {/* Payments */}
        <section
          id="sec-show_payments"
          className={cn(
            "rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
            focus === "show_payments" && "border-primary ring-2 ring-primary/30",
          )}
        >
          <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_payments")}</h2>
          <ul className="mt-3 space-y-2">
            {(payments ?? []).slice(0, 4).map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-3 rounded-md border border-border bg-card p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <span className="truncate text-foreground">
                  <span className="font-medium">
                    {p.direction === "customer_payment" ? t("pay_in") : t("pay_out")}
                  </span>
                  {p.order_reference ? ` · ${p.order_reference}` : ""}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatINR(p.amount)} ·{" "}
                  {p.status === "paid" ? t("pay_status_paid") : t("pay_status_recorded")}
                </span>
              </li>
            ))}
            {(payments ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">{t("app_none")}</li>
            )}
          </ul>
          <DemoNote className="mt-2">{t("app_payments_note")}</DemoNote>
        </section>

        {/* Earnings — honest money: a sale is not money received */}
        <section
          id="sec-show_earnings"
          className={cn(
            "rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
            focus === "show_earnings" && "border-primary ring-2 ring-primary/30",
          )}
        >
          <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_earnings")}</h2>
          <p className="mt-2 font-display text-4xl tabular-nums text-foreground">
            {summary ? formatINR(summary.money.earnedTotal) : "—"}
          </p>
          {summary && (
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{t("app_money_delivered")}</dt>
                <dd className="tabular-nums text-foreground">{formatINR(summary.money.deliveredValue)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted-foreground">{t("app_money_tips")}</dt>
                <dd className="tabular-nums text-foreground">{formatINR(summary.money.tips)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                <dt className="font-medium text-foreground">{t("app_money_paid")}</dt>
                <dd className="tabular-nums font-medium text-foreground">{formatINR(summary.money.payouts)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="font-medium text-terracotta">{t("app_money_awaiting")}</dt>
                <dd className="tabular-nums font-medium text-terracotta">{formatINR(summary.money.awaitingPayout)}</dd>
              </div>
              {summary.money.expenses > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{t("app_money_expenses")}</dt>
                  <dd className="tabular-nums text-muted-foreground">{formatINR(summary.money.expenses)}</dd>
                </div>
              )}
            </dl>
          )}
          <DemoNote className="mt-2">{t("app_earnings_note")}</DemoNote>
        </section>

        {/* Craft guidance — recorded guides matched to her craft */}
        <section className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_guides_title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("app_guides_sub")}</p>
          {matchedGuides.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("app_guides_none")}</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {matchedGuides.map((g) => (
                <li key={g.id}>
                  <details className="rounded-md border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">
                      {g.title}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("app_guides_steps", { n: g.steps.length })} · {g.language}
                      </span>
                    </summary>
                    <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                      {g.steps.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="shrink-0 font-medium text-primary">{i + 1}.</span>
                          <span>
                            <span className="font-medium text-foreground">{s.title}</span>
                            {s.detail ? ` — ${s.detail}` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                      {t("app_guides_recorded")} · {g.source}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* My craft story — maker-approved storytelling */}
        <StoryEditorSection
          artisanId={artisanId}
          artisanName={artisan?.name ?? ""}
          craft={artisan?.craft ?? ""}
          shgId={artisan?.shg_id ?? null}
          shgName={artisan?.shg?.name ?? null}
        />

        {/* Recent updates */}
        <section className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
          <h2 className="font-display text-2xl leading-snug text-foreground">{t("app_updates")}</h2>
          <ul className="mt-3 space-y-2.5">
            {(orders ?? []).slice(0, 4).map((o) => {
              const latest = o.assignments?.[0];
              return (
                <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-3 rounded-md border border-border bg-card p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                  <span className="truncate text-foreground">
                    <span className="font-medium">{o.customer_reference}</span> ·{" "}
                    {o.product?.name} × {o.quantity}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {latest ? formatDate(latest.assigned_at) : ""}
                  </span>
                </li>
              );
            })}
            {(orders ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">{t("app_none")}</li>
            )}
          </ul>
        </section>

        {/* Help */}
        <section
          id="sec-open_help"
          className={cn(
            "rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
            focus === "open_help" && "border-primary ring-2 ring-primary/30",
          )}
        >
          <h2 className="flex items-center gap-2 font-display text-2xl leading-snug text-foreground">
            <HelpCircle className="size-4 text-primary" aria-hidden="true" />
            {t("app_help_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("app_help_body")}</p>
        </section>

        <DemoNote>{t("app_data_note")}</DemoNote>
      </div>
    </div>
  );
}

export type { Lang };

/** Per-assignment progress note — recorded verbatim on the order record. */
function ArtisanNoteRow({ orderId }: { orderId: string }) {
  const { t } = useLang();
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      className="mt-2 flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const text = note.trim();
        if (!text) return;
        try {
          await recordArtisanNote(orderId, text);
          setNote("");
          setDone(true);
        } catch {
          setDone(false);
        }
      }}
    >
      <Input
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setDone(false);
        }}
        placeholder={t("app_note_ph")}
        className="h-10 border-border bg-background text-sm"
        aria-label={t("app_note_ph")}
      />
      <Button type="submit" variant="outline" size="sm" className="h-10 shrink-0 text-xs" disabled={!note.trim()}>
        {done ? t("note_recorded") : t("app_note_send")}
      </Button>
    </form>
  );
}
