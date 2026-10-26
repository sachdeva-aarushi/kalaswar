import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, Mic, BookOpen, Scale, Handshake } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { productsQuery, artisansQuery, publishedStoriesQuery } from "@/lib/data";
import { IMG } from "@/lib/constants";
import { makerCredit } from "@/lib/story";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import logoWhite from "@/assets/kalaswar-logo-white.png.asset.json";
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
          "Discover extraordinary craft created by women-led artisan collectives across India. Every piece carries the skill, story, and livelihood of the woman who made it.",
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
    void context.queryClient.ensureQueryData(publishedStoriesQuery());
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
  const { data: stories } = useSuspenseQuery(publishedStoriesQuery());
  const featured = products.slice(0, 4);
  const makers = artisans.slice(0, 3);
  const featuredStory = stories.find((s) => s.product_image) ?? stories[0];
  const moreStories = stories.filter((s) => s.id !== featuredStory?.id).slice(0, 2);

  const heroRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main id="main">
        {/* ---------- Hero: the signature brand moment ---------- */}
        <section ref={heroRef} className="relative overflow-hidden bg-primary text-[oklch(0.977_0.009_84.6)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-20 pt-24 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-14 md:px-6 md:pb-28 md:pt-36">
            <div>
              <Reveal>
                <img
                  src={logoWhite.url}
                  alt="Kalaswar — कलास्वर"
                  className="h-16 w-auto md:h-20"
                  loading="eager"
                />
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-8 font-display text-4xl leading-[1.1] sm:text-5xl lg:text-[3.5rem]">
                  {t("hero2_title")}
                </h1>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-6 max-w-lg text-base leading-relaxed opacity-85 md:text-lg">
                  {t("hero2_sub")}
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 bg-[oklch(0.977_0.009_84.6)] px-7 text-base text-primary hover:bg-white"
                  >
                    <Link to="/explore">
                      {t("hero2_cta_craft")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 border-[oklch(0.977_0.009_84.6)]/40 bg-transparent px-7 text-base text-[oklch(0.977_0.009_84.6)] hover:border-[oklch(0.977_0.009_84.6)] hover:bg-white/10 hover:text-[oklch(0.977_0.009_84.6)]"
                  >
                    <Link to="/artisans">{t("hero2_cta_meet")}</Link>
                  </Button>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1} y={32}>
              <figure className="relative mx-auto max-w-md md:max-w-none">
                <div className="overflow-hidden">
                  <motion.img
                    src={IMG.working}
                    alt={t("hero_credit")}
                    {...(reduce ? {} : { style: { y: heroY } })}
                    className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
                    loading="eager"
                  />
                </div>
                <img
                  src={basketImg}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute -bottom-6 -left-6 hidden w-36 border-4 border-primary object-cover shadow-lg md:block lg:w-44"
                />
                <span
                  aria-hidden="true"
                  className="absolute -right-3 -top-3 h-24 w-24 border border-gold/60"
                />
                <figcaption className="mt-3 text-xs opacity-70">{t("hero_credit")}</figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ---------- The hands behind the craft ---------- */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-16 md:px-6 md:py-28">
            <Reveal>
              <div className="grid grid-cols-2 gap-4">
                <figure className="col-span-2 overflow-hidden">
                  <img
                    src={potteryImg}
                    alt="Clay craft in the making — demonstration imagery"
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </figure>
                <figure className="overflow-hidden">
                  <img
                    src={madhubaniImg}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </figure>
                <figure className="overflow-hidden">
                  <img
                    src={runnerImg}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </figure>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <p className="kicker text-terracotta">{t("hands_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-4xl">
                  {t("hands_title")}
                </h2>
                <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
                  {t("hands_body")}
                </p>
                <Button asChild variant="ghost" className="mt-6 px-0 text-primary hover:bg-transparent hover:text-primary/80">
                  <Link to="/explore">
                    {t("hero2_cta_craft")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- Craft discovery tiles ---------- */}
        <section className="border-b border-border bg-card/40">
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
          <section className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-24">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <Reveal>
                  <p className="kicker text-terracotta">{t("collection_kicker")}</p>
                  <h2 className="mt-3 font-display text-3xl text-foreground md:text-4xl">
                    {t("collection_title")}
                  </h2>
                </Reveal>
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

        {/* ---------- Meet the artisans ---------- */}
        <section className="border-b border-border bg-card/40">
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
                    <div className="relative overflow-hidden bg-muted">
                      <img
                        src={a.photo_url ?? ""}
                        alt={`${a.name} — ${a.craft}`}
                        loading="lazy"
                        className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute inset-3 border border-[oklch(0.977_0.009_84.6)]/50 transition-colors group-hover:border-gold/70"
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

        {/* ---------- Craft stories ---------- */}
        {featuredStory && (
          <section className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-xl">
                  <Reveal>
                    <p className="kicker text-terracotta">{t("stories_home_kicker")}</p>
                    <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
                      {t("stories_home_title")}
                    </h2>
                    <p className="mt-4 text-muted-foreground">{t("stories_home_sub")}</p>
                  </Reveal>
                </div>
                <Reveal delay={0.1}>
                  <Button asChild variant="ghost" className="text-primary">
                    <Link to="/stories">
                      {t("nav_stories")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </Reveal>
              </div>

              <div className="mt-12 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                <Reveal>
                  <Link
                    to="/stories/$id"
                    params={{ id: featuredStory.id }}
                    className="group block"
                  >
                    {featuredStory.product_image ? (
                      <div className="overflow-hidden">
                        <img
                          src={featuredStory.product_image}
                          alt={featuredStory.product_name ?? featuredStory.title}
                          loading="lazy"
                          className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] w-full bg-muted" aria-hidden="true" />
                    )}
                    <h3 className="mt-6 font-display text-3xl leading-snug text-foreground group-hover:text-primary md:text-4xl">
                      {featuredStory.title}
                    </h3>
                    <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
                      {featuredStory.body.split("\n\n")[0]?.slice(0, 220)}
                      {featuredStory.body.length > 220 ? "…" : ""}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      {t("stories_read")}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </Link>
                </Reveal>
                <div className="flex flex-col gap-8">
                  {moreStories.map((s, i) => {
                    const credit = makerCredit(s.consents, s.artisan_name, null);
                    return (
                      <Reveal key={s.id} delay={0.08 + i * 0.08} className="flex-1">
                        <Link
                          to="/stories/$id"
                          params={{ id: s.id }}
                          className="group flex h-full flex-col border-t border-border pt-6"
                        >
                          <p className="kicker text-gold">{credit ?? t("stories_by_collective")}</p>
                          <h4 className="mt-3 font-display text-2xl leading-snug text-foreground group-hover:text-primary">
                            {s.title}
                          </h4>
                          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                            {s.body.split("\n\n")[0]?.slice(0, 160)}
                            {s.body.length > 160 ? "…" : ""}
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                            {t("stories_read")}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                          </span>
                        </Link>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------- The Kalaswar difference: four pillars ---------- */}
        <section className="border-b border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <div className="max-w-xl">
              <Reveal>
                <p className="kicker text-terracotta">{t("pillars_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
                  {t("pillars_title")}
                </h2>
              </Reveal>
            </div>
            <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Mic, title: t("pillar_voice_t"), body: t("pillar_voice_b") },
                { icon: BookOpen, title: t("pillar_stories_t"), body: t("pillar_stories_b") },
                { icon: Scale, title: t("pillar_fair_t"), body: t("pillar_fair_b") },
                { icon: Handshake, title: t("pillar_b2b_t"), body: t("pillar_b2b_b") },
              ].map((pillar, i) => (
                <Reveal key={pillar.title} delay={i * 0.06} className="h-full">
                  <div className="flex h-full flex-col bg-card p-8">
                    <span className="grid h-11 w-11 shrink-0 place-items-center border border-primary/30 text-primary">
                      <pillar.icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-display text-xl leading-snug text-foreground">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {pillar.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- For businesses ---------- */}
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 md:grid-cols-[1fr_1.05fr] md:items-center md:gap-16 md:px-6 md:py-28">
            <div>
              <Reveal>
                <p className="kicker text-terracotta">{t("b2b_kicker")}</p>
                <h2 className="mt-4 font-display text-3xl leading-tight text-foreground md:text-4xl">
                  {t("b2b_home_title")}
                </h2>
                <p className="mt-5 max-w-lg leading-relaxed text-muted-foreground">
                  {t("b2b_body")}
                </p>
                <Button asChild className="mt-7 h-12 bg-primary px-7 text-base hover:bg-primary/90">
                  <Link to="/b2b/request">
                    {t("b2b_cta")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <figure className="relative">
                <div className="overflow-hidden">
                  <img
                    src={runnerImg}
                    alt="Handwoven textiles — demonstration imagery"
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-3 -left-3 h-28 w-28 border border-gold/60"
                />
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ---------- Mission ---------- */}
        <section id="mission" className="scroll-mt-16 bg-primary text-[oklch(0.977_0.009_84.6)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1fr_1.1fr] md:items-center md:gap-16 md:px-6 md:py-28">
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

        {/* ---------- Closing brand moment ---------- */}
        <section className="bg-wine text-[oklch(0.977_0.009_84.6)]">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6 md:py-28">
            <Reveal>
              <img
                src={logoWhite.url}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="mx-auto h-12 w-auto opacity-90"
              />
              <h2 className="mt-8 font-display text-3xl leading-tight md:text-5xl">
                {t("closing2_title")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl leading-relaxed opacity-80">
                {t("closing2_body")}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 bg-[oklch(0.977_0.009_84.6)] px-7 text-base text-primary hover:bg-white"
                >
                  <Link to="/explore">{t("closing2_cta")}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-[oklch(0.977_0.009_84.6)]/40 bg-transparent px-7 text-base text-[oklch(0.977_0.009_84.6)] hover:border-[oklch(0.977_0.009_84.6)] hover:bg-white/10 hover:text-[oklch(0.977_0.009_84.6)]"
                >
                  <Link to="/b2b">{t("closing2_cta_b2b")}</Link>
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
