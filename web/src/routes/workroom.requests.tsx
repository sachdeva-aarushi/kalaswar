import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workroom/requests")({
  component: () => <Outlet />,
});
