import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { artisanQuery, artisanProductsQuery } from "@/lib/data";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductCard } from "@/components/product-card";
import { TipDialog } from "@/components/tip-dialog";
import { DemoNote } from "@/components/demo-note";

export const Route = createFileRoute("/artisan/$id")({
  head: (ctx) => {
    const d = ctx.loaderData as
      | { artisan?: { name?: string; bio?: string; craft?: string } }
      | undefined;
    const name = d?.artisan?.name ?? "Artisan";
    return {
      meta: [
        { title: `${name} — Kalaswar` },
        {
          name: "description",
          content: d?.artisan?.bio ?? "An artisan profile on Kalaswar — her craft, region and story.",
        },
        { property: "og:title", content: `${name} — Kalaswar` },
        { property: "og:description", content: d?.artisan?.craft ?? "Her craft, region and story." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params, context }) => {
    const artisan = await context.queryClient.ensureQueryData(artisanQuery(params.id));
    if (!artisan) throw notFound();
    void context.queryClient.ensureQueryData(artisanProductsQuery(params.id));
    return { artisan };
  },
  component: ArtisanProfile,
});

function ArtisanProfile() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: artisanData } = useSuspenseQuery(artisanQuery(id));
  const artisan = artisanData as NonNullable<typeof artisanData>;
  const { data: products } = useSuspenseQuery(artisanProductsQuery(id));
  const shg = artisan.shg;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <Link
          to="/artisans"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("artisans_title")}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr,1.15fr] lg:gap-16">
          <Reveal>
            <figure className="lg:sticky lg:top-24">
              <div className="overflow-hidden bg-muted">
                <img
                  src={artisan.photo_url ?? ""}
                  alt={`${artisan.name} — ${artisan.craft}`}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            </figure>
          </Reveal>

          <div>
            <Reveal>
              <p className="kicker text-terracotta">{artisan.craft}</p>
              <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">{artisan.name}</h1>
              <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                {shg && (
                  <>
                    <div className="border-t border-border pt-3">
                      <dt className="kicker text-muted-foreground">{t("artisans_collective")}</dt>
                      <dd className="mt-1.5 text-base text-foreground">{shg.name}</dd>
                    </div>
                    <div className="border-t border-border pt-3">
                      <dt className="kicker text-muted-foreground">{t("artisans_region")}</dt>
                      <dd className="mt-1.5 text-base text-foreground">{shg.region}</dd>
                    </div>
                  </>
                )}
              </dl>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                {artisan.bio}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <TipDialog artisanId={artisan.id} artisanName={artisan.name} />
              </div>
              <DemoNote className="mt-4">{t("artisans_private")}</DemoNote>
            </Reveal>

            <section className="mt-14 border-t border-border pt-10">
              <h2 className="font-display text-2xl text-foreground md:text-3xl">
                {t("artisans_works")}
              </h2>
              {products.length === 0 ? (
                <p className="mt-6 text-muted-foreground">{t("app_none")}</p>
              ) : (
                <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2">
                  {products.map((p, i) => (
                    <Reveal key={p.id} delay={Math.min(i, 6) * 0.06}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
