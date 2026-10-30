/**
 * /gift — Public gift concierge parent layout route
 */

import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";

export const Route = createFileRoute("/gift")({
  head: () => ({
    meta: [
      { title: "Gift — Kalaswar MakePossible" },
      { name: "description", content: "Commission a bespoke handcrafted gift from India's women artisan collectives." },
    ],
  }),
  component: GiftLayout,
});

function GiftLayout() {
  return <PublicShell section="gift" />;
}
