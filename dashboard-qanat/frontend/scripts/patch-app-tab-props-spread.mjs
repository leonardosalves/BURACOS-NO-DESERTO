import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");

if (content.includes("aiTabProps:")) {
  console.log("already patched");
  process.exit(0);
}

const BUNDLES = [
  { name: "aiTabProps", type: "AppAiTabProps", component: "AppAiTab", props: [
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
  ]},
  { name: "uploadTabProps", type: "AppUploadTabProps", component: "AppUploadTab", props: [
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
  ]},
  { name: "editorTabProps", type: "AppEditorTabProps", component: "AppEditorTab", props: [
    "activeProject", "addSceneAtEnd", "config", "copiedSection", "copyToClipboard",
    "debounceSaveStoryboard", "deleteScene", "editorSubTab", "fetchData", "generatingOverlays",
    "getAssetDuration", "getAssetUrl", "getMusicUrl", "getProjectUrl", "getTotalVideoDuration",
    "handleGenerateAiOverlays", "handleNotebooklmImprove", "handleSaveStoryboard", "handleUploadSceneAsset",
    "hasApiKey", "insertSceneAfter", "loadEditorProject", "loadingStoryboard", "moveScene",
    "notebooklmImproving", "notebooklmStatus", "notebooklmSuggestions", "projects",
    "renderRichTimelineEditor", "saveConfigPatch", "saveCreatorStoryboard", "selectedProject",
    "setActiveTab", "setConfig", "setEditorSubTab", "setSelectedProject", "setStoryboardData",
    "setVideoFileDurations", "status", "storyboardData", "titleExperimentVideoId", "updateSceneField",
    "videoFileDurations", "wordTranscripts",
  ]},
  { name: "settingsTabProps", type: "AppSettingsTabProps", component: "AppSettingsTab", props: [
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
  ]},
  { name: "statusTabProps", type: "AppStatusTabProps", component: "AppStatusTab", props: [
    "activeProject", "brandPanelProps", "config", "effectiveRenderResolution",
    "fetchVideoQuality", "getFormatBytes", "handlePreRenderAutoFix", "outputs",
    "preRenderFixingId", "renderResolutionLabel", "rendering", "selectedUploadVideo",
    "setActiveTab", "setPendingOutputDelete", "setPreviewVideoUrl", "setSelectedUploadVideo",
    "status", "triggerRender", "videoQuality",
  ]},
  { name: "timelineTabProps", type: "AppTimelineTabProps", component: "AppTimelineTab", props: [
    "activeProject", "config", "projectDataLoading", "fetchData", "newKeyword", "setNewKeyword",
    "addKeyword", "removeKeyword", "editingImpact", "setEditingImpact", "handleSaveImpactText",
    "renderRichTimelineEditor",
  ]},
  { name: "musicTabPanelProps", type: "AppMusicTabPanelProps", component: "AppMusicTabPanel", props: [
    "projectDataLoading", "fetchData", "config", "activeProject", "mixing", "mixBGM",
    "globalMusicVolume", "activeBgmMode", "isShortVideo", "saveConfig", "planningBgmEmotions",
    "hasApiKey", "handlePlanBgmEmotions", "bgmEmotionRows", "safeMusicFiles", "handleEmotionMusicChange",
    "playingMusic", "togglePlayMusic", "bgmSuggestions", "bgmBlockRows", "handleMusicChange",
    "searchMusic", "setSearchMusic", "handleDeleteAllMusic", "getProjectUrl", "suggestingBGM",
    "handleSuggestBGM", "handleDeleteMusic", "getFormatBytes", "hasEpidemicKey", "autoSoundtracking",
    "handleAutoSoundtrack", "epidemicSearchType", "setEpidemicSearchType", "setEpidemicSearchResults",
    "epidemicSearchQuery", "setEpidemicSearchQuery", "handleSearchEpidemic", "searchingEpidemic",
    "safeEpidemicResults", "downloadingEpidemicId", "handleDownloadEpidemic", "storyboardData",
  ]},
];

const typeImports = BUNDLES.map((b) => b.type)
  .filter((t) => t !== "AppCreatorTabProps")
  .map((t) => {
    const mod = t.replace("Props", "");
    return `import type { ${t} } from './${mod}';`;
  })
  .join("\n");

content = content.replace(
  "import type { AppCreatorTabProps } from './AppCreatorTab';",
  `import type { AppCreatorTabProps } from './AppCreatorTab';\n${typeImports}`,
);

const bundleBlocks = BUNDLES.map((b) => {
  const lines = b.props.map((p) => `    ${p},`).join("\n");
  return `  const ${b.name}: ${b.type} = {\n${lines}\n  };`;
}).join("\n\n");

content = content.replace(
  /  const creatorTabProps: AppCreatorTabProps = \{[\s\S]*?  \};\n\n  return \(/,
  (m) => m.replace(/\n\n  return \($/, `\n\n${bundleBlocks}\n\n  return (`),
);

for (const { name, component } of BUNDLES) {
  const spread = name.replace("TabProps", "").replace("PanelProps", "");
  const varName = name;
  const regex = new RegExp(`<${component}\\s*\\n[\\s\\S]*?\\/>`, "m");
  const replacement = `<${component} {...${varName}} />`;
  if (!content.match(regex)) {
    console.warn("no match for", component);
    continue;
  }
  content = content.replace(regex, replacement);
}

fs.writeFileSync(appPath, content);
console.log("patched", BUNDLES.length, "tab prop spreads");