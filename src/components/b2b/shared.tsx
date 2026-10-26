import { Badge } from "@/components/ui/badge";
import { useLang } from "@/lib/i18n";

/* Shared presentation helpers for the B2B Studio pages. */

export const TONE_BADGE: Record<string, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  positive: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  negative: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: string }) {
  return (
    <Badge variant="outline" className={TONE_BADGE[tone] ?? TONE_BADGE["neutral"]}>
      {label}
    </Badge>
  );
}

export function requestStatusTone(status: string): string {
  switch (status) {
    case "accepted":
    case "quoted":
      return "positive";
    case "declined":
    case "cancelled":
      return "negative";
    case "submitted":
    case "under_review":
    case "feasibility_ready":
      return "warning";
    default:
      return "neutral";
  }
}

export function quoteStatusTone(status: string): string {
  switch (status) {
    case "accepted":
      return "positive";
    case "revision_requested":
    case "revised":
      return "warning";
    case "declined":
    case "expired":
    case "cancelled":
      return "negative";
    default:
      return "neutral";
  }
}

export function sampleStatusTone(status: string): string {
  switch (status) {
    case "approved":
      return "positive";
    case "revision_requested":
    case "cancelled":
      return "negative";
    case "in_production":
    case "ready_for_review":
    case "dispatched":
      return "warning";
    default:
      return "neutral";
  }
}

/** Section heading used across B2B pages. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold tracking-tight">{children}</h2>;
}
