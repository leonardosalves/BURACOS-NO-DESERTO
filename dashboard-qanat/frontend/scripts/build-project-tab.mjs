import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const tab = process.argv[2];
const componentName = process.argv[3];
if (!tab || !componentName) {
  console.error("usage: node build-project-tab.mjs <tab> <ComponentName>");
  process.exit(1);
}

const TAB_CONFIG = {
  upload: {
    props: [
      "activeProject", "applyMetadataToUpload", "config", "getProjectUrl",
      "handleFixYoutubeMetadata", "handleGenerateYoutubeThumbnailImages", "handlePostUploadComplete",
      "igCaption", "setIgCaption", "kwCaption", "setKwCaption", "openCanvaThumbnailDesigner",
      "pipelineRunning", "setPipelineRunning", "prepareUploadForPublish", "saveUploadMetadataToProject",
      "selectThumbnailForUpload", "selectedPlatforms", "setSelectedPlatforms", "selectedUploadVideo",
      "setActiveTab", "setSettingsSection", "setThumbnailExperiment", "setTtCaption", "ttCaption",
      "setUploadLogs", "uploadLogs", "setUploadProgress", "uploadProgress", "setUploading", "uploading",
      "setYtCategoryId", "ytCategoryId", "setYtChapters", "ytChapters", "setYtDescription", "ytDescription",
      "setYtPinnedComment", "ytPinnedComment", "setYtPrivacy", "ytPrivacy", "setYtPublishAt", "ytPublishAt",
      "setYtTags", "ytTags", "setYtTitle", "ytTitle", "titleExperimentVideoId", "uploadMetadataReady",
      "uploadStatus", "youtubeMetadataFormat", "youtubeThumbnailsGenerated", "youtubeThumbnailsLoading",
      "ytThumbnailVariant",
    ],
    header: `import toast from 'react-hot-toast';
import React from 'react';
import { Image, RefreshCw, Share2, Sparkles } from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { ProjectYoutubeCard } from './ProjectYoutubeCard';
import type { AppTab } from './appTabs';
import type { ConfigData } from './appTypes';
import type { SettingsSection } from './SettingsSectionNav';

export type AppUploadTabProps = {
  activeProject: string;
  applyMetadataToUpload: () => void | Promise<void>;
  config: ConfigData | null;
  getProjectUrl: (path: string) => string;
  handleFixYoutubeMetadata: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handlePostUploadComplete: (videoId: string, postUpload?: unknown) => void | Promise<void>;
  igCaption: string;
  setIgCaption: (v: string) => void;
  kwCaption: string;
  setKwCaption: (v: string) => void;
  openCanvaThumbnailDesigner: (thumb?: {
    id: string; label?: string; overlayText?: string; pairedTitle?: string;
    composition?: string; focalElement?: string; colors?: string[];
  }) => void | Promise<void>;
  pipelineRunning: boolean;
  setPipelineRunning: (v: boolean) => void;
  prepareUploadForPublish: () => Promise<{ ok: boolean; payload?: unknown }>;
  saveUploadMetadataToProject: (payload?: unknown) => Promise<boolean>;
  selectThumbnailForUpload: (generated: { id: string; fileName?: string; url: string }) => void | Promise<void>;
  selectedPlatforms: Record<string, boolean>;
  setSelectedPlatforms: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedUploadVideo: string | null;
  setActiveTab: (tab: AppTab) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setThumbnailExperiment: (v: any) => void;
  setTtCaption: (v: string) => void;
  ttCaption: string;
  setUploadLogs: React.Dispatch<React.SetStateAction<string[]>>;
  uploadLogs: string[];
  setUploadProgress: (v: number) => void;
  uploadProgress: number;
  setUploading: (v: boolean) => void;
  uploading: boolean;
  setYtCategoryId: (v: string) => void;
  ytCategoryId: string;
  setYtChapters: (v: string) => void;
  ytChapters: string;
  setYtDescription: (v: string) => void;
  ytDescription: string;
  setYtPinnedComment: (v: string) => void;
  ytPinnedComment: string;
  setYtPrivacy: (v: string) => void;
  ytPrivacy: string;
  setYtPublishAt: (v: string) => void;
  ytPublishAt: string;
  setYtTags: (v: string) => void;
  ytTags: string;
  setYtTitle: (v: string) => void;
  ytTitle: string;
  titleExperimentVideoId: string | null;
  uploadMetadataReady: boolean;
  uploadStatus: any;
  youtubeMetadataFormat: string;
  youtubeThumbnailsGenerated: Array<{ id: string; fileName?: string; url: string; label?: string; overlayText?: string }>;
  youtubeThumbnailsLoading: boolean;
  ytThumbnailVariant: string;
};
`,
  },
  ai: {
    props: [
      "activeProject", "aiProviderBadge", "applyAiConfig", "applyMetadataToUpload",
      "canvaThumbnailsLoading", "chatEndRef", "chatInput", "setChatInput", "chatLoading", "chatMessages",
      "copiedSection", "copyToClipboard", "fetchTitleExperiment", "fetchTitleExperimentAnalytics",
      "getProjectUrl", "handleApplyTitleVariant", "handleGenerateCanvaThumbnails",
      "handleGenerateYoutubeMetadata", "handleGenerateYoutubeThumbnailImages", "handleRelinkYoutube",
      "handleSendChatMessage", "handleStartTitleExperiment", "hasApiKey", "openCanvaThumbnailDesigner",
      "selectThumbnailForUpload", "setActiveTab", "setTitleAbSelected", "setTitleExperimentLoading",
      "setTitleExperimentVideoId", "setYtTitle", "titleAbSelected", "titleExperiment",
      "titleExperimentAnalytics", "titleExperimentLoading", "titleExperimentRankings",
      "titleExperimentVideoId", "titleExperimentWinner", "titleRetention", "uploadStatus",
      "youtubeLoading", "youtubeMetadata", "youtubeMetadataFormat", "youtubeMetadataParsed",
      "youtubeMetadataStrategy", "youtubeThumbnailsGenerated", "youtubeThumbnailsLoading", "ytThumbnailVariant",
    ],
    bodyPatch: (body) =>
      body.replace(
        /buildThumbnailBrief\(thumb\)/g,
        "buildThumbnailBrief(thumb, { profileLabel: youtubeMetadataStrategy?.profileLabel, format: youtubeMetadataFormat })",
      ),
    header: `import React from 'react';
import {
  Check, CheckCircle, Copy, Image, Lock, RefreshCw, Settings, Sparkles, Video,
} from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import { DashminAiChat, DashminChatApplyButton } from './DashminAiChat';
import {
  buildThumbnailBrief,
  detectJsonConfig,
  normalizeYoutubeMetadataDisplay,
  renderFormattedText,
} from './youtubeMetadataDisplay';
import type { AppTab } from './appTabs';

export type AppAiTabProps = {
  activeProject: string;
  aiProviderBadge: { short: string; detail: string };
  applyAiConfig: (parsedConfig: any) => void;
  applyMetadataToUpload: () => void | Promise<void>;
  canvaThumbnailsLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string;
  setChatInput: (v: string) => void;
  chatLoading: boolean;
  chatMessages: Array<{ role: string; content: string }>;
  copiedSection: string | null;
  copyToClipboard: (text: string, section: string) => void;
  fetchTitleExperiment: () => void | Promise<void>;
  fetchTitleExperimentAnalytics: () => void | Promise<void>;
  getProjectUrl: (path: string) => string;
  handleApplyTitleVariant: (variantId: string) => void | Promise<void>;
  handleGenerateCanvaThumbnails: () => void | Promise<void>;
  handleGenerateYoutubeMetadata: () => void | Promise<void>;
  handleGenerateYoutubeThumbnailImages: () => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleSendChatMessage: () => void | Promise<void>;
  handleStartTitleExperiment: () => void | Promise<void>;
  hasApiKey: boolean;
  openCanvaThumbnailDesigner: (thumb?: {
    id: string; label?: string; overlayText?: string; pairedTitle?: string;
    composition?: string; focalElement?: string; colors?: string[];
  }) => void | Promise<void>;
  selectThumbnailForUpload: (generated: { id: string; fileName?: string; url: string }) => void | Promise<void>;
  setActiveTab: (tab: AppTab) => void;
  setTitleAbSelected: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTitleExperimentLoading: (v: boolean) => void;
  setTitleExperimentVideoId: (v: string | null) => void;
  setYtTitle: (v: string) => void;
  titleAbSelected: Record<string, boolean>;
  titleExperiment: any;
  titleExperimentAnalytics: any;
  titleExperimentLoading: boolean;
  titleExperimentRankings: Array<{ id: string; views?: number }>;
  titleExperimentVideoId: string | null;
  titleExperimentWinner: { variantId?: string; views?: number } | null;
  titleRetention: any;
  uploadStatus: any;
  youtubeLoading: boolean;
  youtubeMetadata: string;
  youtubeMetadataFormat: string;
  youtubeMetadataParsed: any;
  youtubeMetadataStrategy: any;
  youtubeThumbnailsGenerated: Array<{ id: string; fileName?: string; url: string; label?: string; overlayText?: string }>;
  youtubeThumbnailsLoading: boolean;
  ytThumbnailVariant: string;
};
`,
  },
};

const cfg = TAB_CONFIG[tab];
if (!cfg) {
  console.error("unknown tab", tab);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");
let body = fs.readFileSync(path.join(srcDir, `_${tab}_tab_body.txt`), "utf8");
if (cfg.bodyPatch) body = cfg.bodyPatch(body);

const footer = `  );
}
`;

const content =
  cfg.header +
  `\nexport function ${componentName}({\n` +
  cfg.props.map((p) => `  ${p},`).join("\n") +
  `\n}: ${componentName}Props) {\n  return (\n` +
  body +
  footer;

fs.writeFileSync(path.join(srcDir, `${componentName}.tsx`), content);
console.log(`${componentName}.tsx written`, cfg.props.length, "props");