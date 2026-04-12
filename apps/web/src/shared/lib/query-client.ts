// TanStack Query client — configured for mobile + intermittent connectivity.
//
// networkMode: 'offlineFirst' on mutations lets the mutationFn fire even
// when the browser reports offline. This is critical for the optimistic
// sale flow — the mutation runs, fails silently (caught in onError), and
// TanStack Query auto-retries it when the onlineManager detects recovery.

import { QueryClient, onlineManager } from '@tanstack/react-query';

// ── Online manager: use real browser events ─────────────────
// TanStack Query's default uses navigator.onLine + window events,
// which is exactly what we want. We just ensure it's initialized.
onlineManager.setEventListener((setOnline) => {
  const onOnline = () => setOnline(true);
  const onOffline = () => setOnline(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
});

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
      // Retry 3 times with backoff — fair wifi drops are transient.
      retry: 3,
      // Allow mutations to fire while offline — the optimistic update
      // shows immediately, and the actual request retries on reconnect.
      networkMode: 'offlineFirst',
    },
  },
});
