import toast from "react-hot-toast";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  updateCaptionText,
  updateClipInList,
} from "./timelineStudioClipOps";
import {
  clipsOnTrack,
  type StudioClip,
  type TimelineStudioState,
} from "./timelineStudioTypes";
import type { RichTimelineEditorProps } from "./RichTimelineEditor";
import type {
  AskLumieraAction,
  StockSearchTrigger,
} from "./timelineStudioAskTypes";

export type TimelineStudioProps = RichTimelineEditorProps;

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

  const loadStudio = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(getProjectUrl("/api/timeline-studio"));
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStudio(data.studio as TimelineStudioState);
      if (data.migrated) {
        toast.success("Timeline Studio: projeto migrado para multi-trilha");
      }
    } catch (err) {
      toast.error(`Erro ao carregar timeline: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [activeProject, getProjectUrl]);

  useEffect(() => {
    void loadStudio();
  }, [loadStudio]);

  const saveStudio = async () => {
    if (!studio) return;
    setSaving(true);
    try {
      const res = await fetch(getProjectUrl("/api/timeline-studio"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Timeline Studio salva");
    } catch (err) {
      toast.error(`Erro ao salvar: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

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
      const next = deleteClip(studio.clips, selectedClipId);
      if (next.length === studio.clips.length) return;
      handleClipsChange(next);
      setSelectedClipId(null);
      toast.success("Clip removido");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClipsChange, selectedClipId, studio]);

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
        className={`grid gap-3 min-h-[320px] ${
          isVertical
            ? "grid-cols-1 lg:grid-cols-[220px_1fr_240px]"
            : "grid-cols-1 lg:grid-cols-[240px_1fr_260px]"
        }`}
        style={{ minHeight: isVertical ? 360 : 400 }}
      >
        <div className="min-h-[200px] lg:min-h-0 lg:h-[min(52vh,480px)]">
          <StockMediaPanel
            videoClips={videoClips}
            getAssetUrl={getAssetUrl}
            getProjectUrl={getProjectUrl}
            playhead={studio.playhead}
            stockSearchTrigger={stockSearchTrigger}
            onStockClipAdded={addClipToStudio}
          />
        </div>
        <div className="min-h-[220px] lg:min-h-0 lg:h-[min(52vh,480px)]">
          <TimelineStudioPreview
            studio={studio}
            getAssetUrl={getAssetUrl}
            getMusicUrl={getMusicUrl}
            aspectRatio={aspectRatio}
            onPlayheadChange={(sec) => updateStudio({ playhead: sec })}
          />
        </div>
        <div className="min-h-[200px] lg:min-h-0 lg:h-[min(52vh,480px)]">
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
            handleClipsChange(deleteClip(studio.clips, selectedClip.id));
            setSelectedClipId(null);
            toast.success("Clip removido");
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
