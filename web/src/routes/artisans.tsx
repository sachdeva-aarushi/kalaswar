import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { artisansQuery } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { DemoNote } from "@/components/demo-note";

export const Route = createFileRoute("/artisans")({
  head: () => ({
    meta: [
      { title: "Meet the Artisans — Kalaswar" },
      {
        name: "description",
        content:
          "The women behind the crafts — artisans of India's self-help-group collectives, each with her own craft, region and story.",
      },
      { property: "og:title", content: "Meet the Artisans — Kalaswar" },
      {
        property: "og:description",
        content: "The women behind the crafts — artisans of India's self-help-group collectives.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(artisansQuery());
  },
  component: ArtisansPage,
});

function ArtisansPage() {
  const { t } = useLang();
  const { data: artisans } = useSuspenseQuery(artisansQuery());

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-28 md:px-6 md:pt-32">
        <header className="max-w-2xl">
          <h1 className="font-display text-4xl text-foreground md:text-5xl">{t("artisans_title")}</h1>
          <p className="mt-4 text-muted-foreground">{t("artisans_sub")}</p>
        </header>

        <div className="mt-12 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {artisans.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 6) * 0.06}>
              <Link to="/artisan/$id" params={{ id: a.id }} className="group block h-full border border-border bg-card p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <div className="overflow-hidden bg-muted">
                  <img
                    src={a.photo_url ?? ""}
                    alt={`${a.name} — ${a.craft}`}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  />
                </div>
                <p className="kicker mt-5 text-terracotta">{a.craft}</p>
                <h2 className="mt-2 font-display text-2xl text-foreground group-hover:text-primary">
                  {a.name}
                </h2>
                <dl className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  {a.shg && (
                    <>
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("artisans_collective")}:</dt>
                        <dd>{a.shg.name}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="shrink-0">{t("artisans_region")}:</dt>
                        <dd>{a.shg.region}</dd>
                      </div>
                    </>
                  )}
                </dl>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {t("makers_view")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <DemoNote className="mt-16 border-t border-border pt-6">{t("artisans_private")}</DemoNote>
      </main>
      <SiteFooter />
    </div>
  );
}
