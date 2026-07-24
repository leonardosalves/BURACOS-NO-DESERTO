import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Tv,
  Plus,
  Play,
  Check,
  Loader2,
  Copy,
  Upload,
  FileText,
  Image as ImageIcon,
  Terminal,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Video,
  Download,
  Calendar,
  Clock,
} from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";

type RunItem = {
  id: number;
  topic: string;
  folder_path: string;
  status: "draft" | "waiting_for_images" | "rendering" | "completed" | "error";
  duration_sec: number;
  created_at: string;
};

type BoardImageStatus = {
  present: boolean;
  filename: string;
  size: number;
  imageUrl?: string;
};

type RunDetail = {
  run: RunItem;
  hasScript: boolean;
  hasPlan: boolean;
  hasVideo: boolean;
  imageReport: any;
  segments: any[];
  scriptTitle?: string;
  prompts: Record<string, string>;
  imagesStatus: Record<string, BoardImageStatus>;
};

type Props = {
  activeProject: string;
  getProjectUrl: (path: string) => string;
  postAi: (path: string, body: unknown) => Promise<any>;
};

export function WhiteboardCreatorPanel({
  activeProject,
  getProjectUrl,
  postAi,
}: Props) {
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [runsLoading, setRunsLoading] = useState<boolean>(false);

  // Form states
  const [topic, setTopic] = useState<string>("");
  const [durationSec, setDurationSec] = useState<number>(45);
  const [creating, setCreating] = useState<boolean>(false);

  // Active run tab
  const [activeSubTab, setActiveSubTab] = useState<
    "script" | "images" | "render" | "result"
  >("script");

  // Render logs
  const [renderLogs, setRenderLogs] = useState<string[]>([]);
  const [rendering, setRendering] = useState<boolean>(false);
  const [previewReady, setPreviewReady] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<{
    error: string;
    stage?: string;
    failedStep?: string | null;
    errorLog?: string;
    reportPath?: string | null;
  } | null>(null);

  // Validação pré-render
  const [precheck, setPrecheck] = useState<{
    ready: boolean;
    checks: {
      category: string;
      label: string;
      status: string;
      message: string;
    }[];
    passCount: number;
    warnCount: number;
    failCount: number;
  } | null>(null);
  const [precheckLoading, setPrecheckLoading] = useState<boolean>(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchDetail(selectedRunId);
    } else {
      setDetail(null);
    }
  }, [selectedRunId]);

  const fetchRuns = async () => {
    setRunsLoading(true);
    try {
      const res = await fetch("/api/whiteboard/runs");
      const data = await res.json();
      if (res.ok && data.success) {
        setRuns(data.runs || []);
      } else {
        toast.error("Erro ao carregar histórico de execuções.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro de conexão com o servidor.");
    } finally {
      setRunsLoading(false);
    }
  };

  const fetchDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/whiteboard/detail?id=${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDetail(data);
        if (data.hasVideo) {
          setActiveSubTab("result");
        } else if (data.imageReport && data.imageReport.status !== "complete") {
          setActiveSubTab("images");
        } else {
          setActiveSubTab("script");
        }
      } else {
        toast.error(data.error || "Erro ao carregar detalhes do projeto.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar detalhes.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Por favor, digite um tema ou roteiro.");
      return;
    }
    setCreating(true);
    const toastId = toast.loading("Iniciando geração de roteiro e prompts...");
    try {
      const res = await fetch("/api/whiteboard/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, durationSec }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          "Roteiro e prompts gerados! Prossiga para a aba de imagens.",
          { id: toastId }
        );
        setTopic("");
        await fetchRuns();
        if (data.folderName) {
          // Find the created run
          const matched = data.folderName;
          const found = runs.find((r) => r.folder_path.includes(matched));
          // Just reload list and select first
          fetchRuns().then(() => {
            // Select the most recent run
            setTimeout(() => {
              if (runs.length > 0) setSelectedRunId(runs[0].id);
            }, 500);
          });
        } else {
          fetchRuns();
        }
      } else {
        toast.error(data.error || "Erro ao gerar projeto.", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Conexão falhou ao iniciar projeto.", { id: toastId });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copiado para a área de transferência!");
  };

  const triggerFileInput = (boardId: string) => {
    fileInputRefs.current[boardId]?.click();
  };

  const handleImageUpload = async (boardId: string, file: File) => {
    if (!selectedRunId) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      const toastId = toast.loading(`Enviando imagem para ${boardId}...`);
      try {
        const res = await fetch("/api/whiteboard/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: selectedRunId,
            boardId,
            imageBase64: base64,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(`Imagem de ${boardId} salva com sucesso!`, {
            id: toastId,
          });
          fetchDetail(selectedRunId);
        } else {
          toast.error(data.error || "Falha ao enviar imagem.", { id: toastId });
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Erro ao enviar arquivo.", { id: toastId });
      }
    };
  };

  const handleRender = async (resume = false) => {
    if (!selectedRunId) return;
    setRendering(true);
    setRenderError(null);
    setRenderLogs([
      resume
        ? "Retomando renderização do ponto da falha..."
        : "Iniciando pipeline de renderização...",
      "1. Gerando narração com Fish TTS em Português...",
    ]);
    setActiveSubTab("render");
    const toastId = toast.loading(
      resume
        ? "Retomando renderização..."
        : "Renderizando vídeo quadro branco..."
    );
    try {
      const res = await fetch("/api/whiteboard/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: selectedRunId, resume }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRenderLogs((prev) => [
          ...prev,
          ...data.logs,
          "Renderização concluída com sucesso!",
        ]);
        toast.success("Vídeo quadro branco renderizado com sucesso!", {
          id: toastId,
        });
        fetchRuns();
        fetchDetail(selectedRunId);
        setActiveSubTab("result");
      } else {
        setRenderError({
          error: data.error || "Falha na renderização.",
          stage: data.stage,
          failedStep: data.failedStep,
          errorLog: data.errorLog,
          reportPath: data.reportPath,
        });
        setRenderLogs((prev) => [
          ...prev,
          `ERRO: ${data.error || "Falha na renderização."}${
            data.stage ? ` (etapa: ${data.stage})` : ""
          }`,
        ]);
        toast.error(data.error || "Erro de renderização.", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      setRenderError({ error: "Erro de conexão com o servidor." });
      setRenderLogs((prev) => [...prev, "ERRO de conexão com o servidor."]);
      toast.error("Erro ao iniciar renderização.", { id: toastId });
    } finally {
      setRendering(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedRunId) return;
    setRendering(true);
    setRenderError(null);
    setPreviewReady(false);
    setRenderLogs([
      "Gerando prévia de baixa resolução (draft)...",
      "1. Verificando narração...",
    ]);
    setActiveSubTab("render");
    const toastId = toast.loading("Gerando prévia de baixa resolução...");
    try {
      const res = await fetch("/api/whiteboard/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: selectedRunId, preview: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRenderLogs((prev) => [
          ...prev,
          ...data.logs,
          "Prévia pronta (baixa resolução). Revise antes do render final.",
        ]);
        setPreviewReady(true);
        toast.success("Prévia gerada. Revise antes do render final.", {
          id: toastId,
        });
        fetchRuns();
        fetchDetail(selectedRunId);
      } else {
        setRenderError({
          error: data.error || "Falha na prévia.",
          stage: data.stage,
          failedStep: data.failedStep,
          errorLog: data.errorLog,
          reportPath: data.reportPath,
        });
        setRenderLogs((prev) => [
          ...prev,
          `ERRO: ${data.error || "Falha na prévia."}`,
        ]);
        toast.error(data.error || "Erro na prévia.", { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      setRenderError({ error: "Erro de conexão com o servidor." });
      setRenderLogs((prev) => [...prev, "ERRO de conexão com o servidor."]);
      toast.error("Erro ao gerar prévia.", { id: toastId });
    } finally {
      setRendering(false);
    }
  };

  const allImagesUploaded = () => {
    if (!detail) return false;
    const boards = Object.keys(detail.prompts);
    if (boards.length === 0) return false;
    return boards.every((b) => detail.imagesStatus[b]?.present);
  };

  const runPrecheck = async () => {
    if (!selectedRunId) return;
    setPrecheckLoading(true);
    try {
      const res = await fetch(`/api/whiteboard/precheck?id=${selectedRunId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPrecheck(data);
      } else {
        toast.error(data.error || "Falha na validação pré-render.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao executar validação pré-render.");
    } finally {
      setPrecheckLoading(false);
    }
  };

  return (
    <DashminPageLayout
      title="Vídeo Quadro Branco"
      subtitle="Explicadores desenhados à mão com narração Fish Speech em Português · pipeline whiteboard-video"
      breadcrumb={["Dashboard", "Criadores", "Quadro Branco"]}
      icon={<Tv className="h-5 w-5 text-sky-300" />}
      className="max-w-[1600px] mx-auto p-4"
    >
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        {/* Left Sidebar: Runs History */}
        <div className="w-full lg:w-80 bg-zinc-950/40 border border-zinc-800/80 rounded-[24px] p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-zinc-300">
              Histórico de Vídeos
            </h3>
            <button
              onClick={() => setSelectedRunId(null)}
              className="flex items-center gap-1 text-[11px] font-bold text-sky-400 bg-sky-400/10 border-0 hover:bg-sky-400/20 px-2 py-1 rounded-full transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px] lg:max-h-[600px] flex flex-col gap-2">
            {runsLoading && runs.length === 0 && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            )}
            {!runsLoading && runs.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-8">
                Nenhum projeto criado ainda.
              </p>
            )}
            {runs.map((run) => {
              const isSelected = selectedRunId === run.id;
              const dateStr = new Date(run.created_at).toLocaleDateString(
                "pt-BR",
                {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              let statusColor = "bg-zinc-500 text-zinc-100";
              let statusLabel = "Rascunho";
              if (run.status === "waiting_for_images") {
                statusColor =
                  "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                statusLabel = "Aguardando Imagens";
              } else if (run.status === "rendering") {
                statusColor =
                  "bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse";
                statusLabel = "Renderizando";
              } else if (run.status === "completed") {
                statusColor =
                  "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                statusLabel = "Concluído";
              } else if (run.status === "error") {
                statusColor =
                  "bg-rose-500/20 text-rose-300 border border-rose-500/30";
                statusLabel = "Erro";
              }

              return (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full text-left p-3 rounded-xl border flex flex-col gap-2 transition ${
                    isSelected
                      ? "bg-sky-500/[0.08] border-sky-500/50"
                      : "bg-zinc-900/20 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-white leading-snug line-clamp-2">
                      {run.topic}
                    </p>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 text-zinc-500 mt-0.5 transition-transform ${isSelected ? "rotate-90 text-sky-400" : ""}`}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {run.duration_sec}s
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-600 self-end">
                    {dateStr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Panel */}
        <div className="flex-1 bg-zinc-950/40 border border-zinc-800/80 rounded-[24px] p-6 flex flex-col">
          {!selectedRunId ? (
            /* Run Creation Form */
            <div className="max-w-2xl mx-auto py-8 w-full flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <span className="inline-flex max-w-fit items-center gap-1.5 rounded-full border border-sky-400/20 bg-sky-400/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                  <Tv className="h-3.5 w-3.5" />
                  Whiteboard Explainer
                </span>
                <h2 className="text-xl font-bold text-white">
                  Criar Explicação em Quadro Branco
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Digite seu tema ou rascunho de ideia. Lumiera polirá o
                  roteiro, criará o design infográfico dos quadros e gerará
                  prompts de imagem em inglês. Em seguida, você poderá gerar as
                  imagens em seu gerador de IA preferido e nos enviar para
                  renderizar o vídeo final!
                </p>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="topic"
                    className="text-xs font-bold text-zinc-300"
                  >
                    Tema do Vídeo ou Ideia Cognitiva
                  </label>
                  <textarea
                    id="topic"
                    rows={4}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Por que ter muitos caminhos de carreira deixa os profissionais travados e infelizes? O dilema da parálise de escolha."
                    className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-sky-500 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-300">
                      Duração do Vídeo (Segundos)
                    </label>
                    <span className="text-xs font-mono font-bold text-sky-400">
                      {durationSec}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={60}
                    step={5}
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full accent-sky-500 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 px-1 font-mono">
                    <span>30s (Curto)</span>
                    <span>45s (Recomendado)</span>
                    <span>60s (Completo)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full h-11 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 border-0 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/10 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando Roteiro e Prompts...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      Iniciar Pipeline Quadro Branco
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Active Run Detail Panel */
            <div className="flex flex-col gap-6 h-full">
              {detailLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
                  <p className="text-xs text-zinc-500">
                    Buscando detalhes do projeto...
                  </p>
                </div>
              ) : !detail ? (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                  Erro ao carregar projeto.
                </div>
              ) : (
                <>
                  {/* Detail Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          ID: {detail.run.id}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(detail.run.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white leading-tight">
                        {detail.run.topic}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {detail.hasVideo && (
                        <button
                          onClick={() => setActiveSubTab("result")}
                          className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Assistir Vídeo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Wizard Subtabs */}
                  <div className="flex border-b border-zinc-900/60 p-0.5 rounded-lg bg-zinc-950/60 max-w-fit gap-1">
                    <button
                      onClick={() => setActiveSubTab("script")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold border-0 transition ${
                        activeSubTab === "script"
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white bg-transparent"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      1. Roteiro (Script)
                    </button>
                    <button
                      onClick={() => setActiveSubTab("images")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold border-0 transition ${
                        activeSubTab === "images"
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white bg-transparent"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      2. Prompts & Upload
                      {allImagesUploaded() && (
                        <Check className="w-3 h-3 text-emerald-400 fill-emerald-400/20 ml-1" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveSubTab("render")}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold border-0 transition ${
                        activeSubTab === "render"
                          ? "bg-zinc-800 text-white shadow-sm"
                          : "text-zinc-400 hover:text-white bg-transparent"
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      3. Renderizar
                    </button>
                    {detail.hasVideo && (
                      <button
                        onClick={() => setActiveSubTab("result")}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold border-0 transition ${
                          activeSubTab === "result"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                            : "text-zinc-400 hover:text-white bg-transparent"
                        }`}
                      >
                        <Video className="w-3.5 h-3.5" />
                        4. Resultado
                      </button>
                    )}
                  </div>

                  {/* Subtab Content */}
                  <div className="flex-1 flex flex-col min-h-[400px]">
                    {/* Tab 1: Script */}
                    {activeSubTab === "script" && (
                      <div className="flex flex-col gap-4">
                        {detail.scriptTitle && (
                          <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                              Título
                            </p>
                            <h3 className="text-base font-bold text-white leading-snug">
                              {detail.scriptTitle}
                            </h3>
                          </div>
                        )}
                        <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                            Estrutura do Roteiro (Português)
                          </h4>
                          <div className="flex flex-col gap-3">
                            {detail.segments.map((seg, idx) => (
                              <div
                                key={seg.id || idx}
                                className="p-3 bg-zinc-900/30 border border-zinc-800/60 rounded-xl flex flex-col gap-1.5"
                              >
                                <div className="flex items-center gap-2 justify-between">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 uppercase">
                                    {seg.role}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    Quadro: {seg.boardId}
                                  </span>
                                </div>
                                <p className="text-xs text-white leading-relaxed font-medium">
                                  "{seg.text}"
                                </p>
                                <div className="text-[10px] text-zinc-400 italic">
                                  Intenção Visual: {seg.visualIntent}
                                </div>
                                {seg.spokenAnchors &&
                                  seg.spokenAnchors.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 items-center">
                                      <span className="text-[9px] text-zinc-500">
                                        Destaques:
                                      </span>
                                      {seg.spokenAnchors.map(
                                        (anc: string, aIdx: number) => (
                                          <span
                                            key={aIdx}
                                            className="text-[9px] font-bold text-indigo-300 bg-indigo-500/[0.08] px-1.5 py-0.5 rounded border border-indigo-500/10"
                                          >
                                            {anc}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Prompts and Image upload */}
                    {activeSubTab === "images" && (
                      <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-2 p-3 bg-amber-500/[0.03] border border-amber-500/10 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                          <p className="text-[11px] text-amber-300/90 leading-normal">
                            Copie cada prompt abaixo, gere a imagem (charcoal
                            line work on parchment) no Midjourney ou DALL-E, e
                            faça o upload do PNG resultante no respectivo
                            quadro.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Object.keys(detail.prompts).map((boardId) => {
                            const promptText = detail.prompts[boardId];
                            const imageStatus = detail.imagesStatus[boardId];
                            const isPresent = imageStatus?.present;

                            return (
                              <div
                                key={boardId}
                                className={`flex flex-col border rounded-2xl overflow-hidden bg-zinc-950/20 transition ${
                                  isPresent
                                    ? "border-emerald-500/30"
                                    : "border-zinc-800"
                                }`}
                              >
                                {/* Board Title */}
                                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/40 border-b border-zinc-800/80">
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {boardId}
                                  </span>
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      isPresent
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    }`}
                                  >
                                    {isPresent
                                      ? "Imagem Carregada"
                                      : "Pendente"}
                                  </span>
                                </div>

                                {/* Prompt area */}
                                <div className="p-4 flex-1 flex flex-col gap-3">
                                  <div className="flex-1 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-3 relative group">
                                    <p className="text-[11px] text-zinc-300 font-mono leading-relaxed line-clamp-5">
                                      {promptText}
                                    </p>
                                    <button
                                      onClick={() =>
                                        handleCopyPrompt(promptText)
                                      }
                                      className="absolute right-2 top-2 p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-0 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                      title="Copiar Prompt"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Upload dropzone */}
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="file"
                                      accept="image/png"
                                      ref={(el) => {
                                        fileInputRefs.current[boardId] = el;
                                      }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file)
                                          handleImageUpload(boardId, file);
                                      }}
                                      className="hidden"
                                    />
                                    {isPresent ? (
                                      <div className="flex flex-col gap-2 p-2 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                                        {imageStatus.imageUrl ? (
                                          <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-black/40">
                                            <img
                                              src={imageStatus.imageUrl}
                                              alt={`Quadro ${boardId}`}
                                              className="w-full h-32 object-contain"
                                              loading="lazy"
                                            />
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2">
                                            <ImageIcon className="w-6 h-6 text-sky-400" />
                                            <span className="text-[10px] text-zinc-300 font-bold truncate max-w-[150px]">
                                              {imageStatus.filename}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] text-zinc-500">
                                            {imageStatus.filename} ·{" "}
                                            {(imageStatus.size / 1024).toFixed(
                                              0
                                            )}{" "}
                                            KB
                                          </span>
                                          <button
                                            onClick={() =>
                                              triggerFileInput(boardId)
                                            }
                                            className="text-[10px] font-bold text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 border-0 px-2 py-1 rounded transition cursor-pointer"
                                          >
                                            Substituir
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          triggerFileInput(boardId)
                                        }
                                        className="h-16 w-full bg-zinc-900/30 border border-dashed border-zinc-800 hover:border-sky-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-zinc-400 hover:text-white"
                                      >
                                        <Upload className="w-4 h-4 text-sky-400" />
                                        <span className="text-[10px] font-bold">
                                          Enviar PNG do Quadro
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Render log console */}
                    {activeSubTab === "render" && (
                      <div className="flex flex-col gap-4">
                        {!allImagesUploaded() && (
                          <div className="flex items-center gap-2 p-3 bg-rose-500/[0.03] border border-rose-500/10 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <p className="text-[11px] text-rose-300">
                              Aguardando upload das imagens de todos os quadros
                              antes de poder renderizar o vídeo.
                            </p>
                          </div>
                        )}

                        {allImagesUploaded() &&
                          !rendering &&
                          renderLogs.length === 0 && (
                            <div className="flex flex-col gap-3 p-5 bg-zinc-900/20 border border-zinc-800 rounded-2xl">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                                  <Check className="w-4 h-4 text-emerald-400" />
                                  Validação pré-render
                                </h4>
                                <button
                                  onClick={runPrecheck}
                                  disabled={precheckLoading}
                                  className="text-[10px] font-bold text-sky-400 bg-sky-400/10 hover:bg-sky-400/20 border-0 px-2.5 py-1 rounded transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                  {precheckLoading && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  {precheck ? "Revalidar" : "Validar"}
                                </button>
                              </div>

                              {!precheck && !precheckLoading && (
                                <p className="text-[11px] text-zinc-500">
                                  Execute a validação para conferir roteiro,
                                  imagens, FFmpeg e pasta de saída antes de
                                  renderizar.
                                </p>
                              )}

                              {precheck && (
                                <>
                                  <div
                                    className={`rounded-lg border px-3 py-2 text-[11px] font-bold ${
                                      precheck.ready
                                        ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-200"
                                        : "border-rose-500/30 bg-rose-500/[0.06] text-rose-200"
                                    }`}
                                  >
                                    {precheck.ready
                                      ? `Pronto para renderizar · ${precheck.passCount} verificações OK${precheck.warnCount > 0 ? ` · ${precheck.warnCount} aviso(s)` : ""}`
                                      : `${precheck.failCount} verificação(ões) falharam — corrija antes de renderizar`}
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {precheck.checks.map((c, i) => (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 text-[11px]"
                                      >
                                        <span
                                          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                            c.status === "pass"
                                              ? "bg-emerald-400"
                                              : c.status === "warn"
                                                ? "bg-amber-400"
                                                : "bg-rose-400"
                                          }`}
                                        />
                                        <div className="min-w-0">
                                          <span className="text-zinc-500">
                                            {c.category} ·{" "}
                                          </span>
                                          <span className="text-zinc-300 font-bold">
                                            {c.label}:{" "}
                                          </span>
                                          <span className="text-zinc-400">
                                            {c.message}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="flex flex-col gap-2 mt-1">
                                    {!previewReady ? (
                                      <button
                                        onClick={handlePreview}
                                        disabled={!precheck.ready || rendering}
                                        className="h-9 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed border-0 rounded-lg text-xs font-bold text-white cursor-pointer shadow-lg shadow-amber-500/10 transition flex items-center justify-center gap-2"
                                      >
                                        {rendering ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Play className="w-3.5 h-3.5" />
                                        )}
                                        Gerar prévia de baixa resolução
                                      </button>
                                    ) : (
                                      <>
                                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-200">
                                          Prévia pronta (baixa resolução).
                                          Revise o vídeo antes do render final.
                                        </div>
                                        <button
                                          onClick={() => handleRender(false)}
                                          disabled={rendering}
                                          className="h-9 px-6 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed border-0 rounded-lg text-xs font-bold text-white cursor-pointer shadow-lg shadow-sky-500/10 transition flex items-center justify-center gap-2"
                                        >
                                          {rendering ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Film className="w-3.5 h-3.5" />
                                          )}
                                          Renderizar vídeo final
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                        {(rendering || renderLogs.length > 0) && (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-sky-400" />
                                Console de Execução
                              </h4>
                              {rendering && (
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Executando...
                                </span>
                              )}
                            </div>

                            <div className="bg-black/80 border border-zinc-800 rounded-xl p-4 h-80 overflow-y-auto font-mono text-[11px] text-zinc-300 leading-relaxed flex flex-col gap-1.5">
                              {renderLogs.map((log, lIdx) => (
                                <div
                                  key={lIdx}
                                  className={
                                    log.startsWith("ERRO")
                                      ? "text-rose-400"
                                      : log.startsWith("Renderização concluída")
                                        ? "text-emerald-400"
                                        : ""
                                  }
                                >
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Diagnóstico estruturado do erro de renderização */}
                        {renderError && !rendering && (
                          <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <h4 className="text-xs font-bold text-rose-200">
                                Renderização interrompida
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {renderError.stage && (
                                <div className="rounded-lg bg-black/30 border border-rose-500/15 px-3 py-2">
                                  <p className="text-[9px] uppercase tracking-wider text-rose-400/80">
                                    Etapa
                                  </p>
                                  <p className="text-zinc-200 mt-0.5">
                                    {renderError.stage}
                                  </p>
                                </div>
                              )}
                              {renderError.failedStep && (
                                <div className="rounded-lg bg-black/30 border border-rose-500/15 px-3 py-2">
                                  <p className="text-[9px] uppercase tracking-wider text-rose-400/80">
                                    Passo que falhou
                                  </p>
                                  <p className="text-zinc-200 mt-0.5 font-mono">
                                    {renderError.failedStep}
                                  </p>
                                </div>
                              )}
                            </div>
                            {renderError.errorLog && (
                              <div className="rounded-lg bg-black/50 border border-rose-500/15 px-3 py-2">
                                <p className="text-[9px] uppercase tracking-wider text-rose-400/80 mb-1">
                                  Log do erro
                                </p>
                                <pre className="max-h-40 overflow-y-auto font-mono text-[10px] text-rose-200/80 whitespace-pre-wrap leading-relaxed">
                                  {renderError.errorLog}
                                </pre>
                              </div>
                            )}
                            <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2">
                              <p className="text-[9px] uppercase tracking-wider text-amber-400/80">
                                Solução recomendada
                              </p>
                              <p className="text-[11px] text-amber-100/80 mt-0.5 leading-relaxed">
                                Verifique a imagem do quadro indicado
                                (resolução/proporção 16:9), substitua se estiver
                                corrompida e tente novamente. O progresso
                                anterior (narração e quadros já renderizados) é
                                preservado.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleRender(true)}
                                className="h-8 px-4 bg-rose-500 hover:bg-rose-400 rounded-lg text-[11px] font-bold text-white cursor-pointer transition"
                              >
                                Retomar render (pular narração)
                              </button>
                              <button
                                onClick={() => handleRender(false)}
                                className="h-8 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[11px] font-bold text-zinc-200 cursor-pointer transition"
                              >
                                Renderizar do zero
                              </button>
                              <button
                                onClick={() => setActiveSubTab("images")}
                                className="h-8 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[11px] font-bold text-zinc-200 cursor-pointer transition"
                              >
                                Substituir imagem
                              </button>
                              {renderError.reportPath && (
                                <span className="h-8 px-3 flex items-center text-[10px] text-zinc-500 font-mono">
                                  Relatório:{" "}
                                  {renderError.reportPath.split(/[\\/]/).pop()}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Final preview video */}
                    {activeSubTab === "result" && detail.hasVideo && (
                      <div className="flex flex-col gap-6">
                        {/* Video player container */}
                        <div className="max-w-3xl mx-auto w-full bg-black border border-zinc-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative shadow-2xl">
                          <video
                            src={`/api/whiteboard/preview-video?id=${detail.run.id}`}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Details and download */}
                        <div className="flex items-center justify-between p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl max-w-3xl mx-auto w-full">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Quality Gate: PASS
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono">
                              Caminho: {detail.run.folder_path}
                              /video/preview.mp4
                            </span>
                          </div>
                          <a
                            href={`/api/whiteboard/preview-video?id=${detail.run.id}`}
                            download="whiteboard-preview.mp4"
                            className="flex items-center gap-1.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 border-0 px-3.5 py-2 rounded-lg cursor-pointer transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Baixar MP4
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </DashminPageLayout>
  );
}
