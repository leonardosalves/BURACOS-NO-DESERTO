import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  Mic,
  Wand2,
  Play,
  Music,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Image,
  Video,
  ExternalLink,
  Scissors,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { NarrationReplacePanel } from "./NarrationReplacePanel";

type SceneGapAction = {
  id: string;
  label: string;
  severity: string;
  count?: number;
};

type SceneGapsReport = {
  gapCount: number;
  totalScenes: number;
  hasNarration: boolean;
  hasTimings: boolean;
  hasMetadataCache: boolean;
  actions: SceneGapAction[];
  gaps?: { scene: string; stock_query: string }[];
};

type TtsVoiceOption = {
  id: string;
  label: string;
  group?: string;
};

type TtsEngineOption = {
  id: string;
  label: string;
  defaultVoice: string;
  defaultSpeed?: number;
  voices: TtsVoiceOption[];
  available?: boolean;
  mode?: string;
  serverUrl?: string;
  hint?: string;
};

export type AiFetchResult = {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
};

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl?: (fileName: string) => string;
  postAi?: (path: string, init?: RequestInit) => Promise<AiFetchResult>;
  toast: (msg: string) => void;
  onNarrationReady?: () => void;
  onTimelineRefresh?: () => void;
  onMetadataReady?: (data?: unknown) => void;
  onNavigateTab?: (tab: string) => void;
  hasNarration?: boolean;
  hasTimings?: boolean;
  compact?: boolean;
  showPipeline?: boolean;
  /** When false, skips auto-fetch (reduces load when panel is off-screen). */
  enabled?: boolean;
};

export function WorkflowToolkit({
  getProjectUrl,
  getMediaUrl,
  postAi,
  toast,
  onNarrationReady,
  onTimelineRefresh,
  onMetadataReady,
  onNavigateTab,
  hasNarration,
  hasTimings,
  compact = false,
  showPipeline = true,
  enabled = true,
}: Props) {
  const [gaps, setGaps] = useState<SceneGapsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pipelineLog, setPipelineLog] = useState<string[]>([]);
  const [ttsEngines, setTtsEngines] = useState<TtsEngineOption[]>([]);
  const [ttsEngine, setTtsEngine] = useState("kokoro");
  const [ttsVoice, setTtsVoice] = useState("pm_alex");
  const [ttsSpeed, setTtsSpeed] = useState("0.82");
  const lastFetchRef = useRef(0);
  const mountedRef = useRef(true);

  // MobileWAN States and Ref
  const [mobileWanAvailable, setMobileWanAvailable] = useState(false);
  const [hfToken, setHfToken] = useState("");
  const [mobileWanPrompt, setMobileWanPrompt] = useState("");
  const [mobileWanAspectRatio, setMobileWanAspectRatio] = useState("9:16");
  const [mobileWanSteps, setMobileWanSteps] = useState("3");
  const [mobileWanJob, setMobileWanJob] = useState<{
    prompt_id: string;
    status: string;
    percent: number;
    message: string;
    outputs?: { filename: string; filepath?: string }[];
    error?: string;
  } | null>(null);
  const [mobileWanPreviewUrl, setMobileWanPreviewUrl] = useState("");
  const mobileWanPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkMobileWanStatus = useCallback(async () => {
    try {
      const res = await fetch(getProjectUrl("/api/mobilewan/status"));
      if (res.ok && mountedRef.current) {
        const data = await res.json();
        setMobileWanAvailable(data.available);
      }
    } catch {
      // ignore
    }
  }, [getProjectUrl]);

  const stopMobileWanPolling = useCallback(() => {
    if (mobileWanPollRef.current) {
      window.clearInterval(mobileWanPollRef.current);
      mobileWanPollRef.current = null;
    }
  }, []);

  const startMobileWanPolling = (promptId: string, isDownload: boolean) => {
    stopMobileWanPolling();
    const poll = async () => {
      try {
        const res = await fetch(
          getProjectUrl(`/api/generation-jobs/${promptId}`)
        );
        if (!res.ok) return;
        const data = await res.json();
        if (mountedRef.current) {
          setMobileWanJob(data);
          if (data.status === "completed") {
            stopMobileWanPolling();
            if (isDownload) {
              setMobileWanAvailable(true);
              toast("Download dos pesos MobileWAN concluído!");
            } else if (data.outputs?.[0]?.filename) {
              const url = getProjectUrl(
                `/api/generation-jobs/${promptId}/output`
              );
              setMobileWanPreviewUrl(url);
              toast("Vídeo MobileWAN gerado!");
            }
          } else if (data.status === "error") {
            stopMobileWanPolling();
            toast(data.error || "Erro no processamento MobileWAN.");
          }
        }
      } catch {
        // ignore
      }
    };
    poll();
    mobileWanPollRef.current = window.setInterval(poll, 2000);
  };

  const handleMobileWanDownload = async () => {
    if (!hfToken.trim()) {
      toast("Por favor, insira o seu token do Hugging Face.");
      return;
    }
    setBusy("mobilewan-download");
    try {
      const res = await fetch(getProjectUrl("/api/mobilewan/download"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: hfToken.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao iniciar download.");
      }
      const data = await res.json();
      setMobileWanJob({
        prompt_id: data.prompt_id,
        status: "running",
        percent: 10,
        message: "Iniciando download...",
      });
      startMobileWanPolling(data.prompt_id, true);
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleMobileWanGenerate = async () => {
    if (!mobileWanPrompt.trim()) {
      toast("Digite um prompt para o vídeo MobileWAN.");
      return;
    }
    setBusy("mobilewan-gen");
    setMobileWanPreviewUrl("");
    try {
      const res = await fetch(getProjectUrl("/api/mobilewan/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: mobileWanPrompt.trim(),
          aspect_ratio: mobileWanAspectRatio,
          steps: parseInt(mobileWanSteps, 10),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao gerar vídeo.");
      }
      const data = await res.json();
      setMobileWanJob({
        prompt_id: data.prompt_id,
        status: "running",
        percent: 10,
        message: "Iniciando geração MobileWAN...",
      });
      startMobileWanPolling(data.prompt_id, false);
    } catch (err: any) {
      toast(err.message);
    } finally {
      setBusy(null);
    }
  };

  const refreshGaps = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const now = Date.now();
      if (!force && now - lastFetchRef.current < 8000) return;
      lastFetchRef.current = now;
      setLoading(true);
      try {
        const res = await fetch(getProjectUrl("/api/workflow/scene-gaps"));
        if (res.ok && mountedRef.current) setGaps(await res.json());
      } catch {
        // ignore
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [enabled, getProjectUrl]
  );

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;
    const t = window.setTimeout(() => {
      refreshGaps(true);
      checkMobileWanStatus();
    }, 400);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(t);
      stopMobileWanPolling();
    };
  }, [enabled, refreshGaps, checkMobileWanStatus, stopMobileWanPolling]);

  useEffect(() => {
    if (!enabled) return;
    fetch(getProjectUrl("/api/tts/voices"))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!mountedRef.current || !data?.engines?.length) return;
        setTtsEngines(data.engines);
        const kokoro =
          data.engines.find((e: TtsEngineOption) => e.id === "kokoro") ||
          data.engines[0];
        setTtsEngine(kokoro.id);
        setTtsVoice(kokoro.defaultVoice);
        if (kokoro.defaultSpeed) setTtsSpeed(String(kokoro.defaultSpeed));
      })
      .catch(() => {
        /* ignore */
      });
  }, [enabled, getProjectUrl]);

  const activeTtsEngine =
    ttsEngines.find((e) => e.id === ttsEngine) || ttsEngines[0];
  const activeTtsVoices = activeTtsEngine?.voices || [];

  const handleTtsEngineChange = (engineId: string) => {
    setTtsEngine(engineId);
    const engine = ttsEngines.find((e) => e.id === engineId);
    if (engine) {
      setTtsVoice(engine.defaultVoice);
      if (engine.defaultSpeed) setTtsSpeed(String(engine.defaultSpeed));
    }
  };

  const runAction = async (
    label: string,
    url: string,
    options?: RequestInit,
    useAi = false
  ) => {
    setBusy(label);
    try {
      const aiPaths = ["/api/ai/publish-prep"];
      const shouldUseAi =
        useAi || (postAi && aiPaths.some((p) => url.startsWith(p)));
      let data: Record<string, unknown> = {};
      let ok = false;
      if (shouldUseAi && postAi) {
        const result = await postAi(url, options);
        ok = result.ok;
        data = result.data;
      } else {
        const res = await fetch(getProjectUrl(url), options);
        data = await res.json().catch(() => ({}));
        ok = res.ok;
      }
      if (!ok || data.needs_browser)
        throw new Error(String(data.error || data.details || "Falha"));
      toast(String(data.message || `${label} concluído.`));
      await refreshGaps(true);
      return data;
    } catch (err) {
      toast(`${label}: ${err instanceof Error ? err.message : "erro"}`);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const handleTts = () => {
    const body: Record<string, string | number> = {
      engine: ttsEngine,
      voice: ttsVoice,
    };
    if (ttsEngine === "kokoro") {
      const speed = Number(ttsSpeed);
      body.speed = Number.isFinite(speed) ? speed : 0.82;
    } else if (ttsEngine === "fish") {
      /* Fish Speech usa narrative_script_tagged + reference_id no backend */
    } else if (ttsEngine === "chatterbox") {
      /* Chatterbox usa narrative_script_tagged + preset de voz no backend */
    } else if (ttsEngine === "voicebox") {
      /* Voicebox: perfil de voz clonado no app local (porta 17493) */
    } else {
      body.rate = "-8%";
    }
    return runAction("Narração TTS", "/api/tts/generate-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((d) => {
      if (d) {
        onNarrationReady?.();
        toast(
          "MP3 gerado. Próximo passo: Sincronizar timings (Whisper) e, na linha do tempo, Distribuir narração nos blocos."
        );
      }
    });
  };

  const handleStock = () =>
    runAction("B-roll", "/api/stock/fetch-for-scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxScenes: 15, onlyMissing: true }),
    }).then((d) => {
      if (d) onTimelineRefresh?.();
    });

  const handleClipFactory = () =>
    runAction("Clip Factory", "/api/workflow/clip-factory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enqueue: true }),
    }).then((d) => {
      if (d && typeof d === "object" && "enqueued" in d) {
        toast(
          `Clip Factory: ${String((d as { enqueued?: number }).enqueued ?? 0)} Short(s) na fila. YouTube Studio → ▶ Creator.`
        );
        onNavigateTab?.("youtube-studio");
      }
    });

  const handleAutoMap = () =>
    runAction("Auto-map", "/api/ai/auto-map-assets", { method: "POST" }).then(
      (d) => {
        if (d) onTimelineRefresh?.();
      }
    );

  const handleBgm = () =>
    runAction("Trilha", "/api/ai/apply-bgm", { method: "POST" });

  const handlePublishPrep = () =>
    runAction("Publicação", "/api/ai/publish-prep", { method: "POST" }).then(
      (d) => {
        if (d) onMetadataReady?.(d);
      }
    );

  const runPipeline = (steps: string) => {
    setBusy("Pipeline");
    setPipelineLog([]);
    const es = new EventSource(
      getProjectUrl(
        `/api/creator/run-pipeline?steps=${encodeURIComponent(steps)}`
      )
    );
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "log")
          setPipelineLog((prev) => [...prev.slice(-40), data.text]);
        if (data.type === "complete") {
          toast("Pipeline concluído.");
          es.close();
          setBusy(null);
          refreshGaps(true);
          onTimelineRefresh?.();
          onMetadataReady?.();
        }
        if (data.type === "error") {
          toast(data.message || "Pipeline falhou");
          es.close();
          setBusy(null);
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      setBusy(null);
    };
  };

  const severityColor = (s: string) => {
    if (s === "error") return "text-red-400 border-red-500/30 bg-red-500/10";
    if (s === "warning")
      return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-sky-400 border-sky-500/30 bg-sky-500/10";
  };

  const btn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    variant: "gold" | "emerald" | "violet" | "sky" | "cyan" = "gold"
  ) => {
    const colors = {
      gold: "border-gold-500/30 text-gold-400 hover:bg-gold-500/10",
      emerald: "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10",
      violet: "border-violet-500/30 text-violet-300 hover:bg-violet-500/10",
      sky: "border-sky-500/30 text-sky-300 hover:bg-sky-500/10",
      cyan: "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10",
    };
    const isBusy = busy === label || busy === "Pipeline";
    return (
      <button
        type="button"
        disabled={!!busy}
        onClick={onClick}
        className={`inline-flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold py-2 px-3 rounded-xl border transition disabled:opacity-50 text-center leading-snug min-w-0 ${colors[variant]}`}
      >
        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
        {label}
      </button>
    );
  };

  return (
    <div
      className={`space-y-3 min-w-0 ${compact ? "" : "rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"}`}
    >
      {!compact && (
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 min-w-0">
          <SectionHeader
            title="Ferramentas de Workflow"
            helpId="workflow-toolkit"
            icon={<Sparkles className="w-3.5 h-3.5 text-gold-400" />}
            titleClassName="text-xs"
          />
          <button
            type="button"
            onClick={() => refreshGaps(true)}
            className="text-[9px] text-zinc-500 hover:text-zinc-300"
          >
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      )}

      {gaps && (
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasNarration ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30"}`}
          >
            {gaps.hasNarration ? "Narração ✓" : "Sem narração"}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasTimings ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}
          >
            {gaps.hasTimings ? "Sync ✓" : "Sem sync"}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.gapCount === 0 ? "text-emerald-400 border-emerald-500/30" : "text-amber-400 border-amber-500/30"}`}
          >
            {gaps.gapCount === 0
              ? "B-roll completo"
              : `${gaps.gapCount} cenas sem mídia`}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border ${gaps.hasMetadataCache ? "text-emerald-400 border-emerald-500/30" : "text-zinc-500 border-zinc-700"}`}
          >
            {gaps.hasMetadataCache ? "Metadados ✓" : "Sem metadados"}
          </span>
        </div>
      )}

      {gaps?.actions?.length ? (
        <div className="space-y-1">
          {gaps.actions.slice(0, 4).map((a) => (
            <div
              key={a.id}
              className={`text-[9px] px-2 py-1 rounded-lg border flex items-center gap-1.5 ${severityColor(a.severity)}`}
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {a.label}
            </div>
          ))}
        </div>
      ) : gaps ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[9px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Projeto pronto para render
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab("status")}
              className="text-[9px] font-bold text-gold-400 hover:text-gold-300 border border-gold-500/30 px-2 py-1 rounded-lg transition"
            >
              Ir para Render →
            </button>
          )}
        </div>
      ) : null}

      <div
        className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {btn(
          "Buscar B-roll",
          <Download className="w-3 h-3" />,
          handleStock,
          "sky"
        )}
        {btn(
          "Clip Factory",
          <Scissors className="w-3 h-3" />,
          handleClipFactory,
          "cyan"
        )}
        {btn(
          "Auto-map IA",
          <Wand2 className="w-3 h-3" />,
          handleAutoMap,
          "violet"
        )}
        {btn("Trilha BGM", <Music className="w-3 h-3" />, handleBgm, "emerald")}
        {btn(
          "Preparar pub.",
          <Upload className="w-3 h-3" />,
          handlePublishPrep,
          "gold"
        )}
        {onNavigateTab &&
          btn(
            "Metadados",
            <Image className="w-3 h-3" />,
            () => onNavigateTab("ai"),
            "gold"
          )}
      </div>

      {getMediaUrl && (
        <NarrationReplacePanel
          getProjectUrl={getProjectUrl}
          getMediaUrl={getMediaUrl}
          toast={toast}
          hasNarration={hasNarration ?? gaps?.hasNarration}
          hasTimings={hasTimings ?? gaps?.hasTimings}
          onUpdated={() => {
            refreshGaps(true);
            onNarrationReady?.();
            onTimelineRefresh?.();
          }}
          compact
        />
      )}

      <details className="lumiera-collapsible-section" open>
        <summary>Narração TTS</summary>
        <div className="lumiera-collapsible-body">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5 space-y-2">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide font-bold">
              Motor e voz
            </p>
            <div
              className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-2"}`}
            >
              <label className="space-y-1">
                <span className="text-[9px] text-zinc-500">Motor</span>
                <select
                  value={ttsEngine}
                  onChange={(e) => handleTtsEngineChange(e.target.value)}
                  disabled={!!busy}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
                >
                  {(ttsEngines.length
                    ? ttsEngines
                    : [{ id: "kokoro", label: "Kokoro (local, grátis)" }]
                  ).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[9px] text-zinc-500">Voz</span>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  disabled={!!busy}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200"
                >
                  {activeTtsVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {ttsEngine === "kokoro" && (
              <label className="space-y-1 block">
                <span className="text-[9px] text-zinc-500">
                  Velocidade ({ttsSpeed}x — 0.75 = mais lento/grave)
                </span>
                <input
                  type="range"
                  min="0.65"
                  max="1.1"
                  step="0.01"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(e.target.value)}
                  disabled={!!busy}
                  className="w-full accent-emerald-500"
                />
              </label>
            )}
            {(ttsEngine === "fish" || ttsEngine === "chatterbox") &&
              activeTtsEngine && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span
                    className={`text-[8px] px-1.5 py-0.5 rounded border ${
                      activeTtsEngine.available
                        ? ttsEngine === "fish"
                          ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
                          : "text-violet-300 border-violet-500/30 bg-violet-500/10"
                        : "text-amber-300 border-amber-500/30 bg-amber-500/10"
                    }`}
                  >
                    {activeTtsEngine.available
                      ? ttsEngine === "fish"
                        ? activeTtsEngine.mode === "cloud"
                          ? "API cloud"
                          : "Servidor local"
                        : "Pacote instalado"
                      : ttsEngine === "fish"
                        ? "Offline"
                        : "Pacote ausente"}
                  </span>
                  {activeTtsEngine.serverUrl ? (
                    <span className="text-[8px] text-zinc-600 font-mono">
                      {activeTtsEngine.serverUrl}
                    </span>
                  ) : null}
                </div>
              )}
            <div className="text-[8px] text-zinc-600">
              {ttsEngine === "kokoro"
                ? "Kokoro roda local (grátis). Primeira geração baixa o modelo (~300 MB)."
                : ttsEngine === "chatterbox"
                  ? activeTtsEngine?.hint ||
                    "Chatterbox — pip install chatterbox-tts. Multilingual V3 para PT; Turbo para EN com [chuckle]."
                  : ttsEngine === "fish"
                    ? activeTtsEngine?.hint ||
                      "Local: .\\scripts\\start-fish-speech.ps1 · Cloud: fish_speech.api_key no config_qanat.json"
                    : "Edge TTS usa vozes Microsoft na nuvem."}
            </div>
            {btn(
              "Gerar narração",
              <Mic className="w-3 h-3" />,
              handleTts,
              "emerald"
            )}
          </div>
        </div>
      </details>

      <details className="lumiera-collapsible-section">
        <summary className="text-cyan-300/90 flex items-center gap-1.5 cursor-pointer">
          <Video className="w-3.5 h-3.5 shrink-0" />
          MobileWAN (Vídeo IA Local Rápido)
        </summary>
        <div className="lumiera-collapsible-body">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] text-cyan-300 uppercase tracking-wide font-bold flex items-center gap-1">
                <Video className="w-3 h-3" /> Status do Modelo Local
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span
                className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${mobileWanAvailable ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" : "text-amber-400 border-amber-500/30 bg-amber-500/5"}`}
              >
                {mobileWanAvailable
                  ? "Pesos do Modelo: Instalados"
                  : "Pesos do Modelo: Ausentes"}
              </span>
            </div>

            {!mobileWanAvailable ? (
              <div className="space-y-2 border-t border-cyan-500/10 pt-2">
                <p className="text-[8px] text-zinc-400 leading-normal">
                  MobileWAN é um modelo de 1.3B parâmetros que roda localmente
                  de forma extremamente rápida. Como o modelo é gated no Hugging
                  Face (Qualcomm Research Permissive License 1.2), você deve
                  aceitar os termos no site e inserir seu token abaixo para
                  baixar os pesos automáticos.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    placeholder="Cole seu Hugging Face Token (hf_...)"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                  />
                  {btn(
                    "Baixar Pesos",
                    <Download className="w-3 h-3" />,
                    handleMobileWanDownload,
                    "cyan"
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-cyan-500/10 pt-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[8px] text-zinc-500 space-y-0.5">
                    Proporção
                    <select
                      value={mobileWanAspectRatio}
                      onChange={(e) => setMobileWanAspectRatio(e.target.value)}
                      disabled={!!busy}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
                    >
                      <option value="9:16">9:16 (Shorts/TikTok)</option>
                      <option value="16:9">16:9 (Documentário/Longo)</option>
                      <option value="1:1">1:1 (Feed/Quadrado)</option>
                    </select>
                  </label>
                  <label className="text-[8px] text-zinc-500 space-y-0.5">
                    Passos de Denoising (Inference Steps)
                    <select
                      value={mobileWanSteps}
                      onChange={(e) => setMobileWanSteps(e.target.value)}
                      disabled={!!busy}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-[10px] text-zinc-200"
                    >
                      <option value="3">3 passos (Veloz — padrão)</option>
                      <option value="5">5 passos (Qualidade)</option>
                      <option value="10">10 passos (Detalhado)</option>
                    </select>
                  </label>
                </div>

                <textarea
                  value={mobileWanPrompt}
                  onChange={(e) => setMobileWanPrompt(e.target.value)}
                  placeholder="Prompt para o vídeo MobileWAN (ex: A majestic ship sailing on a stormy sea...)"
                  disabled={!!busy}
                  className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-200 resize-none focus:outline-none focus:border-cyan-500/50"
                />

                {btn(
                  "Gerar vídeo MobileWAN",
                  <Video className="w-3 h-3" />,
                  handleMobileWanGenerate,
                  "cyan"
                )}
              </div>
            )}

            {mobileWanJob && (
              <div className="rounded-lg border border-cyan-500/20 bg-zinc-950/80 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[9px]">
                  <span className="text-cyan-300 font-medium">
                    {mobileWanJob.status === "completed"
                      ? "Concluído"
                      : mobileWanJob.status === "error"
                        ? "Erro"
                        : "Processando"}
                  </span>
                  <span className="text-zinc-400 tabular-nums">
                    {mobileWanJob.percent}%
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      mobileWanJob.status === "error"
                        ? "bg-red-500"
                        : mobileWanJob.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-cyan-500"
                    }`}
                    style={{
                      width: `${Math.max(2, Math.min(100, mobileWanJob.percent))}%`,
                    }}
                  />
                </div>
                <p className="text-[8px] text-zinc-500">
                  {mobileWanJob.message}
                </p>
                {mobileWanJob.error && (
                  <p className="text-[8px] text-red-400">
                    {mobileWanJob.error}
                  </p>
                )}
                {mobileWanJob.status === "completed" && mobileWanPreviewUrl && (
                  <div className="space-y-1 pt-1">
                    <video
                      key={mobileWanPreviewUrl}
                      src={mobileWanPreviewUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full rounded-md border border-zinc-800 bg-black max-h-48 object-contain"
                    />
                    <a
                      href={mobileWanPreviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[8px] text-cyan-400 hover:text-cyan-200 inline-flex items-center gap-0.5 font-bold"
                    >
                      Abrir vídeo <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </details>

      {showPipeline && (
        <details className="lumiera-collapsible-section">
          <summary>Autopilot (pipeline)</summary>
          <div className="lumiera-collapsible-body space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {btn(
                "Pipeline completo",
                <Play className="w-3 h-3" />,
                () =>
                  runPipeline("sync,stock,automap,bgm,mix,metadata,thumbnails"),
                "violet"
              )}
              {btn(
                "Só mídia + map",
                <Play className="w-3 h-3" />,
                () => runPipeline("stock,automap"),
                "sky"
              )}
              {btn(
                "Só publicação",
                <Play className="w-3 h-3" />,
                () => runPipeline("metadata,thumbnails"),
                "gold"
              )}
            </div>
            {pipelineLog.length > 0 && (
              <pre className="text-[8px] text-zinc-500 bg-zinc-900/60 rounded-lg p-2 max-h-24 overflow-y-auto font-mono">
                {pipelineLog.slice(-8).join("\n")}
              </pre>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
