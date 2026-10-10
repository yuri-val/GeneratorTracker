import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Current time, refreshed every `intervalMs` while the app is in the foreground (and right away when
 * it comes back). Pass `enabled = false` to stop ticking, e.g. when nothing is running.
 * 3.0: Home and the live bar tick every 60 s, the generator screen every second.
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      setNow(Date.now());
      if (!timer) timer = setInterval(() => setNow(Date.now()), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState !== 'background') start();
    const sub = AppState.addEventListener('change', state => (state === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, [intervalMs, enabled]);

  return now;
}
