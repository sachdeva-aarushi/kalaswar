/**
 * Shop/Gift public layout shell — wraps /shop/* and /gift/* routes.
 *
 * Applies .kw-app scoping, light navigation header, and Demo Mode banner.
 * Public route: no auth required.
 */

import { Outlet, Link } from "@tanstack/react-router";
import { ShoppingBag, Gift, Briefcase } from "lucide-react";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useCart } from "@/features/cart/hooks";
import kwAppCss from "@/kw-app.css?url";

interface PublicShellProps {
  /** "shop" or "gift" — determines active nav highlight */
  section?: "shop" | "gift";
}

export function PublicShell({ section }: PublicShellProps) {
  const { data: cart } = useCart();
  const totalItems = cart?.total_items ?? (cart?.items ?? []).reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      <link rel="stylesheet" href={kwAppCss} />
      <div className="kw-app flex min-h-screen flex-col">
      <DemoModeBanner />
      <header className="kw-topbar shrink-0 sticky top-0 z-20 px-2 sm:px-6">
        <Link to="/" className="font-bold text-base sm:kw-headline-sm mr-auto text-[var(--kw-primary-container)] hover:opacity-80 transition-opacity shrink-0">
          Kalaswar
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2 shrink-0" aria-label="Store navigation">
          <Link
            to="/shop"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-[var(--kw-radius)] px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
              section === "shop"
                ? "bg-[var(--kw-primary-container)] text-white"
                : "text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)]"
            }`}
          >
            <ShoppingBag className="size-3.5 sm:size-4" aria-hidden="true" />
            <span>Shop</span>
          </Link>
          <Link
            to="/gift"
            className={`flex items-center gap-1 sm:gap-1.5 rounded-[var(--kw-radius)] px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
              section === "gift"
                ? "bg-[var(--kw-primary-container)] text-white"
                : "text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)]"
            }`}
          >
            <Gift className="size-3.5 sm:size-4" aria-hidden="true" />
            <span>Gift</span>
          </Link>
          <Link
            to="/b2b"
            className="hidden sm:flex items-center gap-1.5 rounded-[var(--kw-radius)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)] transition-colors"
          >
            <Briefcase className="size-4" aria-hidden="true" />
            <span>For Business</span>
          </Link>

          {/* Cart Trigger Button */}
          <CartDrawer
            trigger={
              <button
                type="button"
                className="relative flex items-center gap-1 rounded-[var(--kw-radius)] px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-[var(--kw-on-surface)] bg-[var(--kw-surface-container)] hover:bg-[var(--kw-surface-container-high)] transition-colors"
                aria-label={`View shopping cart with ${totalItems} items`}
              >
                <ShoppingBag className="size-3.5 sm:size-4 text-[var(--kw-primary)]" aria-hidden="true" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[var(--kw-primary)] text-white text-[10px] font-bold">
                    {totalItems}
                  </span>
                )}
              </button>
            }
          />

          <Link
            to="/auth"
            search={{ redirect: undefined }}
            className="kw-btn kw-btn-primary ml-0.5 sm:ml-1 h-7 sm:h-8 px-2 sm:px-3 text-xs"
          >
            Sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-3 sm:p-6 lg:p-8">
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

