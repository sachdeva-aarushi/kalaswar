/**
 * /workroom/admin — Deprecated legacy route redirected to canonical SHG workspace (/shg).
 * Platform administration is strictly handled via direct database/infrastructure access;
 * there is no 'admin' user role in the application.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workroom/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/shg" });
  },
  component: () => null,
});
