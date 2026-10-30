/**
 * /gift (index) — Gift concierge landing
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Mic, Sparkles } from "lucide-react";

export const Route = createFileRoute("/gift/")({
  head: () => ({ meta: [{ title: "Commission a Gift — Kalaswar" }] }),
  component: GiftIndex,
});

const HOW_IT_WORKS = [
  { icon: Mic, step: "1", title: "Describe your vision", desc: "Tell us in your own words (text or voice) what you're looking for — occasion, craft, budget, personalisation." },
  { icon: Sparkles, step: "2", title: "We find the artisan", desc: "Our coordinators match your request to the right collective and send a feasibility proposal within 48 hours." },
  { icon: Gift, step: "3", title: "Commission confirmed", desc: "You approve the proposal, the artisan makes it by hand, and it ships directly from the collective to you." },
];

function GiftIndex() {
  return (
    <div className="space-y-[var(--kw-space-2xl)] max-w-3xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-16 rounded-[var(--kw-radius-lg)] bg-[var(--kw-tertiary-container)]">
          <Gift className="size-8 text-[var(--kw-on-tertiary-container)]" aria-hidden="true" />
        </div>
        <h1 className="kw-headline-xl text-[var(--kw-on-surface)]">Commission a bespoke gift</h1>
        <p className="kw-body-lg text-[var(--kw-on-surface-variant)]">
          Every Kalaswar gift is made to order by the hands of women artisans. Tell us what you have in mind.
        </p>
        <Link to="/auth" search={{ redirect: undefined }} className="kw-btn kw-btn-primary inline-flex">
          Start a commission
        </Link>
      </div>

      <div className="space-y-[var(--kw-space-md)]">
        <h2 className="kw-headline-sm text-[var(--kw-on-surface)]">How it works</h2>
        <div className="grid gap-[var(--kw-space-md)]">
          {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="kw-card flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--kw-radius)] bg-[var(--kw-surface-container)]">
                <Icon className="size-5 text-[var(--kw-primary-container)]" aria-hidden="true" />
              </div>
              <div>
                <p className="kw-label-sm text-[var(--kw-on-surface-variant)] mb-0.5">Step {step}</p>
                <h3 className="kw-headline-sm text-[var(--kw-on-surface)]">{title}</h3>
                <p className="mt-1 kw-body-sm text-[var(--kw-on-surface-variant)]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
