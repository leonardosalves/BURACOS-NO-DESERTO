import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
const body = fs.readFileSync(path.join(srcDir, "_timeline_editor_body.txt"), "utf8");

const PROPS = [
  "hideAutoMap",
  "wizardManualMode",
  "config",
  "status",
  "activeProject",
  "selectedProject",
  "storyboardData",
  "wordTranscripts",
  "timelineNeedsWhisperSync",
  "timelineScenesNeedRepair",
  "timelineOpenBlocks",
  "timelinePreviewZoom",
  "timelineSelectedClips",
  "videoFileDurations",
  "visualBlockTimings",
  "progressBarChaptersText",
  "progressBarMetadataReady",
  "savingBlockProgressBar",
  "logoStatus",
  "creatorLoading",
  "syncingTimings",
  "generatingOverlays",
  "playingMusic",
  "playingNarration",
  "setConfig",
  "setTimelineOpenBlocks",
  "setTimelinePreviewZoom",
  "setTimelineSelectedClips",
  "setVideoFileDurations",
  "setWordTranscripts",
  "setActiveTab",
  "setSavingBlockProgressBar",
  "getAssetDuration",
  "getAssetNarration",
  "getDynamicAssetWords",
  "getAssetUrl",
  "getMusicUrl",
  "getProjectUrl",
  "handleAutoMapAssets",
  "handleGenerateAiOverlays",
  "handleRepairProjectVisualPrompts",
  "handleSaveConfig",
  "handleSyncTimings",
  "handleUploadSceneAsset",
  "alignAllBlocksToSpeech",
  "alignBlockAssetsToSpeech",
  "addTimelineAsset",
  "deleteTimelineAsset",
  "moveTimelineAsset",
  "updateTimelineAssetField",
  "bulkDeleteTimelineClips",
  "toggleTimelineClipSelection",
  "togglePlayMusic",
  "togglePlaySceneNarration",
  "saveConfigPatch",
  "syncCreatorStoryboard",
  "fetchData",
  "fetchStatus",
  "suggestBlockProgressIcons",
  "syncBlockProgressTitles",
];

const header = `import toast from 'react-hot-toast';
import React, { Suspense } from 'react';
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
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { SettingHelpTip } from './SettingHelpTip';
import { EditorCollapsibleSection } from './EditorCollapsibleSection';
import { TimelineOpenCutBar } from './TimelineOpenCutBar';
import { TimelineClipPreview } from './TimelineClipPreview';
import { TimelineClipOpenCutControls } from './TimelineClipOpenCutControls';
import { BlockProgressBarProjectPanel } from './BlockProgressBarProjectPanel';
import { clipKey } from './opencutTimeline';
import { LazyOverlayTimelineEditor, TabPanelFallback } from './appLazyPanels';
import type { ConfigData, WorkspaceStatus } from './appTypes';
import type { AppTab } from './appTabs';

function formatTime(sec: number): string {
  if (sec === undefined || Number.isNaN(sec)) return '0:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
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
  playingNarration: string | null;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setTimelineOpenBlocks: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setTimelinePreviewZoom: (v: number) => void;
  setTimelineSelectedClips: React.Dispatch<React.SetStateAction<Set<string>>>;
  setVideoFileDurations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
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
  handleGenerateAiOverlays: () => void | Promise<void>;
  handleRepairProjectVisualPrompts: () => void | Promise<void>;
  handleSaveConfig: () => void | Promise<void>;
  handleSyncTimings: (fromWizard?: boolean) => void | Promise<void>;
  handleUploadSceneAsset: (blockNum: number, type: string, file: File, assetIdx: number, projectOverride?: string) => void | Promise<void>;
  alignAllBlocksToSpeech: () => void;
  alignBlockAssetsToSpeech: (blockKey: string) => void;
  addTimelineAsset: (blockKey: string) => void;
  deleteTimelineAsset: (blockKey: string, idx: number) => void;
  moveTimelineAsset: (blockKey: string, idx: number, dir: 'up' | 'down') => void;
  updateTimelineAssetField: (blockKey: string, idx: number, field: string, value: any) => void;
  bulkDeleteTimelineClips: () => void;
  toggleTimelineClipSelection: (blockKey: string, idx: number, additive: boolean) => void;
  togglePlayMusic: (nameOrUrl: string) => void;
  togglePlaySceneNarration: (blockKey: string, idx: number) => void;
  saveConfigPatch: (patch: Partial<ConfigData>, opts?: { skipRefresh?: boolean }) => void | Promise<boolean>;
  syncCreatorStoryboard: (data: any) => void;
  fetchData: () => void | Promise<void>;
  fetchStatus: () => void | Promise<void>;
  suggestBlockProgressIcons: () => void | Promise<void>;
  syncBlockProgressTitles: () => void;
};

export function RichTimelineEditor({
${PROPS.map((p) => `  ${p},`).join("\n")}
}: RichTimelineEditorProps) {
  const timelineBlockCount = config.block_phrases
    ? config.block_phrases.length
    : (status?.block_timings?.durations?.length || 12);

  return (
`;

const footer = `  );
}
`;

const patchedBody = body.replace(
  /<OverlayTimelineEditor([\s\S]*?)\/>/,
  "<Suspense fallback={<TabPanelFallback label=\"Carregando overlays...\" />}>\n                      <LazyOverlayTimelineEditor$1/>\n                    </Suspense>",
);

fs.writeFileSync(path.join(srcDir, "RichTimelineEditor.tsx"), header + patchedBody + footer);
console.log("RichTimelineEditor.tsx written,", PROPS.length, "props");