/**
 * Shared loading, error, and empty-state primitives for the new route groups.
 *
 * These components are designed to be used ONLY within the new /workroom,
 * /shop, /gift, and /passport route groups (all wrapped in .kw-app).
 * They must NEVER replace or modify the existing loading/error states
 * on the frozen landing or auth pages.
 */

import type { ReactNode } from "react";
import { Loader2, AlertCircle, PackageSearch } from "lucide-react";

// ─── Loading ─────────────────────────────────────────────────────────────────

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function KwLoadingState({ label = "Loading…", className = "" }: LoadingStateProps) {
  return (
    <div
      className={`flex min-h-[320px] flex-col items-center justify-center gap-3 text-[var(--kw-on-surface-variant)] ${className}`}
      role="status"
      aria-label={label}
    >
      <Loader2 className="size-8 animate-spin text-[var(--kw-primary)]" aria-hidden="true" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  detail?: string;
  retry?: () => void;
}

export function KwErrorState({
  title = "Something went wrong",
  detail,
  retry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[rgba(184,95,69,0.12)]">
        <AlertCircle className="size-6 text-[var(--kw-secondary)]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--kw-on-surface)]">{title}</p>
        {detail && (
          <p className="text-xs text-[var(--kw-on-surface-variant)]">{detail}</p>
        )}
      </div>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="kw-btn-secondary text-xs"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function KwEmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--kw-surface-container)]">
        <PackageSearch className="size-6 text-[var(--kw-outline)]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--kw-on-surface)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--kw-on-surface-variant)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
