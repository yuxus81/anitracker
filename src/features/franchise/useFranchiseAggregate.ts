import { useEffect, useRef, useState } from 'react';
import { aggregateFranchise, type FranchiseAggregate } from './aggregate';

type Status = 'loading' | 'partial' | 'done' | 'error';

interface State {
  data: FranchiseAggregate | null;
  status: Status;
}

// In-session cache so reopening the same franchise is instant. Relations barely
// change within a session; the per-anime IndexedDB cache handles cross-session
// speed, this handles instant re-open without even re-walking the graph.
const sessionCache = new Map<number, FranchiseAggregate>();

/**
 * Rolls a MAL id's whole franchise into per-type counts for the detail popup.
 * Loads progressively: tiles appear after the first BFS wave and fill in live,
 * so a cold franchise feels responsive instead of blocking on a blank skeleton.
 */
export function useFranchiseAggregate(malId: number | null, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, status: 'loading' });
  const [retry, setRetry] = useState(0);
  const runRef = useRef(0);

  useEffect(() => {
    if (!enabled || malId == null) {
      setState({ data: null, status: 'loading' });
      return;
    }

    const cached = sessionCache.get(malId);
    if (cached) {
      setState({ data: cached, status: 'done' });
      return;
    }

    setState({ data: null, status: 'loading' });
    const controller = new AbortController();
    const run = ++runRef.current;

    aggregateFranchise(malId, {
      signal: controller.signal,
      onWave: (partial) => {
        if (run === runRef.current) setState({ data: partial, status: 'partial' });
      },
    })
      .then((final) => {
        if (run !== runRef.current) return;
        sessionCache.set(malId, final);
        setState({ data: final, status: 'done' });
      })
      .catch((err: unknown) => {
        if (run !== runRef.current) return;
        if ((err as Error)?.name === 'AbortError') return;
        setState({ data: null, status: 'error' });
      });

    return () => controller.abort();
  }, [malId, enabled, retry]);

  return {
    data: state.data,
    isLoading: state.status === 'loading',
    isPartial: state.status === 'partial',
    isError: state.status === 'error',
    refetch: () => {
      if (malId != null) sessionCache.delete(malId);
      setRetry((n) => n + 1);
    },
  };
}
