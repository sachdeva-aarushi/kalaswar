/**
 * /workroom/artisan — Artisan Workroom View
 *
 * Dedicated dashboard for artisans within the Workroom shell:
 * - SHG Membership & Join Requests (Feature 2)
 * - Profile and language shortcuts (Feature 1)
 * - Product creation & validation flow (Feature 3)
 * - Active production assignments & craft catalog
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { requireRole } from "@/lib/guards";
import { useAuth } from "@/features/auth";
import {
  useBackendProfile,
  useShgClusters,
  useSubmitArtisanJoinRequest,
} from "@/features/auth/hooks";
import {
  CheckCircle2,
  Clock,
  Mic,
  PackageCheck,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/workroom/artisan")({
  head: () => ({
    meta: [{ title: "Artisan Workroom — Kalaswar" }],
  }),
  beforeLoad: async () => {
    await requireRole("artisan", "coordinator");
  },
  component: WorkroomArtisanPage,
});

const ARTISAN_LINKS = [
  { to: "/workroom/products/new", label: "Add New Product", icon: PlusCircle, desc: "Photo & Voice AI listing draft" },
  { to: "/workroom/orders", label: "My Assignments", icon: PackageCheck, desc: "Active orders and item queues" },
  { to: "/artisan-space", label: "Voice Assistant", icon: Mic, desc: "Hands-free listing & queries" },
  { to: "/workroom/products", label: "My Craft Catalog", icon: Sparkles, desc: "Published crafts & stories" },
  { to: "/workroom/artisans", label: "DBT Payouts", icon: Wallet, desc: "Direct benefit transfer & ledger" },
  { to: "/workroom/settings", label: "Profile & Language", icon: Settings, desc: "Language preference & bio" },
] as const;

function WorkroomArtisanPage() {
  const { user } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useBackendProfile();
  const { data: clusters = [], isLoading: isClustersLoading } = useShgClusters();
  const joinRequest = useSubmitArtisanJoinRequest();

  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [experienceYears, setExperienceYears] = useState("5");
  const [dailyCapacity, setDailyCapacity] = useState("2");
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const isApproved = profile?.onboarding_status === "approved" || profile?.onboarding_status === "completed";
  const isPendingApproval = profile?.onboarding_status === "pending_approval";
  const hasNoShg = !profile?.shg_id && !isApproved;

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClusterId) return;

    setJoinError(null);
    try {
      await joinRequest.mutateAsync({
        cluster_id: selectedClusterId,
        self_declared_experience_years: parseInt(experienceYears, 10) || 1,
        daily_capacity: parseInt(dailyCapacity, 10) || 1,
      });
      setJoinSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit SHG join request";
      setJoinError(msg);
    }
  };

  return (
    <div className="space-y-[var(--kw-space-xl)] pb-16">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">
            Welcome, {profile?.display_name || user?.name || "Artisan"}
          </h1>
          <p className="mt-1 kw-body-md text-[var(--kw-on-surface-variant)]">
            Your personal artisan workspace — craft listings, assignments, and transparent DBT payouts.
          </p>
        </div>

        <Link
          to="/workroom/products/new"
          className="kw-btn kw-btn-primary flex items-center gap-2 self-start sm:self-center"
        >
          <PlusCircle className="size-4" />
          <span>Add Craft Listing</span>
        </Link>
      </div>

      {/* SHG Membership Status & Join Flow (Feature 2) */}
      <section className="kw-card p-6">
        <div className="flex items-center gap-3 border-b border-[var(--kw-outline-variant)] pb-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-primary)]">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">Self-Help Group (SHG) Guild</h2>
            <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
              SHG membership enables listing validation, inventory pooling, and collective dispatch.
            </p>
          </div>
        </div>

        {isProfileLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[var(--kw-on-surface-variant)]">
            <Loader2 className="size-4 animate-spin" />
            <span>Checking guild membership...</span>
          </div>
        ) : isApproved && profile?.shg_id ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-4 border border-emerald-200">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-900 text-sm">Active Guild Member</p>
              <p className="text-xs text-emerald-700">
                You are an approved artisan member of SHG Collective <span className="font-mono">{profile.shg_id}</span>.
                Your product listings are validated directly through this collective.
              </p>
            </div>
          </div>
        ) : isPendingApproval || joinSuccess ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 p-4 border border-amber-200">
            <Clock className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 text-sm">Join Request Submitted (Pending Approval)</p>
              <p className="text-xs text-amber-700">
                Your request to join the SHG cluster has been received. Once the SHG coordinator approves your profile, you will be able to publish listings and accept assignments.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[var(--kw-on-surface)]">
              You are currently not affiliated with an approved SHG cluster. Choose a local cluster to request membership:
            </p>

            {joinError && (
              <div className="rounded-md bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {joinError}
              </div>
            )}

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider mb-1">
                    Select SHG Cluster
                  </label>
                  {isClustersLoading ? (
                    <div className="text-xs text-muted-foreground">Loading clusters...</div>
                  ) : (
                    <select
                      value={selectedClusterId}
                      onChange={(e) => setSelectedClusterId(e.target.value)}
                      required
                      className="w-full h-10 px-3 rounded-md border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--kw-primary)]"
                    >
                      <option value="">-- Choose SHG Cluster --</option>
                      {clusters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.state ? `(${c.state})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider mb-1">
                    Craft Experience (Years)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--kw-on-surface-variant)] uppercase tracking-wider mb-1">
                    Daily Capacity (Pieces)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={dailyCapacity}
                    onChange={(e) => setDailyCapacity(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!selectedClusterId || joinRequest.isPending}
                  className="kw-btn kw-btn-primary flex items-center gap-2"
                >
                  {joinRequest.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  <span>Submit Join Request</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 gap-[var(--kw-space-md)] sm:grid-cols-2 lg:grid-cols-3">
        {ARTISAN_LINKS.map(({ to, label, icon: Icon, desc }) => (
          <Link
            key={to}
            to={to}
            className="kw-card group flex flex-col gap-3 no-underline transition-shadow hover:shadow-[var(--kw-shadow-md)] p-5"
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
