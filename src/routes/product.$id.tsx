import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { useLang } from "@/lib/i18n";
import { productQuery } from "@/lib/data";
import { formatINR } from "@/lib/money";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { TipDialog } from "@/components/tip-dialog";
import { UpiPayDialog } from "@/components/upi-pay-dialog";
import { DemoNote } from "@/components/demo-note";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/product/$id")({
  head: (ctx) => {
    const d = ctx.loaderData as
      | { product?: { name?: string; description?: string } }
      | undefined;
    const name = d?.product?.name ?? "Craft";
    return {
      meta: [
        { title: `${name} — Kalaswar` },
        {
          name: "description",
          content:
            d?.product?.description ??
            "A handmade piece from an Indian women's artisan collective.",
        },
        { property: "og:title", content: `${name} — Kalaswar` },
        {
          property: "og:description",
          content: d?.product?.description ?? "Handmade by a woman artisan collective.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData(productQuery(params.id));
    if (!product) throw notFound();
    return { product };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { t } = useLang();
  const { id } = Route.useParams();
  const { data: productData } = useSuspenseQuery(productQuery(id));
  const product = productData as NonNullable<typeof productData>;
  const artisan = product.artisan;
  const shg = product.shg;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-24 md:px-6 md:pt-28">
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("explore_title")}
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Photograph */}
          <Reveal>
            <figure className="lg:sticky lg:top-24">
              <div className="overflow-hidden bg-muted">
                <img
                  src={product.image_url ?? ""}
                  alt={product.name}
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            </figure>
          </Reveal>

          {/* Detail */}
          <div>
            <Reveal>
              <p className="kicker text-terracotta">{product.category}</p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-foreground md:text-5xl">
                {product.name}
              </h1>
              <div className="mt-5 flex items-baseline gap-4">
                <p className="text-2xl font-medium tabular-nums text-foreground">
                  {formatINR(product.price)}
                </p>
                <span
                  className={`rounded-sm px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] ${
                    product.availability
                      ? "bg-[oklch(0.93_0.03_150)] text-leaf"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {product.availability ? t("available") : t("unavailable")}
                </span>
              </div>
              <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
                {product.description}
              </p>
              {!product.availability && (
                <p className="mt-3 text-sm text-muted-foreground">{t("product_unavailable_note")}</p>
              )}
            </Reveal>

            {/* Maker */}
            {artisan && (
              <Reveal delay={0.08}>
                <aside className="mt-10 border-t border-border pt-8">
                  <h2 className="kicker text-muted-foreground">{t("product_maker")}</h2>
                  <div className="mt-4 flex items-start gap-4">
                    {artisan.photo_url && (
                      <img
                        src={artisan.photo_url}
                        alt=""
                        className="size-16 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="font-display text-xl text-foreground">{artisan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {artisan.craft}
                        {shg ? ` · ${shg.name}, ${shg.region}` : ""}
                      </p>
                      <Link
                        to="/artisan/$id"
                        params={{ id: artisan.id }}
                        className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                      >
                        {t("product_view_profile")}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                  <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">{t("product_story")}: </span>
                    {artisan.bio}
                  </p>
                </aside>
              </Reveal>
            )}

            {/* Actions */}
            <Reveal delay={0.14}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" className="h-12 px-7">
                      {t("product_inquire")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl">{t("product_inquire")}</DialogTitle>
                      <DialogDescription>{t("product_inquire_note")}</DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md border border-border bg-secondary p-4 text-sm text-secondary-foreground">
                      <p className="font-medium">{product.name}</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatINR(product.price)} · {t("by")} {artisan?.name}
                      </p>
                    </div>
                    <DemoNote>{t("demo_note")}</DemoNote>
                  </DialogContent>
                </Dialog>
                <UpiPayDialog
                  upiId={shg?.upi_id ?? null}
                  payeeName={shg?.name ?? artisan?.name ?? "Kalaswar"}
                  amount={Number(product.price)}
                  note={product.name}
                />
                {artisan && <TipDialog artisanId={artisan.id} artisanName={artisan.name} tone="outline" />}
              </div>
              <DemoNote className="mt-4">{t("demo_note")}</DemoNote>
            </Reveal>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
