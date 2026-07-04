import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
const appPath = path.join(srcDir, "App.tsx");
const panelsPath = path.join(srcDir, "AppTabPanels.tsx");
const overlaysPath = path.join(srcDir, "AppOverlays.tsx");

const app = fs.readFileSync(appPath, "utf8");

const panelsStart = app.indexOf('        <div className="text-balance-safe">');
const panelsEnd = app.indexOf("        </div>\n      </AppShell>", panelsStart);
if (panelsStart < 0 || panelsEnd < 0) {
  console.error("tab panels block not found");
  process.exit(1);
}
const panelsInner = app
  .slice(panelsStart, panelsEnd)
  .replace('        <div className="text-balance-safe">\n\n', "")
  .replace(/\n        $/, "");

const overlaysStart = app.indexOf("      {/* Global Floating Chat Button */}");
const overlaysEnd = app.indexOf("    </>\n\n  );", overlaysStart);
if (overlaysStart < 0 || overlaysEnd < 0) {
  console.error("overlays block not found");
  process.exit(1);
}
const overlaysBody = app.slice(overlaysStart, overlaysEnd).trimEnd();

const panelsHeader = `import React, { Suspense, lazy } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  Cloud,
  Globe,
  TrendingUp,
  Tv,
  Youtube,
  Zap,
} from 'lucide-react';
import { TabErrorBoundary } from './TabErrorBoundary';
import { DashminPageLayout } from './DashminPageLayout';
import type { AppTab } from './appTabs';
import type { AppTabPropBundles } from './appTabPropBundles';
import type { ConfigData } from './appTypes';
import type { ProjectListItem } from './ProjectsLibraryPanel';
import type { YoutubeChannelAlerts } from './YoutubeStudioPanel';
import type { CreatorApplyIdeaOptions } from './creatorEditorialImport';
import type { SettingsSection } from './SettingsSectionNav';
import {
  LazyAgentReachPanel,
  LazyComfyMcpPage,
  LazyProjectsLibraryPanel,
  LazyStudioAgents,
  LazyTrendForecastPanel,
  LazyVideoResurrectorPanel,
  LazyYoutubeStudioPanel,
  TabPanelFallback,
} from './appLazyPanels';

const AppCreatorTab = lazy(() => import('./AppCreatorTab').then((m) => ({ default: m.AppCreatorTab })));
const AppEditorTab = lazy(() => import('./AppEditorTab').then((m) => ({ default: m.AppEditorTab })));
const AppTimelineTab = lazy(() => import('./AppTimelineTab').then((m) => ({ default: m.AppTimelineTab })));
const AppUploadTab = lazy(() => import('./AppUploadTab').then((m) => ({ default: m.AppUploadTab })));
const AppAiTab = lazy(() => import('./AppAiTab').then((m) => ({ default: m.AppAiTab })));
const AppStatusTab = lazy(() => import('./AppStatusTab').then((m) => ({ default: m.AppStatusTab })));
const AppSettingsTab = lazy(() => import('./AppSettingsTab').then((m) => ({ default: m.AppSettingsTab })));
const AppHomeTab = lazy(() => import('./AppHomeTab').then((m) => ({ default: m.AppHomeTab })));
const AppWorkflowTab = lazy(() => import('./AppWorkflowTab').then((m) => ({ default: m.AppWorkflowTab })));
const AppSceneTimingTab = lazy(() => import('./AppSceneTimingTab').then((m) => ({ default: m.AppSceneTimingTab })));
const AppTerminalTab = lazy(() => import('./AppTerminalTab').then((m) => ({ default: m.AppTerminalTab })));
const AppMusicTabPanel = lazy(() => import('./AppMusicTabPanel').then((m) => ({ default: m.AppMusicTabPanel })));

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
  postAi: (path: string, body: unknown) => Promise<unknown>;
  setActiveTab: (tab: AppTab) => void;
  setSettingsSection: (section: SettingsSection) => void;
  handleSelectProject: (name: string) => void | Promise<void>;
  handleDeleteProject: (name: string) => void | Promise<void>;
  handleApplyYoutubeStudioIdea: (
    title: string,
    hook: string,
    options?: CreatorApplyIdeaOptions,
  ) => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleScheduleFromHeatmap: (slot: { iso: string; local: string; label?: string }) => void;
  resolveBrowserResponse: (response: unknown) => unknown;
  setYoutubeChannelAlerts: (alerts: YoutubeChannelAlerts | null) => void;
  setNewProjectFormat: (format: 'LONGO' | 'SHORTS') => void;
  setNewProjectNiche: (niche: string) => void;
  setShowCreateModal: (open: boolean) => void;
};

export type AppTabPanelsProps = AppTabPropBundles &
  AppGlobalStudioPanelsProps & {
    activeTab: AppTab;
  };

function LazyTabPanel({
  tabName,
  label,
  children,
}: {
  tabName: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <TabErrorBoundary tabName={tabName}>
      <Suspense fallback={<TabPanelFallback label={label} />}>{children}</Suspense>
    </TabErrorBoundary>
  );
}

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
`;

const panelsFooter = `
    </div>
  );
}
`;

fs.writeFileSync(panelsPath, panelsHeader + panelsInner + panelsFooter, "utf8");
console.log("Wrote", panelsPath);

const overlaysHeader = `import React from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  CheckCircle,
  Lock,
  Music,
  RefreshCw,
  Settings,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { DashminAiChat } from './DashminAiChat';
import { SectionHeader } from './SectionHeader';
import type { AppTab } from './appTabs';
import type { MusicFile, OutputVideo } from './appTypes';

export type AppOverlaysProps = {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: unknown[];
  chatLoading: boolean;
  chatInput: string;
  setChatInput: (value: string) => void;
  handleSendChatMessage: () => void | Promise<void>;
  hasApiKey: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  aiProviderBadge: { short: string; detail: string };
  setActiveTab: (tab: AppTab) => void;
  showCreateModal: boolean;
  setShowCreateModal: (open: boolean) => void;
  newProjectName: string;
  setNewProjectName: (name: string) => void;
  newProjectFormat: 'LONGO' | 'SHORTS';
  setNewProjectFormat: (format: 'LONGO' | 'SHORTS') => void;
  newProjectNiche: string;
  setNewProjectNiche: (niche: string) => void;
  handleCreateProject: () => void | Promise<void>;
  pendingMusicDelete: MusicFile | { name: '__all__'; sizeBytes: number } | null;
  setPendingMusicDelete: (
    value: MusicFile | { name: '__all__'; sizeBytes: number } | null,
  ) => void;
  deletingMusic: boolean;
  handleConfirmDeleteMusic: () => void | Promise<void>;
  musicFiles: MusicFile[];
  getFormatBytes: (n: number) => string;
  pendingOutputDelete: OutputVideo | null;
  setPendingOutputDelete: (value: OutputVideo | null) => void;
  deletingOutput: boolean;
  handleDeleteOutputVideo: () => void | Promise<void>;
  previewVideoUrl: string | null;
  setPreviewVideoUrl: (url: string | null) => void;
  renderProgress: { percent: number; phase: string } | null;
  setRenderProgress: (value: { percent: number; phase: string } | null) => void;
};

export function AppOverlays({
  chatOpen,
  setChatOpen,
  chatMessages,
  chatLoading,
  chatInput,
  setChatInput,
  handleSendChatMessage,
  hasApiKey,
  chatEndRef,
  aiProviderBadge,
  setActiveTab,
  showCreateModal,
  setShowCreateModal,
  newProjectName,
  setNewProjectName,
  newProjectFormat,
  setNewProjectFormat,
  newProjectNiche,
  setNewProjectNiche,
  handleCreateProject,
  pendingMusicDelete,
  setPendingMusicDelete,
  deletingMusic,
  handleConfirmDeleteMusic,
  musicFiles,
  getFormatBytes,
  pendingOutputDelete,
  setPendingOutputDelete,
  deletingOutput,
  handleDeleteOutputVideo,
  previewVideoUrl,
  setPreviewVideoUrl,
  renderProgress,
  setRenderProgress,
}: AppOverlaysProps) {
  return (
    <>
`;

const overlaysFooter = `
    </>
  );
}
`;

fs.writeFileSync(overlaysPath, overlaysHeader + overlaysBody + overlaysFooter, "utf8");
console.log("Wrote", overlaysPath);