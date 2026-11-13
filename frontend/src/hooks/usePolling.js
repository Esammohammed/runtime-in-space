import { useEffect, useRef, useState } from 'react';

/**
 * Calls `fetcher` now and then every `intervalMs`. Restarts when `deps` change.
 * Returns { data, error, loading, refresh }.
 */
export default function usePolling(fetcher, intervalMs, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = async (isActive = () => true) => {
    try {
      const data = await fetcherRef.current();
      if (isActive()) setState({ data, error: null, loading: false });
    } catch (error) {
      if (isActive()) setState((previous) => ({ ...previous, error, loading: false }));
    }
  };

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    setState((previous) => ({ ...previous, loading: true }));
    load(isActive);
    const timer = setInterval(() => load(isActive), intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { ...state, refresh: () => load() };
}
