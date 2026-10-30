/**
 * Shop/Gift public layout shell — wraps /shop/* and /gift/* routes.
 *
 * Applies .kw-app scoping, light navigation header, and Demo Mode banner.
 * Public route: no auth required.
 */

import { Outlet, Link } from "@tanstack/react-router";
import { ShoppingBag, Gift } from "lucide-react";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import kwAppCss from "@/kw-app.css?url";


interface PublicShellProps {
  /** "shop" or "gift" — determines active nav highlight */
  section?: "shop" | "gift";
}

export function PublicShell({ section }: PublicShellProps) {
  return (
    <>
      <link rel="stylesheet" href={kwAppCss} />
      <div className="kw-app flex min-h-screen flex-col">
      <DemoModeBanner />
      <header className="kw-topbar shrink-0 sticky top-0 z-20">
        <Link to="/" className="kw-headline-sm mr-auto text-[var(--kw-primary-container)] hover:opacity-80 transition-opacity">
          Kalaswar
        </Link>
        <nav className="flex items-center gap-2" aria-label="Store navigation">
          <Link
            to="/shop"
            className={`flex items-center gap-1.5 rounded-[var(--kw-radius)] px-3 py-1.5 kw-label-md transition-colors ${
              section === "shop"
                ? "bg-[var(--kw-primary-container)] text-white"
                : "text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)]"
            }`}
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            Shop
          </Link>
          <Link
            to="/gift"
            className={`flex items-center gap-1.5 rounded-[var(--kw-radius)] px-3 py-1.5 kw-label-md transition-colors ${
              section === "gift"
                ? "bg-[var(--kw-primary-container)] text-white"
                : "text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)]"
            }`}
          >
            <Gift className="size-4" aria-hidden="true" />
            Gift
          </Link>
          <Link
            to="/auth"
            search={{ redirect: undefined }}
            className="kw-btn kw-btn-primary ml-2 h-8 text-xs"
          >
            Sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-[var(--kw-space-lg)]">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--kw-divider)] px-[var(--kw-space-lg)] py-[var(--kw-space-md)]">
        <p className="kw-caption text-[var(--kw-on-surface-variant)] text-center">
          © 2026 Kalaswar — India's craft, her voice, her livelihood.
        </p>
      </footer>
    </div>
    </>
  );
}

