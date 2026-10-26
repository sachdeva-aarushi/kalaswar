import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { publishedStoriesQuery } from "@/lib/data";
import { makerCredit } from "@/lib/story";
import { formatDate } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { DemoBadge } from "@/components/demo-note";

export const Route = createFileRoute("/stories/")({
  head: () => ({
    meta: [
      { title: "Craft Stories — Kalaswar" },
      {
        name: "description",
        content:
          "How things are made, in the maker's own words — approved by the women artisans of Kalaswar's collectives.",
      },
      { property: "og:title", content: "Craft Stories — Kalaswar" },
      {
        property: "og:description",
        content: "How things are made, in the maker's own words.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(publishedStoriesQuery());
  },
  component: StoriesIndex,
});

function StoriesIndex() {
  const { t } = useLang();
  const { data: stories } = useSuspenseQuery(publishedStoriesQuery());

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <header className="max-w-2xl">
          <p className="kicker text-terracotta">{t("stories_index_kicker")}</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-foreground md:text-5xl">
            {t("stories_index_title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("stories_index_sub")}</p>
        </header>

        {stories.length === 0 ? (
          <p className="mt-12 border border-border bg-card px-6 py-16 text-center text-muted-foreground">{t("stories_empty")}</p>
        ) : (
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((s, i) => {
              const credit = makerCredit(s.consents, s.artisan_name, null);
              const teaser = s.body.split("\n\n")[0]?.slice(0, 180) ?? "";
              return (
                <Reveal key={s.id} delay={Math.min(i * 0.05, 0.3)}>
                  <Link
                    to="/stories/$id"
                    params={{ id: s.id }}
                    className="group flex h-full flex-col overflow-hidden border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                  >
                    {s.product_image ? (
                      <img
                        src={s.product_image}
                        alt={s.product_name ?? s.title}
                        className="aspect-[4/3] w-full rounded-t-md object-cover"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full rounded-t-md bg-muted" aria-hidden="true" />
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h2 className="font-display text-xl leading-snug text-foreground">{s.title}</h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {teaser}
                        {s.body.length > teaser.length ? "…" : ""}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>
                          {credit ? `${t("stories_made_by")} ${credit}` : t("stories_by_collective")}
                        </span>
                        <span>{formatDate(s.updated_at)}</span>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                        {t("story_read_full")}
                        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}

        <div className="mt-12">
          <DemoBadge />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
