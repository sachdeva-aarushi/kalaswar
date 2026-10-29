import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoNote({
  children,
  className,
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "onDark";
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-xs leading-relaxed",
        tone === "onDark"
          ? "text-[oklch(0.94_0.015_85)]/70"
          : "text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-secondary px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-secondary-foreground",
        className,
      )}
    >
      Demonstration
    </span>
  );
}
