import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Limit TanStack Query retries to 1, but never retry auth errors or timeouts
        retry: (failureCount, error: unknown) => {
          if (failureCount >= 1) return false;
          const err = error as { status?: number; name?: string } | null;
          if (
            err?.status === 401 ||
            err?.status === 403 ||
            err?.status === 408 ||
            err?.name === "TimeoutError"
          ) {
            return false;
          }
          return true;
        },
        staleTime: 30_000,
      },
      mutations: {
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
