import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Check,
  Film,
  Image as ImageIcon,
  Loader2,
  Pause,
  Play,
  Save,
  Sparkles,
  Volume2,
  Trash2,
  Plus,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import {
  applyAudioStartsFromScenes,
  buildBlockTimingModel,
  flattenTranscriptWords,
  formatTimelineClock,
  getAssetDurationSeconds,
  getScenePlaybackWindow,
  resizeScenePair,
  setSceneDuration,
  syncBlockScenesToSpeech,
  type BlockTimingModel,
  type SceneTimingRow,
} from "./sceneTimingEngine";
import type {
  BlockTimingStatus,
  NarrationSyncContext,
  TimelineAsset,
} from "./timelineNarrationSync";

type ConfigSlice = {
  timeline_assets?: Record<string, TimelineAsset[]>;
  block_phrases?: { block: number; phrase: string }[];
  impact_texts?: Array<{
    block: number;
    start_offset: number;
    end_offset: number;
    text: string;
  }>;
  aspect_ratio?: "16:9" | "9:16";
  canvas_background?: string;
};

type Props = {
  activeProject: string;
  config: ConfigSlice | null;
  status?: BlockTimingStatus & { has_narration?: boolean };
  storyboard?: {
    visual_prompts?: Array<{
      block?: number;
      narration_text?: string;
      narration_excerpt?: string;
    }>;
    overlays?: any[];
  };
  wordTranscripts: any[];
  getMediaUrl: (file: string) => string;
  getAssetUrl: (fileName: string) => string;
  onSave: (
    timelineAssets: Record<string, TimelineAsset[]>,
    impactTexts: Array<{
      block: number;
      start_offset: number;
      end_offset: number;
      text: string;
    }>,
    storyboardOverlays?: any[]
  ) => Promise<void>;
  toast: (msg: string) => void;
};

function SceneAssetPreview({
  scene,
  getAssetUrl,
  variant = "card",
}: {
  scene: SceneTimingRow;
  getAssetUrl: (fileName: string) => string;
  variant?: "card" | "strip";
}) {
  const hasAsset = Boolean(scene.assetPath);
  const url = hasAsset ? getAssetUrl(scene.assetPath) : "";

  if (!hasAsset) {
    return (
      <div className={`ste-asset-empty ste-asset-empty--${variant}`}>
        <ImageIcon className="w-5 h-5 opacity-40" />
        <span className="text-[9px] text-zinc-650">Sem mídia</span>
      </div>
    );
  }

  if (scene.assetType === "video") {
    return (
      <div className={`ste-asset-preview ste-asset-preview--${variant}`}>
        <video
          src={url}
          className="ste-asset-media"
          muted
          playsInline
          autoPlay
          preload="metadata"
        />
        <span className="ste-asset-badge">
          <Film className="w-3 h-3" />
        </span>
      </div>
    );
  }

  return (
    <div className={`ste-asset-preview ste-asset-preview--${variant}`}>
      <img
        src={url}
        alt={scene.assetLabel}
        className="ste-asset-media"
        loading="lazy"
      />
    </div>
  );
}

const SCENE_COLORS = [
  "rgba(56, 189, 248, 0.4)",
  "rgba(129, 140, 248, 0.4)",
  "rgba(52, 211, 153, 0.4)",
  "rgba(251, 191, 36, 0.4)",
  "rgba(244, 114, 182, 0.4)",
  "rgba(167, 139, 250, 0.4)",
];

export function SceneTimingEditor({
  activeProject,
  config,
  status,
  storyboard,
  wordTranscripts,
  getMediaUrl,
  getAssetUrl,
  onSave,
  toast,
}: Props) {
  const [draft, setDraft] = useState<Record<string, TimelineAsset[]>>({});
  const [draftImpactTexts, setDraftImpactTexts] = useState<any[]>([]);
  const [draftOverlays, setDraftOverlays] = useState<any[]>([]);
  const [activeBlock, setActiveBlock] = useState("1");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [draggingDivider, setDraggingDivider] = useState<number | null>(null);

  const [draggingOverlay, setDraggingOverlay] = useState<{
    type: "slide" | "resize-left" | "resize-right";
    overlayIndex: number;
    initialX: number;
    initialStart: number;
    initialEnd: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playEndRef = useRef<number | null>(null);

  // Playhead states
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    setDraft(structuredClone(config?.timeline_assets || {}));
    setDraftImpactTexts(structuredClone(config?.impact_texts || []));
    setDraftOverlays(structuredClone(storyboard?.overlays || []));
  }, [
    config?.timeline_assets,
    config?.impact_texts,
    storyboard?.overlays,
    activeProject,
  ]);

  const flatWords = useMemo(
    () => flattenTranscriptWords(wordTranscripts),
    [wordTranscripts]
  );

  const blockKeys = useMemo(
    () => Object.keys(draft).sort((a, b) => Number(a) - Number(b)),
    [draft]
  );

  useEffect(() => {
    if (blockKeys.length && !blockKeys.includes(activeBlock)) {
      setActiveBlock(blockKeys[0]);
    }
  }, [blockKeys, activeBlock]);

  const syncCtx: NarrationSyncContext = useMemo(
    () => ({
      config: { ...config, timeline_assets: draft },
      storyboard,
      status,
      getAssetDuration: (blockKey, index) => {
        const assets = draft[blockKey] || [];
        const blockNum = parseInt(blockKey, 10);
        const blockDur = status?.block_timings?.durations?.[blockNum - 1] || 10;
        return getAssetDurationSeconds(assets, index, blockDur);
      },
    }),
    [config, draft, storyboard, status]
  );

  const blockModel = useMemo((): BlockTimingModel | null => {
    const assets = draft[activeBlock];
    if (!assets?.length) return null;
    return buildBlockTimingModel(
      activeBlock,
      assets,
      flatWords,
      status,
      syncCtx,
      wordTranscripts
    );
  }, [activeBlock, draft, flatWords, status, syncCtx]);

  const hasTranscript =
    flatWords.length > 0 && Boolean(status?.block_timings?.starts?.length);
  const hasNarration = Boolean(status?.has_narration);

  // Stop playback callback
  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlayingKey(null);
    playEndRef.current = null;
  }, []);

  // Sync playhead state when active block changes
  useEffect(() => {
    setCurrentTime(0);
    stopPlayback();
  }, [activeBlock, stopPlayback]);

  // Audio lifecycle & real-time timeupdate listener
  useEffect(() => {
    audioRef.current = new Audio(getMediaUrl("narracao_mestra_premium.mp3"));
    const el = audioRef.current;

    const onTime = () => {
      if (playEndRef.current !== null && el.currentTime >= playEndRef.current) {
        stopPlayback();
        if (blockModel) {
          setCurrentTime(blockModel.narrationEnd - blockModel.narrationStart);
        }
      } else if (blockModel) {
        const relTime = el.currentTime - blockModel.narrationStart;
        setCurrentTime(Math.max(0, relTime));
      }
    };

    el.addEventListener("timeupdate", onTime);
    return () => {
      el.pause();
      el.removeEventListener("timeupdate", onTime);
    };
  }, [getMediaUrl, stopPlayback, blockModel]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const playScene = useCallback(
    (blockKey: string, sceneIdx: number, start: number, end: number) => {
      const key = `${blockKey}-${sceneIdx}`;
      if (playingKey === key) {
        stopPlayback();
        return;
      }

      const el = audioRef.current;
      if (!el) return;

      stopPlayback();
      setPlayingKey(key);
      playEndRef.current = end;

      el.currentTime = start;
      void el.play().catch(() => stopPlayback());
    },
    [playingKey, stopPlayback]
  );

  const handleDurationChange = (sceneIdx: number, value: number) => {
    const assets = draft[activeBlock] || [];
    const updated = setSceneDuration(assets, sceneIdx, Math.max(0.5, value));
    updateBlockAssets(activeBlock, updated);
  };

  const updateBlockAssets = (blockKey: string, assets: TimelineAsset[]) => {
    const next = { ...draft, [blockKey]: assets };
    setDraft(next);
  };

  const handleDividerDrag = useCallback(
    (e: MouseEvent) => {
      if (draggingDivider === null || !timelineRef.current || !blockModel)
        return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const targetTime = pct * blockModel.totalDuration;

      const assets = draft[activeBlock] || [];
      const updated = resizeScenePair(
        assets,
        draggingDivider,
        targetTime,
        blockModel.totalDuration
      );
      updateBlockAssets(activeBlock, updated);
    },
    [draggingDivider, blockModel, activeBlock, draft]
  );

  useEffect(() => {
    if (draggingDivider === null) return;
    const onMove = (e: MouseEvent) => handleDividerDrag(e);
    const onUp = () => setDraggingDivider(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingDivider, handleDividerDrag]);

  // Drag handler for Storyboard Overlays on the track
  const handleOverlayDragMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingOverlay || !timelineRef.current || !blockModel) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const deltaX = clientX - draggingOverlay.initialX;
      const deltaTime = (deltaX / rect.width) * blockModel.totalDuration;

      const targetIdx = draggingOverlay.overlayIndex;
      const originalOt = draftOverlays[targetIdx];
      if (!originalOt) return;

      let newStartAbs = originalOt.start;
      let newDuration = originalOt.duration;

      const initialStartRel =
        draggingOverlay.initialStart - blockModel.narrationStart;
      const initialEndRel =
        draggingOverlay.initialEnd - blockModel.narrationStart;

      if (draggingOverlay.type === "slide") {
        let newStartRel = initialStartRel + deltaTime;
        newStartRel = Math.max(
          0,
          Math.min(newStartRel, blockModel.totalDuration - newDuration)
        );
        newStartAbs = blockModel.narrationStart + newStartRel;
      } else if (draggingOverlay.type === "resize-left") {
        let newStartRel = initialStartRel + deltaTime;
        newStartRel = Math.max(0, Math.min(newStartRel, initialEndRel - 0.2));
        newStartAbs = blockModel.narrationStart + newStartRel;
        newDuration = draggingOverlay.initialEnd - newStartAbs;
      } else if (draggingOverlay.type === "resize-right") {
        const newEndAbs = draggingOverlay.initialEnd + deltaTime;
        const newEndRel = Math.max(
          initialStartRel + 0.2,
          Math.min(
            newEndAbs - blockModel.narrationStart,
            blockModel.totalDuration
          )
        );
        newDuration = newEndRel - initialStartRel;
      }

      const updated = draftOverlays.map((ot, idx) => {
        if (idx === targetIdx) {
          return {
            ...ot,
            start: parseFloat(newStartAbs.toFixed(3)),
            duration: parseFloat(newDuration.toFixed(3)),
          };
        }
        return ot;
      });
      setDraftOverlays(updated);
    },
    [draggingOverlay, blockModel, draftOverlays]
  );

  useEffect(() => {
    if (!draggingOverlay) return;
    const onMove = (e: MouseEvent) => handleOverlayDragMove(e);
    const onUp = () => setDraggingOverlay(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingOverlay, handleOverlayDragMove]);

  const handleSyncBlock = async () => {
    if (!hasTranscript) {
      toast("Rode Sincronizar Whisper no Workflow antes.");
      return;
    }
    setSyncing(true);
    try {
      const assets = draft[activeBlock] || [];
      const { assets: synced, aligned } = syncBlockScenesToSpeech(
        activeBlock,
        assets,
        flatWords,
        status,
        storyboard
      );
      if (aligned === 0) {
        toast("Nenhuma cena alinhada — confira textos no storyboard.");
        return;
      }
      const model = buildBlockTimingModel(
        activeBlock,
        synced,
        flatWords,
        status,
        {
          ...syncCtx,
          config: {
            ...syncCtx.config,
            timeline_assets: { ...draft, [activeBlock]: synced },
          },
        },
        wordTranscripts
      );
      const withStarts = model
        ? applyAudioStartsFromScenes(synced, model)
        : synced;
      updateBlockAssets(activeBlock, withStarts);
      toast(`${aligned} cena(s) sincronizada(s) com a voz.`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const enriched = { ...draft };
      for (const blockKey of Object.keys(enriched)) {
        const assets = enriched[blockKey];
        if (!assets?.length) continue;
        const model = buildBlockTimingModel(
          blockKey,
          assets,
          flatWords,
          status,
          {
            ...syncCtx,
            config: { ...syncCtx.config, timeline_assets: enriched },
          },
          wordTranscripts
        );
        if (model) {
          enriched[blockKey] = applyAudioStartsFromScenes(assets, model);
        }
      }
      await onSave(enriched, draftImpactTexts, draftOverlays);
      setDraft(enriched);
      toast("Timing das cenas e overlays salvos.");
    } catch {
      toast("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Storyboard overlays selectors
  const activeBlockOverlays = useMemo(() => {
    return draftOverlays.filter((ot) => ot.block_ref === Number(activeBlock));
  }, [draftOverlays, activeBlock]);

  const updateOverlayText = (indexInActive: number, newText: string) => {
    let count = 0;
    const nextOverlays = draftOverlays.map((ot) => {
      if (ot.block_ref === Number(activeBlock)) {
        if (count === indexInActive) {
          const props = { ...ot.props };
          if (
            "label" in props ||
            ot.type === "counter" ||
            ot.type === "lower-third"
          ) {
            props.label = newText;
          } else if ("text" in props) {
            props.text = newText;
          } else {
            props.label = newText;
          }
          return { ...ot, props };
        }
        count++;
      }
      return ot;
    });
    setDraftOverlays(nextOverlays);
  };

  const updateOverlayField = (
    indexInActive: number,
    field: string,
    value: any
  ) => {
    let count = 0;
    const nextOverlays = draftOverlays.map((ot) => {
      if (ot.block_ref === Number(activeBlock)) {
        if (count === indexInActive) {
          return { ...ot, [field]: value };
        }
        count++;
      }
      return ot;
    });
    setDraftOverlays(nextOverlays);
  };

  const deleteOverlay = (indexInActive: number) => {
    let count = 0;
    const nextOverlays = draftOverlays.filter((ot) => {
      if (ot.block_ref === Number(activeBlock)) {
        if (count === indexInActive) {
          count++;
          return false;
        }
        count++;
      }
      return true;
    });
    setDraftOverlays(nextOverlays);
    toast("Overlay removido.");
  };

  const addOverlay = () => {
    const newOverlay = {
      id: `overlay-${Date.now()}`,
      type: "lower-third",
      start: parseFloat((blockModel?.narrationStart || 0).toFixed(3)),
      duration: 3.0,
      scene_ref: `${activeBlock}.1`,
      block_ref: Number(activeBlock),
      timing_manual: true,
      props: {
        label: "NOVO OVERLAY",
        theme: "classic",
        position: "top-left",
        customStyle: {
          background: "rgba(18, 18, 20, 0.92)",
          border: "1.5px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "20px",
        },
      },
    };
    setDraftOverlays([...draftOverlays, newOverlay]);
    toast("Overlay adicionado.");
  };

  // Find active scene and active overlay in preview
  const activeSceneInPreview = useMemo(() => {
    if (!blockModel || !blockModel.scenes.length) return null;
    let acc = 0;
    for (const scene of blockModel.scenes) {
      if (currentTime >= acc && currentTime <= acc + scene.duration) {
        return scene;
      }
      acc += scene.duration;
    }
    return blockModel.scenes[blockModel.scenes.length - 1];
  }, [blockModel, currentTime]);

  const activeOverlayInPreview = useMemo(() => {
    if (!blockModel) return null;
    const currentAbsTime = blockModel.narrationStart + currentTime;
    return draftOverlays.find(
      (ot) =>
        currentAbsTime >= ot.start && currentAbsTime <= ot.start + ot.duration
    );
  }, [draftOverlays, blockModel, currentTime]);

  const handlePreviewPlayToggle = () => {
    if (!blockModel) return;

    if (playingKey !== null) {
      stopPlayback();
    } else {
      const startAbs = blockModel.narrationStart + currentTime;
      const endAbs = blockModel.narrationEnd;
      if (startAbs < endAbs) {
        playScene(activeBlock, 999, startAbs, endAbs);
      } else {
        playScene(
          activeBlock,
          999,
          blockModel.narrationStart,
          blockModel.narrationEnd
        );
      }
    }
  };

  if (!activeProject) {
    return (
      <div className="ste-empty glass-panel p-8 rounded-2xl text-center text-zinc-400">
        Selecione um projeto na barra lateral.
      </div>
    );
  }

  if (!blockKeys.length) {
    return (
      <div className="ste-empty glass-panel p-8 rounded-2xl text-center text-zinc-400">
        Este projeto não tem cenas na timeline. Use o Editor ou Workflow para
        mapear mídias primeiro.
      </div>
    );
  }

  const isPlayheadPlaying = playingKey !== null;

  return (
    <div className="ste-root space-y-5 font-sans">
      <SectionHeader
        title="Editor de Timing"
        subtitle="Ajuste a duração de cada cena dentro do bloco. A narração exibida segue o áudio — sem misturar blocos."
        trailing={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSyncBlock}
              disabled={syncing || !hasTranscript}
              className="ste-btn ste-btn-sync"
              title={
                hasTranscript
                  ? "Alinha duração ao trecho falado de cada cena"
                  : "Transcrição ausente"
              }
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Sincronizar bloco com a voz
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ste-btn ste-btn-save cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar timing
            </button>
          </div>
        }
      />

      {!hasTranscript && (
        <div className="ste-warn flex items-start gap-3 p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 text-amber-200/90 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <p>
            Transcrição Whisper não carregada. Vá em{" "}
            <strong>Workflow → Sincronizar Whisper</strong> para ver a narração
            sincronizada com o áudio.
          </p>
        </div>
      )}

      <div className="ste-block-tabs flex flex-wrap gap-2">
        {blockKeys.map((key) => {
          const count = draft[key]?.length || 0;
          const active = key === activeBlock;
          return (
            <button
              key={key}
              type="button"
              onClick={active ? undefined : () => setActiveBlock(key)}
              className={`ste-block-tab ${active ? "ste-block-tab--active" : ""}`}
            >
              Bloco {key}
              <span className="ste-block-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {blockModel && (
        <div className="flex flex-col lg:flex-row gap-5">
          {/* COLUMN 1: Scene & Overlays details */}
          <div className="flex-1 min-w-0 space-y-5">
            <div className="ste-summary glass-panel p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  Fala do bloco (áudio)
                </p>
                <p className="font-mono text-cyan-300">
                  {formatTimelineClock(blockModel.narrationStart)} →{" "}
                  {formatTimelineClock(blockModel.narrationEnd)}
                  <span className="text-zinc-500 text-[10px] ml-1">
                    ({blockModel.speechDuration.toFixed(1)}s)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  Duração visual (cenas)
                </p>
                <p className="font-mono text-white">
                  {blockModel.totalDuration.toFixed(1)}s
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  Palavras
                </p>
                <p className="font-mono text-white">{blockModel.totalWords}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                  Cobertura
                </p>
                <p
                  className={`font-mono flex items-center gap-1.5 ${blockModel.coveragePercent >= 95 ? "text-emerald-400" : "text-amber-300"}`}
                >
                  {blockModel.coveragePercent >= 95 ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {blockModel.coveredWords}/{blockModel.totalWords} (
                  {blockModel.coveragePercent}%)
                </p>
              </div>
            </div>

            <div className="ste-timeline-wrap glass-panel p-5 rounded-xl relative">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Linha do bloco
                </span>
                {hasNarration && (
                  <span className="text-[10px] text-zinc-650 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> Arraste as cenas ou os
                    overlays para ajustar o tempo
                  </span>
                )}
              </div>

              <div
                ref={timelineRef}
                onClick={(e) => {
                  if (
                    draggingDivider !== null ||
                    draggingOverlay !== null ||
                    !timelineRef.current
                  )
                    return;
                  const rect = timelineRef.current.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const newRelativeTime = Math.max(
                    0,
                    Math.min(
                      (clickX / rect.width) * blockModel.totalDuration,
                      blockModel.totalDuration
                    )
                  );
                  setCurrentTime(newRelativeTime);
                  if (audioRef.current && playingKey !== null) {
                    audioRef.current.currentTime =
                      blockModel.narrationStart + newRelativeTime;
                  }
                }}
                className="ste-timeline-track relative h-40 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex flex-col cursor-col-resize select-none"
              >
                {/* ROW 1: Assets (B-Roll) */}
                <div className="relative h-24 border-b border-zinc-900 overflow-hidden flex-shrink-0">
                  {blockModel.scenes.map((scene, idx) => {
                    const widthPct =
                      blockModel.totalDuration > 0
                        ? (scene.duration / blockModel.totalDuration) * 100
                        : 100 / blockModel.scenes.length;
                    const leftPct = blockModel.scenes
                      .slice(0, idx)
                      .reduce(
                        (a, s) =>
                          a + (s.duration / blockModel.totalDuration) * 100,
                        0
                      );
                    return (
                      <div
                        key={scene.idx}
                        className="ste-timeline-seg absolute top-0 bottom-0 overflow-hidden pointer-events-none"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          borderRight:
                            idx < blockModel.scenes.length - 1
                              ? "2px solid rgba(0,0,0,0.5)"
                              : undefined,
                        }}
                        title={scene.assetLabel}
                      >
                        <div
                          className="ste-timeline-seg-tint absolute inset-0 z-[1]"
                          style={{
                            background: SCENE_COLORS[idx % SCENE_COLORS.length],
                          }}
                        />
                        <div className="ste-timeline-seg-media absolute inset-0 z-0">
                          <SceneAssetPreview
                            scene={scene}
                            getAssetUrl={getAssetUrl}
                            variant="strip"
                          />
                        </div>
                        <div className="ste-timeline-seg-label absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-1 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent">
                          <span
                            className="text-[9px] text-zinc-300 truncate max-w-[70%]"
                            title={scene.assetLabel}
                          >
                            {scene.assetLabel}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-white shrink-0">
                            {scene.duration.toFixed(1)}s
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {blockModel.scenes.slice(0, -1).map((_, idx) => {
                    const leftPct = blockModel.scenes
                      .slice(0, idx + 1)
                      .reduce(
                        (a, s) =>
                          a + (s.duration / blockModel.totalDuration) * 100,
                        0
                      );
                    return (
                      <button
                        key={`div-${idx}`}
                        type="button"
                        className="ste-timeline-divider"
                        style={{ left: `calc(${leftPct}% - 6px)` }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingDivider(idx);
                        }}
                        aria-label={`Ajustar divisão entre cena ${idx + 1} e ${idx + 2}`}
                      />
                    );
                  })}
                </div>

                {/* ROW 2: AI Overlays Track */}
                <div className="relative h-16 bg-zinc-950/45 flex items-center px-1">
                  {activeBlockOverlays.map((ot) => {
                    const fullIdx = draftOverlays.findIndex((x) => x === ot);
                    if (fullIdx === -1) return null;
                    const leftPct =
                      (Math.max(0, ot.start - blockModel.narrationStart) /
                        blockModel.totalDuration) *
                      100;
                    const widthPct =
                      (ot.duration / blockModel.totalDuration) * 100;
                    return (
                      <div
                        key={fullIdx}
                        className="absolute h-9 rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-white flex items-center justify-between z-10 overflow-hidden shadow-md"
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                      >
                        {/* Left resize handle */}
                        <div
                          className="w-1.5 h-full bg-cyan-500/30 hover:bg-cyan-400 cursor-ew-resize shrink-0 transition"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingOverlay({
                              type: "resize-left",
                              overlayIndex: fullIdx,
                              initialX: e.clientX,
                              initialStart: ot.start,
                              initialEnd: ot.start + ot.duration,
                            });
                          }}
                        />

                        {/* Middle content / slide handle */}
                        <div
                          className="flex-1 min-w-0 px-2 py-0.5 flex flex-col justify-center cursor-grab active:cursor-grabbing h-full"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingOverlay({
                              type: "slide",
                              overlayIndex: fullIdx,
                              initialX: e.clientX,
                              initialStart: ot.start,
                              initialEnd: ot.start + ot.duration,
                            });
                          }}
                        >
                          <span className="text-[9px] font-extrabold uppercase tracking-wide text-cyan-400 leading-none mb-0.5 truncate">
                            {ot.type}
                          </span>
                          <span className="text-[9px] font-medium truncate text-zinc-300 leading-none">
                            {ot.props?.label || ot.props?.text || ""}
                          </span>
                        </div>

                        {/* Right resize handle */}
                        <div
                          className="w-1.5 h-full bg-cyan-500/30 hover:bg-cyan-400 cursor-ew-resize shrink-0 transition"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingOverlay({
                              type: "resize-right",
                              overlayIndex: fullIdx,
                              initialX: e.clientX,
                              initialStart: ot.start,
                              initialEnd: ot.start + ot.duration,
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Red playhead marker line synced to preview time */}
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-20 pointer-events-none"
                  style={{
                    left: `${(currentTime / blockModel.totalDuration) * 100}%`,
                  }}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-0.5 -left-[3.5px] border border-white/20" />
                </div>
              </div>
            </div>

            {/* AI OVERLAYS / HYPERFRAMES EDITOR PANEL */}
            <div className="ste-timeline-wrap glass-panel p-5 rounded-xl space-y-3.5">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-500 flex items-center gap-1.5">
                  🎨 Overlays de Texto IA (HyperFrames)
                </span>
                <span className="text-[9px] text-zinc-500 font-mono uppercase">
                  {activeBlockOverlays.length} Overlay(s) Ativo(s)
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                {activeBlockOverlays.length === 0 ? (
                  <p className="text-zinc-500 text-xs py-4 text-center italic border border-dashed border-zinc-900 rounded-xl">
                    Nenhum overlay de texto para este bloco.
                  </p>
                ) : (
                  activeBlockOverlays.map((ot, idx) => {
                    const textVal = ot.props?.label || ot.props?.text || "";
                    const relativeStart = Math.max(
                      0,
                      ot.start - blockModel.narrationStart
                    );
                    return (
                      <div
                        key={idx}
                        className="flex flex-col md:flex-row gap-3 p-3 bg-zinc-900/30 border border-zinc-900 rounded-2xl items-end justify-between hover:border-zinc-850 transition"
                      >
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                              Texto do Overlay ({ot.type})
                            </label>
                            <input
                              type="text"
                              value={textVal}
                              onChange={(e) =>
                                updateOverlayText(idx, e.target.value)
                              }
                              className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500 transition"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div>
                              <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                                Início (s)
                              </label>
                              <input
                                type="number"
                                step={0.1}
                                min={0}
                                value={parseFloat(relativeStart.toFixed(2))}
                                onChange={(e) => {
                                  const absStart =
                                    blockModel.narrationStart +
                                    Number(e.target.value);
                                  updateOverlayField(
                                    idx,
                                    "start",
                                    parseFloat(absStart.toFixed(3))
                                  );
                                }}
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-1.5 text-xs text-center text-white focus:outline-none transition"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                                Duração (s)
                              </label>
                              <input
                                type="number"
                                step={0.1}
                                min={0.2}
                                value={ot.duration}
                                onChange={(e) =>
                                  updateOverlayField(
                                    idx,
                                    "duration",
                                    Number(e.target.value)
                                  )
                                }
                                className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-2 py-1.5 text-xs text-center text-white focus:outline-none transition"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTime(relativeStart);
                              if (audioRef.current && playingKey !== null) {
                                audioRef.current.currentTime =
                                  blockModel.narrationStart + relativeStart;
                              }
                            }}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[10px] rounded-xl text-gold-500 hover:text-gold-400 font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Seek na linha do tempo"
                          >
                            Seek
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOverlay(idx)}
                            className="p-1.5 bg-zinc-950 hover:bg-red-950/40 border border-zinc-850 hover:border-red-900 text-zinc-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                            title="Excluir overlay"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={addOverlay}
                className="w-full py-2 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-900 hover:border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-gold-500" />
                Adicionar Novo Overlay de Texto
              </button>
            </div>

            <div className="ste-scenes grid gap-3">
              {blockModel.scenes.map((scene) => {
                const playId = `${activeBlock}-${scene.idx}`;
                const isPlaying = playingKey === playId;
                return (
                  <article
                    key={scene.idx}
                    className="ste-scene glass-panel p-4 rounded-xl border border-zinc-800/80"
                  >
                    <div className="flex flex-wrap items-start gap-4 mb-3">
                      <SceneAssetPreview
                        scene={scene}
                        getAssetUrl={getAssetUrl}
                        variant="card"
                      />
                      <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
                            Cena {scene.idx + 1}
                          </p>
                          <p
                            className="text-xs text-zinc-400 font-mono truncate max-w-[280px]"
                            title={scene.assetLabel}
                          >
                            {scene.assetLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs text-zinc-400">
                            Duração
                            <input
                              type="number"
                              min={0.5}
                              step={0.1}
                              value={scene.duration}
                              onChange={(e) =>
                                handleDurationChange(
                                  scene.idx,
                                  Number(e.target.value)
                                )
                              }
                              className="ste-duration-input font-bold text-white border border-zinc-800 rounded-lg px-2 py-1 bg-zinc-950 focus:outline-none"
                            />
                            <span>s</span>
                          </label>
                          {hasNarration && (
                            <button
                              type="button"
                              onClick={() => {
                                const { start, end } = getScenePlaybackWindow(
                                  scene,
                                  blockModel.narrationEnd
                                );
                                playScene(activeBlock, scene.idx, start, end);
                              }}
                              className={`ste-play-btn ${isPlaying ? "ste-play-btn--active" : ""}`}
                              title="Ouvir narração desta cena"
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="ste-narration-box">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500/80">
                          Narração nesta janela
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {(() => {
                            const { start, end } = getScenePlaybackWindow(
                              scene,
                              blockModel.narrationEnd
                            );
                            return `${formatTimelineClock(start)} – ${formatTimelineClock(end)}`;
                          })()}
                          {" · "}
                          {scene.words.length} palavras
                          <span
                            className="text-zinc-655 ml-1"
                            title="Duração visual do asset"
                          >
                            (asset {scene.duration.toFixed(1)}s)
                          </span>
                        </span>
                      </div>
                      <p
                        className={`text-sm leading-relaxed ${scene.narrationText ? "text-zinc-200" : "text-zinc-600 italic"}`}
                      >
                        {scene.narrationText ||
                          "Nenhuma palavra nesta janela — aumente a duração ou ajuste o divisor."}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: Real-time active block player preview */}
          <div className="lg:w-[380px] shrink-0 sticky top-4 flex flex-col gap-4 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 self-start shadow-2xl backdrop-blur-md">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold-500">
                Prévia do Bloco
              </span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
                LIVE PLAYBACK
              </span>
            </div>

            {/* Preview Box Frame (Aspect-ratio aware) */}
            <div
              className={`relative flex items-center justify-center bg-[#050506] rounded-xl overflow-hidden border border-zinc-900 shadow-inner ${
                config?.aspect_ratio === "9:16"
                  ? "h-[440px] aspect-[9/16] mx-auto"
                  : "w-full aspect-video"
              }`}
            >
              {/* Asset display */}
              {activeSceneInPreview ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  {activeSceneInPreview.assetType === "video" ? (
                    <video
                      key={activeSceneInPreview.assetPath}
                      src={getAssetUrl(activeSceneInPreview.assetPath)}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                    />
                  ) : (
                    <img
                      src={getAssetUrl(activeSceneInPreview.assetPath)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-650 italic">
                  Sem mídia
                </div>
              )}

              {/* Subtitles Overlay (capitalized, outline shadow) */}
              {activeOverlayInPreview && (
                <div className="absolute bottom-6 left-2 right-2 text-center z-10 pointer-events-none">
                  <span
                    className="font-sans font-extrabold uppercase text-xs md:text-sm text-yellow-500 tracking-wider leading-relaxed"
                    style={{
                      textShadow:
                        "1.5px 1.5px 0px #000, -1.5px -1.5px 0px #000, 1.5px -1.5px 0px #000, -1.5px 1.5px 0px #000, 2px 2px 4px rgba(0,0,0,0.9)",
                    }}
                  >
                    {activeOverlayInPreview.props?.label ||
                      activeOverlayInPreview.props?.text ||
                      activeOverlayInPreview.type.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Playhead control seek bar */}
            <div>
              <div
                className="relative h-1.5 bg-zinc-850 rounded-full cursor-pointer overflow-hidden shadow-inner"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const pct = clickX / rect.width;
                  const newRelativeTime = pct * blockModel.totalDuration;
                  setCurrentTime(newRelativeTime);
                  if (audioRef.current && playingKey !== null) {
                    audioRef.current.currentTime =
                      blockModel.narrationStart + newRelativeTime;
                  }
                }}
              >
                <div
                  className="absolute top-0 bottom-0 bg-gold-500 left-0"
                  style={{
                    width: `${(currentTime / blockModel.totalDuration) * 100}%`,
                  }}
                />
              </div>

              {/* Control buttons & timings */}
              <div className="flex justify-between items-center mt-3">
                <button
                  type="button"
                  onClick={handlePreviewPlayToggle}
                  className={`p-2 rounded-full flex items-center justify-center transition shadow-md cursor-pointer ${
                    isPlayheadPlaying
                      ? "bg-gold-500 text-zinc-950 hover:bg-gold-600"
                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                  }`}
                >
                  {isPlayheadPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                  )}
                </button>

                <div className="font-mono text-[10px] text-zinc-400">
                  <span className="text-white font-bold">
                    {currentTime.toFixed(1)}s
                  </span>
                  <span className="text-zinc-655 mx-1">/</span>
                  <span>{blockModel.totalDuration.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
