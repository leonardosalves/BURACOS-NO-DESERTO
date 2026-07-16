import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Eye,
  Loader2,
  Mic,
  Play,
  RefreshCw,
  Save,
  Sparkles,
  Tag,
  Volume2,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import {
  createProgressJobId,
  getAiJobProgressState,
  startAiJobProgress,
  stopAiJobProgress,
  subscribeAiJobProgress,
  waitForAiJobDone,
  type AiJobProgressState,
} from "./aiJobProgressClient";
import {
  describeFetchError,
  fetchWithBackendRetry,
  pingBackendHealth,
  waitForBackendHealth,
} from "./describeFetchError";

type ChunkVoice = {
  engine: string;
  voice: string;
  speed?: number;
};

export type NarrationChunk = {
  id: string;
  block: number;
  scene_ref: string;
  speech_segment_id?: string;
  speaker?: string;
  speech_role?: string;
  text: string;
  text_tagged?: string;
  pause_after_ms: number;
  pause_reason?: string;
  voice: ChunkVoice;
  audio_file?: string | null;
  duration_s?: number | null;
  speech_duration_s?: number | null;
  start_s?: number | null;
  end_s?: number | null;
  observed_pause_after_ms?: number | null;
  timing_source?: "whisper" | "chunk-plan-fallback" | string;
  alignment_coverage?: number | null;
  status?: string;
  versions?: Array<{
    file: string;
    archived_at: string;
    duration_s?: number | null;
  }>;
};

export type NarrationChunkPlan = {
  version?: number;
  default_voice?: ChunkVoice;
  chunk_count?: number;
  total_duration?: number | null;
  chunks: NarrationChunk[];
};

type TtsEngineOption = {
  id: string;
  label: string;
  defaultVoice: string;
  voices: { id: string; label: string }[];
  available?: boolean;
};

type Props = {
  getProjectUrl: (path: string) => string;
  getMediaUrl: (file: string) => string;
  toast: (msg: string, opts?: unknown) => void;
  hasApiKey?: boolean;
  narrationMode?: "chunked" | "master" | string;
  plan?: NarrationChunkPlan | null;
  onPlanChange?: (plan: NarrationChunkPlan) => void;
  onModeChange?: (mode: "chunked" | "master") => void;
  onUpdated?: () => void;
  onReadinessChange?: (readiness: {
    ready: boolean;
    blockers: string[];
  }) => void;
};

const ENGINE_LABELS: Record<string, string> = {
  kokoro: "Kokoro",
  edge: "Edge TTS",
  chatterbox: "Chatterbox",
  fish: "Fish Audio",
  voicebox: "Voicebox",
  gptsovits: "GPT-SoVITS",
};

export function NarrationChunksPanel({
  getProjectUrl,
  getMediaUrl,
  toast,
  hasApiKey = false,
  narrationMode = "master",
  plan: externalPlan,
  onPlanChange,
  onModeChange,
  onUpdated,
  onReadinessChange,
}: Props) {
  const [localPlan, setLocalPlan] = useState<NarrationChunkPlan | null>(
    externalPlan || null
  );
  const [engines, setEngines] = useState<TtsEngineOption[]>([]);
  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingChunkId, setGeneratingChunkId] = useState<string | null>(
    null
  );
  const [ttsProgress, setTtsProgress] = useState<AiJobProgressState | null>(
    null
  );
  const [defaultEngine, setDefaultEngine] = useState("kokoro");
  const [defaultVoice, setDefaultVoice] = useState("pm_alex");
  const [useTagged, setUseTagged] = useState(true);
  const [expandedTagsChunkId, setExpandedTagsChunkId] = useState<string | null>(
    null
  );
  const [tagPreviews, setTagPreviews] = useState<
    Record<
      string,
      {
        preview: string;
        tags: string[];
        normalization: boolean | null;
        independentChunk: boolean | null;
      }
    >
  >({});
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditComparison, setAuditComparison] = useState<any[]>([]);
  const [auditReviews, setAuditReviews] = useState<Record<string, any>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const chunkAudioRef = useRef<{ audio: HTMLAudioElement; key: string } | null>(
    null
  );
  const blobCacheRef = useRef<Record<string, { blobUrl: string; key: string }>>(
    {}
  );
  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch(getProjectUrl("/api/narration/audit"));
      if (!res.ok) return;
      const data = await res.json();
      setAuditEvents(
        Array.isArray(data.events) ? data.events.slice(-50).reverse() : []
      );
      setAuditComparison(Array.isArray(data.comparison) ? data.comparison : []);
      setAuditReviews(
        data.reviews && typeof data.reviews === "object" ? data.reviews : {}
      );
    } catch {}
  }, [getProjectUrl]);

  const saveReview = async (
    chunkId: string,
    decision: "approved" | "rejected" | "needs_fix"
  ) => {
    const note = String(reviewNotes[chunkId] || "").trim();
    if (decision !== "approved" && !note) {
      toast("Informe uma observação antes de rejeitar ou pedir correção.");
      return;
    }
    setSavingReviewId(chunkId);
    try {
      const res = await fetch(getProjectUrl("/api/narration/audit/review"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk_id: chunkId, decision, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao salvar revisão.");
      toast(
        decision === "approved" ? "Trecho aprovado." : "Revisão registrada."
      );
      await loadAudit();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao salvar revisão.");
    } finally {
      setSavingReviewId(null);
    }
  };

  const approveAllAuditChunks = async () => {
    const sourceIds = auditComparison.length
      ? auditComparison.map((row) => String(row.chunk_id || ""))
      : (localPlan?.chunks || []).map((chunk) => chunk.id);
    const chunkIds = [...new Set(sourceIds.filter(Boolean))].filter(
      (chunkId) => auditReviews[chunkId]?.decision !== "approved"
    );
    if (!chunkIds.length) {
      toast("Todos os trechos já estão aprovados.");
      return;
    }
    setApprovingAll(true);
    try {
      const res = await fetch(
        getProjectUrl("/api/narration/audit/review-all"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunk_ids: chunkIds, decision: "approved" }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao aprovar trechos.");
      toast(`${data.count || chunkIds.length} trecho(s) aprovado(s).`);
      await loadAudit();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao aprovar trechos.");
    } finally {
      setApprovingAll(false);
    }
  };

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    return () => {
      // Limpeza de blob URLs criadas
      Object.values(blobCacheRef.current).forEach(({ blobUrl }) => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch (e) {}
      });
    };
  }, []);

  // Pre-fetch de áudios em background
  useEffect(() => {
    if (!localPlan?.chunks) return;
    localPlan.chunks.forEach((chunk) => {
      if (!chunk.audio_file) return;
      const cacheKey = `${chunk.audio_file}::${chunk.duration_s ?? 0}::${chunk.status ?? ""}`;
      const cached = blobCacheRef.current[chunk.id];
      if (cached && cached.key === cacheKey) return;

      const url = `${getMediaUrl(chunk.audio_file)}?v=${encodeURIComponent(cacheKey)}`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.blob();
        })
        .then((blob) => {
          if (cached?.blobUrl) {
            try {
              URL.revokeObjectURL(cached.blobUrl);
            } catch (e) {}
          }
          const blobUrl = URL.createObjectURL(blob);
          blobCacheRef.current[chunk.id] = { blobUrl, key: cacheKey };
        })
        .catch(() => {});
    });
  }, [localPlan?.chunks, getMediaUrl]);

  useEffect(() => {
    setLocalPlan(externalPlan || null);
  }, [externalPlan]);

  useEffect(() => {
    const dv = localPlan?.default_voice;
    if (dv?.engine) setDefaultEngine(dv.engine);
    if (dv?.voice) setDefaultVoice(dv.voice);
  }, [localPlan?.default_voice?.engine, localPlan?.default_voice?.voice]);

  useEffect(() => {
    fetch(getProjectUrl("/api/tts/voices"))
      .then((r) => r.json())
      .then((data) =>
        setEngines(Array.isArray(data?.engines) ? data.engines : [])
      )
      .catch(() => {});
  }, [getProjectUrl]);

  useEffect(() => {
    return subscribeAiJobProgress((state) => {
      if (state?.active) setTtsProgress(state);
    });
  }, []);

  const engineOptions = useMemo(
    () => engines.filter((e) => e.available !== false),
    [engines]
  );

  const voicesForEngine = useCallback(
    (engineId: string) => {
      const eng = engines.find((e) => e.id === engineId);
      return eng?.voices || [];
    },
    [engines]
  );

  const updatePlan = (next: NarrationChunkPlan) => {
    setLocalPlan(next);
    onPlanChange?.(next);
  };

  const patchChunk = (chunkId: string, patch: Partial<NarrationChunk>) => {
    if (!localPlan) return;
    updatePlan({
      ...localPlan,
      chunks: localPlan.chunks.map((c) =>
        c.id === chunkId ? { ...c, ...patch } : c
      ),
    });
  };

  const applyChunkVoiceToScope = (
    source: NarrationChunk,
    scope: "scene" | "block" | "speaker"
  ) => {
    if (!localPlan) return;
    const voice = {
      engine: source.voice?.engine || defaultEngine,
      voice: source.voice?.voice || defaultVoice,
      ...(source.voice?.speed != null ? { speed: source.voice.speed } : {}),
    };
    const matches = (candidate: NarrationChunk) => {
      if (scope === "scene") return candidate.scene_ref === source.scene_ref;
      if (scope === "block") return candidate.block === source.block;
      return Boolean(source.speaker && candidate.speaker === source.speaker);
    };
    updatePlan({
      ...localPlan,
      chunks: localPlan.chunks.map((candidate) =>
        matches(candidate) ? { ...candidate, voice: { ...voice } } : candidate
      ),
    });
    const label =
      scope === "scene"
        ? `cena ${source.scene_ref}`
        : scope === "block"
          ? `bloco ${source.block}`
          : `personagem ${source.speaker}`;
    toast(`Voz aplicada a ${label}.`);
  };

  const applyDefaultVoiceToAll = () => {
    if (!localPlan) return;
    const voice: ChunkVoice = { engine: defaultEngine, voice: defaultVoice };
    updatePlan({
      ...localPlan,
      default_voice: voice,
      chunks: localPlan.chunks.map((c) => ({ ...c, voice: { ...voice } })),
    });
    toast("Narrador padrão aplicado a todos os trechos.");
  };

  const handlePlan = async (useHeuristic = false) => {
    if (!useHeuristic && !hasApiKey) {
      toast("Configure a chave Gemini para planejar trechos com IA.");
      return;
    }
    setPlanning(true);
    try {
      const res = await fetch(getProjectUrl("/api/ai/plan-narration-chunks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          useHeuristic,
          defaultVoice: { engine: defaultEngine, voice: defaultVoice },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(String(data.error || "Falha ao planejar trechos"));
      if (data.plan) {
        updatePlan(data.plan);
        onModeChange?.("chunked");
      }
      toast(
        useHeuristic
          ? "Trechos gerados a partir das cenas."
          : "IA planejou trechos e pausas."
      );
      onUpdated?.();
    } catch (err) {
      toast(describeFetchError(err, "planejar trechos"));
    } finally {
      setPlanning(false);
    }
  };

  const handleSavePlan = async () => {
    if (!localPlan?.chunks?.length) return;
    setSaving(true);
    try {
      if (!(await waitForBackendHealth(30_000))) {
        throw new Error("Failed to fetch");
      }
      const res = await fetchWithBackendRetry(
        getProjectUrl("/api/narration/chunks"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: localPlan,
            mode: narrationMode === "master" ? "master" : "chunked",
          }),
        },
        "salvar plano de trechos"
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(data.error || "Falha ao salvar"));
      if (data.plan) updatePlan(data.plan);
      toast("Plano de trechos salvo.");
      onUpdated?.();
    } catch (err) {
      toast(describeFetchError(err, "salvar plano de trechos"));
    } finally {
      setSaving(false);
    }
  };

  const fetchTagPreview = useCallback(
    async (chunkId: string, tagged: string, engine: string) => {
      if (!tagged.trim()) {
        setTagPreviews((prev) => {
          const next = { ...prev };
          delete next[chunkId];
          return next;
        });
        return;
      }
      try {
        const res = await fetch(getProjectUrl("/api/tts/preview-tagged-text"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text_tagged: tagged,
            engine,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        setTagPreviews((prev) => ({
          ...prev,
          [chunkId]: {
            preview: String(data.preview || ""),
            tags: Array.isArray(data.tags) ? data.tags : [],
            normalization:
              typeof data.normalization === "boolean"
                ? data.normalization
                : null,
            independentChunk:
              typeof data.independent_chunk === "boolean"
                ? data.independent_chunk
                : null,
          },
        }));
      } catch {
        /* ignore */
      }
    },
    [getProjectUrl]
  );

  useEffect(() => {
    if (!expandedTagsChunkId || !useTagged) return;
    const chunk = (localPlan?.chunks || []).find(
      (c) => c.id === expandedTagsChunkId
    );
    if (!chunk) return;
    const timer = window.setTimeout(() => {
      void fetchTagPreview(
        chunk.id,
        chunk.text_tagged || chunk.text,
        chunk.voice?.engine || defaultEngine
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    expandedTagsChunkId,
    localPlan?.chunks,
    useTagged,
    defaultEngine,
    fetchTagPreview,
  ]);

  const persistPlanBeforeTts = async (): Promise<boolean> => {
    if (!localPlan?.chunks?.length) {
      toast("Nenhum trecho no plano — planeje antes de gerar.");
      return false;
    }
    try {
      if (!(await waitForBackendHealth(30_000))) {
        toast(
          describeFetchError(
            new Error("Failed to fetch"),
            "salvar plano de trechos"
          )
        );
        return false;
      }
      const res = await fetchWithBackendRetry(
        getProjectUrl("/api/narration/chunks"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: localPlan, mode: "chunked" }),
        },
        "salvar plano de trechos"
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(String(data.error || "Falha ao salvar plano antes do TTS."));
        return false;
      }
      if (data.plan) updatePlan(data.plan);
      return true;
    } catch (err) {
      toast(describeFetchError(err, "salvar plano de trechos"));
      return false;
    }
  };

  const runChunkTts = async (chunkIds: string[] | null) => {
    if (!(await persistPlanBeforeTts())) return;

    const isFullBatch = chunkIds === null;
    const progressJobId = createProgressJobId();
    setGenerating(true);
    setTtsProgress(null);

    const backendOk = await pingBackendHealth();
    if (!backendOk) {
      const msg = describeFetchError(
        new Error("Failed to fetch"),
        "iniciar TTS por trechos"
      );
      setGenerating(false);
      toast(msg, { id: "narration-chunks-tts-error", duration: 8000 });
      return;
    }

    const progressTitle = isFullBatch
      ? "Narração por trechos + Whisper"
      : "Narração por trechos";
    let jobStarted = false;

    try {
      const res = await fetch(
        getProjectUrl("/api/tts/generate-narration-chunks"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chunk_ids: chunkIds,
            default_voice: { engine: defaultEngine, voice: defaultVoice },
            use_tagged: useTagged,
            sync_whisper: isFullBatch,
            assemble_master: isFullBatch,
            progress_job_id: progressJobId,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(String(data.error || "Falha no TTS por trechos"));

      const jobId = String(data.jobId || progressJobId);
      startAiJobProgress(jobId, progressTitle);
      jobStarted = true;

      if (data.started && jobId) {
        const result = (await waitForAiJobDone(jobId)) as {
          message?: string;
          whisper_synced?: boolean;
          whisper_error?: string | null;
        };
        const doneMsg =
          result.message ||
          (result.whisper_synced
            ? "Trechos montados · legendas sincronizadas (Whisper)."
            : "Trechos montados.");
        if (result.whisper_error && isFullBatch) {
          toast(`Whisper: ${result.whisper_error}`, { icon: "⚠️" });
        }
        stopAiJobProgress(true, doneMsg);
      } else {
        stopAiJobProgress(true, String(data.message || "Trechos gerados."));
        if (data.plan) updatePlan(data.plan);
        if (data.whisper_error && isFullBatch) {
          toast(`Whisper: ${data.whisper_error}`, { icon: "⚠️" });
        }
        onUpdated?.();
        return;
      }

      const refresh = await fetch(getProjectUrl("/api/narration/chunks"));
      if (refresh.ok) {
        const payload = await refresh.json();
        if (payload.plan) updatePlan(payload.plan);
      }
      void loadAudit();
      onUpdated?.();
    } catch (err) {
      const msg = describeFetchError(err, "gerar narração por trechos");
      if (jobStarted) {
        stopAiJobProgress(false, msg);
      } else {
        toast(msg, { id: "narration-chunks-tts-error", duration: 8000 });
      }
    } finally {
      setGenerating(false);
      setGeneratingChunkId(null);
      setTtsProgress(null);
    }
  };

  const restoreChunkVersion = async (chunkId: string, file: string) => {
    try {
      const res = await fetch(
        getProjectUrl("/api/narration-chunks/restore-version"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunk_id: chunkId, file }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao restaurar versão.");
      if (data.plan) updatePlan(data.plan);
      toast("Versão anterior restaurada.");
      void loadAudit();
      onUpdated?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Falha ao restaurar versão.");
    }
  };

  const chunks = localPlan?.chunks || [];
  const isChunked = narrationMode === "chunked";
  const readiness = useMemo(() => {
    if (!isChunked) return { ready: true, blockers: [] as string[] };
    if (!chunks.length)
      return { ready: false, blockers: ["Planeje os trechos de narração."] };
    const blockers: string[] = [];
    for (const chunk of chunks) {
      if (chunk.status !== "generated")
        blockers.push(`${chunk.id}: áudio ${chunk.status || "pendente"}`);
      const decision = auditReviews[chunk.id]?.decision;
      if (decision !== "approved")
        blockers.push(
          `${chunk.id}: ${decision === "rejected" ? "rejeitado" : decision === "needs_fix" ? "correção solicitada" : "aguardando aprovação"}`
        );
    }
    return { ready: blockers.length === 0, blockers };
  }, [isChunked, chunks, auditReviews]);

  useEffect(() => {
    onReadinessChange?.(readiness);
  }, [onReadinessChange, readiness]);

  return (
    <div className="space-y-4 border border-zinc-800 rounded-2xl p-4 bg-zinc-950/40">
      <SectionHeader
        title="Narração por trechos"
        helpId="narration-chunks"
        size="sm"
        icon={<Mic className="w-4 h-4 text-gold-400" />}
        subtitle="Gere voz por bloco/cena com pausas planejadas pela IA. Troque o narrador por trecho."
      />

      <details className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-cyan-300">
          Auditoria da narração · {auditEvents.length} evento(s) recentes
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.05] p-2.5">
          <p className="text-[9px] text-zinc-400">
            Revise exceções individualmente ou aprove todos os trechos de uma
            vez.
          </p>
          <button
            type="button"
            disabled={approvingAll || !chunks.length}
            onClick={() => void approveAllAuditChunks()}
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/15 px-3 py-1.5 text-[9px] font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {approvingAll ? "Aprovando…" : "Aprovar todas"}
          </button>
        </div>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {auditComparison.length > 0 && (
            <div className="mb-3 space-y-1.5 border-b border-zinc-800 pb-3 text-[10px]">
              <p className="font-bold text-zinc-300">
                Comparação texto × Whisper
              </p>
              {auditComparison.map((row) => (
                <div
                  key={row.chunk_id}
                  className="rounded-lg bg-zinc-900/70 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-zinc-300">
                      {row.chunk_id} · bloco {row.block}
                    </span>
                    <span
                      className={
                        row.status === "ok"
                          ? "text-emerald-400"
                          : row.status === "warning"
                            ? "text-amber-400"
                            : row.status === "pending"
                              ? "text-zinc-500"
                              : "text-red-400"
                      }
                    >
                      {row.status === "pending"
                        ? "aguardando Whisper"
                        : `${row.coverage}% de cobertura`}
                    </span>
                  </div>
                  {row.missing?.length > 0 && (
                    <p className="mt-1 text-amber-300">
                      Ausentes: {row.missing.join(", ")}
                    </p>
                  )}
                  {row.unexpected?.length > 0 && (
                    <p className="mt-1 text-sky-300">
                      Inesperadas: {row.unexpected.join(", ")}
                    </p>
                  )}
                  <textarea
                    rows={2}
                    value={
                      reviewNotes[row.chunk_id] ??
                      auditReviews[row.chunk_id]?.note ??
                      ""
                    }
                    onChange={(e) =>
                      setReviewNotes((prev) => ({
                        ...prev,
                        [row.chunk_id]: e.target.value,
                      }))
                    }
                    placeholder="Observação do revisor..."
                    className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 p-2 text-zinc-200 outline-none focus:border-gold-500"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      disabled={savingReviewId === row.chunk_id}
                      onClick={() => void saveReview(row.chunk_id, "approved")}
                      className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300"
                    >
                      Aprovar
                    </button>
                    <button
                      disabled={savingReviewId === row.chunk_id}
                      onClick={() => void saveReview(row.chunk_id, "needs_fix")}
                      className="rounded bg-amber-500/15 px-2 py-1 text-amber-300"
                    >
                      Pedir correção
                    </button>
                    <button
                      disabled={savingReviewId === row.chunk_id}
                      onClick={() => void saveReview(row.chunk_id, "rejected")}
                      className="rounded bg-red-500/15 px-2 py-1 text-red-300"
                    >
                      Rejeitar
                    </button>
                    {auditReviews[row.chunk_id]?.decision && (
                      <span className="ml-auto text-zinc-400">
                        Última decisão: {auditReviews[row.chunk_id].decision}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {auditEvents.length === 0 ? (
            <p className="text-[10px] text-zinc-500">
              Nenhuma execução registrada neste projeto.
            </p>
          ) : (
            auditEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 text-[10px]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-zinc-200">
                    {event.type === "master_upload"
                      ? "Upload master"
                      : `TTS ${event.chunk_id || "trecho"}`}
                    {event.block ? ` · bloco ${event.block}` : ""}
                  </span>
                  <span
                    className={
                      event.status === "failed"
                        ? "text-red-400"
                        : event.status === "stale"
                          ? "text-amber-400"
                          : event.status === "generated"
                            ? "text-emerald-400"
                            : "text-cyan-400"
                    }
                  >
                    {event.status}
                  </span>
                </div>
                <p className="mt-1 text-zinc-500">
                  {event.at ? new Date(event.at).toLocaleString("pt-BR") : ""}
                  {event.voice?.engine
                    ? ` · ${event.voice.engine}/${event.voice.voice || "padrão"}`
                    : ""}
                  {event.duration_s
                    ? ` · ${Number(event.duration_s).toFixed(2)}s`
                    : ""}
                </p>
                {event.text && (
                  <p className="mt-1 line-clamp-2 text-zinc-300">
                    {event.text}
                  </p>
                )}
                {event.error && (
                  <p className="mt-1 text-red-300">Erro: {event.error}</p>
                )}
                {event.audio_file && (
                  <p className="mt-1 font-mono text-zinc-600">
                    {event.audio_file}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </details>

      {isChunked && !readiness.ready && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[10px] text-amber-100">
          <p className="font-bold uppercase tracking-wider">
            Pendências antes de avançar
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {readiness.blockers.slice(0, 12).map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange?.("master")}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            !isChunked
              ? "bg-gold-500 text-zinc-950 border-gold-500"
              : "border-zinc-800 text-zinc-400"
          }`}
        >
          Arquivo único
        </button>
        <button
          type="button"
          onClick={() => onModeChange?.("chunked")}
          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition ${
            isChunked
              ? "bg-gold-500 text-zinc-950 border-gold-500"
              : "border-zinc-800 text-zinc-400"
          }`}
        >
          Por trechos
        </button>
      </div>

      {isChunked && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">
                Motor TTS padrão
              </label>
              <select
                value={defaultEngine}
                onChange={(e) => {
                  const eng = e.target.value;
                  setDefaultEngine(eng);
                  const voices = voicesForEngine(eng);
                  if (voices[0]) setDefaultVoice(voices[0].id);
                }}
                className="dash-select w-full text-xs"
              >
                {engineOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label || ENGINE_LABELS[e.id] || e.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase text-zinc-500 font-bold block mb-1">
                Voz padrão
              </label>
              <select
                value={defaultVoice}
                onChange={(e) => setDefaultVoice(e.target.value)}
                className="dash-select w-full text-xs"
              >
                {voicesForEngine(defaultEngine).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label || v.id}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyDefaultVoiceToAll}
              disabled={!chunks.length}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-gold-500/50"
            >
              Aplicar a todos
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
            <label className="flex items-center gap-1.5 text-[10px] text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useTagged}
                onChange={(e) => setUseTagged(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Usar tags TTS na geração
            </label>
            <span className="text-[9px] text-zinc-600">
              Pausas entre trechos vêm do plano IA (ms) — sem tags (breath) ou
              [ênfase] no texto.
            </span>
            <span className="text-[9px] text-zinc-600">
              «Gerar todos os trechos» monta o MP3 master e roda Whisper
              automaticamente nas legendas.
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={planning || !hasApiKey}
              onClick={() => handlePlan(false)}
              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              {planning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Planejar trechos (IA)
            </button>
            <button
              type="button"
              disabled={planning}
              onClick={() => handlePlan(true)}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300"
            >
              Trechos das cenas (rápido)
            </button>
            <button
              type="button"
              disabled={saving || !chunks.length}
              onClick={handleSavePlan}
              className="text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-700 text-zinc-300 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              {saving ? "Salvando…" : "Salvar plano"}
            </button>
            <button
              type="button"
              disabled={generating || !chunks.length}
              onClick={() => runChunkTts(null)}
              className="text-[10px] font-bold px-3 py-2 rounded-lg bg-zinc-800 text-white flex items-center gap-1"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              Gerar todos os trechos + Whisper
            </button>
          </div>

          {(generating || ttsProgress?.active) && (
            <p className="text-[10px] text-zinc-400">
              {(ttsProgress || getAiJobProgressState())?.label ||
                "Gerando trechos…"}
              {" — "}
              {(ttsProgress || getAiJobProgressState())?.percent ?? 0}%
            </p>
          )}

          {chunks.length === 0 ? (
            <p className="text-[11px] text-zinc-500 italic">
              Nenhum trecho planejado. Use a IA ou o mapeamento rápido pelas
              cenas do roteiro.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {chunks.map((chunk, idx) => (
                <div
                  key={chunk.id}
                  className="border border-zinc-800 rounded-xl p-3 space-y-2 bg-zinc-950"
                >
                  <div className="flex flex-wrap justify-between gap-2 items-center">
                    <span className="text-[10px] font-mono font-bold text-gold-400">
                      {chunk.id} · bloco {chunk.block} · cena {chunk.scene_ref}
                      {chunk.duration_s
                        ? ` · ${chunk.duration_s.toFixed(1)}s`
                        : ""}
                      {chunk.start_s != null
                        ? ` @ ${chunk.start_s.toFixed(1)}s`
                        : ""}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded ${chunk.status === "generated" ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}
                    >
                      {chunk.status || "planned"}
                    </span>
                  </div>
                  {chunk.speaker && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5">
                      <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-cyan-300">
                        {chunk.speaker}
                        {chunk.speech_role === "narrator" ? " · narrador" : ""}
                      </span>
                      <span className="text-[8px] text-zinc-500">
                        Fala separada, mantendo a mesma cena visual
                      </span>
                    </div>
                  )}
                  <label className="text-[8px] text-zinc-500 uppercase font-bold">
                    Texto falado
                  </label>
                  <textarea
                    value={chunk.text}
                    onChange={(e) =>
                      patchChunk(chunk.id, { text: e.target.value })
                    }
                    rows={2}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTagsChunkId((prev) =>
                        prev === chunk.id ? null : chunk.id
                      )
                    }
                    className="text-[9px] text-cyan-400/90 flex items-center gap-1 hover:text-cyan-300"
                  >
                    <Tag className="w-3 h-3" />
                    {expandedTagsChunkId === chunk.id
                      ? "Ocultar tags TTS"
                      : "Ver / editar tags TTS"}
                    {(chunk.text_tagged || "").match(/\[[^\]]+\]|\([^)]+\)/g)
                      ?.length
                      ? ` (${(chunk.text_tagged || "").match(/\[[^\]]+\]|\([^)]+\)/g)?.length} tags)`
                      : ""}
                  </button>
                  {expandedTagsChunkId === chunk.id && (
                    <div className="space-y-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2">
                      <label className="text-[8px] text-cyan-300/80 uppercase font-bold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Texto expressivo enviado ao
                        TTS
                      </label>
                      <p className="text-[9px] leading-4 text-zinc-500">
                        Você pode corrigir palavras, pontuação ou acrescentar
                        interrogações. Este campo controla somente o áudio deste
                        trecho; o texto aprovado continua preservado para
                        auditoria.
                      </p>
                      <textarea
                        value={chunk.text_tagged ?? chunk.text}
                        onChange={(e) => {
                          setUseTagged(true);
                          patchChunk(chunk.id, { text_tagged: e.target.value });
                        }}
                        rows={3}
                        placeholder="Edite exatamente como deseja enviar ao TTS. Ex.: Isso aconteceu mesmo???"
                        className="w-full text-[11px] font-mono bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            patchChunk(chunk.id, { text_tagged: chunk.text })
                          }
                          className="text-[8px] text-zinc-500 hover:text-zinc-300"
                        >
                          Restaurar texto original
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUseTagged(true);
                            const current = String(
                              chunk.text_tagged || chunk.text || ""
                            ).trim();
                            patchChunk(chunk.id, {
                              text_tagged: `${current.replace(/[.!?]+$/g, "")}???`,
                            });
                          }}
                          className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-[8px] font-bold text-cyan-200 hover:bg-cyan-500/20"
                        >
                          Forçar entonação de pergunta ???
                        </button>
                      </div>
                      {useTagged && tagPreviews[chunk.id]?.preview && (
                        <div className="text-[9px] text-zinc-500 space-y-1">
                          <p className="text-cyan-400/70 uppercase text-[7px] font-bold">
                            Preview enviado ao motor
                          </p>
                          <p className="font-mono text-zinc-400 leading-relaxed break-words">
                            {tagPreviews[chunk.id].preview}
                          </p>
                          {tagPreviews[chunk.id].independentChunk && (
                            <p className="text-zinc-600">
                              Trecho independente · normalização automática{" "}
                              {tagPreviews[chunk.id].normalization
                                ? "ativa"
                                : "desativada"}
                            </p>
                          )}
                          {tagPreviews[chunk.id].tags.length > 0 && (
                            <p className="text-zinc-600">
                              Tags: {tagPreviews[chunk.id].tags.join(" · ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">
                        Pausa depois (ms)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={3000}
                        step={50}
                        value={chunk.pause_after_ms}
                        onChange={(e) =>
                          patchChunk(chunk.id, {
                            pause_after_ms: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">
                        Motor
                      </label>
                      <select
                        value={chunk.voice?.engine || defaultEngine}
                        onChange={(e) =>
                          patchChunk(chunk.id, {
                            voice: {
                              ...chunk.voice,
                              engine: e.target.value,
                              voice:
                                voicesForEngine(e.target.value)[0]?.id ||
                                chunk.voice?.voice,
                            },
                          })
                        }
                        className="dash-select w-full text-[10px]"
                      >
                        {engineOptions.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 uppercase">
                        Narrador
                      </label>
                      <select
                        value={chunk.voice?.voice || defaultVoice}
                        onChange={(e) =>
                          patchChunk(chunk.id, {
                            voice: { ...chunk.voice, voice: e.target.value },
                          })
                        }
                        className="dash-select w-full text-[10px]"
                      >
                        {voicesForEngine(
                          chunk.voice?.engine || defaultEngine
                        ).map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end gap-1">
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() => {
                          setGeneratingChunkId(chunk.id);
                          void runChunkTts([chunk.id]);
                        }}
                        className="text-[9px] font-bold px-2 py-1.5 rounded border border-zinc-700 text-zinc-300 flex items-center gap-1"
                      >
                        {generatingChunkId === chunk.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Gerar
                      </button>
                      {chunk.audio_file && (
                        <button
                          type="button"
                          onClick={async () => {
                            // Se já está tocando este chunk, parar
                            console.log(
                              "[Audio Preview] Play clicked for chunk:",
                              chunk.id
                            );
                            if (playingChunkId === chunk.id) {
                              console.log(
                                "[Audio Preview] Pausing currently playing chunk"
                              );
                              chunkAudioRef.current?.audio.pause();
                              chunkAudioRef.current = null;
                              setPlayingChunkId(null);
                              return;
                            }
                            // Parar áudio anterior
                            if (chunkAudioRef.current) {
                              console.log(
                                "[Audio Preview] Stopping previous audio instance"
                              );
                              chunkAudioRef.current.audio.pause();
                              chunkAudioRef.current = null;
                            }
                            // Cache key estável
                            const cacheKey = `${chunk.audio_file}::${chunk.duration_s ?? 0}::${chunk.status ?? ""}`;
                            const url = `${getMediaUrl(chunk.audio_file!)}?v=${encodeURIComponent(cacheKey)}`;

                            let blobUrl = "";
                            const cached = blobCacheRef.current[chunk.id];
                            if (cached && cached.key === cacheKey) {
                              blobUrl = cached.blobUrl;
                              console.log(
                                "[Audio Preview] Using cached blob URL:",
                                blobUrl
                              );
                            } else {
                              console.log(
                                "[Audio Preview] Blob not in cache, fetching now..."
                              );
                              try {
                                const res = await fetch(url);
                                if (!res.ok)
                                  throw new Error("HTTP error " + res.status);
                                const blob = await res.blob();
                                if (cached?.blobUrl) {
                                  try {
                                    URL.revokeObjectURL(cached.blobUrl);
                                  } catch (e) {}
                                }
                                blobUrl = URL.createObjectURL(blob);
                                blobCacheRef.current[chunk.id] = {
                                  blobUrl,
                                  key: cacheKey,
                                };
                              } catch (err) {
                                console.error(
                                  "[Audio Preview] Failed to fetch blob:",
                                  err
                                );
                                blobUrl = url; // Fallback para URL direta se o fetch falhar
                              }
                            }

                            console.time(
                              "[Audio Preview] Instantiation to Play"
                            );
                            const audio = new Audio(blobUrl);
                            audio.preload = "auto";
                            chunkAudioRef.current = { audio, key: cacheKey };
                            setPlayingChunkId(chunk.id);

                            audio.onplay = () => {
                              console.log(
                                "[Audio Preview] Event: play started"
                              );
                              console.timeEnd(
                                "[Audio Preview] Instantiation to Play"
                              );
                            };
                            audio.onended = () => {
                              console.log("[Audio Preview] Event: ended");
                              setPlayingChunkId(null);
                              chunkAudioRef.current = null;
                            };
                            audio.onerror = (e) => {
                              console.error("[Audio Preview] Event: error", e);
                              setPlayingChunkId(null);
                              chunkAudioRef.current = null;
                            };
                            // Inicia a reprodução diretamente
                            console.log("[Audio Preview] Calling audio.play()");
                            audio.play().catch((err) => {
                              console.warn(
                                "[Audio Preview] play() promise rejected:",
                                err
                              );
                              setPlayingChunkId(null);
                              chunkAudioRef.current = null;
                            });
                          }}
                          className={`text-[9px] px-2 py-1.5 rounded border transition ${
                            playingChunkId === chunk.id
                              ? "border-gold-500 text-gold-400 bg-gold-500/10"
                              : "border-zinc-700 text-zinc-300"
                          }`}
                          title={
                            playingChunkId === chunk.id
                              ? "Parar"
                              : "Ouvir trecho"
                          }
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {chunk.speaker && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-cyan-500/15 bg-cyan-500/5 p-2">
                      <span className="mr-1 text-[8px] font-bold uppercase tracking-wide text-cyan-300/75">
                        Voz separada
                      </span>
                      <button
                        type="button"
                        onClick={() => applyChunkVoiceToScope(chunk, "scene")}
                        className="rounded border border-zinc-700 px-2 py-1 text-[8px] text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        Aplicar nesta cena
                      </button>
                      <button
                        type="button"
                        onClick={() => applyChunkVoiceToScope(chunk, "block")}
                        className="rounded border border-zinc-700 px-2 py-1 text-[8px] text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        Aplicar neste bloco
                      </button>
                      <button
                        type="button"
                        onClick={() => applyChunkVoiceToScope(chunk, "speaker")}
                        className="rounded border border-zinc-700 px-2 py-1 text-[8px] text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        Usar para {chunk.speaker}
                      </button>
                      {chunks.filter(
                        (candidate) => candidate.scene_ref === chunk.scene_ref
                      ).length > 1 && (
                        <button
                          type="button"
                          disabled={generating}
                          onClick={() =>
                            void runChunkTts(
                              chunks
                                .filter(
                                  (candidate) =>
                                    candidate.scene_ref === chunk.scene_ref
                                )
                                .map((candidate) => candidate.id)
                            )
                          }
                          className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[8px] font-bold text-cyan-200 disabled:opacity-50"
                        >
                          Gerar todas as falas da cena
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={generating}
                        onClick={() =>
                          void runChunkTts(
                            chunks
                              .filter(
                                (candidate) => candidate.block === chunk.block
                              )
                              .map((candidate) => candidate.id)
                          )
                        }
                        className="rounded border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[8px] font-bold text-violet-200 disabled:opacity-50"
                      >
                        Gerar falas do bloco
                      </button>
                    </div>
                  )}
                  {(chunk.versions?.length ?? 0) > 0 && (
                    <details className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-[9px]">
                      <summary className="cursor-pointer font-bold text-zinc-400">
                        Versões anteriores · {chunk.versions!.length}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {[...chunk.versions!].reverse().map((version) => (
                          <div
                            key={version.file}
                            className="flex flex-wrap items-center gap-2 rounded bg-zinc-950 p-2"
                          >
                            <audio
                              controls
                              preload="none"
                              src={getMediaUrl(version.file)}
                              className="h-7 max-w-[230px]"
                            />
                            <span className="text-zinc-500">
                              {new Date(version.archived_at).toLocaleString(
                                "pt-BR"
                              )}
                            </span>
                            <button
                              onClick={() =>
                                void restoreChunkVersion(chunk.id, version.file)
                              }
                              className="ml-auto rounded bg-cyan-500/15 px-2 py-1 text-cyan-300"
                            >
                              Restaurar
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                  {chunk.pause_reason && (
                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-zinc-600">
                      <span>{chunk.pause_reason}</span>
                      {chunk.timing_source === "whisper" && (
                        <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-300">
                          Whisper alinhado
                          {Number.isFinite(Number(chunk.alignment_coverage))
                            ? ` · ${Math.round(Number(chunk.alignment_coverage) * 100)}%`
                            : ""}
                        </span>
                      )}
                      {Number.isFinite(Number(chunk.observed_pause_after_ms)) &&
                        chunk.timing_source === "whisper" && (
                          <span className="text-cyan-400/80">
                            pausa real:{" "}
                            {Math.round(Number(chunk.observed_pause_after_ms))}
                            ms
                          </span>
                        )}
                    </div>
                  )}
                  {idx < chunks.length - 1 && (
                    <p className="text-[8px] text-zinc-600 text-center">
                      ↓ pausa planejada {chunk.pause_after_ms}ms
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {localPlan?.total_duration ? (
            <p className="text-[10px] text-zinc-500">
              Duração total estimada: {localPlan.total_duration.toFixed(1)}s ·{" "}
              {localPlan.chunk_count || chunks.length} trecho(s)
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
