/**
 * Shared loading, error, and empty-state primitives for the new route groups.
 *
 * These components are designed to be used ONLY within the new /workroom,
 * /shop, /gift, and /passport route groups (all wrapped in .kw-app).
 * They must NEVER replace or modify the existing loading/error states
 * on the frozen landing or auth pages.
 *
 * Resilience Rules:
 * 1. No page may show a loading spinner for more than 15 seconds. KwLoadingState
 *    enforces a 15-second timeout safeguard and transitions to an error state with Retry.
 * 2. On 403, KwErrorState or KwNoAccessState renders a clear "no access" state.
 * 3. On network or timeout errors, shows error details with a "Retry" button.
 */

import { useState, useEffect, type ReactNode } from "react";
import { Loader2, AlertCircle, PackageSearch, ShieldAlert } from "lucide-react";

// ─── Loading ─────────────────────────────────────────────────────────────────

interface LoadingStateProps {
  label?: string;
  className?: string;
  timeoutMs?: number;
  onTimeout?: () => void;
  retry?: () => void;
}

export function KwLoadingState({
  label = "Loading…",
  className = "",
  timeoutMs = 15_000,
  onTimeout,
  retry,
}: LoadingStateProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs, onTimeout]);

  if (timedOut) {
    return (
      <KwErrorState
        title="Loading timed out"
        detail="The operation took longer than 15 seconds to respond."
        retry={() => {
          setTimedOut(false);
          if (retry) {
            retry();
          } else if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
        retryLabel="Retry"
      />
    );
  }

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

// ─── No Access (403 Forbidden) ────────────────────────────────────────────────

interface NoAccessStateProps {
  title?: string;
  detail?: string;
}

export function KwNoAccessState({
  title = "No Access",
  detail = "You do not have permission to access this screen. Please sign in with an authorized role (Coordinator or Admin).",
}: NoAccessStateProps) {
  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center"
      role="alert"
      aria-label="No Access"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[rgba(184,95,69,0.12)]">
        <ShieldAlert className="size-6 text-[var(--kw-secondary)]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[var(--kw-on-surface)]">{title}</p>
        <p className="text-xs text-[var(--kw-on-surface-variant)] max-w-sm">{detail}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a href="/auth" className="kw-btn-secondary text-xs">
          Sign in with another account
        </a>
        <a href="/" className="kw-btn-ghost text-xs">
          Go home
        </a>
      </div>
    </div>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  detail?: string;
  status?: number;
  retry?: () => void;
  retryLabel?: string;
}

export function KwErrorState({
  title = "Something went wrong",
  detail,
  status,
  retry,
  retryLabel = "Retry",
}: ErrorStateProps) {
  const is403 =
    status === 403 ||
    detail?.includes("403") ||
    detail?.toLowerCase().includes("forbidden") ||
    title.toLowerCase().includes("no access") ||
    title.toLowerCase().includes("access denied");

  if (is403) {
    return (
      <KwNoAccessState
        title={title === "Something went wrong" ? "No Access" : title}
        detail={detail ?? "You do not have permission to access this screen (403 Forbidden)."}
      />
    );
  }

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center"
      role="alert"
    >
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
          {retryLabel}
        </button>
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
}

export function KwSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-[var(--kw-surface-container-high)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function KwCardSkeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`kw-card flex flex-col justify-between border border-[var(--kw-outline-variant)] p-4 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading card content"
    >
      <div className="space-y-3">
        <KwSkeleton className="aspect-4/3 w-full rounded-lg" />
        <KwSkeleton className="h-5 w-3/4 rounded" />
        <KwSkeleton className="h-4 w-full rounded" />
        <KwSkeleton className="h-3 w-1/2 rounded" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[var(--kw-outline-variant)] pt-3">
        <KwSkeleton className="h-5 w-20 rounded" />
        <KwSkeleton className="h-8 w-24 rounded-lg" />
      </div>
      <span className="sr-only">Loading item details…</span>
    </div>
  );
}

export function KwProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[var(--kw-space-md)]"
      role="status"
      aria-busy="true"
      aria-label="Loading craft catalog"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <KwCardSkeleton key={idx} />
      ))}
      <span className="sr-only">Loading craft catalog…</span>
    </div>
  );
}

export function KwTableSkeleton({
  rows = 5,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`kw-card p-0 overflow-x-auto border border-[var(--kw-outline-variant)] ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Loading table data"
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <KwSkeleton className="h-5 w-40 rounded" />
          <KwSkeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="divide-y divide-[var(--kw-outline-variant)]">
          <div className="flex gap-4 pb-3">
            {Array.from({ length: cols }).map((_, i) => (
              <KwSkeleton key={`h-${i}`} className="h-4 flex-1 rounded" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={`r-${r}`} className="flex items-center gap-4 py-3.5">
              {Array.from({ length: cols }).map((_, c) => (
                <KwSkeleton key={`c-${c}`} className="h-4 flex-1 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading records…</span>
    </div>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function KwEmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)]">
        {icon || <PackageSearch className="size-6 text-[var(--kw-outline)]" aria-hidden="true" />}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--kw-on-surface)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--kw-on-surface-variant)] max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
