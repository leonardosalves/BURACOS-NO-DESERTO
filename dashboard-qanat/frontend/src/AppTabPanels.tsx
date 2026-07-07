import React, { Suspense, lazy } from "react";
import toast from "react-hot-toast";
import {
  Bot,
  Clapperboard,
  Cloud,
  Globe,
  LayoutTemplate,
  TrendingUp,
  Tv,
  Youtube,
  Zap,
} from "lucide-react";
import { TabErrorBoundary } from "./TabErrorBoundary";
import { DashminPageLayout } from "./DashminPageLayout";
import type { AppTab } from "./appTabs";
import type { AppTabPropBundles } from "./appTabPropBundles";
import type { ConfigData } from "./appTypes";
import type { ProjectListItem } from "./ProjectsLibraryPanel";
import type { YoutubeChannelAlerts } from "./YoutubeStudioPanel";
import type { CreatorApplyIdeaOptions } from "./creatorEditorialImport";
import type { SettingsSection } from "./SettingsSectionNav";
import type {
  GeminiBrowserRequest,
  GeminiBrowserResolver,
} from "./geminiAiFetch";
import {
  LazyAgentReachPanel,
  LazyComfyMcpPage,
  LazyProjectsLibraryPanel,
  LazyStudioAgents,
  LazyTrendForecastPanel,
  LazyVideoResurrectorPanel,
  LazyYoutubeStudioPanel,
  TabPanelFallback,
} from "./appLazyPanels";

const AppCreatorTab = lazy(() =>
  import("./AppCreatorTab").then((m) => ({ default: m.AppCreatorTab }))
);
const AppEditorTab = lazy(() =>
  import("./AppEditorTab").then((m) => ({ default: m.AppEditorTab }))
);
const AppTimelineTab = lazy(() =>
  import("./AppTimelineTab").then((m) => ({ default: m.AppTimelineTab }))
);
const AppUploadTab = lazy(() =>
  import("./AppUploadTab").then((m) => ({ default: m.AppUploadTab }))
);
const AppAiTab = lazy(() =>
  import("./AppAiTab").then((m) => ({ default: m.AppAiTab }))
);
const AppStatusTab = lazy(() =>
  import("./AppStatusTab").then((m) => ({ default: m.AppStatusTab }))
);
const AppSettingsTab = lazy(() =>
  import("./AppSettingsTab").then((m) => ({ default: m.AppSettingsTab }))
);
const AppHomeTab = lazy(() =>
  import("./AppHomeTab").then((m) => ({ default: m.AppHomeTab }))
);
const AppWorkflowTab = lazy(() =>
  import("./AppWorkflowTab").then((m) => ({ default: m.AppWorkflowTab }))
);
const AppSceneTimingTab = lazy(() =>
  import("./AppSceneTimingTab").then((m) => ({ default: m.AppSceneTimingTab }))
);
const AppTerminalTab = lazy(() =>
  import("./AppTerminalTab").then((m) => ({ default: m.AppTerminalTab }))
);
const FlowLabPage = lazy(() =>
  import("./FlowLabPage").then((m) => ({ default: m.FlowLabPage }))
);
const AppMusicTabPanel = lazy(() =>
  import("./AppMusicTabPanel").then((m) => ({ default: m.AppMusicTabPanel }))
);
const RemotionTemplateStudio = lazy(() =>
  import("./RemotionTemplateStudio").then((m) => ({
    default: m.RemotionTemplateStudio,
  }))
);

type ResurrectorAlert = {
  type: string;
  slot: string;
  severity: string;
  message: string;
  ranAt?: string;
};

export type AppGlobalStudioPanelsProps = {
  activeProject: string;
  config: ConfigData | null;
  projects: ProjectListItem[];
  recentProjects: string[];
  nicheInput: string;
  geminiBrowserMode: boolean;
  aiProvider: string;
  youtubeChannelAlerts: YoutubeChannelAlerts | null;
  resurrectorAlerts: ResurrectorAlert[];
  getProjectUrl: (path: string) => string;
  postAi: (path: string, body: unknown) => Promise<any>;
  setActiveTab: (tab: AppTab) => void;
  setSettingsSection: (section: SettingsSection) => void;
  handleSelectProject: (name: string) => void | Promise<void>;
  handleDeleteProject: (name: string) => void | Promise<void>;
  handleApplyYoutubeStudioIdea: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions
  ) => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleScheduleFromHeatmap: (slot: {
    iso: string;
    local: string;
    label?: string;
  }) => void;
  resolveBrowserResponse: GeminiBrowserResolver;
  setYoutubeChannelAlerts: (alerts: YoutubeChannelAlerts | null) => void;
  setNewProjectFormat: (format: "LONGO" | "SHORTS") => void;
  setNewProjectNiche: (niche: string) => void;
  setShowCreateModal: (open: boolean) => void;
  hasApiKey: boolean;
};

export type AppTabPanelsProps = AppTabPropBundles &
  AppGlobalStudioPanelsProps & {
    activeTab: AppTab;
  };

export function AppTabPanels({
  activeTab,
  activeProject,
  config,
  projects,
  recentProjects,
  nicheInput,
  geminiBrowserMode,
  aiProvider,
  youtubeChannelAlerts,
  resurrectorAlerts,
  getProjectUrl,
  postAi,
  setActiveTab,
  setSettingsSection,
  handleSelectProject,
  handleDeleteProject,
  handleApplyYoutubeStudioIdea,
  handleRelinkYoutube,
  handleScheduleFromHeatmap,
  resolveBrowserResponse,
  setYoutubeChannelAlerts,
  setNewProjectFormat,
  setNewProjectNiche,
  setShowCreateModal,
  hasApiKey,
  creatorTabProps,
  aiTabProps,
  uploadTabProps,
  editorTabProps,
  settingsTabProps,
  statusTabProps,
  timelineTabProps,
  musicTabPanelProps,
  homeTabProps,
  workflowTabProps,
  sceneTimingTabProps,
  terminalTabProps,
}: AppTabPanelsProps) {
  return (
    <div className="text-balance-safe">
      {activeTab === "home" && (
        <TabErrorBoundary tabName="Início">
          <Suspense
            fallback={<TabPanelFallback label="Carregando início..." />}
          >
            <AppHomeTab {...homeTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* TAB: RENDER */}

      {activeTab === "status" && (
        <TabErrorBoundary tabName="Render">
          <Suspense
            fallback={<TabPanelFallback label="Carregando render..." />}
          >
            <AppStatusTab {...statusTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {activeTab === "workflow" && (
        <TabErrorBoundary tabName="Workflow">
          <Suspense
            fallback={<TabPanelFallback label="Carregando workflow..." />}
          >
            <AppWorkflowTab {...workflowTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {activeTab === "scene-timing" && (
        <TabErrorBoundary tabName="Timing de cenas">
          <Suspense
            fallback={<TabPanelFallback label="Carregando timing..." />}
          >
            <AppSceneTimingTab {...sceneTimingTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {activeTab === "flow-lab" && (
        <TabErrorBoundary tabName="Flow Lab">
          <DashminPageLayout
            title="Flow Lab"
            subtitle="Teste global: IA gera roteiro e prompts; voce gera no Google Flow e faz upload."
            breadcrumb={["Dashboard", "Estudio", "Flow Lab"]}
            icon={<Clapperboard className="w-5 h-5 text-amber-300" />}
          >
            <Suspense
              fallback={<TabPanelFallback label="Carregando Flow Lab..." />}
            >
              <FlowLabPage
                geminiBrowserMode={geminiBrowserMode}
                aiProvider={aiProvider}
                resolveBrowserResponse={resolveBrowserResponse}
                hasApiKey={hasApiKey}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {/* TAB: TIMELINE & BLOCKS */}

      {activeTab === "timeline" && (
        <TabErrorBoundary tabName="Roteiro e Tags">
          <Suspense
            fallback={<TabPanelFallback label="Carregando timeline..." />}
          >
            <AppTimelineTab {...timelineTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* TAB 3: SOUNDTRACK STUDIO */}

      {activeTab === "music" && (
        <Suspense fallback={<TabPanelFallback label="Carregando trilhas..." />}>
          <AppMusicTabPanel {...musicTabPanelProps} />
        </Suspense>
      )}

      {/* TAB 4: COMPILATION TERMINAL */}

      {activeTab === "terminal" && (
        <TabErrorBoundary tabName="Terminal">
          <Suspense
            fallback={<TabPanelFallback label="Carregando terminal..." />}
          >
            <AppTerminalTab {...terminalTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* TAB 5: AI AGENT */}
      {activeTab === "ai" && (
        <TabErrorBoundary tabName="IA Metadados">
          <Suspense
            fallback={<TabPanelFallback label="Carregando ia metadados..." />}
          >
            <AppAiTab {...aiTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* TAB: PROJECT EDITOR */}

      {activeTab === "upload" && (
        <TabErrorBoundary tabName="Upload">
          <Suspense
            fallback={<TabPanelFallback label="Carregando upload..." />}
          >
            <AppUploadTab {...uploadTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {activeTab === "editor" && (
        <TabErrorBoundary tabName="Editor">
          <Suspense
            fallback={<TabPanelFallback label="Carregando editor..." />}
          >
            <AppEditorTab {...editorTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {activeTab === "agents" && (
        <TabErrorBoundary tabName="Studio Agents">
          <DashminPageLayout
            title="Studio Agents"
            subtitle="Memória do estúdio, VideoAgent, skills e qualidade por projeto."
            breadcrumb={["Dashboard", "Estúdio", "Studio Agents"]}
            icon={<Bot className="w-5 h-5" />}
          >
            <Suspense
              fallback={
                <TabPanelFallback label="Carregando Studio Agents..." />
              }
            >
              <LazyStudioAgents
                embedded
                activeProject={activeProject}
                projectNiche={config?.niche || "Geral"}
                projectVideoFormat={config?.video_format}
                projectAspectRatio={config?.aspect_ratio}
                getProjectUrl={getProjectUrl}
                postAi={postAi}
                onNavigateTab={(tab) => setActiveTab(tab as AppTab)}
                onExecuteCreator={async (title, hook, options) =>
                  void (await handleApplyYoutubeStudioIdea(
                    title,
                    hook,
                    options
                  ))
                }
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "templates" && (
        <TabErrorBoundary tabName="Templates Remotion">
          <DashminPageLayout
            title="Remotion Template Studio"
            subtitle="Biblioteca por nicho, categoria e formato para a IA orquestrar apenas templates aprovados."
            breadcrumb={["Dashboard", "Estudio", "Templates"]}
            icon={<LayoutTemplate className="w-5 h-5" />}
          >
            <Suspense
              fallback={<TabPanelFallback label="Carregando templates..." />}
            >
              <RemotionTemplateStudio
                activeProject={activeProject}
                projectNiche={config?.niche || nicheInput || "Engenharia"}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "comfy-mcp" && (
        <TabErrorBoundary tabName="Comfy MCP">
          <DashminPageLayout
            title="Comfy MCP"
            subtitle="Agente criativo na nuvem — imagem, vídeo, áudio e 3D via MCP."
            breadcrumb={["Dashboard", "Estúdio", "Comfy MCP"]}
            icon={<Cloud className="w-5 h-5" />}
          >
            <Suspense
              fallback={<TabPanelFallback label="Carregando Comfy MCP..." />}
            >
              <LazyComfyMcpPage embedded />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "projects" && (
        <TabErrorBoundary tabName="Projetos">
          <DashminPageLayout
            title="Biblioteca de Projetos"
            subtitle="Filtre por formato, nicho e abra o workspace de cada vídeo."
            breadcrumb={["Dashboard", "Projetos"]}
            icon={<Tv className="w-5 h-5" />}
          >
            <Suspense
              fallback={<TabPanelFallback label="Carregando projetos..." />}
            >
              <LazyProjectsLibraryPanel
                projects={projects}
                activeProject={activeProject}
                recentProjects={recentProjects}
                onSelectProject={handleSelectProject}
                onRequestCreate={(format, niche) => {
                  setNewProjectFormat(format);
                  setNewProjectNiche(niche || "Geral");
                  setShowCreateModal(true);
                }}
                onDeleteProject={(name) => void handleDeleteProject(name)}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "agent-reach" && (
        <TabErrorBoundary tabName="Pesquisa Web">
          <DashminPageLayout
            title="Pesquisa Web"
            subtitle="Agent Reach — Exa, Jina, GitHub, Bilibili e RSS integrados."
            breadcrumb={["Dashboard", "Estúdio", "Pesquisa Web"]}
            icon={<Globe className="w-5 h-5" />}
          >
            <Suspense
              fallback={<TabPanelFallback label="Carregando pesquisa web..." />}
            >
              <LazyAgentReachPanel
                embedded
                niche={config?.niche || ""}
                onApplyCreatorIdea={(title, hookPt, options) => {
                  void handleApplyYoutubeStudioIdea(
                    title,
                    hookPt,
                    options as CreatorApplyIdeaOptions
                  );
                }}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "trend-forecast" && (
        <TabErrorBoundary tabName="Radar de Tendências">
          <DashminPageLayout
            title="Radar de Tendências"
            subtitle="Previsão TimesFM + Analytics do canal para nichos e vídeos em alta."
            breadcrumb={["Dashboard", "Estúdio", "Radar Tendências"]}
            icon={<TrendingUp className="w-5 h-5" />}
          >
            <Suspense
              fallback={
                <TabPanelFallback label="Carregando radar de tendências..." />
              }
            >
              <LazyTrendForecastPanel
                embedded
                niche={config?.niche || ""}
                onApplyCreatorIdea={(title, hookPt, options) => {
                  void handleApplyYoutubeStudioIdea(title, hookPt, options);
                }}
                onGoToIntegrations={() => {
                  setSettingsSection("integracoes");
                  setActiveTab("settings");
                }}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "video-resurrector" && (
        <TabErrorBoundary tabName="Ressuscitador">
          <DashminPageLayout
            title="Ressuscitador de vídeos"
            subtitle="Do mais antigo ao mais novo — ciclo contínuo com batches às 11h e 18h."
            breadcrumb={["Dashboard", "Estúdio", "Ressuscitador"]}
            icon={<Zap className="w-5 h-5 text-amber-400" />}
          >
            <Suspense
              fallback={
                <TabPanelFallback label="Carregando ressuscitador..." />
              }
            >
              <LazyVideoResurrectorPanel
                toast={toast}
                externalAlerts={resurrectorAlerts as any}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "youtube-studio" && (
        <TabErrorBoundary tabName="Canal YouTube">
          <DashminPageLayout
            title="Canal YouTube"
            subtitle="Métricas, comentários, alertas 48h e ferramentas de crescimento."
            breadcrumb={["Dashboard", "Estúdio", "Canal YouTube"]}
            icon={<Youtube className="w-5 h-5" />}
          >
            <Suspense
              fallback={
                <TabPanelFallback label="Carregando YouTube Studio..." />
              }
            >
              <LazyYoutubeStudioPanel
                embedded
                toast={toast}
                onRelinkYoutube={handleRelinkYoutube}
                nicheKeyword={config?.niche || nicheInput || ""}
                alerts={youtubeChannelAlerts}
                geminiBrowserMode={geminiBrowserMode}
                aiProvider={aiProvider}
                resolveBrowserResponse={resolveBrowserResponse}
                onSelectProject={handleSelectProject}
                onAlertsSync={setYoutubeChannelAlerts}
                onApplyCreatorIdea={(title, hookPt, options) => {
                  void handleApplyYoutubeStudioIdea(title, hookPt, options);
                }}
                onSchedulePublish={handleScheduleFromHeatmap}
                onGoToIntegrations={() => {
                  setSettingsSection("integracoes");
                  setActiveTab("settings");
                }}
              />
            </Suspense>
          </DashminPageLayout>
        </TabErrorBoundary>
      )}

      {activeTab === "settings" && (
        <TabErrorBoundary tabName="Configurações">
          <Suspense
            fallback={<TabPanelFallback label="Carregando configurações..." />}
          >
            <AppSettingsTab {...settingsTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}

      {/* TAB 6: AI VIDEO CREATOR */}
      {activeTab === "creator" && (
        <TabErrorBoundary tabName="Creator IA">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[40vh] text-zinc-400 text-sm">
                Carregando creator...
              </div>
            }
          >
            <AppCreatorTab {...creatorTabProps} />
          </Suspense>
        </TabErrorBoundary>
      )}
    </div>
  );
}
