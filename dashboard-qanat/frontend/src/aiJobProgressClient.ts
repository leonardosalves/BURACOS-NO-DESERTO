import toast from "react-hot-toast";
import { describeFetchError, waitForBackendHealth } from "./describeFetchError";

export type AiJobProgressState = {
  jobId: string;
  title: string;
  phase: string;
  label: string;
  percent: number;
  detail?: string;
  active: boolean;
  error?: string | null;
};

type ProgressPayload = {
  phase: string;
  label: string;
  percent: number;
  detail?: string;
  done?: boolean;
  error?: string | null;
  awaitingBrowser?: boolean;
  result?: Record<string, unknown>;
  _transient?: boolean;
  _lost?: boolean;
};

const POLL_MS = 450;
const TOAST_ID = "lumiera-ai-job-progress";
const MAX_NETWORK_FAILS = 48;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let listeners = new Set<(s: AiJobProgressState | null) => void>();
let current: AiJobProgressState | null = null;
let networkFailStreak = 0;
let reconnecting = false;

function emit() {
  for (const fn of listeners) fn(current);
}

export function subscribeAiJobProgress(
  fn: (s: AiJobProgressState | null) => void
) {
  listeners.add(fn);
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}

export function getAiJobProgressState() {
  return current;
}

export function createProgressJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function updateToast(percent: number, label: string, title?: string) {
  const head = title ? `${title} · ` : "";
  toast.loading(`${head}${percent}% — ${label}`, {
    id: TOAST_ID,
    duration: Infinity,
  });
}

async function fetchProgress(jobId: string): Promise<ProgressPayload | null> {
  try {
    const res = await fetch(`/api/ai/progress/${encodeURIComponent(jobId)}`, {
      cache: "no-store",
    });
    networkFailStreak = 0;
    reconnecting = false;

    if (res.status === 404) {
      return {
        _lost: true,
        phase: "unknown",
        label: "Job não encontrado",
        percent: 0,
      };
    }
    if (!res.ok) return null;
    return (await res.json()) as ProgressPayload;
  } catch (err) {
    networkFailStreak += 1;
    if (networkFailStreak >= MAX_NETWORK_FAILS) {
      throw new Error(describeFetchError(err, "consultar progresso do job"));
    }
    if (!reconnecting) {
      reconnecting = true;
      void waitForBackendHealth(60_000, 1_200);
    }
    return {
      _transient: true,
      phase: "reconnect",
      label: "Backend reconectando…",
      percent: current?.percent ?? 0,
    };
  }
}

export async function reportClientProgress(
  jobId: string,
  patch: { phase: string; label: string; percent: number; detail?: string }
) {
  if (!jobId) return;
  await fetch(`/api/ai/progress/${encodeURIComponent(jobId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => {});
  if (current?.jobId === jobId) {
    current = { ...current, ...patch, active: true };
    emit();
    updateToast(patch.percent, patch.label, current.title);
  }
}

export function stopAiJobProgress(success: boolean, message?: string) {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  networkFailStreak = 0;
  reconnecting = false;
  if (success) {
    toast.success(message || "100% — Concluído", {
      id: TOAST_ID,
      duration: 3500,
    });
    if (current) {
      current = { ...current, percent: 100, label: "Concluído", active: false };
      emit();
    }
  } else if (message) {
    toast.error(message, { id: TOAST_ID, duration: 8000 });
    if (current) {
      current = { ...current, active: false, error: message };
      emit();
    }
  } else {
    toast.dismiss(TOAST_ID);
  }
  window.setTimeout(
    () => {
      current = null;
      emit();
    },
    success ? 900 : 1400
  );
}

function applyProgressData(data: ProgressPayload, jobId: string) {
  if (!current || current.jobId !== jobId) return;

  if (data._transient) {
    current = {
      ...current,
      label: data.label || "Backend reconectando…",
      active: true,
    };
    emit();
    updateToast(current.percent, current.label, current.title);
    return;
  }

  if (data._lost) {
    stopAiJobProgress(
      false,
      "Geração interrompida pelo reinício do backend — clique em gerar novamente."
    );
    return;
  }

  current = {
    ...current,
    phase: data.phase,
    label: data.label,
    percent: data.percent,
    detail: data.detail,
    error: data.error ?? null,
    active: !data.done && !data.error,
  };
  emit();
  updateToast(data.percent, data.label, current.title);

  if (data.error) {
    stopAiJobProgress(false, data.error);
  } else if (data.done) {
    stopAiJobProgress(true, `${current.title} · 100%`);
  }
}

export function startAiJobProgress(jobId: string, title: string) {
  if (pollTimer) clearInterval(pollTimer);
  networkFailStreak = 0;
  reconnecting = false;
  current = {
    jobId,
    title,
    phase: "start",
    label: "Iniciando…",
    percent: 0,
    active: true,
  };
  emit();
  updateToast(0, "Iniciando…", title);

  pollTimer = setInterval(async () => {
    if (!current?.jobId) return;
    try {
      const data = await fetchProgress(current.jobId);
      if (!data || current.jobId !== jobId) return;
      applyProgressData(data, jobId);
    } catch (err) {
      stopAiJobProgress(false, describeFetchError(err, "acompanhar geração"));
    }
  }, POLL_MS);
}

export function injectProgressJobId(
  body: Record<string, unknown>,
  jobId?: string
) {
  if (!jobId) return body;
  return { ...body, progress_job_id: jobId };
}

export type AiJobDoneResult = Record<string, unknown> & {
  needs_browser?: boolean;
  error?: string;
  details?: string;
};

/** Aguarda job assíncrono (TTS, narração Creator, etc.) terminar via polling. */
export function waitForAiJobDone(
  jobId: string,
  timeoutMs = 960000
): Promise<AiJobDoneResult> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let fails = 0;

    const tick = async () => {
      if (Date.now() > deadline) {
        reject(new Error("Tempo esgotado na geração — tente de novo."));
        return;
      }
      try {
        const data = await fetchProgress(jobId);
        if (!data) {
          setTimeout(tick, POLL_MS);
          return;
        }
        if (data._transient) {
          setTimeout(tick, POLL_MS * 2);
          return;
        }
        if (data._lost) {
          reject(
            new Error(
              "Geração interrompida pelo reinício do backend — clique em gerar novamente."
            )
          );
          return;
        }
        fails = 0;
        if (data.awaitingBrowser && data.result?.needs_browser) {
          resolve(data.result as AiJobDoneResult);
          return;
        }
        if (data.error) {
          reject(new Error(String(data.error)));
          return;
        }
        if (data.done) {
          resolve((data.result || {}) as AiJobDoneResult);
          return;
        }
        setTimeout(tick, POLL_MS);
      } catch (err) {
        fails += 1;
        if (fails >= MAX_NETWORK_FAILS) {
          reject(
            err instanceof Error
              ? err
              : new Error("Falha ao consultar progresso")
          );
          return;
        }
        setTimeout(tick, POLL_MS * 2);
      }
    };
    tick();
  });
}
