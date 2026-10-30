/**
 * /workroom/artisan — Artisan Workroom View
 *
 * Dedicated dashboard for artisans within the Workroom shell:
 * - Active production assignments
 * - Craft guide & materials
 * - Voice assistance & earnings
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRole } from "@/lib/guards";
import { useAuth } from "@/features/auth";
import { Mic, PackageCheck, Sparkles, Wallet } from "lucide-react";

export const Route = createFileRoute("/workroom/artisan")({
  head: () => ({
    meta: [{ title: "Artisan Workroom — Kalaswar" }],
  }),
  beforeLoad: async () => {
    await requireRole("artisan", "coordinator", "admin");
  },
  component: WorkroomArtisanPage,
});

const ARTISAN_LINKS = [
  { to: "/workroom/orders", label: "My Assignments", icon: PackageCheck, desc: "Active orders and item queues" },
  { to: "/artisan-space", label: "Voice Assistant", icon: Mic, desc: "Hands-free listing & queries" },
  { to: "/workroom/products", label: "My Craft Catalog", icon: Sparkles, desc: "Published crafts & stories" },
  { to: "/workroom/artisans", label: "DBT Payouts", icon: Wallet, desc: "Direct benefit transfer & guild roster" },
] as const;

function WorkroomArtisanPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-[var(--kw-space-xl)]">
      <div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">
          Welcome, {user?.name || "Artisan"}
        </h1>
        <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
          Your personal artisan workspace — review assignments, voice updates, and transparent fair-wage payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[var(--kw-space-md)] sm:grid-cols-2 lg:grid-cols-4">
        {ARTISAN_LINKS.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="kw-card group flex flex-col gap-3 no-underline transition-shadow hover:shadow-[var(--kw-shadow-md)]"
          >
            <div className="flex size-10 items-center justify-center rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)]">
              <Icon className="size-5 text-[var(--kw-primary-container)]" aria-hidden="true" />
            </div>
            <div>
              <p className="kw-label-md text-[var(--kw-on-surface)] group-hover:text-[var(--kw-primary-container)] transition-colors">
                {label}
              </p>
              <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
