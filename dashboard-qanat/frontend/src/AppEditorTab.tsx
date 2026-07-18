import toast from "react-hot-toast";
import React, { Suspense } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { DashminProjectTabLayout } from "./DashminProjectTabLayout";
import { SectionHeader } from "./SectionHeader";
import { ProjectYoutubeCard } from "./ProjectYoutubeCard";
import { PostPublishChecklist } from "./PostPublishChecklist";
import { NarrationChunksPanel } from "./NarrationChunksPanel";
import { NarrationReplacePanel } from "./NarrationReplacePanel";
import { TtsVoiceStudioPanel } from "./TtsVoiceStudioPanel";
import { TimelineClipPreview } from "./TimelineClipPreview";
import { JsonTreeView } from "./JsonTreeView";
import { LazyLumieraDubPanel } from "./appLazyPanels";
import { getSceneDurationSeconds } from "./sceneSpeechDuration";
import type { AppTab } from "./appTabs";
import type { ConfigData, WorkspaceStatus } from "./appTypes";
import type { ProjectListItem } from "./ProjectsLibraryPanel";

export type EditorSubTab = "script" | "json" | "assets" | "narration" | "dub";

export type AppEditorTabProps = {
  activeProject: string;
  addSceneAtEnd: () => void;
  config: ConfigData | null;
  copiedSection: string | null;
  copyToClipboard: (text: string, section: string) => void;
  debounceSaveStoryboard: (data: any) => void;
  deleteScene: (idx: number) => void;
  editorSubTab: EditorSubTab;
  fetchData: () => void | Promise<void>;
  generatingOverlays: boolean;
  getAssetDuration: (blockKey: string, assetIdx: number) => number | undefined;
  getAssetUrl: (fileName: string) => string;
  getMusicUrl: (fileName: string, projectOverride?: string) => string;
  getProjectUrl: (path: string) => string;
  getTotalVideoDuration: () => number;
  handleGenerateAiOverlays: () => void | Promise<void>;
  handleNotebooklmImprove: () => void | Promise<void>;
  handleSaveStoryboard: () => void | Promise<void>;
  handleUploadSceneAsset: (
    blockNum: number,
    type: string,
    file: File,
    assetIdx: number,
    projectOverride?: string
  ) => void | Promise<void>;
  hasApiKey: boolean;
  insertSceneAfter: (idx: number) => void;
  loadEditorProject: () => void | Promise<void>;
  loadingStoryboard: boolean;
  moveScene: (idx: number, dir: "up" | "down") => void;
  notebooklmImproving: boolean;
  notebooklmStatus: any;
  notebooklmSuggestions: string | null;
  projects: ProjectListItem[];
  renderRichTimelineEditor: (opts?: {
    hideAutoMap?: boolean;
    wizardManualMode?: boolean;
  }) => React.ReactNode;
  saveConfigPatch: (
    patch: Partial<ConfigData>,
    opts?: { skipRefresh?: boolean }
  ) => void | Promise<void>;
  saveCreatorStoryboard: (data: any) => void | Promise<void>;
  selectedProject: string;
  setActiveTab: (tab: AppTab) => void;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setEditorSubTab: (tab: EditorSubTab) => void;
  setSelectedProject: (v: string) => void;
  setStoryboardData: React.Dispatch<React.SetStateAction<any>>;
  setVideoFileDurations: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >;
  status: WorkspaceStatus | null;
  storyboardData: any;
  titleExperimentVideoId: string | null;
  updateSceneField: (idx: number, field: string, value: any) => void;
  videoFileDurations: Record<string, number>;
  wordTranscripts: any;
};

export function AppEditorTab({
  activeProject,
  addSceneAtEnd,
  config,
  copiedSection,
  copyToClipboard,
  debounceSaveStoryboard,
  deleteScene,
  editorSubTab,
  fetchData,
  generatingOverlays,
  getAssetDuration,
  getAssetUrl,
  getMusicUrl,
  getProjectUrl,
  getTotalVideoDuration,
  handleGenerateAiOverlays,
  handleNotebooklmImprove,
  handleSaveStoryboard,
  handleUploadSceneAsset,
  hasApiKey,
  insertSceneAfter,
  loadEditorProject,
  loadingStoryboard,
  moveScene,
  notebooklmImproving,
  notebooklmStatus,
  notebooklmSuggestions,
  projects,
  renderRichTimelineEditor,
  saveConfigPatch,
  saveCreatorStoryboard,
  selectedProject,
  setActiveTab,
  setConfig,
  setEditorSubTab,
  setSelectedProject,
  setStoryboardData,
  setVideoFileDurations,
  status,
  storyboardData,
  titleExperimentVideoId,
  updateSceneField,
  videoFileDurations,
  wordTranscripts,
}: AppEditorTabProps) {
  return (
    <DashminProjectTabLayout tab="editor" activeProject={activeProject}>
      <div className="lumiera-panel-stack font-sans">
        <div className="glass-panel p-3 rounded-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-gold-500 min-w-[200px] flex-1 max-w-xs"
            >
              <option value="">Selecione um projeto...</option>
              {projects.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadEditorProject}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-xl cursor-pointer"
            >
              Carregar
            </button>
            {config && (
              <span className="text-[10px] text-zinc-500 font-mono ml-auto flex items-center gap-1.5 bg-zinc-950/40 px-2.5 py-1.5 rounded-lg border border-zinc-900">
                <span className="uppercase font-bold tracking-wider">
                  Duração
                </span>
                <span className="text-gold-500 font-bold">
                  {getTotalVideoDuration().toFixed(1)}s
                </span>
              </span>
            )}
          </div>

          {titleExperimentVideoId && selectedProject && (
            <details className="lumiera-collapsible-section rounded-xl">
              <summary>YouTube pós-publicação</summary>
              <div className="lumiera-collapsible-body space-y-3">
                <ProjectYoutubeCard
                  projectName={selectedProject}
                  videoId={titleExperimentVideoId}
                  toast={toast}
                  onOpenYoutubePanel={() => setActiveTab("youtube-studio")}
                />
                <PostPublishChecklist
                  projectName={selectedProject}
                  videoId={titleExperimentVideoId}
                  toast={toast}
                />
              </div>
            </details>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="editor-subtab-bar">
            {(
              [
                ["script", "Roteiro"],
                ["json", "JSON"],
                ["assets", "Timeline"],
                ["narration", "Narração"],
                ["dub", "Dublagem"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setEditorSubTab(id)}
                className={`editor-subtab-pill ${
                  editorSubTab === id
                    ? "editor-subtab-pill--active"
                    : "editor-subtab-pill--idle"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {editorSubTab === "assets" && config && renderRichTimelineEditor()}

        {editorSubTab === "dub" && config && (
          <div className="glass-panel p-6 rounded-3xl max-w-4xl">
            <Suspense
              fallback={
                <div className="text-zinc-500 text-sm py-8 text-center">
                  Carregando dublagem...
                </div>
              }
            >
              <LazyLumieraDubPanel
                getProjectUrl={getProjectUrl}
                getMediaUrl={getMusicUrl}
                toast={(msg) => toast(msg)}
                onComplete={() => fetchData()}
              />
            </Suspense>
          </div>
        )}

        {editorSubTab === "narration" && config && (
          <div className="glass-panel p-6 rounded-3xl max-w-4xl space-y-6">
            {selectedProject && selectedProject !== activeProject && (
              <div className="text-[10px] px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-amber-200">
                Projeto no seletor ({selectedProject}) difere do ativo (
                {activeProject}). Clique <strong>Carregar Projeto</strong> antes
                de ouvir ou editar.
              </div>
            )}
            <NarrationChunksPanel
              getProjectUrl={getProjectUrl}
              getMediaUrl={(file) => getMusicUrl(file, activeProject)}
              toast={(msg) => toast(msg)}
              hasApiKey={hasApiKey}
              narrationMode={config.narration_mode || "master"}
              plan={storyboardData?.narration_chunk_plan || null}
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
                if (!storyboardData) return;
                setStoryboardData({
                  ...storyboardData,
                  narration_chunk_plan: plan,
                });
              }}
              onUpdated={() => fetchData()}
            />
            <NarrationReplacePanel
              getProjectUrl={getProjectUrl}
              getMediaUrl={(file) => getMusicUrl(file, activeProject)}
              toast={(msg) => toast(msg)}
              hasNarration={!!status?.has_narration}
              hasTimings={!!status?.block_timings}
              onUpdated={() => fetchData()}
              narrativeScript={storyboardData?.narrative_script || ""}
              onNarrativeChange={(value) => {
                if (!storyboardData) return;
                const next = { ...storyboardData, narrative_script: value };
                setStoryboardData(next);
                debounceSaveStoryboard(next);
              }}
              onSaveScript={() => {
                if (storyboardData) saveCreatorStoryboard(storyboardData);
                toast.success("Texto da narração salvo no storyboard.");
              }}
              showScriptEdit={!!storyboardData}
            />
            {config.narration_mode !== "chunked" && (
              <TtsVoiceStudioPanel
                getProjectUrl={getProjectUrl}
                toast={(msg) => toast(msg)}
                narrativeScript={storyboardData?.narrative_script || ""}
                taggedScript={storyboardData?.narrative_script_tagged || ""}
                onUpdated={() => fetchData()}
                onTaggedScriptChange={(value) => {
                  if (!storyboardData) return;
                  const next = {
                    ...storyboardData,
                    narrative_script_tagged: value,
                  };
                  setStoryboardData(next);
                  debounceSaveStoryboard(next);
                }}
              />
            )}
            {config.narration_mode === "chunked" && (
              <p className="text-[10px] text-zinc-500 border border-zinc-800 rounded-xl p-3">
                Modo por trechos ativo — use o painel acima para planejar,
                ajustar pausas/narrador e gerar cada parte. O MP3 master é
                montado automaticamente com os silêncios entre trechos.
              </p>
            )}
          </div>
        )}

        {editorSubTab === "script" && (
          <div className="space-y-6">
            {/* Action buttons row at the top */}

            <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
              <div>
                <SectionHeader
                  title="Visualizador e Editor de Roteiro"
                  helpId="editor-script"
                  size="sm"
                  titleClassName="tracking-wider uppercase text-xs"
                  subtitle="Altere falas de narração, prompts visuais, reordene cenas ou adicione novas."
                />
                {notebooklmSuggestions && (
                  <p
                    className="text-[9px] text-indigo-300/80 mt-1 max-w-md line-clamp-2"
                    title={notebooklmSuggestions}
                  >
                    Última pesquisa NotebookLM aplicada ao roteiro.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleNotebooklmImprove}
                  disabled={
                    notebooklmImproving || !storyboardData?.narrative_script
                  }
                  title={
                    notebooklmStatus?.message ||
                    "Enriquecer roteiro com pesquisa NotebookLM"
                  }
                  className="bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 disabled:opacity-40 text-indigo-200 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {notebooklmImproving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Enriquecer com NotebookLM
                </button>

                <button
                  onClick={addSceneAtEnd}

                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Cena no Fim
                </button>

                <button
                  onClick={handleSaveStoryboard}

                  className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-[10px] font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Salvar Roteiro
                </button>
              </div>
            </div>

            {loadingStoryboard ? (
              <div className="text-center py-12 text-zinc-500 italic">
                Carregando roteiro do projeto...
              </div>
            ) : !storyboardData ||
              !storyboardData.visual_prompts ||
              storyboardData.visual_prompts.length === 0 ? (
              <div className="glass-panel p-8 text-center text-zinc-500 italic rounded-3xl">
                Nenhum storyboard ou roteiro estruturado (storyboard.json)
                encontrado para este projeto.
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setStoryboardData({
                        strategy: {
                          title_main: "",
                          title_variations: [],
                          hook: "",
                          target_audience: "",
                          tone: "",
                          pinned_comment: "",
                          cta: "",
                        },

                        narrative_script: "",

                        narrative_script_tagged: "",

                        visual_prompts: [
                          {
                            scene: "1.1",

                            block: 1,

                            narration_text: "Inicie o roteiro aqui...",

                            type: "imagem IA 2k",

                            prompt:
                              "Cinematic photorealistic image, 2k resolution",

                            editor_notes: "",

                            stock_query: "",
                          },
                        ],

                        checklist: {
                          click_potential: 0,
                          retention_potential: 0,
                          comments_potential: 0,
                          feedback: "",
                        },
                      });
                    }}

                    className="bg-zinc-900 border border-zinc-800 text-[10px] px-3 py-1.5 rounded hover:bg-zinc-800 text-white transition"
                  >
                    Inicializar Rascunho de Roteiro
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {storyboardData.visual_prompts.map((vp: any, idx: number) => (
                  <div
                    key={idx}
                    className="glass-panel p-5 rounded-2xl border border-zinc-900 hover:border-zinc-850 transition space-y-4"
                  >
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold bg-zinc-950 border border-zinc-900 px-2 py-1 rounded text-zinc-500">
                          Cena {idx + 1}
                        </span>

                        <span className="text-[10px] text-zinc-400 font-mono">
                          ID: {vp.scene}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Bloco:
                        </span>

                        <input
                          type="number"

                          min="1"

                          max="12"

                          value={vp.block || 1}

                          onChange={(e) =>
                            updateSceneField(
                              idx,
                              "block",
                              parseInt(e.target.value) || 1
                            )
                          }

                          className="bg-zinc-950 border border-zinc-900 text-center w-12 py-0.5 rounded text-[10px] text-white"
                        />
                      </div>
                    </div>

                    {(() => {
                      const blockNum = vp.block || 1;

                      const blockKey = String(blockNum);

                      // Find the corresponding asset index in this block

                      let assetIdx = 0;

                      if (storyboardData && storyboardData.visual_prompts) {
                        for (let i = 0; i < idx; i++) {
                          if (
                            (storyboardData.visual_prompts[i].block || 1) ===
                            blockNum
                          ) {
                            assetIdx++;
                          }
                        }
                      }

                      const correspondingAsset =
                        config?.timeline_assets?.[blockKey]?.[assetIdx];

                      return (
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Left Column: Visual Asset Preview & Upload */}

                          <div className="w-full lg:w-48 shrink-0 space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                              Visual da Cena
                            </label>

                            <div className="relative w-full group/preview">
                              {correspondingAsset &&
                              correspondingAsset.asset ? (
                                <>
                                  <TimelineClipPreview
                                    compact
                                    asset={correspondingAsset}
                                    getAssetUrl={getAssetUrl}
                                    aspectRatio={config?.aspect_ratio}
                                    canvasBackground={
                                      config?.canvas_background || "#050506"
                                    }
                                    clipDuration={getAssetDuration(
                                      blockKey,
                                      assetIdx
                                    )}
                                    sourceDuration={
                                      videoFileDurations[
                                        correspondingAsset.asset
                                      ]
                                    }
                                    onSourceDuration={(path, dur) => {
                                      setVideoFileDurations((prev) =>
                                        prev[path] === dur
                                          ? prev
                                          : { ...prev, [path]: dur }
                                      );
                                    }}
                                  />

                                  <div className="absolute inset-0 z-10 bg-black/60 opacity-0 group-hover/preview:opacity-100 transition flex items-center justify-center gap-2 rounded-xl">
                                    <input
                                      type="file"

                                      accept="image/png,image/jpeg,video/mp4"

                                      className="hidden"

                                      id={`storyboard-upload-${idx}`}

                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files[0]
                                        ) {
                                          const file = e.target.files[0];
                                          const isVideo =
                                            file.name.endsWith(".mp4") ||
                                            file.name.endsWith(".webm") ||
                                            file.name.endsWith(".mov") ||
                                            file.type.startsWith("video/");
                                          handleUploadSceneAsset(
                                            blockNum,
                                            isVideo ? "video" : "image",
                                            file,
                                            assetIdx,
                                            selectedProject
                                          );
                                        }
                                      }}
                                    />

                                    <label
                                      htmlFor={`storyboard-upload-${idx}`}

                                      className="text-gold-500 hover:text-gold-400 text-[10px] cursor-pointer font-bold bg-zinc-900 border border-zinc-800 rounded px-2 py-1 transition flex items-center gap-1"
                                    >
                                      <Upload className="w-3 h-3" /> Substituir
                                    </label>
                                  </div>
                                </>
                              ) : (
                                <div className="text-[9px] text-zinc-500 text-center px-2 flex flex-col items-center gap-1.5">
                                  <span>Nenhum visual</span>

                                  <input
                                    type="file"

                                    accept="image/png,image/jpeg,video/mp4"

                                    className="hidden"

                                    id={`storyboard-upload-new-${idx}`}

                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];

                                        const isVideo =
                                          file.name.endsWith(".mp4") ||
                                          file.type.startsWith("video/");

                                        const type = isVideo
                                          ? "video"
                                          : "image";

                                        handleUploadSceneAsset(
                                          blockNum,
                                          type,
                                          file,
                                          assetIdx,
                                          selectedProject
                                        );
                                      }
                                    }}
                                  />

                                  <label
                                    htmlFor={`storyboard-upload-new-${idx}`}

                                    className="text-zinc-400 hover:text-white text-[9px] font-bold bg-zinc-900 border border-zinc-800 rounded px-2 py-1 cursor-pointer transition flex items-center gap-1"
                                  >
                                    <Upload className="w-3 h-3" /> Upload
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Column: Narration & Visual Prompt textareas */}

                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left Column: Narration Text */}

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Narração (Texto Falado)
                              </label>

                              <textarea
                                value={vp.narration_text || ""}

                                onChange={(e) =>
                                  updateSceneField(
                                    idx,
                                    "narration_text",
                                    e.target.value
                                  )
                                }

                                placeholder="Insira o trecho de narração da fala do vídeo..."

                                className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl p-3 text-xs text-white h-24 resize-none leading-relaxed"
                              />
                            </div>

                            {/* Right Column: Visual Prompt */}

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                                Prompt Visual (Instrução de Geração)
                              </label>

                              <textarea
                                value={vp.prompt || ""}

                                onChange={(e) =>
                                  updateSceneField(
                                    idx,
                                    "prompt",
                                    e.target.value
                                  )
                                }

                                placeholder="Prompt detalhado em inglês para geração de vídeo ou imagem por IA..."

                                className="w-full bg-zinc-950 border border-zinc-855 focus:outline-none focus:border-gold-500 rounded-xl p-3 text-xs text-gray-300 h-24 resize-none leading-relaxed italic"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Scene parameters row */}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-950/40 p-3 border border-zinc-900 rounded-xl items-center">
                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                          Tipo de Cena
                        </span>

                        <select
                          value={vp.type || "imagem IA 2k"}

                          onChange={(e) =>
                            updateSceneField(idx, "type", e.target.value)
                          }

                          className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"
                        >
                          <option value="imagem IA 2k">Imagem IA 2k</option>

                          <option value="vídeo IA (max 10s)">
                            Vídeo IA (max 10s)
                          </option>
                        </select>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                          Duração (Voz)
                        </span>

                        {(() => {
                          const blockNum = vp.block || 1;
                          let localIdx = 0;
                          for (let i = 0; i < idx; i++) {
                            if (
                              (storyboardData.visual_prompts[i].block || 1) ===
                              blockNum
                            )
                              localIdx++;
                          }
                          const blockScenes =
                            storyboardData.visual_prompts.filter(
                              (s: any) => (s.block || 1) === blockNum
                            );
                          const dur = getSceneDurationSeconds(
                            vp,
                            wordTranscripts,
                            blockNum,
                            localIdx,
                            status,
                            blockScenes
                          );
                          return (
                            <div
                              className={`flex items-center border rounded px-2 py-1 min-h-[26px] ${
                                dur != null
                                  ? "bg-emerald-500/5 border-emerald-500/25"
                                  : "bg-zinc-900 border-zinc-800"
                              }`}
                              title={
                                dur != null
                                  ? "Segundos reais desta frase na narração (Whisper)"
                                  : "Rode narração + Whisper para calcular os segundos"
                              }
                            >
                              <span
                                className={`text-[10px] font-mono tabular-nums ${dur != null ? "text-emerald-300" : "text-zinc-600"}`}
                              >
                                {dur != null ? `${dur}s` : "—"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                          Notas de Edição
                        </span>

                        <input
                          type="text"

                          value={vp.editor_notes || ""}

                          onChange={(e) =>
                            updateSceneField(
                              idx,
                              "editor_notes",
                              e.target.value
                            )
                          }

                          placeholder="Efeitos: Ken Burns zoom, corte, etc."

                          className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">
                          Busca Stock (Pexels)
                        </span>

                        <input
                          type="text"

                          value={vp.stock_query || ""}

                          onChange={(e) =>
                            updateSceneField(idx, "stock_query", e.target.value)
                          }

                          placeholder="Termo de busca curto em inglês"

                          className="bg-zinc-900 border border-zinc-800 text-[10px] text-white rounded px-2 py-1 w-full focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Action Controls for this Scene card */}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={idx === 0}

                          onClick={() => moveScene(idx, "up")}

                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white p-1.5 rounded transition cursor-pointer"

                          title="Subir Cena"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          disabled={
                            idx === storyboardData.visual_prompts.length - 1
                          }

                          onClick={() => moveScene(idx, "down")}

                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white p-1.5 rounded transition cursor-pointer"

                          title="Descer Cena"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteScene(idx)}

                          className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-[9px] px-2.5 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir Cena
                        </button>

                        <button
                          onClick={() => insertSceneAfter(idx)}

                          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[9px] px-2.5 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Inserir Cena Abaixo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bottom actions */}

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={addSceneAtEnd}

                    className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Nova Cena no Fim
                  </button>

                  <button
                    onClick={handleSaveStoryboard}

                    className="bg-gold-500 hover:bg-gold-600 text-zinc-950 text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Salvar Alterações de Roteiro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {editorSubTab === "json" && storyboardData && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-zinc-950/40 p-4 border border-zinc-900 rounded-2xl">
              <div>
                <SectionHeader
                  title="JSON do Roteiro e Storyboard"
                  helpId="editor-json"
                  size="sm"
                  titleClassName="tracking-wider uppercase text-xs"
                />

                <p className="text-[10px] text-gray-400 mt-0.5">
                  Explore a estrutura de dados completa do storyboard.json de
                  forma colapsável.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateAiOverlays}
                  disabled={generatingOverlays}
                  className="bg-gold-500 hover:bg-gold-600 disabled:bg-gold-500/50 text-zinc-950 text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>
                    {generatingOverlays
                      ? "Planejando..."
                      : "Planejar templates Remotion"}
                  </span>
                </button>

                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(storyboardData, null, 2),
                      "storyboard-json"
                    )
                  }
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>
                    {copiedSection === "storyboard-json"
                      ? "Copiado!"
                      : "Copiar JSON"}
                  </span>
                </button>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-3xl bg-zinc-950/60 max-h-[600px] overflow-y-auto">
              <JsonTreeView value={storyboardData} />
            </div>
          </div>
        )}
      </div>
    </DashminProjectTabLayout>
  );
}
