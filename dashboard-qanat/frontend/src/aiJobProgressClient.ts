import toast from 'react-hot-toast';

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

const POLL_MS = 450;
const TOAST_ID = 'lumiera-ai-job-progress';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let listeners = new Set<(s: AiJobProgressState | null) => void>();
let current: AiJobProgressState | null = null;

function emit() {
  for (const fn of listeners) fn(current);
}

export function subscribeAiJobProgress(fn: (s: AiJobProgressState | null) => void) {
  listeners.add(fn);
  fn(current);
  return () => listeners.delete(fn);
}

export function getAiJobProgressState() {
  return current;
}

export function createProgressJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function updateToast(percent: number, label: string, title?: string) {
  const head = title ? `${title} · ` : '';
  toast.loading(`${head}${percent}% — ${label}`, {
    id: TOAST_ID,
    duration: Infinity,
  });
}

async function fetchProgress(jobId: string) {
  const res = await fetch(`/api/ai/progress/${encodeURIComponent(jobId)}`);
  if (!res.ok) return null;
  return res.json() as Promise<{
    phase: string;
    label: string;
    percent: number;
    detail?: string;
    done?: boolean;
    error?: string | null;
  }>;
}

export async function reportClientProgress(
  jobId: string,
  patch: { phase: string; label: string; percent: number; detail?: string },
) {
  if (!jobId) return;
  await fetch(`/api/ai/progress/${encodeURIComponent(jobId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  if (success) {
    toast.success(message || '100% — Concluído', { id: TOAST_ID, duration: 3500 });
    if (current) {
      current = { ...current, percent: 100, label: 'Concluído', active: false };
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
  window.setTimeout(() => {
    current = null;
    emit();
  }, success ? 900 : 1400);
}

export function startAiJobProgress(jobId: string, title: string) {
  if (pollTimer) clearInterval(pollTimer);
  current = {
    jobId,
    title,
    phase: 'start',
    label: 'Iniciando…',
    percent: 0,
    active: true,
  };
  emit();
  updateToast(0, 'Iniciando…', title);

  pollTimer = setInterval(async () => {
    if (!current?.jobId) return;
    const data = await fetchProgress(current.jobId);
    if (!data || current.jobId !== jobId) return;
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
  }, POLL_MS);
}

export function injectProgressJobId(body: Record<string, unknown>, jobId?: string) {
  if (!jobId) return body;
  return { ...body, progress_job_id: jobId };
}