import { useCallback, useEffect, useState, useRef } from "react";
import { pingBackendHealth } from "./describeFetchError";

export function useBackendHealth(pollMs = 10_000) {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  const consecutiveFailsRef = useRef(0);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const ok = await pingBackendHealth(25_000);
      if (ok) {
        consecutiveFailsRef.current = 0;
        setOnline(true);
      } else {
        consecutiveFailsRef.current++;
        if (consecutiveFailsRef.current >= 3) {
          setOnline(false);
        }
      }
      setLastCheck(Date.now());
      return ok;
    } catch {
      consecutiveFailsRef.current++;
      if (consecutiveFailsRef.current >= 3) {
        setOnline(false);
      }
      setLastCheck(Date.now());
      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const ok = await pingBackendHealth(15_000);
        if (!cancelled) {
          if (ok) {
            consecutiveFailsRef.current = 0;
            setOnline(true);
          } else {
            consecutiveFailsRef.current++;
            if (consecutiveFailsRef.current >= 3) {
              setOnline(false);
            }
          }
          setLastCheck(Date.now());
        }
      } catch {
        if (!cancelled) {
          consecutiveFailsRef.current++;
          if (consecutiveFailsRef.current >= 3) {
            setOnline(false);
          }
          setLastCheck(Date.now());
        }
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
