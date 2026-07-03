import { useCallback, useEffect, useRef, useState } from 'react';

type ResurrectorSlot = 'morning' | 'afternoon';

type ResurrectorAlert = {
  type: 'missed_batch' | 'auto_ran';
  slot: ResurrectorSlot;
  severity: 'warning' | 'success';
  message: string;
  ranAt?: string;
};

type ResurrectorSchedule = {
  today: string;
  morningHour: number;
  afternoonHour: number;
  morningRan: boolean;
  afternoonRan: boolean;
  nextSlot: ResurrectorSlot | null;
  inMorningWindow: boolean;
  inAfternoonWindow: boolean;
};

type ResurrectorDashboardLite = {
  settings?: {
    enabled?: boolean;
    autoRunWhenAppOpen?: boolean;
  };
  schedule?: ResurrectorSchedule;
  alerts?: ResurrectorAlert[];
  badgeCount?: number;
};

type SchedulerState = {
  badgeCount: number;
  alerts: ResurrectorAlert[];
  schedule: ResurrectorSchedule | null;
  lastAutoMessage: string | null;
};

const POLL_MS = 60_000;

async function fetchDashboard(): Promise<ResurrectorDashboardLite | null> {
  try {
    const res = await fetch('/api/youtube/resurrector');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function runBatch(slot: ResurrectorSlot, trigger: 'auto' | 'manual') {
  const res = await fetch('/api/youtube/resurrector/run-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, trigger }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Batch falhou.');
  return data;
}

function shouldAutoTrigger(dashboard: ResurrectorDashboardLite, slot: ResurrectorSlot) {
  const settings = dashboard.settings;
  const schedule = dashboard.schedule;
  if (!settings?.enabled || !settings?.autoRunWhenAppOpen || !schedule) return false;
  if (slot === 'morning') return schedule.inMorningWindow && !schedule.morningRan;
  return schedule.inAfternoonWindow && !schedule.afternoonRan;
}

export function useResurrectorScheduler(onAutoBatch?: (message: string) => void) {
  const [state, setState] = useState<SchedulerState>({
    badgeCount: 0,
    alerts: [],
    schedule: null,
    lastAutoMessage: null,
  });
  const runningRef = useRef(false);
  const autoTriggeredRef = useRef<{ date: string; morning: boolean; afternoon: boolean }>({
    date: '',
    morning: false,
    afternoon: false,
  });

  const syncFromDashboard = useCallback((dashboard: ResurrectorDashboardLite | null) => {
    if (!dashboard) return;
    const today = dashboard.schedule?.today || '';
    if (autoTriggeredRef.current.date !== today) {
      autoTriggeredRef.current = { date: today, morning: false, afternoon: false };
    }
    setState({
      badgeCount: dashboard.badgeCount ?? 0,
      alerts: dashboard.alerts ?? [],
      schedule: dashboard.schedule ?? null,
      lastAutoMessage: null,
    });
  }, []);

  const tick = useCallback(async () => {
    const dashboard = await fetchDashboard();
    syncFromDashboard(dashboard);
    if (!dashboard || runningRef.current) return;

    const today = dashboard.schedule?.today || '';
    for (const slot of ['morning', 'afternoon'] as ResurrectorSlot[]) {
      if (!shouldAutoTrigger(dashboard, slot)) continue;
      if (slot === 'morning' && autoTriggeredRef.current.morning) continue;
      if (slot === 'afternoon' && autoTriggeredRef.current.afternoon) continue;

      runningRef.current = true;
      try {
        const result = await runBatch(slot, 'auto');
        if (slot === 'morning') autoTriggeredRef.current.morning = true;
        if (slot === 'afternoon') autoTriggeredRef.current.afternoon = true;
        autoTriggeredRef.current.date = today;

        const message = result.message || `Batch ${slot} executado automaticamente.`;
        setState((prev) => ({ ...prev, lastAutoMessage: message }));
        if (result.dashboard) syncFromDashboard(result.dashboard);
        onAutoBatch?.(message);
      } catch {
        // silencioso — usuário pode disparar manualmente
      } finally {
        runningRef.current = false;
      }
      break;
    }
  }, [onAutoBatch, syncFromDashboard]);

  useEffect(() => {
    void tick();
    const interval = window.setInterval(() => { void tick(); }, POLL_MS);
    return () => window.clearInterval(interval);
  }, [tick]);

  return state;
}