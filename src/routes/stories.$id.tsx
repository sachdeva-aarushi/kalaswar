import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { shgsQuery, storyByIdQuery } from "@/lib/data";
import { canShowMakerName } from "@/lib/story";
import { formatDate } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { DemoNote } from "@/components/demo-note";

export const Route = createFileRoute("/stories/$id")({
  head: (ctx) => {
    const d = ctx.loaderData as { story?: { title?: string; product_image?: string | null } } | undefined;
    const title = d?.story?.title ?? "Craft story";
    const image = d?.story?.product_image;
    return {
      meta: [
        { title: `${title} — Kalaswar` },
        {
          name: "description",
          content: "A maker-approved craft story from Kalaswar — how a piece is made, in the maker's own words.",
        },
        { property: "og:title", content: `${title} — Kalaswar` },
        {
          property: "og:description",
          content: "A maker-approved craft story from Kalaswar.",
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image && image.startsWith("https://")
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
  loader: async ({ params, context }) => {
    const story = await context.queryClient.ensureQueryData(storyByIdQuery(params.id));
    if (!story) throw notFound();
    return { story };
  },
  component: StoryPage,
});

function StoryPage() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: story } = useSuspenseQuery(storyByIdQuery(id));
  const { data: shgs } = useQuery(shgsQuery());
  if (!story) throw notFound();

  const shg = (shgs ?? []).find((s) => s.id === story.shg_id) ?? null;
  const showName = canShowMakerName(story.consents, story.artisan_name);
  const paragraphs = story.body.split(/\n{2,}/).filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <Link
          to="/stories"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("stories_index_title")}
        </Link>

        <article className="mt-10">
          <Reveal>
            <h1 className="font-display text-4xl leading-tight text-foreground md:text-5xl">{story.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {showName && story.artisan_name && (
                <span className="font-medium text-foreground">
                  {t("stories_made_by")} {story.artisan_name}
                </span>
              )}
              {shg && <span>{shg.name}, {shg.region}</span>}
              <span>
                {t("story_updated")} {formatDate(story.updated_at)}
              </span>
            </div>
            {story.ai_assisted && (
              <p className="mt-4 rounded-sm border border-gold/40 bg-card px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
                {t("story_ai_note")}
              </p>
            )}
          </Reveal>

          <div className="mt-10 space-y-6">
            {paragraphs.map((p, i) => (
              <Reveal key={i} delay={Math.min(i * 0.04, 0.24)}>
                {i === 0 ? (
                  <p className="font-display text-xl leading-relaxed text-foreground md:text-2xl">
                    <Quote className="mr-2 inline size-4 text-terracotta" aria-hidden="true" />
                    {p}
                  </p>
                ) : (
                  <p className="leading-relaxed text-muted-foreground">{p}</p>
                )}
              </Reveal>
            ))}
          </div>

          <Reveal>
            <aside className="mt-12 border-t border-border pt-8">
              <div className="flex items-start gap-4">
                <div className="text-sm leading-relaxed text-muted-foreground">
                  {showName && story.artisan_name ? (
                    <p>
                      <span className="font-medium text-foreground">{story.artisan_name}</span>
                      {shg ? ` — ${shg.name}` : ""}
                    </p>
                  ) : (
                    shg && <p>{shg.name}</p>
                  )}
                  <p className="mt-1 text-xs">{t("story_unverified")}</p>
                </div>
              </div>
              {story.product_id && (
                <Link
                  to="/product/$id"
                  params={{ id: story.product_id }}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {t("story_see_piece")}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              )}
            </aside>
          </Reveal>
        </article>

        <DemoNote className="mt-12">{t("demo_note")}</DemoNote>
      </main>
      <SiteFooter />
    </div>
  );
}
