import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { aggregateFranchise } from './aggregate';

/** Rolls a MAL id's whole franchise into per-type counts for the detail popup. */
export function useFranchiseAggregate(malId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: malId ? qk.franchiseAggregate(malId) : ['franchise-aggregate', 'none'],
    enabled: enabled && malId !== null,
    queryFn: ({ signal }) => aggregateFranchise(malId!, signal),
    staleTime: 60 * 60 * 1000, // relations rarely change within a session
  });
}
