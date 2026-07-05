import toast from "react-hot-toast";
import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Stethoscope,
  Trash2,
} from "lucide-react";
import type { SettingsSection } from "./SettingsSectionNav";
import type { AppTab } from "./appTabs";

type HealthCheck = {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail";
  detail: string;
  action?: string;
};

type QueueItem = {
  id: string;
  projectSlug: string;
  videoFile: string;
  platforms: string[];
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  notes?: string;
};

export type SocialPublishPanelProps = {
  activeProject: string;
  getProjectUrl: (path: string) => string;
  selectedPlatforms: Record<string, boolean>;
  selectedUploadVideo: string | null;
  setActiveTab: (tab: AppTab) => void;
  setSettingsSection: (s: SettingsSection) => void;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Na fila",
  review: "Revisão",
  scheduled: "Agendado",
  posted: "Publicado",
  failed: "Falhou",
  dismissed: "Descartado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/10",
  review: "text-violet-400 bg-violet-500/10",
  scheduled: "text-sky-400 bg-sky-500/10",
  posted: "text-emerald-400 bg-emerald-500/10",
  failed: "text-red-400 bg-red-500/10",
  dismissed: "text-zinc-500 bg-zinc-800/40",
};

function statusIcon(status: string) {
  if (status === "ok") return "text-emerald-400";
  if (status === "warn") return "text-amber-400";
  return "text-red-400";
}

export function SocialPublishPanel({
  activeProject,
  getProjectUrl,
  selectedPlatforms,
  selectedUploadVideo,
  setActiveTab,
  setSettingsSection,
}: SocialPublishPanelProps) {
  const [healthLoading, setHealthLoading] = useState(false);
  const [queueLoading, setQueueLoading] = useState(false);
  const [health, setHealth] = useState<{
    overall: string;
    checks: HealthCheck[];
    counts?: { ok: number; warn: number; fail: number };
  } | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});

  const refreshHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const url = activeProject
        ? getProjectUrl(
            `/api/social/health?project=${encodeURIComponent(activeProject)}`
          )
        : "/api/social/health";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setHealth(data);
      else toast.error(data.error || "Falha ao verificar setup.");
    } catch {
      toast.error("Falha de conexão ao verificar setup.");
    } finally {
      setHealthLoading(false);
    }
  }, [activeProject, getProjectUrl]);

  const refreshQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await fetch("/api/social/queue");
      const data = await res.json();
      if (res.ok) {
        setQueueItems(Array.isArray(data.items) ? data.items : []);
        setSummary(data.summary || {});
      }
    } catch {
      /* silent on background refresh */
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void refreshQueue();
  }, [refreshHealth, refreshQueue]);

  const enqueueCurrent = async () => {
    const platforms = Object.entries(selectedPlatforms)
      .filter(([, on]) => on)
      .map(([key]) => key);
    if (!platforms.length) {
      toast.error("Selecione ao menos uma plataforma.");
      return;
    }
    try {
      const res = await fetch(getProjectUrl("/api/social/queue/enqueue"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: activeProject,
          videoFile: selectedUploadVideo || undefined,
          platforms,
          status: "review",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.created
            ? "Adicionado à fila de publicação (revisão)."
            : "Este vídeo já está na fila."
        );
        void refreshQueue();
      } else {
        toast.error(data.error || "Erro ao enfileirar.");
      }
    } catch {
      toast.error("Falha de conexão.");
    }
  };

  const updateItem = async (id: string, patch: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/social/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setQueueItems(data.queue?.items || []);
        toast.success("Fila atualizada.");
      } else toast.error(data.error || "Erro ao atualizar.");
    } catch {
      toast.error("Falha de conexão.");
    }
  };

  const removeItem = async (id: string) => {
    try {
      const res = await fetch(`/api/social/queue/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setQueueItems(data.queue?.items || []);
        toast.success("Removido da fila.");
      } else toast.error(data.error || "Erro ao remover.");
    } catch {
      toast.error("Falha de conexão.");
    }
  };

  const overallBadge =
    health?.overall === "ok"
      ? "text-emerald-400"
      : health?.overall === "warn"
        ? "text-amber-400"
        : "text-red-400";

  return (
    <div className="space-y-4">
      {/* Setup Doctor */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-zinc-200">
              Setup de Publicação
            </span>
            {health && (
              <span
                className={`text-[9px] font-bold uppercase ${overallBadge}`}
              >
                {health.overall}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void refreshHealth()}
            disabled={healthLoading}
            className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1 transition disabled:opacity-50"
          >
            {healthLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Verificar
          </button>
        </div>

        {health?.checks?.length ? (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto">
            {health.checks.map((check) => (
              <li
                key={check.id}
                className="flex items-start gap-2 text-[10px] leading-relaxed py-1 border-b border-zinc-900/50 last:border-0"
              >
                <CheckCircle2
                  className={`w-3 h-3 shrink-0 mt-0.5 ${statusIcon(check.status)}`}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-zinc-300">{check.label}</span>
                  <span className="text-zinc-500"> — {check.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-zinc-600 italic">
            Carregando diagnóstico…
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setSettingsSection("integracoes");
            setActiveTab("settings");
          }}
          className="w-full text-[9px] font-bold text-sky-300/90 border border-sky-500/25 hover:bg-sky-500/10 py-2 rounded-lg transition"
        >
          Abrir Integrações
        </button>
      </div>

      {/* Publish Queue */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-gold-400" />
            <span className="text-xs font-bold text-zinc-200">
              Fila de Publicação
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-zinc-500">
            <Activity className="w-3 h-3" />
            {summary.pending || 0} pendente(s)
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Após render, enfileire o vídeo para revisar antes de publicar em
          múltiplas redes. Inspirado no fluxo do AutoSocial.
        </p>

        <button
          type="button"
          onClick={() => void enqueueCurrent()}
          disabled={!activeProject}
          className="w-full bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 disabled:opacity-40 text-gold-300 font-bold py-2.5 rounded-xl text-[10px] transition"
        >
          + Adicionar projeto atual à fila
        </button>

        {queueLoading && queueItems.length === 0 ? (
          <p className="text-[10px] text-zinc-600 italic flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Carregando fila…
          </p>
        ) : queueItems.length === 0 ? (
          <p className="text-[10px] text-zinc-600 italic">Fila vazia.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {queueItems.slice(0, 12).map((item) => (
              <li
                key={item.id}
                className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-zinc-200 truncate">
                      {item.projectSlug}
                    </p>
                    <p className="text-[9px] text-zinc-500 truncate">
                      {item.videoFile}
                    </p>
                  </div>
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0 ${STATUS_COLORS[item.status] || STATUS_COLORS.pending}`}
                  >
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <p className="text-[9px] text-zinc-500">
                  {item.platforms.join(" · ")}
                  {item.scheduledAt && (
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      {new Date(item.scheduledAt).toLocaleString("pt-BR")}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.status === "review" && (
                    <button
                      type="button"
                      onClick={() =>
                        void updateItem(item.id, { status: "pending" })
                      }
                      className="text-[8px] font-bold px-2 py-1 rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      Aprovar
                    </button>
                  )}
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() =>
                        void updateItem(item.id, { status: "review" })
                      }
                      className="text-[8px] font-bold px-2 py-1 rounded border border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                    >
                      Revisar
                    </button>
                  )}
                  {!["posted", "dismissed"].includes(item.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        void updateItem(item.id, { status: "dismissed" })
                      }
                      className="text-[8px] font-bold px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-white"
                    >
                      Descartar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeItem(item.id)}
                    className="text-[8px] font-bold px-2 py-1 rounded border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => void refreshQueue()}
          className="w-full text-[9px] text-zinc-500 hover:text-zinc-300 py-1 transition"
        >
          Atualizar fila
        </button>
      </div>
    </div>
  );
}
