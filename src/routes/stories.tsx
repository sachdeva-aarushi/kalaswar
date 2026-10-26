import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Pathless parent for /stories and /stories/$id — renders only the child.
 * (A file named stories.tsx claims all child segments; without this outlet
 * the index would swallow the detail route.)
 */
export const Route = createFileRoute("/stories")({
  component: Outlet,
});
