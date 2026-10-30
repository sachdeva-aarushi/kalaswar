/**
 * Workroom layout shell — wraps all /workroom/* routes.
 *
 * Applies the .kw-app CSS scope, renders the scoped sidebar nav,
 * the top bar (with user info + sign out), and the Demo Mode banner.
 * Role-guarded: coordinator, artisan, admin only.
 */

import { Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingBag, Users, Package, ClipboardList, Settings, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { performSignOut } from "@/lib/auth-client";
import { DemoModeBanner } from "@/components/demo-mode-banner";
import kwAppCss from "@/kw-app.css?url";

const NAV_ITEMS = [
  { to: "/workroom", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/workroom/orders", label: "Orders", icon: ShoppingBag },
  { to: "/workroom/products", label: "Products", icon: Package },
  { to: "/workroom/artisans", label: "Artisans", icon: Users },
  { to: "/workroom/requests", label: "Requests", icon: ClipboardList },
  { to: "/workroom/settings", label: "Settings", icon: Settings },
] as const;

export function WorkroomShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Inject scoped workroom stylesheet */}
      <link rel="stylesheet" href={kwAppCss} />

      <div className="kw-app flex min-h-screen">
        {/* Sidebar */}
        <nav
          className={`kw-sidebar fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Workroom navigation"
        >
          <div className="flex h-14 items-center gap-2 px-4 border-b border-[rgba(255,255,255,0.12)]">
            <span className="kw-label-md text-white tracking-tight">Kalaswar Workroom</span>
          </div>
          <ul className="flex flex-col gap-1 p-3 flex-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeOptions={{ exact: to === "/workroom" }}
                  className="flex items-center gap-3 rounded-[var(--kw-radius)] px-3 py-2.5 text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white [&.active]:bg-[var(--kw-primary-container)] [&.active]:text-white"
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="kw-label-md">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="p-3 border-t border-[rgba(255,255,255,0.12)]">
            <button
              id="workroom-signout-btn"
              type="button"
              className="flex w-full items-center gap-3 rounded-[var(--kw-radius)] px-3 py-2.5 text-[rgba(255,255,255,0.7)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
              onClick={() => void performSignOut(queryClient, navigate)}
            >
              <LogOut className="size-5 shrink-0" aria-hidden="true" />
              <span className="kw-label-md">Sign out</span>
            </button>
          </div>
        </nav>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          <DemoModeBanner />
          {/* Top bar */}
          <header className="kw-topbar shrink-0">
            <button
              type="button"
              id="workroom-sidebar-toggle"
              className="mr-3 rounded-[var(--kw-radius-sm)] p-1.5 text-[var(--kw-on-surface-variant)] hover:bg-[var(--kw-surface-container)] lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="flex-1" />
            <Link
              to="/"
              className="kw-body-sm text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)] transition-colors"
            >
              ← Back to store
            </Link>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-[var(--kw-space-lg)]">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
