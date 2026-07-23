import React, { useState, useEffect, useRef } from "react";
import {
  Wand2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Terminal,
  X,
  RefreshCw,
  Video,
  FileCheck2,
} from "lucide-react";
import toast from "react-hot-toast";

interface GeminiWatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: string;
  onComplete?: () => void;
}

interface VideoStatus {
  name: string;
  path: string;
  has_backup: boolean;
}

interface ProjectStatusResponse {
  ok: boolean;
  project: string;
  total_videos: number;
  backups_count: number;
  videos: VideoStatus[];
  error?: string;
}

export function GeminiWatermarkModal({
  isOpen,
  onClose,
  activeProject,
  onComplete,
}: GeminiWatermarkModalProps) {
  const [statusData, setStatusData] = useState<ProjectStatusResponse | null>(
    null
  );
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ percent: number; phase: string }>({
    percent: 0,
    phase: "Pronto para iniciar",
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);

  const logConsoleRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchStatus = async () => {
    if (!activeProject) return;
    setLoadingStatus(true);
    try {
      const res = await fetch(
        `/api/render/remove-watermark-gemini/status?project=${encodeURIComponent(activeProject)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setStatusData(data);
        }
      }
    } catch (e) {
      /* ignore */
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setCompletedSummary(null);
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setRunning(false);
    }
  }, [isOpen, activeProject]);

  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const handleStartRemoval = () => {
    if (!activeProject) {
      toast.error("Nenhum projeto ativo selecionado.");
      return;
    }

    setRunning(true);
    setLogs([
      `[WATERMARK] Conectando ao pipeline de Reverse Alpha Blending...`,
    ]);
    setProgress({ percent: 0, phase: "Inicializando..." });
    setCompletedSummary(null);

    const es = new EventSource(
      `/api/render/remove-watermark-gemini/stream?project=${encodeURIComponent(activeProject)}`
    );
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "log") {
          setLogs((prev) => [...prev, data.text]);
        } else if (data.type === "progress") {
          setProgress({
            percent: Math.min(100, Math.max(0, data.percent || 0)),
            phase: data.phase || "Processando...",
          });
        } else if (data.type === "complete") {
          es.close();
          eventSourceRef.current = null;
          setRunning(false);

          if (data.ok) {
            setProgress({ percent: 100, phase: "Concluído com Sucesso!" });
            setCompletedSummary(data.summary);
            toast.success("Remoção de marca d'água concluída!");
            fetchStatus();
            if (onComplete) onComplete();
            window.dispatchEvent(new CustomEvent("lumiera:timeline-updated"));
          } else {
            setProgress((p) => ({ ...p, phase: "Erro no processamento" }));
            toast.error(`Falha: ${data.error || "Erro desconhecido"}`);
          }
        }
      } catch (err) {
        /* parse error */
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setRunning(false);
      setLogs((prev) => [
        ...prev,
        "[WATERMARK] Conexão encerrada com o servidor.",
      ]);
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-zinc-950 border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Removedor de Watermark Gemini
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded-full border border-amber-500/30">
                  Reverse Alpha Blending
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Restauração matemática e remoção limpa das marcas d'água
                Gemini/Veo em todos os vídeos do projeto.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Status do Projeto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <Video className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  Vídeos Encontrados
                </div>
                <div className="text-base font-bold text-zinc-100">
                  {loadingStatus ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-zinc-500 inline" />
                  ) : (
                    (statusData?.total_videos ?? 0)
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  Backups .bak Salvos
                </div>
                <div className="text-base font-bold text-zinc-100">
                  {statusData?.backups_count ?? 0}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3">
              <FileCheck2 className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  Substituição Atômica
                </div>
                <div className="text-base font-bold text-emerald-400">
                  Ativa (Segura)
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                {running && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                )}
                {progress.phase}
              </span>
              <span className="font-mono font-bold text-amber-400">
                {progress.percent}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Resumo ao Concluir */}
          {completedSummary && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold">
                  Processamento em Lote Concluído!
                </div>
                <div className="text-[11px] opacity-90">
                  {completedSummary.processedVideos} vídeo(s) substituído(s) sem
                  marcas d'água. Falhas: {completedSummary.failedVideos}.
                </div>
              </div>
            </div>
          )}

          {/* Terminal / Log Output */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-zinc-400 px-1 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Terminal className="w-3.5 h-3.5 text-amber-400" /> Console de
                Progresso em Tempo Real
              </span>
              <span>{logs.length} linhas de log</span>
            </div>

            <div
              ref={logConsoleRef}
              className="h-52 w-full rounded-xl bg-zinc-950 border border-zinc-800/90 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-800"
            >
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic">
                  Aguardando início do processo. Clique no botão abaixo para
                  iniciar...
                </div>
              ) : (
                logs.map((log, idx) => {
                  let logClass = "text-zinc-300";
                  if (log.includes("SUCESSO") || log.includes("Concluído"))
                    logClass = "text-emerald-400 font-bold";
                  if (log.includes("ERRO") || log.includes("STDERR"))
                    logClass = "text-rose-400";
                  if (log.includes("[WATERMARK]"))
                    logClass = "text-amber-300 font-medium";

                  return (
                    <div key={idx} className={logClass}>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/50">
          <button
            onClick={fetchStatus}
            disabled={running}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition text-xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`}
            />
            <span>Atualizar Status</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={running}
              className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition text-xs font-semibold disabled:opacity-50"
            >
              Fechar
            </button>
            <button
              onClick={handleStartRemoval}
              disabled={running || (statusData?.total_videos ?? 0) === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-zinc-950 font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2 text-xs"
            >
              {running ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Removendo Watermarks...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Iniciar Remoção de Watermarks</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
