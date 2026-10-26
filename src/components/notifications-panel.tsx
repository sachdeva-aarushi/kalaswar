import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { markNotificationsRead, notificationsQuery } from "@/lib/data";
import { formatDate } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EVENT_LABEL_KEY: Record<string, string> = {
  order_assigned: "notif_order_assigned",
  order_status: "notif_order_status",
  payment_recorded: "notif_payment_recorded",
};

/**
 * In-app notifications panel (demonstration mode). Rows show a localized
 * event label plus the recorded data reference; nothing is invented here.
 */
export function NotificationsPanel({
  audience,
  audienceRef,
  className,
}: {
  audience: "artisan" | "coordinator" | "buyer";
  audienceRef?: string | null;
  className?: string;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { data } = useQuery(notificationsQuery(audience, audienceRef));

  const markRead = useMutation({
    mutationFn: () =>
      markNotificationsRead((data ?? []).filter((n) => !n.read_at).map((n) => n.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data ?? [];
  const unread = notifications.filter((n) => !n.read_at);

  return (
    <section
      aria-label={t("notif_title")}
      className={cn(
        "rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-primary/40 hover:shadow-lg",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl leading-snug text-foreground">
          <Bell className="size-4 text-primary" aria-hidden="true" />
          {t("notif_title")}
          {unread.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {unread.length}
            </span>
          )}
        </h2>
        {unread.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => markRead.mutate()}
            disabled={markRead.isPending}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            {t("notif_mark_read")}
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="mt-4 border border-border bg-secondary p-6 text-center text-sm text-muted-foreground">
          {t("notif_none")}
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                "border border-border bg-background p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
                !n.read_at && "border-l-2 border-l-primary",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium text-foreground">
                  {(() => {
                    const label = EVENT_LABEL_KEY[n.event_type];
                    return label ? t(label) : n.event_type;
                  })()}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
              {n.body && (
                <p className="mt-1 text-muted-foreground">
                  {n.body}
                </p>
              )}
              {n.link && (
                <Link
                  to={n.link}
                  className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                >
                  →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
