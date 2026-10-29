import { createFileRoute } from "@tanstack/react-router";
import { ArtisanApp } from "@/components/artisan/artisan-app";
import { artisanOrdersQuery, artisanQuery, artisanSummaryQuery, artisansQuery } from "@/lib/data";
import { DEMO_ARTISAN_ID } from "@/lib/constants";

export const Route = createFileRoute("/artisan-space")({
  head: () => ({
    meta: [
      { title: "Artisan Space — Kalaswar" },
      {
        name: "description",
        content:
          "A voice-first, mobile interface for women artisans — ask about your orders and earnings in English or Hindi, with a simple text fallback.",
      },
      { property: "og:title", content: "Artisan Space — Kalaswar" },
      {
        property: "og:description",
        content: "Ask about your orders and earnings in your own voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(artisansQuery());
    void context.queryClient.ensureQueryData(artisanQuery(DEMO_ARTISAN_ID));
    void context.queryClient.ensureQueryData(artisanOrdersQuery(DEMO_ARTISAN_ID));
    void context.queryClient.ensureQueryData(artisanSummaryQuery(DEMO_ARTISAN_ID));
  },
  component: ArtisanSpace,
});

function ArtisanSpace() {
  return (
    <div className="min-h-screen bg-background" lang="und">
      <ArtisanApp />
    </div>
  );
}
