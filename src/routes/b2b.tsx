import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Boxes, ClipboardList, FileSignature, LayoutDashboard, PackageCheck, Search, Store, UserRound } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { Wordmark } from "@/components/wordmark";
import { LanguageSelect } from "@/components/language-select";
import { DemoBadge } from "@/components/demo-note";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/b2b", labelKey: "b2b_nav_overview", icon: LayoutDashboard, exact: true },
  { to: "/b2b/discover", labelKey: "b2b_nav_discover", icon: Search },
  { to: "/b2b/request", labelKey: "b2b_request_new", icon: ClipboardList },
  { to: "/b2b/quotes", labelKey: "b2b_nav_quotes", icon: FileSignature },
  { to: "/b2b/samples", labelKey: "b2b_nav_samples", icon: Boxes },
  { to: "/b2b/orders", labelKey: "b2b_nav_orders", icon: PackageCheck },
  { to: "/b2b/buyer-profile", labelKey: "b2b_nav_profile", icon: UserRound },
] as const;

export const Route = createFileRoute("/b2b")({
  head: () => ({
    meta: [
      { title: "B2B Studio — Kalaswar" },
      {
        name: "description",
        content:
          "Bulk and custom sourcing from women-led artisan collectives — structured briefs, recorded feasibility evidence, versioned quotations, samples and confirmed orders.",
      },
      { property: "og:title", content: "B2B Studio — Kalaswar" },
      {
        property: "og:description",
        content: "Source honestly, at scale, from artisan collectives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: B2bLayout,
});

function B2bLayout() {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/b2b">
              <Wordmark size="sm" withFeather={false} />
            </Link>
            <span className="hidden rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground sm:inline">
              {t("b2b_title")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/shg" className="hidden text-xs text-muted-foreground underline underline-offset-4 sm:inline">
              <Store className="mr-1 inline size-3" aria-hidden="true" />
              {t("shg_overview")}
            </Link>
            <LanguageSelect />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2" aria-label="B2B">
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

      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <DemoBadge />
        <Outlet />
      </main>
      <div className={cn("h-10")} aria-hidden="true" />
    </div>
  );
}
