/**
 * /workroom — Coordinator Workroom layout route
 *
 * This is the parent layout route for all /workroom/* pages.
 * It applies the WorkroomShell and enforces coordinator/admin/artisan role guard.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/lib/guards";
import { WorkroomShell } from "@/components/workroom-shell";

export const Route = createFileRoute("/workroom")({
  head: () => ({
    meta: [
      { title: "Workroom — Kalaswar" },
      { name: "description", content: "Kalaswar SHG Coordinator Workroom — manage orders, products, artisans and production." },
    ],
  }),
  beforeLoad: async () => {
    await requireRole("admin", "coordinator", "artisan");
  },
  component: WorkroomLayout,
});

function WorkroomLayout() {
  return <WorkroomShell />;
}
