// Shared, cached loaders. Data files load only when a figure that needs them is first visible.
import { useEffect, useState } from 'preact/hooks';
import { toSeries, type PredictionFile, type Series } from '../../lib/forecastStats';

const cache = new Map<string, Promise<unknown>>();

export function loadJson<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    const p = fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return cache.get(url) as Promise<T>;
}

export type LoadState<T> = { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; data: T };

export function useData<T>(url: string, map?: (raw: unknown) => T): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    loadJson<unknown>(url)
      .then((raw) => live && setState({ status: 'ready', data: map ? map(raw) : (raw as T) }))
      .catch(() => live && setState({ status: 'error', retry: () => setAttempt((a) => a + 1) }));
    return () => {
      live = false;
    };
  }, [url, attempt]);
  return state;
}

let seriesCache: Series | null = null;
export const toSeriesCached = (raw: unknown) => (seriesCache ??= toSeries(raw as PredictionFile));
export const usePredictions = () => useData<Series>('/data/forecast/predictions.json', toSeriesCached);
