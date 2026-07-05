import { useCallback, useEffect, useState } from "react";
import { pingBackendHealth } from "./describeFetchError";

export function useBackendHealth(pollMs = 10_000) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await pingBackendHealth(25_000);
      setOnline(ok);
      setLastCheck(Date.now());
      return ok;
    } catch {
      setOnline(false);
      setLastCheck(Date.now());
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await pingBackendHealth(25_000);
      if (!cancelled) {
        setOnline(ok);
        setLastCheck(Date.now());
      }
    };
    void run();
    const id = window.setInterval(() => {
      void run();
    }, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { online, checking, lastCheck, recheck: check };
}
