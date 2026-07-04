import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
const appPath = path.join(srcDir, "App.tsx");
const outPath = path.join(srcDir, "appTabPropBundles.ts");

const app = fs.readFileSync(appPath, "utf8");
const start = app.indexOf("  const creatorTabProps:");
const end = app.indexOf("  return (", start);
if (start < 0 || end < 0) {
  console.error("Could not find tab props block in App.tsx");
  process.exit(1);
}

const blocksText = app.slice(start, end).trimEnd();

function toCtxRefs(block) {
  return block.replace(
    /^(\s+)([A-Za-z_$][\w$]*)(,?\s*)$/gm,
    (full, indent, name, suffix) => {
      if (
        name === "const" ||
        name.endsWith("TabProps") ||
        name.endsWith("Props") ||
        name === "brandPanelProps"
      ) {
        if (name === "brandPanelProps") {
          return `${indent}brandPanelProps: ctx.brandPanelProps${suffix}`;
        }
        return full;
      }
      return `${indent}${name}: ctx.${name}${suffix}`;
    },
  );
}

const convertedBlocks = blocksText
  .split(/\n\n(?=  const \w+Tab(?:Panel)?Props:)/)
  .map((chunk) => toCtxRefs(chunk))
  .join("\n\n");

const extraBlocks = `
  const homeTabProps: AppHomeTabProps = {
    projects: ctx.projects,
    activeProject: ctx.activeProject,
    recentProjects: ctx.recentProjects,
    status: ctx.status,
    videoQualityScore: ctx.videoQuality?.score,
    outputCount: ctx.outputs.length,
    youtubeAlerts: ctx.youtubeChannelAlerts?.badgeCount ?? 0,
    hotVideos: ctx.youtubeChannelAlerts?.hotVideos,
    rendering: ctx.rendering,
    renderPercent: ctx.renderProgress?.percent,
    openCreatorTab: ctx.openCreatorTab,
    setActiveTab: ctx.setActiveTab,
  };

  const workflowTabProps: AppWorkflowTabProps = {
    activeProject: ctx.activeProject,
    activeTab: ctx.activeTab,
    config: ctx.config,
    status: ctx.status,
    getProjectUrl: ctx.getProjectUrl,
    getMusicUrl: ctx.getMusicUrl,
    postAi: ctx.postAi,
    fetchData: ctx.fetchData,
    setActiveTab: ctx.setActiveTab,
  };

  const sceneTimingTabProps: AppSceneTimingTabProps = {
    activeProject: ctx.activeProject,
    config: ctx.config,
    status: ctx.status,
    storyboardData: ctx.storyboardData,
    wordTranscripts: ctx.wordTranscripts,
    getMusicUrl: ctx.getMusicUrl,
    getAssetUrl: ctx.getAssetUrl,
    saveTimelinePatch: ctx.saveTimelinePatch,
  };

  const terminalTabProps: AppTerminalTabProps = {
    activeProject: ctx.activeProject,
    logs: ctx.logs,
    setLogs: ctx.setLogs,
    terminalEndRef: ctx.terminalEndRef,
  };
`;

const header = `import type { AppCreatorTabProps } from './AppCreatorTab';
import type { AppAiTabProps } from './AppAiTab';
import type { AppUploadTabProps } from './AppUploadTab';
import type { AppEditorTabProps } from './AppEditorTab';
import type { AppSettingsTabProps } from './AppSettingsTab';
import type { AppStatusTabProps } from './AppStatusTab';
import type { AppTimelineTabProps } from './AppTimelineTab';
import type { AppMusicTabPanelProps } from './AppMusicTabPanel';
import type { AppHomeTabProps } from './AppHomeTab';
import type { AppWorkflowTabProps } from './AppWorkflowTab';
import type { AppSceneTimingTabProps } from './AppSceneTimingTab';
import type { AppTerminalTabProps } from './AppTerminalTab';
import type { AppTab } from './appTabs';
import type { ConfigData, MusicFile, OutputVideo, VideoQualityReport, WorkspaceStatus } from './appTypes';
import type { ProjectListItem } from './ProjectsLibraryPanel';
import type { YoutubeChannelAlerts } from './YoutubeStudioPanel';
import type React from 'react';

/** Union of values App passes into tab prop bundles (extras + tab prop fields). */
export type AppTabPropContext = Record<string, unknown> & {
  activeProject: string;
  activeTab: AppTab;
  brandPanelProps: Record<string, unknown>;
  config: ConfigData | null;
  logs: string[];
  openCreatorTab: () => void;
  outputs: OutputVideo[];
  postAi: (path: string, body: unknown) => Promise<unknown>;
  projects: ProjectListItem[];
  recentProjects: string[];
  renderProgress?: { percent?: number };
  rendering: boolean;
  saveTimelinePatch: (cfg: ConfigData) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  status: WorkspaceStatus | null;
  storyboardData: unknown;
  terminalEndRef: React.RefObject<HTMLDivElement | null>;
  videoQuality: VideoQualityReport | null;
  wordTranscripts: unknown;
  youtubeChannelAlerts: YoutubeChannelAlerts | null;
  safeMusicFiles: MusicFile[];
};

export type AppTabPropBundles = {
  creatorTabProps: AppCreatorTabProps;
  aiTabProps: AppAiTabProps;
  uploadTabProps: AppUploadTabProps;
  editorTabProps: AppEditorTabProps;
  settingsTabProps: AppSettingsTabProps;
  statusTabProps: AppStatusTabProps;
  timelineTabProps: AppTimelineTabProps;
  musicTabPanelProps: AppMusicTabPanelProps;
  homeTabProps: AppHomeTabProps;
  workflowTabProps: AppWorkflowTabProps;
  sceneTimingTabProps: AppSceneTimingTabProps;
  terminalTabProps: AppTerminalTabProps;
};

export function buildAppTabPropBundles(ctx: AppTabPropContext): AppTabPropBundles {
`;

const footer = `
  return {
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
  };
}
`;

const body = convertedBlocks + extraBlocks;
fs.writeFileSync(outPath, header + body + footer, "utf8");
console.log("Wrote", outPath);

// Collect unique ctx keys from converted blocks
const keys = new Set();
for (const m of body.matchAll(/ctx\.([A-Za-z_$][\w$]*)/g)) keys.add(m[1]);
console.log("ctx keys:", keys.size);