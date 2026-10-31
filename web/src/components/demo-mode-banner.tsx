/**
 * Demo mode banner.
 *
 * Shown when VITE_DEMO_MODE=true (or when no real credentials are set).
 * Rendered inside the .kw-app shell layouts only — never on frozen pages.
 */

const isDemoMode =
  typeof import.meta !== "undefined" &&
  import.meta.env?.["VITE_DEMO_MODE"] === "true";

interface DemoModeBannerProps {
  /** Override message shown in the banner */
  message?: string;
}

export function DemoModeBanner({
  message = "You are viewing Kalaswar in demo mode. Data shown is illustrative and no real transactions are processed.",
}: DemoModeBannerProps) {
  if (!isDemoMode) return null;

  return (
    <div
      id="kw-demo-banner"
      className="w-full bg-[var(--kw-tertiary-container)] px-4 py-2 text-center"
      role="status"
      aria-label="Demo mode notice"
    >
      <p className="text-xs font-medium text-[var(--kw-on-tertiary-container)]">
        🎭 <span className="font-semibold">DEMO MODE</span> — {message}
      </p>
    </div>
  );
}
