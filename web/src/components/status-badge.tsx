import { useLang, statusLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Order status pill — always carries its text label, never color alone. */
export function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const styles: Record<string, string> = {
    pending: "bg-secondary text-secondary-foreground border-secondary",
    in_production: "bg-[oklch(0.94_0.04_80)] text-foreground border-transparent",
    ready_for_dispatch: "bg-[oklch(0.93_0.035_150)] text-leaf border-transparent",
    delivered: "bg-primary/10 text-primary border-transparent",
    delayed: "bg-[oklch(0.94_0.045_40)] text-terracotta border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
        styles[status] ?? "border-border",
      )}
    >
      {statusLabel(t, status)}
    </span>
  );
}
