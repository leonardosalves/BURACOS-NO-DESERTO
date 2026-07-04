import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const tab = process.argv[2];
const componentName = process.argv[3];
const nextTab = process.argv[4];
const boundaryLabel = process.argv[5] || tab;

if (!tab || !componentName || !nextTab) {
  console.error("usage: node patch-app-project-tab.mjs <tab> <ComponentName> <nextTab> [label]");
  process.exit(1);
}

const TAB_PROPS = {
  upload: [
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
  ai: [
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
};

const PROPS = TAB_PROPS[tab];
if (!PROPS) {
  console.error("unknown tab props", tab);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let lines = fs.readFileSync(appPath, "utf8").split(/\r?\n/);

const startIdx = lines.findIndex((l) => l.includes(`{activeTab === '${tab}'`));
const nextIdx = lines.findIndex((l) => l.includes(`{activeTab === '${nextTab}'`));

if (startIdx < 0 || nextIdx < 0) {
  console.error("markers not found", { startIdx, nextIdx });
  process.exit(1);
}

let endIdx = -1;
for (let i = nextIdx - 1; i > startIdx; i--) {
  if (lines[i].trim() !== ")}") continue;
  let j = i + 1;
  while (j < nextIdx && lines[j].trim() === "") j++;
  if (j >= nextIdx || lines[j].includes("{activeTab ===") || lines[j].includes("/* TAB")) {
    endIdx = i + 1;
    break;
  }
}

if (endIdx < 0) {
  console.error("end not found");
  process.exit(1);
}

const propsLines = PROPS.map((p) => `                ${p}={${p}}`).join("\n");
const replacement = `          {activeTab === '${tab}' && (
            <TabErrorBoundary tabName="${boundaryLabel}">
              <Suspense fallback={<TabPanelFallback label="Carregando ${boundaryLabel.toLowerCase()}..." />}>
                <${componentName}
${propsLines}
                />
              </Suspense>
            </TabErrorBoundary>
          )}

`.split("\n");

let appContent = fs.readFileSync(appPath, "utf8");
const lazyLine = `const ${componentName} = lazy(() => import('./${componentName}').then((m) => ({ default: m.${componentName} })));`;
if (!appContent.includes(componentName)) {
  appContent = appContent.replace(
    "const AppTimelineTab = lazy(() => import('./AppTimelineTab').then((m) => ({ default: m.AppTimelineTab })));",
    `const AppTimelineTab = lazy(() => import('./AppTimelineTab').then((m) => ({ default: m.AppTimelineTab })));\n${lazyLine}`,
  );
  fs.writeFileSync(appPath, appContent);
  lines = appContent.split(/\r?\n/);
}

const next = [...lines.slice(0, startIdx), ...replacement, ...lines.slice(endIdx)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("patched", tab, "removed", endIdx - startIdx, "lines");