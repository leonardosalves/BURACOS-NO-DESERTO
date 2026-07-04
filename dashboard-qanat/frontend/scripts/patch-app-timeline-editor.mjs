import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "..", "src", "App.tsx");
let content = fs.readFileSync(appPath, "utf8");
const lines = content.split(/\r?\n/);

const start = lines.findIndex((l) => l.includes("const renderRichTimelineEditor"));
const end = lines.findIndex((l, i) => i > start && l.includes("const openCreatorTab"));
if (start < 0 || end < 0) {
  console.error("markers not found", start, end);
  process.exit(1);
}

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

const propsPass = PROPS.map((p) => {
  if (p === "hideAutoMap") return `      hideAutoMap={options?.hideAutoMap === true}`;
  if (p === "wizardManualMode") return `      wizardManualMode={options?.wizardManualMode === true}`;
  return `      ${p}={${p}}`;
}).join("\n");

const replacement = `  const renderRichTimelineEditor = (options?: { hideAutoMap?: boolean; wizardManualMode?: boolean }) => {
    if (!config) return null;
    return (
      <Suspense fallback={<TabPanelFallback label="Carregando timeline..." />}>
        <RichTimelineEditor
${propsPass}
        />
      </Suspense>
    );
  };

`.split("\n");

if (!content.includes("RichTimelineEditor")) {
  content = content.replace(
    "const AppCreatorTab = lazy(() => import('./AppCreatorTab').then((m) => ({ default: m.AppCreatorTab })));",
    "const AppCreatorTab = lazy(() => import('./AppCreatorTab').then((m) => ({ default: m.AppCreatorTab })));\nconst RichTimelineEditor = lazy(() => import('./RichTimelineEditor').then((m) => ({ default: m.RichTimelineEditor })));",
  );
  lines.splice(0, lines.length, ...content.split(/\r?\n/));
}

const next = [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
fs.writeFileSync(appPath, next.join("\n"));
console.log("patched renderRichTimelineEditor", start, end, "removed", end - start, "lines");