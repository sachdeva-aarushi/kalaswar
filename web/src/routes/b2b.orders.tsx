import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/b2b/orders")({
  component: () => <Outlet />,
});
