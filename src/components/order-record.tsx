import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { orderEventsQuery } from "@/lib/data";
import { formatDate } from "@/lib/money";
import { cn } from "@/lib/utils";

const EVENT_KEYS: Record<string, string> = {
  placed: "event_placed",
  assigned: "event_assigned",
  in_production: "event_in_production",
  ready_for_dispatch: "event_ready_for_dispatch",
  delivered: "event_delivered",
  delayed: "event_delayed",
  payment: "event_payment",
};

/**
 * The order "contract": every recorded step of one order, in order.
 * Events are appended automatically as the order is assigned, produced,
 * dispatched, delivered and paid.
 */
export function OrderRecordTimeline({ orderId }: { orderId: string }) {
  const { t } = useLang();
  const { data: events, isLoading } = useQuery(orderEventsQuery(orderId));

  return (
    <div aria-label={t("events_title")}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t("events_title")}
      </p>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("common_loading")}</p>
      ) : (
        <ol className="mt-3 space-y-2.5">
          {(events ?? []).map((e) => (
            <li key={e.id} className="flex items-start gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  e.event_type === "delivered"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary text-transparent",
                )}
              >
                <Check className="size-2.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {t(EVENT_KEYS[e.event_type] ?? "event_placed")}
                </p>
                {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDate(e.created_at)}
              </time>
            </li>
          ))}
          {(events ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">{t("app_none")}</li>
          )}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("events_sub")}</p>
    </div>
  );
}
