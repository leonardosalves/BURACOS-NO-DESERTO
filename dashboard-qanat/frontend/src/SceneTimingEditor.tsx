import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { BlockTimingStatus, NarrationSyncContext, TimelineAsset } from "./timelineNarrationSync";

type ConfigSlice = {
  timeline_assets?: Record<string, TimelineAsset[]>;
  block_phrases?: { block: number; phrase: string }[];
};

type Props = {
  activeProject: string;
  config: ConfigSlice | null;
  status?: BlockTimingStatus & { has_narration?: boolean };
  storyboard?: { visual_prompts?: Array<{ block?: number; narration_text?: string; narration_excerpt?: string }> };
  wordTranscripts: any[];
  getMediaUrl: (file: string) => string;
  getAssetUrl: (fileName: string) => string;
  onSave: (timelineAssets: Record<string, TimelineAsset[]>) => Promise<void>;
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
        <span className="text-[9px] text-zinc-600">Sem mídia</span>
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
          loop
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
      <img src={url} alt={scene.assetLabel} className="ste-asset-media" loading="lazy" />
    </div>
  );
}

const SCENE_COLORS = [
  "rgba(56, 189, 248, 0.55)",
  "rgba(129, 140, 248, 0.55)",
  "rgba(52, 211, 153, 0.55)",
  "rgba(251, 191, 36, 0.55)",
  "rgba(244, 114, 182, 0.55)",
  "rgba(167, 139, 250, 0.55)",
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
  const [activeBlock, setActiveBlock] = useState("1");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [draggingDivider, setDraggingDivider] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const playEndRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(structuredClone(config?.timeline_assets || {}));
  }, [config?.timeline_assets, activeProject]);

  const flatWords = useMemo(() => flattenTranscriptWords(wordTranscripts), [wordTranscripts]);

  const blockKeys = useMemo(
    () => Object.keys(draft).sort((a, b) => Number(a) - Number(b)),
    [draft],
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
    [config, draft, storyboard, status],
  );

  const blockModel = useMemo((): BlockTimingModel | null => {
    const assets = draft[activeBlock];
    if (!assets?.length) return null;
    return buildBlockTimingModel(activeBlock, assets, flatWords, status, syncCtx);
  }, [activeBlock, draft, flatWords, status, syncCtx]);

  const hasTranscript = flatWords.length > 0 && Boolean(status?.block_timings?.starts?.length);
  const hasNarration = Boolean(status?.has_narration);

  const stopPlayback = useCallback(() => {
    audioRef.current?.pause();
    setPlayingKey(null);
    playEndRef.current = null;
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const playScene = useCallback(
    (blockKey: string, sceneIdx: number, start: number, end: number) => {
      const key = `${blockKey}-${sceneIdx}`;
      if (playingKey === key) {
        stopPlayback();
        return;
      }

      stopPlayback();
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      const url = getMediaUrl("narracao_mestra_premium.mp3");
      audio.src = url;
      audio.currentTime = start;
      playEndRef.current = end + 0.15;

      const onTime = () => {
        if (playEndRef.current != null && audio.currentTime >= playEndRef.current) {
          stopPlayback();
        }
      };

      audio.ontimeupdate = onTime;
      audio.onended = () => stopPlayback();
      audio.play()
        .then(() => setPlayingKey(key))
        .catch(() => toast("Não foi possível reproduzir a narração."));
    },
    [getMediaUrl, playingKey, stopPlayback, toast],
  );

  const updateBlockAssets = useCallback((blockKey: string, assets: TimelineAsset[]) => {
    setDraft((prev) => ({ ...prev, [blockKey]: assets }));
  }, []);

  const handleDurationChange = (sceneIdx: number, value: number) => {
    const assets = draft[activeBlock];
    if (!assets || !blockModel) return;
    const blockDur = blockModel.blockEnd - blockModel.blockStart;
    updateBlockAssets(activeBlock, setSceneDuration(assets, sceneIdx, value, blockDur));
  };

  const handleDividerDrag = useCallback(
    (clientX: number, dividerIdx: number) => {
      const el = timelineRef.current;
      const assets = draft[activeBlock];
      const model = blockModel;
      if (!el || !assets || !model || dividerIdx >= assets.length - 1) return;

      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const targetLeftSum = ratio * model.totalDuration;
      let acc = 0;
      let desiredLeft = model.scenes[dividerIdx].duration;
      for (let i = 0; i <= dividerIdx; i++) {
        acc += model.scenes[i].duration;
      }
      const delta = targetLeftSum - acc;
      const blockDur = model.blockEnd - model.blockStart;
      updateBlockAssets(activeBlock, resizeScenePair(assets, dividerIdx, delta, blockDur));
    },
    [activeBlock, blockModel, draft, updateBlockAssets],
  );

  useEffect(() => {
    if (draggingDivider == null) return;

    const onMove = (e: MouseEvent) => handleDividerDrag(e.clientX, draggingDivider);
    const onUp = () => setDraggingDivider(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingDivider, handleDividerDrag]);

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
        storyboard,
      );
      if (aligned === 0) {
        toast("Nenhuma cena alinhada — confira textos no storyboard.");
        return;
      }
      const model = buildBlockTimingModel(activeBlock, synced, flatWords, status, {
        ...syncCtx,
        config: { ...syncCtx.config, timeline_assets: { ...draft, [activeBlock]: synced } },
      });
      const withStarts = model ? applyAudioStartsFromScenes(synced, model) : synced;
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
        const model = buildBlockTimingModel(blockKey, assets, flatWords, status, {
          ...syncCtx,
          config: { ...syncCtx.config, timeline_assets: enriched },
        });
        if (model) {
          enriched[blockKey] = applyAudioStartsFromScenes(assets, model);
        }
      }
      await onSave(enriched);
      setDraft(enriched);
      toast("Timing das cenas salvo.");
    } catch {
      toast("Erro ao salvar.");
    } finally {
      setSaving(false);
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
        Este projeto não tem cenas na timeline. Use o Editor ou Workflow para mapear mídias primeiro.
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
              title={hasTranscript ? "Alinha duração ao trecho falado de cada cena" : "Transcrição ausente"}
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Sincronizar bloco com a voz
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ste-btn ste-btn-save"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar timing
            </button>
          </div>
        }
      />

      {!hasTranscript && (
        <div className="ste-warn flex items-start gap-3 p-4 rounded-xl border border-amber-900/40 bg-amber-950/20 text-amber-200/90 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <p>
            Transcrição Whisper não carregada. Vá em <strong>Workflow → Sincronizar Whisper</strong> para ver a narração sincronizada com o áudio.
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
              onClick={() => { stopPlayback(); setActiveBlock(key); }}
              className={`ste-block-tab ${active ? "ste-block-tab--active" : ""}`}
            >
              Bloco {key}
              <span className="ste-block-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {blockModel && (
        <>
          <div className="ste-summary glass-panel p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Narração do bloco</p>
              <p className="font-mono text-cyan-300">
                {formatTimelineClock(blockModel.narrationStart)} → {formatTimelineClock(blockModel.narrationEnd)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Duração das cenas</p>
              <p className="font-mono text-white">{blockModel.totalDuration.toFixed(1)}s</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Palavras</p>
              <p className="font-mono text-white">{blockModel.totalWords}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Cobertura</p>
              <p className={`font-mono flex items-center gap-1.5 ${blockModel.coveragePercent >= 95 ? "text-emerald-400" : "text-amber-300"}`}>
                {blockModel.coveragePercent >= 95 ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {blockModel.coveredWords}/{blockModel.totalWords} ({blockModel.coveragePercent}%)
              </p>
            </div>
          </div>

          <div className="ste-timeline-wrap glass-panel p-5 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Linha do bloco</span>
              {hasNarration && (
                <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Arraste os divisores para redistribuir tempo
                </span>
              )}
            </div>

            <div ref={timelineRef} className="ste-timeline-track relative h-28 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800">
              {blockModel.scenes.map((scene, idx) => {
                const widthPct = blockModel.totalDuration > 0
                  ? (scene.duration / blockModel.totalDuration) * 100
                  : 100 / blockModel.scenes.length;
                const leftPct = blockModel.scenes
                  .slice(0, idx)
                  .reduce((a, s) => a + (s.duration / blockModel.totalDuration) * 100, 0);
                return (
                  <div
                    key={scene.idx}
                    className="ste-timeline-seg absolute top-0 bottom-0 overflow-hidden"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      borderRight: idx < blockModel.scenes.length - 1 ? "2px solid rgba(0,0,0,0.5)" : undefined,
                    }}
                    title={scene.assetLabel}
                  >
                    <div
                      className="ste-timeline-seg-tint absolute inset-0 z-[1]"
                      style={{ background: SCENE_COLORS[idx % SCENE_COLORS.length] }}
                    />
                    <div className="ste-timeline-seg-media absolute inset-0 z-0">
                      <SceneAssetPreview scene={scene} getAssetUrl={getAssetUrl} variant="strip" />
                    </div>
                    <div className="ste-timeline-seg-label absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-1 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent">
                      <span className="text-[9px] text-zinc-300 truncate max-w-[70%]" title={scene.assetLabel}>
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
                  .reduce((a, s) => a + (s.duration / blockModel.totalDuration) * 100, 0);
                return (
                  <button
                    key={`div-${idx}`}
                    type="button"
                    className="ste-timeline-divider"
                    style={{ left: `calc(${leftPct}% - 6px)` }}
                    onMouseDown={() => setDraggingDivider(idx)}
                    aria-label={`Ajustar divisão entre cena ${idx + 1} e ${idx + 2}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="ste-scenes grid gap-3">
            {blockModel.scenes.map((scene) => {
              const playId = `${activeBlock}-${scene.idx}`;
              const isPlaying = playingKey === playId;
              return (
                <article key={scene.idx} className="ste-scene glass-panel p-4 rounded-xl border border-zinc-800/80">
                  <div className="flex flex-wrap items-start gap-4 mb-3">
                    <SceneAssetPreview scene={scene} getAssetUrl={getAssetUrl} variant="card" />
                    <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">
                        Cena {scene.idx + 1}
                      </p>
                      <p className="text-xs text-zinc-400 font-mono truncate max-w-[280px]" title={scene.assetLabel}>
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
                          onChange={(e) => handleDurationChange(scene.idx, Number(e.target.value))}
                          className="ste-duration-input"
                        />
                        <span>s</span>
                      </label>
                      {hasNarration && (
                        <button
                          type="button"
                          onClick={() => {
                            const { start, end } = getScenePlaybackWindow(scene);
                            playScene(activeBlock, scene.idx, start, end);
                          }}
                          className={`ste-play-btn ${isPlaying ? "ste-play-btn--active" : ""}`}
                          title="Ouvir narração desta cena"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
                          const { start, end } = getScenePlaybackWindow(scene);
                          return `${formatTimelineClock(start)} – ${formatTimelineClock(end)}`;
                        })()}
                        {" · "}{scene.words.length} palavras
                        <span className="text-zinc-600 ml-1" title="Duração visual do asset">
                          (asset {scene.duration.toFixed(1)}s)
                        </span>
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${scene.narrationText ? "text-zinc-200" : "text-zinc-600 italic"}`}>
                      {scene.narrationText || "Nenhuma palavra nesta janela — aumente a duração ou ajuste o divisor."}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}