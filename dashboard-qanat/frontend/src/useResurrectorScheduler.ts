import { useEffect, useRef, useState } from "react";

type ResurrectorSlot = "morning" | "afternoon";

type ResurrectorAlert = {
  type: "missed_batch" | "auto_ran";
  slot: ResurrectorSlot;
  severity: "warning" | "success";
  message: string;
  ranAt?: string;
};

type ResurrectorSchedule = {
  today: string;
  morningHour: number;
  afternoonHour: number;
  windowEndMinute?: number;
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
    morningHour?: number;
    afternoonHour?: number;
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

/** Só chama a API nestas janelas (e 1 min antes). */
const WINDOW_END_MINUTE = 5;
const DEFAULT_MORNING = 11;
const DEFAULT_AFTERNOON = 18;
/** Dentro da janela, no máximo 1 poll a cada 45s. */
const IN_WINDOW_POLL_MS = 45_000;
/** Fora da janela, só olha o relógio local (sem fetch). */
const CLOCK_CHECK_MS = 30_000;

function isLocalInAutoWindow(
  now = new Date(),
  morningHour = DEFAULT_MORNING,
  afternoonHour = DEFAULT_AFTERNOON,
  endMinute = WINDOW_END_MINUTE
) {
  const h = now.getHours();
  const m = now.getMinutes();
  const end = Math.max(0, Math.min(59, endMinute));
  return (h === morningHour && m <= end) || (h === afternoonHour && m <= end);
}

function isLocalNearWindowStart(
  now = new Date(),
  morningHour = DEFAULT_MORNING,
  afternoonHour = DEFAULT_AFTERNOON
) {
  const h = now.getHours();
  const m = now.getMinutes();
  return (
    (h === morningHour - 1 && m >= 59) || (h === afternoonHour - 1 && m >= 59)
  );
}

async function fetchDashboard(): Promise<ResurrectorDashboardLite | null> {
  try {
    const res = await fetch("/api/youtube/resurrector");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function runBatch(slot: ResurrectorSlot, trigger: "auto" | "manual") {
  const res = await fetch("/api/youtube/resurrector/run-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slot, trigger }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Batch falhou.");
  return data;
}

function shouldAutoTrigger(
  dashboard: ResurrectorDashboardLite,
  slot: ResurrectorSlot
) {
  const settings = dashboard.settings;
  const schedule = dashboard.schedule;
  if (!settings?.enabled || !settings?.autoRunWhenAppOpen || !schedule)
    return false;
  if (slot === "morning")
    return schedule.inMorningWindow && !schedule.morningRan;
  return schedule.inAfternoonWindow && !schedule.afternoonRan;
}

/**
 * Automação do Ressuscitador:
 * - API só em 11:00–11:05 e 18:00–18:05 (horas configuráveis)
 * - Fora da janela: zero fetch (sem spam no painel Backend)
 * - Callback estável via ref (não recria intervals a cada render do App)
 */
export function useResurrectorScheduler(
  onAutoBatch?: (message: string) => void
) {
  const [state, setState] = useState<SchedulerState>({
    badgeCount: 0,
    alerts: [],
    schedule: null,
    lastAutoMessage: null,
  });

  const onAutoBatchRef = useRef(onAutoBatch);
  onAutoBatchRef.current = onAutoBatch;

  const runningRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastApiCallAtRef = useRef(0);
  const autoTriggeredRef = useRef<{
    date: string;
    morning: boolean;
    afternoon: boolean;
  }>({ date: "", morning: false, afternoon: false });
  const hoursRef = useRef({
    morning: DEFAULT_MORNING,
    afternoon: DEFAULT_AFTERNOON,
    endMinute: WINDOW_END_MINUTE,
  });

  useEffect(() => {
    let cancelled = false;

    const applyDashboard = (dashboard: ResurrectorDashboardLite | null) => {
      if (!dashboard || cancelled) return;
      const today = dashboard.schedule?.today || "";
      if (autoTriggeredRef.current.date !== today) {
        autoTriggeredRef.current = {
          date: today,
          morning: false,
          afternoon: false,
        };
      }
      if (dashboard.schedule?.morningHour != null) {
        hoursRef.current.morning = dashboard.schedule.morningHour;
      }
      if (dashboard.schedule?.afternoonHour != null) {
        hoursRef.current.afternoon = dashboard.schedule.afternoonHour;
      }
      if (dashboard.schedule?.windowEndMinute != null) {
        hoursRef.current.endMinute = dashboard.schedule.windowEndMinute;
      }
      setState({
        badgeCount: dashboard.badgeCount ?? 0,
        alerts: dashboard.alerts ?? [],
        schedule: dashboard.schedule ?? null,
        lastAutoMessage: null,
      });
    };

    const tick = async () => {
      if (cancelled || inFlightRef.current) return;

      const now = new Date();
      const { morning, afternoon, endMinute } = hoursRef.current;
      const inWindow = isLocalInAutoWindow(now, morning, afternoon, endMinute);
      const nearStart = isLocalNearWindowStart(now, morning, afternoon);

      // Fora da janela e longe do start: NÃO chama a API.
      if (!inWindow && !nearStart) return;

      // Throttle mínimo entre fetches (evita rajada se o clock loop disparar 2x)
      const minGap = inWindow ? IN_WINDOW_POLL_MS : 60_000;
      if (Date.now() - lastApiCallAtRef.current < minGap) return;

      inFlightRef.current = true;
      lastApiCallAtRef.current = Date.now();
      try {
        const dashboard = await fetchDashboard();
        if (cancelled) return;
        applyDashboard(dashboard);
        if (!dashboard || runningRef.current) return;

        // Só dispara batch dentro da janela real do servidor
        if (
          !dashboard.schedule?.inMorningWindow &&
          !dashboard.schedule?.inAfternoonWindow
        ) {
          return;
        }

        const today = dashboard.schedule?.today || "";
        for (const slot of ["morning", "afternoon"] as ResurrectorSlot[]) {
          if (!shouldAutoTrigger(dashboard, slot)) continue;
          if (slot === "morning" && autoTriggeredRef.current.morning) continue;
          if (slot === "afternoon" && autoTriggeredRef.current.afternoon)
            continue;

          runningRef.current = true;
          try {
            const result = await runBatch(slot, "auto");
            if (cancelled) return;
            if (slot === "morning") autoTriggeredRef.current.morning = true;
            if (slot === "afternoon") autoTriggeredRef.current.afternoon = true;
            autoTriggeredRef.current.date = today;

            const message =
              result.message || `Batch ${slot} executado automaticamente.`;
            setState((prev) => ({ ...prev, lastAutoMessage: message }));
            if (result.dashboard) applyDashboard(result.dashboard);
            onAutoBatchRef.current?.(message);
          } catch {
            /* silencioso */
          } finally {
            runningRef.current = false;
          }
          break;
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    // Mount: só busca se já estamos na janela (ou 1 min antes).
    void tick();

    // Relógio local: fora da janela não gera rede.
    const clockId = window.setInterval(() => {
      void tick();
    }, CLOCK_CHECK_MS);

    return () => {
      cancelled = true;
      window.clearInterval(clockId);
    };
  }, []); // monta 1x — não depende de callback do App

  return state;
}
