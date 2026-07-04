import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

const STATUS_PROPS = [
  "activeProject", "brandPanelProps", "config", "effectiveRenderResolution",
  "fetchVideoQuality", "getFormatBytes", "handlePreRenderAutoFix", "outputs",
  "preRenderFixingId", "renderResolutionLabel", "rendering", "selectedUploadVideo",
  "setActiveTab", "setPendingOutputDelete", "setPreviewVideoUrl", "setSelectedUploadVideo",
  "status", "triggerRender", "videoQuality",
];

const SETTINGS_PROPS = [
  "activeProject", "aiProvider", "applyProductionPatchToConfig", "applyVisualPatchToConfig",
  "canvaClientId", "canvaClientSecret", "config", "epidemicKeyInput", "fetchUploadStatus",
  "geminiBrowserMode", "geminiExtensionDiag", "geminiExtensionReady", "geminiExtensionTesting",
  "geminiKeyCount", "geminiKeysInput", "geminiModel", "geminiModelOptions", "globalBlockGap",
  "globalDebugOverlay", "globalFps", "globalMusicVolume", "globalRenderResolution",
  "globalUseRemotion", "handleClearProjectRenderResolution", "handleRelinkYoutube",
  "handleSaveAiSettings", "handleSaveApiKeys", "handleSaveGlobalRenderConfig",
  "handleSaveProjectRenderResolution", "handleTestSupermemory", "hasEpidemicKey", "hasNvidiaKey",
  "hasOpenRouterKey", "hasPexelsKey", "hasPixabayKey", "hasSupermemoryKey", "hasXaiKey",
  "igAccessToken", "igAccountId", "igAppId", "igAppSecret", "nvidiaKeyInput", "openrouterKeyInput",
  "pexelsKeyInput", "pickProductionConfig", "pickVisualConfig", "pixabayKeyInput",
  "productionDraftToApiPatch", "projectRenderResolution", "refreshGeminiExtensionStatus",
  "resolutionConfigScope", "saveConfigPatch", "savingAiSettings", "savingApiKeys",
  "savingGlobalConfig", "savingProductionConfig", "savingProjectResolution", "savingVisualConfig",
  "setAiProvider", "setCanvaClientId", "setCanvaClientSecret", "setConfig", "setEpidemicKeyInput",
  "setGeminiBrowserMode", "setGeminiExtensionTesting", "setGeminiKeysInput", "setGeminiModel",
  "setGlobalBlockGap", "setGlobalDebugOverlay", "setGlobalFps", "setGlobalMusicVolume",
  "setGlobalRenderResolution", "setGlobalUseRemotion", "setIgAccessToken", "setIgAccountId",
  "setIgAppId", "setIgAppSecret", "setNvidiaKeyInput", "setOpenRouterKeyInput", "setPexelsKeyInput",
  "setPixabayKeyInput", "setProjectRenderResolution", "setResolutionConfigScope",
  "setSavingProductionConfig", "setSavingVisualConfig", "setSettingsSection",
  "setSupermemoryBaseUrlInput", "setSupermemoryEnabled", "setSupermemoryKeyInput", "setXaiKeyInput",
  "setYtClientId", "setYtClientSecret", "settingsSection", "supermemoryBaseUrlInput",
  "supermemoryEnabled", "supermemoryKeyInput", "testingSupermemory", "uploadStatus",
  "visualDraftToApiPatch", "xaiKeyInput", "ytClientId", "ytClientSecret",
];

function writeTab(name, props, header, bodyFile) {
  const body = fs.readFileSync(path.join(srcDir, bodyFile), "utf8");
  const content =
    header +
    `\nexport function ${name}({\n` +
    props.map((p) => `  ${p},`).join("\n") +
    `\n}: ${name}Props) {\n  return (\n` +
    body +
    `  );\n}\n`;
  fs.writeFileSync(path.join(srcDir, `${name}.tsx`), content);
  console.log(`${name}.tsx`, props.length, "props");
}

const statusHeader = `import React from 'react';
import {
  AlertTriangle, CheckCircle, Download, ExternalLink, Play, RefreshCw, Sparkles, Trash2, Tv, Video,
} from 'lucide-react';
import { DashminProjectTabLayout } from './DashminProjectTabLayout';
import { SectionHeader } from './SectionHeader';
import { BrandSettingsPanel } from './BrandSettingsPanel';
import { PreRenderAdvicePanel } from './PreRenderAdvice';
import type { AppTab } from './appTabs';
import type { ConfigData, OutputVideo, VideoQualityReport, WorkspaceStatus } from './appTypes';

export type AppStatusTabProps = {
  activeProject: string;
  brandPanelProps: Record<string, unknown>;
  config: ConfigData | null;
  effectiveRenderResolution: string;
  fetchVideoQuality: () => void | Promise<void>;
  getFormatBytes: (n: number) => string;
  handlePreRenderAutoFix: (fixId: string) => void | Promise<void>;
  outputs: OutputVideo[];
  preRenderFixingId: string | null;
  renderResolutionLabel: string;
  rendering: boolean;
  selectedUploadVideo: string | null;
  setActiveTab: (tab: AppTab) => void;
  setPendingOutputDelete: (v: OutputVideo | null) => void;
  setPreviewVideoUrl: (url: string | null) => void;
  setSelectedUploadVideo: (v: string | null) => void;
  status: WorkspaceStatus | null;
  triggerRender: (...args: any[]) => void | Promise<void>;
  videoQuality: VideoQualityReport | null;
};
`;

const settingsHeader = `import toast from 'react-hot-toast';
import React from 'react';
import { CheckCircle, Chrome, RefreshCw, Save, Settings } from 'lucide-react';
import { DashminPageLayout } from './DashminPageLayout';
import { SectionHeader } from './SectionHeader';
import { SettingsSectionNav, type SettingsSection } from './SettingsSectionNav';
import { SettingHelpTip, SettingLabel } from './SettingHelpTip';
import { SettingsApiKeys } from './SettingsApiKeys';
import { VisualSettings } from './VisualSettings';
import { SettingsProduction } from './SettingsProduction';
import { IntegrationSettings } from './IntegrationSettings';
import type { ConfigData } from './appTypes';

export type AppSettingsTabProps = {
  activeProject: string;
  aiProvider: string;
  applyProductionPatchToConfig: (cfg: ConfigData, patch: any) => ConfigData;
  applyVisualPatchToConfig: (cfg: ConfigData, patch: any) => ConfigData;
  canvaClientId: string;
  canvaClientSecret: string;
  config: ConfigData | null;
  epidemicKeyInput: string;
  fetchUploadStatus: () => void | Promise<void>;
  geminiBrowserMode: boolean;
  geminiExtensionDiag: string;
  geminiExtensionReady: boolean | null;
  geminiExtensionTesting: boolean;
  geminiKeyCount: number;
  geminiKeysInput: string;
  geminiModel: string;
  geminiModelOptions: Array<{ id: string; label: string; hint?: string }>;
  globalBlockGap: number;
  globalDebugOverlay: boolean;
  globalFps: number;
  globalMusicVolume: number;
  globalRenderResolution: string;
  globalUseRemotion: boolean;
  handleClearProjectRenderResolution: () => void | Promise<void>;
  handleRelinkYoutube: () => void | Promise<void>;
  handleSaveAiSettings: () => void | Promise<void>;
  handleSaveApiKeys: () => void | Promise<void>;
  handleSaveGlobalRenderConfig: () => void | Promise<void>;
  handleSaveProjectRenderResolution: () => void | Promise<void>;
  handleTestSupermemory: () => void | Promise<void>;
  hasEpidemicKey: boolean;
  hasNvidiaKey: boolean;
  hasOpenRouterKey: boolean;
  hasPexelsKey: boolean;
  hasPixabayKey: boolean;
  hasSupermemoryKey: boolean;
  hasXaiKey: boolean;
  igAccessToken: string;
  igAccountId: string;
  igAppId: string;
  igAppSecret: string;
  nvidiaKeyInput: string;
  openrouterKeyInput: string;
  pexelsKeyInput: string;
  pickProductionConfig: (cfg: ConfigData) => any;
  pickVisualConfig: (cfg: ConfigData) => any;
  pixabayKeyInput: string;
  productionDraftToApiPatch: (draft: any) => any;
  projectRenderResolution: string;
  refreshGeminiExtensionStatus: () => Promise<any>;
  resolutionConfigScope: 'global' | 'project';
  saveConfigPatch: (patch: Partial<ConfigData>, opts?: { skipRefresh?: boolean }) => void | Promise<void>;
  savingAiSettings: boolean;
  savingApiKeys: boolean;
  savingGlobalConfig: boolean;
  savingProductionConfig: boolean;
  savingProjectResolution: boolean;
  savingVisualConfig: boolean;
  setAiProvider: (v: string) => void;
  setCanvaClientId: (v: string) => void;
  setCanvaClientSecret: (v: string) => void;
  setConfig: React.Dispatch<React.SetStateAction<ConfigData | null>>;
  setEpidemicKeyInput: (v: string) => void;
  setGeminiBrowserMode: (v: boolean) => void;
  setGeminiExtensionTesting: (v: boolean) => void;
  setGeminiKeysInput: (v: string) => void;
  setGeminiModel: (v: string) => void;
  setGlobalBlockGap: (v: number) => void;
  setGlobalDebugOverlay: (v: boolean) => void;
  setGlobalFps: (v: number) => void;
  setGlobalMusicVolume: (v: number) => void;
  setGlobalRenderResolution: (v: string) => void;
  setGlobalUseRemotion: (v: boolean) => void;
  setIgAccessToken: (v: string) => void;
  setIgAccountId: (v: string) => void;
  setIgAppId: (v: string) => void;
  setIgAppSecret: (v: string) => void;
  setNvidiaKeyInput: (v: string) => void;
  setOpenRouterKeyInput: (v: string) => void;
  setPexelsKeyInput: (v: string) => void;
  setPixabayKeyInput: (v: string) => void;
  setProjectRenderResolution: (v: string) => void;
  setResolutionConfigScope: (v: 'global' | 'project') => void;
  setSavingProductionConfig: (v: boolean) => void;
  setSavingVisualConfig: (v: boolean) => void;
  setSettingsSection: (s: SettingsSection) => void;
  setSupermemoryBaseUrlInput: (v: string) => void;
  setSupermemoryEnabled: (v: boolean) => void;
  setSupermemoryKeyInput: (v: string) => void;
  setXaiKeyInput: (v: string) => void;
  setYtClientId: (v: string) => void;
  setYtClientSecret: (v: string) => void;
  settingsSection: SettingsSection;
  supermemoryBaseUrlInput: string;
  supermemoryEnabled: boolean;
  supermemoryKeyInput: string;
  testingSupermemory: boolean;
  uploadStatus: any;
  visualDraftToApiPatch: (draft: any) => any;
  xaiKeyInput: string;
  ytClientId: string;
  ytClientSecret: string;
};
`;

writeTab("AppStatusTab", STATUS_PROPS, statusHeader, "_status_tab_body.txt");
writeTab("AppSettingsTab", SETTINGS_PROPS, settingsHeader, "_settings_tab_body.txt");