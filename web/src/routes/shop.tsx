/**
 * /shop — Public shop parent layout route
 */

import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — Kalaswar" },
      { name: "description", content: "Discover and buy handcrafted products from India's women artisan collectives." },
    ],
  }),
  component: ShopLayout,
});

function ShopLayout() {
  return <PublicShell section="shop" />;
}
