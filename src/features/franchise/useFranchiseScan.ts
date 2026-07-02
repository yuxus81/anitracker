import { useQuery } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { scanFranchise } from './scan';

/** Runs the franchise timeline scan for a MAL id while the modal is open. */
export function useFranchiseScan(malId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: malId ? qk.franchise(malId) : ['franchise', 'none'],
    enabled: enabled && malId !== null,
    queryFn: ({ signal }) => scanFranchise(malId!, signal),
    staleTime: 60 * 60 * 1000, // relations rarely change within a session
  });
}
