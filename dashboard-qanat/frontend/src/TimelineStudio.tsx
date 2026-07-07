import toast from "react-hot-toast";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Bot, RefreshCw, Save, Sparkles } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { AskLumieraPanel } from "./AskLumieraPanel";
import { StockMediaPanel } from "./StockMediaPanel";
import { TimelineStudioClipInspector } from "./TimelineStudioClipInspector";
import { TimelineStudioPreview } from "./TimelineStudioPreview";
import { TimelineStudioTracks } from "./TimelineStudioTracks";
import {
  appendClip,
  computeTotalDuration,
  deleteClip,
  findClip,
  tightenStudioTimelineClips,
  updateCaptionText,
  updateClipInList,
} from "./timelineStudioClipOps";
import { preloadStudioMediaAtPlayhead } from "./timelineStudioMedia";
import {
  clipsOnTrack,
  ensureMotionTrackInStudio,
  formatStudioTime,
  type StudioClip,
  type TimelineStudioState,
} from "./timelineStudioTypes";
import type { RichTimelineEditorProps } from "./RichTimelineEditor";
import type {
  AskLumieraAction,
  StockSearchTrigger,
} from "./timelineStudioAskTypes";
import { upsertMusicClipInStudio } from "./timelineStudioMusic";

export type TimelineStudioProps = RichTimelineEditorProps;

function countRemotionTracks(clips: StudioClip[]) {
  return {
    motion: clipsOnTrack(clips, "motion").length,
    overlays: clipsOnTrack(clips, "overlays").length,
  };
}

function focusFirstRemotionClip(
  studio: TimelineStudioState
): TimelineStudioState {
  const motion = clipsOnTrack(studio.clips, "motion");
  const templates = clipsOnTrack(studio.clips, "overlays");
  const target = motion[0] || templates[0];
  if (!target) return studio;
  return { ...studio, playhead: target.start };
}

export function TimelineStudio({
  config,
  status,
  activeProject,
  storyboardData,
  wordTranscripts,
  timelineNeedsWhisperSync,
  timelineScenesNeedRepair,
  creatorLoading,
  syncingTimings,
  generatingOverlays,
  getAssetUrl,
  getMusicUrl,
  getProjectUrl,
  handleAutoMapAssets,
  handleGenerateAiOverlays,
  handleRepairProjectVisualPrompts,
  handleSaveConfig,
  handleSyncTimings,
  hideAutoMap,
  setConfig,
}: TimelineStudioProps) {
  const [studio, setStudio] = useState<TimelineStudioState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [stockSearchTrigger, setStockSearchTrigger] =
    useState<StockSearchTrigger | null>(null);
  const [planningMotion, setPlanningMotion] = useState(false);
  const configRef = useRef(config);
  configRef.current = config;
  const getAssetUrlRef = useRef(getAssetUrl);
  getAssetUrlRef.current = getAssetUrl;
  const getMusicUrlRef = useRef(getMusicUrl);
  getMusicUrlRef.current = getMusicUrl;

  const applyStudioFromServer = useCallback(
    (
      raw: TimelineStudioState,
      { focusRemotion = false }: { focusRemotion?: boolean } = {}
    ): TimelineStudioState => {
      let loaded = ensureMotionTrackInStudio(
        upsertMusicClipInStudio(raw, configRef.current)
      );
      if (focusRemotion) {
        loaded = focusFirstRemotionClip(loaded);
        const motion = clipsOnTrack(loaded.clips, "motion");
        const templates = clipsOnTrack(loaded.clips, "overlays");
        const target = motion[0] || templates[0];
        if (target) setSelectedClipId(target.id);
      } else {
        const playhead = Number(loaded.playhead) || 0;
        const hasVideoAtPlayhead = Boolean(
          clipsOnTrack(loaded.clips, "video").find(
            (clip) =>
              Boolean(String(clip.source || "").trim()) &&
              playhead >= clip.start &&
              playhead < clip.start + clip.duration
          )
        );
        if (!hasVideoAtPlayhead) {
          const firstVideo = clipsOnTrack(loaded.clips, "video").find((clip) =>
            Boolean(String(clip.source || "").trim())
          );
          if (firstVideo) {
            loaded = { ...loaded, playhead: firstVideo.start };
          }
        }
      }
      setStudio(loaded);
      preloadStudioMediaAtPlayhead(
        loaded.clips,
        loaded.playhead,
        getAssetUrlRef.current,
        getMusicUrlRef.current
      );
      return loaded;
    },
    []
  );

  const loadStudio = useCallback(
    async (opts?: { focusRemotion?: boolean; silent?: boolean }) => {
      if (!activeProject) return null;
      setLoading(true);
      try {
        const res = await fetch(getProjectUrl("/api/timeline-studio"));
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const loaded = applyStudioFromServer(
          data.studio as TimelineStudioState,
          { focusRemotion: opts?.focusRemotion }
        );
        if (!opts?.silent) {
          if (data.migrated) {
            toast.success("Timeline Studio: projeto migrado para multi-trilha");
          }
          if (data.motionMigrated) {
            toast.success(
              "Cenas Remotion movidas para trilha própria (PIP no mapa)"
            );
          }
          if (Number(data.brollRestored) > 0) {
            toast.success(
              `${data.brollRestored} clip(s) B-roll restaurado(s) do config`
            );
          }
          if (Number(data.remotionRestored) > 0) {
            toast.success(
              `${data.remotionRestored} template(s) Remotion restaurado(s) na timeline`
            );
          }
        }
        return loaded;
      } catch (err) {
        const raw = String((err as Error)?.message || "").trim();
        const detail =
          raw ||
          (err instanceof TypeError
            ? "backend offline — verifique porta 3005 (scripts/ensure-lumiera.ps1)"
            : "falha desconhecida ao contactar /api/timeline-studio");
        toast.error(`Erro ao carregar timeline: ${detail}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [activeProject, applyStudioFromServer, getProjectUrl]
  );

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  useEffect(() => {
    setStudio((prev) => (prev ? upsertMusicClipInStudio(prev, config) : prev));
  }, [
    config.single_bgm,
    config.use_single_bgm,
    config.bgm_mappings,
    config.project_music_volume,
  ]);

  const saveStudio = async () => {
    if (!studio) return;
    setSaving(true);
    try {
      const synced = upsertMusicClipInStudio(studio, config);
      const res = await fetch(getProjectUrl("/api/timeline-studio"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio: synced }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Timeline Studio salva");
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const persistStudioSnapshot = useCallback(
    async (nextStudio: TimelineStudioState) => {
      try {
        const synced = upsertMusicClipInStudio(nextStudio, configRef.current);
        const res = await fetch(getProjectUrl("/api/timeline-studio"), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studio: synced }),
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (err) {
        toast.error(`Erro ao persistir timeline: ${(err as Error).message}`);
      }
    },
    [getProjectUrl]
  );

  const updateStudio = (patch: Partial<TimelineStudioState>) => {
    setStudio((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleClipsChange = useCallback((clips: StudioClip[]) => {
    setStudio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clips,
        totalDuration: computeTotalDuration(clips, prev.totalDuration || 120),
      };
    });
  }, []);

  const addClipToStudio = useCallback(
    (clip: StudioClip) => {
      if (!studio) return;
      handleClipsChange(appendClip(studio.clips, clip));
      setSelectedClipId(clip.id);
      updateStudio({ playhead: clip.start });
    },
    [handleClipsChange, studio]
  );

  const insertTemplate = useCallback(
    async (templateId: string) => {
      if (!studio) return;
      try {
        const res = await fetch(
          getProjectUrl("/api/timeline-studio/template/insert"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              templateId,
              playhead: studio.playhead,
            }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        addClipToStudio(data.clip as StudioClip);
        toast.success(`Template ${templateId} inserido`);
      } catch (err) {
        toast.error(`Template: ${(err as Error).message}`);
      }
    },
    [addClipToStudio, getProjectUrl, studio]
  );

  const handleAskActions = useCallback(
    (actions: AskLumieraAction[]) => {
      for (const act of actions) {
        if (act.type === "add_overlay") {
          addClipToStudio(act.clip);
        } else if (act.type === "set_niche_pack") {
          updateStudio({ niche_pack: act.niche_pack });
          toast.success(`Pacote: ${act.niche_pack}`);
        } else if (act.type === "search_stock") {
          setStockSearchTrigger({
            query: act.query,
            mediaType: act.mediaType,
            nonce: Date.now(),
          });
        }
      }
    },
    [addClipToStudio]
  );

  const deleteClipFromStudio = useCallback(
    (clipId: string) => {
      if (!studio) return;
      const target = findClip(studio.clips, clipId);
      const nextClips = deleteClip(studio.clips, clipId);
      if (!target || nextClips.length === studio.clips.length) return;

      const isMotionClip =
        target.trackId === "motion" ||
        target.motionScene ||
        target.props?.motion_scene === true ||
        target.props?.media_mode === "remotion";
      const suppressedMotionSceneIds = isMotionClip
        ? [
            ...new Set([
              ...(studio.suppressedMotionSceneIds || []),
              String(target.id),
            ]),
          ]
        : studio.suppressedMotionSceneIds;
      const nextStudio: TimelineStudioState = {
        ...studio,
        clips: nextClips,
        suppressedMotionSceneIds,
        totalDuration: computeTotalDuration(
          nextClips,
          studio.totalDuration || 120
        ),
      };

      setStudio(nextStudio);
      setSelectedClipId(null);
      void persistStudioSnapshot(nextStudio);
      toast.success(
        isMotionClip
          ? "Cena Remotion removida e bloqueada para nÃ£o voltar"
          : "Clip removido"
      );
    },
    [persistStudioSnapshot, studio]
  );

  const selectedClip = useMemo(
    () =>
      selectedClipId && studio ? findClip(studio.clips, selectedClipId) : null,
    [selectedClipId, studio]
  );

  const selectedTrack = useMemo(
    () =>
      selectedClip && studio
        ? studio.tracks.find((t) => t.id === selectedClip.trackId)
        : undefined,
    [selectedClip, studio]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedClipId || !studio) return;
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      deleteClipFromStudio(selectedClipId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteClipFromStudio, selectedClipId, studio]);

  const videoClips = useMemo(
    () => (studio ? clipsOnTrack(studio.clips, "video") : []),
    [studio]
  );

  const aspectRatio = config.aspect_ratio || "16:9";
  const isVertical = aspectRatio === "9:16";

  if (loading || !studio) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-zinc-400">
        <RefreshCw
          className={`w-8 h-8 text-gold-500 ${loading ? "animate-spin" : ""}`}
        />
        <p className="text-sm">
          {loading ? "Carregando Timeline Studio…" : "Timeline indisponível"}
        </p>
        {!loading && (
          <button
            type="button"
            onClick={() => void loadStudio()}
            className="text-xs text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {(timelineNeedsWhisperSync || timelineScenesNeedRepair) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-wrap gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-[11px] text-amber-100/90">
            {timelineNeedsWhisperSync
              ? "Whisper pendente — legendas podem estar incompletas. "
              : ""}
            {timelineScenesNeedRepair
              ? "Cenas do roteiro precisam de reparo. "
              : ""}
          </div>
          {timelineNeedsWhisperSync && (
            <button
              type="button"
              onClick={() => handleSyncTimings()}
              disabled={syncingTimings}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gold-500/40 bg-gold-500/15 text-gold-200 cursor-pointer disabled:opacity-50"
            >
              Sincronizar Whisper
            </button>
          )}
          {timelineScenesNeedRepair && (
            <button
              type="button"
              disabled={creatorLoading}
              onClick={handleRepairProjectVisualPrompts}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 cursor-pointer"
            >
              Reparar cenas
            </button>
          )}
        </div>
      )}

      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <SectionHeader
          title="Timeline Studio"
          helpId="timeline-media-blocks"
          size="sm"
          titleClassName="tracking-wider uppercase text-xs"
          subtitle={`Multi-trilha · ${isVertical ? "9:16 Short" : "16:9 Long"} · ${studio.clips.length} clips`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={config.aspect_ratio || "16:9"}
            onChange={(e) => {
              const v = e.target.value as "16:9" | "9:16";
              setConfig({ ...config, aspect_ratio: v });
              updateStudio({ format: v });
            }}
            className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded-lg px-2 py-1.5 cursor-pointer"
            title="Formato visual"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
          </select>
          {!hideAutoMap && (
            <button
              type="button"
              disabled={creatorLoading}
              onClick={handleAutoMapAssets}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-gold-400 cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> IA B-roll
            </button>
          )}
          <button
            type="button"
            disabled={generatingOverlays}
            onClick={handleGenerateAiOverlays}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-emerald-400 cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            <Bot className="w-3 h-3" /> Overlays IA
          </button>
          <button
            type="button"
            disabled={planningMotion}
            onClick={async () => {
              setPlanningMotion(true);
              try {
                const orchRes = await fetch(
                  getProjectUrl("/api/ai/creator/orchestrate-production"),
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      use_llm: true,
                      fetch_satellite: true,
                      sync_timeline: true,
                      rebuild_asset_slots: true,
                    }),
                  }
                );
                if (!orchRes.ok) throw new Error(await orchRes.text());
                const orchData = await orchRes.json();
                const loaded = await loadStudio({
                  focusRemotion: true,
                  silent: true,
                });
                const counts = countRemotionTracks(
                  (loaded?.clips ||
                    (orchData.studio as TimelineStudioState | undefined)
                      ?.clips ||
                    []) as StudioClip[]
                );
                const satFailed = (orchData.satellite?.results || []).filter(
                  (r: { ok?: boolean }) => r?.ok === false
                );
                const qc = orchData.quality as
                  | {
                      ok?: boolean;
                      score?: number;
                      failed_count?: number;
                      auto_fixed?: boolean;
                    }
                  | undefined;
                toast.success(
                  `${orchData.motion_count} cena(s) planejada(s) · ${counts.motion} em Cenas Remotion · ${counts.overlays} em Templates · QC ${qc?.score ?? "—"}/100`
                );
                if (counts.motion + counts.overlays === 0) {
                  toast(
                    "Nenhum clip Remotion na timeline — role até a trilha roxa «Cenas Remotion» ou verde «Templates», ou clique Recarregar (F5)",
                    { icon: "⚠️", duration: 8000 }
                  );
                } else if (counts.motion > 0) {
                  toast(
                    `Mapa/motion: trilha «Cenas Remotion» ~${formatStudioTime(
                      clipsOnTrack(loaded?.clips || [], "motion")[0]?.start || 0
                    )}`,
                    { icon: "🗺️", duration: 6000 }
                  );
                }
                if (qc?.auto_fixed) {
                  toast("QC corrigiu mapa(s) satélite automaticamente", {
                    icon: "✓",
                    duration: 5000,
                  });
                }
                if (qc && !qc.ok && Number(qc.failed_count) > 0) {
                  toast(
                    `QC: ${qc.failed_count} cena(s) Remotion ainda com problema — ver inspector do clip`,
                    { icon: "⚠️", duration: 7000 }
                  );
                }
                if (satFailed.length > 0) {
                  toast(
                    `Geocode falhou em ${satFailed.length} cena(s) — revise o nome do local`,
                    { icon: "🗺️", duration: 6000 }
                  );
                }
              } catch (err) {
                toast.error(`Motion scenes: ${(err as Error).message}`);
              } finally {
                setPlanningMotion(false);
              }
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-300 cursor-pointer disabled:opacity-50 flex items-center gap-1"
            title="IA orquestra templates Remotion (mapa, contadores, gráficos, timeline) e injeta dados do roteiro"
          >
            <Sparkles
              className={`w-3 h-3 ${planningMotion ? "animate-spin" : ""}`}
            />
            {planningMotion ? "Planejando…" : "Cenas Remotion"}
          </button>
          <button
            type="button"
            onClick={() => {
              const { clips: tightened, closed } = tightenStudioTimelineClips(
                studio.clips
              );
              if (closed === 0) {
                toast("Nenhum gap curto para fechar nesta timeline");
                return;
              }
              handleClipsChange(tightened);
              toast.success(`${closed} gap(s) fechado(s) entre clips`);
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-sky-400 cursor-pointer"
            title="Estende clips até o próximo — remove vazios entre B-roll e palavras Whisper"
          >
            Fechar gaps
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(
                  getProjectUrl("/api/timeline-studio/remigrate"),
                  {
                    method: "POST",
                  }
                );
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                setStudio(data.studio as TimelineStudioState);
                toast.success("Timeline remigrada do projeto");
              } catch (err) {
                toast.error(`Remigração falhou: ${(err as Error).message}`);
              }
            }}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 cursor-pointer"
          >
            Remigrar
          </button>
          <button
            type="button"
            onClick={() => void loadStudio()}
            disabled={loading}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 cursor-pointer disabled:opacity-50 flex items-center gap-1"
            title="Recarrega timeline_studio.json do disco (aplica migração motion)"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Recarregar
          </button>
          <button
            type="button"
            onClick={handleSaveConfig}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 cursor-pointer"
          >
            Salvar config
          </button>
          <button
            type="button"
            onClick={() => void saveStudio()}
            disabled={saving}
            className="text-[10px] font-bold px-4 py-1.5 rounded-lg bg-gold-500 text-zinc-950 cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Salvando…" : "Salvar Studio"}
          </button>
        </div>
      </div>

      <div
        className={`grid gap-3 min-h-[360px] ${
          isVertical
            ? "grid-cols-1 lg:grid-cols-[minmax(170px,200px)_minmax(0,1.35fr)_minmax(170px,220px)]"
            : "grid-cols-1 lg:grid-cols-[minmax(190px,220px)_minmax(0,2fr)_minmax(190px,240px)]"
        }`}
        style={{ minHeight: isVertical ? 440 : 560 }}
      >
        <div className="min-h-[180px] lg:min-h-0 lg:h-[min(58vh,540px)]">
          <StockMediaPanel
            videoClips={videoClips}
            getAssetUrl={getAssetUrl}
            getProjectUrl={getProjectUrl}
            playhead={studio.playhead}
            stockSearchTrigger={stockSearchTrigger}
            onStockClipAdded={addClipToStudio}
          />
        </div>
        <div className="min-h-[300px] lg:min-h-0 lg:h-[min(74vh,780px)]">
          <TimelineStudioPreview
            studio={studio}
            getAssetUrl={getAssetUrl}
            getMusicUrl={getMusicUrl}
            aspectRatio={aspectRatio}
            musicVolume={
              Number(config.project_music_volume) > 0
                ? Number(config.project_music_volume)
                : 0.15
            }
            onPlayheadChange={(sec) => updateStudio({ playhead: sec })}
          />
        </div>
        <div className="min-h-[180px] lg:min-h-0 lg:h-[min(58vh,540px)]">
          <AskLumieraPanel
            playhead={studio.playhead}
            nichePack={studio.niche_pack}
            getProjectUrl={getProjectUrl}
            onActions={handleAskActions}
            onInsertTemplate={(id) => void insertTemplate(id)}
            onSelectPack={(packId) => updateStudio({ niche_pack: packId })}
          />
        </div>
      </div>

      <TimelineStudioTracks
        studio={studio}
        selectedClipId={selectedClipId}
        onSelectClip={setSelectedClipId}
        onPlayheadChange={(sec) => updateStudio({ playhead: sec })}
        onZoomChange={(zoom) => updateStudio({ zoom })}
        onClipsChange={handleClipsChange}
      />

      {selectedClip ? (
        <TimelineStudioClipInspector
          clip={selectedClip}
          track={selectedTrack}
          onClose={() => setSelectedClipId(null)}
          getProjectUrl={getProjectUrl}
          onSatelliteSynced={(nextStudio) => {
            setStudio(nextStudio as TimelineStudioState);
          }}
          onUpdate={(patch) => {
            handleClipsChange(
              updateClipInList(studio.clips, selectedClip.id, patch)
            );
          }}
          onCaptionText={(text) => {
            handleClipsChange(
              updateCaptionText(studio.clips, selectedClip.id, text)
            );
          }}
          onDelete={() => {
            deleteClipFromStudio(selectedClip.id);
          }}
        />
      ) : null}

      {storyboardData && status?.has_narration && !wordTranscripts?.length ? (
        <p className="text-[10px] text-zinc-600 text-center">
          {status.block_timings?.total_duration
            ? `Duração total: ${Math.round(status.block_timings.total_duration)}s`
            : null}
        </p>
      ) : null}
    </div>
  );
}
