import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { productsQuery, artisansQuery } from "@/lib/data";
import { IMG } from "@/lib/constants";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Wordmark } from "@/components/wordmark";
import { Reveal } from "@/components/reveal";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import runnerImg from "@/assets/product-runner.jpg";
import potteryImg from "@/assets/product-pottery.jpg";
import basketImg from "@/assets/product-basket.jpg";
import madhubaniImg from "@/assets/product-madhubani.jpg";
import keyringImg from "@/assets/product-keyring.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kalaswar — Her craft. Her voice. Her livelihood." },
      {
        name: "description",
        content:
          "Discover the women behind India's living crafts. Explore handmade work, hear their stories, and support the communities keeping these traditions alive.",
      },
      { property: "og:title", content: "Kalaswar — Her craft. Her voice. Her livelihood." },
      {
        property: "og:description",
        content:
          "Handmade crafts from India's women artisan collectives. Every piece names its maker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(productsQuery({}));
    void context.queryClient.ensureQueryData(artisansQuery());
  },
  component: Index,
});

const TILES = [
  { category: "Baskets & Bags", img: IMG.bags, span: "md:col-span-7", aspect: "aspect-[16/10]", pos: "object-[center_60%]" },
  { category: "Textiles & Table", img: runnerImg, span: "md:col-span-5", aspect: "aspect-[16/10]", pos: "" },
  { category: "Home & Storage", img: basketImg, span: "md:col-span-4", aspect: "aspect-[4/3]", pos: "" },
  { category: "Paintings & Wall Art", img: madhubaniImg, span: "md:col-span-4", aspect: "aspect-[4/3]", pos: "" },
  { category: "Toys & Little Things", img: keyringImg, span: "md:col-span-4", aspect: "aspect-[4/3]", pos: "" },
  { category: "Clay & Terracotta", img: potteryImg, span: "md:col-span-12", aspect: "aspect-[16/9] md:aspect-[21/8]", pos: "object-[center_55%]" },
];

function Index() {
  const { t } = useLang();
  const { data: products } = useSuspenseQuery(productsQuery({}));
  const { data: artisans } = useSuspenseQuery(artisansQuery());
  const featured = products.slice(0, 4);
  const makers = artisans.slice(0, 3);

  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main">
        {/* ---------- Hero ---------- */}
        <section ref={heroRef} className="relative overflow-hidden pt-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-10 md:grid-cols-[1.05fr,1fr] md:items-center md:gap-14 md:px-6 md:pt-16 md:pb-24">
            <div>
              <Reveal>
                <p className="kicker text-terracotta">{t("hero_kicker")}</p>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-5 font-display text-4xl leading-[1.12] text-foreground sm:text-5xl lg:text-[3.4rem]">
                  {t("hero_title")}
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                  {t("hero_sub")}
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="h-12 px-7 text-base">
                    <Link to="/explore">
                      {t("hero_cta_explore")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-foreground/25 px-7 text-base hover:border-foreground"
                  >
                    <Link to="/artisans">{t("hero_cta_artisans")}</Link>
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={0.3}>
                <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
                  <Wordmark size="sm" />
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} y={32}>
              <figure className="relative">
                <div className="overflow-hidden">
                  <motion.img
                    src={IMG.working}
                    alt={t("hero_credit")}
                    {...(reduce ? {} : { style: { y: heroY } })}
                    className="aspect-[4/5] w-full scale-[1.08] object-cover md:aspect-[5/6]"
                    loading="eager"
                  />
                </div>
                <figcaption className="mt-3 text-xs text-muted-foreground">
                  {t("hero_credit")}
                </figcaption>
                <span
                  aria-hidden="true"
                  className="absolute -left-3 bottom-10 hidden h-40 w-40 border border-gold/50 md:block"
                />
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ---------- Craft discovery ---------- */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <Reveal>
                  <p className="kicker text-terracotta">{t("crafts_kicker")}</p>
                  <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
                    {t("crafts_title")}
                  </h2>
                  <p className="mt-4 text-muted-foreground">{t("crafts_sub")}</p>
                </Reveal>
              </div>
              <Reveal delay={0.1}>
                <Button asChild variant="ghost" className="text-primary">
                  <Link to="/explore">
                    {t("crafts_explore_all")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Reveal>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-12">
              {TILES.map((tile, i) => (
                <Reveal key={tile.category} delay={i * 0.06} className={`col-span-1 ${tile.span}`}>
                  <Link
                    to="/explore"
                    search={{ category: tile.category }}
                    className={`group relative block overflow-hidden bg-muted ${tile.aspect}`}
                  >
                    <img
                      src={tile.img}
                      alt=""
                      loading="lazy"
                      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] ${tile.pos}`}
                    />
                    <span className="absolute bottom-4 left-4 flex items-center gap-2 bg-card px-4 py-2.5 font-display text-lg text-foreground shadow-sm">
                      {tile.category}
                      <ArrowUpRight
                        className="size-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Featured pieces ---------- */}
        {featured.length > 0 && (
          <section className="border-t border-border">
            <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-3xl text-foreground md:text-4xl">
                  {t("makers_view")}
                </h2>
                <Button asChild variant="ghost" className="text-primary">
                  <Link to="/explore" search={{}}>
                    {t("view_all")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              <div className="mt-10 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((p, i) => (
                  <Reveal key={p.id} delay={i * 0.07}>
                    <ProductCard product={p} priority={i < 2} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Meet the makers ---------- */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <div className="max-w-xl">
              <Reveal>
                <p className="kicker text-terracotta">{t("makers_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
                  {t("makers_title")}
                </h2>
                <p className="mt-4 text-muted-foreground">{t("makers_sub")}</p>
              </Reveal>
            </div>
            <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {makers.map((a, i) => (
                <Reveal key={a.id} delay={i * 0.08}>
                  <Link to="/artisan/$id" params={{ id: a.id }} className="group block">
                    <div className="overflow-hidden bg-muted">
                      <img
                        src={a.photo_url ?? ""}
                        alt={`${a.name} — ${a.craft}`}
                        loading="lazy"
                        className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                      />
                    </div>
                    <p className="kicker mt-5 text-terracotta">{a.craft}</p>
                    <h3 className="mt-2 font-display text-2xl text-foreground group-hover:text-primary">
                      {a.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.shg?.region ? `${a.shg.region}` : ""}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {a.bio}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      {t("makers_view")}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- How Kalaswar works ---------- */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <div className="max-w-xl">
              <Reveal>
                <p className="kicker text-terracotta">{t("works_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
                  {t("works_title")}
                </h2>
              </Reveal>
            </div>
            <div className="mt-12">
              {[
                { n: "01", title: t("works_step1_t"), body: t("works_step1_b") },
                { n: "02", title: t("works_step2_t"), body: t("works_step2_b") },
                { n: "03", title: t("works_step3_t"), body: t("works_step3_b") },
              ].map((step, i) => (
                <Reveal key={step.n} delay={i * 0.08}>
                  <div
                    className={`grid gap-4 border-t border-border py-10 md:grid-cols-[110px,1fr,1.4fr] md:items-baseline md:gap-10 ${
                      i > 0 ? "" : "border-t-0 md:border-t"
                    }`}
                  >
                    <span className="font-display text-4xl text-gold md:text-5xl" aria-hidden="true">
                      {step.n}
                    </span>
                    <h3 className="font-display text-2xl text-foreground">{step.title}</h3>
                    <p className="max-w-xl leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Mission ---------- */}
        <section id="mission" className="scroll-mt-16 bg-primary text-[oklch(0.94_0.015_85)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr,1.1fr] md:items-center md:gap-16 md:px-6 md:py-28">
            <Reveal>
              <figure className="overflow-hidden">
                <img
                  src={IMG.shgGroup}
                  alt="A self-help-group collective with their woven craft — demonstration imagery"
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </figure>
            </Reveal>
            <div>
              <Reveal>
                <p className="kicker text-gold">{t("mission_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl md:text-5xl">{t("mission_title")}</h2>
                <p className="mt-6 max-w-lg leading-relaxed opacity-85">{t("mission_body")}</p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- Closing ---------- */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl gap-px px-4 py-20 md:grid-cols-2 md:px-6 md:py-24">
            <Reveal>
              <div className="md:pr-12">
                <h3 className="font-display text-3xl text-foreground">{t("closing_title").split(".")[0]}.</h3>
                <p className="mt-4 max-w-md text-muted-foreground">{t("closing_customers_sub")}</p>
                <Button asChild className="mt-6 h-11 px-6">
                  <Link to="/explore">{t("closing_cta_customers")}</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="md:border-l md:border-border md:pl-12">
                <h3 className="font-display text-3xl text-foreground">
                  {t("closing_title").split(".")[1]?.trim() || t("closing_title")}
                </h3>
                <p className="mt-4 max-w-md text-muted-foreground">{t("closing_shg_sub")}</p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-6 h-11 border-primary/40 px-6 text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Link to="/shg">{t("closing_cta_shg")}</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
