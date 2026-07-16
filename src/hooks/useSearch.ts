import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { fetchSearch } from '@/api/discovery';
import { cleanDiscovery } from '@/utils/clean';

/** Debounce a rapidly-changing value. */
export function useDebounced<T>(value: T, ms = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/**
 * Debounced Jikan search. React Query supplies an AbortSignal to the queryFn,
 * so an in-flight request is cancelled automatically when the query changes.
 */
export function useAnimeSearch(rawQuery: string, type: 'tv' | 'movie' | null = null) {
  const query = useDebounced(rawQuery.trim(), 350);
  return useQuery({
    queryKey: [...qk.search(query), type],
    enabled: query.length >= 2,
    queryFn: async ({ signal }) => {
      const res = await fetchSearch(query, type, signal);
      return cleanDiscovery(res);
    },
  });
}
