import { useEffect } from 'react';
import { realtimeClient, RealtimeEvent, SubscribeOptions } from '../services/realtimeClient';

/**
 * Subscribe to realtime order-sync events (44.16).
 *
 * - Connects once on mount, reuses the singleton on subsequent mounts.
 * - Filters events by the passed predicate (e.g. only events for a specific order / store).
 * - Cleans up the listener on unmount.
 */
export function useRealtime(
  onEvent: (e: RealtimeEvent) => void,
  opts?: { subscribe?: SubscribeOptions; filter?: (e: RealtimeEvent) => boolean }
): void {
  useEffect(() => {
    realtimeClient.connect();
    if (opts?.subscribe) realtimeClient.subscribe(opts.subscribe);

    const off = realtimeClient.on((e) => {
      if (opts?.filter && !opts.filter(e)) return;
      onEvent(e);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
