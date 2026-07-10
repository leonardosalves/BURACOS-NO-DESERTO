import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
const body = fs.readFileSync(
  path.join(srcDir, "_creator_tab_body.txt"),
  "utf8"
);

const PROPS = [
  "activeProject",
  "applyMetadataToUpload",
  "applyWizardSessionPatch",
  "config",
  "copiedSection",
  "copyToClipboard",
  "creatorIdeasBundle",
  "creatorLoading",
  "creatorLoadingMode",
  "creatorProjectName",
  "creatorScenesNeedRepair",
  "creatorStep",
  "customBlocks",
  "customHooks",
  "customIdeaBlocks",
  "customIdeaEmotion",
  "customIdeaHook",
  "customIdeaPromise",
  "customIdeaTitle",
  "customOutline",
  "customTitle",
  "dragActive",
  "editorialIdeaImport",
  "expandedBlocks",
  "fetchData",
  "formatSelector",
  "geminiBrowserMode",
  "generateYoutubeMetadata",
  "generatedScriptData",
  "getAssetUrl",
  "getMusicUrl",
  "getProjectUrl",
  "handleApproveNarrationAndGenerateScript",
  "handleCaptureGeminiNarration",
  "handleDrag",
  "handleDrop",
  "handleEnhanceVisualPrompts",
  "handleEvaluateScriptChecklist",
  "handleFileInput",
  "handleGenerateFullScript",
  "handleGenerateIdeas",
  "handleGenerateListicleScript",
  "handleGenerateNarration",
  "handleGenerateNarrationFromImport",
  "handleGenerateYoutubeThumbnailImages",
  "handleNotebooklmImproveNarrationDraft",
  "handleRemoveSceneAsset",
  "handleSaveConfig",
  "handleSuggestListicleRankings",
  "handleSyncTimings",
  "handleUpdateCreatorScene",
  "handleUploadSceneAsset",
  "hasApiKey",
  "ideasData",
  "ideationTab",
  "leaveGlobalViewForProject",
  "listNiche",
  "listTopic",
  "listicleHudStyle",
  "listicleIdeasData",
  "mixBGM",
  "mixing",
  "narrationBlockPhrases",
  "narrationBlockScript",
  "narrationDraft",
  "narrationNotebooklmEnriched",
  "narrationProjectName",
  "narrationStrategy",
  "narrationTaggedDraft",
  "nicheInput",
  "notebooklmImproving",
  "notebooklmStatus",
  "rankCount",
  "rankOrder",
  "renderRichTimelineEditor",
  "rendering",
  "resetCreatorWizard",
  "saveConfigPatch",
  "saveWizardSession",
  "selectedIdeaIndex",
  "selectedListicleIdeaIndex",
  "setConfig",
  "setCreatorProjectName",
  "setCreatorStep",
  "setCustomBlocks",
  "setCustomHooks",
  "setCustomIdeaBlocks",
  "setCustomIdeaEmotion",
  "setCustomIdeaHook",
  "setCustomIdeaPromise",
  "setCustomIdeaTitle",
  "setCustomOutline",
  "setCustomTitle",
  "setEditorialIdeaImport",
  "setExpandedBlocks",
  "setFormatSelector",
  "setIdeasData",
  "setIdeationTab",
  "setListNiche",
  "setListTopic",
  "setListicleHudStyle",
  "setNarrationDraft",
  "setNarrationTaggedDraft",
  "setNicheInput",
  "setRankCount",
  "setRankOrder",
  "setSelectedIdeaIndex",
  "setSelectedListicleIdeaIndex",
  "setTaggedNarrations",
  "setUploadSuccess",
  "setUseNotebooklm",
  "setNotebooklmDeep",
  "showNarrationReview",
  "status",
  "storyboardData",
  "syncCreatorStoryboard",
  "syncingTimings",
  "taggedNarrations",
  "timelineAssets",
  "triggerRender",
  "uploadSuccess",
  "uploadedScenes",
  "uploadingNarration",
  "useNotebooklm",
  "notebooklmDeep",
  "wizardSavedAtLabel",
  "wordTranscripts",
  "youtubeLoading",
  "youtubeMetadata",
  "youtubeMetadataParsed",
];

const header = `import toast from 'react-hot-toast';
import React, { lazy, Suspense } from 'react';
import { Check, Chrome, Copy, Play, RefreshCw, Sparkles, Trash2, Volume2, CheckCircle } from 'lucide-react';
import { DashminPageLayout } from './DashminPageLayout';
import { SectionHeader } from './SectionHeader';
import { NarrationReviewPanel } from './NarrationReviewPanel';
import { NarrationChunksPanel } from './NarrationChunksPanel';
import { TtsVoiceStudioPanel } from './TtsVoiceStudioPanel';
import { warnLongListicleTitles } from './listicleTitleUtils';

const LazyListicleCreatorStep = lazy(() =>
  import('./ListicleCreatorStep').then((m) => ({ default: m.ListicleCreatorStep })),
);
import { resolveStockSearchQuery } from './stockSearchQuery';
import { buildTaggedNarration, taggedNarrationMeta, type TaggedNarrationPlatform } from './taggedNarration';
import {
  isClipFactorySource,
  resolveEditorialImportOutline,
} from './creatorEditorialImport';
import { parseCreatorBlockNumber, getBlockTimingSummary } from './creatorTimingUtils';
import { getSceneDurationSeconds, isWhisperTimelineReady } from './sceneSpeechDuration';
import type { ConfigData, WorkspaceStatus } from './appTypes';

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
  formatSelector: 'LONGO' | 'SHORTS';
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
  handleRemoveSceneAsset: (blockKey: string, assetIdx: number) => void | Promise<void>;
  handleSaveConfig: () => void | Promise<void>;
  handleSuggestListicleRankings: () => void | Promise<void>;
  handleSyncTimings: (fromWizard?: boolean) => void | Promise<void>;
  handleUpdateCreatorScene: (index: number, field: string, value: string) => void;
  handleUploadSceneAsset: (blockNum: number, type: string, file: File, assetIdx: number) => void | Promise<void>;
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
  renderRichTimelineEditor: (opts: { hideAutoMap?: boolean; wizardManualMode?: boolean }) => React.ReactNode;
  rendering: boolean;
  resetCreatorWizard: (opts?: { deleteServerSessionFor?: string }) => void;
  saveConfigPatch: (patch: Partial<ConfigData>, opts?: { skipRefresh?: boolean }) => void | Promise<void>;
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
  setExpandedBlocks: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  setFormatSelector: (v: 'LONGO' | 'SHORTS') => void;
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
  setTaggedNarrations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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
${PROPS.map((p) => `  ${p},`).join("\n")}
}: AppCreatorTabProps) {
  return (
`;

const footer = `  );
}
`;

fs.writeFileSync(
  path.join(srcDir, "AppCreatorTab.tsx"),
  header + body + footer
);
console.log("AppCreatorTab.tsx written,", PROPS.length, "props");
