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
import {
  enrichSatelliteMotionClip,
  preloadStudioMediaAtPlayhead,
} from "./timelineStudioMedia";
import {
  applySuppressionFields,
  expandDeletedClipSuppressions,
  isRemotionStudioClip,
} from "@lumiera/shared/timelineStudioRemotionSuppress.js";
import {
  isLegacyStudioOverlayClip,
  stripLegacyStudioOverlayClips,
} from "@lumiera/shared/timelineStudioLegacyStrip.js";

import {
  activeCaptionAt,
  activeMotionAt,
  activeVideoAt,
  clipAtPlayhead,
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

const PREVIEW_SPLIT_STORAGE_KEY = "lumiera-studio-preview-split";
const PREVIEW_SPLIT_DEFAULT = 62;
const PREVIEW_SPLIT_MIN = 38;
const PREVIEW_SPLIT_MAX = 78;

function readPreviewSplitRatio(): number {
  try {
    const saved = localStorage.getItem(PREVIEW_SPLIT_STORAGE_KEY);
    if (saved == null) return PREVIEW_SPLIT_DEFAULT;
    const n = Number(saved);
    if (!Number.isFinite(n)) return PREVIEW_SPLIT_DEFAULT;
    return Math.min(PREVIEW_SPLIT_MAX, Math.max(PREVIEW_SPLIT_MIN, n));
  } catch {
    return PREVIEW_SPLIT_DEFAULT;
  }
}

function normalizeGeoMotionClips(
  studio: TimelineStudioState
): TimelineStudioState {
  return {
    ...studio,
    clips: studio.clips.map((clip) => enrichSatelliteMotionClip(clip)),
  };
}

function countRemotionTracks(clips: StudioClip[]) {
  return {
    motion: clipsOnTrack(clips, "motion").length,
    overlays: clipsOnTrack(clips, "overlays").length,
  };
}

function clipActiveOnTrack(
  clips: StudioClip[],
  playhead: number,
  trackId?: string
): StudioClip | null {
  if (!trackId) return clipAtPlayhead(clips, playhead);
  if (trackId === "captions") return activeCaptionAt(clips, playhead);
  if (trackId === "video") return activeVideoAt(clips, playhead);
  if (trackId === "motion") return activeMotionAt(clips, playhead)[0] || null;
  return (
    clips.find(
      (clip) =>
        clip.trackId === trackId &&
        playhead >= clip.start &&
        playhead < clip.start + clip.duration
    ) || null
  );
}

function numericClipPatch(patch: Partial<StudioClip>): Partial<StudioClip> {
  const next = { ...patch };
  if (next.start != null) next.start = Math.max(0, Number(next.start) || 0);
  if (next.duration != null) {
    next.duration = Math.max(0.08, Number(next.duration) || 0.08);
  }
  return next;
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

function RemotionQuickBar({
  clips,
  playhead,
  onJump,
}: {
  clips: StudioClip[];
  playhead: number;
  onJump: (clip: StudioClip) => void;
}) {
  const motion = clipsOnTrack(clips, "motion");
  const templates = clipsOnTrack(clips, "overlays");
  const items = [...motion, ...templates].sort(
    (a, b) => (Number(a.start) || 0) - (Number(b.start) || 0)
  );
  if (!items.length) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-200/90">
        Nenhuma cena Remotion na timeline — clique{" "}
        <span className="font-bold text-violet-300">Cenas Remotion</span> para
        gerar mapa, contadores e gráficos.
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/80 px-3 py-2">
      <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 shrink-0">
        Remotion
      </span>
      <span className="text-[9px] text-zinc-600 shrink-0">
        🟣 {motion.length} · 🟢 {templates.length}
      </span>
      {items.map((clip) => {
        const isMotion = clip.trackId === "motion";
        const active =
          playhead >= clip.start && playhead < clip.start + clip.duration;
        return (
          <button
            key={clip.id}
            type="button"
            onClick={() => onJump(clip)}
            className={`text-[9px] font-semibold px-2 py-1 rounded-md border cursor-pointer transition ${
              active
                ? "border-gold-400/70 bg-gold-500/15 text-gold-200"
                : isMotion
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
            title={`${clip.label || clip.templateId} · ${formatStudioTime(clip.start)}`}
          >
            {isMotion ? "🟣" : "🟢"} {clip.label || clip.templateId || clip.id}{" "}
            @ {formatStudioTime(clip.start)}
          </button>
        );
      })}
    </div>
  );
}

export function TimelineStudio({
  config,
  status,
  activeProject,
  storyboardData,
  wordTranscripts,
  timelineDataRevision = 0,
  timelineNeedsWhisperSync,
  timelineScenesNeedRepair,
  creatorLoading,
  syncingTimings,
  getAssetUrl,
  getMusicUrl,
  getProjectUrl,
  handleAutoMapAssets,
  handleRepairProjectVisualPrompts,
  handleSaveConfig,
  handleSyncTimings,
  hideAutoMap,
  setConfig,
}: TimelineStudioProps) {
  const [studio, setStudio] = useState<TimelineStudioState | null>(null);
  const [projectResolved, setProjectResolved] = useState(true);
  const [requestedProject, setRequestedProject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [stockSearchTrigger, setStockSearchTrigger] =
    useState<StockSearchTrigger | null>(null);
  const [finalFrame, setFinalFrame] = useState<{
    loading: boolean;
    url?: string | null;
    error?: string | null;
    playhead?: number;
  }>({ loading: false, url: null, error: null });
  const [planningMotion, setPlanningMotion] = useState(false);
  const [scrollToTrackId, setScrollToTrackId] = useState<string | null>(null);
  const [previewSplitRatio, setPreviewSplitRatio] = useState(
    readPreviewSplitRatio
  );
  const workspaceSplitRef = useRef<HTMLDivElement>(null);
  const splitDragRef = useRef<{ startY: number; startRatio: number } | null>(
    null
  );
  const configRef = useRef(config);
  configRef.current = config;
  const getAssetUrlRef = useRef(getAssetUrl);
  getAssetUrlRef.current = getAssetUrl;
  const getMusicUrlRef = useRef(getMusicUrl);
  getMusicUrlRef.current = getMusicUrl;
  const getProjectUrlRef = useRef(getProjectUrl);
  getProjectUrlRef.current = getProjectUrl;
  const initialLoadDoneRef = useRef(false);
  const playheadCommitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localPlayhead, setLocalPlayhead] = useState<number | null>(null);

  const applyStudioFromServer = useCallback(
    (
      raw: TimelineStudioState,
      { focusRemotion = false }: { focusRemotion?: boolean } = {}
    ): TimelineStudioState => {
      const stripped = stripLegacyStudioOverlayClips(raw.clips || []);
      let loaded = normalizeGeoMotionClips(
        ensureMotionTrackInStudio(
          upsertMusicClipInStudio(
            stripped.removed > 0 ? { ...raw, clips: stripped.clips } : raw,
            configRef.current
          )
        )
      );
      if (stripped.removed > 0) {
        toast.success(
          `${stripped.removed} template(s) legado(s) removido(s) da timeline`
        );
      }
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
    async (opts?: {
      focusRemotion?: boolean;
      silent?: boolean;
      fullSync?: boolean;
    }) => {
      if (!activeProject) return null;
      if (!opts?.silent) setLoading(true);
      try {
        const light = !opts?.fullSync && initialLoadDoneRef.current;
        const endpoint = light
          ? "/api/timeline-studio?light=1"
          : "/api/timeline-studio";
        const res = await fetch(getProjectUrl(endpoint));
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setProjectResolved(data.projectResolved !== false);
        setRequestedProject(
          typeof data.requestedProject === "string"
            ? data.requestedProject
            : activeProject
        );
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
              "Cenas Remotion movidas para trilha própria (mapas em fullscreen)"
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
          if (data.narrationSynced) {
            toast.success("Narração e legendas sincronizadas na timeline", {
              duration: 4000,
            });
          }
          if (Number(data.legacyStripped) > 0) {
            toast.success(
              `${data.legacyStripped} template(s) legado(s) removido(s)`
            );
          }
        }
        initialLoadDoneRef.current = true;
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
        if (!opts?.silent) setLoading(false);
      }
    },
    [activeProject, applyStudioFromServer, getProjectUrl]
  );

  const loadStudioRef = useRef(loadStudio);
  loadStudioRef.current = loadStudio;

  useEffect(() => {
    initialLoadDoneRef.current = false;
    setLocalPlayhead(null);
    void loadStudioRef.current({ fullSync: true });
  }, [activeProject]);

  const prevSyncingTimingsRef = useRef(syncingTimings);
  useEffect(() => {
    if (prevSyncingTimingsRef.current && !syncingTimings) {
      void loadStudioRef.current({ fullSync: true, silent: true });
    }
    prevSyncingTimingsRef.current = syncingTimings;
  }, [syncingTimings]);

  const prevTimelineRevisionRef = useRef(timelineDataRevision);
  useEffect(() => {
    if (
      timelineDataRevision > 0 &&
      timelineDataRevision !== prevTimelineRevisionRef.current &&
      initialLoadDoneRef.current
    ) {
      void loadStudioRef.current({ fullSync: true, silent: true });
    }
    prevTimelineRevisionRef.current = timelineDataRevision;
  }, [timelineDataRevision]);

  useEffect(() => {
    return () => {
      if (playheadCommitRef.current) clearTimeout(playheadCommitRef.current);
    };
  }, []);

  useEffect(() => {
    setStudio((prev) => {
      if (!prev) return prev;
      const next = upsertMusicClipInStudio(prev, config);
      const prevMusic = prev.clips.find((c) => c.trackId === "music");
      const nextMusic = next.clips.find((c) => c.trackId === "music");
      if (
        prevMusic?.source === nextMusic?.source &&
        prevMusic?.duration === nextMusic?.duration &&
        Number(prevMusic?.props?.volume) === Number(nextMusic?.props?.volume)
      ) {
        return prev;
      }
      return next;
    });
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
      const data = await res.json();
      if (data.studio) {
        setStudio(normalizeGeoMotionClips(data.studio as TimelineStudioState));
      }
      toast.success("Timeline Studio salva");
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const persistStudioSnapshot = useCallback(
    async (nextStudio: TimelineStudioState) => {
      const synced = upsertMusicClipInStudio(nextStudio, configRef.current);
      const res = await fetch(getProjectUrl("/api/timeline-studio"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio: synced }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.studio) {
        return normalizeGeoMotionClips(data.studio as TimelineStudioState);
      }
      return nextStudio;
    },
    [getProjectUrl]
  );

  const updateStudio = (patch: Partial<TimelineStudioState>) => {
    setStudio((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handlePlayheadChange = useCallback(
    (sec: number, opts?: { playing?: boolean }) => {
      setLocalPlayhead(sec);
      if (opts?.playing) {
        if (playheadCommitRef.current) {
          clearTimeout(playheadCommitRef.current);
          playheadCommitRef.current = null;
        }
        return;
      }
      if (playheadCommitRef.current) clearTimeout(playheadCommitRef.current);
      playheadCommitRef.current = setTimeout(() => {
        setLocalPlayhead(null);
        updateStudio({ playhead: sec });
        playheadCommitRef.current = null;
      }, 120);
    },
    []
  );

  const displayStudio = useMemo(() => {
    if (!studio) return null;
    if (localPlayhead == null) return studio;
    return { ...studio, playhead: localPlayhead };
  }, [studio, localPlayhead]);

  const handleClipsChange = useCallback(
    (clips: StudioClip[]) => {
      setStudio((prev) => {
        if (!prev) return prev;
        const nextIds = new Set(clips.map((clip) => String(clip.id || "")));
        const removedRemotionClips = prev.clips.filter(
          (clip) => isRemotionStudioClip(clip) && !nextIds.has(String(clip.id))
        );
        const suppressionPatch = removedRemotionClips.reduce<
          Partial<TimelineStudioState>
        >((patch, clip) => {
          const base = applySuppressionFields(prev, patch);
          return expandDeletedClipSuppressions(
            storyboardData || {},
            base,
            clip
          );
        }, {});
        const withSuppressions = removedRemotionClips.length
          ? applySuppressionFields(prev, suppressionPatch)
          : prev;
        return {
          ...withSuppressions,
          clips,
          totalDuration: computeTotalDuration(clips, prev.totalDuration || 120),
        };
      });
    },
    [storyboardData]
  );

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
    async (
      templateId: string,
      options: { label?: string; props?: Record<string, unknown> } = {}
    ) => {
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
              props: options.props || {},
              label: options.label,
            }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const newClip = data.clip as StudioClip;
        const isShort =
          String(configRef.current.aspect_ratio || "16:9").trim() === "9:16";

        if (data.studio) {
          const loaded = normalizeGeoMotionClips(
            ensureMotionTrackInStudio(data.studio as TimelineStudioState)
          );
          setStudio({ ...loaded, playhead: newClip.start });
          setSelectedClipId(newClip.id);
          toast.success(
            isShort
              ? `Template ${templateId} substituiu a cena Remotion (1 por Short)`
              : `Template ${templateId} inserido e salvo`
          );
        } else if (isShort) {
          const withoutMotion = studio.clips.filter(
            (c) => c.trackId !== "motion"
          );
          handleClipsChange([...withoutMotion, newClip]);
          setSelectedClipId(newClip.id);
          updateStudio({ playhead: newClip.start });
          toast.success(
            `Template ${templateId} substituiu a cena Remotion (1 por Short)`
          );
        } else {
          addClipToStudio(newClip);
          toast.success(`Template ${templateId} inserido`);
        }
      } catch (err) {
        toast.error(`Template: ${(err as Error).message}`);
      }
    },
    [addClipToStudio, getProjectUrl, handleClipsChange, studio]
  );

  const handleAskActions = useCallback(
    (actions: AskLumieraAction[]) => {
      const resolveTargetClip = (act: {
        clipId?: string;
        targetTrack?: string;
      }): StudioClip | null => {
        if (!studio) return null;
        if (
          act.clipId &&
          act.clipId !== "selected" &&
          act.clipId !== "active"
        ) {
          return findClip(studio.clips, act.clipId);
        }
        const selected = selectedClipId
          ? findClip(studio.clips, selectedClipId)
          : null;
        if (
          selected &&
          (!act.targetTrack || selected.trackId === act.targetTrack)
        ) {
          return selected;
        }
        return clipActiveOnTrack(
          studio.clips,
          studio.playhead,
          act.targetTrack
        );
      };

      for (const act of actions) {
        if (act.type === "add_overlay") {
          if (act.clip && !isLegacyStudioOverlayClip(act.clip)) {
            addClipToStudio(act.clip);
          } else {
            toast.error(
              "Templates legados removidos — use Template Studio (botoes roxos)."
            );
          }
        } else if (act.type === "set_niche_pack") {
          updateStudio({ niche_pack: act.niche_pack });
          toast.success(`Pacote: ${act.niche_pack}`);
        } else if (act.type === "search_stock") {
          setStockSearchTrigger({
            query: act.query,
            mediaType: act.mediaType,
            nonce: Date.now(),
          });
        } else if (act.type === "seek_to") {
          const time = Math.max(0, Number(act.time) || 0);
          setLocalPlayhead(null);
          updateStudio({ playhead: time });
          toast.success(`Playhead: ${formatStudioTime(time)}`);
        } else if (act.type === "tighten_gaps") {
          if (!studio) continue;
          const tightened = tightenStudioTimelineClips(studio.clips);
          if (tightened.closed > 0) {
            handleClipsChange(tightened.clips);
            toast.success(`${tightened.closed} gaps fechados`);
          } else {
            toast("Sem gaps para fechar");
          }
        } else if (act.type === "set_caption_text") {
          if (!studio) continue;
          const target =
            resolveTargetClip({
              clipId: act.clipId,
              targetTrack: "captions",
            }) || activeCaptionAt(studio.clips, studio.playhead);
          if (!target) {
            toast.error("Nenhuma legenda selecionada ou ativa no playhead");
            continue;
          }
          handleClipsChange(
            updateCaptionText(studio.clips, target.id, act.text)
          );
          setSelectedClipId(target.id);
          toast.success("Legenda atualizada");
        } else if (act.type === "update_clip") {
          if (!studio) continue;
          const target = resolveTargetClip(act);
          if (!target) {
            toast.error("Nenhum clip alvo encontrado no playhead");
            continue;
          }
          const patch = numericClipPatch(act.patch);
          handleClipsChange(updateClipInList(studio.clips, target.id, patch));
          setSelectedClipId(target.id);
          if (patch.start != null) updateStudio({ playhead: patch.start });
          toast.success("Clip atualizado");
        } else if (act.type === "update_clip_props") {
          if (!studio) continue;
          const target = resolveTargetClip(act);
          if (!target) {
            toast.error("Nenhum clip alvo encontrado no playhead");
            continue;
          }
          handleClipsChange(
            updateClipInList(studio.clips, target.id, {
              props: { ...(target.props || {}), ...act.props },
            })
          );
          setSelectedClipId(target.id);
          toast.success("Propriedades atualizadas");
        } else if (act.type === "delete_clip") {
          if (!studio) continue;
          const target = resolveTargetClip(act);
          if (!target) {
            toast.error("Nenhum clip alvo encontrado no playhead");
            continue;
          }
          handleClipsChange(deleteClip(studio.clips, target.id));
          setSelectedClipId(null);
          toast.success("Clip removido");
        }
      }
    },
    [addClipToStudio, handleClipsChange, selectedClipId, studio]
  );

  const requestFinalFrame = useCallback(
    async (playhead: number) => {
      setFinalFrame({ loading: true, url: null, error: null, playhead });
      try {
        const resolution =
          configRef.current.render_resolution === "2k" ? "2k" : "1080p";
        const res = await fetch(
          getProjectUrl("/api/timeline-studio/final-frame"),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playhead, resolution }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        const url = String(data.url || "");
        setFinalFrame({
          loading: false,
          url,
          error: null,
          playhead: Number(data.playhead) || playhead,
        });
        toast.success("Frame final renderizado pelo Remotion");
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        const message = (err as Error).message || "erro desconhecido";
        setFinalFrame({
          loading: false,
          url: null,
          error: message,
          playhead,
        });
        toast.error(`Frame final: ${message}`);
      }
    },
    [getProjectUrl]
  );

  const deleteClipFromStudio = useCallback(
    async (clipId: string) => {
      if (!studio) return;
      const target = findClip(studio.clips, clipId);
      const nextClips = deleteClip(studio.clips, clipId);
      if (!target || nextClips.length === studio.clips.length) return;

      const isRemotionClip = isRemotionStudioClip(target);
      const expanded = isRemotionClip
        ? expandDeletedClipSuppressions(storyboardData || {}, studio, target)
        : null;
      if (isRemotionClip && expanded) {
        expanded.suppressedMotionSceneIds = [
          ...new Set([
            ...(expanded.suppressedMotionSceneIds || []),
            String(target.id),
          ]),
        ];
      }
      const nextStudio: TimelineStudioState = applySuppressionFields(
        {
          ...studio,
          clips: nextClips,
          totalDuration: computeTotalDuration(
            nextClips,
            studio.totalDuration || 120
          ),
        },
        expanded || {}
      );

      setStudio(nextStudio);
      setSelectedClipId(null);
      try {
        const saved = await persistStudioSnapshot(nextStudio);
        setStudio(saved);
        toast.success(
          isRemotionClip
            ? "Cena Remotion removida — não volta no F5"
            : "Clip removido"
        );
      } catch (err) {
        toast.error(
          `Falha ao salvar exclusão: ${(err as Error).message || "erro"}`
        );
      }
    },
    [persistStudioSnapshot, storyboardData, studio]
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
  const timelineSplitRatio = 100 - previewSplitRatio;

  const handlePreviewSplitMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = workspaceSplitRef.current;
      if (!container) return;
      splitDragRef.current = {
        startY: e.clientY,
        startRatio: previewSplitRatio,
      };

      const onMove = (ev: MouseEvent) => {
        const drag = splitDragRef.current;
        const host = workspaceSplitRef.current;
        if (!drag || !host) return;
        const height = host.getBoundingClientRect().height;
        if (height <= 0) return;
        const deltaPct = ((ev.clientY - drag.startY) / height) * 100;
        const next = Math.min(
          PREVIEW_SPLIT_MAX,
          Math.max(PREVIEW_SPLIT_MIN, drag.startRatio + deltaPct)
        );
        setPreviewSplitRatio(next);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        splitDragRef.current = null;
        setPreviewSplitRatio((current) => {
          try {
            localStorage.setItem(
              PREVIEW_SPLIT_STORAGE_KEY,
              String(Math.round(current))
            );
          } catch {
            /* ignore */
          }
          return current;
        });
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [previewSplitRatio]
  );

  if (!projectResolved) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-rose-100">
              Pasta do projeto não existe no disco
            </h3>
            <p className="text-[12px] text-rose-100/85 leading-relaxed">
              O nome ativo{" "}
              <span className="font-mono text-rose-200">
                {requestedProject || activeProject}
              </span>{" "}
              não corresponde a nenhuma pasta em{" "}
              <span className="font-mono">Desktop/Lumiera Videos</span>. Por
              isso a narração e a timeline abrem vazias — o backend estava
              caindo no workspace errado.
            </p>
            <p className="text-[11px] text-rose-200/80">
              Selecione o projeto correto na barra superior (ex.{" "}
              <span className="font-mono">trem_Brasil_nao</span>) ou crie a
              pasta com o botão Novo Projeto usando o mesmo nome.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
            onClick={() => void loadStudio({ fullSync: true })}
            className="text-xs text-gold-400 border border-gold-500/30 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  const remotionCounts = countRemotionTracks(studio.clips);
  const voiceClips = clipsOnTrack(studio.clips, "voice");
  const captionClips = clipsOnTrack(studio.clips, "captions");
  const voiceClip = voiceClips[0];
  const collapsedTrackIds = wordTranscripts?.length ? [] : ["captions"];
  const narrationMissingOnStudio =
    Boolean(status?.has_narration) && voiceClips.length === 0;

  return (
    <div className="space-y-2 font-sans flex flex-col min-h-0">
      {narrationMissingOnStudio && (
        <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 flex flex-wrap gap-2 items-center">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="flex-1 text-[11px] text-rose-100/90">
            Narração detectada no projeto, mas a trilha de áudio não carregou no
            Editor de Timing. Clique em Atualizar ou rode o Whisper de novo.
          </p>
          <button
            type="button"
            onClick={() => void loadStudio({ fullSync: true })}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-rose-400/40 text-rose-100 cursor-pointer"
          >
            Atualizar timeline
          </button>
        </div>
      )}

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
          subtitle={`Multi-trilha · ${isVertical ? "9:16 Short" : "16:9 Long"} · ${studio.clips.length} clips · 🎙️ ${voiceClip ? formatStudioTime(voiceClip.duration) : "sem narração"} · 📝 ${captionClips.length} legendas · 🟣 ${remotionCounts.motion} Cenas · 🟢 ${remotionCounts.overlays} Templates`}
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
                      restore_suppressed_motion: true,
                    }),
                  }
                );
                if (!orchRes.ok) throw new Error(await orchRes.text());
                const orchData = await orchRes.json();
                let loaded: TimelineStudioState | null = null;
                if (orchData.timeline_synced && orchData.studio) {
                  loaded = applyStudioFromServer(
                    orchData.studio as TimelineStudioState,
                    { focusRemotion: true }
                  );
                  setScrollToTrackId("motion");
                } else {
                  loaded = await loadStudio({
                    focusRemotion: true,
                    silent: true,
                    fullSync: true,
                  });
                  setScrollToTrackId("motion");
                }
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
                const motionClips = clipsOnTrack(loaded?.clips || [], "motion");
                const templateClips = clipsOnTrack(
                  loaded?.clips || [],
                  "overlays"
                );
                const orchestrationOk = Boolean(
                  orchData.orchestration_ok ??
                  (counts.motion + counts.overlays > 0 && qc?.ok !== false)
                );
                if (orchestrationOk) {
                  toast.success(
                    `${orchData.motion_count ?? counts.motion + counts.overlays} cena(s) · ${counts.motion} mapas/motion · ${counts.overlays} templates · QC ${qc?.score ?? "—"}/100`
                  );
                } else {
                  const reasonHint =
                    orchData.zero_motion_reason === "no_visual_prompts"
                      ? " Gere o roteiro completo antes — faltam visual_prompts."
                      : orchData.zero_motion_reason === "no_matching_triggers"
                        ? " Narração sem gatilhos (número, lugar nomeado, data) — revise os trechos por cena."
                        : orchData.zero_motion_reason === "timeline_sync_empty"
                          ? " Cenas planejadas mas não sincronizaram — clique Recarregar ou tente de novo."
                          : "";
                  toast.error(
                    `Orquestração incompleta — ${counts.motion} motion · ${counts.overlays} templates na timeline · QC ${qc?.score ?? "—"}/100.${reasonHint}`
                  );
                }
                if (counts.motion === 0 && Number(orchData.motion_count) > 0) {
                  toast(
                    "Mapa na trilha roxa estava bloqueado (clip removido antes) — restaurado ao orquestrar. Se ainda sumir, clique Recarregar.",
                    { icon: "🗺️", duration: 7000 }
                  );
                }
                if (counts.motion + counts.overlays === 0) {
                  toast(
                    "Nenhum clip na timeline — trilhas roxa «Cenas Remotion» e verde «Templates» (role para baixo na timeline)",
                    { icon: "⚠️", duration: 8000 }
                  );
                } else {
                  const hints = [
                    ...motionClips.map(
                      (c) =>
                        `🟣 ${c.label || c.templateId} @ ${formatStudioTime(c.start)}`
                    ),
                    ...templateClips.map(
                      (c) =>
                        `🟢 ${c.label || c.templateId} @ ${formatStudioTime(c.start)}`
                    ),
                  ].slice(0, 4);
                  if (hints.length) {
                    toast(hints.join(" · "), { icon: "📍", duration: 9000 });
                  }
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
            onClick={() =>
              void loadStudio({ fullSync: true, silent: Boolean(studio) })
            }
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
        ref={workspaceSplitRef}
        className="flex flex-col min-h-[calc(100vh-11rem)] flex-1 min-w-0"
      >
        <div
          className="flex flex-col gap-2 min-h-[240px] min-w-0 overflow-hidden"
          style={{ flex: previewSplitRatio }}
        >
          <RemotionQuickBar
            clips={studio.clips}
            playhead={displayStudio?.playhead ?? studio.playhead}
            onJump={(clip) => {
              setSelectedClipId(clip.id);
              setLocalPlayhead(null);
              updateStudio({ playhead: clip.start });
              setScrollToTrackId(clip.trackId);
            }}
          />

          <div
            className={`grid gap-3 flex-1 min-h-0 min-w-0 ${
              isVertical
                ? "grid-cols-1 lg:grid-cols-[minmax(170px,200px)_minmax(0,1.35fr)_minmax(170px,220px)]"
                : "grid-cols-1 lg:grid-cols-[minmax(190px,220px)_minmax(0,2fr)_minmax(190px,240px)]"
            }`}
          >
            <div className="min-h-[140px] lg:min-h-0 lg:h-full overflow-hidden">
              <StockMediaPanel
                videoClips={videoClips}
                getAssetUrl={getAssetUrl}
                getProjectUrl={getProjectUrl}
                playhead={displayStudio?.playhead ?? studio.playhead}
                stockSearchTrigger={stockSearchTrigger}
                onStockClipAdded={addClipToStudio}
              />
            </div>
            <div className="min-h-[200px] lg:min-h-0 lg:h-full overflow-hidden">
              <TimelineStudioPreview
                studio={displayStudio ?? studio}
                getAssetUrl={getAssetUrl}
                getMusicUrl={getMusicUrl}
                aspectRatio={aspectRatio}
                musicVolume={
                  Number(config.project_music_volume) > 0
                    ? Number(config.project_music_volume)
                    : 0.15
                }
                finalFrame={finalFrame}
                onRequestFinalFrame={requestFinalFrame}
                onPlayheadChange={handlePlayheadChange}
              />
            </div>
            <div className="min-h-[140px] lg:min-h-0 lg:h-full overflow-hidden">
              <AskLumieraPanel
                playhead={displayStudio?.playhead ?? studio.playhead}
                nichePack={studio.niche_pack}
                catalogNiche={String(
                  config.motion_template_pack?.niche || config.niche || ""
                )}
                aspectRatio={aspectRatio}
                getProjectUrl={getProjectUrl}
                onActions={handleAskActions}
                onInsertTemplate={(id, options) =>
                  void insertTemplate(id, options)
                }
                onSelectPack={(packId) => updateStudio({ niche_pack: packId })}
              />
            </div>
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="horizontal"
          aria-valuenow={Math.round(previewSplitRatio)}
          aria-valuemin={PREVIEW_SPLIT_MIN}
          aria-valuemax={PREVIEW_SPLIT_MAX}
          title="Arraste para redimensionar preview e timeline"
          className="h-2 shrink-0 cursor-row-resize flex items-center justify-center border-y border-zinc-800/80 bg-zinc-900/70 hover:bg-violet-500/10 transition group"
          onMouseDown={handlePreviewSplitMouseDown}
        >
          <div className="w-12 h-0.5 rounded-full bg-zinc-600 group-hover:bg-violet-400/70" />
        </div>

        <div
          className="flex flex-col min-h-[140px] min-w-0 overflow-hidden rounded-t-2xl border-t-2 border-violet-500/35 bg-zinc-950/50"
          style={{ flex: timelineSplitRatio }}
        >
          <div className="px-1 pt-1 pb-0.5 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-300/90">
              Timeline · arraste a barra acima para ajustar o preview
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              🎙️ {voiceClip ? "1" : "0"} · 📝 {captionClips.length} · 🟣{" "}
              {remotionCounts.motion} · 🟢 {remotionCounts.overlays}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TimelineStudioTracks
              studio={displayStudio ?? studio}
              selectedClipId={selectedClipId}
              scrollToTrackId={scrollToTrackId}
              collapsedTrackIds={collapsedTrackIds}
              onScrollToTrackDone={() => setScrollToTrackId(null)}
              onSelectClip={setSelectedClipId}
              onPlayheadChange={handlePlayheadChange}
              onZoomChange={(zoom) => updateStudio({ zoom })}
              onClipsChange={handleClipsChange}
            />
          </div>
        </div>
      </div>

      {selectedClip ? (
        <TimelineStudioClipInspector
          clip={selectedClip}
          track={selectedTrack}
          onClose={() => setSelectedClipId(null)}
          getProjectUrl={getProjectUrl}
          getAssetUrl={getAssetUrl}
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
