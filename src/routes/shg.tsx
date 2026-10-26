import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Boxes, Briefcase, Calculator, FileSignature, Factory, Handshake, LayoutDashboard, Package, PackageSearch, ScrollText, Users, Wallet } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";
import { LanguageSelect } from "@/components/language-select";
import { DemoBadge } from "@/components/demo-note";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/shg", labelKey: "shg_overview", icon: LayoutDashboard, exact: true },
  { to: "/shg/orders", labelKey: "shg_orders", icon: PackageSearch },
  { to: "/shg/requests", labelKey: "shg_requests", icon: Handshake },
  { to: "/shg/b2b", labelKey: "shg_b2b", icon: Briefcase },
  { to: "/shg/b2b-quotes", labelKey: "shg_b2b_quotes", icon: FileSignature },
  { to: "/shg/b2b-orders", labelKey: "shg_b2b_orders", icon: Factory },
  { to: "/shg/inventory", labelKey: "shg_inventory", icon: Boxes },
  { to: "/shg/artisans", labelKey: "shg_artisans", icon: Users },
  { to: "/shg/products", labelKey: "shg_products", icon: Package },
  { to: "/shg/pricing", labelKey: "fp_title", icon: Calculator },
  { to: "/shg/payments", labelKey: "shg_payments", icon: Wallet },
  { to: "/shg/reports", labelKey: "shg_reports", icon: ScrollText },
] as const;

export const Route = createFileRoute("/shg")({
  head: () => ({
    meta: [
      { title: "Coordinator Workspace — Kalaswar" },
      {
        name: "description",
        content:
          "Operational workspace for self-help-group coordinators — orders, artisans, products and exports in one shared view.",
      },
      { property: "og:title", content: "Coordinator Workspace — Kalaswar" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShgLayout,
});

function ShgLayout() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card px-4 py-6 md:flex">
        <Link to="/shg" className="px-2">
          <Wordmark size="sm" withFeather={false} />
        </Link>
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Workspace">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm bg-accent font-medium text-accent-foreground",
              }}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="space-y-3 border-t border-border pt-4">
          <LanguageSelect />
          <DemoBadge />
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">{t("shg_demo")}</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/shg">
            <Wordmark size="sm" withFeather={false} />
          </Link>
          <LanguageSelect />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2" aria-label="Workspace">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              className="whitespace-nowrap rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground"
              activeProps={{
                className:
                  "whitespace-nowrap rounded-full border border-primary bg-primary px-3.5 py-1.5 text-sm text-primary-foreground",
              }}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="md:pl-60">
        <main id="main" className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
