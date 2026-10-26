import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { quotationsQuery } from "@/lib/data";
import { StatusBadge, quoteStatusTone } from "@/components/b2b/shared";

export const Route = createFileRoute("/b2b/quotes/")({
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(quotationsQuery());
  },
  component: QuotesPage,
});

function QuotesPage() {
  const { t } = useLang();
  const { data: quotes } = useSuspenseQuery(quotationsQuery());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("b2b_quote_list_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("b2b_quote_not_binding")}</p>
      </header>

      {quotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("b2b_no_quotes")}</p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => (
            <li key={q.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{q.request_code}</p>
                  <p className="font-medium">{q.request_title}</p>
                  <p className="text-sm text-muted-foreground">{q.shg_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={t(`b2b_qstatus_${q.status}`)} tone={quoteStatusTone(q.status)} />
                  <Link
                    to="/b2b/quotes/$id"
                    params={{ id: q.id }}
                    className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
                  >
                    {t("b2b_view_quote")}
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
