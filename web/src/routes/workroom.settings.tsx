/**
 * /workroom/settings — Workroom settings placeholder
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/workroom/settings")({
  head: () => ({ meta: [{ title: "Settings — Kalaswar Workroom" }] }),
  component: WorkroomSettings,
});

function WorkroomSettings() {
  return (
    <div className="space-y-[var(--kw-space-lg)]">
      <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Settings</h1>
      <div className="kw-card">
        <p className="kw-body-md text-[var(--kw-on-surface-variant)]">
          Workroom settings (language, notifications, integrations) coming soon.
        </p>
      </div>
    </div>
  );
}
