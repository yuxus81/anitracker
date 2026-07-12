import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Server state (Supabase rows + Jikan responses)
 * is cached here so we avoid redundant network calls and rate-limit pressure.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Jikan data barely changes minute-to-minute; keep it fresh for a while.
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Central place for query keys so invalidation stays consistent and typo-free. */
export const qk = {
  animes: ['animes'] as const,
  discovery: (section: string, page: number, genre: number | null) =>
    ['discovery', section, page, genre] as const,
  search: (query: string) => ['search', query] as const,
  animeDetail: (malId: number) => ['anime-detail', malId] as const,
  franchise: (malId: number) => ['franchise', malId] as const,
};
