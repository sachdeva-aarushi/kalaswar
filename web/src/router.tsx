import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Limit TanStack Query retries to 1, but never retry auth errors or timeouts
        retry: (failureCount, error: any) => {
          if (failureCount >= 1) return false;
          if (
            error?.status === 401 ||
            error?.status === 403 ||
            error?.status === 408 ||
            error?.name === "TimeoutError"
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
