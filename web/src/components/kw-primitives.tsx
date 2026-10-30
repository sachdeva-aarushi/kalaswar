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
