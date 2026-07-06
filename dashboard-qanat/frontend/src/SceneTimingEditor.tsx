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
import { OverlayPreview } from "./OverlayPreview";

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

// Mirror of LumieraTimeline.tsx transition logic: transitionType = index % transitionMod
// transitionMod = 9 for long-form, 12 for shorts
const TRANSITION_LABELS: Record<
  number,
  { label: string; icon: string; color: string }
> = {
  0: { label: "Fade", icon: "◌", color: "#a1a1aa" },
  1: { label: "Zoom In", icon: "⬡", color: "#60a5fa" },
  2: { label: "Wipe ←", icon: "◁", color: "#34d399" },
  3: { label: "Wipe ↑", icon: "△", color: "#a78bfa" },
  4: { label: "Scale", icon: "⬡", color: "#fb923c" },
  5: { label: "Circle", icon: "◎", color: "#f472b6" },
  6: { label: "Wipe →", icon: "▷", color: "#2dd4bf" },
  7: { label: "Wipe ↓", icon: "▽", color: "#c084fc" },
  8: { label: "Rotate", icon: "↺", color: "#fbbf24" },
  9: { label: "Blur", icon: "≋", color: "#94a3b8" },
  10: { label: "Diagonal", icon: "◤", color: "#f43f5e" },
  11: { label: "Grid", icon: "⊞", color: "#818cf8" },
  12: { label: "Zoom+", icon: "⬡", color: "#06b6d4" },
};

// CSS animation names matching each transition type for the preview
const TRANSITION_ANIMS: Record<number, string> = {
  0: "ste-fade",
  1: "ste-zoom-in",
  2: "ste-wipe-left",
  3: "ste-wipe-top",
  4: "ste-scale-in",
  5: "ste-circle",
  6: "ste-wipe-right",
  7: "ste-wipe-bottom",
  8: "ste-rotate-in",
  9: "ste-blur-in",
  10: "ste-diagonal",
  11: "ste-grid",
  12: "ste-zoom-hard",
};

function getTransitionInfo(sceneIdx: number, isShort: boolean) {
  const mod = isShort ? 12 : 9;
  const type = sceneIdx % mod;
  return { type, ...TRANSITION_LABELS[type] };
}

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

  // Transition animation state for preview
  const [transitionAnim, setTransitionAnim] = useState<string | null>(null);
  const prevSceneIdxRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playEndRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Playhead states
  const [currentTime, setCurrentTime] = useState(0);

  // Waveform data: array of peak amplitudes (0–1) covering the entire audio
  const [waveformPeaks, setWaveformPeaks] = useState<Float32Array | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);

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

  // ── Extract real waveform peaks from the narration audio file ──
  useEffect(() => {
    if (!hasNarration) return;
    const url = getMediaUrl("narracao_mestra_premium.mp3");
    if (!url) return;

    let cancelled = false;
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        if (cancelled) return;
        setAudioDuration(decoded.duration);

        // Downsample to ~800 peaks (enough for any timeline width)
        const rawData = decoded.getChannelData(0);
        const numBars = 800;
        const samplesPerBar = Math.floor(rawData.length / numBars);
        const peaks = new Float32Array(numBars);
        for (let i = 0; i < numBars; i++) {
          let max = 0;
          const offset = i * samplesPerBar;
          for (let j = 0; j < samplesPerBar; j++) {
            const v = Math.abs(rawData[offset + j]);
            if (v > max) max = v;
          }
          peaks[i] = max;
        }
        setWaveformPeaks(peaks);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      ctx.close().catch(() => {});
    };
  }, [hasNarration, getMediaUrl]);

  // ── Render waveform to canvas when peaks/block change ──
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !waveformPeaks || !blockModel || audioDuration <= 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Guard: canvas not yet laid out
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    // *** KEY FIX: use totalDuration as the window (same as Legendas/Cenas tracks)
    // so each pixel column in the waveform maps to the same time as every other track.
    // narrationEnd may differ from narrationStart + totalDuration — always use totalDuration.
    const windowEnd = blockModel.narrationStart + blockModel.totalDuration;
    const blockStartFrac = blockModel.narrationStart / audioDuration;
    const blockEndFrac = windowEnd / audioDuration;
    const peakStart = Math.floor(blockStartFrac * waveformPeaks.length);
    const peakEnd = Math.ceil(blockEndFrac * waveformPeaks.length);
    const blockPeaks = waveformPeaks.slice(
      Math.max(0, peakStart),
      Math.min(waveformPeaks.length, peakEnd)
    );

    if (blockPeaks.length === 0) return;

    const barWidth = W / blockPeaks.length;
    const centerY = H / 2;

    // Draw each bar mirrored around center
    for (let i = 0; i < blockPeaks.length; i++) {
      const amp = blockPeaks[i];
      const barH = Math.max(1, amp * H * 0.9);
      const x = i * barWidth;

      // Gradient-like color based on amplitude
      const alpha = 0.4 + amp * 0.6;
      ctx.fillStyle = `rgba(217, 70, 239, ${alpha})`; // fuchsia
      ctx.fillRect(x, centerY - barH / 2, Math.max(barWidth - 0.5, 0.5), barH);
    }
  }, [waveformPeaks, blockModel, audioDuration]);

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

  const isPlayheadPlaying = playingKey !== null;

  const handlePreviewPlayToggle = useCallback(() => {
    if (isPlayheadPlaying) {
      stopPlayback();
      return;
    }
    if (!blockModel) return;
    const el = audioRef.current;
    if (!el) return;

    // Play the entire block from current position to end
    const absStart = blockModel.narrationStart + currentTime;
    setPlayingKey(`preview-${activeBlock}`);
    playEndRef.current = blockModel.narrationEnd;
    el.currentTime = absStart;
    void el.play().catch(() => stopPlayback());
  }, [isPlayheadPlaying, stopPlayback, blockModel, currentTime, activeBlock]);

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

  const isShort = config?.aspect_ratio === "9:16";

  // Trigger preview transition animation when active scene changes
  useEffect(() => {
    if (!activeSceneInPreview) return;
    const idx = activeSceneInPreview.idx;
    if (prevSceneIdxRef.current === idx) return;
    prevSceneIdxRef.current = idx;
    // Scene 0 (first) = no entry animation
    if (idx === 0) return;
    const info = getTransitionInfo(idx, isShort);
    const animName = TRANSITION_ANIMS[info.type] ?? "ste-fade";
    setTransitionAnim(null);
    requestAnimationFrame(() => setTransitionAnim(animName));
  }, [activeSceneInPreview, isShort]);

  const activeOverlayInPreview = useMemo(() => {
    if (!blockModel) return null;
    const currentAbsTime = blockModel.narrationStart + currentTime;
    return draftOverlays.find(
      (ot) =>
        currentAbsTime >= ot.start && currentAbsTime <= ot.start + ot.duration
    );
  }, [draftOverlays, blockModel, currentTime]);

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
            <div className="ste-summary glass-panel p-4 rounded-xl grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                {/* Duração real renderizada = totalDuration - (N-1) × 0.4s de overlap */}
                {(() => {
                  const nScenes = blockModel.scenes.length;
                  const transitionOverlap = Math.max(0, nScenes - 1) * 0.4;
                  const renderedDuration = Math.max(
                    0,
                    blockModel.totalDuration - transitionOverlap
                  );
                  const diff = renderedDuration - blockModel.speechDuration;
                  const ok = Math.abs(diff) < 0.5;
                  return (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
                        Renderizado (−{transitionOverlap.toFixed(1)}s trans.)
                      </p>
                      <p
                        className={`font-mono flex items-center gap-1 ${ok ? "text-emerald-400" : Math.abs(diff) < 1.5 ? "text-amber-300" : "text-red-400"}`}
                      >
                        {renderedDuration.toFixed(1)}s
                        <span className="text-[9px] text-zinc-500 ml-1">
                          ({diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}s vs áudio)
                        </span>
                      </p>
                    </>
                  );
                })()}
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

            <div className="ste-timeline-wrap glass-panel rounded-xl relative overflow-hidden">
              {/* NLE Track Header / Time ruler */}
              <div className="flex border-b border-zinc-800">
                <div className="w-[88px] shrink-0 bg-zinc-950/60 border-r border-zinc-800 flex items-center justify-center py-1">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600">
                    Faixas
                  </span>
                </div>
                <div className="flex-1 relative h-5 bg-zinc-950/40">
                  {/* Time ticks */}
                  {Array.from({
                    length: Math.ceil(blockModel.totalDuration) + 1,
                  }).map((_, i) => {
                    const pct =
                      blockModel.totalDuration > 0
                        ? (i / blockModel.totalDuration) * 100
                        : 0;
                    if (pct > 100) return null;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 flex flex-col items-center"
                        style={{ left: `${pct}%` }}
                      >
                        <div className="w-px h-full bg-zinc-800/60" />
                        <span className="absolute top-0.5 text-[7px] font-mono text-zinc-600 -translate-x-1/2 select-none">
                          {i}s
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* All tracks container — single ref for click-to-seek */}
              <div
                ref={timelineRef}
                onClick={(e) => {
                  if (
                    draggingDivider !== null ||
                    draggingOverlay !== null ||
                    !timelineRef.current
                  )
                    return;
                  const tracksArea = timelineRef.current;
                  // Find the clips area (skip label column)
                  const rect = tracksArea.getBoundingClientRect();
                  const labelWidth = 88;
                  const clipsWidth = rect.width - labelWidth;
                  const clickX = e.clientX - rect.left - labelWidth;
                  if (clickX < 0) return;
                  const newRelativeTime = Math.max(
                    0,
                    Math.min(
                      (clickX / clipsWidth) * blockModel.totalDuration,
                      blockModel.totalDuration
                    )
                  );
                  setCurrentTime(newRelativeTime);
                  if (audioRef.current && playingKey !== null) {
                    audioRef.current.currentTime =
                      blockModel.narrationStart + newRelativeTime;
                  }
                }}
                className="relative cursor-col-resize select-none"
              >
                {/* ── TRACK 1: LEGENDAS ── */}
                <div className="flex border-b border-zinc-900/60">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">🗣</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Legendas
                    </span>
                  </div>
                  <div className="flex-1 relative h-12 bg-zinc-950/20 overflow-hidden">
                    {(() => {
                      // Group words into subtitle segments (groups of ~3-5 words that fit within this block)
                      const blockStart = blockModel.narrationStart;
                      const blockEnd = blockModel.narrationEnd;
                      const blockDur = blockModel.totalDuration;
                      const wordsInBlock = flatWords.filter(
                        (w) => w.start >= blockStart && w.end <= blockEnd
                      );

                      // Cluster into groups of 3–5 words
                      const clusters: {
                        text: string;
                        start: number;
                        end: number;
                      }[] = [];
                      let i = 0;
                      while (i < wordsInBlock.length) {
                        const groupSize = Math.min(4, wordsInBlock.length - i);
                        const group = wordsInBlock.slice(i, i + groupSize);
                        clusters.push({
                          text: group.map((w) => w.word).join(" "),
                          start: group[0].start - blockStart,
                          end: group[group.length - 1].end - blockStart,
                        });
                        i += groupSize;
                      }

                      return clusters.map((c, ci) => {
                        const leftPct =
                          blockDur > 0 ? (c.start / blockDur) * 100 : 0;
                        const widthPct =
                          blockDur > 0
                            ? ((c.end - c.start) / blockDur) * 100
                            : 0;
                        return (
                          <div
                            key={ci}
                            className="absolute top-1 bottom-1 bg-zinc-800/60 border border-zinc-700/40 rounded-[4px] flex items-center px-1.5 overflow-hidden"
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(widthPct, 0.5)}%`,
                            }}
                            title={c.text}
                          >
                            <span className="text-[8px] text-zinc-300 truncate font-medium leading-none">
                              Aa {c.text.substring(0, 18)}
                              {c.text.length > 18 ? "…" : ""}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* ── TRACK 2: CENAS / B-ROLL ── */}
                <div className="flex border-b border-zinc-900/60">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">🎬</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Cenas
                    </span>
                  </div>
                  <div className="flex-1 relative h-20 overflow-hidden">
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
                              background:
                                SCENE_COLORS[idx % SCENE_COLORS.length],
                            }}
                          />
                          <div className="ste-timeline-seg-media absolute inset-0 z-0">
                            <SceneAssetPreview
                              scene={scene}
                              getAssetUrl={getAssetUrl}
                              variant="strip"
                            />
                          </div>
                          <div className="ste-timeline-seg-label absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-1 px-1.5 py-0.5 bg-gradient-to-t from-black/85 to-transparent">
                            <span
                              className="text-[8px] text-zinc-300 truncate max-w-[70%]"
                              title={scene.assetLabel}
                            >
                              {scene.assetLabel}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-white shrink-0">
                              {scene.duration.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Scene dividers (draggable) with transition badge */}
                    {blockModel.scenes.slice(0, -1).map((_, idx) => {
                      const leftPct = blockModel.scenes
                        .slice(0, idx + 1)
                        .reduce(
                          (a, s) =>
                            a + (s.duration / blockModel.totalDuration) * 100,
                          0
                        );
                      const transInfo = getTransitionInfo(idx + 1, isShort);
                      return (
                        <div
                          key={`div-wrap-${idx}`}
                          className="absolute top-0 bottom-0 z-10"
                          style={{
                            left: `calc(${leftPct}% - 14px)`,
                            width: "28px",
                          }}
                        >
                          {/* Transition label badge */}
                          <div
                            className="absolute -top-px left-1/2 -translate-x-1/2 flex flex-col items-center gap-px pointer-events-none"
                            style={{ zIndex: 20 }}
                          >
                            <span
                              className="text-[7px] font-bold uppercase tracking-wide px-1 py-px rounded-sm whitespace-nowrap leading-none"
                              style={{
                                background: transInfo.color + "30",
                                color: transInfo.color,
                                border: `1px solid ${transInfo.color}60`,
                              }}
                            >
                              {transInfo.icon} {transInfo.label}
                            </span>
                          </div>
                          {/* Draggable divider handle */}
                          <button
                            type="button"
                            className="ste-timeline-divider absolute inset-y-0 left-1/2 -translate-x-1/2"
                            style={{ width: "12px" }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingDivider(idx);
                            }}
                            aria-label={`Ajustar divisão entre cena ${idx + 1} e ${idx + 2}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── TRACK 3: NARRAÇÃO / VOICEOVER ── */}
                <div className="flex border-b border-zinc-900/60">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">🎙</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Narração
                    </span>
                  </div>
                  <div className="flex-1 relative h-16 bg-zinc-950/20 overflow-hidden">
                    {hasNarration && (
                      <div className="absolute top-0.5 bottom-0.5 left-0 right-0 rounded-[4px] overflow-hidden border border-fuchsia-500/20">
                        {/* Subtle background tint */}
                        <div className="absolute inset-0 bg-fuchsia-950/30 rounded-[4px]" />
                        {/* Real waveform canvas */}
                        <canvas
                          ref={waveformCanvasRef}
                          className="absolute inset-0 w-full h-full"
                          style={{ imageRendering: "pixelated" }}
                        />
                        {/* Label when no waveform data yet */}
                        {!waveformPeaks && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-[8px] font-bold text-fuchsia-200/50 uppercase tracking-wider animate-pulse">
                              Carregando waveform…
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── TRACK 4: EFEITOS / SFX ── */}
                <div className="flex border-b border-zinc-900/60">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">🔊</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Efeitos
                    </span>
                  </div>
                  <div className="flex-1 relative h-12 bg-zinc-950/20 overflow-hidden">
                    {/* SFX clips placeholder — future integration with sfx_mappings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[8px] text-zinc-700 italic select-none">
                        Efeitos sonoros
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── TRACK 5: TEMPLATES ── */}
                <div className="flex border-b border-zinc-900/60">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">📐</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Templates
                    </span>
                  </div>
                  <div className="flex-1 relative h-12 bg-zinc-950/20 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[8px] text-zinc-700 italic select-none">
                        Elementos de template
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── TRACK 6: OVERLAYS ── */}
                <div className="flex">
                  <div className="w-[88px] shrink-0 bg-zinc-950/50 border-r border-zinc-800 flex items-center gap-1.5 px-2 py-1">
                    <span className="text-[10px]">✨</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      Overlays
                    </span>
                  </div>
                  <div className="flex-1 relative h-14 bg-zinc-950/20 overflow-hidden flex items-center px-0.5">
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
                          className="absolute h-10 rounded-md border border-cyan-500/40 bg-cyan-950/30 text-white flex items-center justify-between z-10 overflow-hidden shadow-md"
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
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
                            className="flex-1 min-w-0 px-1.5 py-0.5 flex flex-col justify-center cursor-grab active:cursor-grabbing h-full"
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
                            <span className="text-[8px] font-extrabold uppercase tracking-wide text-cyan-400 leading-none mb-0.5 truncate">
                              {ot.type}
                            </span>
                            <span className="text-[8px] font-medium truncate text-zinc-300 leading-none">
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
                </div>

                {/* ── VERTICAL PLAYHEAD (spans all tracks) ── */}
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-red-500 z-30 pointer-events-none"
                  style={{
                    left: `${88 + (currentTime / blockModel.totalDuration) * (timelineRef.current ? timelineRef.current.getBoundingClientRect().width - 88 : 0)}px`,
                  }}
                >
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full absolute -top-0.5 -left-[5px] border border-white/30 shadow-md" />
                </div>
              </div>
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
              {/* Asset display with transition animation */}
              {activeSceneInPreview ? (
                <div
                  key={activeSceneInPreview.idx}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    animation: transitionAnim
                      ? `${transitionAnim} 0.4s ease-out forwards`
                      : undefined,
                  }}
                >
                  {activeSceneInPreview.assetType === "video" ? (
                    <video
                      key={activeSceneInPreview.assetPath}
                      src={getAssetUrl(activeSceneInPreview.assetPath)}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={getAssetUrl(activeSceneInPreview.assetPath)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Transition name badge */}
                  {transitionAnim && (
                    <div className="absolute top-2 right-2 z-30 pointer-events-none">
                      {(() => {
                        const info = getTransitionInfo(
                          activeSceneInPreview.idx,
                          isShort
                        );
                        return (
                          <span
                            className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md animate-fade-in"
                            style={{
                              background: info.color + "25",
                              color: info.color,
                              border: `1px solid ${info.color}50`,
                              textShadow: "0 0 8px " + info.color,
                            }}
                          >
                            {info.icon} {info.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-650 italic">
                  Sem mídia
                </div>
              )}

              {/* Subtitles Overlay / Simulated Component */}
              {activeOverlayInPreview && (
                <>
                  {playingKey !== null ? (
                    <div className="ste-overlay-wrapper absolute inset-0 pointer-events-none z-20">
                      <OverlayPreview
                        overlay={activeOverlayInPreview}
                        aspectRatio={config?.aspect_ratio || "9:16"}
                        accentColor={
                          activeOverlayInPreview.props?.accentColor || "#FF3D00"
                        }
                        compact={true}
                      />
                    </div>
                  ) : null}
                  {/* Static label visible always when overlay is in range */}
                  <div className="absolute bottom-6 left-2 right-2 text-center z-10 pointer-events-none">
                    <span
                      className={`font-sans font-extrabold uppercase text-[10px] md:text-xs text-yellow-500 tracking-wider leading-relaxed ${playingKey !== null ? "opacity-40" : "opacity-90"}`}
                      style={{
                        textShadow:
                          "1px 1px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000",
                      }}
                    >
                      {activeOverlayInPreview.props?.label ||
                        activeOverlayInPreview.props?.text ||
                        activeOverlayInPreview.type.toUpperCase()}
                    </span>
                  </div>
                </>
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
      {/* Style overrides to strip frames and backgrounds of OverlayPreview in the playhead box */}
      <style>{`
        .ste-overlay-wrapper {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          pointer-events: none !important;
          z-index: 20 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ste-overlay-wrapper > div {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .ste-overlay-wrapper > div > div:first-child {
          display: none !important;
        }
        .ste-overlay-wrapper .overlay-preview-frame {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ste-overlay-wrapper .overlay-preview-frame > div[style*="linear-gradient"],
        .ste-overlay-wrapper .overlay-preview-frame > div[style*="radial-gradient"],
        .ste-overlay-wrapper .overlay-preview-frame > div[style*="border-t"],
        .ste-overlay-wrapper .overlay-preview-frame > div[className*="top-"],
        .ste-overlay-wrapper .overlay-preview-frame > div[className*="bottom-"] {
          display: none !important;
        }
        .ste-overlay-wrapper > div > p,
        .ste-overlay-wrapper > div > div:last-child {
          display: none !important;
        }

        /* ── Preview transition keyframes ── */
        @keyframes ste-fade       { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ste-zoom-in    { from { transform: scale(1.18); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ste-wipe-left  { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0% 0 0); } }
        @keyframes ste-wipe-top   { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
        @keyframes ste-scale-in   { from { transform: scale(0.87); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes ste-circle     { from { clip-path: circle(0% at 50% 50%); } to { clip-path: circle(75% at 50% 50%); } }
        @keyframes ste-wipe-right { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
        @keyframes ste-wipe-bottom{ from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0% 0); } }
        @keyframes ste-rotate-in  { from { transform: scale(0.92) rotate(-3deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes ste-blur-in    { from { filter: blur(12px); opacity: 0.3; } to { filter: blur(0); opacity: 1; } }
        @keyframes ste-diagonal   { from { clip-path: polygon(0 0, 0 0, 0 0); } to { clip-path: polygon(0 0, 100% 0, 0 100%); } }
        @keyframes ste-grid       { from { clip-path: inset(12% 12% 12% 12%); transform: scale(1.07); } to { clip-path: inset(0 0 0 0); transform: scale(1); } }
        @keyframes ste-zoom-hard  { from { transform: scale(1.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes animate-fade-in{ from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: animate-fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}
