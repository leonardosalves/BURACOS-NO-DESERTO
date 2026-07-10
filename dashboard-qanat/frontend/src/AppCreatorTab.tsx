import toast from "react-hot-toast";
import React, { lazy, Suspense } from "react";
import {
  Check,
  Chrome,
  Copy,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Volume2,
  CheckCircle,
  Package,
} from "lucide-react";
import { DashminPageLayout } from "./DashminPageLayout";
import { SectionHeader } from "./SectionHeader";
import { NarrationReviewPanel } from "./NarrationReviewPanel";
import { NarrationChunksPanel } from "./NarrationChunksPanel";
import { TtsVoiceStudioPanel } from "./TtsVoiceStudioPanel";
import { warnLongListicleTitles } from "./listicleTitleUtils";
import { CreatorProductionPlanPanel } from "./CreatorProductionPlanPanel";
import { GeoVideoWizardPanel } from "./GeoVideoWizardPanel";
import type { GeoMotionScene } from "./geoVideoFlyover";

const LazyListicleCreatorStep = lazy(() =>
  import("./ListicleCreatorStep").then((m) => ({
    default: m.ListicleCreatorStep,
  }))
);
import { resolveStockSearchQuery } from "./stockSearchQuery";
import {
  buildTaggedNarration,
  taggedNarrationMeta,
  type TaggedNarrationPlatform,
} from "./taggedNarration";
import {
  isClipFactorySource,
  resolveEditorialImportOutline,
} from "./creatorEditorialImport";
import {
  parseCreatorBlockNumber,
  getBlockTimingSummary,
} from "./creatorTimingUtils";
import {
  getSceneDurationSeconds,
  isWhisperTimelineReady,
} from "./sceneSpeechDuration";
import type { ConfigData, WorkspaceStatus } from "./appTypes";

export type AppCreatorTabProps = {
  activeProject: string;
  applyMetadataToUpload: () => void | Promise<void>;
  applyWizardSessionPatch: (patch: any) => void;
  config: ConfigData | null;
  copiedSection: string | null;
  copyToClipboard: (text: string, section: string) => void;
  creatorIdeasBundle: any;
  creatorLoading: boolean;
  creatorLoadingMode: string;
  creatorProjectName: string;
  creatorScenesNeedRepair: boolean;
  creatorStep: number;
  customBlocks: Array<{ block: number; content: string }>;
  customHooks: string;
  customIdeaBlocks: string;
  customIdeaEmotion: string;
  customIdeaHook: string;
  customIdeaPromise: string;
  customIdeaTitle: string;
  customOutline: string;
  customTitle: string;
  dragActive: boolean;
  editorialIdeaImport: any;
  expandedBlocks: Record<number, boolean>;
  fetchData: () => void | Promise<void>;
  formatSelector: "LONGO" | "SHORTS";
  geminiBrowserMode: boolean;
  generateYoutubeMetadata: () => void | Promise<void>;
  generatedScriptData: any;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl: (fileName: string, projectOverride?: string) => string;
  getProjectUrl: (path: string) => string;
  handleApproveNarrationAndGenerateScript: () => void | Promise<void>;
  handleCaptureGeminiNarration: () => void | Promise<void>;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleEnhanceVisualPrompts: () => void | Promise<void>;
  handleEvaluateScriptChecklist: () => void | Promise<void>;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGenerateFullScript: () => void | Promise<void>;
  handleGenerateIdeas: () => void | Promise<void>;
  handleGenerateListicleScript: () => void | Promise<void>;
  handleGenerateNarration: () => void | Promise<void>;
  handleGenerateNarrationFromImport: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handleNotebooklmImproveNarrationDraft: () => void | Promise<void>;
  handleRemoveSceneAsset: (
    blockKey: string,
    assetIdx: number
  ) => void | Promise<void>;
  handleSaveConfig: () => void | Promise<void>;
  handleSuggestListicleRankings: () => void | Promise<void>;
  handleSyncTimings: (fromWizard?: boolean) => void | Promise<void>;
  handleUpdateCreatorScene: (
    index: number,
    field: string,
    value: string
  ) => void;
  handleUploadSceneAsset: (
    blockNum: number,
    type: string,
    file: File,
    assetIdx: number
  ) => void | Promise<void>;
  handleMotionScenesChange: (
    scenes: GeoMotionScene[],
    opts?: { immediate?: boolean }
  ) => void;
  hasApiKey: boolean;
  ideasData: any;
  ideationTab: string;
  leaveGlobalViewForProject: (tab: string) => void;
  listNiche: string;
  listTopic: string;
  listicleHudStyle: string;
  listicleIdeasData: any;
  mixBGM: (fromWizard?: boolean) => void | Promise<void>;
  mixing: boolean;
  narrationBlockPhrases: any;
  narrationBlockScript: any;
  narrationDraft: string;
  narrationNotebooklmEnriched: boolean;
  narrationProjectName: string;
  narrationStrategy: any;
  narrationTaggedDraft: string;
  nicheInput: string;
  notebooklmImproving: boolean;
  notebooklmStatus: any;
  rankCount: number;
  rankOrder: string;
  renderRichTimelineEditor: (opts: {
    hideAutoMap?: boolean;
    wizardManualMode?: boolean;
  }) => React.ReactNode;
  rendering: boolean;
  resetCreatorWizard: (opts?: { deleteServerSessionFor?: string }) => void;
  saveConfigPatch: (
    patch: Partial<ConfigData>,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<void>;
  saveWizardSession: (session: any) => void;
  selectedIdeaIndex: number;
  selectedListicleIdeaIndex: number;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setCreatorProjectName: (v: string) => void;
  setCreatorStep: (v: number) => void;
  setCustomBlocks: (v: Array<{ block: number; content: string }>) => void;
  setCustomHooks: (v: string) => void;
  setCustomIdeaBlocks: (v: string) => void;
  setCustomIdeaEmotion: (v: string) => void;
  setCustomIdeaHook: (v: string) => void;
  setCustomIdeaPromise: (v: string) => void;
  setCustomIdeaTitle: (v: string) => void;
  setCustomOutline: (v: string) => void;
  setCustomTitle: (v: string) => void;
  setEditorialIdeaImport: (v: any) => void;
  setExpandedBlocks: React.Dispatch<
    React.SetStateAction<Record<number, boolean>>
  >;
  setFormatSelector: (v: "LONGO" | "SHORTS") => void;
  setIdeasData: (v: any) => void;
  setIdeationTab: (v: string) => void;
  setListNiche: (v: string) => void;
  setListTopic: (v: string) => void;
  setListicleHudStyle: (v: string) => void;
  setNarrationDraft: (v: string) => void;
  setNarrationTaggedDraft: (v: string) => void;
  setNicheInput: (v: string) => void;
  setRankCount: (v: number) => void;
  setRankOrder: (v: string) => void;
  setSelectedIdeaIndex: (v: number) => void;
  setSelectedListicleIdeaIndex: (v: number) => void;
  setTaggedNarrations: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setUploadSuccess: (v: boolean) => void;
  setUseNotebooklm: (v: boolean) => void;
  setNotebooklmDeep: (v: boolean) => void;
  showNarrationReview: boolean;
  status: WorkspaceStatus | null;
  storyboardData: any;
  syncCreatorStoryboard: (data: any) => void;
  syncingTimings: boolean;
  taggedNarrations: Record<string, string>;
  timelineAssets: any;
  triggerRender: (...args: any[]) => void | Promise<void>;
  uploadSuccess: boolean;
  uploadedScenes: Record<string, boolean>;
  uploadingNarration: boolean;
  useNotebooklm: boolean;
  notebooklmDeep: boolean;
  wizardSavedAtLabel: string | null;
  wordTranscripts: any;
  youtubeLoading: boolean;
  youtubeMetadata: string;
  youtubeMetadataParsed: any;
};

export function AppCreatorTab({
  activeProject,
  applyMetadataToUpload,
  applyWizardSessionPatch,
  config,
  copiedSection,
  copyToClipboard,
  creatorIdeasBundle,
  creatorLoading,
  creatorLoadingMode,
  creatorProjectName,
  creatorScenesNeedRepair,
  creatorStep,
  customBlocks,
  customHooks,
  customIdeaBlocks,
  customIdeaEmotion,
  customIdeaHook,
  customIdeaPromise,
  customIdeaTitle,
  customOutline,
  customTitle,
  dragActive,
  editorialIdeaImport,
  expandedBlocks,
  fetchData,
  formatSelector,
  geminiBrowserMode,
  generateYoutubeMetadata,
  generatedScriptData,
  getAssetUrl,
  getMusicUrl,
  getProjectUrl,
  handleApproveNarrationAndGenerateScript,
  handleCaptureGeminiNarration,
  handleDrag,
  handleDrop,
  handleEnhanceVisualPrompts,
  handleEvaluateScriptChecklist,
  handleFileInput,
  handleGenerateFullScript,
  handleGenerateIdeas,
  handleGenerateListicleScript,
  handleGenerateNarration,
  handleGenerateNarrationFromImport,
  handleGenerateYoutubeThumbnailImages,
  handleNotebooklmImproveNarrationDraft,
  handleRemoveSceneAsset,
  handleSaveConfig,
  handleSuggestListicleRankings,
  handleSyncTimings,
  handleUpdateCreatorScene,
  handleUploadSceneAsset,
  handleMotionScenesChange,
  hasApiKey,
  ideasData,
  ideationTab,
  leaveGlobalViewForProject,
  listNiche,
  listTopic,
  listicleHudStyle,
  listicleIdeasData,
  mixBGM,
  mixing,
  narrationBlockPhrases,
  narrationBlockScript,
  narrationDraft,
  narrationNotebooklmEnriched,
  narrationProjectName,
  narrationStrategy,
  narrationTaggedDraft,
  nicheInput,
  notebooklmImproving,
  notebooklmStatus,
  rankCount,
  rankOrder,
  renderRichTimelineEditor,
  rendering,
  resetCreatorWizard,
  saveConfigPatch,
  saveWizardSession,
  selectedIdeaIndex,
  selectedListicleIdeaIndex,
  setConfig,
  setCreatorProjectName,
  setCreatorStep,
  setCustomBlocks,
  setCustomHooks,
  setCustomIdeaBlocks,
  setCustomIdeaEmotion,
  setCustomIdeaHook,
  setCustomIdeaPromise,
  setCustomIdeaTitle,
  setCustomOutline,
  setCustomTitle,
  setEditorialIdeaImport,
  setExpandedBlocks,
  setFormatSelector,
  setIdeasData,
  setIdeationTab,
  setListNiche,
  setListTopic,
  setListicleHudStyle,
  setNarrationDraft,
  setNarrationTaggedDraft,
  setNicheInput,
  setRankCount,
  setRankOrder,
  setSelectedIdeaIndex,
  setSelectedListicleIdeaIndex,
  setTaggedNarrations,
  setUploadSuccess,
  setUseNotebooklm,
  setNotebooklmDeep,
  showNarrationReview,
  status,
  storyboardData,
  syncCreatorStoryboard,
  syncingTimings,
  taggedNarrations,
  timelineAssets,
  triggerRender,
  uploadSuccess,
  uploadedScenes,
  uploadingNarration,
  useNotebooklm,
  notebooklmDeep,
  wizardSavedAtLabel,
  wordTranscripts,
  youtubeLoading,
  youtubeMetadata,
  youtubeMetadataParsed,
}: AppCreatorTabProps) {
  return (
    <DashminPageLayout
      className="lumiera-fill-view overflow-hidden"
      title="Criador de Vídeos com IA"
      subtitle={`Wizard em 7 passos · passo ${creatorStep} de 7`}
      breadcrumb={["Dashboard", "Produção", "Creator IA"]}
      icon={<Sparkles className="w-5 h-5 animate-pulse" />}
    >
      <div className="glass-panel p-5 rounded-lg shrink-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px]">
          {wizardSavedAtLabel ? (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              Sessão salva {wizardSavedAtLabel} · passo {creatorStep}/7
            </span>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              const project =
                creatorProjectName.trim() ||
                narrationProjectName.trim() ||
                activeProject;
              if (!project) {
                toast.error("Defina o nome do projeto antes de restaurar.");
                return;
              }
              try {
                const res = await fetch(
                  `/api/projects/wizard-session?project=${encodeURIComponent(project)}`
                );
                const data = await res.json();
                if (!res.ok || !data.session) {
                  toast.error(
                    "Nenhuma sessão salva no servidor para este projeto."
                  );
                  return;
                }
                applyWizardSessionPatch(data.session);
                saveWizardSession(data.session);
                toast.success(
                  `Wizard restaurado do servidor — passo ${data.session.creatorStep || 1}`
                );
              } catch {
                toast.error("Falha ao restaurar sessão do servidor.");
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold hover:bg-sky-500/20 transition"
          >
            Restaurar sessão
          </button>
        </div>

        <button
          onClick={() => {
            const project =
              creatorProjectName.trim() ||
              narrationProjectName.trim() ||
              activeProject;
            resetCreatorWizard({ deleteServerSessionFor: project });
            toast.success("Progresso limpo! Novo rascunho iniciado.");
          }}

          className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[10px] px-3 py-1.5 rounded uppercase font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
        >
          <Trash2 className="w-3 h-3" /> Limpar Progresso e Novo
        </button>

        <div className="flex justify-between items-center relative">
          <div className="absolute left-4 right-4 h-0.5 bg-zinc-800 top-1/2 -translate-y-1/2 -z-10"></div>

          <div
            className="absolute left-4 h-0.5 bg-dash-primary top-1/2 -translate-y-1/2 -z-10 transition-all duration-300"

            style={{ width: `${((creatorStep - 1) / 6) * 100}%` }}
          ></div>

          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <button
              key={step}

              onClick={() => creatorStep > step && setCreatorStep(step)}

              className={`w-9 h-9 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-150 cursor-pointer ${
                creatorStep === step
                  ? "bg-dash-primary text-white shadow-lg shadow-dash-primary/25 scale-110"
                  : creatorStep > step
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-500"
              }`}
            >
              {creatorStep > step ? "✓" : step}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-2.5 px-1 font-sans">
          <span>1. Roteiro IA</span>

          <span>2. Narração Master</span>

          <span>3. Sincronizar</span>

          <span>4. Montar B-roll</span>

          <span>5. Render</span>
          <span>6. Metadados</span>
          <span>7. Publicar</span>
        </div>
      </div>

      {/* Steps Content Area */}

      <div className="flex-1 glass-panel border border-dash-border rounded-lg p-6 min-h-0 overflow-y-auto">
        {/* STEP 1: SCRIPT MASTER Research & Selection */}

        {creatorStep === 1 && (
          <div className="space-y-8 max-w-4xl mx-auto font-sans">
            {/* Step 1 Header & Tabs Selector */}
            <div className="bg-zinc-950/60 border border-zinc-900/85 rounded-2xl p-5 space-y-4">
              <div>
                <SectionHeader
                  title="Passo 1: Pesquisa e Ideias (Script Master)"
                  helpId="creator-step-ideas"
                  subtitle="Defina o assunto e a estrutura do seu vídeo. Primeiro a IA gera a narração para você revisar e editar; depois de aprovar, ela monta blocos, prompts visuais e estratégia completa."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900/60 pt-3">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useNotebooklm}
                      onChange={(e) => setUseNotebooklm(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/30"
                    />
                    <span className="text-xs text-zinc-300 font-semibold">
                      Usar NotebookLM na pesquisa de roteiro
                    </span>
                  </label>
                  {useNotebooklm && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={notebooklmDeep}
                        onChange={(e) => setNotebooklmDeep(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-gold-500 focus:ring-gold-500/30"
                      />
                      <span className="text-xs text-zinc-300 font-semibold">
                        Web search Deep Research (~5 min)
                      </span>
                    </label>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {creatorIdeasBundle?.bundleSlug ? (
                    <span
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/25 inline-flex items-center gap-1.5"
                      title={creatorIdeasBundle.skillSlugs.join(" · ")}
                    >
                      <Package className="w-3 h-3 opacity-70" />
                      Bundle ideias:{" "}
                      <span className="font-mono">
                        {creatorIdeasBundle.bundleSlug}
                      </span>
                      <span className="text-sky-400/70">
                        ({creatorIdeasBundle.injectedCount} skills)
                      </span>
                    </span>
                  ) : null}
                  {notebooklmStatus && (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                        notebooklmStatus.authenticated
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                      }`}
                      title={notebooklmStatus.message}
                    >
                      {notebooklmStatus.authenticated
                        ? "NotebookLM conectado"
                        : "Execute nlm login"}
                    </span>
                  )}
                </div>
              </div>

              {editorialIdeaImport && (
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90">
                        {isClipFactorySource(editorialIdeaImport.source)
                          ? "Ideia do Clip Factory"
                          : editorialIdeaImport.mechanic ===
                              "openmontage-reference"
                            ? "Ideia OpenMontage"
                            : "Ideia da fila editorial"}
                      </p>
                      <p className="text-sm font-semibold text-white leading-snug">
                        {editorialIdeaImport.title}
                      </p>
                      {editorialIdeaImport.hookPt && (
                        <p className="text-xs text-zinc-300 italic">
                          &ldquo;{editorialIdeaImport.hookPt}&rdquo;
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditorialIdeaImport(null)}
                      className="text-[9px] text-zinc-500 hover:text-zinc-300 shrink-0"
                    >
                      Dispensar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[9px]">
                    <span className="px-2 py-0.5 rounded-full border border-cyan-500/30 text-cyan-200 bg-cyan-500/10">
                      {editorialIdeaImport.format === "SHORTS"
                        ? "Shorts"
                        : "Longo"}
                    </span>
                    {editorialIdeaImport.sourceProject && (
                      <span className="px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-400 bg-zinc-900/60">
                        Origem: {editorialIdeaImport.sourceProject}
                      </span>
                    )}
                    {editorialIdeaImport.mechanic && (
                      <span className="px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-500 bg-zinc-900/60">
                        {editorialIdeaImport.mechanic}
                      </span>
                    )}
                  </div>
                  {(editorialIdeaImport.whyWorks ||
                    editorialIdeaImport.openMontageOutline ||
                    editorialIdeaImport.openMontage) && (
                    <p className="text-[10px] text-zinc-400 leading-relaxed border-t border-zinc-800/80 pt-2 max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {resolveEditorialImportOutline(editorialIdeaImport)}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={creatorLoading}
                      onClick={() => void handleGenerateNarrationFromImport()}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer"
                    >
                      {creatorLoading && creatorLoadingMode === "narration" ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Criar projeto e gerar narração
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          editorialIdeaImport.mechanic ===
                            "openmontage-reference" &&
                          !customOutline.trim()
                        ) {
                          setCustomOutline(
                            resolveEditorialImportOutline(editorialIdeaImport)
                          );
                        }
                        setIdeationTab("custom");
                      }}
                      className="text-[10px] px-3 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-600"
                    >
                      Editar campos abaixo
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 border-t border-zinc-900/60 pt-3">
                <button
                  type="button"
                  onClick={() => setIdeationTab("ai")}
                  className={`dash-segment-btn ${ideationTab === "ai" ? "dash-segment-btn-active" : ""}`}
                >
                  <span>💡 Gerar com IA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdeationTab("custom")}
                  className={`dash-segment-btn ${ideationTab === "custom" ? "dash-segment-btn-active" : ""}`}
                >
                  <span>✏️ Ideia Personalizada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIdeationTab("listicle")}
                  className={`dash-segment-btn ${ideationTab === "listicle" ? "dash-segment-btn-active" : ""}`}
                >
                  <span>📊 Top N / Listicle</span>
                </button>
              </div>
            </div>

            {ideationTab === "custom" ? (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-4">
                  {/* Title input */}
                  <div className="space-y-2 font-sans">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Título do Vídeo (em Inglês)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: The Secrets Behind the Great Wall of China"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  {/* Hooks input */}
                  <div className="space-y-2 font-sans">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Ganchos / Hooks de Retenção (em Inglês)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex: What if the Great Wall wasn't built to keep humans out, but to lock something else inside?"
                      value={customHooks}
                      onChange={(e) => setCustomHooks(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  {/* Outline / Promise input */}
                  <div className="space-y-2 font-sans">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Roteiro Base / Promessa Geral (em Inglês)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: A historical documentary uncovering unknown architectural elements and defense strategies of the ancient Great Wall..."
                      value={customOutline}
                      onChange={(e) => setCustomOutline(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  {/* Format dropdown */}
                  <div className="space-y-2 font-sans">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Formato do Vídeo
                    </label>
                    <select
                      value={formatSelector}
                      onChange={(e) =>
                        setFormatSelector(e.target.value as "LONGO" | "SHORTS")
                      }
                      className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white cursor-pointer font-sans"
                    >
                      <option value="LONGO">
                        Vídeo Longo (6 a 12 minutos - Documentário)
                      </option>
                      <option value="SHORTS">
                        Shorts (30 a 50 segundos - Rápido e Viral)
                      </option>
                    </select>
                  </div>

                  {/* Dynamic Blocks */}
                  <div className="space-y-4 pt-2 font-sans">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        Estrutura de Blocos (em Inglês)
                      </label>
                      <span className="text-[9px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 font-mono font-bold">
                        {customBlocks.length}{" "}
                        {customBlocks.length === 1 ? "bloco" : "blocos"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {customBlocks.map((b, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl space-y-2 relative"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">
                              Bloco {idx + 1}
                            </span>
                            {customBlocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newBlocks = customBlocks
                                    .filter((_, i) => i !== idx)
                                    .map((block, i) => ({
                                      ...block,
                                      block: i + 1,
                                    }));
                                  setCustomBlocks(newBlocks);
                                }}
                                className="text-red-500/70 hover:text-red-400 text-[10px] font-bold cursor-pointer transition"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          <textarea
                            rows={3}
                            placeholder={`Descreva o conteúdo do bloco ${idx + 1} em inglês (ex: Explain how the foundation was built...)`}
                            value={b.content}
                            onChange={(e) => {
                              const newBlocks = [...customBlocks];
                              newBlocks[idx].content = e.target.value;
                              setCustomBlocks(newBlocks);
                            }}
                            className="w-full bg-zinc-950 border border-zinc-900/60 hover:border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg px-3 py-2 text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomBlocks([
                          ...customBlocks,
                          { block: customBlocks.length + 1, content: "" },
                        ]);
                      }}
                      className="w-full bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>+ Adicionar Bloco</span>
                    </button>
                  </div>

                  {/* Folder input */}
                  <div className="bg-zinc-950/40 border border-zinc-900/60 p-5 rounded-2xl space-y-2 mt-4 font-sans">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      Nome do Novo Projeto (Nome da Pasta)
                    </label>
                    <input
                      disabled={creatorLoading}
                      type="text"
                      placeholder="Ex: Secrets_Roman_Concrete, Great_Wall_Secrets, etc."
                      value={creatorProjectName}
                      onChange={(e) => setCreatorProjectName(e.target.value)}
                      className="w-full bg-white border border-zinc-300 hover:border-zinc-400 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold placeholder:text-zinc-400"
                    />
                    <span className="text-[9px] text-zinc-500 block leading-normal mt-1">
                      * A IA traduzirá a narração para Português BR e gerará os
                      ganchos, prompts e assets baseados no seu roteiro
                      personalizado em inglês.
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-zinc-900">
                  {geminiBrowserMode && (
                    <button
                      type="button"
                      disabled={
                        creatorLoading && creatorLoadingMode !== "narration"
                      }
                      onClick={() => void handleCaptureGeminiNarration()}
                      className="border border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50 text-violet-200 text-xs font-bold px-5 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer font-sans"
                    >
                      <Chrome className="w-4 h-4" />
                      <span>Capturar do Gemini</span>
                    </button>
                  )}
                  <button
                    disabled={
                      creatorLoading ||
                      !customTitle.trim() ||
                      !creatorProjectName.trim()
                    }
                    onClick={handleGenerateFullScript}
                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 w-full justify-center sm:w-auto font-sans"
                  >
                    {creatorLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>
                      {creatorLoading && creatorLoadingMode === "narration"
                        ? "Gerando narração..."
                        : "Gerar Narração"}
                    </span>
                  </button>
                </div>
              </div>
            ) : ideationTab === "listicle" ? (
              <ListicleCreatorStep
                listNiche={listNiche}
                setListNiche={setListNiche}
                listTopic={listTopic}
                setListTopic={setListTopic}
                rankCount={rankCount}
                setRankCount={setRankCount}
                rankOrder={rankOrder}
                setRankOrder={setRankOrder}
                formatSelector={formatSelector}
                setFormatSelector={setFormatSelector}
                creatorProjectName={creatorProjectName}
                setCreatorProjectName={setCreatorProjectName}
                setNicheInput={setNicheInput}
                creatorLoading={creatorLoading}
                hasApiKey={hasApiKey}
                listicleIdeasData={listicleIdeasData}
                selectedListicleIdeaIndex={selectedListicleIdeaIndex}
                listicleHudStyle={listicleHudStyle}
                setListicleHudStyle={setListicleHudStyle}
                listItems={
                  generatedScriptData?.list_items || storyboardData?.list_items
                }
                onSuggestRankings={handleSuggestListicleRankings}
                onSelectRankingIdea={(idx) => setSelectedListicleIdeaIndex(idx)}
                onGenerateScript={handleGenerateListicleScript}
              />
            ) : !ideasData ? (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div>
                  <SectionHeader
                    title="Passo 1: Pesquisa e Ideias (Script Master)"
                    helpId="creator-step-ideas"
                    subtitle="Insira seu nicho de atuação e o formato desejado. O gerador irá analisar as dores, medos e ganchos de retenção antes de propor 10 ideias de alto impacto."
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Nicho do Vídeo
                    </label>

                    <input
                      disabled={creatorLoading || !hasApiKey}

                      type="text"

                      placeholder={
                        hasApiKey
                          ? "Ex: curiosidades e fatos surpreendentes, finanças, culinária, natureza..."
                          : "Configure um provedor na aba Configurações primeiro..."
                      }

                      value={nicheInput}

                      onChange={(e) => setNicheInput(e.target.value)}

                      className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-805 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Formato
                    </label>

                    <select
                      disabled={creatorLoading || !hasApiKey}

                      value={formatSelector}

                      onChange={(e) =>
                        setFormatSelector(e.target.value as "LONGO" | "SHORTS")
                      }

                      className="w-full bg-zinc-950 border border-zinc-855 hover:border-zinc-805 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-3 text-xs text-white cursor-pointer"
                    >
                      <option value="LONGO">
                        Vídeo Longo (6 a 12 minutos - Documentário)
                      </option>

                      <option value="SHORTS">
                        Shorts (30 a 50 segundos - Rápido e Viral)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 w-full flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    disabled={creatorLoading}
                    onClick={() => {
                      setIdeasData({
                        diagnostic: null,
                        ideas: [],
                        best_idea_index: -1,
                        best_idea_reason: "",
                      });
                      setSelectedIdeaIndex(999);
                      setCustomIdeaTitle("");
                      setCustomIdeaPromise("");
                      setCustomIdeaEmotion("");
                      setCustomIdeaHook("");
                      setCustomIdeaBlocks("");
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-gold-500 hover:text-white border border-zinc-800 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg w-full justify-center sm:w-auto"
                  >
                    ✍️ Escrever Minha Própria Ideia
                  </button>
                  <button
                    disabled={
                      creatorLoading || !nicheInput.trim() || !hasApiKey
                    }

                    onClick={handleGenerateIdeas}

                    className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 w-full justify-center sm:w-auto"
                  >
                    {creatorLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}

                    <span>Analisar Nicho e Gerar 10 Ideias</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="lumiera-panel-stack animate-fade-in">
                {/* Diagnostic info banner */}
                {ideasData?.diagnostic && (
                  <div className="p-5 bg-zinc-950/60 border border-zinc-900 rounded-2xl space-y-4">
                    <h5 className="text-[10px] font-bold text-gold-500 uppercase tracking-widest block font-sans">
                      DIAGNÓSTICO E PESQUISA DO NICHO
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                          O que procuram
                        </span>
                        <p className="text-gray-300 mt-1 font-medium leading-relaxed">
                          {ideasData?.diagnostic?.looking_for}
                        </p>
                      </div>
                      <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Dores do público
                        </span>
                        <p className="text-gray-300 mt-1 font-medium leading-relaxed">
                          {ideasData?.diagnostic?.pain_points}
                        </p>
                      </div>
                      <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60">
                        <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                          Ângulo de Retenção
                        </span>
                        <p className="text-gray-300 mt-1 font-medium leading-relaxed">
                          {ideasData?.diagnostic?.strong_angle}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* List of 10 ideas */}

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <SectionHeader
                      title="Selecione uma das 10 Ideias"
                      helpId="creator-step-select-idea"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedIdeaIndex(999);
                          setCustomIdeaTitle("");
                          setCustomIdeaPromise("");
                          setCustomIdeaEmotion("");
                          setCustomIdeaHook("");
                          setCustomIdeaBlocks("");
                        }}
                        className="bg-zinc-900 border border-zinc-800 hover:border-gold-500/50 text-gold-500 text-[10px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                      >
                        ✍️ Criar do Zero (Manual)
                      </button>
                      <span className="text-[10px] bg-gold-500/10 border border-gold-500/20 text-gold-500 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                        10 Ideias Geradas
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(ideasData?.ideas || []).map((idea, index) => {
                      const isSelected = selectedIdeaIndex === index;

                      const isBest = ideasData?.best_idea_index === index;

                      return (
                        <div
                          key={index}

                          onClick={() => {
                            setSelectedIdeaIndex(index);
                            setCustomIdeaTitle(idea.title || "");
                            setCustomIdeaPromise(idea.promise || "");
                            setCustomIdeaEmotion(idea.emotion || "");
                            setCustomIdeaHook("");
                            setCustomIdeaBlocks("");

                            // Auto-fill project name (short 3-word summary)

                            const stopWords = [
                              "o",
                              "a",
                              "os",
                              "as",
                              "um",
                              "uma",
                              "uns",
                              "umas",
                              "de",
                              "do",
                              "da",
                              "dos",
                              "das",
                              "no",
                              "na",
                              "nos",
                              "nas",
                              "em",
                              "por",
                              "para",
                              "com",
                              "e",
                              "que",
                              "se",
                              "ou",
                              "ao",
                              "à",
                              "pelo",
                              "pela",
                              "pelos",
                              "pelas",
                              "entre",
                              "sobre",
                              "sob",
                              "até",
                              "como",
                              "mais",
                              "menos",
                              "muito",
                              "tudo",
                              "isso",
                              "este",
                              "esta",
                              "esse",
                              "essa",
                              "qual",
                              "quais",
                            ];

                            const shortName = idea.title

                              .normalize("NFD")
                              .replace(/[\u0300-\u036f]/g, "")

                              .replace(/[^a-zA-Z0-9\s]/g, "")

                              .split(/\s+/)

                              .filter(
                                (w: string) =>
                                  w.length > 1 &&
                                  !stopWords.includes(w.toLowerCase())
                              )

                              .slice(0, 3)

                              .join("_");

                            setCreatorProjectName(shortName);
                          }}

                          className={`p-5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between hover:border-zinc-800 ${
                            isSelected
                              ? "bg-gold-500/5 border-gold-500 shadow-lg shadow-gold-500/5"
                              : "bg-zinc-950/20 border-zinc-900"
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-zinc-500 text-[10px] font-bold">
                                Ideia {index + 1}
                              </span>

                              {isBest && (
                                <span className="bg-gold-500 text-zinc-950 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-sans">
                                  Recomendado
                                </span>
                              )}
                            </div>

                            <h5
                              className={`text-xs font-bold font-sans tracking-wide ${isSelected ? "text-gold-500" : "text-white"}`}
                            >
                              {idea.title}
                            </h5>

                            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                              {idea.promise}
                            </p>
                          </div>

                          <div className="flex justify-between items-center mt-4 border-t border-zinc-900/60 pt-3 text-[9px] uppercase tracking-wider font-bold">
                            <span className="text-zinc-500">
                              Formato: {idea.best_format}
                            </span>

                            <span className="text-gold-500/70">
                              {idea.emotion}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Best idea explanation */}

                {selectedIdeaIndex === ideasData?.best_idea_index && (
                  <div className="p-4 bg-gold-500/5 border border-gold-500/20 rounded-2xl text-xs text-gray-300 leading-relaxed">
                    <strong className="text-gold-500 font-sans block text-[10px] uppercase tracking-wider mb-1">
                      Por que esta é a melhor ideia:
                    </strong>

                    {ideasData?.best_idea_reason}
                  </div>
                )}

                {selectedIdeaIndex !== -1 && (
                  <div className="bg-zinc-950/60 border border-zinc-900 p-5 rounded-2xl space-y-4 mt-6 text-left">
                    <h5 className="text-[10px] font-bold text-gold-500 uppercase tracking-widest block font-sans">
                      {selectedIdeaIndex === 999
                        ? "CRIAR IDEIA MANUAL"
                        : "PERSONALIZAR ESTRATÉGIA DA IDEIA"}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Título Principal
                        </label>
                        <input
                          type="text"
                          value={customIdeaTitle}
                          onChange={(e) => {
                            setCustomIdeaTitle(e.target.value);
                            if (selectedIdeaIndex === 999) {
                              const stopWords = [
                                "o",
                                "a",
                                "os",
                                "as",
                                "um",
                                "uma",
                                "uns",
                                "umas",
                                "de",
                                "do",
                                "da",
                                "dos",
                                "das",
                                "no",
                                "na",
                                "nos",
                                "nas",
                                "em",
                                "por",
                                "para",
                                "com",
                                "e",
                                "que",
                                "se",
                                "ou",
                                "ao",
                                "à",
                                "pelo",
                                "pela",
                                "pelos",
                                "pelas",
                                "entre",
                                "sobre",
                                "sob",
                                "até",
                                "como",
                                "mais",
                                "menos",
                                "muito",
                                "tudo",
                                "isso",
                                "este",
                                "esta",
                                "esse",
                                "essa",
                                "qual",
                                "quais",
                              ];
                              const shortName = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9\s]/g, "")
                                .split(/\s+/)
                                .filter(
                                  (w: string) =>
                                    w.length > 1 &&
                                    !stopWords.includes(w.toLowerCase())
                                )
                                .slice(0, 3)
                                .join("_");
                              setCreatorProjectName(shortName);
                            }
                          }}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                          placeholder="Ex: A bizarra verdade sobre as escadas dos castelos"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                          Emoção Dominante
                        </label>
                        <input
                          type="text"
                          value={customIdeaEmotion}
                          onChange={(e) => setCustomIdeaEmotion(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                          placeholder="Ex: Curiosidade, Choque, Fascínio"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                        Promessa do Vídeo
                      </label>
                      <input
                        type="text"
                        value={customIdeaPromise}
                        onChange={(e) => setCustomIdeaPromise(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                        placeholder="Ex: Revelar o detalhe sádico das escadas medievais"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                        Gancho de Retenção (Hook)
                      </label>
                      <input
                        type="text"
                        value={customIdeaHook}
                        onChange={(e) => setCustomIdeaHook(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 font-semibold"
                        placeholder="Ex: Você sabia que as escadas dos castelos eram armas mortais?"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                        Estrutura / Temas dos Blocos (Ganchos / Roteiro)
                      </label>
                      <textarea
                        value={customIdeaBlocks}
                        onChange={(e) => setCustomIdeaBlocks(e.target.value)}
                        className="w-full min-h-[90px] bg-zinc-900 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-xl p-3.5 text-xs text-white leading-relaxed resize-y placeholder:text-zinc-600 font-medium"
                        placeholder="Ex: Bloco 1: O mistério do sentido das escadas; Bloco 2: A vantagem tática dos defensores destros; Bloco 3: O tropeço mortal..."
                      />
                    </div>
                  </div>
                )}

                {/* New Project Name Input */}
                <div className="bg-zinc-950/40 border border-zinc-900/60 p-5 rounded-2xl space-y-2 mt-4 font-sans">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Nome do Novo Projeto (Nome da Pasta)
                  </label>

                  <input
                    disabled={creatorLoading}

                    type="text"

                    placeholder="Ex: Historia_Persa, Timelapse_Obra, etc."

                    value={creatorProjectName}

                    onChange={(e) => setCreatorProjectName(e.target.value)}

                    className="w-full bg-white border border-zinc-300 hover:border-zinc-400 focus:border-gold-500 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-zinc-900 font-semibold placeholder:text-zinc-400"
                  />

                  <span className="text-[9px] text-zinc-500 block leading-normal mt-1">
                    * O assistente criará automaticamente uma pasta separada no
                    workspace com todas as mídias e scripts dedicados para este
                    projeto.
                  </span>
                </div>

                {/* Script generation trigger */}

                <div className="flex justify-between items-center pt-4 border-t border-zinc-900 font-sans">
                  <button
                    onClick={() => {
                      setIdeasData(null);

                      setSelectedIdeaIndex(-1);
                    }}

                    className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
                  >
                    ← Alterar Nicho e Formato
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {geminiBrowserMode && (
                      <button
                        type="button"
                        disabled={
                          creatorLoading && creatorLoadingMode !== "narration"
                        }
                        onClick={() => void handleCaptureGeminiNarration()}
                        className="border border-violet-500/40 hover:bg-violet-500/10 disabled:opacity-50 text-violet-200 text-xs font-bold px-4 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer font-sans"
                      >
                        <Chrome className="w-4 h-4" />
                        <span>Capturar do Gemini</span>
                      </button>
                    )}
                    <button
                      disabled={creatorLoading || selectedIdeaIndex === -1}
                      onClick={handleGenerateFullScript}
                      className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10 font-sans"
                    >
                      {creatorLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>
                        {creatorLoading && creatorLoadingMode === "narration"
                          ? "Gerando narração..."
                          : "Gerar Narração"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showNarrationReview && (
              <NarrationReviewPanel
                narrativeScript={narrationDraft}
                narrativeScriptTagged={narrationTaggedDraft}
                strategyHook={narrationStrategy?.hook}
                strategyTitle={narrationStrategy?.title_main}
                blockPhrases={narrationBlockPhrases}
                blockScript={narrationBlockScript}
                editorialQuality={storyboardData?.editorial_quality}
                narrationReadiness={storyboardData?.narration_readiness}
                visualReadiness={storyboardData?.visual_quality}
                notebooklmEnriched={narrationNotebooklmEnriched}
                notebooklmImproving={notebooklmImproving}
                notebooklmAvailable={notebooklmStatus?.authenticated ?? false}
                loading={creatorLoading}
                loadingMode={
                  creatorLoadingMode === "idle" ? "idle" : creatorLoadingMode
                }
                onNarrativeChange={(value) => {
                  setNarrationDraft(value);
                  if (narrationTaggedDraft) setNarrationTaggedDraft("");
                }}
                onRegenerate={handleGenerateNarration}
                onApprove={handleApproveNarrationAndGenerateScript}
                onNotebooklmImprove={handleNotebooklmImproveNarrationDraft}
              />
            )}
          </div>
        )}

        {/* STEP 2: Narration Audio Upload */}

        {creatorStep === 2 && (
          <div className="space-y-6 max-w-4xl mx-auto py-10">
            <div className="text-center">
              <SectionHeader
                title="Passo 2: Áudio de Narração"
                helpId="creator-step-narration"
              />

              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-2xl mx-auto">
                {config?.narration_mode === "chunked"
                  ? "Modo por trechos: planeje blocos/cenas com pausas (IA), gere TTS por parte e monte o MP3 master automaticamente — timings incluídos."
                  : "Faça upload do MP3 ou gere a narração com TTS a partir do roteiro aprovado. Sem este áudio, o passo 3 não define os segundos de cada cena."}
              </p>
            </div>

            {config && (
              <NarrationChunksPanel
                getProjectUrl={getProjectUrl}
                getMediaUrl={(file) => getMusicUrl(file, activeProject)}
                toast={(msg) => toast(msg)}
                hasApiKey={hasApiKey}
                narrationMode={config.narration_mode || "master"}
                plan={
                  storyboardData?.narration_chunk_plan ||
                  generatedScriptData?.narration_chunk_plan ||
                  null
                }
                onModeChange={(mode) => {
                  void saveConfigPatch(
                    { narration_mode: mode },
                    { skipRefresh: true }
                  );
                  setConfig((prev) =>
                    prev ? { ...prev, narration_mode: mode } : prev
                  );
                }}
                onPlanChange={(plan) => {
                  const base = storyboardData || generatedScriptData;
                  if (!base) return;
                  syncCreatorStoryboard({
                    ...base,
                    narration_chunk_plan: plan,
                  });
                }}
                onUpdated={() => {
                  setUploadSuccess(true);
                  fetchData();
                }}
              />
            )}

            {config?.narration_mode === "chunked" ? (
              <p className="text-[10px] text-zinc-500 text-center border border-zinc-800 rounded-xl p-3 max-w-2xl mx-auto">
                Com trechos gerados, o passo 3 pode ser pulado se os timings já
                aparecerem — Whisper fica opcional para refinamento de legendas.
              </p>
            ) : (
              <>
                {/* Drag and drop zone */}

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all duration-150 font-sans text-center ${
                    dragActive
                      ? "border-gold-500 bg-gold-500/5"
                      : uploadSuccess || status?.has_narration
                        ? "border-emerald-500 bg-emerald-500/5"
                        : "border-zinc-800 bg-zinc-950/20 hover:border-zinc-700"
                  }`}
                >
                  {uploadingNarration ? (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-gold-500 animate-spin" />
                      <span className="text-xs text-gray-300">
                        Enviando e salvando áudio...
                      </span>
                    </div>
                  ) : uploadSuccess ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                      <span className="text-xs font-bold text-white">
                        Narração Salva com Sucesso!
                      </span>
                      <span className="text-[10px] text-gray-500">
                        narracao_mestra_premium.mp3 atualizado no workspace.
                      </span>
                    </div>
                  ) : status?.has_narration ? (
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle className="w-10 h-10 text-emerald-500/80 animate-pulse" />
                      <span className="text-xs font-bold text-white">
                        Narração Existente no Workspace
                      </span>
                      <span className="text-[10px] text-gray-400">
                        narracao_mestra_premium.mp3 já está salvo no workspace.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Volume2 className="w-10 h-10 text-zinc-600 animate-pulse" />
                      <div>
                        <span className="text-xs text-gray-300 block font-bold">
                          Arraste seu arquivo MP3 de narração aqui
                        </span>
                        <span className="text-[10px] text-zinc-500 block mt-1">
                          ou clique para selecionar do computador
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="audio/mp3,audio/mpeg"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload"
                  />

                  {!uploadSuccess && (
                    <label
                      htmlFor="file-upload"
                      className="mt-2 bg-zinc-900 border border-zinc-800 text-gray-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer hover:bg-zinc-850 transition"
                    >
                      {status?.has_narration
                        ? "Substituir Narração"
                        : "Selecionar Arquivo"}
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
                  <span className="flex-1 h-px bg-zinc-800" />
                  ou gere com TTS
                  <span className="flex-1 h-px bg-zinc-800" />
                </div>

                <TtsVoiceStudioPanel
                  getProjectUrl={getProjectUrl}
                  toast={(msg) => toast(msg)}
                  narrativeScript={
                    storyboardData?.narrative_script ||
                    generatedScriptData?.narrative_script ||
                    narrationDraft ||
                    ""
                  }
                  taggedScript={
                    storyboardData?.narrative_script_tagged ||
                    generatedScriptData?.narrative_script_tagged ||
                    narrationTaggedDraft ||
                    ""
                  }
                  onUpdated={() => {
                    setUploadSuccess(true);
                    fetchData();
                  }}
                  onTaggedScriptChange={(value) => {
                    setNarrationTaggedDraft(value);
                    const base = storyboardData || generatedScriptData;
                    if (!base) return;
                    syncCreatorStoryboard({
                      ...base,
                      narrative_script_tagged: value,
                    });
                  }}
                />
              </>
            )}

            <div className="flex justify-between items-center pt-4 font-sans">
              <button
                onClick={() => setCreatorStep(1)}

                className="text-xs text-zinc-500 hover:text-white font-semibold transition"
              >
                ← Voltar para o Roteiro
              </button>

              <button
                disabled={!uploadSuccess && !status?.has_narration}

                onClick={() => setCreatorStep(3)}

                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <span>Prosseguir para Sincronização</span>

                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Sync Whisper Timing */}

        {creatorStep === 3 && (
          <div className="space-y-6 max-w-xl mx-auto text-center py-10">
            <div>
              <SectionHeader
                title="Passo 3: Sincronização por Transcrição Inteligente"
                helpId="creator-step-sync"
              />

              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {config?.narration_mode === "chunked" ? (
                  "Narração por trechos já grava timings e timeline. Rode Whisper só se quiser refinamento palavra a palavra nas legendas — caso contrário, avance quando os timings estiverem prontos."
                ) : (
                  <>
                    Obrigatório após a narração (passo 2). O Whisper transcreve
                    o MP3 e define os{" "}
                    <strong className="text-gray-300">
                      segundos reais de cada cena
                    </strong>{" "}
                    — substituindo as durações estimadas do roteiro. Isso gera
                    `word_transcripts.json`, `block_timings.json` e os slots da
                    timeline.
                  </>
                )}
              </p>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-900 flex flex-col items-center gap-4 font-sans">
              <Sparkles className="w-10 h-10 text-gold-500 animate-pulse" />

              <div className="text-xs text-gray-300 font-medium">
                Sincronizador Pronto
              </div>

              <p className="text-[10px] text-gray-500 max-w-md">
                Esta etapa executa scripts Python em segundo plano. Os logs
                detalhados serão transmitidos ao console do terminal de
                compilação.
              </p>

              <button
                disabled={syncingTimings}

                onClick={() => handleSyncTimings(true)}

                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-gold-500/10"
              >
                {syncingTimings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}

                <span>
                  {syncingTimings
                    ? "Sincronizando áudio..."
                    : "Iniciar Sincronização de Voz"}
                </span>
              </button>
            </div>

            <div className="flex justify-between items-center pt-4 font-sans">
              <button
                onClick={() => setCreatorStep(2)}

                className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
              >
                ← Voltar para Narração
              </button>

              <button
                disabled={
                  syncingTimings ||
                  !isWhisperTimelineReady(wordTranscripts, status)
                }

                onClick={() => setCreatorStep(4)}

                className="text-xs text-zinc-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1 cursor-pointer"

                title={
                  isWhisperTimelineReady(wordTranscripts, status)
                    ? "Ir para montagem manual de B-roll"
                    : "Conclua a sincronização Whisper antes"
                }
              >
                <span>Avançar para B-roll</span>

                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Automap assets */}

        {creatorStep === 4 && config && (
          <div className="space-y-6 max-w-4xl mx-auto font-sans">
            {renderRichTimelineEditor({
              hideAutoMap: true,
              wizardManualMode: true,
            })}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-zinc-900 font-sans">
              <button
                onClick={() => setCreatorStep(3)}
                className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
              >
                ← Voltar para Sincronização
              </button>
              <button
                disabled={
                  !timelineAssets ||
                  !isWhisperTimelineReady(wordTranscripts, status)
                }
                onClick={() => {
                  void handleSaveConfig();
                  setCreatorStep(5);
                }}
                className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                title="Salva a timeline e avança — confirme que cada cena tem mídia e segundos da voz"
              >
                <span>Salvar timeline e Render</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Final Render shortcuts */}

        {creatorStep === 5 && (
          <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">
            <div className="text-center font-sans">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />

              <SectionHeader
                title="Tudo Pronto! O Vídeo está configurado para Render"
                helpId="creator-step-ready"
              />

              <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-lg mx-auto font-sans">
                Roteiro, narração e sincronização prontos. Com Gemini no Chrome,
                overlays e metadados são consultados antes do render.
              </p>
            </div>

            {(youtubeLoading || youtubeMetadataParsed?.titles?.length) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-left text-xs ${
                  youtubeLoading
                    ? "border-gold-500/30 bg-gold-500/5 text-gold-200"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                }`}
              >
                {youtubeLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                    IA gerando metadados do vídeo (títulos, descrição, tags,
                    capítulos)…
                  </span>
                ) : (
                  <span>
                    Metadados prontos — título sugerido:{" "}
                    <strong className="text-white">
                      {youtubeMetadataParsed?.titles?.[0]?.text ||
                        "ver passo 6"}
                    </strong>
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 pt-4 font-sans">
              {/* Mix audio card */}

              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">
                <div>
                  <h5 className="text-xs font-bold text-white tracking-wider font-sans">
                    1. MIXAR ÁUDIO
                  </h5>

                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    Regenera a trilha sonora de fundo e crossfades baseados nas
                    indicações da IA.
                  </p>
                </div>

                <button
                  disabled={mixing}

                  onClick={() => mixBGM(true)}

                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-gold-500 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${mixing ? "animate-spin" : ""}`}
                  />

                  <span>Mixar Trilhas</span>
                </button>
              </div>

              {/* Render standard card */}

              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">
                <div>
                  <h5 className="text-xs font-bold text-white tracking-wider font-sans">
                    2. RENDER PADRÃO
                  </h5>

                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    Compila o vídeo final padrão usando as mídias da linha do
                    tempo e legendas animadas.
                  </p>
                </div>

                <button
                  disabled={rendering}

                  onClick={() => triggerRender("standard", true)}

                  className="bg-gold-500 hover:bg-gold-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-lg shadow-gold-500/10 w-full"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />

                  <span>Compilar Padrão</span>
                </button>
              </div>

              {/* Render Remotion card */}
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-zinc-800 transition">
                <div>
                  <h5 className="text-xs font-bold text-white tracking-wider font-sans">
                    3. RENDER REMOTION
                  </h5>
                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    Gera o vídeo com o motor moderno do Remotion, ideal para
                    Shorts com transições fluidas.
                  </p>
                </div>
                <button
                  disabled={rendering}
                  onClick={() => triggerRender("remotion", true)}
                  className="bg-water-500/10 border border-water-500/20 hover:bg-water-500/20 text-water-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                >
                  <span>Compilar Remotion</span>
                </button>
              </div>

              {/* Render Remotion PRO card */}
              <div className="bg-zinc-950 border border-amber-500/20 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-amber-500/30 transition">
                <div>
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-white tracking-wider font-sans">
                      4. REMOTION PRO
                    </h5>
                    <span className="bg-amber-500/15 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      PRO
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                    Gera a versão premium contendo infográficos animados
                    automáticos (Lower Thirds, kinetic text e contadores).
                  </p>
                </div>
                <button
                  disabled={rendering}
                  onClick={() => triggerRender("remotion-pro", true)}
                  className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compilar Remotion PRO</span>
                </button>
              </div>

              {/* Render Remotion PRO + HyperFrames AI card */}
              <div className="bg-zinc-950 border border-emerald-500/20 rounded-2xl p-5 flex flex-col justify-between h-48 hover:border-emerald-500/30 transition">
                <div>
                  <div className="flex justify-between items-start">
                    <h5 className="text-xs font-bold text-white tracking-wider font-sans">
                      5. HYPERFRAMES AI
                    </h5>
                    <span className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      AI
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1 leading-normal">
                    Orquestração dinâmica via IA do catálogo HyperFrames com
                    suporte a transparência ProRes.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-1 text-[8px] text-zinc-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="wizard-prores-checkbox"
                      className="rounded bg-zinc-900 border-zinc-700 text-emerald-500 focus:ring-0 cursor-pointer w-2.5 h-2.5"
                    />
                    <span>Fundo Transparente (ProRes)</span>
                  </label>
                  <button
                    disabled={rendering}
                    onClick={() => {
                      const proresCheck = document.getElementById(
                        "wizard-prores-checkbox"
                      ) as HTMLInputElement;
                      triggerRender(
                        "remotion-pro",
                        true,
                        false,
                        true,
                        proresCheck?.checked
                      );
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer w-full"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Compilar HyperFrames AI</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-zinc-900 font-sans">
              <button
                onClick={() => setCreatorStep(4)}
                className="text-xs text-zinc-500 hover:text-white font-semibold transition cursor-pointer"
              >
                ← Voltar para B-roll
              </button>
              <button
                onClick={() => setCreatorStep(6)}
                className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl transition"
              >
                Avançar para Metadados →
              </button>
            </div>
          </div>
        )}

        {creatorStep === 6 && (
          <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">
            <div>
              <SectionHeader
                title="Passo 6: Metadados e Thumbnails"
                helpId="creator-step-metadata"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Gerados automaticamente ao renderizar no passo 5 — ou regenere
                com IA abaixo.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Informações do vídeo (IA)
                </span>
                <button
                  type="button"
                  disabled={youtubeLoading}
                  onClick={() => void generateYoutubeMetadata()}
                  className="text-[10px] font-bold text-gold-400 border border-gold-500/30 hover:border-gold-500/50 px-3 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {youtubeLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {youtubeLoading ? "Gerando…" : "Regenerar com IA"}
                </button>
              </div>

              {youtubeMetadataParsed?.titles?.length ? (
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {youtubeMetadataParsed.titles.slice(0, 5).map((t, i) => (
                    <li key={`wiz-title-${i}`} className="flex gap-2">
                      <span className="text-gold-500 font-bold shrink-0">
                        {i + 1}.
                      </span>
                      <span>{t.text}</span>
                    </li>
                  ))}
                </ul>
              ) : youtubeMetadata && !youtubeMetadata.startsWith("[Erro]") ? (
                <p className="text-[10px] text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {youtubeMetadata.slice(0, 600)}…
                </p>
              ) : (
                <p className="text-[10px] text-zinc-500 italic">
                  Nenhum metadado ainda — renderize no passo 5 ou clique em
                  Regenerar com IA.
                </p>
              )}

              {youtubeMetadataParsed?.description && (
                <p className="text-[10px] text-zinc-500 line-clamp-3 border-t border-zinc-800 pt-2">
                  {youtubeMetadataParsed.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => leaveGlobalViewForProject("ai")}
                className="bg-gold-500/10 border border-gold-500/30 text-gold-400 py-3 rounded-xl text-xs font-bold"
              >
                Abrir Metadados
              </button>
              <button
                onClick={handleGenerateYoutubeThumbnailImages}
                className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 rounded-xl text-xs font-bold"
              >
                Gerar Thumbnails
              </button>
              <button
                onClick={applyMetadataToUpload}
                disabled={!youtubeMetadataParsed}
                className="sm:col-span-2 bg-violet-500/10 border border-violet-500/30 text-violet-300 py-3 rounded-xl text-xs font-bold disabled:opacity-40"
              >
                Aplicar ao Upload
              </button>
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setCreatorStep(5)}
                className="text-xs text-zinc-500"
              >
                ← Render
              </button>
              <button
                onClick={() => setCreatorStep(7)}
                className="bg-gold-500 text-zinc-950 text-xs font-bold px-5 py-2 rounded-xl"
              >
                Publicar →
              </button>
            </div>
          </div>
        )}

        {creatorStep === 7 && (
          <div className="space-y-6 max-w-2xl mx-auto py-6 font-sans">
            <SectionHeader
              title="Passo 7: Publicar"
              helpId="creator-step-publish"
            />
            <button
              onClick={() => leaveGlobalViewForProject("upload")}
              className="w-full bg-gold-500 text-zinc-950 font-bold py-3 rounded-xl text-xs"
            >
              Abrir Upload
            </button>
            <button
              onClick={() => setCreatorStep(6)}
              className="text-xs text-zinc-500"
            >
              ← Metadados
            </button>
          </div>
        )}

        {/* Optional: Script Master Strategy Details Panel */}

        {generatedScriptData && (
          <div className="glass-panel p-6 rounded-3xl mt-8 space-y-6 font-sans">
            {(() => {
              const longTitles = warnLongListicleTitles(
                (generatedScriptData.list_items || []).map(
                  (it: { title?: string; name?: string }) =>
                    String(it.title || it.name || "")
                )
              );
              if (!longTitles.length) return null;
              return (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-4">
                  <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wide">
                    Títulos longos para o HUD
                  </p>
                  <ul className="mt-2 space-y-1">
                    {longTitles.map((entry) => (
                      <li
                        key={`long-title-${entry.index}`}
                        className="text-[10px] text-amber-200/90 leading-relaxed"
                      >
                        Item {entry.index + 1}: {entry.title.length} caracteres
                        — encurte antes do render
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            <SectionHeader
              title="ESTRATÉGIA DO ROTEIRO (SCRIPT MASTER OUTPUT)"
              helpId="creator-script-strategy"
              className="border-b border-zinc-900 pb-2"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-300">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block">
                    Título Principal
                  </span>
                  <p className="text-white font-bold text-sm mt-1">
                    {generatedScriptData.strategy?.title_main || ""}
                  </p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">
                    Ancorado no roteiro — específico, sem clickbait genérico
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Variações de Título
                  </span>

                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    {(generatedScriptData.strategy?.title_variations || []).map(
                      (v: string, i: number) => (
                        <li key={i}>{v}</li>
                      )
                    )}
                  </ul>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Gancho de Retenção (Hook)
                  </span>

                  <p className="italic text-gray-300 mt-1">
                    "{generatedScriptData.strategy?.hook || ""}"
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      Checklist de Qualidade
                    </span>
                    <button
                      type="button"
                      disabled={creatorLoading}
                      onClick={handleEvaluateScriptChecklist}
                      className="text-[9px] font-bold uppercase tracking-wider text-gold-400 border border-gold-500/30 hover:bg-gold-500/10 disabled:opacity-50 px-2 py-1 rounded-lg cursor-pointer"
                    >
                      {creatorLoading && creatorLoadingMode === "full"
                        ? "Avaliando..."
                        : "Avaliar"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-center font-mono">
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                      <span className="text-[8px] text-zinc-500 block">
                        CLIQUE
                      </span>

                      <span className="text-gold-500 font-bold text-xs">
                        {generatedScriptData.checklist?.click_potential || 0}/10
                      </span>
                    </div>

                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                      <span className="text-[8px] text-zinc-500 block">
                        RETENÇÃO
                      </span>

                      <span className="text-gold-500 font-bold text-xs">
                        {generatedScriptData.checklist?.retention_potential ||
                          0}
                        /10
                      </span>
                    </div>

                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-900">
                      <span className="text-[8px] text-zinc-500 block">
                        COMENTÁRIOS
                      </span>

                      <span className="text-gold-500 font-bold text-xs">
                        {generatedScriptData.checklist?.comments_potential || 0}
                        /10
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    Recomendações IA
                  </span>

                  <p className="mt-1 leading-relaxed text-gray-400">
                    {generatedScriptData.checklist?.feedback ||
                      (generatedScriptData.checklist?.click_potential
                        ? ""
                        : "Clique em Avaliar para gerar notas e recomendações.")}
                  </p>
                </div>

                {Array.isArray(generatedScriptData.checklist?.corrections) &&
                  generatedScriptData.checklist.corrections.length > 0 && (
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                        Correções
                      </span>
                      <ul className="mt-1 space-y-1 list-disc pl-4 text-gray-400">
                        {generatedScriptData.checklist.corrections.map(
                          (item: string, i: number) => (
                            <li key={i}>{item}</li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
              </div>
            </div>

            <CreatorProductionPlanPanel storyboard={generatedScriptData} />

            <GeoVideoWizardPanel
              motionScenes={generatedScriptData?.motion_scenes}
              getProjectUrl={getProjectUrl}
              getAssetUrl={getAssetUrl}
              copyToClipboard={copyToClipboard}
              copiedSection={copiedSection}
              onMotionScenesChange={handleMotionScenesChange}
              onStudioSynced={() => fetchData()}
            />

            {generatedScriptData.visual_prompts &&
              (generatedScriptData?.visual_prompts || []).length > 0 && (
                <div className="border-t border-zinc-900 pt-6 space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <SectionHeader
                        title="ROTEIRO COMPLETO POR BLOCOS"
                        helpId="creator-blocks"
                        size="sm"
                        subtitle="Narração e prompt visual editáveis. A duração (segundos) de cada cena só aparece após narração (passo 2) + Whisper (passo 3) — calculada 100% da voz, sem estimativa."
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {(generatedScriptData?.visual_prompts || []).length >
                        0 && (
                        <button
                          type="button"
                          disabled={creatorLoading}
                          onClick={handleEnhanceVisualPrompts}
                          className={`bg-purple-500/15 hover:bg-purple-500/30 border ${
                            creatorScenesNeedRepair
                              ? "border-amber-500/50 text-amber-200"
                              : "border-purple-500/30 text-purple-200"
                          } disabled:opacity-50 text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider cursor-pointer transition-all`}
                          title={
                            creatorScenesNeedRepair
                              ? "Aviso: Suas cenas precisam ser alinhadas/reparadas. Use a Engenharia Visual PRO para corrigir e aprimorar tudo."
                              : "Reprocessa todos os prompts visuais com engenharia de nível profissional: detecção de nicho, texto PT-BR, aspect ratio, chain of thought"
                          }
                        >
                          {creatorLoading && creatorLoadingMode === "full"
                            ? "✨ Processando..."
                            : "✨ Engenharia Visual PRO"}
                        </button>
                      )}
                      <span className="bg-gold-500/10 border border-gold-500/20 text-gold-500 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider font-mono">
                        {(generatedScriptData?.visual_prompts || []).length}{" "}
                        cenas
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 font-sans">
                    {(() => {
                      const promptsByBlock: Record<number, any[]> = {};

                      (generatedScriptData?.visual_prompts || []).forEach(
                        (vp: any) => {
                          const b = parseCreatorBlockNumber(
                            vp?.block ?? vp?.bloco,
                            vp?.scene ?? vp?.cena
                          );

                          if (!promptsByBlock[b]) promptsByBlock[b] = [];

                          promptsByBlock[b].push(vp);
                        }
                      );

                      const blockPhrases =
                        generatedScriptData?.technical_config?.block_phrases ||
                        [];
                      const expectedBlocks =
                        blockPhrases.length > 0
                          ? blockPhrases.length
                          : formatSelector === "SHORTS"
                            ? 5
                            : 12;
                      for (let i = 1; i <= expectedBlocks; i += 1) {
                        if (!promptsByBlock[i]) promptsByBlock[i] = [];
                      }

                      const sortedBlocks = Object.keys(promptsByBlock)
                        .map(Number)
                        .sort((a, b) => a - b);

                      return sortedBlocks.map((blockNum) => {
                        const blockPrompts = promptsByBlock[blockNum];

                        const blockTiming = getBlockTimingSummary(
                          generatedScriptData?.visual_prompts || [],
                          blockNum,
                          2,
                          wordTranscripts,
                          status
                        );

                        const blockKey = String(blockNum);

                        const isExpanded = !!expandedBlocks[blockNum];

                        return (
                          <div
                            key={blockNum}
                            className="glass-panel rounded-2xl border border-zinc-900/60 overflow-hidden transition-all duration-300"
                          >
                            <div
                              onClick={() =>
                                setExpandedBlocks((prev) => ({
                                  ...prev,
                                  [blockNum]: !prev[blockNum],
                                }))
                              }

                              className="flex justify-between items-center p-4 bg-zinc-950/40 hover:bg-zinc-900/20 cursor-pointer transition select-none border-b border-zinc-900/40"
                            >
                              <div className="flex items-center gap-3">
                                <span className="bg-gold-500 text-zinc-950 text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md">
                                  BLOCO{" "}
                                  {String(Math.floor(blockNum)).padStart(
                                    2,
                                    "0"
                                  )}
                                </span>

                                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                  <span className="font-semibold">
                                    {blockPrompts.length} cenas
                                  </span>

                                  <span>•</span>

                                  {blockTiming.sceneSeconds != null ? (
                                    <>
                                      <span className="text-emerald-400">
                                        {blockTiming.sceneSeconds}s (+
                                        {blockTiming.gapSeconds}s gap)
                                      </span>
                                      <span>=</span>
                                      <span className="text-emerald-400 font-bold">
                                        {blockTiming.totalSeconds}s total
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-zinc-500 italic">
                                      duração após Whisper (passo 3)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-zinc-500 text-xs font-mono transition-transform duration-300">
                                {isExpanded ? "▲ Recolher" : "▼ Expandir"}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="p-4 space-y-5 bg-zinc-950/20 divide-y divide-zinc-900/60">
                                {blockPrompts.map(
                                  (vp: any, localIdx: number) => {
                                    const absoluteIndex = (
                                      generatedScriptData?.visual_prompts || []
                                    ).indexOf(vp);

                                    const sceneNum =
                                      vp?.scene || absoluteIndex + 1;

                                    const isVideo =
                                      vp?.type
                                        ?.toLowerCase()
                                        ?.includes("vídeo") ||
                                      vp?.type
                                        ?.toLowerCase()
                                        ?.includes("video") ||
                                      false;

                                    const isRemotionScene =
                                      String(
                                        vp?.media_mode || ""
                                      ).toLowerCase() === "remotion" ||
                                      Boolean(vp?.motion_template_id);

                                    const searchQuery = resolveStockSearchQuery(
                                      vp,
                                      {
                                        strategyTitle:
                                          generatedScriptData?.strategy
                                            ?.title_main || "",
                                        projectTitle: customTitle?.trim() || "",
                                      }
                                    );

                                    const sceneDurationSeconds =
                                      getSceneDurationSeconds(
                                        vp,
                                        wordTranscripts,
                                        blockNum,
                                        localIdx,
                                        status,
                                        blockPrompts
                                      );
                                    const durationFromWhisper =
                                      sceneDurationSeconds != null;

                                    const assetIdx = localIdx;

                                    const isUploaded =
                                      uploadedScenes[
                                        `${blockKey}:${assetIdx}`
                                      ] ||
                                      (config &&
                                        config.timeline_assets &&
                                        config.timeline_assets[blockKey] &&
                                        config.timeline_assets[blockKey][
                                          assetIdx
                                        ] &&
                                        config.timeline_assets[blockKey][
                                          assetIdx
                                        ].asset) ||
                                      vp.asset?.asset;

                                    const currentAsset =
                                      vp.asset ||
                                      config?.timeline_assets?.[blockKey]?.[
                                        assetIdx
                                      ];

                                    const assetUsedIn = currentAsset?.asset
                                      ? (
                                          generatedScriptData?.visual_prompts ||
                                          []
                                        ).reduce(
                                          (
                                            usedIn: string[],
                                            item: any,
                                            itemIndex: number
                                          ) => {
                                            const itemBlock = item?.block || 1;

                                            const itemBlockKey =
                                              String(itemBlock);

                                            let itemAssetIdx = 0;

                                            for (
                                              let prevIdx = 0;
                                              prevIdx < itemIndex;
                                              prevIdx++
                                            ) {
                                              if (
                                                ((generatedScriptData?.visual_prompts ||
                                                  [])[prevIdx]?.block || 1) ===
                                                itemBlock
                                              ) {
                                                itemAssetIdx++;
                                              }
                                            }

                                            const itemAsset =
                                              item.asset ||
                                              config?.timeline_assets?.[
                                                itemBlockKey
                                              ]?.[itemAssetIdx];

                                            if (
                                              itemAsset?.asset ===
                                              currentAsset.asset
                                            ) {
                                              usedIn.push(
                                                String(
                                                  item?.scene || itemIndex + 1
                                                )
                                              );
                                            }

                                            return usedIn;
                                          },
                                          []
                                        )
                                      : [];

                                    return (
                                      <div
                                        key={absoluteIndex}
                                        className={`pt-4 first:pt-0 flex flex-col lg:flex-row gap-4 ${localIdx > 0 ? "mt-4" : ""}`}
                                      >
                                        <div className="flex-1 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`font-mono text-xs font-bold ${isUploaded ? "text-green-400" : "text-zinc-500"}`}
                                              >
                                                Cena {sceneNum}
                                              </span>

                                              {isRemotionScene ? (
                                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-violet-500/15 border border-violet-500/35 text-violet-200">
                                                  🟣 Remotion
                                                  {vp?.motion_template_id
                                                    ? ` · ${vp.motion_template_id}`
                                                    : ""}
                                                  {vp?.production
                                                    ?.template_props
                                                    ?.template_studio_fallback
                                                    ? " · fallback nativo"
                                                    : ""}
                                                  {Number(
                                                    vp?.production
                                                      ?.template_props
                                                      ?.template_studio_pick_score
                                                  ) > 0
                                                    ? ` · Studio ${Math.round(Number(vp.production.template_props.template_studio_pick_score))}`
                                                    : ""}
                                                </span>
                                              ) : (
                                                <span
                                                  className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                    isVideo
                                                      ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                                                      : "bg-gold-500/10 border border-gold-500/20 text-gold-500"
                                                  }`}
                                                >
                                                  {vp?.type || "imagem IA 2k"}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                                                  durationFromWhisper
                                                    ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                                                    : "text-zinc-500 border-zinc-800 bg-zinc-900/60"
                                                }`}
                                              >
                                                {durationFromWhisper
                                                  ? "Voz (Whisper)"
                                                  : "Whisper"}
                                              </span>

                                              <div
                                                className={`flex items-center border rounded-lg px-2 py-0.5 min-w-[3.5rem] justify-end ${
                                                  durationFromWhisper
                                                    ? "bg-emerald-500/5 border-emerald-500/25"
                                                    : "bg-zinc-950 border-zinc-850"
                                                }`}
                                                title={
                                                  durationFromWhisper
                                                    ? "Segundos reais desta frase na narração (Whisper)"
                                                    : "Rode narração (passo 2) e Whisper (passo 3) para calcular os segundos"
                                                }
                                              >
                                                <span
                                                  className={`text-xs font-mono tabular-nums ${
                                                    durationFromWhisper
                                                      ? "text-emerald-300"
                                                      : "text-zinc-600"
                                                  }`}
                                                >
                                                  {durationFromWhisper
                                                    ? sceneDurationSeconds
                                                    : "—"}
                                                </span>
                                                <span className="text-[10px] text-zinc-500 ml-1 font-mono">
                                                  s
                                                </span>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                              NARRACAO DA CENA
                                            </label>

                                            <textarea
                                              rows={2}

                                              value={
                                                vp?.narration_text ||
                                                vp?.narration_excerpt ||
                                                ""
                                              }

                                              onChange={(e) =>
                                                handleUpdateCreatorScene(
                                                  absoluteIndex,
                                                  "narration_text",
                                                  e.target.value
                                                )
                                              }

                                              className="bg-zinc-950/80 border border-zinc-850 rounded-xl text-xs text-white p-2.5 w-full focus:border-gold-500/50 focus:outline-none transition leading-relaxed font-sans"

                                              placeholder="Digite a narração da cena..."
                                            />
                                          </div>
                                        </div>

                                        <div className="w-full lg:w-[420px] shrink-0 space-y-3">
                                          <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                              <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                                PROMPT VISUAL IA
                                              </label>

                                              <button
                                                onClick={() =>
                                                  copyToClipboard(
                                                    vp?.prompt || "",
                                                    `prompt-${absoluteIndex}`
                                                  )
                                                }

                                                className="text-[9px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
                                              >
                                                {copiedSection ===
                                                `prompt-${absoluteIndex}` ? (
                                                  <span className="text-emerald-500 font-bold">
                                                    OK
                                                  </span>
                                                ) : (
                                                  <span>Copiar</span>
                                                )}
                                              </button>
                                            </div>

                                            <textarea
                                              rows={2}

                                              value={vp?.prompt || ""}

                                              onChange={(e) =>
                                                handleUpdateCreatorScene(
                                                  absoluteIndex,
                                                  "prompt",
                                                  e.target.value
                                                )
                                              }

                                              className="bg-zinc-950/80 border border-zinc-850 rounded-xl text-[11px] text-zinc-300 italic p-2.5 w-full focus:border-gold-500/50 focus:outline-none transition leading-normal font-sans"

                                              placeholder="Descreva o prompt visual..."
                                            />
                                          </div>

                                          {currentAsset?.asset && (
                                            <div className="flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-950/80 p-2.5">
                                              <div className="w-20 h-14 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-850 shrink-0 flex items-center justify-center">
                                                {currentAsset.type ===
                                                "video" ? (
                                                  <video
                                                    src={getAssetUrl(
                                                      currentAsset.asset
                                                    )}

                                                    className="w-full h-full object-cover"

                                                    muted

                                                    playsInline

                                                    preload="metadata"
                                                  />
                                                ) : (
                                                  <img
                                                    src={getAssetUrl(
                                                      currentAsset.asset
                                                    )}

                                                    className="w-full h-full object-cover"

                                                    alt=""

                                                    loading="lazy"
                                                  />
                                                )}
                                              </div>

                                              <div className="min-w-0 flex-1 space-y-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                  <span
                                                    className="text-[10px] text-white font-semibold truncate"
                                                    title={currentAsset.asset}
                                                  >
                                                    {currentAsset.asset}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md">
                                                    Cenas:{" "}
                                                    {assetUsedIn.join(", ") ||
                                                      sceneNum}
                                                  </span>

                                                  <button
                                                    type="button"

                                                    onClick={() =>
                                                      handleRemoveSceneAsset(
                                                        blockKey,
                                                        assetIdx
                                                      )
                                                    }

                                                    className="text-[9px] text-red-400 hover:text-red-300 font-bold transition"
                                                  >
                                                    Excluir
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-1.5 pt-1">
                                            <a
                                              href={`https://www.pexels.com/search/${isVideo ? "videos/" : ""}${encodeURIComponent(searchQuery)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"

                                              className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <span>Pexels</span>
                                            </a>

                                            <a
                                              href={
                                                isVideo
                                                  ? `https://pixabay.com/videos/search/${encodeURIComponent(searchQuery)}/`
                                                  : `https://pixabay.com/images/search/${encodeURIComponent(searchQuery)}/`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"

                                              className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <span>Pixabay</span>
                                            </a>

                                            {!isVideo && (
                                              <a
                                                href={`https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                              >
                                                <span>Bing</span>
                                              </a>
                                            )}

                                            <a
                                              href={`https://www.canva.com/search?q=${encodeURIComponent(searchQuery)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"

                                              className="bg-zinc-900 border border-zinc-850 text-[9px] text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                                            >
                                              <span>Canva</span>
                                            </a>

                                            <input
                                              type="file"

                                              accept={
                                                isVideo
                                                  ? "video/mp4"
                                                  : "image/png,image/jpeg,image/jpg"
                                              }

                                              onChange={(e) => {
                                                if (
                                                  e.target.files &&
                                                  e.target.files[0]
                                                ) {
                                                  handleUploadSceneAsset(
                                                    blockNum,
                                                    isVideo ? "video" : "image",
                                                    e.target.files[0],
                                                    assetIdx
                                                  );
                                                }
                                              }}

                                              className="hidden"

                                              id={`scene-upload-${absoluteIndex}`}
                                            />

                                            <label
                                              htmlFor={`scene-upload-${absoluteIndex}`}

                                              className={`border px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 transition cursor-pointer ml-auto ${
                                                isUploaded
                                                  ? "bg-green-500/10 border-green-500/20 text-green-400 hover:text-green-300"
                                                  : "bg-zinc-900 border-zinc-850 text-zinc-400 hover:text-white"
                                              }`}
                                            >
                                              <span>
                                                {currentAsset?.asset
                                                  ? "Trocar"
                                                  : isUploaded
                                                    ? "Enviado"
                                                    : "Upload"}
                                              </span>
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            <div className="border-t border-zinc-900 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider font-sans">
                  ROTEIRO COMPLETO (NARRAÇÃO LIMPA)
                </span>

                <button
                  onClick={() =>
                    copyToClipboard(
                      generatedScriptData.narrative_script || "",
                      "narrative_script"
                    )
                  }

                  className="bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedSection === "narrative_script" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}

                  <span>
                    {copiedSection === "narrative_script"
                      ? "Copiado!"
                      : "Copiar Narração Limpa"}
                  </span>
                </button>
              </div>

              <pre className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-[10px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap select-text leading-relaxed">
                {generatedScriptData.narrative_script || ""}
              </pre>
            </div>

            {(generatedScriptData.narrative_script || "").trim() && (
              <div className="border-t border-zinc-900 pt-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider font-sans flex items-center gap-2">
                      NARRACAO COM TAGS PARA TTS
                    </span>

                    <p className="text-[10px] text-zinc-500 mt-1">
                      Tags por frase com pausas em viradas, numeros e gancho —
                      usa a narracao taggeada do roteiro quando disponivel.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanNarration =
                        generatedScriptData?.narrative_script || "";
                      const taggedScript =
                        generatedScriptData?.narrative_script_tagged || "";
                      if (!cleanNarration && !taggedScript) {
                        toast("Gere o roteiro primeiro.");
                        return;
                      }
                      setTaggedNarrations({
                        fish: buildTaggedNarration(cleanNarration, "fish", {
                          taggedScript,
                        }),
                        eleven: buildTaggedNarration(cleanNarration, "eleven", {
                          taggedScript,
                        }),
                        minimax: buildTaggedNarration(
                          cleanNarration,
                          "minimax",
                          { taggedScript }
                        ),
                      });
                      toast("Tags TTS regeneradas.");
                    }}
                    className="text-[9px] font-bold text-purple-300 border border-purple-500/30 hover:border-purple-500/50 px-2.5 py-1.5 rounded-lg transition cursor-pointer shrink-0"
                  >
                    Regenerar tags
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  {(
                    ["fish", "eleven", "minimax"] as TaggedNarrationPlatform[]
                  ).map((platform) => {
                    const meta = taggedNarrationMeta[platform];

                    return (
                      <div
                        key={platform}
                        className={`rounded-xl border p-3 space-y-3 ${meta.borderClass}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h5
                              className={`text-[10px] font-bold uppercase tracking-wider font-sans ${meta.accentClass}`}
                            >
                              {meta.title}
                            </h5>

                            <span className="text-[9px] text-zinc-500">
                              {meta.subtitle}
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              copyToClipboard(
                                taggedNarrations[platform],
                                `tagged-${platform}`
                              )
                            }

                            className="bg-zinc-950 border border-zinc-800 text-gray-400 hover:text-white px-2.5 py-1 rounded-lg text-[9px] flex items-center gap-1 transition cursor-pointer shrink-0"
                          >
                            {copiedSection === `tagged-${platform}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}

                            <span>
                              {copiedSection === `tagged-${platform}`
                                ? "Copiado!"
                                : "Copiar"}
                            </span>
                          </button>
                        </div>

                        <textarea
                          value={taggedNarrations[platform]}

                          onChange={(e) =>
                            setTaggedNarrations((prev) => ({
                              ...prev,
                              [platform]: e.target.value,
                            }))
                          }

                          className="w-full min-h-[220px] bg-zinc-950/80 border border-zinc-800 focus:border-gold-500 focus:outline-none rounded-lg p-3 text-[10px] font-mono text-gray-300 leading-relaxed resize-y"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashminPageLayout>
  );
}
