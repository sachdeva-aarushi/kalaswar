import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workroom/orders")({
  component: () => <Outlet />,
});
