import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ShortcutId } from './shortcuts';

/**
 * Runs `run` once when the layout opened this page for shortcut `id` (location state `{ shortcut }`)
 * and `ready` is true. The state is then dropped, so a reload or remount never repeats it.
 */
export function useShortcutRequest(id: ShortcutId, ready: boolean, run: () => void) {
  const location = useLocation();
  const navigate = useNavigate();
  // React runs effects twice in development; one location is handled once.
  const handled = useRef<string | null>(null);
  const requested = (location.state as { shortcut?: unknown } | null)?.shortcut === id;

  useEffect(() => {
    if (!requested || !ready || handled.current === location.key) return;
    handled.current = location.key;
    void navigate(location.pathname + location.search, { replace: true, state: null });
    // After the effect, so `run` may set state.
    void Promise.resolve().then(run);
  });
}
