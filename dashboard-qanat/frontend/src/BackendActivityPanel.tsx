import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Film,
  Loader2,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
} from "lucide-react";

type ActivityRequest = {
  id: number;
  method: string;
  path: string;
  project?: string;
  startedAt: number;
  status: number | null;
  durationMs: number | null;
  ok: boolean | null;
  kind?: string;
  label?: string;
};

type AiJob = {
  jobId: string;
  phase?: string;
  label?: string;
  percent?: number;
  detail?: string;
  done?: boolean;
  error?: string | null;
  awaitingBrowser?: boolean;
  provider?: string | null;
  model?: string | null;
  updatedAt?: number;
};

type AiFeedItem = {
  id: string;
  kind?: "job" | "call" | string;
  label?: string;
  phase?: string;
  percent?: number;
  provider?: string | null;
  model?: string | null;
  modelsTried?: string[];
  detail?: string | null;
  status?: string;
  error?: string | null;
  path?: string;
  project?: string;
  awaitingBrowser?: boolean;
  startedAt?: number;
  updatedAt?: number;
  durationMs?: number | null;
};

type RenderJob = {
  jobId: string;
  projectName?: string;
  status?: string;
  phase?: string;
  percent?: number;
  done?: boolean;
  error?: string | null;
  updatedAt?: number;
  logTail?: string[];
};

type ProjectEvent = {
  timestamp?: string;
  level?: string;
  component?: string;
  event?: string;
  message?: string;
};

type AiQuota = {
  ok?: boolean;
  provider?: string;
  model?: string;
  label?: string;
  detail?: string;
  note?: string;
  free_tier?: boolean | null;
  is_free_model?: boolean;
  usage?: number | null;
  usage_daily?: number | null;
  usage_weekly?: number | null;
  usage_monthly?: number | null;
  limit?: number | null;
  remaining?: number | null;
  unit?: string;
  free_rpm?: number | null;
  free_rpd?: number | null;
  gemini_key_count?: number | null;
  updatedAt?: number;
  cached?: boolean;
};

type ActivityPayload = {
  ok?: boolean;
  ts?: number;
  health?: {
    uptime_sec?: number;
    pid?: number;
    render_active?: number;
    busy?: boolean;
    memory_mb?: number;
    ai_provider?: string;
    ai_model?: string;
    gemini_model?: string;
    openrouter_model?: string;
    nvidia_model?: string;
  };
  ai_quota?: AiQuota | null;
  project?: string | null;
  requests?: ActivityRequest[];
  ai_jobs?: AiJob[];
  ai_calls?: AiFeedItem[];
  ai_feed?: AiFeedItem[];
  render_jobs?: RenderJob[];
  project_events?: ProjectEvent[];
  error?: string;
};

const STORAGE_KEY = "lumiera_backend_activity_open";

function formatTime(ts?: number | string) {
  if (ts == null || ts === "") return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(String(ts));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms?: number | null) {
  if (ms == null || Number.isNaN(ms)) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function statusClass(status: number | null, ok: boolean | null) {
  if (status == null) return "text-amber-300";
  if (ok === false || status >= 400) return "text-red-400";
  if (status >= 300) return "text-amber-300";
  return "text-emerald-400";
}

function aiStatusColor(status?: string) {
  if (status === "error") return "text-red-400";
  if (status === "ok") return "text-emerald-400";
  if (status === "browser") return "text-sky-300";
  return "text-amber-300";
}

function aiStatusLabel(status?: string) {
  if (status === "error") return "erro";
  if (status === "ok") return "ok";
  if (status === "browser") return "browser";
  if (status === "running") return "rodando";
  return status || "…";
}

export type BackendActivityPanelProps = {
  activeProject?: string;
};

export function BackendActivityPanel({
  activeProject = "",
}: BackendActivityPanelProps) {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [payload, setPayload] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tab, setTab] = useState<"requests" | "ai" | "render" | "events">(
    "requests"
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "80" });
      if (activeProject) qs.set("project", activeProject);
      const res = await fetch(`/api/ops/activity?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as ActivityPayload;
      setPayload(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    if (!open) return;
    void fetchActivity();
  }, [open, fetchActivity]);

  useEffect(() => {
    if (!open || !autoRefresh) return;
    const id = window.setInterval(() => {
      void fetchActivity();
    }, 2500);
    return () => window.clearInterval(id);
  }, [open, autoRefresh, fetchActivity]);

  const health = payload?.health;
  const aiQuota = payload?.ai_quota || null;
  const requests = payload?.requests || [];
  const aiJobs = payload?.ai_jobs || [];
  const aiFeed = useMemo(() => {
    if (payload?.ai_feed && payload.ai_feed.length > 0) {
      return payload.ai_feed;
    }
    // Fallback: jobs legados sem ai_feed
    return (aiJobs || []).map((j) => ({
      id: j.jobId,
      kind: "job" as const,
      label: j.label || j.phase || j.jobId,
      phase: j.phase,
      percent: j.percent,
      provider: j.provider,
      model: j.model,
      detail: j.detail,
      status: j.error ? "error" : j.done ? "ok" : "running",
      error: j.error,
      awaitingBrowser: j.awaitingBrowser,
      updatedAt: j.updatedAt,
      durationMs: null,
    }));
  }, [payload?.ai_feed, aiJobs]);
  const renderJobs = payload?.render_jobs || [];
  const events = payload?.project_events || [];

  const activeAi = useMemo(
    () =>
      aiFeed.filter((j) => j.status === "running" || j.status === "browser")
        .length,
    [aiFeed]
  );
  const activeRender = Number(health?.render_active || 0);

  return (
    <>
      {/* Toggle — borda direita */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed z-[90] top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-l-xl border border-r-0 px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] shadow-xl transition ${
          open
            ? "right-[min(420px,92vw)] border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
            : "right-0 border-white/10 bg-[#0a0c12]/95 text-zinc-300 hover:border-cyan-400/30 hover:text-cyan-100"
        }`}
        title={
          open
            ? "Esconder processos do backend"
            : "Mostrar processos do backend"
        }
        aria-expanded={open}
      >
        <Activity className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline writing-mode-vertical">
          {open ? "Esconder" : "Backend"}
        </span>
        {open ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
        {(activeAi > 0 || activeRender > 0) && !open && (
          <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black text-black">
            {activeAi + activeRender}
          </span>
        )}
      </button>

      {/* Painel lateral */}
      <aside
        className={`fixed top-0 right-0 z-[85] flex h-full w-[min(420px,92vw)] flex-col border-l border-white/10 bg-[#07090f]/98 shadow-[-24px_0_60px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <header className="shrink-0 border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/90">
                <Server className="h-3.5 w-3.5" />
                Processos do backend
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Chamadas API, jobs de IA e renders em tempo real
                {activeProject ? (
                  <span className="text-zinc-400">
                    {" "}
                    · projeto {activeProject}
                  </span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:border-white/20 hover:text-white"
              title="Esconder"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 text-center sm:grid-cols-4">
            <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                Uptime
              </p>
              <p className="font-mono text-[11px] text-zinc-200">
                {health?.uptime_sec != null
                  ? `${Math.floor(health.uptime_sec / 60)}m`
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                RAM
              </p>
              <p className="font-mono text-[11px] text-zinc-200">
                {health?.memory_mb != null ? `${health.memory_mb} MB` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                Provider
              </p>
              <p className="truncate font-mono text-[10px] text-fuchsia-200">
                {health?.ai_provider || "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2 py-1.5">
              <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                Modelo
              </p>
              <p
                className="truncate font-mono text-[9px] text-cyan-200"
                title={
                  health?.ai_model ||
                  health?.openrouter_model ||
                  health?.gemini_model ||
                  ""
                }
              >
                {(
                  health?.ai_model ||
                  health?.openrouter_model ||
                  health?.gemini_model ||
                  "—"
                ).replace(/^models\//, "")}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center">
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                health?.busy
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {health?.busy ? "ocupado" : "idle"}
              {activeAi > 0 ? ` · ${activeAi} IA` : ""}
              {activeRender > 0 ? ` · ${activeRender} render` : ""}
            </span>
          </div>

          {/* Cota do provedor / modelo ativo */}
          {aiQuota && (
            <div
              className={`mt-2 rounded-lg border px-2.5 py-2 ${
                aiQuota.ok === false
                  ? "border-red-500/25 bg-red-500/10"
                  : "border-fuchsia-500/20 bg-fuchsia-500/[0.07]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-fuchsia-200/90">
                  Cota · {aiQuota.provider || health?.ai_provider || "IA"}
                </p>
                {aiQuota.is_free_model || aiQuota.free_tier ? (
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-bold text-emerald-300">
                    free
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-1 text-[11px] font-bold leading-snug ${
                  aiQuota.ok === false ? "text-red-200" : "text-zinc-100"
                }`}
              >
                {aiQuota.label || "—"}
              </p>
              {aiQuota.detail ? (
                <p className="mt-0.5 text-[9px] leading-relaxed text-zinc-400">
                  {aiQuota.detail}
                </p>
              ) : null}
              {(aiQuota.free_rpm != null || aiQuota.free_rpd != null) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {aiQuota.free_rpm != null ? (
                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[8px] text-cyan-200">
                      ~{aiQuota.free_rpm} RPM
                    </span>
                  ) : null}
                  {aiQuota.free_rpd != null ? (
                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[8px] text-cyan-200">
                      ~{aiQuota.free_rpd} req/dia
                    </span>
                  ) : null}
                  {aiQuota.gemini_key_count != null ? (
                    <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[8px] text-cyan-200">
                      {aiQuota.gemini_key_count} chave(s)
                    </span>
                  ) : null}
                </div>
              )}
              {aiQuota.limit != null &&
                aiQuota.remaining != null &&
                Number(aiQuota.limit) > 0 && (
                  <div className="mt-1.5">
                    <div className="h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-fuchsia-400"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(
                              100,
                              (Number(aiQuota.remaining) /
                                Number(aiQuota.limit)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-[8px] text-zinc-600">
                      restante {Number(aiQuota.remaining).toFixed(4)}
                      {aiQuota.unit ? ` ${aiQuota.unit}` : ""} /{" "}
                      {Number(aiQuota.limit).toFixed(2)}
                      {aiQuota.unit ? ` ${aiQuota.unit}` : ""}
                    </p>
                  </div>
                )}
              {aiQuota.note ? (
                <p className="mt-1 text-[8px] leading-relaxed text-zinc-600">
                  {aiQuota.note}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[9px] font-bold text-zinc-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-cyan-500"
              />
              Auto 2,5s
            </label>
            <button
              type="button"
              onClick={() => void fetchActivity()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-bold text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setPayload(null)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-800 px-2.5 py-1 text-[9px] font-bold text-zinc-500 transition hover:text-zinc-300"
            >
              <Trash2 className="h-3 w-3" />
              Limpar vista
            </button>
          </div>

          <div className="mt-3 flex gap-1">
            {(
              [
                ["requests", "API", requests.length],
                ["ai", "IA", aiFeed.length],
                ["render", "Render", renderJobs.length],
                ["events", "Eventos", events.length],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 rounded-lg border px-1.5 py-1.5 text-[9px] font-black uppercase tracking-wide transition ${
                  tab === id
                    ? "border-cyan-400/35 bg-cyan-500/15 text-cyan-100"
                    : "border-white/[0.05] bg-black/20 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
                <span className="ml-0.5 font-mono text-[8px] opacity-70">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 font-mono text-[10px]">
          {error && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-red-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!payload && !error && (
            <p className="text-zinc-600 italic">Carregando atividade…</p>
          )}

          {tab === "requests" && (
            <ul className="space-y-1">
              {requests.length === 0 && (
                <li className="text-zinc-600 italic">
                  Nenhuma chamada API recente.
                </li>
              )}
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-white/[0.05] bg-black/25 px-2 py-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sky-300">{r.method}</span>
                    <span className={statusClass(r.status, r.ok)}>
                      {r.status ?? "…"}
                      {r.durationMs != null ? ` · ${r.durationMs}ms` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 break-all text-zinc-300">{r.path}</p>
                  {r.label ? (
                    <p className="mt-0.5 text-[8px] text-fuchsia-300/80">
                      {r.label}
                    </p>
                  ) : null}
                  <div className="mt-0.5 flex justify-between text-[8px] text-zinc-600">
                    <span>{formatTime(r.startedAt)}</span>
                    {r.project ? (
                      <span className="truncate max-w-[50%]">{r.project}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {tab === "ai" && (
            <ul className="space-y-1.5">
              {aiFeed.length === 0 && (
                <li className="space-y-1 text-zinc-600 italic">
                  <p>Nenhuma chamada de IA ainda.</p>
                  <p className="text-[9px] not-italic text-zinc-700">
                    Ao gerar roteiro, metadados, pesquisa ou Visual PRO, o
                    modelo e o status aparecem aqui.
                  </p>
                </li>
              )}
              {aiFeed.map((item) => {
                const isRunning =
                  item.status === "running" || item.status === "browser";
                const pct =
                  item.percent != null
                    ? item.percent
                    : item.status === "ok"
                      ? 100
                      : item.status === "error"
                        ? 100
                        : 35;
                return (
                  <li
                    key={item.id}
                    className="rounded-lg border border-white/[0.05] bg-black/25 px-2 py-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5 text-fuchsia-200">
                        {isRunning ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate font-bold">
                          {item.label || item.phase || item.id}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[8px] font-bold uppercase ${aiStatusColor(item.status)}`}
                      >
                        {aiStatusLabel(item.status)}
                        {item.durationMs != null
                          ? ` · ${formatDuration(item.durationMs)}`
                          : ""}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1">
                      {item.provider ? (
                        <span className="rounded border border-fuchsia-500/25 bg-fuchsia-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-fuchsia-200">
                          {item.provider}
                        </span>
                      ) : null}
                      {item.model ? (
                        <span
                          className="max-w-full truncate rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-bold text-cyan-100"
                          title={item.model}
                        >
                          {item.model.replace(/^models\//, "")}
                        </span>
                      ) : null}
                      {item.kind === "job" ? (
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-zinc-500">
                          job
                        </span>
                      ) : (
                        <span className="rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-zinc-500">
                          llm
                        </span>
                      )}
                    </div>

                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.status === "error"
                            ? "bg-red-500"
                            : item.status === "ok"
                              ? "bg-emerald-500"
                              : "bg-fuchsia-400"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {item.detail ? (
                      <p className="mt-1 line-clamp-2 text-[9px] text-zinc-400">
                        {item.detail}
                      </p>
                    ) : null}

                    {item.error ? (
                      <p className="mt-0.5 line-clamp-2 text-[9px] text-red-400">
                        {item.error}
                      </p>
                    ) : null}

                    {item.modelsTried && item.modelsTried.length > 1 ? (
                      <p className="mt-0.5 line-clamp-1 text-[8px] text-zinc-600">
                        cadeia:{" "}
                        {item.modelsTried
                          .map((m) => m.replace(/^models\//, ""))
                          .join(" → ")}
                      </p>
                    ) : null}

                    <div className="mt-0.5 flex justify-between gap-2 text-[8px] text-zinc-700">
                      <span className="truncate">
                        {item.project || item.path || item.id}
                      </span>
                      <span>
                        {formatTime(item.updatedAt || item.startedAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === "render" && (
            <ul className="space-y-1.5">
              {renderJobs.length === 0 && (
                <li className="text-zinc-600 italic">Nenhum render.</li>
              )}
              {renderJobs.map((j) => (
                <li
                  key={j.jobId}
                  className="rounded-lg border border-white/[0.05] bg-black/25 px-2 py-1.5"
                >
                  <div className="flex items-center gap-1.5 text-amber-200">
                    <Film className="h-3 w-3 shrink-0" />
                    <span className="truncate font-bold">
                      {j.projectName || j.jobId}
                    </span>
                  </div>
                  <p className="mt-0.5 text-zinc-400">
                    {j.phase || j.status} · {j.percent ?? 0}%
                    {j.error ? (
                      <span className="text-red-400"> · {j.error}</span>
                    ) : null}
                  </p>
                  {j.logTail && j.logTail.length > 0 && (
                    <pre className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-[8px] text-zinc-600">
                      {j.logTail.join("\n")}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}

          {tab === "events" && (
            <ul className="space-y-1">
              {events.length === 0 && (
                <li className="text-zinc-600 italic">
                  Sem eventos no log do projeto.
                </li>
              )}
              {events.map((e, i) => (
                <li
                  key={`${e.timestamp || i}-${e.event || i}`}
                  className="rounded-lg border border-white/[0.05] bg-black/25 px-2 py-1.5"
                >
                  <div className="flex justify-between gap-2 text-[8px] text-zinc-600">
                    <span className="text-cyan-500/80">
                      {e.component || "lumiera"}
                    </span>
                    <span>{formatTime(e.timestamp)}</span>
                  </div>
                  <p className="text-zinc-300">
                    {e.event || e.level}
                    {e.message ? ` — ${e.message}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/[0.06] px-3 py-2 text-[8px] text-zinc-600">
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            PID {health?.pid ?? "—"} · atualizado {formatTime(payload?.ts)}
          </span>
        </footer>
      </aside>
    </>
  );
}
