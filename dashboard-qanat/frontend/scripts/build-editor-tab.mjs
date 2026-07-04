import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
let body = fs.readFileSync(path.join(srcDir, "_editor_tab_body.txt"), "utf8");

body = body.replace(
  /<LumieraDubPanel/g,
  "<LazyLumieraDubPanel",
).replace(
  /(\s+)\/>/g,
  (m, sp) => m,
);

// Wrap dub panel in Suspense
body = body.replace(
  /(\{editorSubTab === 'dub' && config && \(\s*<div className="glass-panel p-6 rounded-3xl max-w-4xl">\s*)<LazyLumieraDubPanel/,
  "$1<Suspense fallback={<div className=\"text-zinc-500 text-sm py-8 text-center\">Carregando dublagem...</div>}>\n                  <LazyLumieraDubPanel",
);
body = body.replace(
  /(<LazyLumieraDubPanel[\s\S]*?\/>\s*)(<\/div>\s*\)\})/,
  "$1                </Suspense>\n                $2",
);

const PROPS = [
  "activeProject",
  "addSceneAtEnd",
  "config",
  "copiedSection",
  "copyToClipboard",
  "debounceSaveStoryboard",
  "deleteScene",
  "editorSubTab",
  "fetchData",
  "generatingOverlays",
  "getAssetDuration",
  "getAssetUrl",
  "getMusicUrl",
  "getProjectUrl",
  "getTotalVideoDuration",
  "handleGenerateAiOverlays",
  "handleNotebooklmImprove",
  "handleSaveStoryboard",
  "handleUploadSceneAsset",
  "hasApiKey",
  "insertSceneAfter",
  "loadEditorProject",
  "loadingStoryboard",
  "moveScene",
  "notebooklmImproving",
  "notebooklmStatus",
  "notebooklmSuggestions",
  "projects",
  "renderRichTimelineEditor",
  "saveConfigPatch",
  "saveCreatorStoryboard",
  "selectedProject",
  "setActiveTab",
  "setConfig",
  "setEditorSubTab",
  "setSelectedProject",
  "setStoryboardData",
  "setVideoFileDurations",
  "status",
  "storyboardData",
  "titleExperimentVideoId",
  "updateSceneField",
  "videoFileDurations",
  "wordTranscripts",
];

const header = `import toast from 'react-hot-toast';
import React, { Suspense } from 'react';
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
} from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import { ProjectYoutubeCard } from './ProjectYoutubeCard';
import { PostPublishChecklist } from './PostPublishChecklist';
import { NarrationChunksPanel } from './NarrationChunksPanel';
import { NarrationReplacePanel } from './NarrationReplacePanel';
import { TtsVoiceStudioPanel } from './TtsVoiceStudioPanel';
import { TimelineClipPreview } from './TimelineClipPreview';
import { JsonTreeView } from './JsonTreeView';
import { LazyLumieraDubPanel } from './appLazyPanels';
import { getSceneDurationSeconds } from './sceneSpeechDuration';
import type { AppTab } from './appTabs';
import type { ConfigData, WorkspaceStatus } from './appTypes';
import type { ProjectListItem } from './ProjectsLibraryPanel';

export type EditorSubTab = 'script' | 'json' | 'assets' | 'narration' | 'dub';

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
    projectOverride?: string,
  ) => void | Promise<void>;
  hasApiKey: boolean;
  insertSceneAfter: (idx: number) => void;
  loadEditorProject: () => void | Promise<void>;
  loadingStoryboard: boolean;
  moveScene: (idx: number, dir: 'up' | 'down') => void;
  notebooklmImproving: boolean;
  notebooklmStatus: any;
  notebooklmSuggestions: string | null;
  projects: ProjectListItem[];
  renderRichTimelineEditor: (opts?: { hideAutoMap?: boolean; wizardManualMode?: boolean }) => React.ReactNode;
  saveConfigPatch: (patch: Partial<ConfigData>, opts?: { skipRefresh?: boolean }) => void | Promise<void>;
  saveCreatorStoryboard: (data: any) => void | Promise<void>;
  selectedProject: string;
  setActiveTab: (tab: AppTab) => void;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setEditorSubTab: (tab: EditorSubTab) => void;
  setSelectedProject: (v: string) => void;
  setStoryboardData: React.Dispatch<React.SetStateAction<any>>;
  setVideoFileDurations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  status: WorkspaceStatus | null;
  storyboardData: any;
  titleExperimentVideoId: string | null;
  updateSceneField: (idx: number, field: string, value: any) => void;
  videoFileDurations: Record<string, number>;
  wordTranscripts: any;
};

export function AppEditorTab({
${PROPS.map((p) => `  ${p},`).join("\n")}
}: AppEditorTabProps) {
  return (
`;

const footer = `  );
}
`;

fs.writeFileSync(path.join(srcDir, "AppEditorTab.tsx"), header + body + footer);
console.log("AppEditorTab.tsx written,", PROPS.length, "props");