// TanStack Query client — configured for mobile + intermittent connectivity.

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 min stale time — product data doesn't change every second.
      // Reduces unnecessary refetches on slow fair wifi.
      staleTime: 1000 * 60 * 5,
      // Keep cached data for 30 min even if the component unmounts.
      // The artisan switches between products/sales screens constantly.
      gcTime: 1000 * 60 * 30,
      // Retry twice with exponential backoff — spotty connectivity.
      retry: 2,
      // Don't refetch on window focus — mobile tab switching is frequent
      // and each refetch on bad wifi is a wasted round-trip.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
