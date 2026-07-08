import toast from "react-hot-toast";
import React, { Suspense, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { SettingHelpTip } from "./SettingHelpTip";
import { EditorCollapsibleSection } from "./EditorCollapsibleSection";
import { TimelineOpenCutBar } from "./TimelineOpenCutBar";
import { TimelineClipPreview } from "./TimelineClipPreview";
import { TimelineClipOpenCutControls } from "./TimelineClipOpenCutControls";
import { BlockProgressBarProjectPanel } from "./BlockProgressBarProjectPanel";
import { clipKey } from "./opencutTimeline";
import { LazyMotionTimelineEditor, TabPanelFallback } from "./appLazyPanels";
import type { ConfigData, WorkspaceStatus } from "./appTypes";
import type { AppTab } from "./appTabs";

type AssetValidationIssue = {
  block?: string;
  index?: number;
  asset: string;
  reason: string;
  detail?: string;
  expectedUrl?: string;
};

type AssetValidationReport = {
  ok: boolean;
  project: string;
  checked: number;
  found: number;
  missing: number;
  issues: AssetValidationIssue[];
};

function formatTime(sec: number): string {
  if (sec === undefined || Number.isNaN(sec)) return "0:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export type RichTimelineEditorProps = {
  hideAutoMap?: boolean;
  wizardManualMode?: boolean;
  config: ConfigData;
  status: WorkspaceStatus | null;
  activeProject: string;
  selectedProject: string;
  storyboardData: any;
  wordTranscripts: any[];
  timelineDataRevision?: number;
  timelineNeedsWhisperSync: boolean;
  timelineScenesNeedRepair: boolean;
  timelineOpenBlocks: Record<number, boolean>;
  timelinePreviewZoom: number;
  timelineSelectedClips: Set<string>;
  videoFileDurations: Record<string, number>;
  visualBlockTimings: any;
  progressBarChaptersText: string;
  progressBarMetadataReady: boolean;
  savingBlockProgressBar: boolean;
  logoStatus: any;
  creatorLoading: boolean;
  syncingTimings: boolean;
  generatingOverlays: boolean;
  playingMusic: string | null;
  playingNarration: string | number | null;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setTimelineOpenBlocks: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  setTimelinePreviewZoom: (v: number) => void;
  setTimelineSelectedClips: React.Dispatch<React.SetStateAction<Set<string>>>;
  setVideoFileDurations: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  setWordTranscripts: React.Dispatch<React.SetStateAction<any[]>>;
  setActiveTab: (tab: AppTab) => void;
  setSavingBlockProgressBar: (v: boolean) => void;
  getAssetDuration: (blockKey: string, idx: number) => number;
  getAssetNarration: (blockKey: string, assetIdx: number) => string;
  getDynamicAssetWords: (blockKey: string, assetIdx: number) => any;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl: (fileName: string, projectOverride?: string) => string;
  getProjectUrl: (path: string) => string;
  handleAutoMapAssets: () => void | Promise<void>;
  handlePlanMotionScenes: () => void | Promise<void>;
  handleRepairProjectVisualPrompts: () => void | Promise<void>;
  handleSaveConfig: () => void | Promise<void>;
  handleSyncTimings: (fromWizard?: boolean) => void | Promise<void>;
  handleUploadSceneAsset: (
    blockNum: number,
    type: string,
    file: File,
    assetIdx: number,
    projectOverride?: string
  ) => void | Promise<void>;
  alignAllBlocksToSpeech: () => void;
  alignBlockAssetsToSpeech: (blockKey: string) => void;
  addTimelineAsset: (blockKey: string) => void;
  deleteTimelineAsset: (blockKey: string, idx: number) => void;
  moveTimelineAsset: (
    blockKey: string,
    idx: number,
    dir: "up" | "down"
  ) => void;
  updateTimelineAssetField: (
    blockKey: string,
    idx: number,
    field: string,
    value: any
  ) => void;
  bulkDeleteTimelineClips: () => void;
  toggleTimelineClipSelection: (
    blockKey: string,
    idx: number,
    additive: boolean
  ) => void;
  togglePlayMusic: (nameOrUrl: string) => void;
  togglePlaySceneNarration: (blockKey: string, idx: number) => void;
  saveConfigPatch: (
    patch: Partial<ConfigData>,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<boolean | ConfigData | null>;
  syncCreatorStoryboard: (data: any) => void;
  fetchData: () => void | Promise<void>;
  fetchStatus: () => void | Promise<void>;
  suggestBlockProgressIcons: () => any;
  syncBlockProgressTitles: () => any;
};

export function RichTimelineEditor({
  hideAutoMap,
  wizardManualMode,
  config,
  status,
  activeProject,
  selectedProject,
  storyboardData,
  wordTranscripts,
  timelineNeedsWhisperSync,
  timelineScenesNeedRepair,
  timelineOpenBlocks,
  timelinePreviewZoom,
  timelineSelectedClips,
  videoFileDurations,
  visualBlockTimings,
  progressBarChaptersText,
  progressBarMetadataReady,
  savingBlockProgressBar,
  logoStatus,
  creatorLoading,
  syncingTimings,
  generatingOverlays,
  playingMusic,
  playingNarration,
  setConfig,
  setTimelineOpenBlocks,
  setTimelinePreviewZoom,
  setTimelineSelectedClips,
  setVideoFileDurations,
  setWordTranscripts,
  setActiveTab,
  setSavingBlockProgressBar,
  getAssetDuration,
  getAssetNarration,
  getDynamicAssetWords,
  getAssetUrl,
  getMusicUrl,
  getProjectUrl,
  handleAutoMapAssets,
  handlePlanMotionScenes,
  handleRepairProjectVisualPrompts,
  handleSaveConfig,
  handleSyncTimings,
  handleUploadSceneAsset,
  alignAllBlocksToSpeech,
  alignBlockAssetsToSpeech,
  addTimelineAsset,
  deleteTimelineAsset,
  moveTimelineAsset,
  updateTimelineAssetField,
  bulkDeleteTimelineClips,
  toggleTimelineClipSelection,
  togglePlayMusic,
  togglePlaySceneNarration,
  saveConfigPatch,
  syncCreatorStoryboard,
  fetchData,
  fetchStatus,
  suggestBlockProgressIcons,
  syncBlockProgressTitles,
}: RichTimelineEditorProps) {
  const [assetValidation, setAssetValidation] =
    useState<AssetValidationReport | null>(null);
  const [validatingAssets, setValidatingAssets] = useState(false);
  const timelineBlockCount = config.block_phrases
    ? config.block_phrases.length
    : status?.block_timings?.durations?.length || 12;

  const validateProjectAssets = async () => {
    if (!activeProject.trim()) {
      toast.error("Selecione um projeto antes de verificar assets.");
      return;
    }
    setValidatingAssets(true);
    try {
      const res = await fetch(getProjectUrl("/api/assets/validate"));
      const data = (await res.json().catch(() => null)) as
        AssetValidationReport | { error?: string } | null;
      if (!res.ok || !data) {
        throw new Error(
          (data as { error?: string } | null)?.error ||
            "Falha ao verificar assets."
        );
      }
      setAssetValidation(data as AssetValidationReport);
      if ((data as AssetValidationReport).ok) {
        toast.success("Todos os assets da timeline existem no projeto ativo.");
      } else {
        toast.error(
          `${(data as AssetValidationReport).missing} asset(s) com problema no projeto ativo.`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao verificar assets."
      );
    } finally {
      setValidatingAssets(false);
    }
  };

  return (
    <div className="space-y-3">
      {wizardManualMode && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-[11px] text-sky-100/90 leading-relaxed">
          <p className="font-bold text-sky-200 mb-1">
            Montagem manual de B-roll (wizard)
          </p>
          <p>
            Os segundos de cada slot já vêm do Whisper (passo 3). Arraste ou
            escolha os arquivos em cada cena, ajuste se precisar e confirme com{" "}
            <strong className="text-sky-100">Salvar Linha do Tempo</strong>. A
            distribuição automática por IA fica só no{" "}
            <strong className="text-sky-100">Workflow → Automação</strong>.
          </p>
        </div>
      )}

      {(timelineNeedsWhisperSync || timelineScenesNeedRepair) && (
        <EditorCollapsibleSection title="Alertas da timeline" defaultOpen>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-3 font-sans">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 text-[11px] text-amber-100/90 leading-relaxed">
                <p className="font-bold text-amber-200">
                  Narração TTS ≠ texto em todos os blocos automaticamente
                </p>
                <p>
                  O TTS só grava o MP3. Para ver{" "}
                  <strong className="font-semibold text-amber-100">
                    Narração Dinâmica
                  </strong>{" "}
                  (timestamps verdes e play por cena), rode a sincronização
                  Whisper. O texto por asset vem do{" "}
                  <code className="text-amber-200/90">storyboard.json</code> —
                  se o wizard foi interrompido (F5), algumas cenas podem estar
                  vazias.
                </p>
                {timelineNeedsWhisperSync && (
                  <p className="text-amber-300/80">
                    Áudio detectado, mas faltam transcrição/timings — use{" "}
                    <strong>Workflow → Sincronizar timings</strong> ou o botão
                    abaixo.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {timelineNeedsWhisperSync && (
                <button
                  type="button"
                  onClick={() => handleSyncTimings()}
                  disabled={syncingTimings}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gold-500/40 bg-gold-500/15 hover:bg-gold-500/25 text-gold-200 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {syncingTimings ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  Sincronizar Whisper agora
                </button>
              )}
              {timelineScenesNeedRepair && (
                <button
                  type="button"
                  disabled={creatorLoading}
                  onClick={handleRepairProjectVisualPrompts}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {creatorLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Bot className="w-3 h-3" />
                  )}
                  Reparar cenas do roteiro (IA)
                </button>
              )}
            </div>
          </div>
        </EditorCollapsibleSection>
      )}

      <div className="sticky top-2 z-20 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-zinc-950/90 backdrop-blur-sm p-3 border border-zinc-900 rounded-2xl gap-3 shadow-lg shadow-black/20">
        <div className="flex-1 min-w-[280px]">
          <SectionHeader
            title="Arquivos de Mídia por Bloco"
            helpId="timeline-media-blocks"
            size="sm"
            titleClassName="tracking-wider uppercase text-xs"
            subtitle="Adicione, ordene, exclua e configure mídias que constituem o vídeo em cada bloco."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto lg:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Formato:
            </span>

            <select
              value={config.aspect_ratio || "16:9"}

              onChange={(e) => {
                const newRatio = e.target.value as "16:9" | "9:16";

                setConfig({ ...config, aspect_ratio: newRatio });
              }}

              className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-gold-500 cursor-pointer"
            >
              <option value="16:9">16:9 (Horizontal)</option>

              <option value="9:16">9:16 (Vertical)</option>
            </select>
          </div>

          {!hideAutoMap && (
            <button
              disabled={creatorLoading}
              onClick={handleAutoMapAssets}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-gold-500 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
              title="Mapear arquivos locais na pasta ASSETS para as cenas automaticamente com Inteligência Artificial"
            >
              {creatorLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-gold-500" />
              )}
              <span>Associar Mídias com IA</span>
            </button>
          )}

          <button
            onClick={() => handleSaveConfig()}

            className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" /> Salvar Linha do Tempo
          </button>

          {status?.has_narration && (
            <button
              onClick={() => alignAllBlocksToSpeech()}

              disabled={!wordTranscripts?.length}

              className="bg-emerald-950 border border-emerald-900/50 hover:bg-emerald-900 hover:border-emerald-800 text-emerald-400 disabled:opacity-40 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"

              title={
                wordTranscripts?.length
                  ? "Sincronizar TODOS os blocos com o tempo da voz"
                  : "Rode Sincronizar Whisper antes (Workflow)"
              }
            >
              <Sparkles className="w-3.5 h-3.5" /> Sincronizar Todos com a Voz
            </button>
          )}
        </div>
      </div>

      <EditorCollapsibleSection
        title="Ferramentas OpenCut"
        subtitle="zoom, fundo, seleção em lote"
        defaultOpen
      >
        <TimelineOpenCutBar
          previewZoom={timelinePreviewZoom}
          onPreviewZoomChange={setTimelinePreviewZoom}
          canvasBackground={config.canvas_background || "#050506"}
          onCanvasBackgroundChange={(color) => {
            const updated = { ...config, canvas_background: color };
            setConfig(updated);
            void saveConfigPatch(
              { canvas_background: color },
              { skipRefresh: true }
            );
          }}
          selectedCount={timelineSelectedClips.size}
          onBulkDelete={bulkDeleteTimelineClips}
          onClearSelection={() => setTimelineSelectedClips(new Set())}
          getProjectUrl={getProjectUrl}
          onTranscriptImported={async () => {
            try {
              const transRes = await fetch(
                getMusicUrl("word_transcripts.json")
              );
              if (transRes.ok) setWordTranscripts(await transRes.json());
            } catch {
              /* ignore */
            }
            fetchStatus();
          }}
          toast={(msg) => toast(msg)}
        />
      </EditorCollapsibleSection>

      {storyboardData && (
        <EditorCollapsibleSection
          title="Templates Remotion"
          subtitle="motion graphics por bloco"
        >
          <Suspense
            fallback={<TabPanelFallback label="Carregando templates..." />}
          >
            <LazyMotionTimelineEditor
              storyboard={storyboardData}
              blockTimings={status?.block_timings}
              timelineAssets={config.timeline_assets}
              aspectRatio={config.aspect_ratio || "16:9"}
              getAssetUrl={getAssetUrl}
              generating={generatingOverlays}
              onGenerate={handlePlanMotionScenes}
              onChange={(nextScenes) => {
                const { motion_scenes: _prev, ...rest } = storyboardData || {};
                syncCreatorStoryboard({ ...rest, motion_scenes: nextScenes });
              }}
            />
          </Suspense>
        </EditorCollapsibleSection>
      )}

      <EditorCollapsibleSection
        title="Barra de progresso"
        subtitle="ícones e capítulos por bloco"
        badge={progressBarMetadataReady ? "pronto" : "metadados"}
      >
        <BlockProgressBarProjectPanel
          projectKey={activeProject}
          config={(config || {}) as Record<string, unknown>}
          storyboard={storyboardData}
          blockTimings={visualBlockTimings}
          chaptersText={progressBarChaptersText}
          metadataReady={progressBarMetadataReady}
          isShortFormat={(config?.aspect_ratio || "16:9") === "9:16"}
          accentColor={config?.accent_color || "#D4AF37"}
          saving={savingBlockProgressBar}
          channelLogoUrl={logoStatus?.currentLogoUrl || null}
          onGoToMetadata={() => setActiveTab("ai")}
          onSuggestIconsWithAi={suggestBlockProgressIcons}
          onSyncTitlesFromChapters={syncBlockProgressTitles}
          onSave={async (barDraft) => {
            setSavingBlockProgressBar(true);
            try {
              const saved = await saveConfigPatch(
                { block_progress_bar: barDraft },
                { skipRefresh: true }
              );
              if (!saved) return;
              setConfig((prev) => ({
                ...(prev || {}),
                block_progress_bar: barDraft,
              }));
              toast.success("Barra de progresso salva neste projeto.");
            } finally {
              setSavingBlockProgressBar(false);
            }
          }}
        />
      </EditorCollapsibleSection>

      <EditorCollapsibleSection
        title="Mídia por bloco"
        subtitle="arraste assets em cada bloco do roteiro"
        badge={timelineBlockCount}
        defaultOpen
      >
        <div className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-zinc-200">
                Validador de assets do projeto ativo
              </p>
              <p className="text-[10px] text-zinc-500">
                Confere somente arquivos dentro de {activeProject || "projeto"}.
              </p>
            </div>
            <button
              type="button"
              onClick={validateProjectAssets}
              disabled={validatingAssets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-[10px] font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${validatingAssets ? "animate-spin" : ""}`}
              />
              {validatingAssets ? "Verificando..." : "Verificar assets"}
            </button>
          </div>

          {assetValidation ? (
            <div
              className={`rounded-lg border p-2 text-[10px] ${
                assetValidation.ok
                  ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-100"
                  : "border-amber-500/25 bg-amber-500/5 text-amber-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 font-mono">
                <span>checked: {assetValidation.checked}</span>
                <span>found: {assetValidation.found}</span>
                <span>missing: {assetValidation.missing}</span>
              </div>
              {!assetValidation.ok ? (
                <div className="mt-2 max-h-40 overflow-auto space-y-1 pr-1">
                  {assetValidation.issues.slice(0, 20).map((issue, idx) => (
                    <div
                      key={`${issue.asset}-${idx}`}
                      className="rounded border border-amber-500/15 bg-black/20 px-2 py-1"
                    >
                      <div className="font-mono text-amber-200 break-all">
                        {issue.asset}
                      </div>
                      <div className="text-amber-100/80">
                        {issue.block ? `Bloco ${issue.block}` : "Timeline"}{" "}
                        {issue.index !== undefined ? `#${issue.index + 1}` : ""}{" "}
                        - {issue.reason}
                      </div>
                      {issue.detail ? (
                        <div className="text-amber-100/60 break-all">
                          {issue.detail}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="timeline-block-nav">
          {Array.from({ length: timelineBlockCount }, (_, i) => i + 1).map(
            (blockNum) => (
              <button
                key={`nav-${blockNum}`}
                type="button"
                className={`timeline-block-pill ${
                  timelineOpenBlocks[blockNum]
                    ? "timeline-block-pill--active"
                    : "timeline-block-pill--idle"
                }`}
                onClick={() => {
                  setTimelineOpenBlocks((prev) => ({
                    ...prev,
                    [blockNum]: true,
                  }));
                  document
                    .getElementById(`timeline-block-${blockNum}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                B{blockNum}
              </button>
            )
          )}
          <button
            type="button"
            className="timeline-block-pill timeline-block-pill--idle text-[8px] uppercase tracking-wide"
            onClick={() => {
              const all: Record<number, boolean> = {};
              for (let i = 1; i <= timelineBlockCount; i += 1) all[i] = true;
              setTimelineOpenBlocks(all);
            }}
          >
            Expandir
          </button>
          <button
            type="button"
            className="timeline-block-pill timeline-block-pill--idle text-[8px] uppercase tracking-wide"
            onClick={() => setTimelineOpenBlocks({})}
          >
            Recolher
          </button>
        </div>

        <div className="space-y-2">
          {(() => {
            const maxBlocks = timelineBlockCount;

            const blockNums = Array.from(
              { length: maxBlocks },
              (_, i) => i + 1
            );

            return blockNums.map((blockNum) => {
              const blockKey = String(blockNum);

              const blockNarrationDur =
                (status?.block_timings?.durations &&
                  status.block_timings.durations[blockNum - 1]) ||
                10.0;

              const blockAssets = config.timeline_assets?.[blockKey] || [];

              const actualBlockTotal = blockAssets.reduce(
                (_sum: number, _: any, i: number) =>
                  _sum + getAssetDuration(blockKey, i),
                0
              );

              const durationOk =
                Math.abs(actualBlockTotal - blockNarrationDur) < 0.3;

              return (
                <details
                  key={blockKey}
                  id={`timeline-block-${blockNum}`}
                  className="lumiera-collapsible-section glass-panel rounded-2xl scroll-mt-24"
                  open={timelineOpenBlocks[blockNum] || undefined}
                  onToggle={(e) => {
                    const open = (e.currentTarget as HTMLDetailsElement).open;
                    setTimelineOpenBlocks((prev) => ({
                      ...prev,
                      [blockNum]: open,
                    }));
                  }}
                >
                  <summary>
                    <span className="flex items-center gap-2 min-w-0 normal-case tracking-normal font-semibold text-[11px]">
                      <span className="text-gold-500">Bloco {blockKey}</span>
                      <span className="text-zinc-500 font-mono text-[9px]">
                        {blockAssets.length} asset
                        {blockAssets.length === 1 ? "" : "s"} ·{" "}
                        {actualBlockTotal.toFixed(1)}s
                        <span
                          className={`ml-1 ${durationOk ? "text-emerald-500" : "text-amber-500"}`}
                        >
                          / narração {blockNarrationDur.toFixed(1)}s
                        </span>
                      </span>
                    </span>
                  </summary>

                  <div className="lumiera-collapsible-body space-y-4">
                    <div className="flex flex-wrap items-center justify-end gap-2 pb-1 border-b border-zinc-900/60">
                      {/* Audio Upload for this block */}

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          BGM:
                        </span>

                        {(() => {
                          const mappedFile = config?.bgm_mappings?.find(
                            (m: any) => m.block === blockNum
                          )?.file;

                          return mappedFile ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="text-[10px] text-gold-400 font-mono max-w-[100px] truncate"
                                title={mappedFile}
                              >
                                🎵 {mappedFile}
                              </span>

                              <button
                                onClick={() => togglePlayMusic(mappedFile)}

                                className="text-gold-500 hover:text-gold-400 hover:bg-zinc-900 p-0.5 rounded cursor-pointer shrink-0 transition"

                                title="Ouvir trilha"
                              >
                                {playingMusic === mappedFile ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 text-gold-500" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-650 italic">
                              Padrão
                            </span>
                          );
                        })()}

                        <input
                          type="file"
                          accept="audio/mpeg,audio/mp3,audio/wav"
                          className="hidden"
                          id={`bgm-upload-${blockKey}`}

                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];

                              try {
                                const res = await fetch(
                                  getProjectUrl(
                                    `/api/upload-bgm?block=${blockKey}&filename=${encodeURIComponent(file.name)}`
                                  ),
                                  {
                                    method: "POST",

                                    headers: {
                                      "Content-Type": file.type || "audio/mpeg",
                                    },

                                    body: file,
                                  }
                                );

                                if (res.ok) {
                                  toast.success(
                                    `Trilha do Bloco ${blockKey} atualizada!`
                                  );

                                  fetchData();
                                } else {
                                  toast.error("Erro ao enviar trilha sonora.");
                                }
                              } catch (err) {
                                toast.error("Falha de conexão.");
                              }
                            }
                          }}
                        />

                        <label
                          htmlFor={`bgm-upload-${blockKey}`}
                          className="bg-zinc-900 border border-zinc-800 text-white text-[10px] px-3 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 transition"
                        >
                          <Upload className="w-3 h-3" /> Upload Trilha
                        </label>
                      </div>

                      {/* Speech sync button */}

                      {status?.has_narration && (
                        <button
                          onClick={() => alignBlockAssetsToSpeech(blockKey)}

                          className="bg-emerald-950 border border-emerald-900/50 hover:bg-emerald-900 hover:border-emerald-800 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"

                          title="Sincronizar a duração das imagens com a fala da narração"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Sincronizar com a
                          Voz
                        </button>
                      )}

                      {/* Add asset button */}

                      <button
                        onClick={() => addTimelineAsset(blockKey)}

                        className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Asset
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(config.timeline_assets?.[blockKey] || []).map(
                        (asset: any, idx: number) => {
                          const selKey = clipKey(blockKey, idx);
                          const isSelected = timelineSelectedClips.has(selKey);
                          return (
                            <div
                              key={idx}
                              onClick={(e) => {
                                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                                  e.preventDefault();
                                  toggleTimelineClipSelection(
                                    blockKey,
                                    idx,
                                    true
                                  );
                                }
                              }}
                              className={`bg-zinc-950 border p-4 rounded-xl flex flex-col justify-between space-y-3 transition ${
                                isSelected
                                  ? "border-sky-500/50 ring-1 ring-sky-500/20"
                                  : "border-zinc-900 hover:border-zinc-855"
                              }`}
                            >
                              <label className="flex items-center gap-2 text-[9px] text-zinc-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleTimelineClipSelection(
                                      blockKey,
                                      idx,
                                      false
                                    )
                                  }
                                  className="rounded border-zinc-700"
                                />
                                Selecionar
                                <SettingHelpTip
                                  title="Multi-seleção"
                                  align="start"
                                >
                                  Marque vários clips para excluir em lote na
                                  barra OpenCut. Shift+clique ou Ctrl/Cmd+clique
                                  no card também adiciona à seleção.
                                </SettingHelpTip>
                              </label>

                              <TimelineClipPreview
                                asset={asset}
                                getAssetUrl={getAssetUrl}
                                aspectRatio={config.aspect_ratio}
                                previewZoom={timelinePreviewZoom}
                                canvasBackground={
                                  config.canvas_background || "#050506"
                                }
                                clipDuration={getAssetDuration(blockKey, idx)}
                                sourceDuration={videoFileDurations[asset.asset]}
                                onSourceDuration={(path, dur) => {
                                  setVideoFileDurations((prev) =>
                                    prev[path] === dur
                                      ? prev
                                      : { ...prev, [path]: dur }
                                  );
                                }}
                              />

                              {/* Dynamic narration - words redistribute based on asset duration */}

                              {(() => {
                                const dynamicResult = getDynamicAssetWords(
                                  blockKey,
                                  idx
                                );

                                const staticNarration = getAssetNarration(
                                  blockKey,
                                  idx
                                );

                                if (!dynamicResult && !staticNarration)
                                  return null;

                                const actualDuration = getAssetDuration(
                                  blockKey,
                                  idx
                                );

                                const scenePlayKey = `scene-${blockKey}-${idx}`;

                                const isPlaying =
                                  playingNarration === scenePlayKey;

                                // Use dynamic words if available

                                const displayWords = dynamicResult
                                  ? dynamicResult.words
                                  : [];

                                const hasDynamic =
                                  dynamicResult !== null &&
                                  dynamicResult.totalBlockWords > 0;

                                // Coverage info for the whole block (show only on last asset)

                                const totalAssets =
                                  config?.timeline_assets?.[blockKey]?.length ||
                                  0;

                                const isLastAsset = idx === totalAssets - 1;

                                const coveragePercent = dynamicResult
                                  ? Math.round(
                                      (dynamicResult.coveredWords /
                                        dynamicResult.totalBlockWords) *
                                        100
                                    )
                                  : 0;

                                const allWordsCovered = dynamicResult
                                  ? dynamicResult.coveredWords >=
                                    dynamicResult.totalBlockWords
                                  : false;

                                return (
                                  <div
                                    className={`bg-zinc-900/50 p-2.5 rounded-lg border ${
                                      hasDynamic && displayWords.length > 0
                                        ? "border-emerald-900/30"
                                        : hasDynamic &&
                                            displayWords.length === 0
                                          ? "border-zinc-900/30"
                                          : "border-zinc-850/50"
                                    } flex flex-col gap-1.5 select-text`}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <Bot className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />

                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">
                                            {hasDynamic
                                              ? "Narração Dinâmica"
                                              : "Narração Recomendada"}
                                          </span>

                                          {status?.has_narration &&
                                            dynamicResult && (
                                              <div className="flex items-center gap-1.5 font-mono text-[9px] text-zinc-400">
                                                <span
                                                  className="text-emerald-400 font-bold"
                                                  title="Janela de tempo deste asset na narração"
                                                >
                                                  🟢{" "}
                                                  {formatTime(
                                                    dynamicResult.assetAudioStart
                                                  )}{" "}
                                                  -{" "}
                                                  {formatTime(
                                                    dynamicResult.assetAudioEnd
                                                  )}{" "}
                                                  ({actualDuration.toFixed(1)}s)
                                                </span>

                                                <span className="text-zinc-600 text-[8px]">
                                                  {displayWords.length} palavras
                                                </span>

                                                <button
                                                  onClick={() =>
                                                    togglePlaySceneNarration(
                                                      blockKey,
                                                      idx
                                                    )
                                                  }

                                                  className={`p-0.5 rounded cursor-pointer transition shrink-0 ${
                                                    isPlaying
                                                      ? "bg-gold-500 text-zinc-950 hover:bg-gold-600 animate-pulse"
                                                      : "bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-gold-500"
                                                  }`}

                                                  title={
                                                    isPlaying
                                                      ? "Pausar"
                                                      : "Ouvir este trecho"
                                                  }
                                                >
                                                  {isPlaying ? (
                                                    <Pause className="w-2.5 h-2.5" />
                                                  ) : (
                                                    <Play className="w-2.5 h-2.5 text-gold-500" />
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                        </div>

                                        <p
                                          className="text-[10px] italic leading-relaxed select-text flex flex-wrap"
                                          title={
                                            displayWords.length > 0
                                              ? dynamicResult?.text
                                              : staticNarration
                                          }
                                        >
                                          <span className="text-zinc-500 mr-1">
                                            "
                                          </span>

                                          {hasDynamic &&
                                          displayWords.length > 0 ? (
                                            displayWords.map(
                                              (part: any, pIdx: number) => (
                                                <span
                                                  key={pIdx}

                                                  className="text-zinc-100 font-medium mr-1"

                                                  title={`Fala em ${formatTime(part.start)}`}
                                                >
                                                  {part.word}
                                                </span>
                                              )
                                            )
                                          ) : staticNarration ? (
                                            <span className="text-zinc-300">
                                              {staticNarration}
                                            </span>
                                          ) : hasDynamic &&
                                            displayWords.length === 0 ? (
                                            <span className="text-zinc-600 italic text-[9px]">
                                              (sem palavras nesta janela de
                                              tempo — ajuste a duração dos
                                              assets anteriores)
                                            </span>
                                          ) : (
                                            <span className="text-zinc-300">
                                              {staticNarration}
                                            </span>
                                          )}

                                          <span className="text-zinc-500">
                                            "
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* Coverage indicator on last asset of block */}

                                    {isLastAsset && hasDynamic && (
                                      <div className="flex items-center gap-2 mt-1 pl-6">
                                        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                              allWordsCovered
                                                ? "bg-emerald-500"
                                                : coveragePercent >= 80
                                                  ? "bg-amber-500"
                                                  : "bg-red-500"
                                            }`}

                                            style={{
                                              width: `${Math.min(coveragePercent, 100)}%`,
                                            }}
                                          />
                                        </div>

                                        <span
                                          className={`text-[8px] font-mono font-bold ${
                                            allWordsCovered
                                              ? "text-emerald-400"
                                              : coveragePercent >= 80
                                                ? "text-amber-400"
                                                : "text-red-400"
                                          }`}
                                        >
                                          {allWordsCovered
                                            ? `✅ ${dynamicResult!.totalBlockWords} palavras cobertas`
                                            : `⚠️ ${dynamicResult!.coveredWords}/${dynamicResult!.totalBlockWords} palavras (${coveragePercent}%) — aumente a duração dos assets`}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Asset info */}

                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <span>Asset #{idx + 1}</span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      disabled={idx === 0}

                                      onClick={() =>
                                        moveTimelineAsset(blockKey, idx, "up")
                                      }

                                      className="hover:text-white disabled:opacity-30 p-0.5 rounded cursor-pointer"

                                      title="Subir"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      disabled={
                                        idx ===
                                        (
                                          config.timeline_assets?.[blockKey] ||
                                          []
                                        ).length -
                                          1
                                      }

                                      onClick={() =>
                                        moveTimelineAsset(blockKey, idx, "down")
                                      }

                                      className="hover:text-white disabled:opacity-30 p-0.5 rounded cursor-pointer"

                                      title="Descer"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <input
                                  type="text"

                                  value={asset.asset}

                                  onChange={(e) =>
                                    updateTimelineAssetField(
                                      blockKey,
                                      idx,
                                      "asset",
                                      e.target.value
                                    )
                                  }

                                  placeholder="Nome do arquivo..."

                                  className="w-full bg-zinc-900 border border-zinc-850 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg px-2.5 py-1 text-xs text-white"
                                />
                              </div>

                              {/* Type and fixed duration */}

                              <div className="flex justify-between items-center gap-2">
                                <div className="space-y-0.5 flex-1">
                                  <span className="text-[9px] text-zinc-500 uppercase">
                                    Tipo
                                  </span>

                                  <select
                                    value={asset.type}

                                    onChange={(e) =>
                                      updateTimelineAssetField(
                                        blockKey,
                                        idx,
                                        "type",
                                        e.target.value
                                      )
                                    }

                                    className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-1.5 py-1 w-full focus:outline-none"
                                  >
                                    <option value="image">Imagem</option>

                                    <option value="video">Vídeo</option>

                                    <option value="svg">SVG</option>
                                  </select>
                                </div>

                                <div className="space-y-0.5 w-20">
                                  <span className="text-[9px] text-zinc-500 uppercase">
                                    Duração (s)
                                  </span>

                                  <input
                                    type="number"

                                    step="0.5"

                                    min="0.5"

                                    value={
                                      asset.fixed !== undefined &&
                                      asset.fixed !== null
                                        ? asset.fixed
                                        : ""
                                    }

                                    placeholder={`Auto (${getAssetDuration(blockKey, idx).toFixed(1)}s)`}

                                    onChange={(e) => {
                                      const val =
                                        e.target.value === ""
                                          ? undefined
                                          : parseFloat(e.target.value);

                                      updateTimelineAssetField(
                                        blockKey,
                                        idx,
                                        "fixed",
                                        val
                                      );
                                    }}

                                    className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-1.5 py-1 w-full text-center focus:outline-none"
                                  />
                                </div>
                              </div>

                              <TimelineClipOpenCutControls
                                asset={asset}
                                onFieldChange={(field, value) =>
                                  updateTimelineAssetField(
                                    blockKey,
                                    idx,
                                    field,
                                    value
                                  )
                                }
                              />

                              {/* Actions row: Replace/Substituir and Delete */}

                              <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                                <button
                                  onClick={() =>
                                    deleteTimelineAsset(blockKey, idx)
                                  }

                                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                                </button>

                                <input
                                  type="file"
                                  accept={
                                    asset.type === "video"
                                      ? "video/mp4"
                                      : "image/png,image/jpeg"
                                  }
                                  className="hidden"
                                  id={`asset-upload-${blockKey}-${idx}`}

                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUploadSceneAsset(
                                        parseInt(blockKey),
                                        asset.type === "video"
                                          ? "video"
                                          : "image",
                                        e.target.files[0],
                                        idx,
                                        selectedProject
                                      );
                                    }
                                  }}
                                />

                                <label
                                  htmlFor={`asset-upload-${blockKey}-${idx}`}
                                  className="text-gold-500 hover:text-gold-400 text-[10px] cursor-pointer hover:underline flex items-center gap-1.5 transition"
                                >
                                  <Upload className="w-3.5 h-3.5" /> Substituir
                                </label>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </details>
              );
            });
          })()}
        </div>
      </EditorCollapsibleSection>

      {/* Save button at bottom too */}

      <div className="flex justify-end pt-4">
        <button
          onClick={() => handleSaveConfig()}

          className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
        >
          <Save className="w-4 h-4" /> Salvar Linha do Tempo e Configuração
        </button>
      </div>
    </div>
  );
}
